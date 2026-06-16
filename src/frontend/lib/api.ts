/**
 * UfersaMentor – Camada de Serviço Supabase
 * Todas as operações de banco de dados passam por este arquivo.
 * O App.tsx importa apenas funções daqui; nada de seed data.
 */

import { supabase } from "./supabase";

// ─── Tipos espelho dos tipos do App.tsx ───────────────────────

export type Role = "admin" | "student" | "monitor" | "professor";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;         // vazio quando vindo do DB (Supabase não retorna senha)
  role: Role;
  matricula?: string;
  siape?: string;
  status?: "ativo" | "inativo";
}

export interface Turma {
  id: string;
  nomeDisciplina: string;
  codigo: string;
  professorId: string;
  horario: string;
  status: "ativa" | "encerrada";
}

export interface Monitoria {
  id: string;
  turmaIds: string[];
  monitorIds: string[];
  semestre: string;
  status: "ativa" | "encerrada";
}

export interface Horario {
  id: string;
  monitorId: string;
  monitoriaId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  sala: string;
  bloco: string;
  linkOnline?: string;
  modalidade: "presencial" | "online";
  vagas: number;
  vagasOcupadas: number;   // calculado dinamicamente no frontend
}

export interface Agendamento {
  id: string;
  alunoId: string;
  horarioId: string;
  monitoriaId: string;
  data: string;
  duvidaPrincipal?: string;
  status: "confirmado" | "cancelado";
}

export interface Chamada {
  id: string;
  alunoId: string;
  horarioId: string;
  data: string;
  presente: boolean;
}

export interface Material {
  id: string;
  monitorId: string;
  monitoriaId: string;
  horarioId?: string;
  titulo: string;
  descricao: string;
  filename: string;
  uploadedAt: string;
  fileContent?: string;
  fileType?: string;
  fileSize?: number;
}

export interface Relatorio {
  id: string;
  monitorId: string;
  monitoriaId: string;
  titulo: string;
  descricao: string;
  filename: string;
  uploadedAt: string;
  fileContent?: string;
  fileType?: string;
  fileSize?: number;
}

export interface Notif {
  id: string;
  toUserId: string;
  title: string;
  body: string;
  agendamentoId?: string;
  read: boolean;
  at: string;
}

