require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('./db');

async function init() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Extensão para UUID ──
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // ── Tabela: usuarios ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name        TEXT NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL CHECK (role IN ('admin','professor','monitor','student')),
        matricula   TEXT,
        siape       TEXT,
        status      TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Tabela: turmas ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS turmas (
        id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nome_disciplina  TEXT NOT NULL,
        codigo           TEXT NOT NULL,
        professor_id     TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
        horario          TEXT,
        status           TEXT DEFAULT 'ativa' CHECK (status IN ('ativa','encerrada')),
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Tabela: monitorias ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitorias (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        semestre   TEXT NOT NULL,
        status     TEXT DEFAULT 'ativa' CHECK (status IN ('ativa','encerrada')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Tabela pivot: monitoria_turmas ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitoria_turmas (
        monitoria_id TEXT REFERENCES monitorias(id) ON DELETE CASCADE,
        turma_id     TEXT REFERENCES turmas(id) ON DELETE CASCADE,
        PRIMARY KEY (monitoria_id, turma_id)
      )
    `);

    // ── Tabela pivot: monitoria_monitores ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitoria_monitores (
        monitoria_id TEXT REFERENCES monitorias(id) ON DELETE CASCADE,
        monitor_id   TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
        PRIMARY KEY (monitoria_id, monitor_id)
      )
    `);

    // ── Tabela: horarios ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS horarios (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        monitor_id   TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
        monitoria_id TEXT REFERENCES monitorias(id) ON DELETE CASCADE,
        data         DATE NOT NULL,
        hora_inicio  TIME NOT NULL,
        hora_fim     TIME NOT NULL,
        sala         TEXT,
        bloco        TEXT,
        link_online  TEXT,
        modalidade   TEXT NOT NULL CHECK (modalidade IN ('presencial','online')),
        vagas        INTEGER NOT NULL DEFAULT 5,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Tabela: agendamentos ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        aluno_id         TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
        horario_id       TEXT REFERENCES horarios(id) ON DELETE CASCADE,
        monitoria_id     TEXT REFERENCES monitorias(id) ON DELETE CASCADE,
        data             DATE NOT NULL,
        duvida_principal TEXT,
        status           TEXT DEFAULT 'confirmado' CHECK (status IN ('confirmado','cancelado')),
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Tabela: chamadas ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS chamadas (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        aluno_id    TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
        horario_id  TEXT REFERENCES horarios(id) ON DELETE CASCADE,
        data        DATE NOT NULL,
        presente    BOOLEAN DEFAULT false,
        UNIQUE(aluno_id, horario_id, data)
      )
    `);

    // ── Tabela: materiais ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS materiais (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        monitor_id   TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
        monitoria_id TEXT REFERENCES monitorias(id) ON DELETE CASCADE,
        horario_id   TEXT REFERENCES horarios(id) ON DELETE SET NULL,
        titulo       TEXT NOT NULL,
        descricao    TEXT,
        filename     TEXT,
        file_content TEXT,
        file_type    TEXT,
        file_size    INTEGER,
        uploaded_at  DATE DEFAULT CURRENT_DATE,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Tabela: relatorios ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS relatorios (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        monitor_id   TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
        monitoria_id TEXT REFERENCES monitorias(id) ON DELETE CASCADE,
        titulo       TEXT NOT NULL,
        descricao    TEXT,
        filename     TEXT,
        file_content TEXT,
        file_type    TEXT,
        file_size    INTEGER,
        uploaded_at  DATE DEFAULT CURRENT_DATE,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Tabela: notificacoes ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        to_user_id     TEXT REFERENCES usuarios(id) ON DELETE CASCADE,
        title          TEXT NOT NULL,
        body           TEXT NOT NULL,
        agendamento_id TEXT REFERENCES agendamentos(id) ON DELETE SET NULL,
        read           BOOLEAN DEFAULT false,
        created_at     TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Admin padrão (senha: Admin@123) ──
    const bcrypt = require('bcryptjs');
    const adminExists = await client.query(
      "SELECT id FROM usuarios WHERE email = 'admin@ufersa.edu.br'"
    );
    if (adminExists.rowCount === 0) {
      const hash = await bcrypt.hash('Admin@123', 10);
      await client.query(`
        INSERT INTO usuarios (id, name, email, password, role, status)
        VALUES (gen_random_uuid()::text, 'Administrador SGM', 'admin@ufersa.edu.br', $1, 'admin', 'ativo')
      `, [hash]);
      console.log('Admin padrão criado: admin@ufersa.edu.br / Admin@123');
    }

    await client.query('COMMIT');
    console.log('Banco de dados inicializado com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao inicializar banco:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch(() => process.exit(1));
