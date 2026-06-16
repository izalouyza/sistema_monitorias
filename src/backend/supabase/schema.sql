-- ============================================================
-- UfersaMentor – Schema Supabase (PostgreSQL)
-- ============================================================

-- ─── 1. LIMPEZA COMPLETA ─────────────────────────────────────

DROP TABLE IF EXISTS notificacoes   CASCADE;
DROP TABLE IF EXISTS relatorios     CASCADE;
DROP TABLE IF EXISTS materiais      CASCADE;
DROP TABLE IF EXISTS chamadas       CASCADE;
DROP TABLE IF EXISTS agendamentos   CASCADE;
DROP TABLE IF EXISTS horarios       CASCADE;
DROP TABLE IF EXISTS monitoria_monitores CASCADE;
DROP TABLE IF EXISTS monitoria_turmas    CASCADE;
DROP TABLE IF EXISTS monitorias     CASCADE;
DROP TABLE IF EXISTS turmas         CASCADE;
DROP TABLE IF EXISTS profiles       CASCADE;

DROP VIEW  IF EXISTS monitorias_completas;
DROP FUNCTION IF EXISTS handle_new_user()     CASCADE;
DROP FUNCTION IF EXISTS notify_agendamento()  CASCADE;
DROP FUNCTION IF EXISTS check_horario_capacity() CASCADE;

-- Limpa usuários de teste da auth (mantém apenas o admin que será criado abaixo)
DELETE FROM auth.users
WHERE email LIKE '%@ufersa.edu.br'
   OR email LIKE '%@alunos.ufersa.edu.br';

-- ─── 2. TABELA: profiles ─────────────────────────────────────

