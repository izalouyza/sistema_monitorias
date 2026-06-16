// src/services/api.ts
// Cole este arquivo em src/frontend/src/services/api.ts
// Ele substitui os dados em memória do App.tsx pela API real do backend.

const BASE_URL = 'http://localhost:3001/api';

// ── Token ────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('sgm_token');
}

export function setToken(token: string) {
  localStorage.setItem('sgm_token', token);
}

export function clearToken() {
  localStorage.removeItem('sgm_token');
}

// ── Fetch base ───────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authService = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string; matricula: string }) =>
    api.post<{ user: User }>('/auth/register', data),

  me: () => api.get<User>('/auth/me'),

  updateProfile: (data: Partial<User> & { currentPassword?: string; newPassword?: string }) =>
    api.put<User>('/auth/me', data),
};

// ── Users ────────────────────────────────────────────────────────────────────

export const userService = {
  list: (role?: string) =>
    api.get<User[]>(`/users${role ? `?role=${role}` : ''}`),

  create: (data: Partial<User> & { password: string }) =>
    api.post<User>('/users', data),

  update: (id: string, data: Partial<User> & { password?: string }) =>
    api.put<User>(`/users/${id}`, data),

  remove: (id: string) => api.delete(`/users/${id}`),
};

// ── Turmas ───────────────────────────────────────────────────────────────────

export const turmaService = {
  list: () => api.get<Turma[]>('/turmas'),
  create: (data: Partial<Turma>) => api.post<Turma>('/turmas', data),
  update: (id: string, data: Partial<Turma>) => api.put<Turma>(`/turmas/${id}`, data),
  remove: (id: string) => api.delete(`/turmas/${id}`),
};

// ── Monitorias ───────────────────────────────────────────────────────────────

export const monitoriaService = {
  list: () => api.get<Monitoria[]>('/monitorias'),
  create: (data: Partial<Monitoria>) => api.post<Monitoria>('/monitorias', data),
  update: (id: string, data: Partial<Monitoria>) => api.put<Monitoria>(`/monitorias/${id}`, data),
  remove: (id: string) => api.delete(`/monitorias/${id}`),
};

// ── Horários ─────────────────────────────────────────────────────────────────

export const horarioService = {
  list: () => api.get<Horario[]>('/horarios'),
  create: (data: Partial<Horario>) => api.post<Horario>('/horarios', data),
  update: (id: string, data: Partial<Horario>) => api.put<Horario>(`/horarios/${id}`, data),
  remove: (id: string) => api.delete(`/horarios/${id}`),
};

// ── Agendamentos ─────────────────────────────────────────────────────────────

export const agendamentoService = {
  list: () => api.get<Agendamento[]>('/agendamentos'),
  create: (data: Partial<Agendamento>) => api.post<Agendamento>('/agendamentos', data),
  update: (id: string, data: Partial<Agendamento>) => api.put<Agendamento>(`/agendamentos/${id}`, data),
};

// ── Chamadas ─────────────────────────────────────────────────────────────────

export const chamadaService = {
  list: () => api.get<Chamada[]>('/chamadas'),
  upsert: (data: { alunoId: string; horarioId: string; data: string; presente: boolean }) =>
    api.post<Chamada>('/chamadas', data),
  toggle: (id: string, presente: boolean) =>
    api.patch<Chamada>(`/chamadas/${id}`, { presente }),
};

// ── Materiais ────────────────────────────────────────────────────────────────

export const materialService = {
  list: () => api.get<Material[]>('/materiais'),
  create: (data: Partial<Material>) => api.post<Material>('/materiais', data),
  update: (id: string, data: Partial<Material>) => api.put<Material>(`/materiais/${id}`, data),
  remove: (id: string) => api.delete(`/materiais/${id}`),
};

// ── Relatórios ───────────────────────────────────────────────────────────────

export const relatorioService = {
  list: () => api.get<Relatorio[]>('/relatorios'),
  create: (data: Partial<Relatorio>) => api.post<Relatorio>('/relatorios', data),
  update: (id: string, data: Partial<Relatorio>) => api.put<Relatorio>(`/relatorios/${id}`, data),
  remove: (id: string) => api.delete(`/relatorios/${id}`),
};

// ── Notificações ─────────────────────────────────────────────────────────────

export const notificacaoService = {
  list: () => api.get<Notif[]>('/notificacoes'),
  create: (data: { toUserId: string; title: string; body: string; agendamentoId?: string }) =>
    api.post<Notif>('/notificacoes', data),
  markRead: (id: string) => api.patch<Notif>(`/notificacoes/${id}/read`),
  markAllRead: () => api.patch('/notificacoes/read-all'),
};

// ── Tipos (espelho dos tipos do App.tsx) ─────────────────────────────────────
// Estes são apenas para tipagem; não precisam ser reimportados se já existem no App.tsx

export type Role = 'admin' | 'student' | 'monitor' | 'professor';

export interface User {
  id: string; name: string; email: string; password: string;
  role: Role; matricula?: string; siape?: string; status?: 'ativo' | 'inativo';
}
export interface Turma {
  id: string; nomeDisciplina: string; codigo: string;
  professorId: string; horario: string; status: 'ativa' | 'encerrada';
}
export interface Monitoria {
  id: string; turmaIds: string[]; monitorIds: string[];
  semestre: string; status: 'ativa' | 'encerrada';
}
export interface Horario {
  id: string; monitorId: string; monitoriaId: string; data: string;
  horaInicio: string; horaFim: string; sala: string; bloco: string;
  linkOnline?: string; modalidade: 'presencial' | 'online';
  vagas: number; vagasOcupadas: number;
}
export interface Agendamento {
  id: string; alunoId: string; horarioId: string; monitoriaId: string;
  data: string; duvidaPrincipal?: string; status: 'confirmado' | 'cancelado';
}
export interface Chamada {
  id: string; alunoId: string; horarioId: string; data: string; presente: boolean;
}
export interface Material {
  id: string; monitorId: string; monitoriaId: string; horarioId?: string;
  titulo: string; descricao: string; filename: string;
  fileContent?: string; fileType?: string; fileSize?: number; uploadedAt: string;
}
export interface Relatorio {
  id: string; monitorId: string; monitoriaId: string; titulo: string;
  descricao: string; filename: string; fileContent?: string;
  fileType?: string; fileSize?: number; uploadedAt: string;
}
export interface Notif {
  id: string; toUserId: string; title: string; body: string;
  agendamentoId?: string; read: boolean; at: string;
}
