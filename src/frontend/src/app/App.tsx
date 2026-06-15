import { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BookOpen,
  Users,
  Calendar,
  BarChart2,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  UserCheck,
  Eye,
  EyeOff,
  GraduationCap,
  ArrowLeftRight,
  Link2,
  Bell,
  ChevronRight,
  Shield,
  Mail,
  Filter,
  FileText,
  Upload,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "admin" | "student" | "monitor" | "professor";

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  matricula?: string;
  siape?: string;
  status?: "ativo" | "inativo";
}
interface Turma {
  id: string;
  nomeDisciplina: string;
  codigo: string;
  professorId: string;
  horario: string;
  status: "ativa" | "encerrada";
}
interface Monitoria {
  id: string;
  turmaIds: string[];
  monitorIds: string[];
  semestre: string;
  status: "ativa" | "encerrada";
}
interface Horario {
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
  vagasOcupadas: number;
}
interface Agendamento {
  id: string;
  alunoId: string;
  horarioId: string;
  monitoriaId: string;
  data: string;
  duvidaPrincipal?: string;
  status: "confirmado" | "cancelado";
}
interface Chamada {
  id: string;
  alunoId: string;
  horarioId: string;
  data: string;
  presente: boolean;
}
interface Material {
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
interface Relatorio {
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
interface Notif {
  id: string;
  toUserId: string;
  title: string;
  body: string;
  agendamentoId?: string;
  read: boolean;
  at: string;
}

// ─── Utility functions ────────────────────────────────────────────────────────

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDiaSemana(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dias = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return dias[dt.getDay()];
}

function calcHoras(ini: string, fim: string): number {
  const [ih, im] = ini.split(":").map(Number);
  const [fh, fm] = fim.split(":").map(Number);
  return (fh * 60 + fm - (ih * 60 + im)) / 60;
}

function getWeekMonday(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, "0");
  const rd = String(dt.getDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
}

function totalHorasNaSemana(
  horarios: Horario[],
  monitorId: string,
  data: string,
  excludeId?: string,
): number {
  const monday = getWeekMonday(data);
  const [my, mm, md] = monday.split("-").map(Number);
  const monDate = new Date(my, mm - 1, md);
  const sunDate = new Date(my, mm - 1, md + 6);
  let total = 0;
  for (const h of horarios) {
    if (h.monitorId !== monitorId) continue;
    if (excludeId && h.id === excludeId) continue;
    const [hy, hm, hd] = h.data.split("-").map(Number);
    const hDate = new Date(hy, hm - 1, hd);
    if (hDate >= monDate && hDate <= sunDate) {
      total += calcHoras(h.horaInicio, h.horaFim);
    }
  }
  return total;
}

function formatDate(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dia = getDiaSemana(data);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y} (${dia})`;
}

function downloadFile(
  content: string,
  filename: string,
  type = "text/plain;charset=utf-8",
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadMaterial(mat: Material) {
  if (mat.fileContent) {
    const a = document.createElement("a");
    a.href = mat.fileContent;
    a.download = mat.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    downloadFile(
      `Título: ${mat.titulo}\nDescrição: ${mat.descricao}\nArquivo: ${mat.filename}\nData: ${mat.uploadedAt}`,
      mat.filename || `${mat.titulo}.txt`,
    );
  }
}

function downloadRelatorio(rel: Relatorio) {
  if (rel.fileContent) {
    const a = document.createElement("a");
    a.href = rel.fileContent;
    a.download = rel.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    downloadFile(
      `Relatório: ${rel.titulo}\nDescrição: ${rel.descricao}\nArquivo: ${rel.filename}\nData: ${rel.uploadedAt}`,
      rel.filename || `${rel.titulo}.txt`,
    );
  }
}

function isSessionPast(data: string, horaFim: string): boolean {
  const [y, m, d] = data.split("-").map(Number);
  const [fh, fm] = horaFim.split(":").map(Number);
  const end = new Date(y, m - 1, d, fh, fm);
  return new Date() > end;
}

/** Format YYYY-MM-DD → dd/mm/aaaa */
function fmtDate(data: string): string {
  if (!data) return "";
  const [y, m, d] = data.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** Dynamic available spots (avoids stale vagasOcupadas) */
function vagasLivres(h: Horario, agendamentos: Agendamento[]): number {
  const ocupadas = agendamentos.filter(
    (a) => a.horarioId === h.id && a.status !== "cancelado",
  ).length;
  return Math.max(0, h.vagas - ocupadas);
}

type ComputedStatus = "confirmado" | "presente" | "ausente" | "cancelado";
function computeStatus(
  a: Agendamento,
  h: Horario | undefined,
  chamadas: Chamada[],
): ComputedStatus {
  if (a.status === "cancelado") return "cancelado";
  if (!h || !isSessionPast(h.data, h.horaFim)) return "confirmado";
  const cham = chamadas.find(
    (c) => c.alunoId === a.alunoId && c.horarioId === h.id,
  );
  return cham?.presente ? "presente" : "ausente";
}

function statusLabel(s: ComputedStatus) {
  if (s === "presente")
    return { label: "Presente", cls: "bg-emerald-100 text-emerald-700" };
  if (s === "ausente")
    return { label: "Ausente", cls: "bg-amber-100 text-amber-700" };
  if (s === "cancelado")
    return { label: "Cancelado", cls: "bg-slate-100 text-slate-500" };
  return { label: "Confirmado", cls: "bg-blue-100 text-blue-700" };
}

/** Total presencial + online hours for a monitor (across ALL their horarios) */
function horasTotais(
  horarios: Horario[],
  monitorId: string,
): { presencial: number; online: number } {
  let presencial = 0;
  let online = 0;
  horarios
    .filter((h) => h.monitorId === monitorId)
    .forEach((h) => {
      const hrs = calcHoras(h.horaInicio, h.horaFim);
      if (h.modalidade === "presencial") presencial += hrs;
      else online += hrs;
    });
  return { presencial, online };
}

function minutesUntilSession(data: string, horaInicio: string): number {
  const [y, m, d] = data.split("-").map(Number);
  const [ih, im] = horaInicio.split(":").map(Number);
  const start = new Date(y, m - 1, d, ih, im);
  return (start.getTime() - Date.now()) / 60000;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

let _uid = 300;
const nid = () => `g${++_uid}`;

const SEED_USERS: User[] = [];

const SEED_TURMAS: Turma[] = [];

const SEED_MONS: Monitoria[] = [];

const SEED_HORS: Horario[] = [];

const SEED_AGEND: Agendamento[] = [];

const SEED_CHAMS: Chamada[] = [];

const SEED_MATERIAIS: Material[] = [];

const SEED_RELATORIOS: Relatorio[] = [];

const BLOCOS = ["Bloco de Aulas I", "Bloco de Aulas II", "LTI"];

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIMARY_BG = "#3B69B0";
const SIDEBAR_BG = "#1E3465";
const PAGE_BG = "#EEF2FA";
const SIDEBAR_ACCENT = "rgba(255,255,255,0.13)";

const ERR_CLS = "text-rose-700 bg-rose-50 border border-rose-200";
const ERR_T = "text-rose-700";
const OK_CLS = "text-emerald-700 bg-emerald-50 border border-emerald-200";
const WARN_CLS = "text-amber-700 bg-amber-50 border border-amber-200";

const inputCls = (err?: boolean) =>
  `w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 focus:border-[#3B69B0] transition bg-slate-50 text-slate-800 placeholder-slate-400 ${err ? "border-rose-300 bg-rose-50/20" : "border-slate-200"}`;
const selectCls = `w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 bg-slate-50 text-slate-800`;

// ─── Shared components ────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz =
    size === "sm"
      ? "w-7 h-7 text-xs"
      : size === "lg"
        ? "w-11 h-11 text-base"
        : "w-9 h-9 text-sm";
  return (
    <div
      className={`${sz} rounded-full text-white flex items-center justify-center font-semibold flex-shrink-0 select-none`}
      style={{ backgroundColor: PRIMARY_BG }}
    >
      {initials(name)}
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const active = s === "ativa" || s === "ativo";
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${active ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
    >
      {s === "ativa"
        ? "Ativa"
        : s === "ativo"
          ? "Ativo"
          : s === "encerrada"
            ? "Encerrada"
            : "Inativo"}
    </span>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className={`${ERR_T} text-xs mt-1.5 flex items-center gap-1.5`}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3
            className="text-base font-semibold text-slate-800"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function CancelBtn({
  onClick,
  label = "Cancelar",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
    >
      {label}
    </button>
  );
}
function PrimaryBtn({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: disabled ? "#93a5c5" : PRIMARY_BG }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLElement).style.backgroundColor = "#2E5494";
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLElement).style.backgroundColor = PRIMARY_BG;
      }}
    >
      {label}
    </button>
  );
}

function DeleteModal({
  msg,
  onCancel,
  onConfirm,
}: {
  msg: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          Confirmar exclusão
        </h3>
        <p className="text-sm text-slate-500 mb-5">{msg}</p>
        <div className="flex gap-3">
          <CancelBtn onClick={onCancel} />
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-semibold transition"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function SBar({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 bg-white shadow-sm text-slate-800 placeholder-slate-400"
      />
    </div>
  );
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  minDate,
  highlightDates,
}: {
  selected: string;
  onSelect: (d: string) => void;
  minDate?: string;
  highlightDates?: Record<string, { count: number; times: string[] }>;
}) {
  const todayStr = today();
  const parseDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const initYear = selected
    ? parseDate(selected).getFullYear()
    : new Date().getFullYear();
  const initMonth = selected
    ? parseDate(selected).getMonth()
    : new Date().getMonth();
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  // Monday-first: adjust so Monday=0
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <span className="text-xs font-semibold text-slate-700">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayLabels.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-slate-400 py-0.5"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === selected;
          const isToday = dateStr === todayStr;
          const isDisabled = minDate ? dateStr < minDate : false;
          const hlInfo = highlightDates?.[dateStr];
          return (
            <button
              key={dateStr}
              onClick={() => !isDisabled && onSelect(dateStr)}
              disabled={isDisabled}
              title={
                hlInfo ? `Horários: ${hlInfo.times.join(", ")}` : undefined
              }
              className={`h-7 w-full rounded-lg text-xs transition font-medium
                ${isSelected ? "text-white" : isToday ? "text-slate-800 font-bold underline" : isDisabled ? "text-slate-300 cursor-not-allowed" : hlInfo ? "text-white font-semibold" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
              style={{
                backgroundColor: isSelected
                  ? PRIMARY_BG
                  : hlInfo
                    ? "#60A5FA"
                    : undefined,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar & DashboardLayout ────────────────────────────────────────────────

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

function Sidebar({
  user,
  items,
  active,
  onSelect,
  onLogout,
  extraButton,
  isOpen,
  onClose,
}: {
  user: User;
  items: SidebarItem[];
  active: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
  extraButton?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) {
  const ROLE_LABEL: Record<Role, string> = {
    admin: "Administrador",
    professor: "Professor",
    monitor: "Monitor",
    student: "Aluno",
  };
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-200 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2
              className="text-white font-bold text-lg leading-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              UfersaMentor
            </h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Ufersa – Pau dos Ferros
            </p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-blue-300 hover:text-white transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="md" />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {user.name}
              </p>
              <span className="text-blue-300 text-xs">
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active === item.id ? "text-white" : "text-blue-300 hover:text-white hover:bg-white/10"}`}
              style={{
                backgroundColor:
                  active === item.id ? SIDEBAR_ACCENT : undefined,
              }}
            >
              {item.icon}
              {item.label}
              {active === item.id && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
              )}
            </button>
          ))}
        </nav>
        {extraButton && (
          <div className="px-3 py-2 border-t border-white/10">
            {extraButton}
          </div>
        )}
        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Sair do Portal
          </button>
        </div>
      </aside>
    </>
  );
}