// ─── Helpers de mapeamento DB → Frontend ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapUser = (r: any): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  password: "",                              // nunca retornado
  role: r.role as Role,
  matricula: r.matricula ?? undefined,
  siape: r.siape ?? undefined,
  status: (r.status ?? "ativo") as "ativo" | "inativo",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTurma = (r: any): Turma => ({
  id: r.id,
  nomeDisciplina: r.nome_disciplina,
  codigo: r.codigo,
  professorId: r.professor_id ?? "",
  horario: r.horario ?? "",
  status: r.status as "ativa" | "encerrada",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapMonitoria = (r: any): Monitoria => ({
  id: r.id,
  semestre: r.semestre,
  status: r.status as "ativa" | "encerrada",
  turmaIds: Array.isArray(r.turma_ids) ? r.turma_ids.filter(Boolean) : [],
  monitorIds: Array.isArray(r.monitor_ids) ? r.monitor_ids.filter(Boolean) : [],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapHorario = (r: any): Horario => ({
  id: r.id,
  monitorId: r.monitor_id,
  monitoriaId: r.monitoria_id,
  data: r.data,                              // já vem como "YYYY-MM-DD"
  horaInicio: (r.hora_inicio as string).slice(0, 5),
  horaFim: (r.hora_fim as string).slice(0, 5),
  sala: r.sala ?? "",
  bloco: r.bloco ?? "",
  linkOnline: r.link_online ?? undefined,
  modalidade: r.modalidade as "presencial" | "online",
  vagas: r.vagas,
  vagasOcupadas: 0,                          // calculado no frontend via vagasLivres()
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAgendamento = (r: any): Agendamento => ({
  id: r.id,
  alunoId: r.aluno_id,
  horarioId: r.horario_id,
  monitoriaId: r.monitoria_id,
  data: r.data,
  duvidaPrincipal: r.duvida_principal ?? undefined,
  status: r.status as "confirmado" | "cancelado",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapChamada = (r: any): Chamada => ({
  id: r.id,
  alunoId: r.aluno_id,
  horarioId: r.horario_id,
  data: r.data,
  presente: r.presente,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapMaterial = (r: any): Material => ({
  id: r.id,
  monitorId: r.monitor_id,
  monitoriaId: r.monitoria_id,
  horarioId: r.horario_id ?? undefined,
  titulo: r.titulo,
  descricao: r.descricao ?? "",
  filename: r.filename ?? "",
  uploadedAt: r.uploaded_at,
  fileContent: r.file_content ?? undefined,
  fileType: r.file_type ?? undefined,
  fileSize: r.file_size ?? undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRelatorio = (r: any): Relatorio => ({
  id: r.id,
  monitorId: r.monitor_id,
  monitoriaId: r.monitoria_id,
  titulo: r.titulo,
  descricao: r.descricao ?? "",
  filename: r.filename ?? "",
  uploadedAt: r.uploaded_at,
  fileContent: r.file_content ?? undefined,
  fileType: r.file_type ?? undefined,
  fileSize: r.file_size ?? undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapNotif = (r: any): Notif => ({
  id: r.id,
  toUserId: r.to_user_id,
  title: r.title,
  body: r.body,
  agendamentoId: r.agendamento_id ?? undefined,
  read: r.read,
  at: r.at,
});

// ─── Helper de erro ──────────────────────────────────────────

function extractMsg(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (typeof err === "object" && "message" in (err as object))
    return (err as { message: string }).message;
  return String(err);
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

/** Login → retorna User ou null (e a mensagem de erro) */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { user: null, error: "E-mail ou senha incorretos." };
  }
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (pErr || !profile) return { user: null, error: "Perfil não encontrado." };
  return { user: mapUser(profile), error: null };
}

/** Cadastro de aluno → retorna User ou erro */
export async function signUp(userData: {
  name: string;
  email: string;
  password: string;
  matricula: string;
}): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: { name: userData.name, role: "student", matricula: userData.matricula },
    },
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: "Erro ao criar conta." };

  // O trigger on_auth_user_created cria o perfil automaticamente.
  // Aguarda um breve instante para garantir que o trigger executou.
  await new Promise((r) => setTimeout(r, 500));

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  return { user: profile ? mapUser(profile) : null, error: null };
}

/** Logout */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Retorna o perfil do usuário logado */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return profile ? mapUser(profile) : null;
}

/**
 * Verifica senha atual via re-login silencioso.
 * Usado no ProfileSection antes de salvar alterações.
 */
export async function verifyCurrentPassword(
  email: string,
  password: string
): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

/** Atualiza senha no Supabase Auth */
export async function updateAuthPassword(
  newPassword: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// USERS / PROFILES
// ═══════════════════════════════════════════════════════════════

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("name");
  if (error) { console.error("getUsers:", error.message); return []; }
  return (data ?? []).map(mapUser);
}

/** Cria um professor ou admin via Admin API (requer service_role no Edge Function) */
export async function createUserByAdmin(
  userData: Omit<User, "id" | "password"> & { password: string }
): Promise<{ user: User | null; error: string | null }> {
  // Chama a Supabase Admin API através da função Edge "admin-create-user"
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: userData.role,
      matricula: userData.matricula,
      siape: userData.siape,
      status: userData.status ?? "ativo",
    },
  });
  if (error) return { user: null, error: extractMsg(error) };
  return { user: data.user ? mapUser(data.user) : null, error: null };
}

export async function updateUserProfile(
  id: string,
  updates: Partial<Pick<User, "name" | "email" | "role" | "matricula" | "siape" | "status">>
): Promise<{ error: string | null }> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name      !== undefined) dbUpdates.name      = updates.name;
  if (updates.email     !== undefined) dbUpdates.email     = updates.email;
  if (updates.role      !== undefined) dbUpdates.role      = updates.role;
  if (updates.matricula !== undefined) dbUpdates.matricula = updates.matricula;
  if (updates.siape     !== undefined) dbUpdates.siape     = updates.siape;
  if (updates.status    !== undefined) dbUpdates.status    = updates.status;

  const { error } = await supabase.from("profiles").update(dbUpdates).eq("id", id);
  return { error: error ? error.message : null };
}

export async function deleteUserById(id: string): Promise<{ error: string | null }> {
  // Deleta o perfil; a remoção em auth.users requer Edge Function com service_role
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  // Tenta remover do Auth também (vai falhar silenciosamente se não tiver permissão)
  await supabase.functions.invoke("admin-delete-user", { body: { userId: id } }).catch(() => {});
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// TURMAS
// ═══════════════════════════════════════════════════════════════

export async function getTurmas(): Promise<Turma[]> {
  const { data, error } = await supabase
    .from("turmas")
    .select("*")
    .order("nome_disciplina");
  if (error) { console.error("getTurmas:", error.message); return []; }
  return (data ?? []).map(mapTurma);
}

export async function createTurma(t: Omit<Turma, "id">): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("turmas")
    .insert({
      nome_disciplina: t.nomeDisciplina,
      codigo:          t.codigo,
      professor_id:    t.professorId || null,
      horario:         t.horario,
      status:          t.status,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, error: error ? error.message : null };
}

export async function updateTurma(id: string, t: Partial<Turma>): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {};
  if (t.nomeDisciplina !== undefined) updates.nome_disciplina = t.nomeDisciplina;
  if (t.codigo         !== undefined) updates.codigo          = t.codigo;
  if (t.professorId    !== undefined) updates.professor_id    = t.professorId || null;
  if (t.horario        !== undefined) updates.horario         = t.horario;
  if (t.status         !== undefined) updates.status          = t.status;
  const { error } = await supabase.from("turmas").update(updates).eq("id", id);
  return { error: error ? error.message : null };
}

export async function deleteTurma(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("turmas").delete().eq("id", id);
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// MONITORIAS
// ═══════════════════════════════════════════════════════════════

export async function getMonitorias(): Promise<Monitoria[]> {
  const { data, error } = await supabase
    .from("monitorias_completas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("getMonitorias:", error.message); return []; }
  return (data ?? []).map(mapMonitoria);
}

export async function createMonitoria(m: Omit<Monitoria, "id">): Promise<{ id: string | null; error: string | null }> {
  // 1. Insere a monitoria
  const { data: monData, error: monErr } = await supabase
    .from("monitorias")
    .insert({ semestre: m.semestre, status: m.status })
    .select("id")
    .single();

  if (monErr || !monData) return { id: null, error: monErr?.message ?? "Erro ao criar monitoria" };

  const mid = monData.id as string;

  // 2. Insere turmas
  if (m.turmaIds.length > 0) {
    await supabase.from("monitoria_turmas").insert(
      m.turmaIds.map((tid) => ({ monitoria_id: mid, turma_id: tid }))
    );
  }

  // 3. Insere monitores
  if (m.monitorIds.length > 0) {
    await supabase.from("monitoria_monitores").insert(
      m.monitorIds.map((uid) => ({ monitoria_id: mid, monitor_id: uid }))
    );
  }

  return { id: mid, error: null };
}

export async function updateMonitoria(id: string, m: Partial<Monitoria>): Promise<{ error: string | null }> {
  // 1. Atualiza campos escalares
  if (m.semestre !== undefined || m.status !== undefined) {
    const updates: Record<string, unknown> = {};
    if (m.semestre) updates.semestre = m.semestre;
    if (m.status)   updates.status   = m.status;
    const { error } = await supabase.from("monitorias").update(updates).eq("id", id);
    if (error) return { error: error.message };
  }

  // 2. Recria turmas (delete + insert)
  if (m.turmaIds !== undefined) {
    await supabase.from("monitoria_turmas").delete().eq("monitoria_id", id);
    if (m.turmaIds.length > 0) {
      await supabase.from("monitoria_turmas").insert(
        m.turmaIds.map((tid) => ({ monitoria_id: id, turma_id: tid }))
      );
    }
  }

  // 3. Recria monitores (delete + insert)
  if (m.monitorIds !== undefined) {
    await supabase.from("monitoria_monitores").delete().eq("monitoria_id", id);
    if (m.monitorIds.length > 0) {
      const { error } = await supabase.from("monitoria_monitores").insert(
        m.monitorIds.map((uid) => ({ monitoria_id: id, monitor_id: uid }))
      );
      if (error) return { error: error.message };
    }
  }

  return { error: null };
}

export async function deleteMonitoria(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("monitorias").delete().eq("id", id);
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// HORARIOS
// ═══════════════════════════════════════════════════════════════

export async function getHorarios(): Promise<Horario[]> {
  const { data, error } = await supabase
    .from("horarios")
    .select("*")
    .order("data", { ascending: false });
  if (error) { console.error("getHorarios:", error.message); return []; }
  return (data ?? []).map(mapHorario);
}

export async function createHorario(h: Omit<Horario, "id" | "vagasOcupadas">): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("horarios")
    .insert({
      monitor_id:   h.monitorId,
      monitoria_id: h.monitoriaId,
      data:         h.data,
      hora_inicio:  h.horaInicio,
      hora_fim:     h.horaFim,
      sala:         h.sala,
      bloco:        h.bloco,
      link_online:  h.linkOnline ?? null,
      modalidade:   h.modalidade,
      vagas:        h.vagas,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, error: error ? error.message : null };
}

export async function updateHorario(id: string, h: Partial<Horario>): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {};
  if (h.monitoriaId !== undefined) updates.monitoria_id = h.monitoriaId;
  if (h.data        !== undefined) updates.data         = h.data;
  if (h.horaInicio  !== undefined) updates.hora_inicio  = h.horaInicio;
  if (h.horaFim     !== undefined) updates.hora_fim     = h.horaFim;
  if (h.sala        !== undefined) updates.sala         = h.sala;
  if (h.bloco       !== undefined) updates.bloco        = h.bloco;
  if (h.linkOnline  !== undefined) updates.link_online  = h.linkOnline ?? null;
  if (h.modalidade  !== undefined) updates.modalidade   = h.modalidade;
  if (h.vagas       !== undefined) updates.vagas        = h.vagas;
  const { error } = await supabase.from("horarios").update(updates).eq("id", id);
  return { error: error ? error.message : null };
}

export async function deleteHorario(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("horarios").delete().eq("id", id);
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// AGENDAMENTOS
// ═══════════════════════════════════════════════════════════════

export async function getAgendamentos(): Promise<Agendamento[]> {
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("getAgendamentos:", error.message); return []; }
  return (data ?? []).map(mapAgendamento);
}

export async function createAgendamento(
  a: Omit<Agendamento, "id">
): Promise<{ agendamento: Agendamento | null; error: string | null }> {
  const { data, error } = await supabase
    .from("agendamentos")
    .insert({
      aluno_id:         a.alunoId,
      horario_id:       a.horarioId,
      monitoria_id:     a.monitoriaId,
      data:             a.data,
      duvida_principal: a.duvidaPrincipal ?? null,
      status:           "confirmado",
    })
    .select("*")
    .single();

  if (error) {
    // Extrai mensagem amigável do trigger de capacidade
    const msg = error.message.includes("VAGAS_ESGOTADAS")
      ? "Este horário já está com todas as vagas preenchidas."
      : error.message.includes("unique") || error.message.includes("duplicate")
      ? "Você já tem um agendamento para este horário."
      : error.message;
    return { agendamento: null, error: msg };
  }
  return { agendamento: data ? mapAgendamento(data) : null, error: null };
}

export async function updateAgendamento(
  id: string,
  updates: Partial<Pick<Agendamento, "status" | "data" | "horarioId" | "duvidaPrincipal">>
): Promise<{ error: string | null }> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.status          !== undefined) dbUpdates.status           = updates.status;
  if (updates.data            !== undefined) dbUpdates.data             = updates.data;
  if (updates.horarioId       !== undefined) dbUpdates.horario_id       = updates.horarioId;
  if (updates.duvidaPrincipal !== undefined) dbUpdates.duvida_principal = updates.duvidaPrincipal ?? null;
  const { error } = await supabase.from("agendamentos").update(dbUpdates).eq("id", id);
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// CHAMADAS
// ═══════════════════════════════════════════════════════════════

export async function getChamadas(): Promise<Chamada[]> {
  const { data, error } = await supabase.from("chamadas").select("*");
  if (error) { console.error("getChamadas:", error.message); return []; }
  return (data ?? []).map(mapChamada);
}

export async function upsertChamada(
  c: Omit<Chamada, "id">
): Promise<{ chamada: Chamada | null; error: string | null }> {
  const { data, error } = await supabase
    .from("chamadas")
    .upsert(
      {
        aluno_id:   c.alunoId,
        horario_id: c.horarioId,
        data:       c.data,
        presente:   c.presente,
      },
      { onConflict: "aluno_id,horario_id,data" }
    )
    .select("*")
    .single();
  return { chamada: data ? mapChamada(data) : null, error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// MATERIAIS
// ═══════════════════════════════════════════════════════════════

export async function getMateriais(): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materiais")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) { console.error("getMateriais:", error.message); return []; }
  return (data ?? []).map(mapMaterial);
}

export async function createMaterial(m: Omit<Material, "id">): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("materiais")
    .insert({
      monitor_id:   m.monitorId,
      monitoria_id: m.monitoriaId,
      horario_id:   m.horarioId ?? null,
      titulo:       m.titulo,
      descricao:    m.descricao,
      filename:     m.filename,
      file_content: m.fileContent ?? null,
      file_type:    m.fileType ?? null,
      file_size:    m.fileSize ?? null,
      uploaded_at:  m.uploadedAt,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, error: error ? error.message : null };
}

export async function updateMaterial(id: string, m: Partial<Material>): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {};
  if (m.monitoriaId !== undefined) updates.monitoria_id = m.monitoriaId;
  if (m.horarioId   !== undefined) updates.horario_id   = m.horarioId ?? null;
  if (m.titulo      !== undefined) updates.titulo       = m.titulo;
  if (m.descricao   !== undefined) updates.descricao    = m.descricao;
  if (m.filename    !== undefined) updates.filename     = m.filename;
  if (m.fileContent !== undefined) updates.file_content = m.fileContent ?? null;
  if (m.fileType    !== undefined) updates.file_type    = m.fileType ?? null;
  if (m.fileSize    !== undefined) updates.file_size    = m.fileSize ?? null;
  const { error } = await supabase.from("materiais").update(updates).eq("id", id);
  return { error: error ? error.message : null };
}

export async function deleteMaterial(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("materiais").delete().eq("id", id);
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// RELATORIOS
// ═══════════════════════════════════════════════════════════════

export async function getRelatorios(): Promise<Relatorio[]> {
  const { data, error } = await supabase
    .from("relatorios")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) { console.error("getRelatorios:", error.message); return []; }
  return (data ?? []).map(mapRelatorio);
}

export async function createRelatorio(r: Omit<Relatorio, "id">): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("relatorios")
    .insert({
      monitor_id:   r.monitorId,
      monitoria_id: r.monitoriaId,
      titulo:       r.titulo,
      descricao:    r.descricao,
      filename:     r.filename,
      file_content: r.fileContent ?? null,
      file_type:    r.fileType ?? null,
      file_size:    r.fileSize ?? null,
      uploaded_at:  r.uploadedAt,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, error: error ? error.message : null };
}

export async function updateRelatorio(id: string, r: Partial<Relatorio>): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {};
  if (r.titulo      !== undefined) updates.titulo       = r.titulo;
  if (r.descricao   !== undefined) updates.descricao    = r.descricao;
  if (r.filename    !== undefined) updates.filename     = r.filename;
  if (r.fileContent !== undefined) updates.file_content = r.fileContent ?? null;
  if (r.fileType    !== undefined) updates.file_type    = r.fileType ?? null;
  if (r.fileSize    !== undefined) updates.file_size    = r.fileSize ?? null;
  const { error } = await supabase.from("relatorios").update(updates).eq("id", id);
  return { error: error ? error.message : null };
}

export async function deleteRelatorio(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("relatorios").delete().eq("id", id);
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICAÇÕES
// ═══════════════════════════════════════════════════════════════

export async function getNotificacoes(userId: string): Promise<Notif[]> {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("to_user_id", userId)
    .order("at", { ascending: false });
  if (error) { console.error("getNotificacoes:", error.message); return []; }
  return (data ?? []).map(mapNotif);
}

export async function markNotifAsRead(id: string): Promise<void> {
  await supabase.from("notificacoes").update({ read: true }).eq("id", id);
}

export async function createNotif(
  n: Omit<Notif, "id" | "at" | "read">
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("notificacoes").insert({
    to_user_id:     n.toUserId,
    title:          n.title,
    body:           n.body,
    agendamento_id: n.agendamentoId ?? null,
  });
  return { error: error ? error.message : null };
}

// ═══════════════════════════════════════════════════════════════
// CARREGAMENTO COMPLETO (chamado no boot do App)
// ═══════════════════════════════════════════════════════════════

export interface AppData {
  users:        User[];
  turmas:       Turma[];
  monitorias:   Monitoria[];
  horarios:     Horario[];
  agendamentos: Agendamento[];
  chamadas:     Chamada[];
  materiais:    Material[];
  relatorios:   Relatorio[];
}

export async function loadAllData(): Promise<AppData> {
  const [
    users, turmas, monitorias, horarios,
    agendamentos, chamadas, materiais, relatorios,
  ] = await Promise.all([
    getUsers(), getTurmas(), getMonitorias(), getHorarios(),
    getAgendamentos(), getChamadas(), getMateriais(), getRelatorios(),
  ]);
  return { users, turmas, monitorias, horarios, agendamentos, chamadas, materiais, relatorios };
}

// ═══════════════════════════════════════════════════════════════
// SYNC HELPERS (diff arrays e propaga para Supabase)
// Usados pelos onUpdate* handlers do App.tsx
// ═══════════════════════════════════════════════════════════════

function diffArrays<T extends { id: string }>(
  oldArr: T[],
  newArr: T[]
): { added: T[]; removed: string[]; updated: T[] } {
  const added   = newArr.filter((n) => !oldArr.some((o) => o.id === n.id));
  const removed = oldArr
    .filter((o) => !newArr.some((n) => n.id === o.id))
    .map((o) => o.id);
  const updated = newArr.filter((n) => {
    const o = oldArr.find((x) => x.id === n.id);
    return o && JSON.stringify(o) !== JSON.stringify(n);
  });
  return { added, removed, updated };
}

/** Sincroniza array de Users com o DB */
export async function syncUsers(oldArr: User[], newArr: User[]): Promise<void> {
  const { added, removed, updated } = diffArrays(oldArr, newArr);
  await Promise.allSettled([
    ...removed.map((id) => deleteUserById(id)),
    ...updated.map((u) => updateUserProfile(u.id, u)),
    // added: só admins podem criar usuários; isso é tratado via createUserByAdmin
  ]);
  if (added.length > 0) {
    console.warn("syncUsers: novos usuários precisam ser criados via createUserByAdmin.");
  }
}

/** Sincroniza Turmas */
export async function syncTurmas(oldArr: Turma[], newArr: Turma[]): Promise<void> {
  const { added, removed, updated } = diffArrays(oldArr, newArr);
  await Promise.allSettled([
    ...added.map((t) => createTurma(t)),
    ...removed.map((id) => deleteTurma(id)),
    ...updated.map((t) => updateTurma(t.id, t)),
  ]);
}

/** Sincroniza Monitorias */
export async function syncMonitorias(oldArr: Monitoria[], newArr: Monitoria[]): Promise<{ newIds: Map<string,string> }> {
  const { added, removed, updated } = diffArrays(oldArr, newArr);
  const newIds = new Map<string, string>();

  await Promise.allSettled(removed.map((id) => deleteMonitoria(id)));
  await Promise.allSettled(updated.map((m) => updateMonitoria(m.id, m)));

  for (const m of added) {
    const { id } = await createMonitoria(m);
    if (id) newIds.set(m.id, id);   // mapeia ID temporário → UUID real
  }
  return { newIds };
}

/** Sincroniza Horarios */
export async function syncHorarios(oldArr: Horario[], newArr: Horario[]): Promise<{ newIds: Map<string,string> }> {
  const { added, removed, updated } = diffArrays(oldArr, newArr);
  const newIds = new Map<string, string>();

  await Promise.allSettled(removed.map((id) => deleteHorario(id)));
  await Promise.allSettled(updated.map((h) => updateHorario(h.id, h)));

  for (const h of added) {
    const { id } = await createHorario(h);
    if (id) newIds.set(h.id, id);
  }
  return { newIds };
}

/** Sincroniza Agendamentos */
export async function syncAgendamentos(oldArr: Agendamento[], newArr: Agendamento[]): Promise<void> {
  const { added, updated } = diffArrays(oldArr, newArr);
  // Cancelamentos = update de status
  await Promise.allSettled(
    updated.map((a) => updateAgendamento(a.id, { status: a.status, data: a.data, horarioId: a.horarioId, duvidaPrincipal: a.duvidaPrincipal }))
  );
  for (const a of added) {
    await createAgendamento(a);
  }
}

/** Sincroniza Chamadas */
export async function syncChamadas(oldArr: Chamada[], newArr: Chamada[]): Promise<void> {
  const { added, updated } = diffArrays(oldArr, newArr);
  await Promise.allSettled(
    [...added, ...updated].map((c) => upsertChamada(c))
  );
}

/** Sincroniza Materiais */
export async function syncMateriais(oldArr: Material[], newArr: Material[]): Promise<void> {
  const { added, removed, updated } = diffArrays(oldArr, newArr);
  await Promise.allSettled([
    ...removed.map((id) => deleteMaterial(id)),
    ...updated.map((m) => updateMaterial(m.id, m)),
    ...added.map((m) => createMaterial(m)),
  ]);
}

/** Sincroniza Relatorios */
export async function syncRelatorios(oldArr: Relatorio[], newArr: Relatorio[]): Promise<void> {
  const { added, removed, updated } = diffArrays(oldArr, newArr);
  await Promise.allSettled([
    ...removed.map((id) => deleteRelatorio(id)),
    ...updated.map((r) => updateRelatorio(r.id, r)),
    ...added.map((r) => createRelatorio(r)),
  ]);
}