CREATE TABLE profiles (
  id         UUID        PRIMARY KEY,                 -- mesmo UUID do auth.users
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  role       TEXT        NOT NULL DEFAULT 'student'
               CHECK (role IN ('admin','professor','monitor','student')),
  matricula  TEXT,
  siape      TEXT,
  status     TEXT        NOT NULL DEFAULT 'ativo'
               CHECK (status IN ('ativo','inativo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Leitura pública (todos autenticados vêem todos os perfis)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Inserção: o próprio usuário OU um admin
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT WITH CHECK (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Atualização: o próprio usuário OU um admin
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Exclusão: apenas admin, nunca a si mesmo
CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE USING (
    id <> auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 3. TRIGGER: cria perfil ao cadastrar no Auth ────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, matricula, siape, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'matricula',
    NEW.raw_user_meta_data->>'siape',
    'ativo'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 4. TABELA: turmas ───────────────────────────────────────

CREATE TABLE turmas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_disciplina  TEXT NOT NULL,
  codigo           TEXT NOT NULL,
  professor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  horario          TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'ativa'
                     CHECK (status IN ('ativa','encerrada')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turmas_select" ON turmas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "turmas_admin"  ON turmas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 5. TABELAS: monitorias + pivôs ──────────────────────────

CREATE TABLE monitorias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semestre   TEXT NOT NULL DEFAULT '2026.1',
  status     TEXT NOT NULL DEFAULT 'ativa'
               CHECK (status IN ('ativa','encerrada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pivô N:N  monitoria ↔ turma
CREATE TABLE monitoria_turmas (
  monitoria_id UUID NOT NULL REFERENCES monitorias(id) ON DELETE CASCADE,
  turma_id     UUID NOT NULL REFERENCES turmas(id)     ON DELETE CASCADE,
  PRIMARY KEY (monitoria_id, turma_id)
);

-- Pivô N:N  monitoria ↔ monitor (restrição: 1 monitor só pode estar em 1 monitoria)
CREATE TABLE monitoria_monitores (
  monitoria_id UUID NOT NULL REFERENCES monitorias(id)  ON DELETE CASCADE,
  monitor_id   UUID NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  PRIMARY KEY (monitoria_id, monitor_id),
  UNIQUE (monitor_id)   -- 1 monitor → 1 monitoria
);

ALTER TABLE monitorias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoria_turmas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoria_monitores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitorias_select"          ON monitorias          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "monitorias_admin"           ON monitorias          FOR ALL    USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "monitoria_turmas_select"    ON monitoria_turmas    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "monitoria_turmas_admin"     ON monitoria_turmas    FOR ALL    USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "monitoria_monitores_select" ON monitoria_monitores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "monitoria_monitores_admin"  ON monitoria_monitores FOR ALL    USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));

-- VIEW de conveniência: agrega turmaIds e monitorIds num único registro
CREATE OR REPLACE VIEW monitorias_completas AS
SELECT
  m.id,
  m.semestre,
  m.status,
  m.created_at,
  COALESCE(
    ARRAY_AGG(DISTINCT mt.turma_id::TEXT) FILTER (WHERE mt.turma_id IS NOT NULL),
    '{}'::TEXT[]
  ) AS turma_ids,
  COALESCE(
    ARRAY_AGG(DISTINCT mm.monitor_id::TEXT) FILTER (WHERE mm.monitor_id IS NOT NULL),
    '{}'::TEXT[]
  ) AS monitor_ids
FROM monitorias m
LEFT JOIN monitoria_turmas    mt ON mt.monitoria_id = m.id
LEFT JOIN monitoria_monitores mm ON mm.monitoria_id = m.id
GROUP BY m.id, m.semestre, m.status, m.created_at;

-- ─── 6. TABELA: horarios ─────────────────────────────────────

CREATE TABLE horarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id   UUID NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  monitoria_id UUID NOT NULL REFERENCES monitorias(id) ON DELETE CASCADE,
  data         DATE NOT NULL,
  hora_inicio  TIME NOT NULL,
  hora_fim     TIME NOT NULL,
  sala         TEXT DEFAULT '',
  bloco        TEXT DEFAULT '',
  link_online  TEXT,
  modalidade   TEXT NOT NULL CHECK (modalidade IN ('presencial','online')),
  vagas        INTEGER NOT NULL DEFAULT 5 CHECK (vagas > 0),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horarios_select" ON horarios FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "horarios_manage" ON horarios FOR ALL USING (
  monitor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 7. TABELA: agendamentos ─────────────────────────────────

CREATE TABLE agendamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         UUID NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  horario_id       UUID NOT NULL REFERENCES horarios(id)   ON DELETE CASCADE,
  monitoria_id     UUID NOT NULL REFERENCES monitorias(id) ON DELETE CASCADE,
  data             DATE NOT NULL,
  duvida_principal TEXT,
  status           TEXT NOT NULL DEFAULT 'confirmado'
                     CHECK (status IN ('confirmado','cancelado')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, horario_id)   -- 1 aluno, 1 horário = 1 agendamento
);

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agendamentos_select" ON agendamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "agendamentos_insert" ON agendamentos FOR INSERT WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "agendamentos_update" ON agendamentos FOR UPDATE USING (
  aluno_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','monitor'))
);

-- TRIGGER: valida capacidade antes de agendar
CREATE OR REPLACE FUNCTION check_horario_capacity()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_vagas    INTEGER;
  v_ocupadas INTEGER;
BEGIN
  IF NEW.status != 'cancelado' THEN
    SELECT h.vagas INTO v_vagas FROM horarios h WHERE h.id = NEW.horario_id;
    SELECT COUNT(*) INTO v_ocupadas
      FROM agendamentos
     WHERE horario_id = NEW.horario_id
       AND status    != 'cancelado'
       AND id        != COALESCE(NEW.id, gen_random_uuid());
    IF v_ocupadas >= v_vagas THEN
      RAISE EXCEPTION 'VAGAS_ESGOTADAS: O horário já está com as % vagas preenchidas.', v_vagas;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_capacity
  BEFORE INSERT OR UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION check_horario_capacity();

-- ─── 8. TABELA: chamadas ─────────────────────────────────────

CREATE TABLE chamadas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id   UUID NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  horario_id UUID NOT NULL REFERENCES horarios(id)  ON DELETE CASCADE,
  data       DATE NOT NULL,
  presente   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, horario_id, data)
);

ALTER TABLE chamadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chamadas_select" ON chamadas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "chamadas_manage" ON chamadas FOR ALL USING (
  EXISTS (
    SELECT 1 FROM horarios h
     WHERE h.id = horario_id AND h.monitor_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 9. TABELA: materiais ────────────────────────────────────

CREATE TABLE materiais (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id   UUID NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  monitoria_id UUID NOT NULL REFERENCES monitorias(id) ON DELETE CASCADE,
  horario_id   UUID REFERENCES horarios(id)            ON DELETE SET NULL,
  titulo       TEXT NOT NULL,
  descricao    TEXT DEFAULT '',
  filename     TEXT DEFAULT '',
  file_content TEXT,        -- base64 data URL
  file_type    TEXT,
  file_size    BIGINT,
  uploaded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materiais_select" ON materiais FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "materiais_manage" ON materiais FOR ALL USING (
  monitor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 10. TABELA: relatorios ──────────────────────────────────

CREATE TABLE relatorios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id   UUID NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  monitoria_id UUID NOT NULL REFERENCES monitorias(id) ON DELETE CASCADE,
  titulo       TEXT NOT NULL,
  descricao    TEXT DEFAULT '',
  filename     TEXT DEFAULT '',
  file_content TEXT,
  file_type    TEXT,
  file_size    BIGINT,
  uploaded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;

-- Monitor vê os próprios; Professor vê os dos monitores das suas turmas; Admin vê tudo
CREATE POLICY "relatorios_select" ON relatorios FOR SELECT USING (
  monitor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM monitorias mn
    JOIN monitoria_monitores mm ON mm.monitoria_id = mn.id
    JOIN monitoria_turmas    mt ON mt.monitoria_id = mn.id
    JOIN turmas t              ON t.id = mt.turma_id
    WHERE mm.monitor_id  = relatorios.monitor_id
      AND t.professor_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "relatorios_manage" ON relatorios FOR ALL USING (
  monitor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 11. TABELA: notificacoes ────────────────────────────────

CREATE TABLE notificacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  agendamento_id  UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes_own" ON notificacoes FOR ALL USING (to_user_id = auth.uid());

-- TRIGGER: notifica monitor quando aluno agenda ou cancela
CREATE OR REPLACE FUNCTION notify_agendamento()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_monitor_id UUID;
  v_aluno_name TEXT;
  v_disciplina TEXT;
  v_data_fmt   TEXT;
BEGIN
  SELECT h.monitor_id INTO v_monitor_id FROM horarios h WHERE h.id = NEW.horario_id;
  SELECT p.name       INTO v_aluno_name FROM profiles  p WHERE p.id = NEW.aluno_id;
  SELECT t.nome_disciplina INTO v_disciplina
    FROM monitorias mn
    JOIN monitoria_turmas mt ON mt.monitoria_id = mn.id
    JOIN turmas t ON t.id = mt.turma_id
   WHERE mn.id = NEW.monitoria_id LIMIT 1;

  v_data_fmt := TO_CHAR(NEW.data, 'DD/MM/YYYY');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO notificacoes (to_user_id, title, body, agendamento_id)
    VALUES (
      v_monitor_id,
      'Novo agendamento',
      v_aluno_name || ' agendou ' || COALESCE(v_disciplina,'monitoria') || ' para ' || v_data_fmt,
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    INSERT INTO notificacoes (to_user_id, title, body, agendamento_id)
    VALUES (
      v_monitor_id,
      'Agendamento cancelado',
      v_aluno_name || ' cancelou o atendimento de ' || COALESCE(v_disciplina,'monitoria') || ' (' || v_data_fmt || ')',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_agendamento
  AFTER INSERT OR UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION notify_agendamento();

-- ─── 12. ÍNDICES ─────────────────────────────────────────────

CREATE INDEX idx_turmas_professor       ON turmas(professor_id);
CREATE INDEX idx_horarios_monitor       ON horarios(monitor_id);
CREATE INDEX idx_horarios_monitoria     ON horarios(monitoria_id);
CREATE INDEX idx_horarios_data          ON horarios(data);
CREATE INDEX idx_agendamentos_aluno     ON agendamentos(aluno_id);
CREATE INDEX idx_agendamentos_horario   ON agendamentos(horario_id);
CREATE INDEX idx_agendamentos_monitoria ON agendamentos(monitoria_id);
CREATE INDEX idx_chamadas_horario       ON chamadas(horario_id);
CREATE INDEX idx_chamadas_aluno         ON chamadas(aluno_id);
CREATE INDEX idx_materiais_monitor      ON materiais(monitor_id);
CREATE INDEX idx_materiais_monitoria    ON materiais(monitoria_id);
CREATE INDEX idx_relatorios_monitor     ON relatorios(monitor_id);
CREATE INDEX idx_notificacoes_user      ON notificacoes(to_user_id);
CREATE INDEX idx_notificacoes_read      ON notificacoes(to_user_id, read);

-- ─── 13. USUÁRIO ADMINISTRADOR PADRÃO ───────────────────────

DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'admin@ufersa.edu.br';

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password,
      email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated',
      'admin@ufersa.edu.br',
      crypt('Admin@123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin","role":"admin"}',
      NOW(), NOW(),
      '', '', '', ''
    );

    INSERT INTO public.profiles (id, name, email, role, status)
    VALUES (v_uid, 'Admin', 'admin@ufersa.edu.br', 'admin', 'ativo');

    RAISE NOTICE 'Usuário admin criado: admin@ufersa.edu.br / Admin@123';
  ELSE
    RAISE NOTICE 'Usuário admin já existe (id: %).', v_uid;
  END IF;
END $$;