function DashboardLayout({
  user,
  sidebarItems,
  activeSection,
  onSectionChange,
  onLogout,
  extraSidebarButton,
  title,
  children,
  notifs,
  onNotifRead,
  onNotifAction,
}: {
  user: User;
  sidebarItems: SidebarItem[];
  activeSection: string;
  onSectionChange: (s: string) => void;
  onLogout: () => void;
  extraSidebarButton?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  notifs?: Notif[];
  onNotifRead?: (id: string) => void;
  onNotifAction?: (agendId?: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const unread = (notifs || []).filter((n) => !n.read).length;
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: PAGE_BG, fontFamily: "Inter, sans-serif" }}
    >
      <Sidebar
        user={user}
        items={sidebarItems}
        active={activeSection}
        onSelect={onSectionChange}
        onLogout={onLogout}
        extraButton={extraSidebarButton}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-700">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Bell with notification badge */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
              >
                <Bell className="w-4 h-4" />
              </button>
              {unread > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: PRIMARY_BG }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              {bellOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setBellOpen(false)}
                  />
                  <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800 text-sm">
                        Notificações
                      </h3>
                      {unread > 0 && (
                        <button
                          onClick={() => {
                            (notifs || [])
                              .filter((n) => !n.read)
                              .forEach((n) => onNotifRead?.(n.id));
                          }}
                          className="text-xs hover:underline"
                          style={{ color: PRIMARY_BG }}
                        >
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    {!notifs?.length ? (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">
                        Nenhuma notificação
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                        {[...notifs]
                          .sort((a, b) => b.at.localeCompare(a.at))
                          .map((n) => (
                            <button
                              key={n.id}
                              onClick={() => {
                                onNotifRead?.(n.id);
                                if (n.agendamentoId)
                                  onNotifAction?.(n.agendamentoId);
                                setBellOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition ${!n.read ? "bg-blue-50/50" : ""}`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "" : "bg-transparent"}`}
                                style={{
                                  backgroundColor: !n.read
                                    ? PRIMARY_BG
                                    : "transparent",
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm ${!n.read ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}
                                >
                                  {n.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                  {n.body}
                                </p>
                                <p className="text-xs text-slate-300 mt-1">
                                  {fmtTime(n.at)}
                                </p>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <Avatar name={user.name} size="sm" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

// ─── Academic Illustration ────────────────────────────────────────────────────

function AcademicIllustration() {
  return (
    <svg viewBox="0 0 440 440" className="w-full max-w-xs" aria-hidden="true">
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 7 }, (_, c) => (
          <circle
            key={`d${r}-${c}`}
            cx={22 + c * 66}
            cy={22 + r * 66}
            r={2.2}
            fill="rgba(255,255,255,0.14)"
          />
        )),
      )}
      {(
        [
          [220, 220, 100, 110],
          [220, 220, 340, 110],
          [220, 220, 100, 330],
          [220, 220, 340, 330],
          [100, 110, 340, 110],
          [100, 330, 340, 330],
          [220, 220, 220, 68],
          [220, 220, 372, 220],
        ] as [number, number, number, number][]
      ).map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
      ))}
      <circle
        cx="220"
        cy="220"
        r="78"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1.5"
      />
      <circle
        cx="220"
        cy="220"
        r="54"
        fill="rgba(255,255,255,0.11)"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="2"
      />
      <polygon
        points="220,198 247,213 220,229 193,213"
        fill="rgba(255,255,255,0.93)"
      />
      <rect
        x="239"
        y="213"
        width="2.5"
        height="14"
        fill="rgba(255,255,255,0.6)"
      />
      <circle cx="240.2" cy="228.5" r="4" fill="rgba(255,255,255,0.55)" />
      {(
        [
          [100, 110],
          [340, 110],
          [100, 330],
          [340, 330],
        ] as [number, number][]
      ).map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={36}
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.32)"
          strokeWidth="1.5"
        />
      ))}
      <rect
        x="86"
        y="98"
        width="28"
        height="25"
        rx="3"
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.7"
      />
      <line
        x1="100"
        y1="98"
        x2="100"
        y2="123"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.5"
      />
      <circle
        cx="340"
        cy="100"
        r="9"
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.7"
      />
      <path
        d="M323 128 Q340 120 357 128"
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.7"
      />
      <rect
        x="86"
        y="318"
        width="28"
        height="25"
        rx="2"
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.7"
      />
      <line
        x1="86"
        y1="327"
        x2="114"
        y2="327"
        stroke="rgba(255,255,255,0.68)"
        strokeWidth="1.4"
      />
      <line
        x1="96"
        y1="315"
        x2="96"
        y2="321"
        stroke="rgba(255,255,255,0.58)"
        strokeWidth="1.5"
      />
      <line
        x1="106"
        y1="315"
        x2="106"
        y2="321"
        stroke="rgba(255,255,255,0.58)"
        strokeWidth="1.5"
      />
      <rect
        x="325"
        y="330"
        width="7"
        height="13"
        rx="1.5"
        fill="rgba(255,255,255,0.82)"
      />
      <rect
        x="336"
        y="322"
        width="7"
        height="21"
        rx="1.5"
        fill="rgba(255,255,255,0.82)"
      />
      <rect
        x="347"
        y="326"
        width="7"
        height="17"
        rx="1.5"
        fill="rgba(255,255,255,0.82)"
      />
      <circle
        cx="220"
        cy="66"
        r="20"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />
      <circle cx="220" cy="61" r="5.5" fill="rgba(255,255,255,0.7)" />
      <line
        x1="214"
        y1="74"
        x2="226"
        y2="74"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.4"
      />
      <circle
        cx="374"
        cy="220"
        r="20"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />
      <path d="M365 220 l10-6 0 12 z" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({
  users,
  onLogin,
  onGoRegister,
}: {
  users: User[];
  onLogin: (u: User) => void;
  onGoRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emptyErr, setEmptyErr] = useState({ email: false, pass: false });

  const [fpModal, setFpModal] = useState(false);
  const [fpStep, setFpStep] = useState<"email" | "code" | "done">("email");
  const [fpEmail, setFpEmail] = useState("");
  const [fpEmailErr, setFpEmailErr] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpCodeErr, setFpCodeErr] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  const emailDomainErr = useMemo(() => {
    if (!email || !email.includes("@")) return "";
    const ok =
      email.endsWith("@alunos.ufersa.edu.br") ||
      email.endsWith("@ufersa.edu.br");
    return ok ? "" : "E-mail deve ser do domínio @alunos.ufersa.edu.br";
  }, [email]);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. Validações de front que você já tinha
  const noEmail = !email.trim();
  const noPass = !pass.trim();
  setEmptyErr({ email: noEmail, pass: noPass });
  setEmailTouched(true);
  if (noEmail || noPass) return;
  if (emailDomainErr) return;

  // 2. Chamada para o seu Backend Real
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        matricula: email, // Usando o campo email/matrícula do seu form
        senha: pass 
      })
    });

    const dados = await response.json();

    if (response.ok) {
      // Sucesso! O backend devolveu o usuário validado
      onLogin(dados.usuario); 
    } else {
      // Erro vindo do servidor (ex: senha incorreta ou usuário inexistente)
      setSubmitError(dados.erro || "E-mail ou senha incorretos.");
    }
  } catch (err) {
    // Erro de conexão (ex: servidor desligado)
    setSubmitError("Erro ao conectar ao servidor. Verifique se o backend está ligado.");
  }
};

  const openForgot = () => {
    setFpModal(true);
    setFpStep("email");
    setFpEmail("");
    setFpEmailErr("");
    setFpCode("");
    setFpCodeErr("");
  };

  const handleFpSend = () => {
    if (!fpEmail.trim()) {
      setFpEmailErr("Informe seu e-mail institucional.");
      return;
    }
    if (
      !fpEmail.endsWith("@alunos.ufersa.edu.br") &&
      !fpEmail.endsWith("@ufersa.edu.br")
    ) {
      setFpEmailErr("E-mail deve ser do domínio institucional da UFERSA.");
      return;
    }
    if (!users.some((u) => u.email === fpEmail)) {
      setFpEmailErr("Nenhuma conta encontrada com este e-mail.");
      return;
    }
    setFpLoading(true);
    setTimeout(() => {
      setFpLoading(false);
      setFpStep("code");
    }, 1500);
  };

  const handleFpVerify = () => {
    if (fpCode.length < 6) {
      setFpCodeErr("O código deve ter 6 dígitos.");
      return;
    }
    setFpLoading(true);
    setTimeout(() => {
      setFpLoading(false);
      setFpStep("done");
    }, 1200);
  };

  const inputStyle = (hasErr: boolean) => inputCls(hasErr);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: PAGE_BG, fontFamily: "Inter, sans-serif" }}
    >
      <header className="bg-white border-b border-slate-200 py-4 px-6 text-center shadow-sm">
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif", color: SIDEBAR_BG }}
        >
          UfersaMentor
        </h1>
        <p
          className="text-xs font-medium tracking-widest uppercase mt-0.5"
          style={{ color: PRIMARY_BG }}
        >
          Ufersa – Pau dos Ferros
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex min-h-[540px]">
          <div
            className="hidden md:flex w-5/12 flex-col items-center justify-center p-10 gap-6"
            style={{ backgroundColor: SIDEBAR_BG }}
          >
            <AcademicIllustration />
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 md:px-10 py-8">
            <div className="mb-7">
              <h2
                className="text-xl font-bold text-slate-800"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Bem-vindo de volta
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Acesse com o seu e-mail institucional para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField
                label="E-mail Institucional"
                error={
                  emptyErr.email
                    ? "Este campo é obrigatório."
                    : emailTouched && emailDomainErr
                      ? emailDomainErr
                      : undefined
                }
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSubmitError("");
                    setEmptyErr((f) => ({ ...f, email: false }));
                  }}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="seunome@alunos.ufersa.edu.br"
                  className={inputStyle(
                    emptyErr.email || (emailTouched && !!emailDomainErr),
                  )}
                />
              </FormField>

              <FormField
                label="Senha"
                error={emptyErr.pass ? "Este campo é obrigatório." : undefined}
              >
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={(e) => {
                      setPass(e.target.value);
                      setSubmitError("");
                      setEmptyErr((f) => ({ ...f, pass: false }));
                    }}
                    placeholder="Sua senha"
                    className={`${inputStyle(emptyErr.pass)} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={openForgot}
                    className="text-xs hover:underline transition"
                    style={{ color: PRIMARY_BG }}
                  >
                    Recuperar senha
                  </button>
                </div>
              </FormField>

              {submitError && (
                <div
                  className={`${ERR_CLS} rounded-xl px-4 py-3 flex items-start gap-2.5`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-rose-700 text-sm">{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full text-white font-semibold py-2.5 rounded-xl transition text-sm mt-1"
                style={{ backgroundColor: PRIMARY_BG }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "#2E5494";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    PRIMARY_BG;
                }}
              >
                Entrar
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              Não tem conta?{" "}
              <button
                onClick={onGoRegister}
                className="font-semibold hover:underline transition"
                style={{ color: PRIMARY_BG }}
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-3.5 text-xs text-slate-400 border-t border-slate-200 bg-white">
        © 2026 UfersaMentor – Gerenciamento de Monitorias. Todos os direitos
        reservados.
      </footer>

      {fpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3
                className="text-base font-semibold text-slate-800"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Recuperar senha
              </h3>
              <button
                onClick={() => setFpModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              {fpStep === "email" && (
                <div className="space-y-4">
                  <div
                    className="flex items-start gap-3 p-3 rounded-xl border"
                    style={{
                      backgroundColor: "#EEF2FA",
                      borderColor: "#C8D6EC",
                    }}
                  >
                    <Mail
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: PRIMARY_BG }}
                    />
                    <p className="text-sm" style={{ color: SIDEBAR_BG }}>
                      Informe seu e-mail institucional. Enviaremos um código de
                      verificação.
                    </p>
                  </div>
                  <FormField label="E-mail Institucional" error={fpEmailErr}>
                    <input
                      type="email"
                      value={fpEmail}
                      onChange={(e) => {
                        setFpEmail(e.target.value);
                        setFpEmailErr("");
                      }}
                      placeholder="seunome@alunos.ufersa.edu.br"
                      className={inputCls(!!fpEmailErr)}
                    />
                  </FormField>
                  <button
                    onClick={handleFpSend}
                    disabled={fpLoading}
                    className="w-full text-white font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60"
                    style={{ backgroundColor: PRIMARY_BG }}
                  >
                    {fpLoading ? "Enviando..." : "Enviar Código"}
                  </button>
                </div>
              )}
              {fpStep === "code" && (
                <div className="space-y-4">
                  <div
                    className={`${OK_CLS} rounded-xl px-4 py-3 flex items-center gap-2`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-emerald-700 text-sm">
                      Código enviado para{" "}
                      <span className="font-semibold">{fpEmail}</span>
                    </p>
                  </div>
                  <FormField label="Código de Verificação" error={fpCodeErr}>
                    <input
                      value={fpCode}
                      onChange={(e) => {
                        setFpCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        );
                        setFpCodeErr("");
                      }}
                      placeholder="000000"
                      maxLength={6}
                      className={`${inputCls(!!fpCodeErr)} tracking-[0.4em] text-center font-mono`}
                    />
                  </FormField>
                  <p className="text-xs text-slate-400 text-center">
                    Demo: qualquer código de 6 dígitos é válido
                  </p>
                  <button
                    onClick={handleFpVerify}
                    disabled={fpLoading}
                    className="w-full text-white font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60"
                    style={{ backgroundColor: PRIMARY_BG }}
                  >
                    {fpLoading ? "Verificando..." : "Verificar Código"}
                  </button>
                </div>
              )}
              {fpStep === "done" && (
                <div className="text-center py-2 space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      Código verificado!
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Em produção, você definiria uma nova senha aqui.
                    </p>
                  </div>
                  <button
                    onClick={() => setFpModal(false)}
                    className="w-full text-white font-semibold py-2.5 rounded-xl transition text-sm"
                    style={{ backgroundColor: PRIMARY_BG }}
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterPage({
  users,
  onRegister,
  onGoLogin,
}: {
  users: User[];
  onRegister: (u: User) => void;
  onGoLogin: () => void;
}) {
  const [form, setForm] = useState({
    nome: "",
    sobrenome: "",
    matricula: "",
    email: "",
    senha: "",
    confirmar: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termos, setTermos] = useState(false);
  const [termosErr, setTermosErr] = useState(false);
  const [termsModal, setTermsModal] = useState<"uso" | "privacidade" | null>(null);
  const [success, setSuccess] = useState(false);

  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const setF = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setTouched((t) => ({ ...t, [k]: true }));
  };

  const nameOk = (v: string) => /^[a-zA-ZÀ-ÿ\s]{2,}$/.test(v.trim());
  const pw = {
    length: form.senha.length >= 8,
    letter: /[a-zA-Z]/.test(form.senha),
    number: /\d/.test(form.senha),
  };

  const errs = useMemo(() => {
    const e: Record<string, string> = {};
    if (touched.nome && form.nome && !nameOk(form.nome)) e.nome = "Apenas letras.";
    if (touched.sobrenome && form.sobrenome && !nameOk(form.sobrenome)) e.sobrenome = "Apenas letras.";
    if (touched.matricula && form.matricula && !/^\d{10}$/.test(form.matricula)) e.matricula = "10 dígitos.";
    if (touched.email && form.email && !form.email.endsWith("@alunos.ufersa.edu.br")) e.email = "Domínio inválido.";
    if (touched.senha && form.senha && (!pw.length || !pw.letter || !pw.number)) e.senha = "Senha fraca.";
    if (touched.confirmar && form.confirmar && form.confirmar !== form.senha) e.confirmar = "As senhas não coincidem.";
    return e;
  }, [form, touched]);

  // A LÓGICA QUE CONECTA NO BANCO DE DADOS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nome: true, sobrenome: true, matricula: true, email: true, senha: true, confirmar: true });
    
    if (!termos) { setTermosErr(true); return; }
    
    if (Object.keys(errs).length > 0) return;

    try {
      const response = await fetch('http://localhost:3001/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: form.matricula,
          nome: `${form.nome.trim()} ${form.sobrenome.trim()}`,
          senha: form.senha,
          email: form.email,
          perfil: 'student'
        })
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errData = await response.json();
        alert(errData.erro || "Erro ao cadastrar.");
      }
    } catch (err) {
      alert("Erro ao conectar com o backend.");
    }
  };

  if (success)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Cadastro realizado!</h2>
            <button onClick={onGoLogin} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">Ir para o Login</button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col p-4 bg-slate-50">
        <main className="flex-1 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
                <h2 className="text-xl font-bold mb-6">Criar conta</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Nome" error={errs.nome}><input value={form.nome} onChange={(e) => setF("nome", e.target.value)} className={inputCls(!!errs.nome)}/></FormField>
                        <FormField label="Sobrenome" error={errs.sobrenome}><input value={form.sobrenome} onChange={(e) => setF("sobrenome", e.target.value)} className={inputCls(!!errs.sobrenome)}/></FormField>
                    </div>
                    <FormField label="Matrícula" error={errs.matricula}><input value={form.matricula} onChange={(e) => setF("matricula", e.target.value)} className={inputCls(!!errs.matricula)}/></FormField>
                    <FormField label="E-mail" error={errs.email}><input value={form.email} onChange={(e) => setF("email", e.target.value)} className={inputCls(!!errs.email)}/></FormField>
                    <FormField label="Senha" error={errs.senha}><input type="password" value={form.senha} onChange={(e) => setF("senha", e.target.value)} className={inputCls(!!errs.senha)}/></FormField>
                    <FormField label="Confirmar Senha" error={errs.confirmar}><input type="password" value={form.confirmar} onChange={(e) => setF("confirmar", e.target.value)} className={inputCls(!!errs.confirmar)}/></FormField>
                    
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
                        Aceito os termos de uso.
                    </label>

                    <button type="submit" className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold">Criar Conta</button>
                </form>
            </div>
        </main>
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({
  user,
  users,
  turmas,
  monitorias,
  onUpdateUsers,
  onUpdateTurmas,
  onUpdateMonitorias,
  onLogout,
}: {
  user: User;
  users: User[];
  turmas: Turma[];
  monitorias: Monitoria[];
  onUpdateUsers: (u: User[]) => void;
  onUpdateTurmas: (t: Turma[]) => void;
  onUpdateMonitorias: (m: Monitoria[]) => void;
  onLogout: () => void;
}) {
  const [section, setSection] = useState("monitorias");

  const professors = users.filter((u) => u.role === "professor");
  const monitors = users.filter(
    (u) => u.role === "monitor" || u.role === "student",
  );
  const admins = users.filter((u) => u.role === "admin");

  const sidebarItems: SidebarItem[] = [
    {
      id: "monitorias",
      label: "Monitorias",
      icon: <BookOpen className="w-4 h-4" />,
    },
    { id: "turmas", label: "Turmas", icon: <Calendar className="w-4 h-4" /> },
    {
      id: "professores",
      label: "Professores",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: "admins",
      label: "Administradores",
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  const titleMap: Record<string, string> = {
    monitorias: "Gerenciar Monitorias",
    turmas: "Gerenciar Turmas",
    professores: "Gerenciar Professores",
    admins: "Administradores",
  };

  // ─── Monitorias state ───────────────────────────────────────────────────────
  const [monQ, setMonQ] = useState("");
  const [monModal, setMonModal] = useState<"create" | "edit" | null>(null);
  const [monEdit, setMonEdit] = useState<Monitoria | null>(null);
  const [monDel, setMonDel] = useState<string | null>(null);
  const [monDupErr, setMonDupErr] = useState("");
  const [monForm, setMonForm] = useState({
    turmaQ: "",
    semestre: "2026.1",
    status: "ativa" as "ativa" | "encerrada",
  });
  const [monSelTurmas, setMonSelTurmas] = useState<string[]>([]);
  const [monMonQ, setMonMonQ] = useState("");
  const [monSelMons, setMonSelMons] = useState<string[]>([]);

  const monRequiredDisc = useMemo(() => {
    if (!monSelTurmas.length) return null;
    return turmas.find((t) => t.id === monSelTurmas[0])?.nomeDisciplina ?? null;
  }, [monSelTurmas, turmas]);

  const availTurmas = turmas.filter(
    (t) =>
      !monSelTurmas.includes(t.id) &&
      (!monRequiredDisc || t.nomeDisciplina === monRequiredDisc) &&
      (t.nomeDisciplina.toLowerCase().includes(monForm.turmaQ.toLowerCase()) ||
        t.codigo.toLowerCase().includes(monForm.turmaQ.toLowerCase())),
  );

  const availMons = monitors.filter(
    (m) =>
      !monSelMons.includes(m.id) &&
      (m.name.toLowerCase().includes(monMonQ.toLowerCase()) ||
        (m.matricula || "").includes(monMonQ)),
  );

  // Warn if a selected monitor is already in another active monitoria
  const monitorWarnings = useMemo(() => {
    return monSelMons
      .map((mid) => {
        const existing = monitorias.find(
          (m) =>
            m.monitorIds.includes(mid) &&
            m.status === "ativa" &&
            (!monEdit || m.id !== monEdit.id),
        );
        if (!existing) return null;
        const monitor = users.find((u) => u.id === mid);
        const t0 = turmas.find((t) => existing.turmaIds[0] === t.id);
        return `${monitor?.name} já está em monitoria de ${t0?.nomeDisciplina || existing.id}.`;
      })
      .filter(Boolean) as string[];
  }, [monSelMons, monitorias, monEdit, users, turmas]);

  const fMons = monitorias.filter((m) => {
    if (!monQ) return true;
    const t0 = turmas.find((t) => m.turmaIds[0] === t.id);
    return (
      t0?.nomeDisciplina.toLowerCase().includes(monQ.toLowerCase()) ||
      t0?.codigo.toLowerCase().includes(monQ.toLowerCase()) ||
      m.semestre.includes(monQ)
    );
  });

  const openCreateMon = () => {
    setMonEdit(null);
    setMonSelTurmas([]);
    setMonSelMons([]);
    setMonForm({ turmaQ: "", semestre: "2026.1", status: "ativa" });
    setMonMonQ("");
    setMonModal("create");
  };
  const openEditMon = (m: Monitoria) => {
    setMonEdit(m);
    setMonSelTurmas([...m.turmaIds]);
    setMonSelMons([...m.monitorIds]);
    setMonForm({ turmaQ: "", semestre: m.semestre, status: m.status });
    setMonMonQ("");
    setMonDupErr("");
    setMonModal("edit");
  };
  const saveMon = () => {
    if (!monSelTurmas.length) return;
    // Hard block: a monitor can only belong to one monitoria
    const duplicates = monSelMons.filter((mid) =>
      monitorias.some(
        (m) => m.id !== monEdit?.id && m.monitorIds.includes(mid),
      ),
    );
    if (duplicates.length > 0) {
      const names = duplicates
        .map((id) => users.find((u) => u.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      setMonDupErr(
        `${names} já está em outra monitoria. Um monitor só pode pertencer a uma monitoria por vez.`,
      );
      return;
    }
    setMonDupErr("");
    const newList = monEdit
      ? monitorias.map((m) =>
          m.id === monEdit.id
            ? {
                ...m,
                turmaIds: monSelTurmas,
                monitorIds: monSelMons,
                semestre: monForm.semestre,
                status: monForm.status,
              }
            : m,
        )
      : [
          ...monitorias,
          {
            id: nid(),
            turmaIds: monSelTurmas,
            monitorIds: monSelMons,
            semestre: monForm.semestre,
            status: monForm.status,
          },
        ];
    onUpdateMonitorias(newList);
    setMonModal(null);
  };

  // ─── Turmas state ───────────────────────────────────────────────────────────
  const [turmaQ, setTurmaQ] = useState("");
  const [turmaModal, setTurmaModal] = useState<"create" | "edit" | null>(null);
  const [turmaEdit, setTurmaEdit] = useState<Turma | null>(null);
  const [turmaDel, setTurmaDel] = useState<string | null>(null);
  const [turmaForm, setTurmaForm] = useState({
    nomeDisciplina: "",
    codigo: "",
    horario: "",
    profQ: "",
    professorId: "",
    status: "ativa" as "ativa" | "encerrada",
  });
  const [turmaErr, setTurmaErr] = useState<Record<string, string>>({});

  const filtProfsForTurma = professors.filter(
    (p) =>
      p.name.toLowerCase().includes(turmaForm.profQ.toLowerCase()) ||
      (p.matricula || "").includes(turmaForm.profQ),
  );

  const fTurmas = turmas.filter((t) => {
    if (!turmaQ) return true;
    const q = turmaQ.toLowerCase();
    const prof = users.find((u) => u.id === t.professorId);
    return (
      t.nomeDisciplina.toLowerCase().includes(q) ||
      t.codigo.toLowerCase().includes(q) ||
      prof?.name.toLowerCase().includes(q)
    );
  });

  const openCreateTurma = () => {
    setTurmaEdit(null);
    setTurmaErr({});
    setTurmaForm({
      nomeDisciplina: "",
      codigo: "",
      horario: "",
      profQ: "",
      professorId: "",
      status: "ativa",
    });
    setTurmaModal("create");
  };
  const openEditTurma = (t: Turma) => {
    setTurmaEdit(t);
    setTurmaErr({});
    const prof = users.find((u) => u.id === t.professorId);
    setTurmaForm({
      nomeDisciplina: t.nomeDisciplina,
      codigo: t.codigo,
      horario: t.horario,
      profQ: prof ? `${prof.name} (Mat: ${prof.matricula})` : "",
      professorId: t.professorId,
      status: t.status,
    });
    setTurmaModal("edit");
  };
  const saveTurma = () => {
    const e: Record<string, string> = {};
    if (!turmaForm.nomeDisciplina.trim()) e.nome = "Nome obrigatório.";
    if (!turmaForm.codigo.trim()) e.codigo = "Código obrigatório.";
    if (!turmaForm.professorId) e.prof = "Selecione um professor.";
    if (Object.keys(e).length) {
      setTurmaErr(e);
      return;
    }
    if (turmaEdit) {
      onUpdateTurmas(
        turmas.map((t) =>
          t.id === turmaEdit.id
            ? {
                ...t,
                nomeDisciplina: turmaForm.nomeDisciplina,
                codigo: turmaForm.codigo,
                horario: turmaForm.horario,
                professorId: turmaForm.professorId,
                status: turmaForm.status,
              }
            : t,
        ),
      );
    } else {
      onUpdateTurmas([
        ...turmas,
        {
          id: nid(),
          nomeDisciplina: turmaForm.nomeDisciplina,
          codigo: turmaForm.codigo,
          horario: turmaForm.horario,
          professorId: turmaForm.professorId,
          status: turmaForm.status,
        },
      ]);
    }
    setTurmaModal(null);
  };

  // ─── Professores state ──────────────────────────────────────────────────────
  const [profQ, setProfQ] = useState("");
  const [profModal, setProfModal] = useState<"create" | "edit" | null>(null);
  const [profEdit, setProfEdit] = useState<User | null>(null);
  const [profDel, setProfDel] = useState<string | null>(null);
  const [profForm, setProfForm] = useState({
    nome: "",
    email: "",
    matricula: "",
    senha: "",
    status: "ativo" as "ativo" | "inativo",
  });
  const [profErr, setProfErr] = useState<Record<string, string>>({});

  const fProfs = professors.filter((p) => {
    if (!profQ) return true;
    const q = profQ.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.matricula || "").includes(profQ)
    );
  });

  const openCreateProf = () => {
    setProfEdit(null);
    setProfErr({});
    setProfForm({
      nome: "",
      email: "",
      matricula: "",
      senha: "",
      status: "ativo",
    });
    setProfModal("create");
  };
  const openEditProf = (p: User) => {
    setProfEdit(p);
    setProfErr({});
    setProfForm({
      nome: p.name,
      email: p.email,
      matricula: p.matricula || "",
      senha: p.password,
      status: p.status || "ativo",
    });
    setProfModal("edit");
  };
  const saveProf = () => {
    const e: Record<string, string> = {};
    if (!profForm.nome.trim()) e.nome = "Nome obrigatório.";
    if (!profForm.email.endsWith("@ufersa.edu.br"))
      e.email = "E-mail deve ser do domínio @ufersa.edu.br";
    if (!profEdit && users.some((u) => u.email === profForm.email))
      e.email = "E-mail já cadastrado.";
    if (!/^\d{8}$/.test(profForm.matricula))
      e.matricula = "Matrícula/SIAPE deve ter exatamente 8 dígitos.";
    else if (
      users.some(
        (u) =>
          u.id !== profEdit?.id &&
          (u.matricula || u.siape) === profForm.matricula,
      )
    )
      e.matricula = "Matrícula/SIAPE já cadastrada.";
    if (!profEdit && profForm.senha.length < 6)
      e.senha = "Senha mínimo 6 caracteres.";
    if (Object.keys(e).length) {
      setProfErr(e);
      return;
    }
    if (profEdit) {
      onUpdateUsers(
        users.map((u) =>
          u.id === profEdit.id
            ? {
                ...u,
                name: profForm.nome,
                email: profForm.email,
                matricula: profForm.matricula,
                siape: profForm.matricula,
                password: profForm.senha,
                status: profForm.status,
              }
            : u,
        ),
      );
    } else {
      onUpdateUsers([
        ...users,
        {
          id: nid(),
          name: profForm.nome,
          email: profForm.email,
          password: profForm.senha,
          role: "professor",
          matricula: profForm.matricula,
          siape: profForm.matricula,
          status: profForm.status,
        },
      ]);
    }
    setProfModal(null);
  };

  // ─── Admins state ───────────────────────────────────────────────────────────
  const [adminQ, setAdminQ] = useState("");
  const [adminModal, setAdminModal] = useState<"create" | "edit" | null>(null);
  const [adminEdit, setAdminEdit] = useState<User | null>(null);
  const [adminDel, setAdminDel] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({
    nome: "",
    email: "",
    senha: "",
    status: "ativo" as "ativo" | "inativo",
  });
  const [adminErr, setAdminErr] = useState<Record<string, string>>({});

  const fAdmins = admins.filter(
    (a) =>
      !adminQ ||
      a.name.toLowerCase().includes(adminQ.toLowerCase()) ||
      a.email.toLowerCase().includes(adminQ.toLowerCase()),
  );

  const saveAdmin = () => {
    const e: Record<string, string> = {};
    if (!adminForm.nome.trim()) e.nome = "Nome obrigatório.";
    if (!adminForm.email.endsWith("@ufersa.edu.br"))
      e.email = "E-mail deve ser do domínio @ufersa.edu.br";
    if (!adminEdit && users.some((u) => u.email === adminForm.email))
      e.email = "E-mail já cadastrado.";
    if (!adminEdit && adminForm.senha.length < 6)
      e.senha = "Senha mínimo 6 caracteres.";
    if (Object.keys(e).length) {
      setAdminErr(e);
      return;
    }
    if (adminEdit) {
      onUpdateUsers(
        users.map((u) =>
          u.id === adminEdit.id
            ? {
                ...u,
                name: adminForm.nome,
                email: adminForm.email,
                password: adminForm.senha,
                status: adminForm.status,
              }
            : u,
        ),
      );
    } else {
      onUpdateUsers([
        ...users,
        {
          id: nid(),
          name: adminForm.nome,
          email: adminForm.email,
          password: adminForm.senha,
          role: "admin",
          status: adminForm.status,
        },
      ]);
    }
    setAdminModal(null);
  };

  const AddBtn = ({
    onClick,
    label,
  }: {
    onClick: () => void;
    label: string;
  }) => (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-2.5 rounded-lg transition"
      style={{ backgroundColor: PRIMARY_BG }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "#2E5494";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = PRIMARY_BG;
      }}
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  const RowActions = ({
    onEdit,
    onDelete,
  }: {
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onEdit}
        className="p-1.5 text-slate-400 hover:text-[#3B69B0] hover:bg-blue-50 rounded-lg transition"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <>
      <DashboardLayout
        user={user}
        sidebarItems={sidebarItems}
        activeSection={section}
        onSectionChange={setSection}
        onLogout={onLogout}
        title={titleMap[section]}
      >
        {/* ── MONITORIAS ── */}
        {section === "monitorias" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: "Total",
                  value: monitorias.length,
                  bar: "bg-[#3B69B0]",
                },
                {
                  label: "Ativas",
                  value: monitorias.filter((m) => m.status === "ativa").length,
                  bar: "bg-emerald-500",
                },
                {
                  label: "Encerradas",
                  value: monitorias.filter((m) => m.status === "encerrada")
                    .length,
                  bar: "bg-slate-400",
                },
                {
                  label: "Sem monitor",
                  value: monitorias.filter((m) => m.monitorIds.length === 0)
                    .length,
                  bar: "bg-amber-400",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
                >
                  <div className={`w-8 h-1.5 ${c.bar} rounded mb-2.5`} />
                  <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <SBar
                value={monQ}
                onChange={setMonQ}
                placeholder="Buscar por disciplina, código ou semestre..."
              />
              <AddBtn onClick={openCreateMon} label="Nova" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {[
                        "Disciplina / Turmas",
                        "Monitor",
                        "Semestre",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {fMons.map((m) => {
                      const mTurmas = turmas.filter((t) =>
                        m.turmaIds.includes(t.id),
                      );
                      const mMons = users.filter((u) =>
                        m.monitorIds.includes(u.id),
                      );
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50/50 transition"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {mTurmas[0]?.nomeDisciplina || "—"}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {mTurmas.map((t) => t.codigo).join(" · ")}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {mMons.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {mMons.map((m) => (
                                  <div
                                    key={m.id}
                                    className="flex items-center gap-1.5"
                                  >
                                    <Avatar name={m.name} size="sm" />
                                    <span className="text-xs text-slate-600">
                                      {m.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                Sem monitor
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                            {m.semestre}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge s={m.status} />
                          </td>
                          <td className="px-4 py-3">
                            <RowActions
                              onEdit={() => openEditMon(m)}
                              onDelete={() => setMonDel(m.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {fMons.length === 0 && (
                  <div className="text-center py-14 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma monitoria encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TURMAS ── */}
        {section === "turmas" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SBar
                value={turmaQ}
                onChange={setTurmaQ}
                placeholder="Buscar por disciplina, código ou professor..."
              />
              <AddBtn onClick={openCreateTurma} label="Nova Turma" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {[
                      "Disciplina",
                      "Código",
                      "Professor",
                      "Horário",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fTurmas.map((t) => {
                    const prof = users.find((u) => u.id === t.professorId);
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/50 transition"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {t.nomeDisciplina}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {t.codigo}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {prof?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {t.horario}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge s={t.status} />
                        </td>
                        <td className="px-4 py-3">
                          <RowActions
                            onEdit={() => openEditTurma(t)}
                            onDelete={() => setTurmaDel(t.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {fTurmas.length === 0 && (
                <div className="text-center py-14 text-slate-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma turma encontrada</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFESSORES ── */}
        {section === "professores" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SBar
                value={profQ}
                onChange={setProfQ}
                placeholder="Buscar por nome, e-mail ou matrícula..."
              />
              <AddBtn onClick={openCreateProf} label="Novo Professor" />
            </div>
            <div className="space-y-2.5">
              {fProfs.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4"
                >
                  <Avatar name={p.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Mat/SIAPE: {p.matricula}
                    </p>
                  </div>
                  <StatusBadge s={p.status || "ativo"} />
                  <RowActions
                    onEdit={() => openEditProf(p)}
                    onDelete={() => setProfDel(p.id)}
                  />
                </div>
              ))}
              {fProfs.length === 0 && (
                <div className="text-center py-14 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum professor encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ADMINS ── */}
        {section === "admins" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SBar
                value={adminQ}
                onChange={setAdminQ}
                placeholder="Buscar administrador..."
              />
              <AddBtn
                onClick={() => {
                  setAdminEdit(null);
                  setAdminErr({});
                  setAdminForm({
                    nome: "",
                    email: "",
                    senha: "",
                    status: "ativo",
                  });
                  setAdminModal("create");
                }}
                label="Novo Admin"
              />
            </div>
            <div className="space-y-2.5">
              {fAdmins.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4"
                >
                  <Avatar name={a.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.email}</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#EEF2FA", color: SIDEBAR_BG }}
                  >
                    Administrador
                  </span>
                  {a.id !== user.id && (
                    <RowActions
                      onEdit={() => {
                        setAdminEdit(a);
                        setAdminErr({});
                        setAdminForm({
                          nome: a.name,
                          email: a.email,
                          senha: a.password,
                          status: a.status || "ativo",
                        });
                        setAdminModal("edit");
                      }}
                      onDelete={() => setAdminDel(a.id)}
                    />
                  )}
                </div>
              ))}
              {fAdmins.length === 0 && (
                <div className="text-center py-14 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum administrador encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>

      {/* ── Monitoria Modal ── */}
      {monModal && (
        <Modal
          title={monModal === "create" ? "Nova Monitoria" : "Editar Monitoria"}
          onClose={() => setMonModal(null)}
          wide
          footer={
            <>
              <CancelBtn onClick={() => setMonModal(null)} />
              <PrimaryBtn
                onClick={saveMon}
                label={monModal === "create" ? "Criar Monitoria" : "Salvar"}
                disabled={!monSelTurmas.length}
              />
            </>
          }
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Turmas{" "}
              <span className="text-slate-400 font-normal text-xs">
                (mesma disciplina)
              </span>
            </label>
            {monSelTurmas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {monSelTurmas.map((id) => {
                  const t = turmas.find((t) => t.id === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: "#EEF2FA", color: SIDEBAR_BG }}
                    >
                      {t?.codigo} – {t?.nomeDisciplina}
                      <button
                        onClick={() =>
                          setMonSelTurmas((p) => p.filter((i) => i !== id))
                        }
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {monRequiredDisc && (
              <p
                className="text-xs mb-2 px-2 py-1 rounded-lg"
                style={{ color: "#3B69B0", backgroundColor: "#EEF2FA" }}
              >
                Disciplina fixada:{" "}
                <span className="font-semibold">{monRequiredDisc}</span>
              </p>
            )}
            <input
              value={monForm.turmaQ}
              onChange={(e) =>
                setMonForm((f) => ({ ...f, turmaQ: e.target.value }))
              }
              placeholder="Buscar turma por nome ou código"
              className={inputCls()}
            />
            {monForm.turmaQ && availTurmas.length > 0 && (
              <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-36 overflow-y-auto">
                {availTurmas.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setMonSelTurmas((p) => [...p, t.id]);
                      setMonForm((f) => ({ ...f, turmaQ: "" }));
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-none transition"
                  >
                    <p className="font-medium text-slate-700">
                      {t.nomeDisciplina} – {t.codigo}
                    </p>
                    <p className="text-xs text-slate-400">{t.horario}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monitores{" "}
              <span className="text-slate-400 font-normal text-xs">
                (pode ter mais de um)
              </span>
            </label>
            {monSelMons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {monSelMons.map((id) => {
                  const u = users.find((u) => u.id === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-medium"
                    >
                      {u?.name}
                      <button
                        onClick={() =>
                          setMonSelMons((p) => p.filter((i) => i !== id))
                        }
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {monDupErr && (
              <div
                className={`${ERR_CLS} rounded-xl px-3 py-2 flex items-start gap-2`}
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-rose-600" />
                <p className="text-xs">{monDupErr}</p>
              </div>
            )}
            <input
              value={monMonQ}
              onChange={(e) => setMonMonQ(e.target.value)}
              placeholder="Buscar monitor por nome ou matrícula"
              className={inputCls()}
            />
            {monMonQ && availMons.length > 0 && (
              <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-36 overflow-y-auto">
                {availMons.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setMonSelMons((p) => [...p, u.id]);
                      setMonMonQ("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2.5 border-b border-slate-50 last:border-none transition"
                  >
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="font-medium text-slate-700">{u.name}</p>
                      <p className="text-xs text-slate-400">
                        Mat: {u.matricula} ·{" "}
                        {u.role === "monitor" ? "Monitor" : "Aluno"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Semestre">
              <input
                value={monForm.semestre}
                onChange={(e) =>
                  setMonForm((f) => ({ ...f, semestre: e.target.value }))
                }
                placeholder="2026.1"
                className={inputCls()}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={monForm.status}
                onChange={(e) =>
                  setMonForm((f) => ({
                    ...f,
                    status: e.target.value as "ativa" | "encerrada",
                  }))
                }
                className={selectCls}
              >
                <option value="ativa">Ativa</option>
                <option value="encerrada">Encerrada</option>
              </select>
            </FormField>
          </div>
        </Modal>
      )}
      {monDel && (
        <DeleteModal
          msg="Esta monitoria será removida permanentemente."
          onCancel={() => setMonDel(null)}
          onConfirm={() => {
            onUpdateMonitorias(monitorias.filter((m) => m.id !== monDel));
            setMonDel(null);
          }}
        />
      )}

      {/* ── Turma Modal ── */}
      {turmaModal && (
        <Modal
          title={turmaModal === "create" ? "Nova Turma" : "Editar Turma"}
          onClose={() => setTurmaModal(null)}
          footer={
            <>
              <CancelBtn onClick={() => setTurmaModal(null)} />
              <PrimaryBtn
                onClick={saveTurma}
                label={turmaModal === "create" ? "Criar Turma" : "Salvar"}
              />
            </>
          }
        >
          <FormField label="Nome da Disciplina" error={turmaErr.nome}>
            <input
              value={turmaForm.nomeDisciplina}
              onChange={(e) =>
                setTurmaForm((f) => ({ ...f, nomeDisciplina: e.target.value }))
              }
              placeholder="Ex: Cálculo I"
              className={inputCls(!!turmaErr.nome)}
            />
          </FormField>
          <FormField label="Código da Turma" error={turmaErr.codigo}>
            <input
              value={turmaForm.codigo}
              onChange={(e) =>
                setTurmaForm((f) => ({ ...f, codigo: e.target.value }))
              }
              placeholder="Ex: MAT0001-T01"
              className={inputCls(!!turmaErr.codigo)}
            />
          </FormField>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Professor{" "}
              <span className="text-slate-400 font-normal text-xs">
                (nome ou matrícula)
              </span>
            </label>
            <input
              value={turmaForm.profQ}
              onChange={(e) =>
                setTurmaForm((f) => ({
                  ...f,
                  profQ: e.target.value,
                  professorId: "",
                }))
              }
              placeholder="Buscar professor..."
              className={inputCls(!!turmaErr.prof)}
            />
            {turmaErr.prof && (
              <p
                className={`${ERR_T} text-xs mt-1.5 flex items-center gap-1.5`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {turmaErr.prof}
              </p>
            )}
            {turmaForm.profQ &&
              !turmaForm.professorId &&
              filtProfsForTurma.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-40 overflow-y-auto">
                  {filtProfsForTurma.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setTurmaForm((f) => ({
                          ...f,
                          professorId: p.id,
                          profQ: `${p.name} (Mat: ${p.matricula})`,
                        }))
                      }
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2.5 border-b border-slate-50 last:border-none transition"
                    >
                      <Avatar name={p.name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-700">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          Mat/SIAPE: {p.matricula}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>
          <FormField label="Horário das Aulas">
            <input
              value={turmaForm.horario}
              onChange={(e) =>
                setTurmaForm((f) => ({ ...f, horario: e.target.value }))
              }
              placeholder="Ex: Seg. e Qua. 14h–16h"
              className={inputCls()}
            />
          </FormField>
          <FormField label="Status">
            <select
              value={turmaForm.status}
              onChange={(e) =>
                setTurmaForm((f) => ({
                  ...f,
                  status: e.target.value as "ativa" | "encerrada",
                }))
              }
              className={selectCls}
            >
              <option value="ativa">Ativa</option>
              <option value="encerrada">Encerrada</option>
            </select>
          </FormField>
        </Modal>
      )}
      {turmaDel && (
        <DeleteModal
          msg="Esta turma será removida. Monitorias vinculadas podem ser afetadas."
          onCancel={() => setTurmaDel(null)}
          onConfirm={() => {
            onUpdateTurmas(turmas.filter((t) => t.id !== turmaDel));
            setTurmaDel(null);
          }}
        />
      )}

      {/* ── Professor Modal ── */}
      {profModal && (
        <Modal
          title={profModal === "create" ? "Novo Professor" : "Editar Professor"}
          onClose={() => setProfModal(null)}
          footer={
            <>
              <CancelBtn onClick={() => setProfModal(null)} />
              <PrimaryBtn
                onClick={saveProf}
                label={profModal === "create" ? "Cadastrar" : "Salvar"}
              />
            </>
          }
        >
          <FormField label="Nome Completo" error={profErr.nome}>
            <input
              value={profForm.nome}
              onChange={(e) =>
                setProfForm((f) => ({ ...f, nome: e.target.value }))
              }
              placeholder="Ana Lima"
              className={inputCls(!!profErr.nome)}
            />
          </FormField>
          <FormField label="E-mail Institucional" error={profErr.email}>
            <input
              type="email"
              value={profForm.email}
              onChange={(e) =>
                setProfForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="professor@ufersa.edu.br"
              className={inputCls(!!profErr.email)}
            />
          </FormField>
          <FormField label="Matrícula / SIAPE" error={profErr.matricula}>
            <input
              value={profForm.matricula}
              onChange={(e) =>
                setProfForm((f) => ({
                  ...f,
                  matricula: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="1234567"
              className={inputCls(!!profErr.matricula)}
            />
          </FormField>
          <FormField label="Senha Inicial" error={profErr.senha}>
            <input
              type="password"
              value={profForm.senha}
              onChange={(e) =>
                setProfForm((f) => ({ ...f, senha: e.target.value }))
              }
              placeholder="Mín. 6 caracteres"
              className={inputCls(!!profErr.senha)}
            />
          </FormField>
          <FormField label="Status">
            <select
              value={profForm.status}
              onChange={(e) =>
                setProfForm((f) => ({
                  ...f,
                  status: e.target.value as "ativo" | "inativo",
                }))
              }
              className={selectCls}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </FormField>
          <p className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
            Tipo de usuário: <span className="font-semibold">Professor</span>
          </p>
        </Modal>
      )}
      {profDel && (
        <DeleteModal
          msg="Este professor será removido do sistema."
          onCancel={() => setProfDel(null)}
          onConfirm={() => {
            onUpdateUsers(users.filter((u) => u.id !== profDel));
            setProfDel(null);
          }}
        />
      )}

      {/* ── Admin Modal ── */}
      {adminModal && (
        <Modal
          title={
            adminModal === "create"
              ? "Novo Administrador"
              : "Editar Administrador"
          }
          onClose={() => setAdminModal(null)}
          footer={
            <>
              <CancelBtn onClick={() => setAdminModal(null)} />
              <PrimaryBtn
                onClick={saveAdmin}
                label={adminModal === "create" ? "Cadastrar" : "Salvar"}
              />
            </>
          }
        >
          <FormField label="Nome Completo" error={adminErr.nome}>
            <input
              value={adminForm.nome}
              onChange={(e) =>
                setAdminForm((f) => ({ ...f, nome: e.target.value }))
              }
              placeholder="Carlos Coordenador"
              className={inputCls(!!adminErr.nome)}
            />
          </FormField>
          <FormField label="E-mail Institucional" error={adminErr.email}>
            <input
              type="email"
              value={adminForm.email}
              onChange={(e) =>
                setAdminForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="coordenador@ufersa.edu.br"
              className={inputCls(!!adminErr.email)}
            />
          </FormField>
          <FormField label="Senha Inicial" error={adminErr.senha}>
            <input
              type="password"
              value={adminForm.senha}
              onChange={(e) =>
                setAdminForm((f) => ({ ...f, senha: e.target.value }))
              }
              placeholder="Mín. 6 caracteres"
              className={inputCls(!!adminErr.senha)}
            />
          </FormField>
          <FormField label="Status">
            <select
              value={adminForm.status}
              onChange={(e) =>
                setAdminForm((f) => ({
                  ...f,
                  status: e.target.value as "ativo" | "inativo",
                }))
              }
              className={selectCls}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </FormField>
        </Modal>
      )}
      {adminDel && (
        <DeleteModal
          msg="Este administrador será removido do sistema."
          onCancel={() => setAdminDel(null)}
          onConfirm={() => {
            onUpdateUsers(users.filter((u) => u.id !== adminDel));
            setAdminDel(null);
          }}
        />
      )}
    </>
  );
}

// ─── Student Dashboard ─────────────────────────────────────────────────────────

function StudentDashboard({
  user,
  users,
  turmas,
  monitorias,
  horarios,
  agendamentos,
  chamadas,
  materiais,
  onUpdateAgendamentos,
  onUpdateUsers,
  onUpdateCurrentUser,
  onLogout,
  extraSidebarButton,
  notifs,
  onNotifRead,
}: {
  user: User;
  users: User[];
  turmas: Turma[];
  monitorias: Monitoria[];
  horarios: Horario[];
  agendamentos: Agendamento[];
  chamadas: Chamada[];
  materiais: Material[];
  onUpdateAgendamentos: (a: Agendamento[]) => void;
  onUpdateUsers: (u: User[]) => void;
  onUpdateCurrentUser: (u: User) => void;
  onLogout: () => void;
  extraSidebarButton?: React.ReactNode;
  notifs?: Notif[];
  onNotifRead?: (id: string) => void;
}) {
  const [section, setSection] = useState("buscar");
  const [search, setSearch] = useState("");
  const [highlightedAgendId, setHighlightedAgendId] = useState<string | null>(
    null,
  );
  const [bookFlow, setBookFlow] = useState<{
    monitoria: Monitoria;
    step: "pick" | "confirm";
    selectedHorario: Horario | null;
    filterMonitorId?: string;
  } | null>(null);
  const [bookDuvida, setBookDuvida] = useState("");
  const [bookSuccess, setBookSuccess] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [agendQ, setAgendQ] = useState("");
  const [editFlow, setEditFlow] = useState<{
    agendamento: Agendamento;
    step: "pick" | "confirm";
    selectedHorario: Horario | null;
  } | null>(null);
  const [editDuvida, setEditDuvida] = useState("");
  const [bookErr, setBookErr] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | ComputedStatus>(
    "todos",
  );
  // Materiais filters
  const [matMonitoriaFilter, setMatMonitoriaFilter] = useState("all");
  const [matDateFilter, setMatDateFilter] = useState("");

  const activeMons = monitorias.filter((m) => m.status === "ativa");
  const filtered = useMemo(() => {
    if (!search) return activeMons;
    const q = search.toLowerCase();
    return activeMons.filter((m) => {
      const t = turmas.find((t) => m.turmaIds.includes(t.id));
      return (
        t?.nomeDisciplina.toLowerCase().includes(q) ||
        t?.codigo.toLowerCase().includes(q)
      );
    });
  }, [search, activeMons, turmas]);

  // Include ALL agendamentos (including cancelled) for display
  const myAgendamentos = agendamentos.filter((a) => a.alunoId === user.id);

  const filteredAgendamentos = useMemo(() => {
    return myAgendamentos.filter((a) => {
      const h = horarios.find((hh) => hh.id === a.horarioId);
      const cs = computeStatus(a, h, chamadas);
      if (statusFilter !== "todos" && cs !== statusFilter) return false;
      if (!agendQ) return true;
      const q = agendQ.toLowerCase();
      const m = monitorias.find((m) => m.id === a.monitoriaId);
      const mTurmas = turmas.filter((t) => m?.turmaIds.includes(t.id));
      const monUser = h ? users.find((u) => u.id === h.monitorId) : null;
      return (
        mTurmas.some((t) => t.nomeDisciplina.toLowerCase().includes(q)) ||
        monUser?.name.toLowerCase().includes(q) ||
        fmtDate(a.data).includes(q)
      );
    });
  }, [
    agendQ,
    statusFilter,
    myAgendamentos,
    horarios,
    monitorias,
    turmas,
    users,
    chamadas,
  ]);

  const handleBook = () => {
    if (!bookFlow?.selectedHorario) return;
    const h = bookFlow.selectedHorario;
    // Self-booking check
    if (h.monitorId === user.id) {
      setBookErr("Você não pode agendar um plantão consigo mesmo.");
      return;
    }
    // Duplicate booking check
    if (
      agendamentos.some(
        (a) =>
          a.horarioId === h.id &&
          a.alunoId === user.id &&
          a.status !== "cancelado",
      )
    ) {
      setBookErr("Você já tem um agendamento para este horário.");
      return;
    }
    // Time conflict check
    const toMin = (t: string) => {
      const [hh, mm] = t.split(":").map(Number);
      return hh * 60 + mm;
    };
    const conflict = agendamentos.find((a) => {
      if (
        a.alunoId !== user.id ||
        a.status === "cancelado" ||
        a.data !== h.data
      )
        return false;
      const xh = horarios.find((hh) => hh.id === a.horarioId);
      return (
        xh &&
        toMin(h.horaInicio) < toMin(xh.horaFim) &&
        toMin(h.horaFim) > toMin(xh.horaInicio)
      );
    });
    if (conflict) {
      const xh = horarios.find((hh) => hh.id === conflict.horarioId);
      setBookErr(
        `Conflito de horário: você já tem agendamento das ${xh?.horaInicio}–${xh?.horaFim} neste dia.`,
      );
      return;
    }
    // Capacity check
    if (vagasLivres(h, agendamentos) <= 0) {
      setBookErr("Este horário está com as vagas esgotadas.");
      return;
    }
    setBookErr("");
    onUpdateAgendamentos([
      ...agendamentos,
      {
        id: nid(),
        alunoId: user.id,
        horarioId: h.id,
        monitoriaId: bookFlow.monitoria.id,
        data: h.data,
        duvidaPrincipal: bookDuvida || undefined,
        status: "confirmado",
      },
    ]);
    setBookFlow(null);
    setBookDuvida("");
    setBookSuccess(true);
    setTimeout(() => setBookSuccess(false), 3000);
  };

  const handleEditSave = () => {
    if (!editFlow?.selectedHorario || !editFlow.agendamento) return;
    const h = editFlow.selectedHorario;
    onUpdateAgendamentos(
      agendamentos.map((a) =>
        a.id === editFlow.agendamento.id
          ? {
              ...a,
              horarioId: h.id,
              data: h.data,
              duvidaPrincipal: editDuvida || undefined,
            }
          : a,
      ),
    );
    setEditFlow(null);
    setEditDuvida("");
  };

  const sidebarItems: SidebarItem[] = [
    {
      id: "buscar",
      label: "Buscar Monitorias",
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: "agendamentos",
      label: "Meus Agendamentos",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: "materiais",
      label: "Materiais",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "perfil",
      label: "Meu Perfil",
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  // Materiais visible to student
  const myMonitoriaIds = [
    ...new Set(
      agendamentos
        .filter((a) => a.alunoId === user.id)
        .map((a) => a.monitoriaId),
    ),
  ];
  const visibleMateriais = materiais
    .filter((mat) => {
      if (
        matMonitoriaFilter !== "all" &&
        mat.monitoriaId !== matMonitoriaFilter
      )
        return false;
      if (matDateFilter && mat.uploadedAt !== matDateFilter) return false;
      return true;
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return (
    <>
      <DashboardLayout
        user={user}
        sidebarItems={sidebarItems}
        activeSection={section}
        onSectionChange={setSection}
        onLogout={onLogout}
        extraSidebarButton={extraSidebarButton}
        title={
          section === "buscar"
            ? "Buscar Monitorias"
            : section === "agendamentos"
              ? "Meus Agendamentos"
              : section === "perfil"
                ? "Meu Perfil"
                : "Materiais"
        }
        notifs={notifs}
        onNotifRead={onNotifRead}
        onNotifAction={(agendId) => {
          setSection("agendamentos");
          if (agendId) setHighlightedAgendId(agendId);
        }}
      >
        {bookSuccess && (
          <div
            className={`fixed top-4 right-4 z-50 ${OK_CLS} rounded-xl px-4 py-3 flex items-center gap-2 text-sm shadow-lg`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Agendamento
            realizado!
          </div>
        )}

        {section === "buscar" && (
          <div>
            <div className="relative mb-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar disciplina (ex: Cálculo, INF0001...)"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 bg-white shadow-sm text-slate-800 placeholder-slate-400"
              />
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma monitoria ativa encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((mon) => {
                  const mTurmas = turmas.filter((t) =>
                    mon.turmaIds.includes(t.id),
                  );
                  const mMons = users.filter((u) =>
                    mon.monitorIds.includes(u.id),
                  );
                  const mHors = horarios.filter(
                    (h) =>
                      h.monitoriaId === mon.id &&
                      !isSessionPast(h.data, h.horaFim),
                  );
                  const totalVagas = mHors.reduce(
                    (acc, h) => acc + vagasLivres(h, agendamentos),
                    0,
                  );
                  return (
                    <div
                      key={mon.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col"
                    >
                      <div
                        className="px-4 py-3"
                        style={{ backgroundColor: SIDEBAR_BG }}
                      >
                        <h3
                          className="text-white font-semibold text-sm"
                          style={{ fontFamily: "Manrope, sans-serif" }}
                        >
                          {mTurmas[0]?.nomeDisciplina || "—"}
                        </h3>
                        <p className="text-blue-300 text-xs">
                          {mTurmas.map((t) => t.codigo).join(" · ")}
                        </p>
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-3">
                        {/* Each monitor shown separately with their own slots */}
                        {mMons.map((monUser) => {
                          const monHors = mHors.filter(
                            (h) => h.monitorId === monUser.id,
                          );
                          const monVagas = monHors.reduce(
                            (acc, h) => acc + vagasLivres(h, agendamentos),
                            0,
                          );
                          return (
                            <div
                              key={monUser.id}
                              className="border border-slate-100 rounded-xl p-3 bg-slate-50/50"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar name={monUser.name} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {monUser.name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Monitor(a)
                                  </p>
                                </div>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${monVagas > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                                >
                                  <UserCheck className="w-3 h-3 inline mr-0.5" />
                                  {monVagas > 0
                                    ? `${monVagas} vaga${monVagas !== 1 ? "s" : ""}`
                                    : "Lotado"}
                                </span>
                              </div>
                              {monHors.length > 0 && (
                                <div className="space-y-1 mb-2">
                                  {monHors.slice(0, 2).map((h) => (
                                    <div
                                      key={h.id}
                                      className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded-lg px-2.5 py-1.5 border border-slate-100"
                                    >
                                      {h.modalidade === "online" ? (
                                        <Link2
                                          className="w-3 h-3 flex-shrink-0"
                                          style={{ color: PRIMARY_BG }}
                                        />
                                      ) : (
                                        <MapPin
                                          className="w-3 h-3 flex-shrink-0"
                                          style={{ color: PRIMARY_BG }}
                                        />
                                      )}
                                      <span className="font-medium">
                                        {getDiaSemana(h.data)}
                                      </span>
                                      <span>
                                        {h.horaInicio}–{h.horaFim}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {monHors.length > 0 && monVagas > 0 && (
                                <button
                                  onClick={() =>
                                    setBookFlow({
                                      monitoria: mon,
                                      step: "pick",
                                      selectedHorario: null,
                                      filterMonitorId: monUser.id,
                                    })
                                  }
                                  className="w-full text-xs text-white py-1.5 rounded-lg font-semibold transition"
                                  style={{ backgroundColor: PRIMARY_BG }}
                                >
                                  Agendar com {monUser.name.split(" ")[0]}
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {mMons.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-2">
                            Sem monitor atribuído
                          </p>
                        )}
                        {totalVagas === 0 && mMons.length > 0 && (
                          <p className="text-xs text-slate-400 text-center py-1">
                            Todas as vagas preenchidas
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {section === "agendamentos" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <SBar
                value={agendQ}
                onChange={setAgendQ}
                placeholder="Buscar por disciplina, monitor ou data..."
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "todos" | ComputedStatus)
                }
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 flex-shrink-0"
              >
                <option value="todos">Todos os status</option>
                <option value="confirmado">Confirmado</option>
                <option value="presente">Presente</option>
                <option value="ausente">Ausente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            {filteredAgendamentos.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum agendamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAgendamentos.map((a) => {
                  const h = horarios.find((h) => h.id === a.horarioId);
                  const m = monitorias.find((m) => m.id === a.monitoriaId);
                  const mTurmas = turmas.filter((t) =>
                    m?.turmaIds.includes(t.id),
                  );
                  // Use h.monitorId so multi-monitor monitorias show the correct monitor
                  const mon = h
                    ? users.find((u) => u.id === h.monitorId)
                    : m
                      ? users.find((u) => u.id === m.monitorIds[0])
                      : null;
                  const cs = computeStatus(a, h, chamadas);
                  const { label: csLabel, cls: csCls } = statusLabel(cs);
                  return (
                    <div
                      key={a.id}
                      className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 transition-all ${a.status === "cancelado" ? "opacity-60" : ""} ${highlightedAgendId === a.id ? "border-[#3B69B0] ring-2 ring-[#3B69B0]/30" : "border-slate-200"}`}
                      ref={(el) => {
                        if (el && highlightedAgendId === a.id) {
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                          setTimeout(() => setHighlightedAgendId(null), 3000);
                        }
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: PAGE_BG }}
                      >
                        <Calendar
                          className="w-5 h-5"
                          style={{ color: PRIMARY_BG }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">
                          {mTurmas[0]?.nomeDisciplina || "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Monitor: {mon?.name || "—"} · {fmtDate(a.data)}
                        </p>
                        {h && (
                          <p className="text-xs text-slate-400">
                            {h.horaInicio}–{h.horaFim} · {formatDate(h.data)}
                          </p>
                        )}
                        {a.duvidaPrincipal && (
                          <p
                            className="text-xs mt-1.5 px-2.5 py-1 rounded-lg"
                            style={{
                              color: PRIMARY_BG,
                              backgroundColor: PAGE_BG,
                            }}
                          >
                            Dúvida: {a.duvidaPrincipal}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${csCls}`}
                        >
                          {csLabel}
                        </span>
                        <div className="flex gap-1">
                          {cs === "confirmado" && (
                            <button
                              onClick={() => {
                                setEditFlow({
                                  agendamento: a,
                                  step: "pick",
                                  selectedHorario: null,
                                });
                                setEditDuvida(a.duvidaPrincipal || "");
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {cs === "confirmado" && (
                            <button
                              onClick={() => setCancelConfirm(a.id)}
                              className="text-xs text-slate-400 hover:text-amber-600 transition px-1.5 py-1"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {section === "materiais" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={matMonitoriaFilter}
                onChange={(e) => setMatMonitoriaFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
              >
                <option value="all">Todas as monitorias</option>
                {activeMons.map((m) => {
                  const t = turmas.find((t) => m.turmaIds[0] === t.id);
                  return (
                    <option key={m.id} value={m.id}>
                      {t?.nomeDisciplina || m.id}
                    </option>
                  );
                })}
              </select>
              <input
                type="date"
                value={matDateFilter}
                onChange={(e) => setMatDateFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
              />
              {matDateFilter && (
                <button
                  onClick={() => setMatDateFilter("")}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl bg-white transition"
                >
                  Limpar data
                </button>
              )}
            </div>
            {visibleMateriais.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum material encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleMateriais.map((mat) => {
                  const mon = monitorias.find((m) => m.id === mat.monitoriaId);
                  const t0 = turmas.find((t) => mon?.turmaIds[0] === t.id);
                  const monitor = users.find((u) => u.id === mat.monitorId);
                  const hRef = horarios.find((h) => h.id === mat.horarioId);
                  return (
                    <div
                      key={mat.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: PAGE_BG }}
                        >
                          <FileText
                            className="w-4 h-4"
                            style={{ color: PRIMARY_BG }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">
                            {mat.titulo}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {mat.descricao}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded">
                              {mat.filename}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {t0 && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: PAGE_BG,
                                  color: SIDEBAR_BG,
                                }}
                              >
                                {t0.nomeDisciplina}
                              </span>
                            )}
                            {monitor && (
                              <span className="text-xs text-slate-400">
                                Monitor: {monitor.name}
                              </span>
                            )}
                            {hRef && (
                              <span className="text-xs text-slate-400">
                                {formatDate(hRef.data)}
                              </span>
                            )}
                            <span className="text-xs text-slate-300">
                              {fmtDate(mat.uploadedAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadMaterial(mat)}
                          title="Download"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition flex-shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {section === "perfil" && (
          <ProfileSection
            user={user}
            users={users}
            onUpdateUsers={onUpdateUsers}
            onUpdateCurrentUser={onUpdateCurrentUser}
          />
        )}
      </DashboardLayout>

      {bookFlow &&
        bookFlow.step === "pick" &&
        (() => {
          const mon = bookFlow.monitoria;
          const mTurmas = turmas.filter((t) => mon.turmaIds.includes(t.id));
          const availHors = horarios.filter(
            (h) =>
              h.monitoriaId === mon.id &&
              (!bookFlow!.filterMonitorId ||
                h.monitorId === bookFlow!.filterMonitorId) &&
              !isSessionPast(h.data, h.horaFim) &&
              vagasLivres(h, agendamentos) > 0 &&
              h.monitorId !== user.id,
          );
          return (
            <Modal
              title={
                bookFlow.filterMonitorId
                  ? `Horários de ${users.find((u) => u.id === bookFlow.filterMonitorId)?.name.split(" ")[0]}`
                  : "Escolher Horário de Plantão"
              }
              onClose={() => setBookFlow(null)}
              wide
              footer={<CancelBtn onClick={() => setBookFlow(null)} />}
            >
              <div
                className="rounded-xl p-3 border"
                style={{ backgroundColor: PAGE_BG, borderColor: "#C8D6EC" }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: SIDEBAR_BG }}
                >
                  {mTurmas[0]?.nomeDisciplina}
                </p>
                <p className="text-xs mt-0.5" style={{ color: PRIMARY_BG }}>
                  {mTurmas.map((t) => t.codigo).join(" · ")}
                </p>
              </div>
              {availHors.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum horário disponível</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Selecione um horário disponível:
                  </p>
                  {availHors.map((h) => {
                    const monitor = users.find((u) => u.id === h.monitorId);
                    const livre = vagasLivres(h, agendamentos);
                    return (
                      <button
                        key={h.id}
                        onClick={() =>
                          setBookFlow((f) =>
                            f
                              ? { ...f, step: "confirm", selectedHorario: h }
                              : f,
                          )
                        }
                        className="w-full text-left border border-slate-200 rounded-xl p-3 hover:border-[#3B69B0] hover:bg-blue-50/30 transition-all flex items-center gap-3"
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: PAGE_BG }}
                        >
                          {h.modalidade === "online" ? (
                            <Link2
                              className="w-4 h-4"
                              style={{ color: PRIMARY_BG }}
                            />
                          ) : (
                            <MapPin
                              className="w-4 h-4"
                              style={{ color: PRIMARY_BG }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {formatDate(h.data)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {h.horaInicio}–{h.horaFim} · {monitor?.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {h.modalidade === "online"
                              ? h.linkOnline || "Online"
                              : `${h.sala} – ${h.bloco}`}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${livre > 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {livre} vaga{livre !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Modal>
          );
        })()}

      {bookFlow &&
        bookFlow.step === "confirm" &&
        bookFlow.selectedHorario &&
        (() => {
          const h = bookFlow.selectedHorario;
          const mon = bookFlow.monitoria;
          const mTurmas = turmas.filter((t) => mon.turmaIds.includes(t.id));
          const monitor = users.find((u) => u.id === h.monitorId);
          return (
            <Modal
              title="Confirmar Agendamento"
              onClose={() => setBookFlow(null)}
              wide
              footer={
                <>
                  <CancelBtn
                    onClick={() =>
                      setBookFlow((f) =>
                        f ? { ...f, step: "pick", selectedHorario: null } : f,
                      )
                    }
                    label="← Voltar"
                  />
                  <PrimaryBtn onClick={handleBook} label="Confirmar" />
                </>
              }
            >
              <div
                className="rounded-xl p-3.5 border"
                style={{ backgroundColor: PAGE_BG, borderColor: "#C8D6EC" }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: SIDEBAR_BG }}
                >
                  {mTurmas[0]?.nomeDisciplina}
                </p>
                <p className="text-xs mt-0.5" style={{ color: PRIMARY_BG }}>
                  Monitor: {monitor?.name}
                </p>
                <p className="text-xs" style={{ color: PRIMARY_BG }}>
                  {formatDate(h.data)} · {h.horaInicio}–{h.horaFim}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {h.modalidade === "online"
                    ? h.linkOnline || "Online"
                    : `${h.sala} – ${h.bloco}`}
                </p>
              </div>
              {bookErr && (
                <div
                  className={`${ERR_CLS} rounded-xl px-3 py-2 flex items-center gap-2 text-xs`}
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                  {bookErr}
                </div>
              )}
              <FormField
                label={
                  <>
                    Dúvida Principal{" "}
                    <span className="text-slate-400 font-normal">
                      (opcional)
                    </span>
                  </>
                }
              >
                <textarea
                  value={bookDuvida}
                  onChange={(e) => setBookDuvida(e.target.value)}
                  placeholder="Descreva sua dúvida principal..."
                  rows={3}
                  className={`${inputCls()} resize-none`}
                />
              </FormField>
            </Modal>
          );
        })()}

      {editFlow &&
        editFlow.step === "pick" &&
        (() => {
          const a = editFlow.agendamento;
          const mon = monitorias.find((m) => m.id === a.monitoriaId);
          const mTurmas = turmas.filter((t) => mon?.turmaIds.includes(t.id));
          const availHors = horarios.filter(
            (h) =>
              h.monitoriaId === a.monitoriaId &&
              !isSessionPast(h.data, h.horaFim) &&
              vagasLivres(h, agendamentos) > 0 &&
              h.id !== a.horarioId &&
              h.monitorId !== user.id,
          );
          return (
            <Modal
              title="Escolher Novo Horário"
              onClose={() => setEditFlow(null)}
              wide
              footer={<CancelBtn onClick={() => setEditFlow(null)} />}
            >
              <div
                className="rounded-xl p-3 border"
                style={{ backgroundColor: PAGE_BG, borderColor: "#C8D6EC" }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: SIDEBAR_BG }}
                >
                  {mTurmas[0]?.nomeDisciplina}
                </p>
                <p className="text-xs mt-0.5" style={{ color: PRIMARY_BG }}>
                  Horário atual:{" "}
                  {fmtDate(
                    horarios.find((h) => h.id === a.horarioId)?.data || "",
                  )}{" "}
                  {horarios.find((h) => h.id === a.horarioId)?.horaInicio}–
                  {horarios.find((h) => h.id === a.horarioId)?.horaFim}
                </p>
              </div>
              {availHors.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    Nenhum outro horário disponível para reagendar
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Selecione o novo horário:
                  </p>
                  {availHors.map((h) => {
                    const monitor = users.find((u) => u.id === h.monitorId);
                    return (
                      <button
                        key={h.id}
                        onClick={() =>
                          setEditFlow((f) =>
                            f
                              ? { ...f, step: "confirm", selectedHorario: h }
                              : f,
                          )
                        }
                        className="w-full text-left border border-slate-200 rounded-xl p-3 hover:border-[#3B69B0] hover:bg-blue-50/30 transition-all flex items-center gap-3"
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: PAGE_BG }}
                        >
                          {h.modalidade === "online" ? (
                            <Link2
                              className="w-4 h-4"
                              style={{ color: PRIMARY_BG }}
                            />
                          ) : (
                            <MapPin
                              className="w-4 h-4"
                              style={{ color: PRIMARY_BG }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {formatDate(h.data)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {h.horaInicio}–{h.horaFim} · {monitor?.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {h.modalidade === "online"
                              ? h.linkOnline || "Online"
                              : `${h.sala} – ${h.bloco}`}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${h.vagas - h.vagasOcupadas > 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {h.vagas - h.vagasOcupadas} vaga
                          {h.vagas - h.vagasOcupadas !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Modal>
          );
        })()}

      {editFlow &&
        editFlow.step === "confirm" &&
        editFlow.selectedHorario &&
        (() => {
          const h = editFlow.selectedHorario;
          const monitor = users.find((u) => u.id === h.monitorId);
          const mon = monitorias.find(
            (m) => m.id === editFlow.agendamento.monitoriaId,
          );
          const mTurmas = turmas.filter((t) => mon?.turmaIds.includes(t.id));
          return (
            <Modal
              title="Confirmar Reagendamento"
              onClose={() => setEditFlow(null)}
              wide
              footer={
                <>
                  <CancelBtn
                    onClick={() =>
                      setEditFlow((f) =>
                        f ? { ...f, step: "pick", selectedHorario: null } : f,
                      )
                    }
                    label="← Voltar"
                  />
                  <PrimaryBtn onClick={handleEditSave} label="Salvar" />
                </>
              }
            >
              <div
                className="rounded-xl p-3.5 border"
                style={{ backgroundColor: PAGE_BG, borderColor: "#C8D6EC" }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: SIDEBAR_BG }}
                >
                  {mTurmas[0]?.nomeDisciplina}
                </p>
                <p className="text-xs mt-0.5" style={{ color: PRIMARY_BG }}>
                  Monitor: {monitor?.name}
                </p>
                <p className="text-xs" style={{ color: PRIMARY_BG }}>
                  {formatDate(h.data)} · {h.horaInicio}–{h.horaFim}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {h.modalidade === "online"
                    ? h.linkOnline || "Online"
                    : `${h.sala} – ${h.bloco}`}
                </p>
              </div>
              <FormField
                label={
                  <>
                    Dúvida Principal{" "}
                    <span className="text-slate-400 font-normal">
                      (opcional)
                    </span>
                  </>
                }
              >
                <textarea
                  value={editDuvida}
                  onChange={(e) => setEditDuvida(e.target.value)}
                  placeholder="Descreva sua dúvida principal..."
                  rows={3}
                  className={`${inputCls()} resize-none`}
                />
              </FormField>
            </Modal>
          );
        })()}

      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: PAGE_BG }}
            >
              <AlertCircle className="w-6 h-6" style={{ color: PRIMARY_BG }} />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              Cancelar agendamento?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Esta ação não pode ser desfeita. O horário voltará a ficar
              disponível.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: PRIMARY_BG }}
              >
                Não cancelar
              </button>
              <button
                onClick={() => {
                  onUpdateAgendamentos(
                    agendamentos.map((a) =>
                      a.id === cancelConfirm
                        ? { ...a, status: "cancelado" as const }
                        : a,
                    ),
                  );
                  setCancelConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50 rounded-xl text-sm font-semibold transition"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Monitor Dashboard ─────────────────────────────────────────────────────────

function MonitorDashboard({
  user,
  users,
  turmas,
  monitorias,
  horarios,
  agendamentos,
  chamadas,
  materiais,
  relatorios,
  onUpdateHorarios,
  onUpdateAgendamentos,
  onUpdateChamadas,
  onUpdateMateriais,
  onUpdateRelatorios,
  onUpdateUsers,
  onUpdateCurrentUser,
  onAddNotif,
  onLogout,
  onSwitchToStudent,
}: {
  user: User;
  users: User[];
  turmas: Turma[];
  monitorias: Monitoria[];
  horarios: Horario[];
  agendamentos: Agendamento[];
  chamadas: Chamada[];
  materiais: Material[];
  relatorios: Relatorio[];
  onUpdateHorarios: (h: Horario[]) => void;
  onUpdateAgendamentos: (a: Agendamento[]) => void;
  onUpdateChamadas: (c: Chamada[]) => void;
  onUpdateMateriais: (m: Material[]) => void;
  onUpdateRelatorios: (r: Relatorio[]) => void;
  onUpdateUsers: (u: User[]) => void;
  onUpdateCurrentUser: (u: User) => void;
  onAddNotif: (n: Omit<Notif, "id" | "at" | "read">) => void;
  onLogout: () => void;
  onSwitchToStudent: () => void;
}) {
  const [section, setSection] = useState("horarios");
  const [showModal, setShowModal] = useState(false);
  const [editH, setEditH] = useState<Horario | null>(null);
  const [form, setForm] = useState({
    monitoriaId: "",
    data: "",
    horaInicio: "08:00",
    horaFim: "10:00",
    sala: "",
    bloco: "Bloco de Aulas I",
    linkOnline: "",
    modalidade: "presencial" as "presencial" | "online",
    vagas: 5,
  });
  const [formErrs, setFormErrs] = useState<Record<string, string>>({});
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [blocoOpen, setBlocoOpen] = useState(false);

  // Horarios filter
  const [horDateFilter, setHorDateFilter] = useState("");

  // Chamada
  const [chamadaDateFilter, setChamadaDateFilter] = useState("");
  const [chamadaSession, setChamadaSession] = useState<Horario | null>(null);

  // Materiais
  const [matModal, setMatModal] = useState<"create" | "edit" | null>(null);
  const [editMat, setEditMat] = useState<Material | null>(null);
  const [delMat, setDelMat] = useState<string | null>(null);
  const [matForm, setMatForm] = useState({
    monitoriaId: "",
    horarioId: "",
    titulo: "",
    descricao: "",
    filename: "",
  });
  const [matErrs, setMatErrs] = useState<Record<string, string>>({});
  const [matDateFilter, setMatDateFilter] = useState("");
  const [matFileData, setMatFileData] = useState<{
    content: string;
    type: string;
    size: number;
  } | null>(null);
  const [matFileSizeErr, setMatFileSizeErr] = useState("");

  // Relatorios
  const [relModal, setRelModal] = useState<"create" | "edit" | null>(null);
  const [editRel, setEditRel] = useState<Relatorio | null>(null);
  const [delRel, setDelRel] = useState<string | null>(null);
  const [relForm, setRelForm] = useState({
    monitoriaId: "",
    titulo: "",
    descricao: "",
    filename: "",
  });
  const [relErrs, setRelErrs] = useState<Record<string, string>>({});
  const [relDateFilter, setRelDateFilter] = useState("");
  const [relFileData, setRelFileData] = useState<{
    content: string;
    type: string;
    size: number;
  } | null>(null);
  const [relFileSizeErr, setRelFileSizeErr] = useState("");

  // Notifications
  const [dateChangeNotif, setDateChangeNotif] = useState("");

  const myMons = monitorias.filter((m) => m.monitorIds.includes(user.id));
  const myHors = horarios.filter((h) => h.monitorId === user.id);
  const myMateriais = materiais.filter((m) => m.monitorId === user.id);
  const myRelatorios = relatorios.filter((r) => r.monitorId === user.id);

  const todayStr = today();
  // Total hours (8h presencial + 4h online targets)
  const totalH = horasTotais(horarios, user.id);

  const openCreate = () => {
    setEditH(null);
    setForm({
      monitoriaId: myMons[0]?.id || "",
      data: "",
      horaInicio: "08:00",
      horaFim: "10:00",
      sala: "",
      bloco: "Bloco de Aulas I",
      linkOnline: "",
      modalidade: "presencial",
      vagas: 5,
    });
    setFormErrs({});
    setShowModal(true);
  };
  const openEdit = (h: Horario) => {
    setEditH(h);
    setForm({
      monitoriaId: h.monitoriaId,
      data: h.data,
      horaInicio: h.horaInicio,
      horaFim: h.horaFim,
      sala: h.sala,
      bloco: h.bloco,
      linkOnline: h.linkOnline || "",
      modalidade: h.modalidade,
      vagas: h.vagas,
    });
    setFormErrs({});
    setShowModal(true);
  };

  const saveH = () => {
    const errs: Record<string, string> = {};
    if (!form.monitoriaId) errs.monitoriaId = "Selecione uma monitoria.";
    if (!form.data) errs.data = "Selecione uma data.";
    else if (form.data < todayStr)
      errs.data = "A data não pode ser no passado.";
    else if (minutesUntilSession(form.data, form.horaInicio) < 720)
      errs.data =
        "Horário deve ser cadastrado com pelo menos 12h de antecedência.";
    if (form.horaFim <= form.horaInicio)
      errs.horaFim = "Horário de fim deve ser após o início.";
    if (form.modalidade === "presencial" && !form.sala.trim())
      errs.sala = "Informe o número da sala.";
    if (form.modalidade === "online" && !form.linkOnline.trim())
      errs.linkOnline = "Informe o link de atendimento.";
    // Time conflict on same date
    const sameDay = myHors.filter(
      (h) => h.data === form.data && (!editH || h.id !== editH.id),
    );
    const toMin = (t: string) => {
      const [hh, mm] = t.split(":").map(Number);
      return hh * 60 + mm;
    };
    const conflict = sameDay.find(
      (h) =>
        toMin(form.horaInicio) < toMin(h.horaFim) &&
        toMin(form.horaFim) > toMin(h.horaInicio),
    );
    if (conflict)
      errs.horaFim = `Conflito: já existe plantão das ${conflict.horaInicio}–${conflict.horaFim} nesta data.`;
    // No hard cap — 12h (8 presencial + 4 online) is a target, not a hard limit
    if (Object.keys(errs).length) {
      setFormErrs(errs);
      return;
    }

    if (editH) {
      onUpdateHorarios(
        horarios.map((h) =>
          h.id === editH.id
            ? {
                ...h,
                monitoriaId: form.monitoriaId,
                data: form.data,
                horaInicio: form.horaInicio,
                horaFim: form.horaFim,
                sala: form.sala,
                bloco: form.bloco,
                linkOnline: form.linkOnline || undefined,
                modalidade: form.modalidade,
                vagas: form.vagas,
              }
            : h,
        ),
      );
      // Notify students if date changed — keep them enrolled, update agendamento dates + send bell notifs
      if (editH.data !== form.data) {
        const affected = agendamentos.filter(
          (a) => a.horarioId === editH.id && a.status !== "cancelado",
        );
        if (affected.length > 0) {
          onUpdateAgendamentos(
            agendamentos.map((a) =>
              a.horarioId === editH.id && a.status !== "cancelado"
                ? { ...a, data: form.data }
                : a,
            ),
          );
          affected.forEach((a) => {
            onAddNotif({
              toUserId: a.alunoId,
              title: "Plantão reagendado",
              body: `Seu atendimento foi movido para ${fmtDate(form.data)} (${form.horaInicio}–${form.horaFim}). Você continua inscrito. Clique para manter ou cancelar.`,
              agendamentoId: a.id,
            });
          });
          setDateChangeNotif(
            `Data alterada. ${affected.length} aluno(s) notificado(s) e mantidos no novo horário.`,
          );
          setTimeout(() => setDateChangeNotif(""), 6000);
        }
      }
    } else {
      onUpdateHorarios([
        ...horarios,
        {
          id: nid(),
          monitorId: user.id,
          monitoriaId: form.monitoriaId,
          data: form.data,
          horaInicio: form.horaInicio,
          horaFim: form.horaFim,
          sala: form.sala,
          bloco: form.bloco,
          linkOnline: form.linkOnline || undefined,
          modalidade: form.modalidade,
          vagas: form.vagas,
          vagasOcupadas: 0,
        },
      ]);
    }
    setShowModal(false);
  };

  const togglePresenca = (
    alunoId: string,
    horarioId: string,
    sessionDate: string,
  ) => {
    const ex = chamadas.find(
      (c) =>
        c.alunoId === alunoId &&
        c.horarioId === horarioId &&
        c.data === sessionDate,
    );
    if (ex) {
      onUpdateChamadas(
        chamadas.map((c) =>
          c.id === ex.id ? { ...c, presente: !c.presente } : c,
        ),
      );
    } else {
      onUpdateChamadas([
        ...chamadas,
        { id: nid(), alunoId, horarioId, data: sessionDate, presente: true },
      ]);
    }
  };

  // Materiais logic
  const openCreateMat = () => {
    setEditMat(null);
    setMatForm({
      monitoriaId: myMons[0]?.id || "",
      horarioId: "",
      titulo: "",
      descricao: "",
      filename: "",
    });
    setMatErrs({});
    setMatFileData(null);
    setMatFileSizeErr("");
    setMatModal("create");
  };
  const openEditMat = (mat: Material) => {
    setEditMat(mat);
    setMatForm({
      monitoriaId: mat.monitoriaId,
      horarioId: mat.horarioId || "",
      titulo: mat.titulo,
      descricao: mat.descricao,
      filename: mat.filename,
    });
    setMatErrs({});
    setMatFileData(null);
    setMatFileSizeErr("");
    setMatModal("edit");
  };
  const handleMatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setMatFileSizeErr(
        `Arquivo muito grande. Limite: 20 MB. Tamanho: ${formatBytes(file.size)}`,
      );
      return;
    }
    setMatFileSizeErr("");
    setMatForm((f) => ({ ...f, filename: file.name }));
    const reader = new FileReader();
    reader.onload = (ev) =>
      setMatFileData({
        content: ev.target?.result as string,
        type: file.type,
        size: file.size,
      });
    reader.readAsDataURL(file);
  };
  const saveMat = () => {
    const errs: Record<string, string> = {};
    if (!matForm.titulo.trim()) errs.titulo = "Título obrigatório.";
    if (!matForm.monitoriaId) errs.monitoriaId = "Selecione uma monitoria.";
    if (matFileSizeErr) errs.file = matFileSizeErr;
    if (Object.keys(errs).length) {
      setMatErrs(errs);
      return;
    }
    if (editMat) {
      onUpdateMateriais(
        materiais.map((m) =>
          m.id === editMat.id
            ? {
                ...m,
                ...matForm,
                horarioId: matForm.horarioId || undefined,
                ...(matFileData
                  ? {
                      fileContent: matFileData.content,
                      fileType: matFileData.type,
                      fileSize: matFileData.size,
                    }
                  : {}),
              }
            : m,
        ),
      );
    } else {
      onUpdateMateriais([
        ...materiais,
        {
          id: nid(),
          monitorId: user.id,
          monitoriaId: matForm.monitoriaId,
          horarioId: matForm.horarioId || undefined,
          titulo: matForm.titulo,
          descricao: matForm.descricao,
          filename: matForm.filename,
          fileContent: matFileData?.content,
          fileType: matFileData?.type,
          fileSize: matFileData?.size,
          uploadedAt: todayStr,
        },
      ]);
    }
    setMatModal(null);
    setMatFileData(null);
  };
  const matHorariosForMon = myHors.filter(
    (h) => h.monitoriaId === matForm.monitoriaId,
  );

  // Relatorios logic
  const openCreateRel = () => {
    setEditRel(null);
    setRelForm({
      monitoriaId: myMons[0]?.id || "",
      titulo: "",
      descricao: "",
      filename: "",
    });
    setRelErrs({});
    setRelFileData(null);
    setRelFileSizeErr("");
    setRelModal("create");
  };
  const openEditRel = (r: Relatorio) => {
    setEditRel(r);
    setRelForm({
      monitoriaId: r.monitoriaId,
      titulo: r.titulo,
      descricao: r.descricao,
      filename: r.filename,
    });
    setRelErrs({});
    setRelFileData(null);
    setRelFileSizeErr("");
    setRelModal("edit");
  };
  const handleRelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setRelFileSizeErr(
        `Arquivo muito grande. Limite: 20 MB. Tamanho: ${formatBytes(file.size)}`,
      );
      return;
    }
    setRelFileSizeErr("");
    setRelForm((f) => ({ ...f, filename: file.name }));
    const reader = new FileReader();
    reader.onload = (ev) =>
      setRelFileData({
        content: ev.target?.result as string,
        type: file.type,
        size: file.size,
      });
    reader.readAsDataURL(file);
  };
  const saveRel = () => {
    const errs: Record<string, string> = {};
    if (!relForm.titulo.trim()) errs.titulo = "Título obrigatório.";
    if (!relForm.monitoriaId) errs.monitoriaId = "Selecione uma monitoria.";
    if (relFileSizeErr) errs.file = relFileSizeErr;
    if (Object.keys(errs).length) {
      setRelErrs(errs);
      return;
    }
    if (editRel) {
      onUpdateRelatorios(
        relatorios.map((r) =>
          r.id === editRel.id
            ? {
                ...r,
                ...relForm,
                ...(relFileData
                  ? {
                      fileContent: relFileData.content,
                      fileType: relFileData.type,
                      fileSize: relFileData.size,
                    }
                  : {}),
              }
            : r,
        ),
      );
    } else {
      onUpdateRelatorios([
        ...relatorios,
        {
          id: nid(),
          monitorId: user.id,
          monitoriaId: relForm.monitoriaId,
          titulo: relForm.titulo,
          descricao: relForm.descricao,
          filename: relForm.filename,
          fileContent: relFileData?.content,
          fileType: relFileData?.type,
          fileSize: relFileData?.size,
          uploadedAt: todayStr,
        },
      ]);
    }
    setRelModal(null);
    setRelFileData(null);
  };

  const sidebarItems: SidebarItem[] = [
    {
      id: "horarios",
      label: "Meus Horários",
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: "chamada",
      label: "Lista de Chamada",
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      id: "materiais",
      label: "Materiais",
      icon: <Upload className="w-4 h-4" />,
    },
    {
      id: "relatorios",
      label: "Relatórios",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "perfil",
      label: "Meu Perfil",
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  const switchBtn = (
    <button
      onClick={onSwitchToStudent}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/10 transition"
    >
      <ArrowLeftRight className="w-4 h-4" /> Visão de Aluno
    </button>
  );

  const titleMap: Record<string, string> = {
    horarios: "Horários de Plantão",
    chamada: "Lista de Chamada Digital",
    materiais: "Materiais de Apoio",
    relatorios: "Relatórios de Monitoria",
    perfil: "Meu Perfil",
  };

  return (
    <>
      <DashboardLayout
        user={user}
        sidebarItems={sidebarItems}
        activeSection={section}
        onSectionChange={(s) => {
          setSection(s);
          setChamadaSession(null);
        }}
        onLogout={onLogout}
        extraSidebarButton={switchBtn}
        title={titleMap[section] || "Monitor"}
      >
        {/* Date change notification toast */}
        {dateChangeNotif && (
          <div className="fixed top-4 right-4 z-50 bg-blue-700 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm max-w-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {dateChangeNotif}
          </div>
        )}

        {/* ── HORÁRIOS ── */}
        {section === "horarios" && (
          <div>
            {/* Total hours tracker: 8h presencial + 4h online = 12h */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Carga horária total{" "}
                <span className="text-xs text-slate-400 font-normal">
                  (meta: 8h presencial + 4h online)
                </span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Presencial",
                    atual: totalH.presencial,
                    meta: 8,
                    color: "#3B69B0",
                    bg: "#EEF2FA",
                  },
                  {
                    label: "Online",
                    atual: totalH.online,
                    meta: 4,
                    color: "#10b981",
                    bg: "#F0FDF4",
                  },
                ].map(({ label, atual, meta, color, bg }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-600">
                        {label}
                      </span>
                      <span className="text-xs font-semibold" style={{ color }}>
                        {atual.toFixed(1)}h / {meta}h
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (atual / meta) * 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">
                Total: {(totalH.presencial + totalH.online).toFixed(1)}h / 12h
              </p>
            </div>

            {(() => {
              const [horFilter, setHorFilter] = [
                horDateFilter,
                setHorDateFilter,
              ];
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={horFilter}
                      onChange={(e) => setHorFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
                      title="Filtrar por data"
                    />
                    {horFilter && (
                      <button
                        onClick={() => setHorFilter("")}
                        className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2 py-1.5 rounded-lg bg-white transition"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                    style={{ backgroundColor: PRIMARY_BG }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Horário
                  </button>
                </div>
              );
            })()}

            {myMons.map((mon) => {
              const monHors = [
                ...myHors.filter(
                  (h) =>
                    h.monitoriaId === mon.id &&
                    (!horDateFilter || h.data === horDateFilter),
                ),
              ].sort((a, b) => b.data.localeCompare(a.data));
              if (monHors.length === 0) return null;
              const mTurmas = turmas.filter((t) => mon.turmaIds.includes(t.id));
              return (
                <div key={mon.id} className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {mTurmas[0]?.nomeDisciplina || mon.id}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {monHors.map((h) => {
                      const livre = vagasLivres(h, agendamentos);
                      const past = isSessionPast(h.data, h.horaFim);
                      return (
                        <div
                          key={h.id}
                          className={`bg-white rounded-xl border shadow-sm p-4 ${past ? "opacity-60" : "border-slate-200"}`}
                        >
                          <div className="flex items-start justify-between mb-2.5">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                {formatDate(h.data)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {h.horaInicio}–{h.horaFim}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEdit(h)}
                                className="p-1.5 text-slate-400 hover:text-[#3B69B0] hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDelConfirm(h.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                            {h.modalidade === "online" ? (
                              <Link2
                                className="w-3 h-3 flex-shrink-0"
                                style={{ color: PRIMARY_BG }}
                              />
                            ) : (
                              <MapPin
                                className="w-3 h-3 flex-shrink-0"
                                style={{ color: PRIMARY_BG }}
                              />
                            )}
                            <span className="truncate">
                              {h.modalidade === "online"
                                ? h.linkOnline || "—"
                                : `${h.sala} – ${h.bloco}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${livre > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {livre}/{h.vagas} vagas
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${h.modalidade === "online" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {h.modalidade}
                            </span>
                            {past && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-400">
                                Encerrado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {myHors.length === 0 && (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum horário cadastrado</p>
              </div>
            )}
          </div>
        )}

        {/* ── CHAMADA ── */}
        {section === "chamada" && !chamadaSession && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Filtrar por data
                </label>
                <input
                  type="date"
                  value={chamadaDateFilter}
                  onChange={(e) => setChamadaDateFilter(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 bg-white text-slate-800"
                />
              </div>
              {chamadaDateFilter && (
                <button
                  onClick={() => setChamadaDateFilter("")}
                  className="text-xs text-slate-400 hover:text-slate-600 mt-5"
                >
                  Limpar
                </button>
              )}
            </div>
            {myMons.map((mon) => {
              const monHors = [
                ...myHors.filter(
                  (h) =>
                    h.monitoriaId === mon.id &&
                    (!chamadaDateFilter || h.data === chamadaDateFilter),
                ),
              ].sort((a, b) => b.data.localeCompare(a.data));
              if (monHors.length === 0) return null;
              const mTurmas = turmas.filter((t) => mon.turmaIds.includes(t.id));
              return (
                <div key={mon.id} className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {mTurmas[0]?.nomeDisciplina || mon.id}
                  </p>
                  <div className="space-y-2">
                    {monHors.map((h) => {
                      const hAgend = agendamentos.filter(
                        (a) =>
                          a.horarioId === h.id &&
                          a.data === h.data &&
                          a.status !== "cancelado",
                      );
                      const hCham = chamadas.filter(
                        (c) => c.horarioId === h.id && c.data === h.data,
                      );
                      return (
                        <button
                          key={h.id}
                          onClick={() => setChamadaSession(h)}
                          className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-[#3B69B0]/40 hover:shadow-md transition-all flex items-center gap-3"
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: PAGE_BG }}
                          >
                            <UserCheck
                              className="w-4 h-4"
                              style={{ color: PRIMARY_BG }}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {formatDate(h.data)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {h.horaInicio}–{h.horaFim} · {h.modalidade}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                              {hCham.filter((c) => c.presente).length}/
                              {hAgend.length} presentes
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {myHors.length === 0 && (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum horário registrado</p>
              </div>
            )}
          </div>
        )}

        {section === "chamada" &&
          chamadaSession &&
          (() => {
            const h = chamadaSession;
            const mon = myMons.find((m) => m.id === h.monitoriaId);
            const mTurmas = turmas.filter((t) => mon?.turmaIds.includes(t.id));
            const hAgend = agendamentos.filter(
              (a) =>
                a.horarioId === h.id &&
                a.data === h.data &&
                a.status !== "cancelado",
            );
            const hCham = chamadas.filter(
              (c) => c.horarioId === h.id && c.data === h.data,
            );
            const presCount = hCham.filter((c) => c.presente).length;
            return (
              <div>
                <button
                  onClick={() => setChamadaSession(null)}
                  className="flex items-center gap-2 text-sm mb-4 hover:underline"
                  style={{ color: PRIMARY_BG }}
                >
                  ← Voltar à lista
                </button>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
                  <p className="font-semibold text-slate-800">
                    {mTurmas[0]?.nomeDisciplina || "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(h.data)} · {h.horaInicio}–{h.horaFim}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                      {presCount} / {hAgend.length} presentes
                    </span>
                  </div>
                </div>
                {hAgend.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      Nenhum aluno agendado para esta sessão
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-50">
                      {hAgend.map((a) => {
                        const aluno = users.find((u) => u.id === a.alunoId);
                        const cham = hCham.find((c) => c.alunoId === a.alunoId);
                        const presente = cham?.presente ?? false;
                        return (
                          <div
                            key={a.id}
                            className="px-4 py-3 flex items-center gap-3"
                          >
                            <Avatar name={aluno?.name || "?"} size="sm" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">
                                {aluno?.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                Mat: {aluno?.matricula}
                              </p>
                              {a.duvidaPrincipal && (
                                <p
                                  className="text-xs italic mt-0.5"
                                  style={{ color: PRIMARY_BG }}
                                >
                                  "{a.duvidaPrincipal}"
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                togglePresenca(a.alunoId, h.id, h.data)
                              }
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${presente ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700"}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {presente ? "Presente" : "Ausente"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ── MATERIAIS ── */}
        {section === "materiais" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={matDateFilter}
                  onChange={(e) => setMatDateFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
                />
                {matDateFilter && (
                  <button
                    onClick={() => setMatDateFilter("")}
                    className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2 py-1.5 rounded-lg bg-white transition"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <button
                onClick={openCreateMat}
                className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                style={{ backgroundColor: PRIMARY_BG }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Material
              </button>
            </div>
            {(() => {
              const filtered = myMateriais
                .filter((m) => !matDateFilter || m.uploadedAt === matDateFilter)
                .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
              return filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Upload className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum material encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((mat) => {
                    const mon = monitorias.find(
                      (m) => m.id === mat.monitoriaId,
                    );
                    const t0 = turmas.find((t) => mon?.turmaIds[0] === t.id);
                    const hRef = horarios.find((h) => h.id === mat.horarioId);
                    return (
                      <div
                        key={mat.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3"
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: PAGE_BG }}
                        >
                          <FileText
                            className="w-4 h-4"
                            style={{ color: PRIMARY_BG }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">
                            {mat.titulo}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {mat.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500">
                              {mat.filename}
                            </span>
                            {t0 && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: PAGE_BG,
                                  color: SIDEBAR_BG,
                                }}
                              >
                                {t0.nomeDisciplina}
                              </span>
                            )}
                            {hRef && (
                              <span className="text-xs text-slate-400">
                                {formatDate(hRef.data)}
                              </span>
                            )}
                            <span className="text-xs text-slate-300">
                              {fmtDate(mat.uploadedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => downloadMaterial(mat)}
                            title="Download"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditMat(mat)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDelMat(mat.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── RELATÓRIOS ── */}
        {section === "relatorios" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={relDateFilter}
                  onChange={(e) => setRelDateFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
                />
                {relDateFilter && (
                  <button
                    onClick={() => setRelDateFilter("")}
                    className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2 py-1.5 rounded-lg bg-white transition"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <button
                onClick={openCreateRel}
                className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                style={{ backgroundColor: PRIMARY_BG }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Relatório
              </button>
            </div>
            {(() => {
              const filtered = myRelatorios
                .filter((r) => !relDateFilter || r.uploadedAt === relDateFilter)
                .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
              return filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum relatório encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((rel) => {
                    const mon = monitorias.find(
                      (m) => m.id === rel.monitoriaId,
                    );
                    const t0 = turmas.find((t) => mon?.turmaIds[0] === t.id);
                    return (
                      <div
                        key={rel.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3"
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: PAGE_BG }}
                        >
                          <FileText
                            className="w-4 h-4"
                            style={{ color: PRIMARY_BG }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">
                            {rel.titulo}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {rel.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500">
                              {rel.filename}
                            </span>
                            {t0 && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: PAGE_BG,
                                  color: SIDEBAR_BG,
                                }}
                              >
                                {t0.nomeDisciplina}
                              </span>
                            )}
                            <span className="text-xs text-slate-300">
                              {fmtDate(rel.uploadedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => downloadRelatorio(rel)}
                            title="Download"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditRel(rel)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDelRel(rel.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {section === "perfil" && (
          <ProfileSection
            user={user}
            users={users}
            onUpdateUsers={onUpdateUsers}
            onUpdateCurrentUser={onUpdateCurrentUser}
          />
        )}
      </DashboardLayout>

      {/* ── Horário Modal ── */}
      {showModal && (
        <Modal
          title={editH ? "Editar Horário" : "Novo Horário de Plantão"}
          onClose={() => setShowModal(false)}
          wide
          footer={
            <>
              <CancelBtn onClick={() => setShowModal(false)} />
              <PrimaryBtn onClick={saveH} label={editH ? "Salvar" : "Criar"} />
            </>
          }
        >
          <FormField label="Monitoria" error={formErrs.monitoriaId}>
            <select
              value={form.monitoriaId}
              onChange={(e) =>
                setForm((f) => ({ ...f, monitoriaId: e.target.value }))
              }
              className={selectCls}
            >
              {myMons.map((m) => {
                const t = turmas.find((t) => m.turmaIds[0] === t.id);
                return (
                  <option key={m.id} value={m.id}>
                    {t?.nomeDisciplina || m.id} — {m.semestre}
                  </option>
                );
              })}
              {myMons.length === 0 && (
                <option value="">Nenhuma monitoria atribuída</option>
              )}
            </select>
          </FormField>
          <FormField label="Data" error={formErrs.data}>
            {(() => {
              // Build highlight map: days with existing sessions for this monitor
              const hlMap: Record<string, { count: number; times: string[] }> =
                {};
              myHors
                .filter((h) => !editH || h.id !== editH.id)
                .forEach((h) => {
                  if (!hlMap[h.data]) hlMap[h.data] = { count: 0, times: [] };
                  hlMap[h.data].count++;
                  const t = `${h.horaInicio}–${h.horaFim}`;
                  if (!hlMap[h.data].times.includes(t))
                    hlMap[h.data].times.push(t);
                });
              return (
                <>
                  <p className="text-xs text-slate-400 mb-2">
                    Dias em{" "}
                    <span
                      className="font-semibold"
                      style={{ color: "#60A5FA" }}
                    >
                      azul claro
                    </span>{" "}
                    já têm horário cadastrado. Clique para ver os detalhes.
                  </p>
                  <MiniCalendar
                    selected={form.data}
                    onSelect={(d) => setForm((f) => ({ ...f, data: d }))}
                    minDate={todayStr}
                    highlightDates={
                      Object.keys(hlMap).length > 0 ? hlMap : undefined
                    }
                  />
                  {form.data && hlMap[form.data] && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Este dia já possui {hlMap[form.data].count} horário(s)
                        cadastrado(s):
                      </p>
                      {myHors
                        .filter(
                          (h) =>
                            h.data === form.data &&
                            (!editH || h.id !== editH.id),
                        )
                        .map((h) => (
                          <div
                            key={h.id}
                            className="text-xs text-amber-600 flex items-center gap-1.5 mt-1"
                          >
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium">
                              {h.horaInicio}–{h.horaFim}
                            </span>
                            <span className="text-amber-500">
                              ·{" "}
                              {h.modalidade === "online"
                                ? "Online"
                                : `Sala ${h.sala} – ${h.bloco}`}
                            </span>
                          </div>
                        ))}
                      <p className="text-xs text-amber-500 mt-1.5">
                        Você pode agendar em horário diferente dos ocupados
                        acima.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Início">
              <input
                type="time"
                value={form.horaInicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horaInicio: e.target.value }))
                }
                className={inputCls()}
              />
            </FormField>
            <FormField label="Fim" error={formErrs.horaFim}>
              <input
                type="time"
                value={form.horaFim}
                onChange={(e) =>
                  setForm((f) => ({ ...f, horaFim: e.target.value }))
                }
                className={inputCls(!!formErrs.horaFim)}
              />
            </FormField>
          </div>
          <FormField label="Modalidade">
            <select
              value={form.modalidade}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  modalidade: e.target.value as "presencial" | "online",
                }))
              }
              className={selectCls}
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </FormField>
          {form.modalidade === "presencial" && (
            <>
              <FormField label="Sala (número/nome)" error={formErrs.sala}>
                <input
                  value={form.sala}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sala: e.target.value }))
                  }
                  placeholder="Ex: 205"
                  className={inputCls(!!formErrs.sala)}
                />
              </FormField>
              <FormField label="Bloco">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBlocoOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
                  >
                    <span>{form.bloco}</span>
                    {blocoOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {blocoOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setBlocoOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                        {BLOCOS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, bloco: b }));
                              setBlocoOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-sm transition hover:bg-blue-50 hover:text-blue-700 ${form.bloco === b ? "font-semibold text-[#3B69B0] bg-[#EEF2FA]" : "text-slate-700"}`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </FormField>
            </>
          )}
          {form.modalidade === "online" && (
            <FormField label="Link de Atendimento" error={formErrs.linkOnline}>
              <input
                value={form.linkOnline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linkOnline: e.target.value }))
                }
                placeholder="https://meet.google.com/..."
                className={inputCls(!!formErrs.linkOnline)}
              />
            </FormField>
          )}
          <FormField label="Vagas">
            <input
              type="number"
              min={1}
              max={30}
              value={form.vagas}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vagas: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className={inputCls()}
            />
          </FormField>
        </Modal>
      )}
      {delConfirm && (
        <DeleteModal
          msg="Este horário será removido."
          onCancel={() => setDelConfirm(null)}
          onConfirm={() => {
            onUpdateHorarios(horarios.filter((h) => h.id !== delConfirm));
            setDelConfirm(null);
          }}
        />
      )}

      {/* ── Material Modal ── */}
      {matModal && (
        <Modal
          title={
            matModal === "create" ? "Adicionar Material" : "Editar Material"
          }
          onClose={() => setMatModal(null)}
          footer={
            <>
              <CancelBtn onClick={() => setMatModal(null)} />
              <PrimaryBtn
                onClick={saveMat}
                label={matModal === "create" ? "Adicionar" : "Salvar"}
              />
            </>
          }
        >
          <FormField label="Monitoria" error={matErrs.monitoriaId}>
            <select
              value={matForm.monitoriaId}
              onChange={(e) => {
                setMatForm((f) => ({
                  ...f,
                  monitoriaId: e.target.value,
                  horarioId: "",
                }));
              }}
              className={selectCls}
            >
              {myMons.map((m) => {
                const t = turmas.find((t) => m.turmaIds[0] === t.id);
                return (
                  <option key={m.id} value={m.id}>
                    {t?.nomeDisciplina || m.id}
                  </option>
                );
              })}
            </select>
          </FormField>
          <FormField
            label={
              <>
                Sessão{" "}
                <span className="text-slate-400 font-normal text-xs">
                  (opcional)
                </span>
              </>
            }
          >
            <select
              value={matForm.horarioId}
              onChange={(e) =>
                setMatForm((f) => ({ ...f, horarioId: e.target.value }))
              }
              className={selectCls}
            >
              <option value="">— Sem sessão específica —</option>
              {matHorariosForMon.map((h) => (
                <option key={h.id} value={h.id}>
                  {formatDate(h.data)} {h.horaInicio}–{h.horaFim}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Título" error={matErrs.titulo}>
            <input
              value={matForm.titulo}
              onChange={(e) =>
                setMatForm((f) => ({ ...f, titulo: e.target.value }))
              }
              placeholder="Ex: Lista de Exercícios"
              className={inputCls(!!matErrs.titulo)}
            />
          </FormField>
          <FormField label="Descrição">
            <textarea
              value={matForm.descricao}
              onChange={(e) =>
                setMatForm((f) => ({ ...f, descricao: e.target.value }))
              }
              rows={3}
              placeholder="Descrição do material..."
              className={`${inputCls()} resize-none`}
            />
          </FormField>
          <FormField label="Arquivo" error={matErrs.file || matFileSizeErr}>
            <input
              type="file"
              onChange={handleMatFile}
              accept=".pdf,.doc,.docx,.pptx,.ppt,.xls,.xlsx,.zip,.txt,.png,.jpg"
              className="w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">
              Limite: 20 MB. Formatos: PDF, DOC, PPTX, XLS, ZIP, imagens.
            </p>
            {matFileData && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {matForm.filename} — {formatBytes(matFileData.size)}
              </p>
            )}
          </FormField>
        </Modal>
      )}
      {delMat && (
        <DeleteModal
          msg="Este material será removido permanentemente."
          onCancel={() => setDelMat(null)}
          onConfirm={() => {
            onUpdateMateriais(materiais.filter((m) => m.id !== delMat));
            setDelMat(null);
          }}
        />
      )}

      {/* ── Relatório Modal ── */}
      {relModal && (
        <Modal
          title={
            relModal === "create" ? "Adicionar Relatório" : "Editar Relatório"
          }
          onClose={() => setRelModal(null)}
          footer={
            <>
              <CancelBtn onClick={() => setRelModal(null)} />
              <PrimaryBtn
                onClick={saveRel}
                label={relModal === "create" ? "Adicionar" : "Salvar"}
              />
            </>
          }
        >
          <FormField label="Monitoria" error={relErrs.monitoriaId}>
            <select
              value={relForm.monitoriaId}
              onChange={(e) =>
                setRelForm((f) => ({ ...f, monitoriaId: e.target.value }))
              }
              className={selectCls}
            >
              {myMons.map((m) => {
                const t = turmas.find((t) => m.turmaIds[0] === t.id);
                return (
                  <option key={m.id} value={m.id}>
                    {t?.nomeDisciplina || m.id}
                  </option>
                );
              })}
            </select>
          </FormField>
          <FormField label="Título" error={relErrs.titulo}>
            <input
              value={relForm.titulo}
              onChange={(e) =>
                setRelForm((f) => ({ ...f, titulo: e.target.value }))
              }
              placeholder="Ex: Relatório Mensal"
              className={inputCls(!!relErrs.titulo)}
            />
          </FormField>
          <FormField label="Descrição">
            <textarea
              value={relForm.descricao}
              onChange={(e) =>
                setRelForm((f) => ({ ...f, descricao: e.target.value }))
              }
              rows={3}
              placeholder="Resumo das atividades..."
              className={`${inputCls()} resize-none`}
            />
          </FormField>
          <FormField label="Arquivo" error={relErrs.file || relFileSizeErr}>
            <input
              type="file"
              onChange={handleRelFile}
              accept=".pdf,.doc,.docx,.pptx,.ppt,.xls,.xlsx,.zip,.txt"
              className="w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">
              Limite: 20 MB. Formatos: PDF, DOC, PPTX, XLS, ZIP.
            </p>
            {relFileData && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {relForm.filename} — {formatBytes(relFileData.size)}
              </p>
            )}
          </FormField>
          <p className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Visível apenas para o professor responsável pela monitoria.
          </p>
        </Modal>
      )}
      {delRel && (
        <DeleteModal
          msg="Este relatório será removido permanentemente."
          onCancel={() => setDelRel(null)}
          onConfirm={() => {
            onUpdateRelatorios(relatorios.filter((r) => r.id !== delRel));
            setDelRel(null);
          }}
        />
      )}
    </>
  );
}

// ─── Professor Dashboard ───────────────────────────────────────────────────────

function ProfessorDashboard({
  user,
  users,
  turmas,
  monitorias,
  horarios,
  agendamentos,
  chamadas,
  materiais,
  relatorios,
  onUpdateUsers,
  onUpdateCurrentUser,
  onLogout,
}: {
  user: User;
  users: User[];
  turmas: Turma[];
  monitorias: Monitoria[];
  horarios: Horario[];
  agendamentos: Agendamento[];
  chamadas: Chamada[];
  materiais: Material[];
  relatorios: Relatorio[];
  onUpdateUsers: (u: User[]) => void;
  onUpdateCurrentUser: (u: User) => void;
  onLogout: () => void;
}) {
  const [section, setSection] = useState("dashboard");
  const [filterTurma, setFilterTurma] = useState("all");
  const [detailTurma, setDetailTurma] = useState<Turma | null>(null);
  const [matTurmaFilter, setMatTurmaFilter] = useState("all");
  const [matDateFilter, setMatDateFilter] = useState("");
  const [relDateFilter, setRelDateFilter] = useState("");
  const [freqSession, setFreqSession] = useState<{
    horarioId: string;
    date: string;
  } | null>(null);
  const [freqSearch, setFreqSearch] = useState("");
  const [freqDateFilter, setFreqDateFilter] = useState("");
  const [turmasSearch, setTurmasSearch] = useState("");

  const myTurmas = turmas.filter((t) => t.professorId === user.id);
  const myMons = monitorias.filter((m) =>
    m.turmaIds.some((tid) => myTurmas.find((t) => t.id === tid)),
  );
  const relevantMons =
    filterTurma === "all"
      ? myMons
      : myMons.filter((m) => m.turmaIds.includes(filterTurma));
  const relevantHorIds = new Set(
    horarios
      .filter((h) => relevantMons.find((m) => m.id === h.monitoriaId))
      .map((h) => h.id),
  );
  const relevantChamadas = chamadas.filter((c) =>
    relevantHorIds.has(c.horarioId),
  );
  const presentes = relevantChamadas.filter((c) => c.presente).length;
  const ausentes = relevantChamadas.filter((c) => !c.presente).length;
  const totalAtend = agendamentos.filter(
    (a) => relevantHorIds.has(a.horarioId) && a.status !== "cancelado",
  ).length;

  const pieData = [
    { name: "Presentes", value: presentes },
    { name: "Ausentes", value: ausentes },
  ];
  const barData = myTurmas.map((t) => {
    const tMons = monitorias.filter((m) => m.turmaIds.includes(t.id));
    const hIds = horarios
      .filter((h) => tMons.find((m) => m.id === h.monitoriaId))
      .map((h) => h.id);
    return {
      disc: t.nomeDisciplina.split(" ")[0],
      atend: agendamentos.filter(
        (a) => hIds.includes(a.horarioId) && a.status !== "cancelado",
      ).length,
    };
  });

  const COLORS = ["#3B69B0", "#93C5FD"];

  // Relatorios for professor's monitors
  const myMonitorIds = new Set(myMons.flatMap((m) => m.monitorIds));
  const myRelatorios = relatorios.filter((r) => myMonitorIds.has(r.monitorId));

  const sidebarItems: SidebarItem[] = [
    {
      id: "dashboard",
      label: "Dashboard Analítico",
      icon: <BarChart2 className="w-4 h-4" />,
    },
    {
      id: "minhas-turmas",
      label: "Minhas Turmas",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "materiais",
      label: "Materiais dos Monitores",
      icon: <Upload className="w-4 h-4" />,
    },
    {
      id: "relatorios",
      label: "Relatórios de Monitores",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "perfil",
      label: "Meu Perfil",
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  return (
    <DashboardLayout
      user={user}
      sidebarItems={sidebarItems}
      activeSection={section}
      onSectionChange={(s) => {
        setSection(s);
        setDetailTurma(null);
        setFreqSession(null);
        setFreqSearch("");
        setFreqDateFilter("");
      }}
      onLogout={onLogout}
      title={
        detailTurma
          ? `Turma: ${detailTurma.nomeDisciplina}`
          : section === "dashboard"
            ? "Dashboard Analítico"
            : section === "minhas-turmas"
              ? "Minhas Turmas"
              : section === "materiais"
                ? "Materiais dos Monitores"
                : section === "perfil"
                  ? "Meu Perfil"
                  : "Relatórios de Monitores"
      }
    >
      {section === "dashboard" && !detailTurma && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">Filtrar:</span>
            <select
              value={filterTurma}
              onChange={(e) => setFilterTurma(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 bg-white text-slate-800"
            >
              <option value="all">Todas as turmas</option>
              {myTurmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nomeDisciplina} – {t.codigo}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Turmas",
                value: myTurmas.length,
                icon: <BookOpen className="w-4 h-4" />,
                cls: "text-[#3B69B0]",
                bg: PAGE_BG,
              },
              {
                label: "Monitores",
                value: [...new Set(myMons.flatMap((m) => m.monitorIds))].length,
                icon: <Users className="w-4 h-4" />,
                cls: "text-indigo-600",
                bg: "#EEF0FF",
              },
              {
                label: "Atendimentos",
                value: totalAtend,
                icon: <Calendar className="w-4 h-4" />,
                cls: "text-sky-600",
                bg: "#EFF8FF",
              },
              {
                label: "Taxa Presença",
                value:
                  relevantChamadas.length > 0
                    ? `${Math.round((presentes / relevantChamadas.length) * 100)}%`
                    : "—",
                icon: <UserCheck className="w-4 h-4" />,
                cls: "text-emerald-600",
                bg: "#F0FDF4",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${c.cls}`}
                  style={{ backgroundColor: c.bg }}
                >
                  {c.icon}
                </div>
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                Assiduidade dos Monitores
              </h3>
              {relevantChamadas.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Sem dados de chamada</p>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                Atendimentos por Disciplina
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 5, right: 5, left: -22, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F1F5F9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="disc"
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #E2E8F0",
                      }}
                    />
                    <Bar
                      dataKey="atend"
                      fill="#3B69B0"
                      radius={[5, 5, 0, 0]}
                      name="Atendimentos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Monitores sob sua orientação
            </h3>
            {relevantMons.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Nenhuma monitoria ativa
              </p>
            ) : (
              <div className="space-y-2.5">
                {relevantMons
                  .flatMap((m) =>
                    m.monitorIds.map((mid) => ({
                      m,
                      monitor: users.find((u) => u.id === mid),
                    })),
                  )
                  .filter(({ monitor }) => !!monitor)
                  .map(({ m, monitor }) => {
                    const mTurmas = turmas.filter((t) =>
                      m.turmaIds.includes(t.id),
                    );
                    const mHors = horarios.filter(
                      (h) =>
                        h.monitorId === monitor!.id && h.monitoriaId === m.id,
                    );
                    const mCham = chamadas.filter((c) =>
                      mHors.map((h) => h.id).includes(c.horarioId),
                    );
                    const taxa =
                      mCham.length > 0
                        ? Math.round(
                            (mCham.filter((c) => c.presente).length /
                              mCham.length) *
                              100,
                          )
                        : null;
                    return (
                      <div
                        key={`${m.id}-${monitor!.id}`}
                        className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100"
                      >
                        <Avatar name={monitor!.name} size="md" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {monitor!.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {mTurmas.map((t) => t.nomeDisciplina).join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge s={m.status} />
                          {taxa !== null && (
                            <p className="text-xs text-slate-400 mt-1">
                              {taxa}% presença
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {section === "minhas-turmas" && !detailTurma && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={turmasSearch}
              onChange={(e) => setTurmasSearch(e.target.value)}
              placeholder="Filtrar por nome da disciplina..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40 bg-white text-slate-800 placeholder-slate-400"
            />
          </div>
          {(() => {
            const shown = turmasSearch
              ? myTurmas.filter(
                  (t) =>
                    t.nomeDisciplina
                      .toLowerCase()
                      .includes(turmasSearch.toLowerCase()) ||
                    t.codigo.toLowerCase().includes(turmasSearch.toLowerCase()),
                )
              : myTurmas;
            if (shown.length === 0)
              return (
                <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma turma encontrada</p>
                </div>
              );
            return shown.map((t) => {
              const tMons = monitorias.filter((m) => m.turmaIds.includes(t.id));
              const tMonitors = [...new Set(tMons.flatMap((m) => m.monitorIds))]
                .map((id) => users.find((u) => u.id === id))
                .filter(Boolean) as User[];
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-[#3B69B0]/40 transition-all"
                  onClick={() => setDetailTurma(t)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3
                        className="font-semibold text-slate-800"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {t.nomeDisciplina}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {t.codigo} · {t.horario}
                      </p>
                    </div>
                    <StatusBadge s={t.status} />
                  </div>
                  {tMonitors.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {tMonitors.slice(0, 3).map((m) => (
                        <Avatar key={m.id} name={m.name} size="sm" />
                      ))}
                      <span className="text-xs text-slate-500">
                        {tMonitors.map((m) => m.name).join(", ")}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Sem monitoria vinculada
                    </p>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {section === "minhas-turmas" && detailTurma && (
        <div>
          <button
            onClick={() => setDetailTurma(null)}
            className="flex items-center gap-2 text-sm mb-5 hover:underline"
            style={{ color: PRIMARY_BG }}
          >
            ← Voltar para Minhas Turmas
          </button>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3
                  className="font-bold text-slate-800 text-lg"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {detailTurma.nomeDisciplina}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {detailTurma.codigo}
                </p>
              </div>
              <StatusBadge s={detailTurma.status} />
            </div>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              {detailTurma.horario}
            </p>
          </div>
          {monitorias
            .filter((m) => m.turmaIds.includes(detailTurma.id))
            .map((mon) => {
              const mMonitors = mon.monitorIds
                .map((id) => users.find((u) => u.id === id))
                .filter(Boolean) as User[];
              return (
                <div
                  key={mon.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Monitoria — Semestre {mon.semestre}
                    </p>
                    <StatusBadge s={mon.status} />
                  </div>
                  {/* Separate section per monitor */}
                  {mMonitors.map((monUser) => {
                    const mHors = horarios.filter(
                      (h) =>
                        h.monitoriaId === mon.id && h.monitorId === monUser.id,
                    );
                    const mHIds = new Set(mHors.map((h) => h.id));
                    const mAgend = agendamentos.filter(
                      (a) => mHIds.has(a.horarioId) && a.status !== "cancelado",
                    );
                    const mCham = chamadas.filter((c) =>
                      mHIds.has(c.horarioId),
                    );
                    const mPres = mCham.filter((c) => c.presente).length;
                    return (
                      <div
                        key={monUser.id}
                        className="mb-5 border border-slate-100 rounded-xl p-4 bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar name={monUser.name} size="md" />
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {monUser.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              Mat: {monUser.matricula}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[
                            { label: "Atendimentos", value: mAgend.length },
                            { label: "Presenças", value: mPres },
                            {
                              label: "Taxa presença",
                              value:
                                mCham.length > 0
                                  ? `${Math.round((mPres / mCham.length) * 100)}%`
                                  : "—",
                            },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className="bg-white rounded-xl p-2.5 text-center border border-slate-100"
                            >
                              <p className="text-lg font-bold text-slate-800">
                                {s.value}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {s.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        {/* Horários de Plantão - improved layout */}
                        {mHors.length > 0 && (
                          <div className="mb-5">
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                              Horários de Plantão
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {[...mHors]
                                .sort((a, b) => b.data.localeCompare(a.data))
                                .map((h) => {
                                  const hMonitor = mMonitors.find(
                                    (u) => u.id === h.monitorId,
                                  );
                                  const hAgendCount = agendamentos.filter(
                                    (a) =>
                                      a.horarioId === h.id &&
                                      a.status !== "cancelado",
                                  ).length;
                                  const livre = vagasLivres(h, agendamentos);
                                  return (
                                    <div
                                      key={h.id}
                                      className="border border-slate-100 rounded-xl p-3 bg-slate-50"
                                    >
                                      <div className="flex items-start justify-between mb-1.5">
                                        <div>
                                          <p className="text-xs font-semibold text-slate-800">
                                            {formatDate(h.data)}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {h.horaInicio}–{h.horaFim}
                                          </p>
                                        </div>
                                        <span
                                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${livre > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                                        >
                                          {livre}/{h.vagas} vagas
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        {h.modalidade === "online" ? (
                                          <Link2
                                            className="w-3 h-3 flex-shrink-0"
                                            style={{ color: PRIMARY_BG }}
                                          />
                                        ) : (
                                          <MapPin
                                            className="w-3 h-3 flex-shrink-0"
                                            style={{ color: PRIMARY_BG }}
                                          />
                                        )}
                                        <span className="truncate">
                                          {h.modalidade === "online"
                                            ? h.linkOnline || "Online"
                                            : `${h.sala} – ${h.bloco}`}
                                        </span>
                                      </div>
                                      {hMonitor && (
                                        <p className="text-xs text-slate-400 mt-1">
                                          Monitor: {hMonitor.name} ·{" "}
                                          {hAgendCount} agendamento(s)
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                        {/* Frequência - redesigned with clickable sessions */}
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                            Frequência por Atendimento
                          </p>
                          {(() => {
                            const sessionKey = `${mon.id}`;
                            const activeSess = freqSession?.horarioId
                              ? mHors.find(
                                  (h) =>
                                    h.id === freqSession.horarioId &&
                                    h.data === freqSession.date,
                                )
                              : null;
                            if (activeSess) {
                              const sessAgend = agendamentos.filter(
                                (a) =>
                                  a.horarioId === activeSess.id &&
                                  a.data === activeSess.data,
                              );
                              const sessCham = chamadas.filter(
                                (c) =>
                                  c.horarioId === activeSess.id &&
                                  c.data === activeSess.data,
                              );
                              // Combine agendados + anyone with chamada record (in case they showed without booking)
                              const allAlunoIds = [
                                ...new Set([
                                  ...sessAgend.map((a) => a.alunoId),
                                  ...sessCham.map((c) => c.alunoId),
                                ]),
                              ];
                              const searchLow = freqSearch.toLowerCase();
                              const filteredAlunoIds = allAlunoIds.filter(
                                (aid) => {
                                  const aluno = users.find((u) => u.id === aid);
                                  return (
                                    !freqSearch ||
                                    aluno?.name
                                      .toLowerCase()
                                      .includes(searchLow) ||
                                    aluno?.matricula?.includes(freqSearch)
                                  );
                                },
                              );
                              return (
                                <div>
                                  <button
                                    onClick={() => {
                                      setFreqSession(null);
                                      setFreqSearch("");
                                    }}
                                    className="flex items-center gap-1.5 text-xs mb-3 hover:underline"
                                    style={{ color: PRIMARY_BG }}
                                  >
                                    ← Voltar à lista de atendimentos
                                  </button>
                                  <div className="bg-white rounded-xl border border-slate-200 p-3 mb-3">
                                    <p className="text-sm font-semibold text-slate-800">
                                      {formatDate(activeSess.data)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {activeSess.horaInicio}–
                                      {activeSess.horaFim} ·{" "}
                                      {
                                        sessCham.filter((c) => c.presente)
                                          .length
                                      }{" "}
                                      presentes de {allAlunoIds.length}{" "}
                                      inscritos
                                    </p>
                                  </div>
                                  <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                      value={freqSearch}
                                      onChange={(e) =>
                                        setFreqSearch(e.target.value)
                                      }
                                      placeholder="Buscar por nome ou matrícula..."
                                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
                                    />
                                  </div>
                                  {filteredAlunoIds.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">
                                      Nenhum aluno encontrado
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {filteredAlunoIds.map((aid) => {
                                        const aluno = users.find(
                                          (u) => u.id === aid,
                                        );
                                        const cham = sessCham.find(
                                          (c) => c.alunoId === aid,
                                        );
                                        const ag = sessAgend.find(
                                          (a) => a.alunoId === aid,
                                        );
                                        return (
                                          <div
                                            key={aid}
                                            className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                                          >
                                            <Avatar
                                              name={aluno?.name || "?"}
                                              size="sm"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium text-slate-800 truncate">
                                                {aluno?.name}
                                              </p>
                                              <p className="text-xs text-slate-400">
                                                Mat: {aluno?.matricula}
                                              </p>
                                              {ag?.duvidaPrincipal && (
                                                <p className="text-xs text-slate-500 italic truncate">
                                                  "{ag.duvidaPrincipal}"
                                                </p>
                                              )}
                                            </div>
                                            <span
                                              className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cham?.presente ? "bg-emerald-100 text-emerald-700" : ag?.status === "cancelado" ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-700"}`}
                                            >
                                              {cham?.presente
                                                ? "Presente"
                                                : ag?.status === "cancelado"
                                                  ? "Cancelado"
                                                  : "Ausente"}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            // List of sessions
                            const allSessions = [...mHors]
                              .sort((a, b) => b.data.localeCompare(a.data))
                              .filter(
                                (h) =>
                                  !freqDateFilter || h.data === freqDateFilter,
                              );
                            return (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <input
                                    type="date"
                                    value={freqDateFilter}
                                    onChange={(e) =>
                                      setFreqDateFilter(e.target.value)
                                    }
                                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
                                  />
                                  {freqDateFilter && (
                                    <button
                                      onClick={() => setFreqDateFilter("")}
                                      className="text-xs text-slate-400 hover:text-slate-600"
                                    >
                                      Limpar
                                    </button>
                                  )}
                                </div>
                                {allSessions.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-2">
                                    Nenhum atendimento registrado
                                  </p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {allSessions.map((h) => {
                                      const hAgend = agendamentos.filter(
                                        (a) =>
                                          a.horarioId === h.id &&
                                          a.data === h.data &&
                                          a.status !== "cancelado",
                                      );
                                      const hCham = chamadas.filter(
                                        (c) =>
                                          c.horarioId === h.id &&
                                          c.data === h.data,
                                      );
                                      const pres = hCham.filter(
                                        (c) => c.presente,
                                      ).length;
                                      return (
                                        <button
                                          key={h.id}
                                          onClick={() => {
                                            setFreqSession({
                                              horarioId: h.id,
                                              date: h.data,
                                            });
                                            setFreqSearch("");
                                          }}
                                          className="w-full text-left border border-slate-200 rounded-xl p-3 bg-white hover:border-[#3B69B0]/50 hover:bg-blue-50/30 transition-all flex items-center gap-3"
                                        >
                                          <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: PAGE_BG }}
                                          >
                                            <Calendar
                                              className="w-4 h-4"
                                              style={{ color: PRIMARY_BG }}
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">
                                              {formatDate(h.data)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              {h.horaInicio}–{h.horaFim} ·{" "}
                                              {hAgend.length} aluno(s)
                                            </p>
                                          </div>
                                          <span
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${hCham.length > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                                          >
                                            {hCham.length > 0
                                              ? `${pres}/${hCham.length} pres.`
                                              : "Sem chamada"}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}

      {section === "materiais" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              value={matTurmaFilter}
              onChange={(e) => setMatTurmaFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
            >
              <option value="all">Todas as disciplinas</option>
              {myTurmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nomeDisciplina}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={matDateFilter}
              onChange={(e) => setMatDateFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
            />
            {matDateFilter && (
              <button
                onClick={() => setMatDateFilter("")}
                className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2 py-1.5 rounded-lg bg-white transition"
              >
                Limpar data
              </button>
            )}
          </div>
          {(() => {
            const myMonitorIds2 = new Set(myMons.flatMap((m) => m.monitorIds));
            const myMonitoriaIds = new Set(myMons.map((m) => m.id));
            const filtered = materiais
              .filter((mat) => {
                if (
                  !myMonitorIds2.has(mat.monitorId) &&
                  !myMonitoriaIds.has(mat.monitoriaId)
                )
                  return false;
                if (matTurmaFilter !== "all") {
                  const mon = monitorias.find((m) => m.id === mat.monitoriaId);
                  if (!mon?.turmaIds.includes(matTurmaFilter)) return false;
                }
                if (matDateFilter && mat.uploadedAt !== matDateFilter)
                  return false;
                return true;
              })
              .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
            return filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <Upload className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum material encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((mat) => {
                  const mon = monitorias.find((m) => m.id === mat.monitoriaId);
                  const t0 = turmas.find((t) => mon?.turmaIds[0] === t.id);
                  const monitor = users.find((u) => u.id === mat.monitorId);
                  const hRef = horarios.find((h) => h.id === mat.horarioId);
                  return (
                    <div
                      key={mat.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: PAGE_BG }}
                      >
                        <FileText
                          className="w-4 h-4"
                          style={{ color: PRIMARY_BG }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">
                          {mat.titulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {mat.descricao}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500">
                            {mat.filename}
                          </span>
                          {t0 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: PAGE_BG,
                                color: SIDEBAR_BG,
                              }}
                            >
                              {t0.nomeDisciplina}
                            </span>
                          )}
                          {monitor && (
                            <span className="text-xs text-slate-400">
                              Monitor: {monitor.name}
                            </span>
                          )}
                          {hRef && (
                            <span className="text-xs text-slate-400">
                              {formatDate(hRef.data)}
                            </span>
                          )}
                          <span className="text-xs text-slate-300">
                            {fmtDate(mat.uploadedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadMaterial(mat)}
                        title="Download"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {section === "relatorios" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="date"
              value={relDateFilter}
              onChange={(e) => setRelDateFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B69B0]/40"
            />
            {relDateFilter && (
              <button
                onClick={() => setRelDateFilter("")}
                className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2 py-1.5 rounded-lg bg-white transition"
              >
                Limpar data
              </button>
            )}
          </div>
          {(() => {
            const filtered = myRelatorios
              .filter((r) => !relDateFilter || r.uploadedAt === relDateFilter)
              .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
            return filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum relatório encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((rel) => {
                  const mon = monitorias.find((m) => m.id === rel.monitoriaId);
                  const t0 = turmas.find((t) => mon?.turmaIds[0] === t.id);
                  const monitor = users.find((u) => u.id === rel.monitorId);
                  return (
                    <div
                      key={rel.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: PAGE_BG }}
                      >
                        <FileText
                          className="w-4 h-4"
                          style={{ color: PRIMARY_BG }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">
                          {rel.titulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rel.descricao}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500">
                            {rel.filename}
                          </span>
                          {t0 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: PAGE_BG,
                                color: SIDEBAR_BG,
                              }}
                            >
                              {t0.nomeDisciplina}
                            </span>
                          )}
                          {monitor && (
                            <span className="text-xs text-slate-400">
                              Monitor: {monitor.name}
                            </span>
                          )}
                          <span className="text-xs text-slate-300">
                            {fmtDate(rel.uploadedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadRelatorio(rel)}
                        title="Download"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {section === "perfil" && (
        <ProfileSection
          user={user}
          users={users}
          onUpdateUsers={onUpdateUsers}
          onUpdateCurrentUser={onUpdateCurrentUser}
        />
      )}
    </DashboardLayout>
  );
}

// ─── ProfileSection ───────────────────────────────────────────────────────────

function ProfileSection({
  user,
  users,
  onUpdateUsers,
  onUpdateCurrentUser,
}: {
  user: User;
  users: User[];
  onUpdateUsers: (u: User[]) => void;
  onUpdateCurrentUser: (u: User) => void;
}) {
  const [editModal, setEditModal] = useState(false);
  const [passModal, setPassModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    matricula: "",
  });
  const [editPass, setEditPass] = useState("");
  const [editErrs, setEditErrs] = useState<Record<string, string>>({});
  const [passForm, setPassForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [passErrs, setPassErrs] = useState<Record<string, string>>({});
  const [showEP, setShowEP] = useState(false);
  const [showNP, setShowNP] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [saved, setSaved] = useState(false);

  const isStudent = user.role === "student" || user.role === "monitor";
  const emailDomain = isStudent ? "@alunos.ufersa.edu.br" : "@ufersa.edu.br";
  const matLen = isStudent ? 10 : 8;

  const openEdit = () => {
    const parts = user.name.split(" ");
    setEditForm({
      nome: parts[0] || "",
      sobrenome: parts.slice(1).join(" ") || "",
      email: user.email,
      matricula: user.matricula || user.siape || "",
    });
    setEditPass("");
    setEditErrs({});
    setEditModal(true);
  };

  const saveEdit = () => {
    const e: Record<string, string> = {};
    if (
      !editForm.nome.trim() ||
      !/^[a-zA-ZÀ-ÿ\s]{2,}$/.test(editForm.nome.trim())
    )
      e.nome = "Apenas letras (mín. 2 caracteres).";
    if (
      !editForm.sobrenome.trim() ||
      !/^[a-zA-ZÀ-ÿ\s]{2,}$/.test(editForm.sobrenome.trim())
    )
      e.sobrenome = "Apenas letras (mín. 2 caracteres).";
    if (!editForm.email.endsWith(emailDomain))
      e.email = `E-mail deve ser do domínio ${emailDomain}`;
    if (
      editForm.email !== user.email &&
      users.some((u) => u.email === editForm.email)
    )
      e.email = "E-mail já cadastrado.";
    if (
      !/^\d+$/.test(editForm.matricula) ||
      editForm.matricula.length !== matLen
    )
      e.matricula = `Matrícula deve ter exatamente ${matLen} dígitos.`;
    if (
      editForm.matricula !== (user.matricula || user.siape) &&
      users.some(
        (u) =>
          u.id !== user.id &&
          (u.matricula === editForm.matricula ||
            u.siape === editForm.matricula),
      )
    )
      e.matricula = "Matrícula já cadastrada.";
    if (!editPass) e.pass = "Confirme com sua senha atual.";
    else if (editPass !== user.password) e.pass = "Senha incorreta.";
    if (Object.keys(e).length) {
      setEditErrs(e);
      return;
    }
    const newName = `${editForm.nome.trim()} ${editForm.sobrenome.trim()}`;
    const updated: User = {
      ...user,
      name: newName,
      email: editForm.email,
      matricula: isStudent ? editForm.matricula : user.matricula,
      siape: !isStudent ? editForm.matricula : user.siape,
    };
    onUpdateUsers(users.map((u) => (u.id === user.id ? updated : u)));
    onUpdateCurrentUser(updated);
    setEditModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const pwOk = (p: string) =>
    p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);

  const savePass = () => {
    const e: Record<string, string> = {};
    if (passForm.current !== user.password)
      e.current = "Senha atual incorreta.";
    if (!pwOk(passForm.newPass))
      e.newPass = "Mín. 8 caracteres, letras e números.";
    if (passForm.newPass === passForm.current)
      e.newPass = "Nova senha não pode ser igual à atual.";
    if (passForm.newPass !== passForm.confirm)
      e.confirm = "As senhas não coincidem.";
    if (Object.keys(e).length) {
      setPassErrs(e);
      return;
    }
    const updated = { ...user, password: passForm.newPass };
    onUpdateUsers(users.map((u) => (u.id === user.id ? updated : u)));
    onUpdateCurrentUser(updated);
    setPassModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const roleLabel = {
    admin: "Administrador",
    professor: "Professor",
    monitor: "Monitor",
    student: "Aluno",
  }[user.role];
  const nameParts = user.name.split(" ");

  const pwChecks = (p: string) => [
    { ok: p.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /[a-zA-Z]/.test(p), label: "Contém letras" },
    { ok: /\d/.test(p), label: "Contém números" },
  ];

  return (
    <div className="max-w-lg">
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Dados salvos!
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: PRIMARY_BG }}
          >
            {initials(user.name)}
          </div>
          <div>
            <h2
              className="text-lg font-bold text-slate-800"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {user.name}
            </h2>
            <p className="text-sm text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: "Nome", value: nameParts[0] },
            { label: "Sobrenome", value: nameParts.slice(1).join(" ") || "—" },
            { label: "E-mail", value: user.email },
            {
              label: isStudent ? "Matrícula" : "Mat./SIAPE",
              value: user.matricula || user.siape || "—",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none"
            >
              <span className="text-slate-500 text-xs">{label}</span>
              <span className="text-slate-800 font-medium text-xs">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={openEdit}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition bg-white"
        >
          <Edit2 className="w-4 h-4" />
          Editar Perfil
        </button>
        <button
          onClick={() => {
            setPassForm({ current: "", newPass: "", confirm: "" });
            setPassErrs({});
            setPassModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ backgroundColor: PRIMARY_BG }}
        >
          <Shield className="w-4 h-4" />
          Alterar Senha
        </button>
      </div>

      {editModal && (
        <Modal
          title="Editar Perfil"
          onClose={() => setEditModal(false)}
          footer={
            <>
              <CancelBtn onClick={() => setEditModal(false)} />
              <PrimaryBtn onClick={saveEdit} label="Salvar alterações" />
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" error={editErrs.nome}>
              <input
                value={editForm.nome}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, nome: e.target.value }))
                }
                placeholder="João"
                className={inputCls(!!editErrs.nome)}
              />
            </FormField>
            <FormField label="Sobrenome" error={editErrs.sobrenome}>
              <input
                value={editForm.sobrenome}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, sobrenome: e.target.value }))
                }
                placeholder="Silva"
                className={inputCls(!!editErrs.sobrenome)}
              />
            </FormField>
          </div>
          <FormField label="E-mail Institucional" error={editErrs.email}>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder={`seunome${emailDomain}`}
              className={inputCls(!!editErrs.email)}
            />
          </FormField>
          <FormField
            label={isStudent ? "Matrícula" : "Matrícula / SIAPE"}
            error={editErrs.matricula}
          >
            <input
              value={editForm.matricula}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  matricula: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder={isStudent ? "10 dígitos" : "8 dígitos"}
              maxLength={matLen}
              className={inputCls(!!editErrs.matricula)}
            />
          </FormField>
          <FormField label="Confirmar com senha atual" error={editErrs.pass}>
            <div className="relative">
              <input
                type={showEP ? "text" : "password"}
                value={editPass}
                onChange={(e) => setEditPass(e.target.value)}
                placeholder="Sua senha atual"
                className={`${inputCls(!!editErrs.pass)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowEP((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showEP ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </FormField>
        </Modal>
      )}

      {passModal && (
        <Modal
          title="Alterar Senha"
          onClose={() => setPassModal(false)}
          footer={
            <>
              <CancelBtn onClick={() => setPassModal(false)} />
              <PrimaryBtn onClick={savePass} label="Salvar nova senha" />
            </>
          }
        >
          <FormField label="Senha atual" error={passErrs.current}>
            <div className="relative">
              <input
                type={showCP ? "text" : "password"}
                value={passForm.current}
                onChange={(e) =>
                  setPassForm((f) => ({ ...f, current: e.target.value }))
                }
                placeholder="Sua senha atual"
                className={`${inputCls(!!passErrs.current)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowCP((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showCP ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </FormField>
          <FormField label="Nova senha" error={passErrs.newPass}>
            <div className="relative">
              <input
                type={showNP ? "text" : "password"}
                value={passForm.newPass}
                onChange={(e) =>
                  setPassForm((f) => ({ ...f, newPass: e.target.value }))
                }
                placeholder="Nova senha"
                className={`${inputCls(!!passErrs.newPass)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowNP((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showNP ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              {pwChecks(passForm.newPass).map(({ ok, label }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 text-xs transition ${ok ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />
                  )}
                  {label}
                </div>
              ))}
            </div>
          </FormField>
          <FormField label="Confirmar nova senha" error={passErrs.confirm}>
            <input
              type="password"
              value={passForm.confirm}
              onChange={(e) =>
                setPassForm((f) => ({ ...f, confirm: e.target.value }))
              }
              placeholder="Repita a nova senha"
              className={inputCls(!!passErrs.confirm)}
            />
          </FormField>
        </Modal>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [monitorMode, setMonitorMode] = useState<"monitor" | "student">("monitor");

  // 1. ESTADOS DO SISTEMA (Arrays que alimentam a sua interface)
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [monitorias, setMonitorias] = useState<Monitoria[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);

 // 2. INTEGRAÇÃO REAL COM O POSTGRESQL (Node.js) 
useEffect(() => {
    // Buscar plantões
    fetch('http://localhost:3001/api/plantoes')
        .then(resposta => resposta.json())
        .then(dados => { /* ... sua lógica de plantões ... */ });

    // BUSCAR USUÁRIOS DO BANCO
    fetch('http://localhost:3001/api/usuarios')
        .then(resposta => resposta.json())
        .then(dadosUsuarios => {
            setUsers(dadosUsuarios); // Atualiza a lista com o que vem do Postgres
        })
        .catch(erro => console.warn("Erro ao buscar usuários:", erro));
}, []);

  const addNotif = (n: Omit<Notif, "id" | "at" | "read">) =>
    setNotifs((p) => [
      ...p,
      { ...n, id: nid(), at: new Date().toISOString(), read: false },
    ]);
  const markNotifRead = (id: string) =>
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const handleLogin = (u: User) => {
    setCurrentUser(u);
    setMonitorMode("monitor");
  };
  const handleLogout = () => {
    setCurrentUser(null);
    setScreen("login");
  };

  const handleUpdateMonitorias = (newMons: Monitoria[]) => {
    const allMonitorIds = new Set(newMons.flatMap((m) => m.monitorIds));
    const updatedUsers = users.map((u) => {
      if (u.role === "student" && allMonitorIds.has(u.id))
        return { ...u, role: "monitor" as Role };
      if (u.role === "monitor" && !u.siape && !allMonitorIds.has(u.id))
        return { ...u, role: "student" as Role };
      return u;
    });
    setMonitorias(newMons);
    setUsers(updatedUsers);
    if (currentUser) {
      const updatedSelf = updatedUsers.find((u) => u.id === currentUser.id);
      if (updatedSelf && updatedSelf.role !== currentUser.role)
        setCurrentUser(updatedSelf);
    }
  };

  if (!currentUser) {
    if (screen === "register") {
      return (
        <RegisterPage
          users={users}
          onRegister={(u) => setUsers((p) => [...p, u])}
          onGoLogin={() => setScreen("login")}
        />
      );
    }
    return (
      <LoginPage
        users={users}
        onLogin={handleLogin}
        onGoRegister={() => setScreen("register")}
      />
    );
  }

  const commonProps = {
    users,
    turmas,
    monitorias,
    horarios,
    agendamentos,
    chamadas,
  };
  const userNotifs = notifs.filter((n) => n.toUserId === currentUser.id);
  const updateCurrentUser = (u: User) => setCurrentUser(u);

  if (currentUser.role === "monitor" && monitorMode === "student") {
    return (
      <StudentDashboard
        user={currentUser}
        {...commonProps}
        materiais={materiais}
        onUpdateAgendamentos={setAgendamentos}
        onUpdateUsers={setUsers}
        onUpdateCurrentUser={updateCurrentUser}
        onLogout={handleLogout}
        notifs={userNotifs}
        onNotifRead={markNotifRead}
        extraSidebarButton={
          <button
            onClick={() => setMonitorMode("monitor")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/10 transition"
          >
            <ArrowLeftRight className="w-4 h-4" /> Visão de Monitor
          </button>
        }
      />
    );
  }

  if (currentUser.role === "admin")
    return (
      <AdminDashboard
        user={currentUser}
        users={users}
        turmas={turmas}
        monitorias={monitorias}
        onUpdateUsers={setUsers}
        onUpdateTurmas={setTurmas}
        onUpdateMonitorias={handleUpdateMonitorias}
        onLogout={handleLogout}
      />
    );
  const studentIsAlsoMonitor = monitorias.some((m) =>
    m.monitorIds.includes(currentUser.id),
  );
  if (currentUser.role === "student")
    return (
      <StudentDashboard
        user={currentUser}
        {...commonProps}
        materiais={materiais}
        onUpdateAgendamentos={setAgendamentos}
        onUpdateUsers={setUsers}
        onUpdateCurrentUser={updateCurrentUser}
        onLogout={handleLogout}
        notifs={userNotifs}
        onNotifRead={markNotifRead}
        extraSidebarButton={
          studentIsAlsoMonitor ? (
            <button
              onClick={() => {
                setCurrentUser((u) => (u ? { ...u, role: "monitor" } : u));
                setMonitorMode("monitor");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/10 transition"
            >
              <ArrowLeftRight className="w-4 h-4" /> Visão de Monitor
            </button>
          ) : undefined
        }
      />
    );
  if (currentUser.role === "monitor")
    return (
      <MonitorDashboard
        user={currentUser}
        {...commonProps}
        materiais={materiais}
        relatorios={relatorios}
        onUpdateHorarios={setHorarios}
        onUpdateAgendamentos={setAgendamentos}
        onUpdateChamadas={setChamadas}
        onUpdateMateriais={setMateriais}
        onUpdateRelatorios={setRelatorios}
        onUpdateUsers={setUsers}
        onUpdateCurrentUser={updateCurrentUser}
        onAddNotif={addNotif}
        onLogout={handleLogout}
        onSwitchToStudent={() => setMonitorMode("student")}
      />
    );
  if (currentUser.role === "professor")
    return (
      <ProfessorDashboard
        user={currentUser}
        {...commonProps}
        materiais={materiais}
        relatorios={relatorios}
        onUpdateUsers={setUsers}
        onUpdateCurrentUser={updateCurrentUser}
        onLogout={handleLogout}
      />
    );
  return null;
}