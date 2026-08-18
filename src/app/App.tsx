import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowRight,
  MapPin,
  Globe,
  ChevronDown,
  Menu,
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Upload,
  Calendar,
  Users,
  Wallet,
  AlertTriangle,
  Clock,
  Building2,
  CreditCard,
  Sparkles,
  UserCircle,
  ArrowLeftRight,
  Settings,
  Link as LinkIcon,
  FileText,
  LayoutDashboard,
  CalendarDays,
  Send,
  BadgeCheck,
  Stamp,
  Download,
  Copy,
  Inbox,
  Phone,
  Mail,
  Search,
  MessageSquare,
  HandCoins,
  Lock,
  Package,
  Receipt,
  Video,
  Activity,
  Smile,
  ClipboardCheck,
  FileSignature,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

import { createClient } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";

// Fase 29 — logo oficial (fornecida pelo usuário), duas variantes já
// recortadas/com fundo transparente: a verde (`logo-mark`) pra fundos claros
// (cards de login, nav do site) e a clara (`logo-mark-light`) pra fundos na
// cor primária (sidebars dos painéis internos), onde a versão verde ficaria
// com contraste baixo demais contra o próprio verde de fundo.
import logoMark from "../assets/logo-mark.png";
import logoMarkLight from "../assets/logo-mark-light.png";

function BrandMark({
  size = 16,
  light = false,
  className = "",
}: {
  size?: number;
  light?: boolean;
  className?: string;
}) {
  return (
    <img
      src={light ? logoMarkLight : logoMark}
      alt=""
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

const SUPABASE_URL = "https://iicsmwkqjuasbsgehrce.supabase.co";
const API = `${SUPABASE_URL}/functions/v1/make-server-a65fd448`;
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_mcwLWzbq2k4ESakccGLUFw_4QyLhcTt";

// Real Supabase Auth (Fase 1) — replaces the old shared-PIN admin gate.
// Session is kept by the supabase-js client itself (secure, standard
// practice for a real app — not an in-browser demo/artifact).
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

type UserRole = "admin" | "psychologist" | "secretary" | "patient";

interface AppUser {
  id: string;
  email: string | null;
  role: UserRole;
  clinicId: string | null;
  // Fase 19 — id do profissional dono da clínica, só preenchido pra
  // secretária (que cadastra pacientes/consultas em nome dele — hoje toda
  // clínica tem exatamente 1 profissional).
  clinicProfessionalId: string | null;
  // Fase 17 — troca de perfil sem logout: papéis que esta conta tem
  // direito de assumir (sempre inclui `role`, o papel ativo agora).
  availableRoles: UserRole[];
  fullName: string | null;
  photoUrl: string | null;
}

// ─── Language switcher ────────────────────────────────────────────────────────
// Dropdown used both on the public site and inside the admin area. Changing
// the language updates i18next immediately; the browser-languagedetector
// plugin (see src/i18n) persists the choice so it's remembered next visit.
function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();

  return (
    <label className="sr-only-label">
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={i18n.resolvedLanguage ?? i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        aria-label={t("language.label")}
        className={
          compact
            ? "bg-transparent text-xs border border-current/30 rounded-full pl-2 pr-1 py-1 outline-none focus:ring-2 focus:ring-current/30 cursor-pointer"
            : "flex items-center gap-1 text-muted-foreground text-xs border border-border rounded-full pl-2.5 pr-1.5 py-1 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer bg-transparent transition-colors"
        }
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

// ─── Menu do usuário (Fase 17 — troca de perfil sem logout) ────────────────
// Substitui o antigo cluster solto de botões ("Ver site" / "Sair") nos
// cabeçalhos do Painel Admin, do Painel do Profissional e da Área do
// Paciente por um único menu consistente: nome, foto, papel ativo,
// alternar perfil (só aparece quando a conta tem mais de um papel — Ponto
// 1 do pedido), configurações (quando a tela chamadora tiver uma) e sair.
// `dark` ajusta a cor do botão-gatilho pro fundo escuro dos cabeçalhos
// (`bg-primary`); o painel do dropdown em si é sempre claro, como qualquer
// popover — não depende de onde é aberto.
function UserMenu({
  user,
  onLogout,
  onSwitchRole,
  onOpenSettings,
  dark = true,
  openUp = false,
}: {
  user: AppUser;
  onLogout: () => void;
  onSwitchRole?: (role: UserRole) => Promise<void>;
  onOpenSettings?: () => void;
  dark?: boolean;
  // Fase 29.1 — nas sidebars novas, este botão fica no rodapé (perto do
  // fim da tela). Abrindo pra baixo como sempre abriu (pensado pra quando
  // ele ficava no topo, dentro do header), o menu nascia fora da área
  // visível e não tinha como rolar até ele. `openUp` abre o menu pra cima
  // a partir do botão em vez de para baixo — usado só nesses rodapés de
  // sidebar; os cabeçalhos (topo da tela) continuam abrindo pra baixo.
  openUp?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<UserRole | null>(null);
  const [switchError, setSwitchError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const initials =
    (user.fullName || user.email || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  const handleSwitch = async (role: UserRole) => {
    if (!onSwitchRole || switching || role === user.role) return;
    setSwitching(role);
    setSwitchError(false);
    try {
      await onSwitchRole(role);
      setOpen(false);
    } catch (err) {
      console.error("Falha ao trocar de perfil:", err);
      setSwitchError(true);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full pl-1.5 pr-2.5 py-1 transition-colors shrink-0 ${dark ? "hover:bg-primary-foreground/10 text-primary-foreground" : "hover:bg-secondary text-foreground border border-border"}`}
      >
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${dark ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/10 text-primary"}`}
        >
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight text-left min-w-0">
          <span className="text-xs font-semibold truncate max-w-[120px]">
            {user.fullName || user.email}
          </span>
          <span
            className={`text-[10px] ${dark ? "text-primary-foreground/60" : "text-muted-foreground"}`}
          >
            {t(`roles.${user.role}`)}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute w-64 bg-card border border-border rounded-xl shadow-xl z-50 py-2 text-foreground max-h-[70vh] overflow-y-auto ${openUp ? "left-0 bottom-full mb-2" : "right-0 top-full mt-2"}`}
        >
          <div className="px-4 py-2 border-b border-border mb-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {user.fullName || t("userMenu.noName")}
            </p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
            <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {t(`roles.${user.role}`)}
            </span>
          </div>

          {user.availableRoles.length > 1 && onSwitchRole && (
            <div className="px-2 py-1 border-b border-border mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("userMenu.switchRole")}
              </p>
              {user.availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleSwitch(role)}
                  disabled={role === user.role || switching !== null}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors disabled:cursor-default ${role === user.role ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary text-foreground"}`}
                >
                  <span className="flex items-center gap-2">
                    <ArrowLeftRight size={13} className="shrink-0" />
                    {t(`roles.${role}`)}
                  </span>
                  {role === user.role ? (
                    <Check size={14} />
                  ) : switching === role ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                </button>
              ))}
              {switchError && (
                <p className="px-2 pt-1 text-xs text-red-500">
                  {t("userMenu.switchError")}
                </p>
              )}
            </div>
          )}

          <div className="px-2">
            {onOpenSettings && (
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left hover:bg-secondary transition-colors text-foreground"
              >
                <Settings size={14} /> {t("userMenu.settings")}
              </button>
            )}
            <div className="flex items-center justify-between px-2 py-2 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Globe size={14} /> {t("language.label")}
              </span>
              <LanguageSwitcher compact />
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left hover:bg-red-50 hover:text-red-600 transition-colors text-foreground"
            >
              <LogOut size={14} /> {t("userMenu.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatCard (Fase 59) ─────────────────────────────────────────────────────
// Cartão de estatística compartilhado por todos os painéis (Visão geral do
// profissional, Área do paciente, Visão geral do admin, Financeiro): ícone
// num quadrado colorido no canto, valor grande em Fraunces, rótulo em
// maiúsculas — a estrutura exata da referência enviada pelo usuário (Figma),
// só trocando as cores fixas do mock pelos tokens que já existem no projeto
// (`--primary`/`--accent`/etc.), sem introduzir nenhuma cor nova.
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: "primary" | "accent" | "danger" | "neutral";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    danger: "bg-red-100 text-red-600",
    neutral: "bg-secondary text-muted-foreground",
  }[tone];
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneClass}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-light text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

// Perfil profissional unificado (Fase 12): representa uma linha real de
// `professionals` (a mesma tabela usada em todo o painel do profissional),
// já mesclada com `profiles.full_name`/`email`/`phone` — não existe mais um
// diretório separado. `name`/`email`/`phone` moram na conta (profiles);
// todo o resto é o perfil público exibido na landing e no painel de admin.
interface ProfessionalProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  title: string;
  location: string;
  flag: string;
  specialties: string[];
  approach: string;
  sessions_info: string;
  photo_url: string;
  years: number;
  rating: number;
  approved: boolean;
  crp: string;
  session_price: number | null;
  // Fase 32 — moeda de cobrança do profissional ("BRL" | "EUR"), escolhida
  // por ele mesmo. `rating` continua no tipo (a coluna ainda existe), mas
  // não é mais exibida em lugar nenhum (ver nota na migração da Fase 32).
  currency: string;
  // Fase 53 — registro e-Psi autodeclarado (Resolução CFP Nº 011/2018),
  // sem validação contra nenhuma API do CFP (nenhuma é acessível
  // publicamente) — é o próprio profissional quem informa e mantém.
  epsi_registration: string;
  created_at: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const isFormData = opts?.body instanceof FormData;

  // Use the logged-in user's session token when there is one (so the
  // backend can identify who's calling and check their role); fall back to
  // the public anon key for unauthenticated/public requests.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;

  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${bearer}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      ...opts?.headers,
    },
  });

  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function fetchCurrentUser(): Promise<AppUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return callMeWithToken(session?.access_token ?? null);
}

// ─── Troca de perfil sem logout (Fase 17) ──────────────────────────────────
// Chama a função `switch_active_role` no banco (valida no servidor que a
// conta realmente tem direito ao papel pedido, não é uma troca só de
// aparência) e então busca o usuário atualizado — mesmo caminho usado em
// todo o app após login, então tudo que já depende de `AppUser` (roteamento,
// permissões, RLS) volta a funcionar automaticamente pro papel novo.
async function switchActiveRole(role: UserRole): Promise<AppUser | null> {
  const { error } = await supabase.rpc("switch_active_role", {
    target_role: role,
  });
  if (error) throw error;
  return fetchCurrentUser();
}

// IMPORTANT: never call supabase.auth.getSession() (or any other
// supabase.auth.* method) from inside an onAuthStateChange callback — the
// auth client is still holding its internal lock at that point and it
// deadlocks silently (no console error, the promise just never resolves).
// This variant takes the access token directly instead, so it's safe to use
// there. See https://github.com/supabase/auth-js/issues/762 (a known
// supabase-js footgun).
async function callMeWithToken(
  accessToken: string | null,
): Promise<AppUser | null> {
  if (!accessToken) return null;
  try {
    const r = await fetch(`${API}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ─── Static content ───────────────────────────────────────────────────────────
// The actual copy for transitions/steps/testimonials/faq/quiz/specialty
// suggestions now lives in src/i18n/locales/*.json and is pulled in with
// useTranslation()'s t(key, { returnObjects: true }) inside the components
// that render them, so it changes with the selected language. Only the flag
// emoji picker stays here — flags aren't translated text.
const FLAGS = ["🇧🇷", "🇪🇸", "🇵🇹", "🇺🇸", "🇩🇪", "🇫🇷", "🇬🇧", "🇮🇹"];

// ─── Admin: Login ─────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      const user = await fetchCurrentUser();
      if (!user) throw new Error(t("login.genericError"));
      onLogin(user);
    } catch (err: any) {
      setError(err?.message || t("login.genericError"));
      setPassword("");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher compact />
      </div>
      <div className="bg-background rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <BrandMark size={20} />
          <span
            className="font-bold text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("login.brand")}
          </span>
        </div>
        <h2
          className="text-2xl font-light mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("login.title")}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {t("login.subtitle")}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder={t("login.emailPlaceholder")}
            autoFocus
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder={t("login.passwordPlaceholder")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={checking}
            className="bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
          >
            {checking ? t("login.submitting") : t("login.submit")}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("login.noAccount")}{" "}
          <a
            href="#cadastro"
            className="text-primary font-semibold hover:underline"
          >
            {t("login.createAccount")}
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Cadastro público de psicólogo (Fase 15) ───────────────────────────────
// Ponto de entrada real de "Criar conta" — antes disso, a única forma de um
// psicólogo ganhar acesso era um admin cadastrar manualmente. A conta já
// nasce com o papel certo (o backend cuida disso, ver `POST
// /signup/psychologist`); aqui só coletamos os dados e, se a pessoa veio da
// página de planos com um plano específico escolhido, aplicamos esse plano
// logo em seguida (reaproveitando a mesma troca self-service da aba
// Configurações → Plano — sem duplicar essa lógica).
function SignupForm({
  initialPlan,
  onSignedUp,
}: {
  initialPlan: PlanTier | null;
  onSignedUp: (user: AppUser) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Fase 35 — aceite obrigatório dos Termos de Uso/Política de Privacidade.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const legalLinkHref = (hash: string) =>
    `${window.location.origin}${window.location.pathname}${hash}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError(t("signup.requiredError"));
      return;
    }
    if (password.length < 8) {
      setError(t("setPassword.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("setPassword.mismatch"));
      return;
    }
    if (!termsAccepted) {
      setError(t("signup.termsRequiredError"));
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/signup/psychologist", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: name.trim(),
          terms_accepted: true,
        }),
      });

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      const user = await fetchCurrentUser();
      if (!user) throw new Error(t("login.genericError"));

      // O plano escolhido só é de fato aplicado na tela de checkout
      // seguinte (Fase 16) — aqui só criamos a conta.
      onSignedUp(user);
    } catch (err: any) {
      let message = err?.message || t("signup.genericError");
      try {
        const parsed = JSON.parse(message);
        if (parsed?.error) message = parsed.error;
      } catch {
        /* fall back to raw message */
      }
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher compact />
      </div>
      <div className="bg-background rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <BrandMark size={20} />
          <span
            className="font-bold text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("login.brand")}
          </span>
        </div>
        <h2
          className="text-2xl font-light mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("signup.title")}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {initialPlan
            ? t("signup.subtitleWithPlan", {
                plan: t(`plans.${initialPlan}.name`),
              })
            : t("signup.subtitle")}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder={t("profileForm.namePlaceholder")}
            autoFocus
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder={t("login.emailPlaceholder")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder={t("login.passwordPlaceholder")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            placeholder={t("settings.security.confirmPasswordLabel")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                setError("");
              }}
              className="mt-0.5 rounded border-border shrink-0"
            />
            <span>
              {t("signup.termsCheckboxPrefix")}{" "}
              <a
                href={legalLinkHref("#termos")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                {t("signup.termsLinkLabel")}
              </a>{" "}
              {t("signup.termsCheckboxAnd")}{" "}
              <a
                href={legalLinkHref("#privacidade")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                {t("signup.privacyLinkLabel")}
              </a>
            </span>
          </label>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
          >
            {submitting ? t("signup.submitting") : t("signup.submit")}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("signup.hasAccount")}{" "}
          <a
            href="#admin"
            className="text-primary font-semibold hover:underline"
          >
            {t("signup.logIn")}
          </a>
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          {t("signup.isSecretary")}{" "}
          <a
            href="#cadastro-secretaria"
            className="text-primary font-semibold hover:underline"
          >
            {t("signup.isSecretaryLink")}
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Cadastro autônomo de secretária por código de convite (Fase 27) ───────
// Antes disso, virar secretária de uma clínica dependia sempre de o
// profissional entrar no sistema e convidar (nome + e-mail, um por vez).
// Aqui a pessoa se cadastra sozinha com o código que a clínica compartilhou
// (`clinics.secretary_invite_code`) — o `initialCode` já vem preenchido
// quando chega por um link do tipo `#cadastro-secretaria?code=XXXXXXXX`,
// que é o que "Copiar link" gera em Configurações → Equipe.
function SecretarySignupForm({
  initialCode,
  onSignedUp,
}: {
  initialCode: string | null;
  onSignedUp: (user: AppUser) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  // Fase 35 — aceite obrigatório dos Termos de Uso/Política de Privacidade.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const legalLinkHref = (hash: string) =>
    `${window.location.origin}${window.location.pathname}${hash}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !code.trim()) {
      setError(t("signupSecretary.requiredError"));
      return;
    }
    if (password.length < 8) {
      setError(t("setPassword.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("setPassword.mismatch"));
      return;
    }
    if (!termsAccepted) {
      setError(t("signup.termsRequiredError"));
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/signup/secretary", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: name.trim(),
          invite_code: code.trim(),
          terms_accepted: true,
        }),
      });

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      const user = await fetchCurrentUser();
      if (!user) throw new Error(t("login.genericError"));

      onSignedUp(user);
    } catch (err: any) {
      let message = err?.message || t("signupSecretary.genericError");
      try {
        const parsed = JSON.parse(message);
        if (parsed?.error) message = parsed.error;
      } catch {
        /* fall back to raw message */
      }
      setError(
        message === "secretary_requires_business_plan"
          ? t("signupSecretary.planRequiredError")
          : message === "Código de convite inválido."
            ? t("signupSecretary.invalidCodeError")
            : message,
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher compact />
      </div>
      <div className="bg-background rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <BrandMark size={20} />
          <span
            className="font-bold text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("login.brand")}
          </span>
        </div>
        <h2
          className="text-2xl font-light mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("signupSecretary.title")}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {t("signupSecretary.subtitle")}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder={t("profileForm.namePlaceholder")}
            autoFocus
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder={t("login.emailPlaceholder")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder={t("login.passwordPlaceholder")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            placeholder={t("settings.security.confirmPasswordLabel")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder={t("signupSecretary.codePlaceholder")}
              className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors tracking-wider font-mono ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("signupSecretary.codeHint")}
            </p>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                setError("");
              }}
              className="mt-0.5 rounded border-border shrink-0"
            />
            <span>
              {t("signup.termsCheckboxPrefix")}{" "}
              <a
                href={legalLinkHref("#termos")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                {t("signup.termsLinkLabel")}
              </a>{" "}
              {t("signup.termsCheckboxAnd")}{" "}
              <a
                href={legalLinkHref("#privacidade")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                {t("signup.privacyLinkLabel")}
              </a>
            </span>
          </label>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
          >
            {submitting ? t("signup.submitting") : t("signupSecretary.submit")}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("signup.hasAccount")}{" "}
          <a
            href="#admin"
            className="text-primary font-semibold hover:underline"
          >
            {t("signup.logIn")}
          </a>
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          {t("signupSecretary.isProfessional")}{" "}
          <a
            href="#cadastro"
            className="text-primary font-semibold hover:underline"
          >
            {t("signupSecretary.isProfessionalLink")}
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Checkout (Fase 16) ─────────────────────────────────────────────────────
// Etapa real do fluxo "Página de planos → Escolher plano → Criar conta →
// Checkout → Assinatura → Área do Psicólogo" (Ponto 12 do pedido) — mas
// SEM fingir um pagamento que não existe. Mostra um resumo de verdade do
// que foi escolhido, avisa com todas as letras que a cobrança automática
// ainda não está configurada, e só então aplica o plano (mesmo update
// direto em `clinics.plan` que a troca self-service em Configurações →
// Plano já usa — não duplica lógica nenhuma nova).
function CheckoutScreen({
  plan,
  user,
  onDone,
}: {
  plan: PlanTier;
  user: AppUser;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(false);

  const features = t(`plans.${plan}.features`, {
    returnObjects: true,
  }) as string[];

  // Fase 31 — mesmo padrão de `PlanView.handleSwitch`: tenta cobrança real
  // primeiro; se a instalação não tiver Stripe configurado, cai pro
  // comportamento de sempre (aplica o plano na hora, sem cobrar — e é
  // exactly o que `checkout.noBillingNotice` já avisa nessa tela).
  const confirm = async () => {
    setApplying(true);
    setError(false);
    if (user.clinicId && plan !== "free") {
      try {
        const result = await apiFetch("/billing/change-plan", {
          method: "POST",
          body: JSON.stringify({ plan }),
        });
        if (result?.mode === "checkout" && result?.url) {
          window.location.href = result.url;
          return; // navegando pra fora — não chama onDone() aqui
        }
        onDone();
        return;
      } catch (err: any) {
        let billingNotConfigured = false;
        try {
          billingNotConfigured =
            JSON.parse(err?.message || "")?.error === "billing_not_configured";
        } catch {
          /* não era JSON */
        }
        if (!billingNotConfigured) {
          console.error("Falha ao iniciar checkout do plano:", err);
          setError(true);
          setApplying(false);
          return;
        }
        // Sem Stripe configurado — comportamento de sempre, abaixo.
      }
    }
    if (user.clinicId) {
      const { error: err } = await supabase
        .from("clinics")
        .update({ plan })
        .eq("id", user.clinicId);
      if (err) {
        console.error("Falha ao aplicar plano no checkout:", err);
        setError(true);
        setApplying(false);
        return;
      }
    }
    onDone();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("checkout.orderSummary")}
          </p>
          <h2
            className="text-2xl font-light text-foreground mb-1"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t(`plans.${plan}.name`)}
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            {t(`plans.${plan}.price`)}
          </p>

          <ul className="flex flex-col gap-2 text-sm text-muted-foreground mb-6">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check size={14} className="text-primary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3 mb-6">
            {t("checkout.noBillingNotice")}
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4">
              {t("checkout.applyError")}
            </p>
          )}

          <button
            onClick={confirm}
            disabled={applying}
            className="w-full bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {applying ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            {applying ? t("checkout.applying") : t("checkout.confirmCta")}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          {t("checkout.laterHint")}
        </p>
      </div>
    </div>
  );
}

// ─── Definir senha (convite / recuperação) ─────────────────────────────────
// Quando um paciente é convidado (Fase 8) ou alguém pede "esqueci minha
// senha", o Supabase Auth redireciona de volta pro site com
// #access_token=...&type=invite (ou type=recovery) na URL. O supabase-js já
// detecta esse hash sozinho (detectSessionInUrl, ligado por padrão) e cria a
// sessão — mas a conta ainda não tem senha nenhuma definida, e não existia
// nenhuma tela pedindo uma. Esta tela cobre esse passo que faltava.
function SetPasswordScreen({
  mode,
  onDone,
}: {
  mode: "invite" | "recovery";
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("setPassword.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("setPassword.mismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });
      if (updateErr) throw updateErr;
      onDone();
    } catch (err: any) {
      setError(err?.message || t("setPassword.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher compact />
      </div>
      <div className="bg-background rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <BrandMark size={20} />
          <span
            className="font-bold text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("login.brand")}
          </span>
        </div>
        <h2
          className="text-2xl font-light mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("setPassword.title")}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {mode === "invite"
            ? t("setPassword.subtitleInvite")
            : t("setPassword.subtitleRecovery")}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder={t("setPassword.passwordPlaceholder")}
            autoFocus
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            placeholder={t("setPassword.confirmPasswordPlaceholder")}
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600 focus:ring-2 focus:ring-red-400/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
          >
            {submitting
              ? t("setPassword.submitting")
              : t("setPassword.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

function InviteLinkExpiredScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher compact />
      </div>
      <div className="bg-background rounded-2xl p-10 w-full max-w-sm shadow-2xl text-center">
        <BrandMark size={24} className="mx-auto mb-4" />
        <h2
          className="text-2xl font-light mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("setPassword.linkExpiredTitle")}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {t("setPassword.linkExpiredMessage")}
        </p>
        <button
          onClick={() => {
            window.location.hash = "";
          }}
          className="bg-primary text-primary-foreground py-3 px-6 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm"
        >
          {t("setPassword.backToLogin")}
        </button>
      </div>
    </div>
  );
}

// ─── Placeholder areas for roles whose full experience lands in a later
// fase (psicólogo, secretária, paciente) — proves the login + role routing
// end-to-end without overclaiming features that don't exist yet. ──────────
function ComingSoonArea({
  user,
  onLogout,
  onSwitchRole,
}: {
  user: AppUser;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => Promise<void>;
}) {
  const { t } = useTranslation();
  const roleLabel = t(`roles.${user.role}`);

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-6 relative">
      <div className="absolute top-6 right-6">
        <UserMenu
          user={user}
          onLogout={onLogout}
          onSwitchRole={onSwitchRole}
          dark={false}
        />
      </div>
      <div className="bg-background rounded-2xl p-10 w-full max-w-md shadow-2xl text-center">
        <BrandMark size={24} className="mx-auto mb-4" />
        <h2
          className="text-2xl font-light mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("comingSoon.welcome", { role: roleLabel })}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {t("comingSoon.message", { role: roleLabel.toLowerCase() })}
        </p>
        <button
          onClick={onLogout}
          className="bg-primary text-primary-foreground py-3 px-6 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm"
        >
          {t("comingSoon.logout")}
        </button>
      </div>
    </div>
  );
}

// ─── Professional Dashboard (Fase 3) ───────────────────────────────────────────
// Overview screen for a logged-in psychologist: KPIs, two charts, and the
// next upcoming appointments. Data is read directly from Supabase using the
// RLS policies defined in the Fase 1 migration (each professional can only
// ever see their own rows), so no new backend endpoints were needed. Agenda,
// Pacientes, Financeiro and Prontuário are marked "coming soon" — they land
// as their own fases so this dashboard has real data to summarize.

type ProfessionalRow = {
  id: string;
  approach: string | null;
  approved: boolean;
  // Fase 32 — moeda de cobrança do profissional, usada pra formatar os
  // valores do painel dele (visão geral, financeiro).
  currency: string;
};

// Abas do painel de "Configurações" do profissional (Fase 13).
type SettingsTab =
  | "account"
  | "profile"
  | "clinic"
  | "plan"
  | "preferences"
  | "security";

type UpcomingAppointment = {
  id: string;
  starts_at: string;
  status: string;
  patients: { full_name: string } | null;
};

type DashboardStats = {
  activePatients: number;
  sessionsThisMonth: number;
  noShowRate: number | null;
  revenueThisMonth: number;
  sessionsByDay: { date: string; count: number }[];
  revenueByMonth: { month: string; amount: number }[];
  upcoming: UpcomingAppointment[];
};

// ─── Painel da Secretária (Fase 18 leitura + Fase 19 escrita) ──────────────
// Fase 18 só liberava leitura. Fase 19 liberou agendar consultas, cadastrar
// pacientes e marcar pagamento como pago/pendente — sempre em nome do
// profissional dono da clínica (`user.clinicProfessionalId`, resolvido no
// backend em `/me`, já que a secretária não tem — de propósito — uma
// policy de RLS pra ler o perfil do psicólogo direto) e sempre restrito à
// própria clínica (`clinic_id = user.clinicId`), como as policies novas da
// Fase 19 exigem. Reaproveita PatientForm/AppointmentForm (as mesmas do
// painel do profissional) — só muda o que entra no insert.
type SecretaryAppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  patients: { full_name: string } | null;
};

function SecretaryAgendaView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  // Fase 27.1 — mesma navegação dia/semana/mês (com grade de calendário)
  // que já existia só na visão do profissional (`AgendaView`). Antes a
  // secretária só tinha uma lista corrida das próximas 50 consultas, sem
  // filtro de data nenhum.
  const [mode, setMode] = useState<"day" | "week" | "month">("day");
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [appointments, setAppointments] = useState<SecretaryAppointmentRow[]>(
    [],
  );
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new">("list");
  const [actionError, setActionError] = useState(false);
  const [quickViewAppt, setQuickViewAppt] =
    useState<SecretaryAppointmentRow | null>(null);

  const {
    gridStart: monthGridStart,
    gridDays: monthGridDays,
    gridEnd: monthGridEnd,
  } = getMonthGridRange(anchorDate);

  const rangeStart =
    mode === "day"
      ? anchorDate
      : mode === "week"
        ? startOfWeek(anchorDate)
        : monthGridStart;
  const rangeEnd =
    mode === "day"
      ? addDays(anchorDate, 1)
      : mode === "week"
        ? addDays(rangeStart, 7)
        : monthGridEnd;

  const load = useCallback(async () => {
    if (!user.clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const [apptRes, patientsRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, patients(full_name)")
        .eq("clinic_id", user.clinicId)
        .gte("starts_at", rangeStart.toISOString())
        .lt("starts_at", rangeEnd.toISOString())
        .order("starts_at", { ascending: true }),
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("clinic_id", user.clinicId)
        .order("full_name", { ascending: true }),
    ]);
    if (apptRes.error) setError(true);
    else setAppointments((apptRes.data as SecretaryAppointmentRow[]) ?? []);
    setPatients((patientsRes.data as PatientOption[]) ?? []);
    setLoading(false);
  }, [user.clinicId, rangeStart.getTime(), rangeEnd.getTime()]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: {
    patient_id: string;
    starts_at: string;
    ends_at: string;
    notes: string | null;
    recurrenceWeeks: number;
  }) => {
    if (!user.clinicProfessionalId || !user.clinicId) {
      throw new Error("no_professional");
    }
    const rows = Array.from({ length: data.recurrenceWeeks }).map((_, i) => {
      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      start.setDate(start.getDate() + i * 7);
      end.setDate(end.getDate() + i * 7);
      return {
        professional_id: user.clinicProfessionalId,
        clinic_id: user.clinicId,
        patient_id: data.patient_id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        notes: data.notes,
        status: "scheduled",
        recurrence_rule: data.recurrenceWeeks > 1 ? "weekly" : null,
      };
    });
    const { error: err } = await supabase.from("appointments").insert(rows);
    if (err) throw err;
    await load();
    setView("list");
  };

  const updateStatus = async (id: string, status: string) => {
    setActionError(false);
    const { error: err } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (err) {
      console.error("Falha ao atualizar status da consulta:", err);
      setActionError(true);
      return;
    }
    await load();
  };

  if (view === "new") {
    return (
      <div>
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} /> {t("agenda.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("agenda.newTitle")}
        </h2>
        <div className="bg-card border border-border rounded-2xl p-8">
          <AppointmentForm
            patients={patients}
            defaultDate={anchorDate}
            onSave={handleSave}
            onCancel={() => setView("list")}
          />
        </div>
      </div>
    );
  }

  // Fase 27.1 — mesmo helper de navegação por mês do AgendaView do
  // profissional: no modo "mês" pula pelo número de meses (sempre cai no
  // dia 1), nos outros modos soma dias/semanas normalmente.
  const navigate = (direction: 1 | -1) => {
    if (mode === "month") {
      setAnchorDate(
        new Date(
          anchorDate.getFullYear(),
          anchorDate.getMonth() + direction,
          1,
        ),
      );
    } else {
      setAnchorDate(
        addDays(anchorDate, direction * (mode === "day" ? 1 : 7)),
      );
    }
  };

  const dayLabel = (d: Date) =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    }).format(d);

  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const rangeLabel =
    mode === "day"
      ? dayLabel(anchorDate)
      : mode === "week"
        ? `${new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "2-digit" }).format(rangeStart)} – ${new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "2-digit" }).format(addDays(rangeStart, 6))}`
        : new Intl.DateTimeFormat(i18n.language, {
            month: "long",
            year: "numeric",
          }).format(anchorDate);

  const statusStyles: Record<string, string> = {
    scheduled: "bg-secondary text-muted-foreground",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-amber-100 text-amber-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> {t("agenda.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("agenda.errorLoading")}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center capitalize">
            {rangeLabel}
          </span>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground rotate-180"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              setAnchorDate(d);
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
          >
            {t("agenda.today")}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarOpen((v) => !v)}
              title={t("agenda.pickDate")}
              className={`p-2 rounded-lg border transition-colors ${calendarOpen ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:bg-secondary"}`}
            >
              <CalendarDays size={16} />
            </button>
            {calendarOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setCalendarOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 z-30">
                  <MiniCalendar
                    value={anchorDate}
                    onChange={(d) => {
                      setAnchorDate(d);
                      setCalendarOpen(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border overflow-hidden text-xs font-medium">
            <button
              onClick={() => setMode("day")}
              className={`px-3 py-1.5 transition-colors ${mode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {t("agenda.dayView")}
            </button>
            <button
              onClick={() => setMode("week")}
              className={`px-3 py-1.5 transition-colors ${mode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {t("agenda.weekView")}
            </button>
            <button
              onClick={() => setMode("month")}
              className={`px-3 py-1.5 transition-colors ${mode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {t("agenda.monthView")}
            </button>
          </div>
          <button
            onClick={() => setView("new")}
            disabled={!user.clinicProfessionalId}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Plus size={14} /> {t("agenda.newAppointment")}
          </button>
        </div>
      </div>

      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {t("secretary.actionError")}
        </p>
      )}

      {mode === "day" || mode === "week" ? (
        appointments.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <p className="text-4xl mb-4">🌿</p>
            <p className="text-muted-foreground text-sm">
              {t("secretary.agendaEmpty")}
            </p>
          </div>
        ) : (
          <CalendarGrid
            days={
              mode === "day"
                ? [anchorDate]
                : Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))
            }
            appointments={appointments}
            onSelect={(a) => setQuickViewAppt(a)}
          />
        )
      ) : (
        // Fase 27.1 — mesma grade visual de calendário do AgendaView do
        // profissional; clicar num dia leva pro modo "dia", onde as ações
        // de confirmar/cancelar já existem.
        <div>
          <div className="grid grid-cols-7 gap-px bg-border border border-border">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="bg-secondary text-center text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground py-2"
              >
                {new Intl.DateTimeFormat(i18n.language, {
                  weekday: "short",
                }).format(addDays(monthGridStart, i))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border border border-t-0 border-border">
            {Array.from({ length: monthGridDays }).map((_, i) => {
              const day = addDays(monthGridStart, i);
              const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
              const today = new Date();
              const isToday =
                day.getFullYear() === today.getFullYear() &&
                day.getMonth() === today.getMonth() &&
                day.getDate() === today.getDate();
              const dayAppts = appointments
                .filter((a) => {
                  const d = new Date(a.starts_at);
                  return (
                    d.getFullYear() === day.getFullYear() &&
                    d.getMonth() === day.getMonth() &&
                    d.getDate() === day.getDate()
                  );
                })
                .sort(
                  (a, b) =>
                    new Date(a.starts_at).getTime() -
                    new Date(b.starts_at).getTime(),
                );
              const visible = dayAppts.slice(0, 3);
              const overflow = dayAppts.length - visible.length;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setAnchorDate(
                      new Date(
                        day.getFullYear(),
                        day.getMonth(),
                        day.getDate(),
                      ),
                    );
                    setMode("day");
                  }}
                  className={`w-full text-left bg-background p-2 min-h-[92px] flex flex-col gap-1 hover:bg-secondary transition-colors ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <span
                    className={`text-xs font-semibold shrink-0 ${isToday ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground" : "text-foreground"}`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {visible.map((a) => (
                      <span
                        key={a.id}
                        className={`text-[0.65rem] font-medium truncate px-1.5 py-0.5 rounded ${statusStyles[a.status] ?? "bg-secondary text-muted-foreground"}`}
                      >
                        {timeLabel(a.starts_at)}{" "}
                        {a.patients?.full_name ?? "—"}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span className="text-[0.65rem] text-muted-foreground px-1.5">
                        {t("agenda.monthMore", { count: overflow })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {quickViewAppt && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setQuickViewAppt(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {quickViewAppt.patients?.full_name ??
                    t("agenda.unknownPatient")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(quickViewAppt.starts_at))}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusStyles[quickViewAppt.status] ?? "bg-secondary text-muted-foreground"}`}
              >
                {t(`dashboard.appointmentStatus.${quickViewAppt.status}`)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {quickViewAppt.status !== "confirmed" &&
                quickViewAppt.status !== "completed" && (
                  <button
                    onClick={async () => {
                      await updateStatus(quickViewAppt.id, "confirmed");
                      setQuickViewAppt(null);
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {t("agenda.actions.confirm")}
                  </button>
                )}
              {quickViewAppt.status !== "cancelled" && (
                <button
                  onClick={async () => {
                    await updateStatus(quickViewAppt.id, "cancelled");
                    setQuickViewAppt(null);
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  {t("agenda.actions.cancelAppt")}
                </button>
              )}
              <button
                onClick={() => setQuickViewAppt(null)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
              >
                {t("agenda.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SecretaryPatientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
};

function SecretaryPatientsView({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<SecretaryPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "new">("list");
  // Fase 26 — mesma lista usada pro seletor de "psicólogo responsável" no
  // formulário. Pra secretária isso importa mais ainda que pro próprio
  // profissional: com mais de um psicólogo na clínica, ela precisa poder
  // escolher de quem é cada paciente novo em vez de tudo cair sempre no
  // mesmo (o antigo comportamento fixo em `user.clinicProfessionalId`).
  const [clinicProfessionals, setClinicProfessionals] = useState<
    { id: string; name: string }[]
  >([]);

  const load = useCallback(async () => {
    if (!user.clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const { data, error: fetchErr } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, status")
      .eq("clinic_id", user.clinicId)
      .order("full_name", { ascending: true });
    if (fetchErr) setError(true);
    else setPatients((data as SecretaryPatientRow[]) ?? []);
    setLoading(false);
  }, [user.clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user.clinicId) return;
      const { data } = await supabase
        .from("professionals")
        .select("id, profiles(full_name)")
        .eq("clinic_id", user.clinicId)
        .eq("approved", true);
      if (cancelled) return;
      setClinicProfessionals(
        ((data ?? []) as any[]).map((p) => ({
          id: p.id,
          name: p.profiles?.full_name || "—",
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user.clinicId]);

  const handleSave = async (data: Partial<Patient>) => {
    if (!user.clinicProfessionalId || !user.clinicId) {
      throw new Error("no_professional");
    }
    const { error: err } = await supabase.from("patients").insert({
      ...data,
      professional_id: data.professional_id ?? user.clinicProfessionalId,
      clinic_id: user.clinicId,
    });
    if (err) throw err;
    await load();
    setView("list");
  };

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  if (view === "new") {
    return (
      <div>
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} /> {t("patients.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("patients.newTitle")}
        </h2>
        <div className="bg-card border border-border rounded-2xl p-8">
          <PatientForm
            onSave={handleSave}
            onCancel={() => setView("list")}
            professionals={clinicProfessionals}
            defaultProfessionalId={user.clinicProfessionalId ?? undefined}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> {t("patients.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("patients.errorLoading")}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("patients.searchPlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <button
          onClick={() => setView("new")}
          disabled={!user.clinicProfessionalId}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
        >
          <Plus size={14} /> {t("patients.newPatient")}
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-muted-foreground text-sm">
            {patients.length === 0
              ? t("secretary.patientsEmpty")
              : t("patients.noResultsText")}
          </p>
        </div>
      ) : (
        // Fase 59 — mesmo container de lista com linhas divididas usado em
        // PatientsView/PsicPacientes, igual à referência do Figma.
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 p-4 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 shrink-0 flex items-center justify-center text-sm font-semibold text-primary">
                {p.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm truncate">
                  {p.full_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[p.email, p.phone].filter(Boolean).join(" · ") ||
                    t("secretary.noContactInfo")}
                </p>
              </div>
              {p.status !== "active" && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground shrink-0">
                  {p.status === "active"
                    ? t("patients.statusActive")
                    : t("patients.statusInactive")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Fase 19 — "financeiro" da secretária: só marcar pago/pendente. Sem criar,
// editar valor, excluir ou ver totais/relatório de faturamento — isso
// continua exclusivo do profissional/admin (FinanceView). A trava de
// verdade mora no banco (RLS + `protect_payment_fields_from_secretary`);
// esta tela só nem oferece os botões que o banco recusaria.
type SecretaryPaymentRow = {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  patients: { full_name: string } | null;
  // Fase 32 — uma clínica pode ter mais de um profissional (Fase 26), cada
  // um com sua própria moeda de cobrança agora. Precisa vir junto pra
  // formatar cada pagamento na moeda de quem o gerou, em vez de assumir
  // BRL pra todo mundo.
  // Fase 59 — `profiles(full_name)` junto pra mostrar de qual psicólogo é
  // cada pagamento (coluna "Psicólogo", igual à referência do Figma) — só
  // faz sentido pra secretária porque a clínica pode ter mais de um.
  professionals: { currency: string; profiles: { full_name: string } | null } | null;
};

function SecretaryFinanceView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [payments, setPayments] = useState<SecretaryPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState(false);

  const load = useCallback(async () => {
    if (!user.clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const { data, error: fetchErr } = await supabase
      .from("payments")
      .select(
        "id, amount, status, paid_at, created_at, patients(full_name), professionals(currency, profiles(full_name))",
      )
      .eq("clinic_id", user.clinicId)
      .order("created_at", { ascending: false });
    if (fetchErr) setError(true);
    else setPayments((data as SecretaryPaymentRow[]) ?? []);
    setLoading(false);
  }, [user.clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: "paid" | "pending") => {
    setActionError(false);
    const { error: err } = await supabase
      .from("payments")
      .update(
        status === "paid"
          ? { status, paid_at: new Date().toISOString() }
          : { status, paid_at: null },
      )
      .eq("id", id);
    if (err) {
      console.error("Falha ao atualizar status do pagamento:", err);
      setActionError(true);
      return;
    }
    await load();
  };

  // Fase 32 — cada pagamento é formatado na moeda do profissional que o
  // gerou (uma clínica pode ter mais de um profissional, cada um com sua
  // própria moeda — ver `professionals.currency`), não mais BRL fixo.
  const currency = (value: number, curr?: string | null) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: curr === "EUR" ? "EUR" : "BRL",
      maximumFractionDigits: 2,
    }).format(value);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));

  const statusStyles: Record<string, string> = {
    pending: "bg-secondary text-muted-foreground",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> {t("finance.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("finance.errorLoading")}
      </div>
    );
  }
  if (payments.length === 0) {
    return (
      <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
        <p className="text-4xl mb-4">🌿</p>
        <p className="text-muted-foreground text-sm">
          {t("secretary.financeEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {t("secretary.actionError")}
        </p>
      )}
      {/* Fase 59 — tabela com coluna "Psicólogo" (clínica pode ter mais de
          um profissional), igual à referência do Figma, no lugar da lista
          de cartões. */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {[
                t("finance.table.patient"),
                t("finance.table.professional"),
                t("finance.table.date"),
                t("finance.table.amount"),
                t("finance.table.status"),
                t("finance.table.actions"),
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 shrink-0 flex items-center justify-center text-sm font-semibold text-primary">
                      {(p.patients?.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-foreground">
                      {p.patients?.full_name ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-muted-foreground text-xs">
                  {p.professionals?.profiles?.full_name
                    ? p.professionals.profiles.full_name.split(" ").slice(0, 2).join(" ")
                    : "—"}
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">
                  {p.paid_at ? dateLabel(p.paid_at) : dateLabel(p.created_at)}
                </td>
                <td className="px-4 py-3.5 font-semibold text-foreground">
                  {currency(Number(p.amount), p.professionals?.currency)}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusStyles[p.status] ?? "bg-secondary text-muted-foreground"}`}
                  >
                    {t(`finance.status.${p.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {p.status !== "paid" ? (
                    <button
                      onClick={() => setStatus(p.id, "paid")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs font-medium transition-colors"
                    >
                      <Check size={11} /> {t("finance.markPaid")}
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(p.id, "pending")}
                      className="px-2.5 py-1 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground text-xs font-medium"
                    >
                      {t("secretary.markPending")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Solicitações de contato (Fase 25) ─────────────────────────────────────
// Tela compartilhada entre o painel do profissional e o da secretária —
// mostra os pedidos "quero agendar" enviados pelo perfil público do
// profissional na Landing (ver `booking_requests`/RLS na migration da
// Fase 25). Sem agendamento automático aqui: a única ação que "avança" o
// pedido de verdade é converter em paciente, usando a mesma tabela
// `patients` de sempre — a partir daí o profissional/secretária agenda a
// consulta normalmente pela Agenda.
function RequestsView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const isSecretary = user.role === "secretary";
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BookingRequestStatus | "all">(
    "all",
  );
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const scopeId = isSecretary ? user.clinicId : user.id;
    if (!scopeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const query = supabase
      .from("booking_requests")
      .select(
        "id, professional_id, clinic_id, full_name, email, phone, preferred_period, message, status, converted_patient_id, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    const { data, error: err } = isSecretary
      ? await query.eq("clinic_id", scopeId)
      : await query.eq("professional_id", scopeId);
    if (err) setError(true);
    else setRequests((data as BookingRequest[]) ?? []);
    setLoading(false);
  }, [isSecretary, user.clinicId, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const updateStatus = async (id: string, status: BookingRequestStatus) => {
    setActioningId(id);
    setActionError(null);
    const { error: err } = await supabase
      .from("booking_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setActioningId(null);
    if (err) {
      console.error("Falha ao atualizar solicitação:", err);
      setActionError(id);
      return;
    }
    await load();
  };

  const convertToPatient = async (r: BookingRequest) => {
    setActioningId(r.id);
    setActionError(null);
    const professionalId = isSecretary ? user.clinicProfessionalId : user.id;
    if (!professionalId) {
      setActioningId(null);
      setActionError(r.id);
      return;
    }
    const { data: patientRow, error: patientErr } = await supabase
      .from("patients")
      .insert({
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        professional_id: professionalId,
        ...(isSecretary && user.clinicId ? { clinic_id: user.clinicId } : {}),
      })
      .select("id")
      .single();
    if (patientErr || !patientRow) {
      console.error("Falha ao converter solicitação em paciente:", patientErr);
      setActioningId(null);
      setActionError(r.id);
      return;
    }
    const { error: reqErr } = await supabase
      .from("booking_requests")
      .update({
        status: "converted",
        converted_patient_id: patientRow.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    setActioningId(null);
    if (reqErr) {
      console.error("Falha ao marcar solicitação como convertida:", reqErr);
      setActionError(r.id);
      return;
    }
    setConvertedIds((prev) => new Set(prev).add(r.id));
    await load();
  };

  const statusBadgeClass: Record<BookingRequestStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    contacted: "bg-blue-100 text-blue-700",
    converted: "bg-green-100 text-green-700",
    declined: "bg-secondary text-muted-foreground",
  };

  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("requests.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("requests.errorLoading")}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as BookingRequestStatus | "all")
          }
          className="text-sm px-4 py-2.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-xs transition-colors"
        >
          <option value="all">{t("requests.statusFilterAll")}</option>
          <option value="pending">{t("requests.status.pending")}</option>
          <option value="contacted">{t("requests.status.contacted")}</option>
          <option value="converted">{t("requests.status.converted")}</option>
          <option value="declined">{t("requests.status.declined")}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">📬</p>
          <p className="font-semibold text-foreground mb-2">
            {t("requests.emptyTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("requests.emptyText")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {r.full_name}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadgeClass[r.status]}`}
                    >
                      {t(`requests.status.${r.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dateLabel(r.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-2">
                  <Mail size={13} className="shrink-0" /> {r.email}
                </span>
                {r.phone && (
                  <span className="flex items-center gap-2">
                    <Phone size={13} className="shrink-0" /> {r.phone}
                  </span>
                )}
                {r.preferred_period && (
                  <span className="flex items-center gap-2">
                    <Clock size={13} className="shrink-0" />{" "}
                    {t(`psychologistsSection.connect.periods.${r.preferred_period}`)}
                  </span>
                )}
              </div>

              {r.message && (
                <p className="text-sm text-foreground bg-secondary rounded-lg px-3 py-2 mb-3">
                  {r.message}
                </p>
              )}

              {actionError === r.id && (
                <p className="text-red-500 text-xs mb-2">
                  {t("requests.actionError")}
                </p>
              )}

              {convertedIds.has(r.id) && r.status === "converted" && (
                <p className="text-green-700 text-xs mb-2">
                  {t("requests.convertSuccess")}
                </p>
              )}

              {(r.status === "pending" || r.status === "contacted") && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.status === "pending" && (
                    <button
                      onClick={() => updateStatus(r.id, "contacted")}
                      disabled={actioningId === r.id}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-50"
                    >
                      {t("requests.markContacted")}
                    </button>
                  )}
                  <button
                    onClick={() => convertToPatient(r)}
                    disabled={actioningId === r.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {t("requests.convertToPatient")}
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "declined")}
                    disabled={actioningId === r.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-muted-foreground disabled:opacity-50"
                  >
                    {t("requests.decline")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecretaryDashboard({
  user,
  onLogout,
  onSwitchRole,
}: {
  user: AppUser;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<
    "agenda" | "patients" | "requests" | "finance" | "settings"
  >("agenda");
  // Fase 28 — menu lateral fixo (em vez das abas no topo) nas telas
  // internas, no mesmo espírito do mockup de referência: sidebar com a
  // marca no topo, itens de navegação empilhados, e o menu do usuário no
  // rodapé. Em telas pequenas a sidebar vira uma gaveta (drawer) acionada
  // pelo botão de menu na barra superior — não existe versão mobile no
  // mockup de referência pros painéis internos, então segui o padrão mais
  // comum pra esse tipo de layout.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Fase 29 — contagem de solicitações pendentes pro badge no menu
  // "Solicitações". Refaz a busca a cada troca de tela (consulta leve,
  // `head: true`) pra refletir mudanças feitas na própria tela.
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  useEffect(() => {
    if (!user.clinicId) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", user.clinicId)
        .eq("status", "pending");
      if (!cancelled) setPendingRequestsCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.clinicId, view]);

  const navItems: {
    key: "agenda" | "patients" | "requests" | "finance" | "settings";
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }[] = [
    { key: "agenda", icon: <Calendar size={14} />, label: t("dashboard.navAgenda") },
    { key: "patients", icon: <Users size={14} />, label: t("dashboard.navPatients") },
    {
      key: "requests",
      icon: <Inbox size={14} />,
      label: t("dashboard.navRequests"),
      badge: pendingRequestsCount,
    },
    { key: "finance", icon: <Wallet size={14} />, label: t("dashboard.navFinance") },
    { key: "settings", icon: <Settings size={14} />, label: t("dashboard.navSettings") },
  ];

  const navItemClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  const navBadge = (count?: number) =>
    count && count > 0 ? (
      <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const sidebarNav = (onNavigate?: () => void) => (
    <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
      {navItems.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            setView(item.key);
            onNavigate?.();
          }}
          className={navItemClass(view === item.key)}
        >
          {item.icon} {item.label} {navBadge(item.badge)}
        </button>
      ))}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-background md:flex"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Sidebar — desktop. Fase 58 — arquitetura clara (bg-card + item
          ativo preenchido com a cor primária) no lugar da sidebar cheia na
          cor primária, alinhada à referência enviada pelo usuário (Figma),
          mantendo a paleta/nome/logo que já existiam no código. */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-card border-r border-border h-screen sticky top-0">
        {/* Fase 36 — antes o `overflow-y-auto` ficava no `<aside>` inteiro,
            então o menu do usuário (que abre PRA CIMA, `openUp`, a partir
            deste rodapé) era cortado pela própria sidebar: um elemento com
            overflow clipa qualquer descendente posicionado `absolute` que
            tente desenhar fora da caixa, mesmo abrindo pra cima. Isolando o
            scroll só no bloco de cima (marca + navegação) e deixando o
            rodapé (com o menu) FORA da área com overflow, o menu passa a
            desenhar por cima de tudo sem ser cortado. */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="px-5 py-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-0.5">
              <BrandMark size={16} />
              <span
                className="font-bold text-foreground"
                style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem" }}
              >
                {t("nav.brand")}
              </span>
            </div>
            <p className="text-xs font-semibold text-primary">
              {t(`roles.${user.role}`)}
            </p>
          </div>
          {sidebarNav()}
        </div>
        <div className="px-3 py-4 border-t border-border flex flex-col gap-3 shrink-0">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe size={14} /> {t("admin.viewSite")}
          </button>
          <div className="px-2.5">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              onOpenSettings={() => setView("settings")}
              dark={false}
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-card border-b border-border h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1 text-foreground">
          <Menu size={20} />
        </button>
        <BrandMark size={16} />
        <span
          className="font-bold text-sm text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("nav.brand")}
        </span>
        <div className="ml-auto">
          <UserMenu
            user={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
            onOpenSettings={() => setView("settings")}
            dark={false}
          />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border">
              <div className="flex items-center gap-2">
                <BrandMark size={16} />
                <span
                  className="font-bold text-sm text-foreground"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("nav.brand")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1 text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            {sidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-border flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe size={14} /> {t("admin.viewSite")}
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1
              className="text-3xl font-light text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {user.fullName
                ? t("dashboard.greeting", {
                    name: user.fullName.trim().split(/\s+/)[0],
                  })
                : t("secretary.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("secretary.subtitle")}
            </p>
          </div>

          {!user.clinicProfessionalId && (
            <div className="mb-8 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
              {t("secretary.noProfessionalLinked")}
            </div>
          )}

          {view === "agenda" && <SecretaryAgendaView user={user} />}
          {view === "patients" && <SecretaryPatientsView user={user} />}
          {view === "requests" && <RequestsView user={user} />}
          {view === "finance" && <SecretaryFinanceView user={user} />}
          {view === "settings" && <AccountSecurityView user={user} onLogout={onLogout} />}
        </div>
      </div>
    </div>
  );
}

function ProfessionalDashboard({
  user,
  onLogout,
  onSwitchRole,
}: {
  user: AppUser;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<
    | "overview"
    | "patients"
    | "agenda"
    | "records"
    | "requests"
    | "finance"
    | "packages"
    | "payouts"
    | "reports"
    | "settings"
  >("overview");
  // Fase 28 — sidebar fixa nas telas internas em vez das abas no topo (ver
  // nota equivalente em `SecretaryDashboard`).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Fase 37 — "Repasses" só aparece pra quem é dono de uma clínica no
  // plano empresarial (única situação em que faz sentido gerenciar
  // comissão/repasse de equipe). Buscado à parte porque `AppUser` não
  // carrega plano nem `owner_id` da clínica.
  const [showPayouts, setShowPayouts] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!user.clinicId) {
      setShowPayouts(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("clinics")
        .select("plan, owner_id")
        .eq("id", user.clinicId)
        .maybeSingle();
      if (!cancelled) {
        setShowPayouts(!!data && data.plan === "clinic" && data.owner_id === user.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.clinicId, user.id]);

  // Fase 29 — contagem de solicitações pendentes pro badge no menu
  // "Solicitações" (ver nota equivalente em `SecretaryDashboard`).
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .eq("status", "pending");
      if (!cancelled) setPendingRequestsCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id, view]);

  // Quando o aviso de perfil incompleto leva direto pra uma aba específica
  // de Configurações (em vez de sempre abrir em "Conta").
  const [settingsTab, setSettingsTab] = useState<SettingsTab | undefined>(
    undefined,
  );
  const [professional, setProfessional] = useState<ProfessionalRow | null>(
    null,
  );
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1,
        );
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
        fourteenDaysAgo.setHours(0, 0, 0, 0);
        const sixMonthsAgo = new Date(
          now.getFullYear(),
          now.getMonth() - 5,
          1,
        );

        const [
          professionalRes,
          patientsCountRes,
          sessionsThisMonthRes,
          recentAppointmentsRes,
          revenueThisMonthRes,
          revenueTrendRes,
          upcomingRes,
        ] = await Promise.all([
          supabase
            .from("professionals")
            .select("id, approach, approved, currency")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("patients")
            .select("id", { count: "exact", head: true })
            .eq("professional_id", user.id)
            .eq("status", "active"),
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("professional_id", user.id)
            .neq("status", "cancelled")
            .gte("starts_at", startOfMonth.toISOString())
            .lt("starts_at", startOfNextMonth.toISOString()),
          supabase
            .from("appointments")
            .select("starts_at, status")
            .eq("professional_id", user.id)
            .gte("starts_at", fourteenDaysAgo.toISOString())
            .lt("starts_at", startOfNextMonth.toISOString()),
          supabase
            .from("payments")
            .select("amount")
            .eq("professional_id", user.id)
            .eq("status", "paid")
            .gte("paid_at", startOfMonth.toISOString())
            .lt("paid_at", startOfNextMonth.toISOString()),
          supabase
            .from("payments")
            .select("amount, paid_at")
            .eq("professional_id", user.id)
            .eq("status", "paid")
            .gte("paid_at", sixMonthsAgo.toISOString()),
          supabase
            .from("appointments")
            .select("id, starts_at, status, patients(full_name)")
            .eq("professional_id", user.id)
            .gte("starts_at", now.toISOString())
            .order("starts_at", { ascending: true })
            .limit(5),
        ]);

        if (cancelled) return;

        const prof = (professionalRes.data as ProfessionalRow | null) ?? null;
        setProfessional(prof);

        // Sessions per day (last 14 days)
        const dayBuckets = new Map<string, number>();
        for (let i = 0; i < 14; i++) {
          const d = new Date(fourteenDaysAgo);
          d.setDate(d.getDate() + i);
          dayBuckets.set(d.toISOString().slice(0, 10), 0);
        }
        (recentAppointmentsRes.data ?? []).forEach((a: any) => {
          const key = String(a.starts_at).slice(0, 10);
          if (dayBuckets.has(key)) {
            dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
          }
        });
        const sessionsByDay = Array.from(dayBuckets.entries()).map(
          ([date, count]) => ({ date, count }),
        );

        // No-show rate over the same 14-day window — precisa filtrar pelas
        // mesmas chaves de `dayBuckets`, não só pelo intervalo bruto da
        // consulta: essa consulta busca a mais (de 13 dias atrás até o fim
        // do mês corrente) pra também alimentar o gráfico de sessões por
        // dia, então sem esse filtro a janela usada aqui variava de tamanho
        // dependendo do dia do mês em vez de ser sempre os últimos 14 dias.
        const relevantStatuses = (recentAppointmentsRes.data ?? []).filter(
          (a: any) =>
            dayBuckets.has(String(a.starts_at).slice(0, 10)) &&
            (a.status === "completed" || a.status === "no_show"),
        );
        const noShowCount = relevantStatuses.filter(
          (a: any) => a.status === "no_show",
        ).length;
        const noShowRate =
          relevantStatuses.length > 0
            ? noShowCount / relevantStatuses.length
            : null;

        // Revenue per month (last 6 months)
        const monthBuckets = new Map<string, number>();
        for (let i = 0; i < 6; i++) {
          const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
          monthBuckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
        }
        (revenueTrendRes.data ?? []).forEach((p: any) => {
          const d = new Date(p.paid_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (monthBuckets.has(key)) {
            monthBuckets.set(
              key,
              (monthBuckets.get(key) ?? 0) + Number(p.amount ?? 0),
            );
          }
        });
        const revenueByMonth = Array.from(monthBuckets.entries()).map(
          ([key, amount]) => {
            const [y, m] = key.split("-").map(Number);
            return {
              month: new Date(y, m, 1).toISOString(),
              amount,
            };
          },
        );

        const revenueThisMonth = (revenueThisMonthRes.data ?? []).reduce(
          (sum: number, p: any) => sum + Number(p.amount ?? 0),
          0,
        );

        setStats({
          activePatients: patientsCountRes.count ?? 0,
          sessionsThisMonth: sessionsThisMonthRes.count ?? 0,
          noShowRate,
          revenueThisMonth,
          sessionsByDay,
          revenueByMonth,
          upcoming: (upcomingRes.data as any[] as UpcomingAppointment[]) ?? [],
        });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  // Fase 32 — usa a moeda que o próprio profissional escolheu nas
  // configurações do perfil (`professionals.currency`), não BRL fixo.
  const currency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: professional?.currency === "EUR" ? "EUR" : "BRL",
      maximumFractionDigits: 0,
    }).format(value);

  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(`${iso}T00:00:00`));

  const monthLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(
      new Date(iso),
    );

  const dateTimeLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const proNavItems: {
    key:
      | "overview"
      | "agenda"
      | "patients"
      | "records"
      | "requests"
      | "finance"
      | "packages"
      | "payouts"
      | "reports"
      | "settings";
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    badge?: number;
  }[] = [
    {
      key: "overview",
      icon: <LayoutDashboard size={14} />,
      label: t("dashboard.navOverview"),
      onClick: () => setView("overview"),
    },
    {
      key: "agenda",
      icon: <Calendar size={14} />,
      label: t("dashboard.navAgenda"),
      onClick: () => setView("agenda"),
    },
    {
      key: "patients",
      icon: <Users size={14} />,
      label: t("dashboard.navPatients"),
      onClick: () => setView("patients"),
    },
    {
      key: "records",
      icon: <Shield size={14} />,
      label: t("dashboard.navRecords"),
      onClick: () => setView("records"),
    },
    {
      key: "requests",
      icon: <Inbox size={14} />,
      label: t("dashboard.navRequests"),
      onClick: () => setView("requests"),
      badge: pendingRequestsCount,
    },
    {
      key: "finance",
      icon: <Wallet size={14} />,
      label: t("dashboard.navFinance"),
      onClick: () => setView("finance"),
    },
    {
      key: "packages",
      icon: <Package size={14} />,
      label: t("dashboard.navPackages"),
      onClick: () => setView("packages"),
    },
    ...(showPayouts
      ? [
          {
            key: "payouts" as const,
            icon: <HandCoins size={14} />,
            label: t("dashboard.navPayouts"),
            onClick: () => setView("payouts"),
          },
          {
            key: "reports" as const,
            icon: <Activity size={14} />,
            label: t("dashboard.navReports"),
            onClick: () => setView("reports"),
          },
        ]
      : []),
    {
      key: "settings",
      icon: <UserCircle size={14} />,
      label: t("dashboard.navSettings"),
      onClick: () => {
        setSettingsTab(undefined);
        setView("settings");
      },
    },
  ];

  const proNavItemClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  const navBadge = (count?: number) =>
    count && count > 0 ? (
      <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const proSidebarNav = (onNavigate?: () => void) => (
    <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
      {proNavItems.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            item.onClick();
            onNavigate?.();
          }}
          className={proNavItemClass(view === item.key)}
        >
          {item.icon} {item.label} {navBadge(item.badge)}
        </button>
      ))}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-background md:flex"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Sidebar — desktop. Fase 58 — arquitetura clara (bg-card + item
          ativo preenchido com a cor primária), ver nota equivalente em
          SecretaryDashboard. */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-card border-r border-border h-screen sticky top-0">
        {/* Fase 36 — ver nota equivalente em SecretaryDashboard: o scroll
            precisa ficar isolado no bloco de cima, senão o menu do usuário
            (que abre pra cima) é cortado pelo overflow da própria sidebar. */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="px-5 py-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-0.5">
              <BrandMark size={16} />
              <span
                className="font-bold text-foreground"
                style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem" }}
              >
                {t("nav.brand")}
              </span>
            </div>
            <p className="text-xs font-semibold text-primary">
              {t(`roles.${user.role}`)}
            </p>
          </div>
          {proSidebarNav()}
        </div>
        <div className="px-3 py-4 border-t border-border flex flex-col gap-3 shrink-0">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe size={14} /> {t("admin.viewSite")}
          </button>
          <div className="px-2.5">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              onOpenSettings={() => {
                setSettingsTab(undefined);
                setView("settings");
              }}
              dark={false}
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-card border-b border-border h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1 text-foreground">
          <Menu size={20} />
        </button>
        <BrandMark size={16} />
        <span
          className="font-bold text-sm text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("nav.brand")}
        </span>
        <div className="ml-auto">
          <UserMenu
            user={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
            onOpenSettings={() => {
              setSettingsTab(undefined);
              setView("settings");
            }}
            dark={false}
          />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border">
              <div className="flex items-center gap-2">
                <BrandMark size={16} />
                <span
                  className="font-bold text-sm text-foreground"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("nav.brand")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1 text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            {proSidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-border flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe size={14} /> {t("admin.viewSite")}
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1
            className="text-3xl font-light text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {view === "patients"
              ? t("patients.title")
              : view === "agenda"
                ? t("agenda.title")
                : view === "records"
                  ? t("records.title")
                  : view === "requests"
                    ? t("requests.title")
                    : view === "finance"
                      ? t("finance.title")
                      : view === "packages"
                        ? t("packages.title")
                        : view === "payouts"
                          ? t("payouts.title")
                          : view === "reports"
                            ? t("clinicReports.title")
                            : view === "settings"
                              ? t("settings.title")
                              : user.fullName
                                ? t("dashboard.greeting", {
                                    name: user.fullName.trim().split(/\s+/)[0],
                                  })
                                : t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {view === "patients"
              ? t("patients.subtitle")
              : view === "agenda"
                ? t("agenda.subtitle")
                : view === "records"
                  ? t("records.subtitle")
                  : view === "requests"
                    ? t("requests.subtitle")
                    : view === "finance"
                      ? t("finance.subtitle")
                      : view === "packages"
                        ? t("packages.subtitle")
                        : view === "payouts"
                          ? t("payouts.subtitle")
                          : view === "reports"
                            ? t("clinicReports.subtitle")
                            : view === "settings"
                              ? t("settings.subtitle")
                              : t("dashboard.subtitle")}
          </p>
        </div>

        {view === "patients" ? (
          <PatientsView user={user} />
        ) : view === "agenda" ? (
          <AgendaView user={user} />
        ) : view === "records" ? (
          <RecordsView user={user} />
        ) : view === "requests" ? (
          <RequestsView user={user} />
        ) : view === "finance" ? (
          <FinanceView user={user} />
        ) : view === "packages" ? (
          <SessionPackagesView user={user} />
        ) : view === "payouts" ? (
          <ClinicPayoutsView user={user} />
        ) : view === "reports" ? (
          <ClinicReportsView user={user} />
        ) : view === "settings" ? (
          <SettingsView
            user={user}
            onLogout={onLogout}
            initialTab={settingsTab}
          />
        ) : (
          <>
            {professional && !professional.approach && (
              <button
                onClick={() => {
                  setSettingsTab("profile");
                  setView("settings");
                }}
                className="mb-8 w-full text-left text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber-100 transition-colors"
              >
                <span>{t("dashboard.profileHint")}</span>
                <span className="flex items-center gap-1 font-semibold shrink-0">
                  {t("dashboard.editProfile")} <ArrowRight size={12} />
                </span>
              </button>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
                <Loader2 size={20} className="animate-spin" />{" "}
                {t("dashboard.loading")}
              </div>
            ) : error ? (
              <div className="text-center py-24 text-muted-foreground text-sm">
                {t("dashboard.errorLoading")}
              </div>
            ) : stats ? (
              <>
            {/* KPI cards — Fase 59: cartões individuais com ícone colorido
                (StatCard), no lugar da grade com hairlines, pra bater
                exatamente com a referência do Figma. */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Users}
                label={t("dashboard.kpi.activePatients")}
                value={stats.activePatients}
                tone="primary"
              />
              <StatCard
                icon={Calendar}
                label={t("dashboard.kpi.sessionsThisMonth")}
                value={stats.sessionsThisMonth}
                tone="accent"
              />
              <StatCard
                icon={AlertTriangle}
                label={t("dashboard.kpi.noShowRate")}
                value={
                  stats.noShowRate === null
                    ? "—"
                    : `${Math.round(stats.noShowRate * 100)}%`
                }
                tone="danger"
              />
              <StatCard
                icon={Wallet}
                label={t("dashboard.kpi.revenueThisMonth")}
                value={currency(stats.revenueThisMonth)}
                tone="primary"
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {t("dashboard.charts.sessionsTitle")}
                </h3>
                {stats.sessionsByDay.every((d) => d.count === 0) && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("dashboard.charts.noData")}
                  </p>
                )}
                <div className="h-56 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.sessionsByDay}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={dayLabel}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <RechartsTooltip
                        labelFormatter={(v) => dayLabel(String(v))}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--primary)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {t("dashboard.charts.revenueTitle")}
                </h3>
                {stats.revenueByMonth.every((m) => m.amount === 0) && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("dashboard.charts.noData")}
                  </p>
                )}
                <div className="h-56 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenueByMonth}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="month"
                        tickFormatter={monthLabel}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        tickFormatter={(v) => currency(Number(v))}
                      />
                      <RechartsTooltip
                        labelFormatter={(v) => monthLabel(String(v))}
                        formatter={(v: any) => currency(Number(v))}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Upcoming appointments */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {t("dashboard.upcoming.title")}
              </h3>
              {stats.upcoming.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm">
                    {t("dashboard.upcoming.empty")}
                  </p>
                  <p className="text-muted-foreground/70 text-xs mt-1">
                    {t("dashboard.upcoming.emptyHint")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.upcoming.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Clock
                          size={14}
                          className="text-muted-foreground shrink-0"
                        />
                        <span className="text-sm text-foreground truncate">
                          {appt.patients?.full_name ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {dateTimeLabel(appt.starts_at)}
                        </span>
                        <span className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
                          {t(`dashboard.appointmentStatus.${appt.status}`)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
            ) : null}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Patients (Fase 4) ──────────────────────────────────────────────────────────
// Patient management for a logged-in psychologist: searchable/filterable
// list, create/edit form, and a detail panel with an appointment "history"
// tab (empty for now — the full scheduling module lands in its own fase).
// Everything reads/writes `patients` directly via supabase-js; RLS already
// scopes every row to professional_id = auth.uid(), so no new endpoints
// were needed here either.

type Patient = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  status: string;
  created_at: string;
  patient_user_id: string | null;
  professional_id?: string;
  // Fase 40 — contato de emergência.
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  // Fase 52 — paciente menor de idade e dados do responsável legal.
  is_minor: boolean;
  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_contact: string | null;
  // Fase 55 — CPF, opcional, usado pelo motor de templates de documento
  // ({{paciente.cpf}}).
  cpf: string | null;
};

type PatientAppointment = {
  id: string;
  starts_at: string;
  status: string;
};

function PatientForm({
  initial,
  onSave,
  onCancel,
  professionals,
  defaultProfessionalId,
}: {
  initial?: Patient | null;
  onSave: (data: Partial<Patient>) => Promise<void>;
  onCancel: () => void;
  // Fase 26 — "psicólogo responsável" só é mostrado (e só é enviado no
  // save) quando existe mais de um profissional na clínica: no caso comum
  // de consultório com um psicólogo só, o campo seria sempre a mesma opção
  // óbvia e só acrescentaria ruído ao formulário.
  professionals?: { id: string; name: string }[];
  defaultProfessionalId?: string;
}) {
  const { t } = useTranslation();
  const showProfessionalPicker = (professionals?.length ?? 0) > 1;
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
    tags: initial?.tags ?? [],
    status: initial?.status ?? "active",
    professional_id:
      initial?.professional_id ?? defaultProfessionalId ?? "",
    emergency_contact_name: initial?.emergency_contact_name ?? "",
    emergency_contact_phone: initial?.emergency_contact_phone ?? "",
    is_minor: initial?.is_minor ?? false,
    guardian_name: initial?.guardian_name ?? "",
    guardian_relationship: initial?.guardian_relationship ?? "",
    guardian_contact: initial?.guardian_contact ?? "",
    cpf: initial?.cpf ?? "",
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || form.tags.includes(trimmed)) return;
    set("tags", [...form.tags, trimmed]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    set(
      "tags",
      form.tags.filter((x: string) => x !== tag),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError(t("patients.fields.requiredError"));
      return;
    }
    if (form.is_minor && !form.guardian_name.trim()) {
      setError(t("patients.fields.guardianRequiredError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        tags: form.tags,
        status: form.status,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        is_minor: form.is_minor,
        guardian_name: form.is_minor
          ? form.guardian_name.trim() || null
          : null,
        guardian_relationship: form.is_minor
          ? form.guardian_relationship.trim() || null
          : null,
        guardian_contact: form.is_minor
          ? form.guardian_contact.trim() || null
          : null,
        cpf: form.cpf.trim() || null,
        ...(showProfessionalPicker
          ? { professional_id: form.professional_id }
          : {}),
      });
    } catch (err: any) {
      // The plan-limit trigger (Fase 10) raises this specific exception
      // name when the clinic's active-patient cap is reached — surfaced
      // here as a plain PostgREST error, not a generic one, so we point
      // people at the upgrade screen instead of a vague "couldn't save".
      if (err?.message === "plan_patient_limit_reached") {
        setError(
          t("patients.fields.planLimitError", {
            limit: err?.hint ?? "?",
          }),
        );
      } else {
        setError(t("patients.fields.genericSaveError"));
      }
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("patients.fields.nameLabel")}
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder={t("patients.fields.namePlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("patients.fields.statusLabel")}
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            <option value="active">{t("patients.statusActive")}</option>
            <option value="inactive">{t("patients.statusInactive")}</option>
          </select>
        </div>
      </div>

      {showProfessionalPicker && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("patients.fields.responsibleLabel")}
          </label>
          <select
            value={form.professional_id}
            onChange={(e) => set("professional_id", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            {professionals!.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("patients.fields.emailLabel")}
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={t("patients.fields.emailPlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("patients.fields.phoneLabel")}
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder={t("patients.fields.phonePlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>

      {/* Fase 55 — CPF opcional, usado só pelo motor de templates de
          documento ({{paciente.cpf}}); nada mais na plataforma depende
          disso. */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("patients.fields.cpfLabel")}
        </label>
        <input
          type="text"
          value={form.cpf}
          onChange={(e) => set("cpf", e.target.value)}
          placeholder={t("patients.fields.cpfPlaceholder")}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      </div>

      {/* Fase 40 — contato de emergência, separado do contato do próprio
          paciente. */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("patients.fields.emergencyContactLegend")}
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={form.emergency_contact_name}
            onChange={(e) => set("emergency_contact_name", e.target.value)}
            placeholder={t("patients.fields.emergencyContactNamePlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <input
            type="text"
            value={form.emergency_contact_phone}
            onChange={(e) => set("emergency_contact_phone", e.target.value)}
            placeholder={t("patients.fields.emergencyContactPhonePlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>

      {/* Fase 52 — paciente menor de idade: quando marcado, exige dados do
          responsável legal e passa a cobrar um terceiro TCLE (autorização
          do responsável) no Portal do Paciente. */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_minor}
            onChange={(e) => set("is_minor", e.target.checked)}
            className="rounded border-border"
          />
          {t("patients.fields.isMinorLabel")}
        </label>
        {form.is_minor && (
          <div className="mt-3 space-y-3 bg-secondary/50 border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">
              {t("patients.fields.guardianHint")}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                value={form.guardian_name}
                onChange={(e) => set("guardian_name", e.target.value)}
                placeholder={t("patients.fields.guardianNamePlaceholder")}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              <input
                type="text"
                value={form.guardian_relationship}
                onChange={(e) =>
                  set("guardian_relationship", e.target.value)
                }
                placeholder={t(
                  "patients.fields.guardianRelationshipPlaceholder",
                )}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
            <input
              type="text"
              value={form.guardian_contact}
              onChange={(e) => set("guardian_contact", e.target.value)}
              placeholder={t("patients.fields.guardianContactPlaceholder")}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("patients.fields.tagsLabel")}
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.tags.map((tag: string) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder={t("patients.fields.addTagPlaceholder")}
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            className="bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("patients.fields.add")}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("patients.fields.notesLabel")}
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder={t("patients.fields.notesPlaceholder")}
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          {t("patients.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {initial
            ? t("patients.fields.saveEdit")
            : t("patients.fields.saveNew")}
        </button>
      </div>
    </form>
  );
}

// Fase 46 — diário de humor + escalas psicométricas, lado do profissional:
// só leitura (RLS já garante isso — nem precisaria checar aqui — mas a UI
// também não oferece nenhum jeito de editar, pra não sugerir que dá).
// Autorrelato do paciente, sem edição pelo profissional, de propósito —
// ver nota completa na migração da Fase 46.
function PatientClinicalWellbeingSummary({
  patientId,
}: {
  patientId: string;
}) {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [assessments, setAssessments] = useState<PsychometricAssessment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [entriesRes, assessmentsRes] = await Promise.all([
        supabase
          .from("mood_entries")
          .select("id, entry_date, mood_score, note, created_at")
          .eq("patient_id", patientId)
          .order("entry_date", { ascending: false })
          .limit(14),
        supabase
          .from("psychometric_assessments")
          .select(
            "id, scale, answers, total_score, severity, flagged, created_at",
          )
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (cancelled) return;
      setEntries((entriesRes.data as MoodEntry[]) ?? []);
      setAssessments((assessmentsRes.data as PsychometricAssessment[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const moodEmojis = ["😞", "🙁", "😐", "🙂", "😄"];
  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(`${iso}T00:00:00`));

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center text-muted-foreground py-8">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (entries.length === 0 && assessments.length === 0) return null;

  const flaggedAssessments = assessments.filter((a) => a.flagged);

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        {t("intersession.professionalTitle")}
      </h3>

      {flaggedAssessments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
          <p className="text-xs font-semibold text-red-700">
            {t("intersession.flaggedProfessionalNotice")}
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("intersession.moodTitle")}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {entries.map((e) => (
              <div
                key={e.id}
                title={e.note ?? ""}
                className="flex flex-col items-center gap-0.5 bg-secondary rounded-lg px-2.5 py-1.5"
              >
                <span className="text-base leading-none">
                  {moodEmojis[e.mood_score - 1]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {dateLabel(e.entry_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {assessments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("intersession.scalesTitle")}
          </p>
          <div className="divide-y divide-border">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="py-2 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {t(`intersession.scaleName.${a.scale}`)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeStyles[a.severity] ?? ""}`}
                  >
                    {a.total_score} · {t(`intersession.severity.${a.severity}`)}
                  </span>
                  {a.flagged && (
                    <AlertTriangle size={13} className="text-red-600" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {dateLabel(a.created_at.slice(0, 10))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PatientDetail({
  patient,
  onBack,
  onEdit,
  onLinked,
}: {
  patient: Patient;
  onBack: () => void;
  onEdit: () => void;
  // Avisa quem chamou que o convite deu certo, pra atualizar o `patient`
  // que fica guardado lá em cima (`PatientsView.selected`) — sem isso, o
  // estado local `justInvited` aqui dentro escondia o problema enquanto a
  // tela ficava montada, mas ao sair e voltar pra cá o `patient.patient_
  // user_id` recebido de novo continuava o antigo (null), voltando a
  // mostrar "não vinculado" mesmo já tendo vinculado no banco.
  onLinked?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<
    "success" | "error" | null
  >(null);
  const [inviteErrorDetail, setInviteErrorDetail] = useState<string | null>(
    null,
  );
  const [justInvited, setJustInvited] = useState(false);
  const [lastAction, setLastAction] = useState<"invite" | "resend" | null>(
    null,
  );
  // Fase 54 — exportação completa do prontuário (Resolução CFP Nº
  // 004/2019), pra atender o direito de acesso/portabilidade sem depender
  // de pedir isso manualmente ao suporte.
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("appointments")
      .select("id, starts_at, status")
      .eq("patient_id", patient.id)
      .order("starts_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setAppointments((data as PatientAppointment[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  const hasAccess = !!patient.patient_user_id || justInvited;

  const handleInvite = async () => {
    setInviting(true);
    setInviteResult(null);
    setInviteErrorDetail(null);
    setLastAction("invite");
    try {
      await apiFetch(`/patients/${patient.id}/invite`, { method: "POST" });
      setJustInvited(true);
      setInviteResult("success");
      onLinked?.();
    } catch (err: any) {
      // apiFetch throws Error(await r.text()) — the body is usually JSON
      // like {"error":"..."} from our backend, but could also be plain text
      // (e.g. "Not Found" if the function route isn't deployed yet). Try to
      // pull out the human-readable message either way, and log the raw
      // thing to the console so it's inspectable even if we can't parse it.
      const raw = err?.message ?? "";
      console.error("Falha ao convidar paciente:", raw);
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) detail = parsed.error;
      } catch {
        // not JSON — use the raw text as-is
      }
      setInviteErrorDetail(detail || null);
      setInviteResult("error");
    } finally {
      setInviting(false);
    }
  };

  // Covers the case where the patient already has an account linked
  // (patient_user_id set) but never actually got in — e.g. the original
  // invite e-mail expired before they set a password. Resending a fresh
  // "invite" isn't possible once the account exists (the Admin API treats
  // that e-mail as already registered), so this uses Supabase's standard
  // password-reset e-mail instead, which works for any existing account,
  // set up or not — see the backend comment on /resend-access.
  const handleResend = async () => {
    setInviting(true);
    setInviteResult(null);
    setInviteErrorDetail(null);
    setLastAction("resend");
    try {
      await apiFetch(`/patients/${patient.id}/resend-access`, {
        method: "POST",
      });
      setInviteResult("success");
    } catch (err: any) {
      const raw = err?.message ?? "";
      console.error("Falha ao reenviar acesso:", raw);
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) detail = parsed.error;
      } catch {
        // not JSON — use the raw text as-is
      }
      setInviteErrorDetail(detail || null);
      setInviteResult("error");
    } finally {
      setInviting(false);
    }
  };

  // Fase 54 — exportação completa do prontuário. Só o próprio profissional
  // dono do paciente chega até aqui (a rota confere de novo no backend,
  // não confia só em quem renderizou o botão).
  const handleExportJson = async () => {
    setExportingJson(true);
    setExportError(false);
    try {
      const data = await apiFetch(`/patients/${patient.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prontuario-${patient.full_name.replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Falha ao exportar prontuário (JSON):", err);
      setExportError(true);
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setExportError(false);
    try {
      const data = (await apiFetch(`/patients/${patient.id}/export`)) as any;
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) {
        setExportError(true);
        return;
      }
      const escapeHtml = (s: string) =>
        String(s ?? "").replace(/[&<>\x22\x27]/g, (c) => {
          switch (c) {
            case "&":
              return "&amp;";
            case "<":
              return "&lt;";
            case ">":
              return "&gt;";
            case '"':
              return "&quot;";
            case "'":
              return "&#39;";
            default:
              return c;
          }
        });
      const fmtDate = (iso: string) =>
        iso
          ? new Intl.DateTimeFormat(i18n.language, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(iso))
          : "—";

      const recordsHtml = (data.clinical_records ?? [])
        .map(
          (r: any) => `
        <div class="record">
          <h3>${fmtDate(r.session_date)}${r.locked_at ? ` · ${escapeHtml(t("patients.export.signed"))}` : ""}</h3>
          <p class="label">${escapeHtml(t("patients.export.sharedNotes"))}</p>
          <p class="content">${escapeHtml(r.shared_notes || "—")}</p>
          <p class="label">${escapeHtml(t("patients.export.privateNotes"))}</p>
          <p class="content">${escapeHtml(r.private_notes || "—")}</p>
          ${
            (r.amendments ?? []).length
              ? `<p class="label">${escapeHtml(t("records.amendments.title"))}</p>` +
                (r.amendments ?? [])
                  .map(
                    (a: any) =>
                      `<p class="content">${fmtDate(a.created_at)}: ${escapeHtml(a.content)}</p>`,
                  )
                  .join("")
              : ""
          }
        </div>`,
        )
        .join("");

      const documentsHtml = (data.documents ?? [])
        .map(
          (d: any) => `
        <div class="record">
          <h3>${escapeHtml(t(`records.documents.types.${d.doc_type}`))} · ${fmtDate(d.created_at)}</h3>
          <p class="content">${escapeHtml(d.content)}</p>
        </div>`,
        )
        .join("");

      win.document.write(`<!doctype html>
<html lang="${i18n.language}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t("patients.export.pdfTitle", { name: patient.full_name }))}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; padding: 48px; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
  h2 { font-size: 15px; font-weight: 600; margin: 28px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  h3 { font-size: 13px; font-weight: 600; margin: 16px 0 4px; }
  .muted { color: #6b7280; font-size: 12px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin: 8px 0 2px; }
  .content { font-size: 13px; white-space: pre-wrap; margin: 0 0 4px; }
  .record { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #e5e7eb; }
  .print-bar { position: sticky; top: 0; background: #fff; padding: 12px 0; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
  .print-bar button { font-family: inherit; font-size: 13px; padding: 8px 16px; border-radius: 999px; border: 1px solid #1f2937; background: #1f2937; color: #fff; cursor: pointer; }
  @media print { .print-bar { display: none; } }
</style>
</head>
<body>
  <div class="print-bar"><button onclick="window.print()">${escapeHtml(t("patients.export.printButton"))}</button></div>
  <h1>${escapeHtml(t("patients.export.pdfTitle", { name: patient.full_name }))}</h1>
  <p class="muted">${escapeHtml(t("patients.export.generatedAt", { date: fmtDate(data.exported_at) }))}</p>
  <h2>${escapeHtml(t("patients.export.sessionsSection"))}</h2>
  ${recordsHtml || `<p class="muted">${escapeHtml(t("patients.export.emptySection"))}</p>`}
  <h2>${escapeHtml(t("patients.export.documentsSection"))}</h2>
  ${documentsHtml || `<p class="muted">${escapeHtml(t("patients.export.emptySection"))}</p>`}
</body>
</html>`);
      win.document.close();
    } catch (err) {
      console.error("Falha ao exportar prontuário (PDF):", err);
      setExportError(true);
    } finally {
      setExportingPdf(false);
    }
  };

  const dateTimeLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ChevronLeft size={16} /> {t("patients.backToList")}
      </button>

      <div className="bg-card border border-border rounded-2xl p-8 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2
              className="text-2xl font-light text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {patient.full_name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {patient.email || patient.phone
                ? [patient.email, patient.phone].filter(Boolean).join(" · ")
                : t("patients.detail.noContact")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${patient.status === "active" ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}
            >
              {patient.status === "active"
                ? t("patients.statusActive")
                : t("patients.statusInactive")}
            </span>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>

        {patient.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {patient.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground leading-relaxed">
          {patient.notes || t("patients.detail.noNotes")}
        </p>
      </div>

      {/* Fase 40 — contato de emergência. */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {t("patients.detail.emergencyContactTitle")}
        </h3>
        {patient.emergency_contact_name || patient.emergency_contact_phone ? (
          <p className="text-sm text-foreground">
            {[patient.emergency_contact_name, patient.emergency_contact_phone]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("patients.detail.emergencyContactEmpty")}
          </p>
        )}
      </div>

      {/* Fase 52 — dados do responsável legal, só quando o paciente está
          marcado como menor de idade. */}
      {patient.is_minor && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t("patients.detail.guardianTitle")}
          </h3>
          <p className="text-sm text-foreground">
            {[
              patient.guardian_name,
              patient.guardian_relationship,
              patient.guardian_contact,
            ]
              .filter(Boolean)
              .join(" · ") || t("patients.detail.guardianEmpty")}
          </p>
        </div>
      )}

      {/* Fase 54 — exportação completa do prontuário (Resolução CFP Nº
          004/2019). */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {t("patients.export.title")}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("patients.export.hint")}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJson}
            disabled={exportingJson}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-secondary transition-colors disabled:opacity-60"
          >
            {exportingJson ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {t("patients.export.jsonButton")}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-secondary transition-colors disabled:opacity-60"
          >
            {exportingPdf ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            {t("patients.export.pdfButton")}
          </button>
        </div>
        {exportError && (
          <p className="text-red-500 text-xs mt-3">
            {t("patients.export.error")}
          </p>
        )}
      </div>

      <div className="mb-6">
        <PatientClinicalWellbeingSummary patientId={patient.id} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {t("patients.access.title")}
        </h3>
        {hasAccess ? (
          <div>
            <p className="text-sm text-green-700 flex items-center gap-2 mb-3">
              <Check size={14} /> {t("patients.access.linked")}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {t("patients.access.resendHint")}
            </p>
            <button
              onClick={handleResend}
              disabled={inviting || !patient.email}
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-full text-xs font-semibold hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {inviting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Users size={13} />
              )}
              {inviting
                ? t("patients.access.inviting")
                : t("patients.access.resendButton")}
            </button>
            {inviteResult === "error" && (
              <p className="text-red-500 text-xs mt-2">
                {t("patients.access.resendError")}
                {inviteErrorDetail ? ` (${inviteErrorDetail})` : ""}
              </p>
            )}
          </div>
        ) : !patient.email ? (
          <p className="text-sm text-muted-foreground">
            {t("patients.access.notLinkedNoEmail")}
          </p>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {t("patients.access.notLinked")}
            </p>
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {inviting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Users size={13} />
              )}
              {inviting
                ? t("patients.access.inviting")
                : t("patients.access.inviteButton")}
            </button>
            {inviteResult === "error" && (
              <p className="text-red-500 text-xs mt-2">
                {t("patients.access.inviteError")}
                {inviteErrorDetail ? ` (${inviteErrorDetail})` : ""}
              </p>
            )}
          </div>
        )}
        {inviteResult === "success" && (
          <p className="text-green-700 text-xs mt-2">
            {lastAction === "resend"
              ? t("patients.access.resendSuccess")
              : t("patients.access.inviteSuccess")}
          </p>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {t("patients.detail.historyTitle")}
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-3">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-sm">
              {t("patients.detail.historyEmpty")}
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              {t("patients.detail.historyEmptyHint")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <span className="text-sm text-foreground">
                  {dateTimeLabel(appt.starts_at)}
                </span>
                <span className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
                  {t(`dashboard.appointmentStatus.${appt.status}`)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vincular conta já existente (Fase 21) ─────────────────────────────────
// Conceder um papel pela aba Admin → Usuários (Fase 18) só marca
// `profiles.role` — de propósito não vincula a nenhum profissional/
// clínica, porque essa decisão é de cada clínica, não do admin geral. Este
// modal é o que fecha essa ponta: o próprio profissional (paciente) ou
// dono da clínica (secretária) reivindica a conta pelo e-mail. Reutilizado
// nos dois contextos — só muda o endpoint e os textos.
function LinkAccountModal({
  title,
  subtitle,
  endpoint,
  onLinked,
  onClose,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  onLinked: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      onLinked();
    } catch (err: any) {
      const raw = err?.message ?? "";
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) detail = parsed.error;
      } catch {
        // not JSON — use the raw text as-is
      }
      setError(
        detail === "plan_patient_limit_reached"
          ? t("linkAccount.patientLimitError")
          : detail === "secretary_requires_business_plan"
            ? t("clinicSettings.secretary.planRequired")
            : detail === "professional_requires_business_plan"
              ? t("clinicSettings.professionals.planRequired")
              : detail || t("linkAccount.genericError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("linkAccount.emailPlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            autoFocus
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex items-center gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
            >
              {t("linkAccount.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="text-xs font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? t("linkAccount.linking") : t("linkAccount.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PatientsView({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new" | "edit" | "detail">(
    "list",
  );
  const [selected, setSelected] = useState<Patient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  // Fase 26 — lista de profissionais da clínica, pro seletor de "psicólogo
  // responsável" no formulário (só aparece de verdade quando há mais de um
  // — ver `PatientForm`). Clínicas com um psicólogo só continuam exatamente
  // como antes.
  const [clinicProfessionals, setClinicProfessionals] = useState<
    { id: string; name: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("patients")
      .select(
        "id, full_name, email, phone, notes, tags, status, created_at, patient_user_id, professional_id, emergency_contact_name, emergency_contact_phone, is_minor, guardian_name, guardian_relationship, guardian_contact, cpf",
      )
      .eq("professional_id", user.id)
      .order("full_name", { ascending: true });
    if (err) {
      setError(true);
    } else {
      setPatients((data as Patient[]) ?? []);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user.clinicId) return;
      const { data } = await supabase
        .from("professionals")
        .select("id, profiles(full_name)")
        .eq("clinic_id", user.clinicId)
        .eq("approved", true);
      if (cancelled) return;
      setClinicProfessionals(
        ((data ?? []) as any[]).map((p) => ({
          id: p.id,
          name: p.profiles?.full_name || "—",
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user.clinicId]);

  const handleSave = async (data: Partial<Patient>) => {
    if (view === "edit" && selected) {
      const { error: err } = await supabase
        .from("patients")
        .update(data)
        .eq("id", selected.id);
      if (err) throw err;
    } else {
      const { error: err } = await supabase.from("patients").insert({
        ...data,
        professional_id: data.professional_id ?? user.id,
      });
      if (err) throw err;
    }
    await load();
    setView("list");
    setSelected(null);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(false);
    const { error: err } = await supabase
      .from("patients")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Falha ao excluir paciente:", err);
      setDeleteError(true);
      return;
    }
    setDeleteId(null);
    setView("list");
    setSelected(null);
    await load();
  };

  const allTags = Array.from(
    new Set(patients.flatMap((p) => p.tags)),
  ).sort();

  const filtered = patients.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (tagFilter && !p.tags.includes(tagFilter)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [p.full_name, p.email, p.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (view === "detail" && selected) {
    return (
      <PatientDetail
        patient={selected}
        onBack={() => {
          setView("list");
          setSelected(null);
        }}
        onEdit={() => setView("edit")}
        onLinked={async () => {
          // Rebusca só este paciente (não dá pra confiar no array `patients`
          // capturado neste closure — `load()` atualiza o estado de forma
          // assíncrona, então lê-lo logo em seguida ainda pegaria o valor
          // antigo) e atualiza tanto a seleção atual quanto a lista.
          const { data } = await supabase
            .from("patients")
            .select(
              "id, full_name, email, phone, notes, tags, status, created_at, patient_user_id, professional_id",
            )
            .eq("id", selected.id)
            .maybeSingle();
          if (data) {
            const fresh = data as Patient;
            setSelected(fresh);
            setPatients((prev) =>
              prev.map((p) => (p.id === fresh.id ? fresh : p)),
            );
          }
        }}
      />
    );
  }

  if (view === "new" || view === "edit") {
    return (
      <div>
        <button
          onClick={() => {
            setView(selected ? "detail" : "list");
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} />{" "}
          {selected ? t("patients.detail.editPatient") : t("patients.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {view === "edit" ? t("patients.editTitle") : t("patients.newTitle")}
        </h2>
        <div className="bg-card border border-border rounded-2xl p-8">
          <PatientForm
            initial={selected}
            onSave={handleSave}
            onCancel={() => setView(selected ? "detail" : "list")}
            professionals={clinicProfessionals}
            defaultProfessionalId={selected?.professional_id ?? user.id}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("patients.searchPlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 bg-secondary text-foreground border border-border px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-secondary/80 transition-colors"
          >
            <LinkIcon size={16} /> {t("linkAccount.patientButton")}
          </button>
          <button
            onClick={() => {
              setSelected(null);
              setView("new");
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> {t("patients.newPatient")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(["all", "active", "inactive"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
          >
            {s === "all"
              ? t("patients.filterAll")
              : s === "active"
                ? t("patients.filterActive")
                : t("patients.filterInactive")}
          </button>
        ))}
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground bg-transparent outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
          >
            <option value="">{t("patients.tagFilterAll")}</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" /> {t("patients.loading")}
        </div>
      ) : error ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          {t("patients.errorLoading")}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-semibold text-foreground mb-2">
            {t("patients.emptyTitle")}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            {t("patients.emptyText")}
          </p>
          <button
            onClick={() => {
              setSelected(null);
              setView("new");
            }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> {t("patients.emptyCta")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold text-foreground mb-2">
            {t("patients.noResultsTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("patients.noResultsText")}
          </p>
        </div>
      ) : (
        // Fase 59 — um único cartão com linhas divididas (em vez de um
        // cartão com sombra por paciente), igual ao container de lista da
        // referência do Figma. O clique continua abrindo a página de
        // detalhe completa (prontuário, documentos, financeiro, exportação
        // etc.) — a referência usa um painel lateral só com notas, mas isso
        // aqui é muito mais rico pra caber num painel estreito sem perder
        // funcionalidade.
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                setView("detail");
              }}
              className="w-full text-left flex items-center gap-4 p-4 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center text-sm font-semibold text-primary">
                {p.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm truncate">
                    {p.full_name}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}
                  >
                    {p.status === "active"
                      ? t("patients.statusActive")
                      : t("patients.statusInactive")}
                  </span>
                </div>
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {p.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {p.tags.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{p.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(p.id);
                  }}
                  className="p-2 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors text-muted-foreground hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={18} className="text-muted-foreground/40" />
              </div>
            </button>
          ))}
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("patients.deleteTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("patients.deleteBody")}
            </p>
            {deleteError && (
              <p className="text-red-500 text-xs mb-4">
                {t("patients.deleteError")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteError(false);
                }}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("patients.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("patients.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <LinkAccountModal
          title={t("linkAccount.patientTitle")}
          subtitle={t("linkAccount.patientSubtitle")}
          endpoint="/patients/link-existing"
          onLinked={() => {
            setShowLinkModal(false);
            load();
          }}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  );
}

// ─── Agenda (Fase 5) ────────────────────────────────────────────────────────────
// Scheduling for a logged-in psychologist: day/week list views, create/edit/
// cancel/reschedule appointments tied to an existing patient, and quick
// status actions (confirm, complete, cancel, no-show) — these are what feed
// the "sessions this month" / "no-show rate" KPIs on the overview panel.
// Full calendar-grid UI and Google Calendar sync are left for a later fase;
// this covers the actual day-to-day booking workflow.

type Appointment = {
  id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  recurrence_rule: string | null;
  patients?: { full_name: string } | null;
};

type PatientOption = { id: string; full_name: string };

// Fase 44 — teleconsulta via Jitsi Meet público, sem custo e sem credencial
// nenhuma pra configurar (opção escolhida em vez de um provedor pago). O
// nome da sala é derivado direto do id da consulta (UUID, mesmo pra
// paciente e profissional chegarem na mesma sala) — sem coluna nova no
// banco, sem geração de link em nenhum outro lugar. Proteção só pelo nome
// da sala (ninguém entra sem saber o UUID da consulta), sem senha extra,
// como avisado e aceito na escolha desta abordagem.
const jitsiRoomUrl = (appointmentId: string) =>
  `https://meet.jit.si/ConecPsi-${appointmentId.replace(/-/g, "")}`;

// Fase 50 — log de auditoria (ver nota completa na migração). Sempre
// "melhor esforço": se o log falhar, a ação principal (salvar/excluir/
// assinar o registro) já aconteceu e não deve ser desfeita por causa
// disso — só registra o erro no console.
const logAudit = async (
  action: "create" | "update" | "delete" | "lock" | "export",
  resourceType: "clinical_record" | "psychological_document",
  resourceId: string,
  patientId?: string | null,
) => {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    patient_id: patientId ?? null,
  });
  if (error) console.error("Falha ao registrar log de auditoria:", error);
};

// Fase 46 — módulo inter-sessões: diário de humor + escalas psicométricas
// padronizadas (PHQ-9 e GAD-7, ambas de domínio público — desenvolvidas
// pela Pfizer e de uso livre). Perguntas e opções vêm de i18n (chaves
// `assessments.*`), só a estrutura (quantidade de itens, pontuação, faixas
// de gravidade) fica fixa aqui.
type MoodEntry = {
  id: string;
  entry_date: string;
  mood_score: number;
  note: string | null;
  created_at: string;
};

type PsychometricAssessment = {
  id: string;
  scale: "phq9" | "gad7";
  answers: number[];
  total_score: number;
  severity: string;
  flagged: boolean;
  created_at: string;
};

const ASSESSMENT_QUESTION_COUNT: Record<"phq9" | "gad7", number> = {
  phq9: 9,
  gad7: 7,
};

// Faixas de gravidade padrão publicadas dos dois instrumentos.
const severityForScore = (scale: "phq9" | "gad7", score: number): string => {
  if (scale === "phq9") {
    if (score <= 4) return "minimal";
    if (score <= 9) return "mild";
    if (score <= 14) return "moderate";
    if (score <= 19) return "moderatelySevere";
    return "severe";
  }
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  return "severe";
};

const severityBadgeStyles: Record<string, string> = {
  minimal: "bg-green-100 text-green-700",
  mild: "bg-yellow-100 text-yellow-700",
  moderate: "bg-orange-100 text-orange-700",
  moderatelySevere: "bg-red-100 text-red-700",
  severe: "bg-red-100 text-red-700",
};

const toDateInputValue = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toTimeInputValue = (d: Date) => {
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
};

const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (d: Date, n: number) => {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
};

// Fase 27 — grade de semanas completas ao redor de um mês (segunda a
// domingo), usada pelo modo "mês" da agenda. Extraída como helper
// compartilhado porque tanto `AgendaView` (profissional) quanto
// `SecretaryAgendaView` (Fase 27.1 — mesma visualização pra secretária)
// precisam do mesmo cálculo, e duplicar essa lógica de datas em dois
// lugares é como esse tipo de bug de calendário mais fácil escapa (mês com
// 6 semanas visíveis vs. 5, por exemplo).
const getMonthGridRange = (anchorDate: Date) => {
  const monthStart = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    1,
  );
  const monthEndExclusive = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth() + 1,
    1,
  );
  const gridStart = startOfWeek(monthStart);
  const gridDays =
    Math.ceil(
      (monthEndExclusive.getTime() - gridStart.getTime()) /
        (24 * 60 * 60 * 1000),
    ) <= 35
      ? 35
      : 42;
  const gridEnd = addDays(gridStart, gridDays);
  return { gridStart, gridDays, gridEnd };
};

// Fase 30 — mini calendário (seletor de data avulso), usado como atalho pra
// pular direto pra qualquer dia na Agenda, sem depender só das setas
// anterior/próximo. Fica separado da grade grande do modo "mês" (que mostra
// as consultas de cada dia) — este aqui é só um popover compacto de
// navegação, então tem seu próprio cursor de mês independente do
// `anchorDate` da tela, pra não bagunçar o intervalo de dados já carregado
// enquanto a pessoa navega pra escolher a data.
function MiniCalendar({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const { i18n } = useTranslation();
  const [cursor, setCursor] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1),
  );

  useEffect(() => {
    setCursor(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value.getFullYear(), value.getMonth()]);

  const { gridStart, gridDays } = getMonthGridRange(cursor);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-xl w-64">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-foreground capitalize">
          {new Intl.DateTimeFormat(i18n.language, {
            month: "long",
            year: "numeric",
          }).format(cursor)}
        </span>
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors rotate-180"
        >
          <ChevronLeft size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="text-center text-[0.6rem] font-semibold uppercase text-muted-foreground"
          >
            {new Intl.DateTimeFormat(i18n.language, {
              weekday: "narrow",
            }).format(addDays(gridStart, i))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: gridDays }).map((_, i) => {
          const day = addDays(gridStart, i);
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const isToday = day.getTime() === today.getTime();
          const isSelected =
            day.getFullYear() === value.getFullYear() &&
            day.getMonth() === value.getMonth() &&
            day.getDate() === value.getDate();
          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                onChange(
                  new Date(day.getFullYear(), day.getMonth(), day.getDate()),
                )
              }
              className={`text-xs h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isToday
                    ? "border border-primary text-primary font-semibold"
                    : isCurrentMonth
                      ? "text-foreground hover:bg-secondary"
                      : "text-muted-foreground/40 hover:bg-secondary"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Fase 30.1 — grade de horários (estética de calendário tipo Google
// Calendar/Notion Calendar) pros modos "dia" e "semana" da Agenda, que
// antes eram só listas de cards empilhados sem noção visual de horário.
// Cabeçalho dos dias (`sticky top-0`, dentro do próprio contêiner de
// rolagem) e coluna de horas (`sticky left-0`) ficam sempre visíveis
// enquanto rola — é o "calendário fixo" pedido. Compartilhada entre
// `AgendaView` (profissional) e `SecretaryAgendaView`, que usam formatos de
// consulta ligeiramente diferentes (`Appointment` vs. `SecretaryAppointmentRow`)
// mas com os mesmos campos de data/status/paciente usados aqui.
const AGENDA_HOURS = Array.from({ length: 24 }, (_, i) => i);
const AGENDA_ROW_H = 56;
const AGENDA_BLOCK_STYLES: Record<string, string> = {
  scheduled: "bg-secondary text-muted-foreground border-border",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200 line-through",
  no_show: "bg-amber-50 text-amber-700 border-amber-200",
};

const agendaMinutesFromMidnight = (d: Date) => d.getHours() * 60 + d.getMinutes();

function CalendarGrid<
  T extends {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    patients?: { full_name: string } | null;
  },
>({
  days,
  appointments,
  onSelect,
}: {
  days: Date[];
  appointments: T[];
  onSelect: (a: T) => void;
}) {
  const { i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * AGENDA_ROW_H;
  }, []);

  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      <div className="flex border-b border-border">
        <div className="w-14 shrink-0" />
        {days.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div
              key={i}
              className={`flex-1 min-w-0 text-center py-2.5 border-l border-border ${isToday ? "bg-primary/5" : ""}`}
            >
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {new Intl.DateTimeFormat(i18n.language, {
                  weekday: "short",
                }).format(day)}
              </p>
              <p className="mt-0.5">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}
                >
                  {day.getDate()}
                </span>
              </p>
            </div>
          );
        })}
      </div>
      <div ref={scrollRef} className="flex overflow-y-auto max-h-[560px]">
        <div className="w-14 shrink-0 sticky left-0 bg-card z-10">
          {AGENDA_HOURS.map((h) => (
            <div
              key={h}
              style={{ height: AGENDA_ROW_H }}
              className="border-t border-border first:border-t-0 text-[0.6rem] text-muted-foreground px-1.5 pt-1"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((day, i) => {
          const dayAppts = appointments.filter((a) => {
            const d = new Date(a.starts_at);
            return (
              d.getFullYear() === day.getFullYear() &&
              d.getMonth() === day.getMonth() &&
              d.getDate() === day.getDate()
            );
          });
          return (
            <div
              key={i}
              className="flex-1 min-w-0 relative border-l border-border"
              style={{ height: AGENDA_ROW_H * 24 }}
            >
              {AGENDA_HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: AGENDA_ROW_H }}
                  className="border-t border-border first:border-t-0"
                />
              ))}
              {dayAppts.map((a) => {
                const start = new Date(a.starts_at);
                const end = new Date(a.ends_at);
                const top =
                  (agendaMinutesFromMidnight(start) / 60) * AGENDA_ROW_H;
                const height = Math.max(
                  ((agendaMinutesFromMidnight(end) -
                    agendaMinutesFromMidnight(start)) /
                    60) *
                    AGENDA_ROW_H,
                  22,
                );
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    style={{ top, height }}
                    className={`absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-left text-[0.65rem] leading-tight font-medium overflow-hidden border hover:brightness-95 transition-[filter] ${AGENDA_BLOCK_STYLES[a.status] ?? "bg-secondary text-muted-foreground border-border"}`}
                  >
                    <span className="block truncate font-semibold">
                      {timeLabel(a.starts_at)}
                    </span>
                    <span className="block truncate">
                      {a.patients?.full_name ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Interpreta um valor monetário digitado livremente, aceitando tanto o
// formato pt-BR ("1.500,00") quanto o formato en-US ("1,500.00") — o app
// só trocava vírgula por ponto antes (`Number(amount.replace(",", "."))`),
// então qualquer valor com separador de milhar virava NaN silenciosamente
// (ex.: "1.500,00" virava "1.500.00"). Quando os dois separadores aparecem,
// o que vem por último é o decimal; quando só um aparece, um grupo de 3
// dígitos no final é tratado como separador de milhar, não decimal.
const parseLocalizedAmount = (raw: string): number => {
  let s = raw.trim().replace(/[^0-9.,-]/g, "");
  if (!s) return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    const last = parts[parts.length - 1];
    s =
      parts.length > 2 || last.length === 3
        ? s.replace(/,/g, "")
        : s.replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    if (parts.length > 2 || last.length === 3) {
      s = s.replace(/\./g, "");
    }
  }
  return Number(s);
};

function AppointmentForm({
  initial,
  patients,
  defaultDate,
  onSave,
  onCancel,
}: {
  initial?: Appointment | null;
  patients: PatientOption[];
  defaultDate: Date;
  onSave: (data: {
    patient_id: string;
    starts_at: string;
    ends_at: string;
    notes: string | null;
    recurrenceWeeks: number;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const initialStart = initial ? new Date(initial.starts_at) : defaultDate;
  const initialEnd = initial
    ? new Date(initial.ends_at)
    : new Date(defaultDate.getTime() + 50 * 60000);

  const [patientId, setPatientId] = useState(initial?.patient_id ?? "");
  const [date, setDate] = useState(toDateInputValue(initialStart));
  const [startTime, setStartTime] = useState(toTimeInputValue(initialStart));
  const [endTime, setEndTime] = useState(toTimeInputValue(initialEnd));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [recurrenceWeekly, setRecurrenceWeekly] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !date || !startTime || !endTime) {
      setError(t("agenda.fields.requiredError"));
      return;
    }
    const starts_at = new Date(`${date}T${startTime}:00`);
    const ends_at = new Date(`${date}T${endTime}:00`);
    if (ends_at.getTime() <= starts_at.getTime()) {
      setError(t("agenda.fields.invalidRangeError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        patient_id: patientId,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        notes: notes.trim() || null,
        recurrenceWeeks:
          !initial && recurrenceWeekly ? Math.max(1, recurrenceWeeks) : 1,
      });
    } catch {
      setError(t("agenda.fields.genericSaveError"));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("agenda.fields.patientLabel")}
        </label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        >
          <option value="">
            {t("agenda.fields.selectPatientPlaceholder")}
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("agenda.fields.dateLabel")}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("agenda.fields.startTimeLabel")}
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("agenda.fields.endTimeLabel")}
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("agenda.fields.notesLabel")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("agenda.fields.notesPlaceholder")}
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
        />
      </div>

      {!initial && (
        <div>
          <label className="flex items-center gap-2 text-sm text-foreground mb-3">
            <input
              type="checkbox"
              checked={recurrenceWeekly}
              onChange={(e) => setRecurrenceWeekly(e.target.checked)}
              className="rounded border-border"
            />
            {t("agenda.fields.recurrenceWeekly")}
          </label>
          {recurrenceWeekly && (
            <div className="max-w-[220px]">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("agenda.fields.recurrenceWeeksLabel")}
              </label>
              <input
                type="number"
                min={2}
                max={12}
                value={recurrenceWeeks}
                onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          {t("agenda.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {initial
            ? t("agenda.fields.saveEdit")
            : t("agenda.fields.saveNew")}
        </button>
      </div>
    </form>
  );
}

function AgendaView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  // Fase 27 — modo "mês": grade visual de calendário, pedida como
  // alternativa aos modos "dia"/"semana" (que já existiam, mas só como
  // lista — nunca em formato de grade tradicional de calendário).
  const [mode, setMode] = useState<"day" | "week" | "month">("day");
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [recordedApptIds, setRecordedApptIds] = useState<Set<string>>(
    new Set(),
  );
  const [recordModalAppt, setRecordModalAppt] = useState<Appointment | null>(
    null,
  );
  const [actionError, setActionError] = useState(false);
  const [quickViewAppt, setQuickViewAppt] = useState<Appointment | null>(null);
  // Fase 45 — pedidos de remarcação pendentes, por id da consulta.
  const [rescheduleRequests, setRescheduleRequests] = useState<
    Record<string, RescheduleRequest>
  >({});
  const [reschedActioningId, setReschedActioningId] = useState<string | null>(
    null,
  );

  // A grade do mês mostra semanas completas (segunda a domingo) ao redor do
  // mês, então o intervalo buscado no banco é maior que só "dia 1 ao dia
  // 30" — inclui os dias do mês anterior/seguinte que aparecem esmaecidos
  // pra preencher a grade, senão eles ficariam sem consultas visíveis.
  const {
    gridStart: monthGridStart,
    gridDays: monthGridDays,
    gridEnd: monthGridEnd,
  } = getMonthGridRange(anchorDate);

  const rangeStart =
    mode === "day"
      ? anchorDate
      : mode === "week"
        ? startOfWeek(anchorDate)
        : monthGridStart;
  const rangeEnd =
    mode === "day"
      ? addDays(anchorDate, 1)
      : mode === "week"
        ? addDays(rangeStart, 7)
        : monthGridEnd;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [apptRes, patientsRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, patient_id, starts_at, ends_at, status, notes, recurrence_rule, patients(full_name)",
        )
        .eq("professional_id", user.id)
        .gte("starts_at", rangeStart.toISOString())
        .lt("starts_at", rangeEnd.toISOString())
        .order("starts_at", { ascending: true }),
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("professional_id", user.id)
        .order("full_name", { ascending: true }),
    ]);
    if (apptRes.error) {
      setError(true);
      setAppointments([]);
    } else {
      const apptList = (apptRes.data as any as Appointment[]) ?? [];
      setAppointments(apptList);
      const apptIds = apptList.map((a) => a.id);
      if (apptIds.length > 0) {
        const { data: recData } = await supabase
          .from("clinical_records")
          .select("appointment_id")
          .in("appointment_id", apptIds);
        setRecordedApptIds(
          new Set(
            ((recData as { appointment_id: string | null }[]) ?? [])
              .map((r) => r.appointment_id)
              .filter((id): id is string => !!id),
          ),
        );
        const { data: reschedData } = await supabase
          .from("appointment_reschedule_requests")
          .select(
            "id, appointment_id, requested_starts_at, requested_ends_at, message, status",
          )
          .eq("professional_id", user.id)
          .eq("status", "pending")
          .in("appointment_id", apptIds);
        const reschedMap: Record<string, RescheduleRequest> = {};
        ((reschedData as RescheduleRequest[]) ?? []).forEach((r) => {
          reschedMap[r.appointment_id] = r;
        });
        setRescheduleRequests(reschedMap);
      } else {
        setRecordedApptIds(new Set());
        setRescheduleRequests({});
      }
    }
    setPatients((patientsRes.data as PatientOption[]) ?? []);
    setLoading(false);
  }, [user.id, rangeStart.getTime(), rangeEnd.getTime()]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: {
    patient_id: string;
    starts_at: string;
    ends_at: string;
    notes: string | null;
    recurrenceWeeks: number;
  }) => {
    if (view === "edit" && selected) {
      const { error: err } = await supabase
        .from("appointments")
        .update({
          patient_id: data.patient_id,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          notes: data.notes,
        })
        .eq("id", selected.id);
      if (err) throw err;
    } else {
      const rows = Array.from({ length: data.recurrenceWeeks }).map(
        (_, i) => {
          const start = new Date(data.starts_at);
          const end = new Date(data.ends_at);
          start.setDate(start.getDate() + i * 7);
          end.setDate(end.getDate() + i * 7);
          return {
            professional_id: user.id,
            patient_id: data.patient_id,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            notes: data.notes,
            status: "scheduled",
            recurrence_rule: data.recurrenceWeeks > 1 ? "weekly" : null,
          };
        },
      );
      const { error: err } = await supabase.from("appointments").insert(rows);
      if (err) throw err;
    }
    await load();
    setView("list");
    setSelected(null);
  };

  const updateStatus = async (id: string, status: string) => {
    setActionError(false);
    const { error: err } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (err) {
      console.error("Falha ao atualizar status da consulta:", err);
      setActionError(true);
      return;
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    setActionError(false);
    const { error: err } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Falha ao excluir consulta:", err);
      setActionError(true);
      return;
    }
    setDeleteId(null);
    await load();
  };

  // Fase 45 — aceitar aplica a nova data/hora na consulta de verdade (e
  // zera `reminder_sent_at`, senão o lembrete por e-mail da Fase 34 acha
  // que já foi enviado pro horário antigo e não manda um novo pro horário
  // certo); recusar só fecha o pedido, sem mexer na consulta.
  const acceptReschedule = async (req: RescheduleRequest) => {
    setReschedActioningId(req.id);
    setActionError(false);
    const { error: apptErr } = await supabase
      .from("appointments")
      .update({
        starts_at: req.requested_starts_at,
        ends_at: req.requested_ends_at,
        reminder_sent_at: null,
      })
      .eq("id", req.appointment_id);
    if (apptErr) {
      console.error("Falha ao aplicar remarcação:", apptErr);
      setActionError(true);
      setReschedActioningId(null);
      return;
    }
    const { error: reqErr } = await supabase
      .from("appointment_reschedule_requests")
      .update({ status: "accepted", resolved_at: new Date().toISOString() })
      .eq("id", req.id);
    if (reqErr) {
      console.error("Falha ao marcar pedido de remarcação como aceito:", reqErr);
    }
    setQuickViewAppt(null);
    setReschedActioningId(null);
    await load();
  };

  const declineReschedule = async (req: RescheduleRequest) => {
    setReschedActioningId(req.id);
    setActionError(false);
    const { error: err } = await supabase
      .from("appointment_reschedule_requests")
      .update({ status: "declined", resolved_at: new Date().toISOString() })
      .eq("id", req.id);
    if (err) {
      console.error("Falha ao recusar remarcação:", err);
      setActionError(true);
    }
    setReschedActioningId(null);
    await load();
  };

  const dayLabel = (d: Date) =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    }).format(d);

  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const rangeLabel =
    mode === "day"
      ? dayLabel(anchorDate)
      : mode === "week"
        ? `${new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "2-digit" }).format(rangeStart)} – ${new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "2-digit" }).format(addDays(rangeStart, 6))}`
        : new Intl.DateTimeFormat(i18n.language, {
            month: "long",
            year: "numeric",
          }).format(anchorDate);

  const statusStyles: Record<string, string> = {
    scheduled: "bg-secondary text-muted-foreground",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-amber-100 text-amber-700",
  };

  if (view === "new" || view === "edit") {
    return (
      <div>
        <button
          onClick={() => {
            setView("list");
            setSelected(null);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} /> {t("agenda.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {view === "edit" ? t("agenda.editTitle") : t("agenda.newTitle")}
        </h2>
        {view === "edit" && selected?.recurrence_rule && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            {t("agenda.recurrenceOccurrenceHint")}
          </p>
        )}
        <div className="bg-card border border-border rounded-2xl p-8">
          <AppointmentForm
            initial={selected}
            patients={patients}
            defaultDate={anchorDate}
            onSave={handleSave}
            onCancel={() => {
              setView("list");
              setSelected(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Navegar por mês pula pelo NÚMERO DE MESES, não por uma contagem fixa de
  // dias (senão "próximo" a partir de 31/jan iria pra 3/mar em vez de
  // fevereiro) — sempre pousa no dia 1, já que no modo mês o dia exato
  // dentro do mês não importa pra grade mostrada.
  const navigate = (direction: 1 | -1) => {
    if (mode === "month") {
      setAnchorDate(
        new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1),
      );
    } else {
      setAnchorDate(addDays(anchorDate, direction * (mode === "day" ? 1 : 7)));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center capitalize">
            {rangeLabel}
          </span>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground rotate-180"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              setAnchorDate(d);
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
          >
            {t("agenda.today")}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarOpen((v) => !v)}
              title={t("agenda.pickDate")}
              className={`p-2 rounded-lg border transition-colors ${calendarOpen ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:bg-secondary"}`}
            >
              <CalendarDays size={16} />
            </button>
            {calendarOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setCalendarOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 z-30">
                  <MiniCalendar
                    value={anchorDate}
                    onChange={(d) => {
                      setAnchorDate(d);
                      setCalendarOpen(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border overflow-hidden text-xs font-medium">
            <button
              onClick={() => setMode("day")}
              className={`px-3 py-1.5 transition-colors ${mode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {t("agenda.dayView")}
            </button>
            <button
              onClick={() => setMode("week")}
              className={`px-3 py-1.5 transition-colors ${mode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {t("agenda.weekView")}
            </button>
            <button
              onClick={() => setMode("month")}
              className={`px-3 py-1.5 transition-colors ${mode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {t("agenda.monthView")}
            </button>
          </div>
          <button
            onClick={() => {
              setSelected(null);
              setView("new");
            }}
            disabled={patients.length === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> {t("agenda.newAppointment")}
          </button>
        </div>
      </div>

      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {t("agenda.actionError")}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" /> {t("agenda.loading")}
        </div>
      ) : error ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          {t("agenda.errorLoading")}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-semibold text-foreground mb-2">
            {t("agenda.noPatientsTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("agenda.noPatientsText")}
          </p>
        </div>
      ) : mode === "day" || mode === "week" ? (
        appointments.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground text-sm">
              {t("agenda.emptyDay")}
            </p>
          </div>
        ) : (
          <CalendarGrid
            days={
              mode === "day"
                ? [anchorDate]
                : Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))
            }
            appointments={appointments}
            onSelect={(a) => setQuickViewAppt(a)}
          />
        )
      ) : (
        // Fase 27 — grade de calendário do mês. Cada célula é um botão só
        // (não cada consulta individualmente) porque não cabe a ação
        // completa (confirmar/concluir/excluir etc.) num espaço tão
        // pequeno — clicar em qualquer parte do dia leva pro modo "dia",
        // onde as ações de verdade já existem.
        <div>
          <div className="grid grid-cols-7 gap-px bg-border border border-border">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="bg-secondary text-center text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground py-2"
              >
                {new Intl.DateTimeFormat(i18n.language, {
                  weekday: "short",
                }).format(addDays(monthGridStart, i))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border border border-t-0 border-border">
            {Array.from({ length: monthGridDays }).map((_, i) => {
              const day = addDays(monthGridStart, i);
              const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
              const today = new Date();
              const isToday =
                day.getFullYear() === today.getFullYear() &&
                day.getMonth() === today.getMonth() &&
                day.getDate() === today.getDate();
              const dayAppts = appointments
                .filter((a) => {
                  const d = new Date(a.starts_at);
                  return (
                    d.getFullYear() === day.getFullYear() &&
                    d.getMonth() === day.getMonth() &&
                    d.getDate() === day.getDate()
                  );
                })
                .sort(
                  (a, b) =>
                    new Date(a.starts_at).getTime() -
                    new Date(b.starts_at).getTime(),
                );
              const visible = dayAppts.slice(0, 3);
              const overflow = dayAppts.length - visible.length;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setAnchorDate(
                      new Date(
                        day.getFullYear(),
                        day.getMonth(),
                        day.getDate(),
                      ),
                    );
                    setMode("day");
                  }}
                  className={`w-full text-left bg-background p-2 min-h-[92px] flex flex-col gap-1 hover:bg-secondary transition-colors ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <span
                    className={`text-xs font-semibold shrink-0 ${isToday ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground" : "text-foreground"}`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {visible.map((a) => (
                      <span
                        key={a.id}
                        className={`text-[0.65rem] font-medium truncate px-1.5 py-0.5 rounded ${statusStyles[a.status] ?? "bg-secondary text-muted-foreground"}`}
                      >
                        {timeLabel(a.starts_at)}{" "}
                        {a.patients?.full_name ?? "—"}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span className="text-[0.65rem] text-muted-foreground px-1.5">
                        {t("agenda.monthMore", { count: overflow })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {quickViewAppt && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setQuickViewAppt(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {quickViewAppt.patients?.full_name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dayLabel(new Date(quickViewAppt.starts_at))} ·{" "}
                  {timeLabel(quickViewAppt.starts_at)} –{" "}
                  {timeLabel(quickViewAppt.ends_at)}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${statusStyles[quickViewAppt.status] ?? "bg-secondary text-muted-foreground"}`}
              >
                {t(`dashboard.appointmentStatus.${quickViewAppt.status}`)}
              </span>
            </div>
            {quickViewAppt.notes && (
              <p className="text-xs text-muted-foreground mt-3 bg-secondary rounded-lg px-3 py-2">
                {quickViewAppt.notes}
              </p>
            )}
            {rescheduleRequests[quickViewAppt.id] && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-800">
                  {t("agenda.reschedule.requestTitle")}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {new Intl.DateTimeFormat(i18n.language, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(
                    new Date(
                      rescheduleRequests[quickViewAppt.id].requested_starts_at,
                    ),
                  )}
                </p>
                {rescheduleRequests[quickViewAppt.id].message && (
                  <p className="text-xs text-amber-700/80 mt-1 italic">
                    “{rescheduleRequests[quickViewAppt.id].message}”
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() =>
                      acceptReschedule(rescheduleRequests[quickViewAppt.id])
                    }
                    disabled={
                      reschedActioningId ===
                      rescheduleRequests[quickViewAppt.id].id
                    }
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-green-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    <Check size={12} /> {t("agenda.reschedule.accept")}
                  </button>
                  <button
                    onClick={() =>
                      declineReschedule(rescheduleRequests[quickViewAppt.id])
                    }
                    disabled={
                      reschedActioningId ===
                      rescheduleRequests[quickViewAppt.id].id
                    }
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-60"
                  >
                    <X size={12} /> {t("agenda.reschedule.decline")}
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-5">
              <a
                href={jitsiRoomUrl(quickViewAppt.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                <Video size={13} /> {t("agenda.actions.joinVideo")}
              </a>
              <button
                onClick={() => {
                  setRecordModalAppt(quickViewAppt);
                  setQuickViewAppt(null);
                }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  recordedApptIds.has(quickViewAppt.id)
                    ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <FileText size={13} />
                {recordedApptIds.has(quickViewAppt.id)
                  ? t("agenda.actions.recordDone")
                  : t("agenda.actions.record")}
              </button>
              {quickViewAppt.status !== "confirmed" &&
                quickViewAppt.status !== "completed" && (
                  <button
                    onClick={async () => {
                      await updateStatus(quickViewAppt.id, "confirmed");
                      setQuickViewAppt(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Check size={13} /> {t("agenda.actions.confirm")}
                  </button>
                )}
              {quickViewAppt.status !== "completed" && (
                <button
                  onClick={async () => {
                    await updateStatus(quickViewAppt.id, "completed");
                    setQuickViewAppt(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                >
                  <Eye size={13} /> {t("agenda.actions.complete")}
                </button>
              )}
              {quickViewAppt.status !== "no_show" && (
                <button
                  onClick={async () => {
                    await updateStatus(quickViewAppt.id, "no_show");
                    setQuickViewAppt(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <AlertTriangle size={13} /> {t("agenda.actions.noShow")}
                </button>
              )}
              {quickViewAppt.status !== "cancelled" && (
                <button
                  onClick={async () => {
                    await updateStatus(quickViewAppt.id, "cancelled");
                    setQuickViewAppt(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <X size={13} /> {t("agenda.actions.cancelAppt")}
                </button>
              )}
              <button
                onClick={() => {
                  setSelected(quickViewAppt);
                  setView("edit");
                  setQuickViewAppt(null);
                }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Pencil size={13} /> {t("agenda.actions.edit")}
              </button>
              <button
                onClick={() => {
                  setDeleteId(quickViewAppt.id);
                  setQuickViewAppt(null);
                }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={13} /> {t("agenda.actions.delete")}
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setQuickViewAppt(null)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
              >
                {t("agenda.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("agenda.deleteTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("agenda.deleteBody")}
            </p>
            {appointments.find((a) => a.id === deleteId)?.recurrence_rule && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
                {t("agenda.recurrenceOccurrenceHint")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("agenda.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("agenda.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {recordModalAppt && (
        <SessionRecordModal
          appointment={recordModalAppt}
          patientName={recordModalAppt.patients?.full_name ?? "—"}
          sessionLabel={`${dayLabel(new Date(recordModalAppt.starts_at))} · ${timeLabel(recordModalAppt.starts_at)}`}
          professionalId={user.id}
          onClose={() => setRecordModalAppt(null)}
          onSaved={async () => {
            setRecordModalAppt(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ─── Prontuário / Clinical Records (Fase 6) ────────────────────────────────────
// Session notes and clinical evolution for a logged-in psychologist. Every
// record keeps two separate fields on purpose: `private_notes` (clinical
// evolution, hypotheses — never leaves this professional's view) and
// `shared_notes` (safe to eventually show the patient, once the patient
// area exists). The Fase 1 migration already enforces this at the database
// level — there is intentionally no RLS SELECT policy for role=patient on
// the base table, only a view exposing shared_notes — so this UI is just
// making that boundary visible and easy to use, not the thing enforcing it.

type ClinicalRecord = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  session_date: string;
  private_notes: string | null;
  shared_notes: string | null;
  created_at: string;
  // Fase 38 — trava/assinatura da sessão concluída: uma vez preenchido,
  // `locked_at` impede edição/exclusão (RLS reforça isso no banco também,
  // não é só uma trava de UI).
  locked_at: string | null;
  locked_by: string | null;
  patients?: { full_name: string } | null;
};

// Fase 49 — adendo a um registro já assinado (ver nota completa na
// migração).
type ClinicalRecordAmendment = {
  id: string;
  content: string;
  created_at: string;
};

// ─── Documentos psicológicos com IA (Fase 24) ──────────────────────────────
// Peça formal (relatório, encaminhamento, declaração, atestado), separada
// das anotações de sessão de `clinical_records`. O rascunho é gerado pela
// MESMA IA já usada em "Resumir"/"Organizar" (Groq, via `/ai/notes`) — aqui
// através de `/ai/documents` — nunca uma segunda integração inventada.
type DocType =
  | "psychological_report"
  | "referral"
  | "attendance_declaration"
  | "medical_certificate"
  // Fase 48 — laudo, parecer e TCI (Termo de Consentimento Informado),
  // peças com finalidade própria pela Resolução CFP Nº 06/2019, distintas
  // do relatório psicológico que já existia.
  | "psychological_appraisal"
  | "professional_opinion"
  | "informed_consent";

const DOC_TYPE_LIST: DocType[] = [
  "psychological_report",
  "referral",
  "attendance_declaration",
  "medical_certificate",
  "psychological_appraisal",
  "professional_opinion",
  "informed_consent",
];

function docTypeIcon(type: DocType, size = 14) {
  switch (type) {
    case "psychological_report":
      return <FileText size={size} />;
    case "referral":
      return <Send size={size} />;
    case "attendance_declaration":
      return <BadgeCheck size={size} />;
    case "medical_certificate":
      return <Stamp size={size} />;
    case "psychological_appraisal":
      return <ClipboardCheck size={size} />;
    case "professional_opinion":
      return <FileSignature size={size} />;
    case "informed_consent":
      return <Shield size={size} />;
  }
}

type PsychDocument = {
  id: string;
  patient_id: string;
  professional_id: string;
  doc_type: DocType;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  patients?: { full_name: string } | null;
};

type AppointmentOption = { id: string; starts_at: string };

function RecordForm({
  initial,
  patients,
  onSave,
  onCancel,
  onLock,
}: {
  initial?: ClinicalRecord | null;
  patients: PatientOption[];
  onSave: (data: {
    patient_id: string;
    appointment_id: string | null;
    session_date: string;
    private_notes: string | null;
    shared_notes: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  // Fase 38 — só passado quando faz sentido assinar (edição de um registro
  // já existente e ainda não travado); `RecordsView` decide isso, não este
  // formulário.
  onLock?: () => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const isLocked = !!initial?.locked_at;
  const [patientId, setPatientId] = useState(initial?.patient_id ?? "");
  const [appointmentId, setAppointmentId] = useState(
    initial?.appointment_id ?? "",
  );
  const [sessionDate, setSessionDate] = useState(
    initial?.session_date ?? toDateInputValue(new Date()),
  );
  const [privateNotes, setPrivateNotes] = useState(
    initial?.private_notes ?? "",
  );
  const [sharedNotes, setSharedNotes] = useState(initial?.shared_notes ?? "");
  const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState<"summarize" | "organize" | null>(
    null,
  );
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // Fase 49 — adendo a registro travado, no lugar do bypass do admin que
  // existia antes (ver nota completa na migração da Fase 49): acrescenta
  // sem reabrir/editar o conteúdo já assinado.
  const [amendments, setAmendments] = useState<ClinicalRecordAmendment[]>([]);
  const [amendmentsLoading, setAmendmentsLoading] = useState(false);
  const [newAmendment, setNewAmendment] = useState("");
  const [amendmentSaving, setAmendmentSaving] = useState(false);
  const [amendmentError, setAmendmentError] = useState(false);

  const loadAmendments = useCallback(async () => {
    if (!initial?.id) return;
    setAmendmentsLoading(true);
    const { data } = await supabase
      .from("clinical_record_amendments")
      .select("id, content, created_at")
      .eq("clinical_record_id", initial.id)
      .order("created_at", { ascending: true });
    setAmendments((data as ClinicalRecordAmendment[]) ?? []);
    setAmendmentsLoading(false);
  }, [initial?.id]);

  useEffect(() => {
    if (isLocked) loadAmendments();
  }, [isLocked, loadAmendments]);

  const submitAmendment = async () => {
    if (!initial?.id || !newAmendment.trim()) return;
    setAmendmentSaving(true);
    setAmendmentError(false);
    const { error: err } = await supabase
      .from("clinical_record_amendments")
      .insert({
        clinical_record_id: initial.id,
        content: newAmendment.trim(),
      });
    if (err) {
      console.error("Falha ao salvar adendo:", err);
      setAmendmentError(true);
    } else {
      setNewAmendment("");
      await loadAmendments();
    }
    setAmendmentSaving(false);
  };

  const runAi = async (action: "summarize" | "organize") => {
    if (!privateNotes.trim()) return;
    setAiLoading(action);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await apiFetch("/ai/notes", {
        method: "POST",
        body: JSON.stringify({ action, text: privateNotes }),
      });
      setAiResult(res.result as string);
    } catch (err: any) {
      const raw = err?.message ?? "";
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) detail = parsed.error;
      } catch {
        // not JSON — use the raw text as-is
      }
      // Recurso de IA é exclusivo dos planos pagos (Fase 16) — mensagem de
      // upsell específica em vez do erro genérico.
      setAiError(
        detail === "ai_requires_paid_plan"
          ? t("records.ai.requiresPaidPlan")
          : detail || t("records.ai.genericError"),
      );
    } finally {
      setAiLoading(null);
    }
  };

  useEffect(() => {
    if (!patientId) {
      setAppointments([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("appointments")
      .select("id, starts_at")
      .eq("patient_id", patientId)
      .order("starts_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) setAppointments((data as AppointmentOption[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !sessionDate) {
      setError(t("records.fields.requiredError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        patient_id: patientId,
        appointment_id: appointmentId || null,
        session_date: sessionDate,
        private_notes: privateNotes.trim() || null,
        shared_notes: sharedNotes.trim() || null,
      });
    } catch {
      setError(t("records.fields.genericSaveError"));
      setSaving(false);
    }
  };

  const handleLockClick = async () => {
    if (!onLock) return;
    setLocking(true);
    setLockError("");
    try {
      await onLock();
    } catch {
      setLockError(t("records.lock.error"));
    } finally {
      setLocking(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isLocked && (
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
          <Lock size={14} className="shrink-0" />
          {t("records.lock.lockedBanner", {
            date: new Intl.DateTimeFormat(i18n.language, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(initial!.locked_at as string)),
          })}
        </div>
      )}

      {isLocked && (
        <div className="bg-secondary/50 border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("records.amendments.title")}
          </p>
          {amendmentsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
              <Loader2 size={12} className="animate-spin" />
            </div>
          ) : amendments.length === 0 ? (
            <p className="text-xs text-muted-foreground mb-3">
              {t("records.amendments.empty")}
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {amendments.map((a) => (
                <div key={a.id} className="text-sm">
                  <p className="text-[11px] text-muted-foreground mb-0.5">
                    {new Intl.DateTimeFormat(i18n.language, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(a.created_at))}
                  </p>
                  <p className="text-foreground whitespace-pre-wrap">
                    {a.content}
                  </p>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={newAmendment}
            onChange={(e) => setNewAmendment(e.target.value)}
            placeholder={t("records.amendments.placeholder")}
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none mb-2"
          />
          {amendmentError && (
            <p className="text-red-500 text-xs mb-2">
              {t("records.amendments.error")}
            </p>
          )}
          <button
            type="button"
            onClick={submitAmendment}
            disabled={!newAmendment.trim() || amendmentSaving}
            className="flex items-center gap-1.5 text-xs font-semibold border border-primary/40 bg-primary/5 text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {amendmentSaving && <Loader2 size={12} className="animate-spin" />}
            {t("records.amendments.addButton")}
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("records.fields.patientLabel")}
          </label>
          <select
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value);
              setAppointmentId("");
            }}
            disabled={!!initial || isLocked}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60"
          >
            <option value="">
              {t("records.fields.selectPatientPlaceholder")}
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("records.fields.sessionDateLabel")}
          </label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            disabled={isLocked}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("records.fields.appointmentLabel")}
        </label>
        <select
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
          disabled={!patientId || isLocked}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60"
        >
          <option value="">
            {t("records.fields.selectAppointmentPlaceholder")}
          </option>
          {appointments.map((a) => (
            <option key={a.id} value={a.id}>
              {new Intl.DateTimeFormat(i18n.language, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(a.starts_at))}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {t("records.fields.privateNotesLabel")}
        </label>
        <p className="text-xs text-muted-foreground/80 mb-1.5">
          {t("records.fields.privateNotesHint")}
        </p>
        <textarea
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          placeholder={t("records.fields.privateNotesPlaceholder")}
          rows={5}
          disabled={isLocked}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none disabled:opacity-60"
        />

        {!isLocked && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runAi("summarize")}
            disabled={!privateNotes.trim() || aiLoading !== null}
            className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {aiLoading === "summarize" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {t("records.ai.summarizeButton")}
          </button>
          <button
            type="button"
            onClick={() => runAi("organize")}
            disabled={!privateNotes.trim() || aiLoading !== null}
            className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {aiLoading === "organize" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {t("records.ai.organizeButton")}
          </button>
          <span className="text-xs text-muted-foreground/70">
            {t("records.ai.disclosure")}
          </span>
        </div>
        )}

        {aiError && (
          <p className="text-red-500 text-xs mt-2">{aiError}</p>
        )}

        {aiResult && (
          <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={12} /> {t("records.ai.resultLabel")}
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
              {aiResult}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPrivateNotes(aiResult);
                  setAiResult(null);
                }}
                className="text-xs font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
              >
                {t("records.ai.useText")}
              </button>
              <button
                type="button"
                onClick={() => setAiResult(null)}
                className="text-xs font-medium border border-border px-4 py-1.5 rounded-full hover:bg-secondary transition-colors"
              >
                {t("records.ai.discard")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {t("records.fields.sharedNotesLabel")}
        </label>
        <p className="text-xs text-muted-foreground/80 mb-1.5">
          {t("records.fields.sharedNotesHint")}
        </p>
        <textarea
          value={sharedNotes}
          onChange={(e) => setSharedNotes(e.target.value)}
          placeholder={t("records.fields.sharedNotesPlaceholder")}
          rows={4}
          disabled={isLocked}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none disabled:opacity-60"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {lockError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {lockError}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          {t("records.cancel")}
        </button>
        {/* Fase 38 — assinar só faz sentido num registro já existente e
            ainda não travado; um registro novo (`initial` vazio) precisa
            ser salvo primeiro. */}
        {!isLocked && initial && onLock && (
          <button
            type="button"
            onClick={handleLockClick}
            disabled={locking || saving}
            className="px-6 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {locking ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Lock size={14} />
            )}
            {t("records.lock.lockButton")}
          </button>
        )}
        {!isLocked && (
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {initial
              ? t("records.fields.saveEdit")
              : t("records.fields.saveNew")}
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Prontuário inline a partir da agenda (Fase 22) ────────────────────────────
// Mesma tabela `clinical_records` do RecordForm acima, mas pensado para ser
// aberto direto do card da consulta na Agenda: paciente, consulta e data já
// vêm fixos (não precisa escolher de novo em dropdowns), então o profissional
// consegue registrar a evolução no mesmo dia da sessão sem trocar de aba. Se
// já existir um registro para essa consulta (`appointment_id`), o modal abre
// em modo de edição automaticamente.
function SessionRecordModal({
  appointment,
  patientName,
  sessionLabel,
  professionalId,
  onClose,
  onSaved,
}: {
  appointment: Appointment;
  patientName: string;
  sessionLabel: string;
  professionalId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [privateNotes, setPrivateNotes] = useState("");
  const [sharedNotes, setSharedNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Fase 38 — trava/assinatura, mesma ideia de RecordForm.
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const isLocked = !!lockedAt;
  const [aiLoading, setAiLoading] = useState<"summarize" | "organize" | null>(
    null,
  );
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // Fase 49 — adendo a registro travado, mesma ideia de RecordForm.
  const [amendments, setAmendments] = useState<ClinicalRecordAmendment[]>([]);
  const [newAmendment, setNewAmendment] = useState("");
  const [amendmentSaving, setAmendmentSaving] = useState(false);
  const [amendmentError, setAmendmentError] = useState(false);

  const loadAmendments = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("clinical_record_amendments")
      .select("id, content, created_at")
      .eq("clinical_record_id", id)
      .order("created_at", { ascending: true });
    setAmendments((data as ClinicalRecordAmendment[]) ?? []);
  }, []);

  const submitAmendment = async () => {
    if (!recordId || !newAmendment.trim()) return;
    setAmendmentSaving(true);
    setAmendmentError(false);
    const { error: err } = await supabase
      .from("clinical_record_amendments")
      .insert({ clinical_record_id: recordId, content: newAmendment.trim() });
    if (err) {
      console.error("Falha ao salvar adendo:", err);
      setAmendmentError(true);
    } else {
      setNewAmendment("");
      await loadAmendments(recordId);
    }
    setAmendmentSaving(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fase 57 — busca via backend (decripta se estiver criptografado) em
      // vez de ler `private_notes`/`shared_notes` direto da tabela.
      try {
        const res = await apiFetch(
          `/clinical-records?appointment_id=${appointment.id}`,
        );
        const data = (res?.records as any[] | undefined)?.[0] ?? null;
        if (!cancelled) {
          if (data) {
            setRecordId(data.id as string);
            setPrivateNotes((data.private_notes as string | null) ?? "");
            setSharedNotes((data.shared_notes as string | null) ?? "");
            setLockedAt((data.locked_at as string | null) ?? null);
            if (data.locked_at) await loadAmendments(data.id as string);
          }
          setLoading(false);
        }
      } catch (fetchErr) {
        if (!cancelled) {
          console.error("Falha ao carregar prontuário da sessão:", fetchErr);
          setLoadError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointment.id, loadAmendments]);

  const runAi = async (action: "summarize" | "organize") => {
    if (!privateNotes.trim()) return;
    setAiLoading(action);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await apiFetch("/ai/notes", {
        method: "POST",
        body: JSON.stringify({ action, text: privateNotes }),
      });
      setAiResult(res.result as string);
    } catch (err: any) {
      const raw = err?.message ?? "";
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) detail = parsed.error;
      } catch {
        // not JSON — use the raw text as-is
      }
      setAiError(
        detail === "ai_requires_paid_plan"
          ? t("records.ai.requiresPaidPlan")
          : detail || t("records.ai.genericError"),
      );
    } finally {
      setAiLoading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Fase 57 — grava via backend (criptografa antes de salvar, quando a
      // chave está configurada) em vez do cliente escrever direto na
      // tabela.
      const sessionDate = toDateInputValue(new Date(appointment.starts_at));
      if (recordId) {
        await apiFetch(`/clinical-records/${recordId}`, {
          method: "PUT",
          body: JSON.stringify({
            private_notes: privateNotes.trim() || null,
            shared_notes: sharedNotes.trim() || null,
          }),
        });
      } else {
        await apiFetch("/clinical-records", {
          method: "POST",
          body: JSON.stringify({
            patient_id: appointment.patient_id,
            appointment_id: appointment.id,
            professional_id: professionalId,
            session_date: sessionDate,
            private_notes: privateNotes.trim() || null,
            shared_notes: sharedNotes.trim() || null,
          }),
        });
      }
      onSaved();
    } catch (err: any) {
      // Código 23505 = unique_violation — já existe um prontuário pra essa
      // consulta (a checagem em `useEffect` já devia ter carregado ele, mas
      // se outra aba/pessoa criou um entre o load e o save, o índice único
      // do banco barra a duplicata em vez de deixar passar). `apiFetch`
      // joga `Error(await r.text())` — o corpo é o JSON `{error, code}` que
      // a rota devolve, por isso precisa parsear antes de checar o código.
      let code: string | undefined;
      try {
        code = JSON.parse(err?.message ?? "")?.code;
      } catch {
        // não era JSON — segue sem código
      }
      setError(
        code === "23505"
          ? t("sessionRecord.duplicateError")
          : t("records.fields.genericSaveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async () => {
    if (!recordId) return;
    setLocking(true);
    setError("");
    try {
      const { error: err } = await supabase
        .from("clinical_records")
        .update({ locked_at: new Date().toISOString(), locked_by: professionalId })
        .eq("id", recordId);
      if (err) throw err;
      onSaved();
    } catch {
      setError(t("records.lock.error"));
    } finally {
      setLocking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">
              {t("sessionRecord.title")}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 truncate capitalize">
              {patientName} · {sessionLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : loadError ? (
          <div className="py-10 text-center">
            <p className="text-red-500 text-sm mb-4">
              {t("sessionRecord.loadError")}
            </p>
            <button
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
            >
              {t("records.cancel")}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {isLocked && (
              <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
                <Lock size={14} className="shrink-0" />
                {t("records.lock.lockedBanner", {
                  date: new Intl.DateTimeFormat().format(new Date(lockedAt as string)),
                })}
              </div>
            )}
            {isLocked && (
              <div className="bg-secondary/50 border border-border rounded-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("records.amendments.title")}
                </p>
                {amendments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {amendments.map((a) => (
                      <div key={a.id} className="text-sm">
                        <p className="text-[11px] text-muted-foreground mb-0.5">
                          {new Intl.DateTimeFormat().format(new Date(a.created_at))}
                        </p>
                        <p className="text-foreground whitespace-pre-wrap">
                          {a.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  value={newAmendment}
                  onChange={(e) => setNewAmendment(e.target.value)}
                  placeholder={t("records.amendments.placeholder")}
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none mb-2"
                />
                {amendmentError && (
                  <p className="text-red-500 text-xs mb-2">
                    {t("records.amendments.error")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={submitAmendment}
                  disabled={!newAmendment.trim() || amendmentSaving}
                  className="flex items-center gap-1.5 text-xs font-semibold border border-primary/40 bg-primary/5 text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {amendmentSaving && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  {t("records.amendments.addButton")}
                </button>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("records.fields.privateNotesLabel")}
              </label>
              <p className="text-xs text-muted-foreground/80 mb-1.5">
                {t("records.fields.privateNotesHint")}
              </p>
              <textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder={t("records.fields.privateNotesPlaceholder")}
                rows={5}
                disabled={isLocked}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none disabled:opacity-60"
              />

              {!isLocked && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => runAi("summarize")}
                  disabled={!privateNotes.trim() || aiLoading !== null}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {aiLoading === "summarize" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {t("records.ai.summarizeButton")}
                </button>
                <button
                  type="button"
                  onClick={() => runAi("organize")}
                  disabled={!privateNotes.trim() || aiLoading !== null}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {aiLoading === "organize" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {t("records.ai.organizeButton")}
                </button>
                <span className="text-xs text-muted-foreground/70">
                  {t("records.ai.disclosure")}
                </span>
              </div>
              )}

              {aiError && (
                <p className="text-red-500 text-xs mt-2">{aiError}</p>
              )}

              {aiResult && (
                <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} /> {t("records.ai.resultLabel")}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                    {aiResult}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrivateNotes(aiResult);
                        setAiResult(null);
                      }}
                      className="text-xs font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
                    >
                      {t("records.ai.useText")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiResult(null)}
                      className="text-xs font-medium border border-border px-4 py-1.5 rounded-full hover:bg-secondary transition-colors"
                    >
                      {t("records.ai.discard")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("records.fields.sharedNotesLabel")}
              </label>
              <p className="text-xs text-muted-foreground/80 mb-1.5">
                {t("records.fields.sharedNotesHint")}
              </p>
              <textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                placeholder={t("records.fields.sharedNotesPlaceholder")}
                rows={4}
                disabled={isLocked}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none disabled:opacity-60"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {isLocked ? t("sessionRecord.close") : t("records.cancel")}
              </button>
              {!isLocked && recordId && (
                <button
                  type="button"
                  onClick={handleLock}
                  disabled={locking || saving}
                  className="px-6 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {locking ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Lock size={14} />
                  )}
                  {t("records.lock.lockButton")}
                </button>
              )}
              {!isLocked && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {recordId
                  ? t("records.fields.saveEdit")
                  : t("records.fields.saveNew")}
              </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordsView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  // Fase 24 — o Prontuário ganhou uma segunda aba, "Documentos", separada
  // das anotações de sessão (que continuam exatamente como antes). Um
  // documento formal (relatório, encaminhamento, declaração, atestado) é uma
  // peça diferente de uma anotação de sessão — por isso mora numa tabela
  // própria (`psychological_documents`) em vez de virar mais um campo em
  // `clinical_records`.
  const [section, setSection] = useState<"notes" | "documents">("notes");
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [selected, setSelected] = useState<ClinicalRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState("");
  const [deleteError, setDeleteError] = useState(false);
  // Fase 38 — trava/assinatura de sessão concluída.
  const [lockingId, setLockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    // Fase 57 — a lista passa a vir do backend (que decripta as anotações
    // criptografadas), não mais direto da tabela `clinical_records`.
    const [recordsData, patientsRes] = await Promise.all([
      apiFetch("/clinical-records").catch((err) => {
        console.error("Falha ao carregar prontuário:", err);
        return null;
      }),
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("professional_id", user.id)
        .order("full_name", { ascending: true }),
    ]);
    if (!recordsData) {
      setError(true);
    } else {
      setRecords((recordsData?.records as any as ClinicalRecord[]) ?? []);
    }
    setPatients((patientsRes.data as PatientOption[]) ?? []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: {
    patient_id: string;
    appointment_id: string | null;
    session_date: string;
    private_notes: string | null;
    shared_notes: string | null;
  }) => {
    // Fase 57 — grava via backend, que criptografa antes de salvar (quando
    // a chave está configurada) em vez do cliente escrever direto na
    // tabela.
    if (view === "edit" && selected) {
      await apiFetch(`/clinical-records/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      await logAudit("update", "clinical_record", selected.id, data.patient_id);
    } else {
      const inserted = await apiFetch("/clinical-records", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (inserted?.id) {
        await logAudit(
          "create",
          "clinical_record",
          inserted.id as string,
          data.patient_id,
        );
      }
    }
    await load();
    setView("list");
    setSelected(null);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(false);
    const deletedRecord = records.find((r) => r.id === id);
    const { error: err } = await supabase
      .from("clinical_records")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Falha ao excluir prontuário:", err);
      setDeleteError(true);
      return;
    }
    await logAudit(
      "delete",
      "clinical_record",
      id,
      deletedRecord?.patient_id,
    );
    setDeleteId(null);
    await load();
  };

  // Fase 38 — assina/trava o registro (RLS garante, no banco, que depois
  // disso nenhum UPDATE/DELETE mais passa pra esse profissional — ver
  // migração da Fase 38).
  const handleLock = async (id: string) => {
    setLockingId(id);
    try {
      const lockedRecord = records.find((r) => r.id === id);
      const { error: err } = await supabase
        .from("clinical_records")
        .update({ locked_at: new Date().toISOString(), locked_by: user.id })
        .eq("id", id);
      if (err) throw err;
      await logAudit("lock", "clinical_record", id, lockedRecord?.patient_id);
      await load();
      setView("list");
      setSelected(null);
    } finally {
      setLockingId(null);
    }
  };

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));

  const filtered = patientFilter
    ? records.filter((r) => r.patient_id === patientFilter)
    : records;

  if (section === "notes" && (view === "new" || view === "edit")) {
    return (
      <div>
        <button
          onClick={() => {
            setView("list");
            setSelected(null);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} /> {t("records.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {view === "edit" ? t("records.editTitle") : t("records.newTitle")}
        </h2>
        <div className="bg-card border border-border rounded-2xl p-8">
          <RecordForm
            initial={selected}
            patients={patients}
            onSave={handleSave}
            onCancel={() => {
              setView("list");
              setSelected(null);
            }}
            onLock={
              selected && !selected.locked_at
                ? () => handleLock(selected.id)
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex rounded-full border border-border overflow-hidden text-xs font-medium w-fit mb-6">
        <button
          onClick={() => setSection("notes")}
          className={`px-4 py-1.5 transition-colors ${section === "notes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
        >
          {t("records.documents.notesTab")}
        </button>
        <button
          onClick={() => setSection("documents")}
          className={`px-4 py-1.5 transition-colors ${section === "documents" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
        >
          {t("records.documents.documentsTab")}
        </button>
      </div>

      {section === "documents" ? (
        <DocumentsView user={user} patients={patients} />
      ) : (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {patients.length > 0 && (
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="text-sm px-4 py-2.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-xs transition-colors"
          >
            <option value="">{t("records.patientFilterAll")}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => {
            setSelected(null);
            setView("new");
          }}
          disabled={patients.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus size={16} /> {t("records.newRecord")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" /> {t("records.loading")}
        </div>
      ) : error ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          {t("records.errorLoading")}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-semibold text-foreground mb-2">
            {t("records.noPatientsTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("records.noPatientsText")}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">📝</p>
          <p className="font-semibold text-foreground mb-2">
            {t("records.emptyTitle")}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            {t("records.emptyText")}
          </p>
          <button
            onClick={() => {
              setSelected(null);
              setView("new");
            }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> {t("records.emptyCta")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setSelected(r);
                setView("edit");
              }}
              className="w-full text-left bg-card border border-border rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center text-lg font-semibold text-primary">
                {(r.patients?.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {r.patients?.full_name ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateLabel(r.session_date)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.locked_at && (
                    <span className="flex items-center gap-1 text-xs bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 text-green-700">
                      <Lock size={10} /> {t("records.lock.signedBadge")}
                    </span>
                  )}
                  {r.private_notes && (
                    <span className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
                      {t("records.hasPrivate")}
                    </span>
                  )}
                  {r.shared_notes && (
                    <span className="text-xs bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5 text-blue-700">
                      {t("records.hasShared")}
                    </span>
                  )}
                  {!r.private_notes && !r.shared_notes && (
                    <span className="text-xs text-muted-foreground/70">
                      {t("records.noNotesYet")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Fase 38 — registro assinado não pode mais ser excluído
                    (RLS reforça isso; aqui é só coerência de UI). */}
                {!r.locked_at && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(r.id);
                    }}
                    className="p-2 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <ChevronRight size={18} className="text-muted-foreground/40" />
              </div>
            </button>
          ))}
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("records.deleteTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("records.deleteBody")}
            </p>
            {deleteError && (
              <p className="text-red-500 text-xs mb-4">
                {t("records.deleteError")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteError(false);
                }}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("records.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("records.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// ─── Documentos psicológicos com IA (Fase 24) ──────────────────────────────
function DocumentsView({
  user,
  patients,
}: {
  user: AppUser;
  patients: PatientOption[];
}) {
  const { t, i18n } = useTranslation();
  const [documents, setDocuments] = useState<PsychDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [selected, setSelected] = useState<PsychDocument | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [patientFilter, setPatientFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("psychological_documents")
      .select(
        "id, patient_id, professional_id, doc_type, title, content, created_at, updated_at, patients(full_name)",
      )
      .eq("professional_id", user.id)
      .order("updated_at", { ascending: false });
    if (err) {
      setError(true);
    } else {
      setDocuments((data as any as PsychDocument[]) ?? []);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: {
    patient_id: string;
    doc_type: DocType;
    title: string;
    content: string;
  }) => {
    if (view === "edit" && selected) {
      const { error: err } = await supabase
        .from("psychological_documents")
        .update({
          title: data.title || null,
          content: data.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (err) throw err;
      await logAudit(
        "update",
        "psychological_document",
        selected.id,
        data.patient_id,
      );
    } else {
      const { data: inserted, error: err } = await supabase
        .from("psychological_documents")
        .insert({
          patient_id: data.patient_id,
          professional_id: user.id,
          doc_type: data.doc_type,
          title: data.title || null,
          content: data.content,
        })
        .select("id")
        .single();
      if (err) throw err;
      if (inserted?.id) {
        await logAudit(
          "create",
          "psychological_document",
          inserted.id as string,
          data.patient_id,
        );
      }
    }
    await load();
    setView("list");
    setSelected(null);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(false);
    const deletedDoc = documents.find((d) => d.id === id);
    const { error: err } = await supabase
      .from("psychological_documents")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Falha ao excluir documento:", err);
      setDeleteError(true);
      return;
    }
    await logAudit(
      "delete",
      "psychological_document",
      id,
      deletedDoc?.patient_id,
    );
    setDeleteId(null);
    await load();
  };

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));

  // Fase 54 — guarda obrigatória de 5 anos (Resolução CFP Nº 004/2019):
  // a exclusão em si já é bloqueada no banco (RLS), mas repetir a mesma
  // regra aqui evita que a pessoa tente e só descubra o motivo depois de
  // um erro genérico — o botão já nasce desabilitado, com data explicando.
  const RETENTION_YEARS = 5;
  const retentionUnlockDate = (createdAt: string) => {
    const d = new Date(createdAt);
    d.setFullYear(d.getFullYear() + RETENTION_YEARS);
    return d;
  };
  const isRetentionLocked = (d: PsychDocument) =>
    new Date() < retentionUnlockDate(d.created_at);

  const filtered = patientFilter
    ? documents.filter((d) => d.patient_id === patientFilter)
    : documents;

  if (view === "new" || view === "edit") {
    return (
      <div>
        <button
          onClick={() => {
            setView("list");
            setSelected(null);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} /> {t("records.documents.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {view === "edit"
            ? t("records.documents.editTitle")
            : t("records.documents.newTitle")}
        </h2>
        <div className="bg-card border border-border rounded-2xl p-8">
          <DocumentForm
            initial={selected}
            patients={patients}
            user={user}
            onSave={handleSave}
            onCancel={() => {
              setView("list");
              setSelected(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {patients.length > 0 && (
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="text-sm px-4 py-2.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-xs transition-colors"
          >
            <option value="">{t("records.documents.patientFilterAll")}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => {
            setSelected(null);
            setView("new");
          }}
          disabled={patients.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus size={16} /> {t("records.documents.newDocument")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" />{" "}
          {t("records.documents.loading")}
        </div>
      ) : error ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          {t("records.documents.errorLoading")}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-semibold text-foreground mb-2">
            {t("records.noPatientsTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("records.noPatientsText")}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">📄</p>
          <p className="font-semibold text-foreground mb-2">
            {t("records.documents.emptyTitle")}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            {t("records.documents.emptyText")}
          </p>
          <button
            onClick={() => {
              setSelected(null);
              setView("new");
            }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> {t("records.documents.newDocument")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setSelected(d);
                setView("edit");
              }}
              className="w-full text-left bg-card border border-border rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center text-primary">
                {docTypeIcon(d.doc_type, 20)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {d.patients?.full_name ?? "—"}
                  </span>
                  <span className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
                    {t(`records.documents.types.${d.doc_type}`)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {d.title || t(`records.documents.types.${d.doc_type}`)} ·{" "}
                  {dateLabel(d.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {isRetentionLocked(d) ? (
                  <span
                    title={t("records.documents.retentionLockedHint", {
                      date: dateLabel(
                        retentionUnlockDate(d.created_at).toISOString(),
                      ),
                    })}
                    className="p-2 rounded-lg border border-border text-muted-foreground/50 cursor-not-allowed"
                  >
                    <Lock size={14} />
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(d.id);
                    }}
                    className="p-2 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <ChevronRight size={18} className="text-muted-foreground/40" />
              </div>
            </button>
          ))}
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("records.documents.deleteTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("records.documents.deleteBody")}
            </p>
            {deleteError && (
              <p className="text-red-500 text-xs mb-4">
                {t("records.documents.deleteError")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteError(false);
                }}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("records.documents.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("records.documents.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentForm({
  initial,
  patients,
  user,
  onSave,
  onCancel,
}: {
  initial?: PsychDocument | null;
  patients: PatientOption[];
  user: AppUser;
  onSave: (data: {
    patient_id: string;
    doc_type: DocType;
    title: string;
    content: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [patientId, setPatientId] = useState(initial?.patient_id ?? "");
  const [docType, setDocType] = useState<DocType>(
    initial?.doc_type ?? "psychological_report",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [extraContext, setExtraContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Fase 48 — CRP só pro cabeçalho do PDF (mesmo dado já usado no recibo
  // da Fase 42).
  const [profTitle, setProfTitle] = useState("");
  const [profCrp, setProfCrp] = useState("");
  // Fase 55 — motor de placeholders ({{paciente.nome}}, {{paciente.cpf}},
  // {{psicologo.nome}}, {{psicologo.crp}}, {{consulta.data}}): dados extras
  // que o `content` sozinho não tem (CPF do paciente não é buscado no
  // `PatientOption`, e a data da consulta vem da última consulta agendada
  // com este paciente, já que o documento não está ligado a nenhuma
  // consulta específica).
  const [patientCpf, setPatientCpf] = useState("");
  const [lastApptDate, setLastApptDate] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("professionals")
      .select("title, crp")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfTitle((data as any)?.title ?? "");
        setProfCrp((data as any)?.crp ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;
    if (!patientId) {
      setPatientCpf("");
      setLastApptDate(null);
      return;
    }
    (async () => {
      const [{ data: patientRow }, { data: apptRow }] = await Promise.all([
        supabase
          .from("patients")
          .select("cpf")
          .eq("id", patientId)
          .maybeSingle(),
        supabase
          .from("appointments")
          .select("starts_at")
          .eq("patient_id", patientId)
          .eq("professional_id", user.id)
          .order("starts_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setPatientCpf((patientRow as any)?.cpf ?? "");
      setLastApptDate((apptRow as any)?.starts_at ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, user.id]);

  const insertPlaceholder = (token: string) => {
    const el = contentRef.current;
    if (!el) {
      setContent((c) => c + token);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  // Substitui os placeholders só na hora de gerar/baixar/copiar — o
  // `content` salvo continua com os tokens crus, então o mesmo texto
  // funciona como modelo reaproveitável (ex.: copiar pra um novo
  // documento de outro paciente e os dados batem sozinhos).
  const applyPlaceholders = (text: string) => {
    const missing = t("records.documents.fields.placeholderMissing");
    const patientName =
      patients.find((p) => p.id === patientId)?.full_name || missing;
    const professionalName =
      [profTitle, user.fullName].filter(Boolean).join(" ") || missing;
    const consultaDate = lastApptDate
      ? new Intl.DateTimeFormat(i18n.language, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(lastApptDate))
      : missing;
    const replacements: [string, string][] = [
      ["{{paciente.nome}}", patientName],
      ["{{paciente.cpf}}", patientCpf || missing],
      ["{{psicologo.nome}}", professionalName],
      ["{{psicologo.crp}}", profCrp || missing],
      ["{{consulta.data}}", consultaDate],
    ];
    return replacements.reduce(
      (acc, [token, value]) => acc.split(token).join(value),
      text,
    );
  };

  const runAi = async () => {
    if (!patientId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiFetch("/ai/documents", {
        method: "POST",
        body: JSON.stringify({ docType, patientId, extraContext }),
      });
      setContent(res.result as string);
    } catch (err: any) {
      const raw = err?.message ?? "";
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) detail = parsed.error;
      } catch {
        // não era JSON — usa o texto cru mesmo
      }
      setAiError(
        detail === "ai_requires_paid_plan"
          ? t("records.ai.requiresPaidPlan")
          : detail || t("records.ai.genericError"),
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !content.trim()) {
      setError(t("records.documents.fields.requiredError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        patient_id: patientId,
        doc_type: docType,
        title: title.trim(),
        content: content.trim(),
      });
    } catch {
      setError(t("records.documents.fields.genericSaveError"));
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applyPlaceholders(content));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível (ex.: contexto não seguro) — sem tela de
      // erro dedicada; ainda dá pra selecionar e copiar o texto na mão.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([applyPlaceholders(content)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || t(`records.documents.types.${docType}`)).replace(/[^\w-]+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fase 48 — PDF de verdade em vez de só .txt. Mesma técnica do recibo da
  // Fase 42 (sem biblioteca de PDF nova): janela formatada + `print()`,
  // que em qualquer navegador oferece "Salvar como PDF".
  const handlePrintPdf = () => {
    const win = window.open("", "_blank", "width=760,height=1000");
    if (!win) return;
    // Fase 50 — log de auditoria (melhor esforço, sem bloquear a
    // impressão); só faz sentido pra um documento já salvo.
    if (initial?.id) {
      logAudit("export", "psychological_document", initial.id, patientId);
    }
    const patientName =
      patients.find((p) => p.id === patientId)?.full_name ?? "—";
    const professionalName = [profTitle, user.fullName].filter(Boolean).join(" ");
    const docTitle = title.trim() || t(`records.documents.types.${docType}`);
    const issuedAt = new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
    const escapeHtml = (s: string) =>
      s.replace(/[&<>\x22\x27]/g, (c) => {
        switch (c) {
          case "&":
            return "&amp;";
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case '"':
            return "&quot;";
          case "'":
            return "&#39;";
          default:
            return c;
        }
      });
    win.document.write(`<!doctype html>
<html lang="${i18n.language}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; padding: 56px; max-width: 680px; margin: 0 auto; line-height: 1.7; }
  .header { border-bottom: 2px solid #1f2937; padding-bottom: 16px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header h1 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
  .muted { color: #6b7280; font-size: 12px; }
  .doc-title { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
  .doc-meta { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
  .content { white-space: pre-wrap; font-size: 14px; }
  .signature { margin-top: 72px; border-top: 1px solid #9ca3af; padding-top: 8px; width: 320px; font-size: 13px; }
  .print-bar { margin-bottom: 24px; }
  .print-bar button { font-family: inherit; font-size: 13px; padding: 8px 18px; border-radius: 999px; border: 1px solid #1f2937; background: #1f2937; color: #fff; cursor: pointer; }
  @media print { .print-bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="print-bar"><button onclick="window.print()">${escapeHtml(t("records.documents.fields.printPdfButton"))}</button></div>
  <div class="header">
    <div>
      <h1>${escapeHtml(professionalName || "—")}</h1>
      ${profCrp ? `<div class="muted">${escapeHtml(t("finance.receipt.crpLabel", { crp: profCrp }))}</div>` : ""}
    </div>
    <div class="muted" style="text-align:right">${escapeHtml(t("finance.receipt.issuedAt", { date: issuedAt }))}</div>
  </div>
  <p class="doc-title">${escapeHtml(docTitle)}</p>
  <p class="doc-meta">${escapeHtml(t("records.documents.fields.pdfMeta", { patient: patientName, type: t(`records.documents.types.${docType}`) }))}</p>
  <div class="content">${escapeHtml(applyPlaceholders(content))}</div>
  <div class="signature">${escapeHtml(professionalName || "—")}${profCrp ? ` · ${escapeHtml(profCrp)}` : ""}</div>
</body>
</html>`);
    win.document.close();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("records.documents.fields.patientLabel")}
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={!!initial}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60"
          >
            <option value="">
              {t("records.documents.fields.selectPatientPlaceholder")}
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("records.documents.fields.typeLabel")}
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            disabled={!!initial}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60"
          >
            {DOC_TYPE_LIST.map((type) => (
              <option key={type} value={type}>
                {t(`records.documents.types.${type}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("records.documents.fields.titleLabel")}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("records.documents.fields.titlePlaceholder")}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      </div>

      {!initial && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t("records.documents.fields.extraContextLabel")}
          </label>
          <p className="text-xs text-muted-foreground/80 mb-1.5">
            {t("records.documents.fields.extraContextHint")}
          </p>
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder={t("records.documents.fields.extraContextPlaceholder")}
            rows={3}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runAi}
              disabled={!patientId || aiLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {aiLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {t("records.documents.fields.generateButton")}
            </button>
            <span className="text-xs text-muted-foreground/70">
              {t("records.ai.disclosure")}
            </span>
          </div>
          {aiError && <p className="text-red-500 text-xs mt-2">{aiError}</p>}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("records.documents.fields.contentLabel")}
        </label>
        {/* Fase 55 — motor de templates: insere o placeholder no cursor;
            os tokens ficam salvos como texto cru e só são substituídos
            pelos dados reais na hora de copiar/baixar/gerar PDF. */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[
            "{{paciente.nome}}",
            "{{paciente.cpf}}",
            "{{psicologo.nome}}",
            "{{psicologo.crp}}",
            "{{consulta.data}}",
          ].map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertPlaceholder(token)}
              className="text-xs font-mono bg-secondary border border-border rounded-full px-2.5 py-1 hover:bg-muted transition-colors text-muted-foreground"
            >
              {token}
            </button>
          ))}
        </div>
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("records.documents.fields.contentPlaceholder")}
          rows={14}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-y"
        />
        <p className="text-xs text-muted-foreground/70 mt-1.5">
          {t("records.documents.fields.placeholderHint")}
        </p>
        {content.trim() && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-full px-3 py-1.5 hover:bg-secondary transition-colors text-muted-foreground"
            >
              <Copy size={12} />{" "}
              {copied
                ? t("records.documents.fields.copied")
                : t("records.documents.fields.copyButton")}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-full px-3 py-1.5 hover:bg-secondary transition-colors text-muted-foreground"
            >
              <Download size={12} /> {t("records.documents.fields.downloadButton")}
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={!patientId}
              className="flex items-center gap-1.5 text-xs font-medium border border-primary/40 bg-primary/5 text-primary rounded-full px-3 py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <FileSignature size={12} />{" "}
              {t("records.documents.fields.downloadPdfButton")}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          {t("records.documents.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {initial
            ? t("records.documents.fields.saveEdit")
            : t("records.documents.fields.saveNew")}
        </button>
      </div>
    </form>
  );
}

// ─── Financeiro (Fase 7) ────────────────────────────────────────────────────────
// Per-session billing for a logged-in psychologist: charges tied to a
// patient (and optionally a specific appointment), a status per charge
// (pending/paid/overdue), and a small summary (received this month,
// pending, overdue). This is the same `payments` table the overview panel
// already reads for its "revenue this month" KPI, so entries made here
// show up there immediately. Real payment processing (Stripe etc.) is
// explicitly out of scope for this fase — this only tracks who owes what.

type Payment = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  patients?: { full_name: string } | null;
};

function PaymentForm({
  initial,
  patients,
  defaultAmount,
  onSave,
  onCancel,
}: {
  initial?: Payment | null;
  patients: PatientOption[];
  defaultAmount: string;
  onSave: (data: {
    patient_id: string;
    appointment_id: string | null;
    amount: number;
    status: string;
    paid_at: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [patientId, setPatientId] = useState(initial?.patient_id ?? "");
  const [appointmentId, setAppointmentId] = useState(
    initial?.appointment_id ?? "",
  );
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : defaultAmount,
  );
  const [status, setStatus] = useState(initial?.status ?? "pending");
  const [paidAt, setPaidAt] = useState(
    initial?.paid_at ? toDateInputValue(new Date(initial.paid_at)) : "",
  );
  const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) {
      setAppointments([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("appointments")
      .select("id, starts_at")
      .eq("patient_id", patientId)
      .order("starts_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) setAppointments((data as AppointmentOption[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseLocalizedAmount(amount);
    if (!patientId || !amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t("finance.fields.requiredError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        patient_id: patientId,
        appointment_id: appointmentId || null,
        amount: parsedAmount,
        status,
        paid_at:
          status === "paid"
            ? new Date(`${paidAt || toDateInputValue(new Date())}T12:00:00`).toISOString()
            : null,
      });
    } catch {
      setError(t("finance.fields.genericSaveError"));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("finance.fields.patientLabel")}
        </label>
        <select
          value={patientId}
          onChange={(e) => {
            setPatientId(e.target.value);
            setAppointmentId("");
          }}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        >
          <option value="">{t("finance.fields.selectPatientPlaceholder")}</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("finance.fields.appointmentLabel")}
        </label>
        <select
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
          disabled={!patientId}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60"
        >
          <option value="">
            {t("finance.fields.selectAppointmentPlaceholder")}
          </option>
          {appointments.map((a) => (
            <option key={a.id} value={a.id}>
              {new Intl.DateTimeFormat(i18n.language, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(a.starts_at))}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("finance.fields.amountLabel")}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("finance.fields.amountPlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("finance.fields.statusLabel")}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            <option value="pending">{t("finance.status.pending")}</option>
            <option value="paid">{t("finance.status.paid")}</option>
            <option value="overdue">{t("finance.status.overdue")}</option>
          </select>
        </div>
      </div>

      {status === "paid" && (
        <div className="max-w-[220px]">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("finance.fields.paidAtLabel")}
          </label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          {t("finance.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {initial
            ? t("finance.fields.saveEdit")
            : t("finance.fields.saveNew")}
        </button>
      </div>
    </form>
  );
}

function FinanceView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [sessionPrice, setSessionPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionError, setActionError] = useState(false);
  // Fase 32 — moeda de cobrança do profissional, usada em toda formatação
  // monetária desta tela.
  const [profCurrency, setProfCurrency] = useState("BRL");
  // Fase 37 — pra quem é profissional de equipe (não dono) numa clínica
  // que configurou comissão: mostra, só pra informação, quanto já foi
  // repassado a ele. Continua sem poder editar nada disso (RLS: só lê a
  // própria comissão/os próprios repasses).
  const [myCommissionPercent, setMyCommissionPercent] = useState<
    number | null
  >(null);
  const [myPaidOut, setMyPaidOut] = useState(0);
  // Fase 42 — nome de exibição (título profissional) e CRP, usados só no
  // cabeçalho do recibo impresso. Sem novo endpoint: os dois já vinham
  // disponíveis via `professionals`, só faltava selecioná-los aqui.
  const [profTitle, setProfTitle] = useState("");
  const [profCrp, setProfCrp] = useState("");
  // Fase 56 — painel de inadimplência + faturamento projetado (DRE
  // simplificado): quantas consultas futuras (não canceladas, não
  // "no-show") estão agendadas nos próximos 30 dias, pra estimar receita
  // projetada junto com o preço da sessão. Deliberadamente NÃO calcula
  // "margem após taxas de cartão/gateway" — pagamento online segue fora de
  // escopo desta plataforma.
  const [upcomingAppointmentsCount, setUpcomingAppointmentsCount] =
    useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [
      paymentsRes,
      patientsRes,
      professionalRes,
      commissionRes,
      payoutsRes,
      upcomingRes,
    ] = await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, patient_id, appointment_id, amount, status, paid_at, created_at, patients(full_name)",
        )
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("professional_id", user.id)
        .order("full_name", { ascending: true }),
      supabase
        .from("professionals")
        .select("session_price, currency, title, crp")
        .eq("id", user.id)
        .maybeSingle(),
      user.clinicId
        ? supabase
            .from("professional_commissions")
            .select("commission_percent")
            .eq("professional_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user.clinicId
        ? supabase
            .from("payouts")
            .select("amount, status")
            .eq("professional_id", user.id)
        : Promise.resolve({ data: null }),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .gte("starts_at", now.toISOString())
        .lte("starts_at", in30Days.toISOString())
        .not("status", "in", "(cancelled,no_show)"),
    ]);
    if (paymentsRes.error) {
      setError(true);
    } else {
      setPayments((paymentsRes.data as any as Payment[]) ?? []);
    }
    setPatients((patientsRes.data as PatientOption[]) ?? []);
    setSessionPrice(
      (professionalRes.data as any)?.session_price != null
        ? Number((professionalRes.data as any).session_price)
        : null,
    );
    setProfCurrency(
      (professionalRes.data as any)?.currency === "EUR" ? "EUR" : "BRL",
    );
    setProfTitle((professionalRes.data as any)?.title ?? "");
    setProfCrp((professionalRes.data as any)?.crp ?? "");
    setMyCommissionPercent(
      typeof (commissionRes.data as any)?.commission_percent === "number"
        ? (commissionRes.data as any).commission_percent
        : null,
    );
    setMyPaidOut(
      ((payoutsRes.data as any[]) ?? [])
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0),
    );
    setUpcomingAppointmentsCount((upcomingRes as any).count ?? 0);
    setLoading(false);
  }, [user.id, user.clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: {
    patient_id: string;
    appointment_id: string | null;
    amount: number;
    status: string;
    paid_at: string | null;
  }) => {
    if (view === "edit" && selected) {
      const { error: err } = await supabase
        .from("payments")
        .update(data)
        .eq("id", selected.id);
      if (err) throw err;
    } else {
      const { error: err } = await supabase.from("payments").insert({
        ...data,
        professional_id: user.id,
      });
      if (err) throw err;
    }
    await load();
    setView("list");
    setSelected(null);
  };

  const markPaid = async (id: string) => {
    setActionError(false);
    const { error: err } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      console.error("Falha ao marcar pagamento como pago:", err);
      setActionError(true);
      return;
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    setActionError(false);
    const { error: err } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Falha ao excluir pagamento:", err);
      setActionError(true);
      return;
    }
    setDeleteId(null);
    await load();
  };

  const currency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: profCurrency,
      maximumFractionDigits: 2,
    }).format(value);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));

  // Fase 42 — recibo de pagamento em PDF. Sem biblioteca de PDF nova (nenhuma
  // estava instalada e o ambiente não tem acesso pra instalar uma agora):
  // abre uma janela só com o recibo formatado pra impressão e chama
  // `print()`, que em todo navegador oferece "Salvar como PDF" — resultado
  // igual a gerar o PDF direto, sem dependência nova nem chamada de rede.
  const handlePrintReceipt = (p: Payment) => {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    const issuedAt = dateLabel(new Date().toISOString());
    const paidLabel = p.paid_at ? dateLabel(p.paid_at) : dateLabel(p.created_at);
    const patientName = p.patients?.full_name ?? "—";
    const professionalName = [profTitle, user.fullName].filter(Boolean).join(" ");
    const receiptNumber = p.id.slice(0, 8).toUpperCase();
    const escapeHtml = (s: string) =>
      s.replace(/[&<>\x22\x27]/g, (c) => {
        switch (c) {
          case "&":
            return "&amp;";
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case '"':
            return "&quot;";
          case "'":
            return "&#39;";
          default:
            return c;
        }
      });
    const declaration = t("finance.receipt.declarationText", {
      patient: patientName,
      amount: currency(Number(p.amount)),
      date: paidLabel,
    });
    win.document.write(`<!doctype html>
<html lang="${i18n.language}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t("finance.receipt.documentTitle", { number: receiptNumber }))}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; padding: 48px; max-width: 640px; margin: 0 auto; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
  .muted { color: #6b7280; font-size: 13px; }
  .header { border-bottom: 2px solid #1f2937; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
  .field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 2px; }
  .field-value { font-size: 15px; font-weight: 500; }
  .amount { font-size: 28px; font-weight: 700; margin: 24px 0; }
  .declaration { font-size: 14px; line-height: 1.7; margin: 32px 0; }
  .signature { margin-top: 64px; border-top: 1px solid #9ca3af; padding-top: 8px; width: 280px; font-size: 13px; }
  .print-bar { margin-bottom: 24px; }
  .print-bar button { font-family: inherit; font-size: 13px; padding: 8px 18px; border-radius: 999px; border: 1px solid #1f2937; background: #1f2937; color: #fff; cursor: pointer; }
  @media print { .print-bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="print-bar"><button onclick="window.print()">${escapeHtml(t("finance.receipt.printButton"))}</button></div>
  <div class="header">
    <div>
      <h1>${escapeHtml(professionalName || "—")}</h1>
      ${profCrp ? `<div class="muted">${escapeHtml(t("finance.receipt.crpLabel", { crp: profCrp }))}</div>` : ""}
    </div>
    <div class="muted" style="text-align:right">
      <div>${escapeHtml(t("finance.receipt.documentTitle", { number: receiptNumber }))}</div>
      <div>${escapeHtml(t("finance.receipt.issuedAt", { date: issuedAt }))}</div>
    </div>
  </div>
  <div class="grid">
    <div>
      <div class="field-label">${escapeHtml(t("finance.receipt.patientLabel"))}</div>
      <div class="field-value">${escapeHtml(patientName)}</div>
    </div>
    <div>
      <div class="field-label">${escapeHtml(t("finance.receipt.paymentDateLabel"))}</div>
      <div class="field-value">${escapeHtml(paidLabel)}</div>
    </div>
  </div>
  <div class="amount">${escapeHtml(currency(Number(p.amount)))}</div>
  <p class="declaration">${escapeHtml(declaration)}</p>
  <div class="signature">${escapeHtml(professionalName || "—")}${profCrp ? ` · ${escapeHtml(profCrp)}` : ""}</div>
</body>
</html>`);
    win.document.close();
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const receivedThisMonth = payments
    .filter(
      (p) =>
        p.status === "paid" &&
        p.paid_at &&
        new Date(p.paid_at) >= startOfMonth,
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOverdue = payments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  // Fase 37 — mesmo cálculo usado em ClinicPayoutsView (lado da clínica),
  // aqui do lado do profissional: total histórico recebido × (1 −
  // comissão) − o que já foi repassado, nunca negativo.
  const myTotalReceived = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const myPendingPayout =
    myCommissionPercent != null
      ? Math.max(
          0,
          myTotalReceived * (1 - myCommissionPercent / 100) - myPaidOut,
        )
      : 0;

  // Fase 56 — DRE simplificado: taxa de inadimplência = valor em atraso
  // sobre o total que já deveria ter sido cobrado (pago + em atraso — o
  // que ainda está "pendente" sem vencer não conta como inadimplência
  // ainda). Faturamento projetado = estimativa simples com base nas
  // consultas já agendadas pros próximos 30 dias × preço da sessão —
  // não tenta modelar pacotes com desconto nem taxas de gateway (fora de
  // escopo, pagamento online não é processado nesta plataforma).
  const billedTotal = myTotalReceived + totalOverdue;
  const defaultRate = billedTotal > 0 ? (totalOverdue / billedTotal) * 100 : 0;
  const projectedRevenue30d =
    sessionPrice != null ? upcomingAppointmentsCount * sessionPrice : null;

  const filtered = payments.filter((p) => {
    if (patientFilter && p.patient_id !== patientFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const statusStyles: Record<string, string> = {
    pending: "bg-secondary text-muted-foreground",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };

  if (view === "new" || view === "edit") {
    return (
      <div>
        <button
          onClick={() => {
            setView("list");
            setSelected(null);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} /> {t("finance.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {view === "edit" ? t("finance.editTitle") : t("finance.newTitle")}
        </h2>
        <div className="bg-card border border-border rounded-2xl p-8">
          <PaymentForm
            initial={selected}
            patients={patients}
            defaultAmount={sessionPrice != null ? String(sessionPrice) : ""}
            onSave={handleSave}
            onCancel={() => {
              setView("list");
              setSelected(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Fase 59 — 4 StatCards (Recebido/A receber/Em atraso/Total do mês),
          igual à referência do Figma — o 4º cartão ("Total do mês") é só a
          soma dos outros três, sem nova consulta. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Check}
          label={t("finance.summary.receivedThisMonth")}
          value={currency(receivedThisMonth)}
          tone="accent"
        />
        <StatCard
          icon={Clock}
          label={t("finance.summary.pending")}
          value={currency(totalPending)}
          tone="primary"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("finance.summary.overdue")}
          value={currency(totalOverdue)}
          tone="danger"
        />
        <StatCard
          icon={CreditCard}
          label={t("finance.summary.totalThisMonth")}
          value={currency(receivedThisMonth + totalPending + totalOverdue)}
          tone="neutral"
        />
      </div>

      {/* Fase 56 — painel de inadimplência + faturamento projetado (DRE
          simplificado). */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {t("finance.dre.title")}
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {defaultRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("finance.dre.defaultRateLabel")}
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {projectedRevenue30d != null
                ? currency(projectedRevenue30d)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("finance.dre.projectedRevenueLabel", {
                count: upcomingAppointmentsCount,
              })}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-4">
          {t("finance.dre.hint")}
        </p>
      </div>

      {/* Fase 37 — só aparece pra quem tem comissão configurada (equipe de
          clínica, não dono); é informativo, quem registra/confirma repasse
          é a clínica em ClinicPayoutsView. */}
      {myCommissionPercent != null && (
        <div className="bg-secondary border border-border rounded-2xl px-6 py-4 mb-8 flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {t("finance.myCommission.percentLabel")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {t("finance.myCommission.percentValue", {
                value: myCommissionPercent,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t("finance.myCommission.paidOutLabel")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {currency(myPaidOut)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t("finance.myCommission.pendingLabel")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {currency(myPendingPayout)}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {patients.length > 0 && (
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="text-sm px-4 py-2.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
            >
              <option value="">{t("finance.patientFilterAll")}</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          )}
          {/* Fase 58 — pills de status (Todos/Pago/Pendente/Atrasado) no
              lugar do <select>, no espírito da referência enviada pelo
              usuário; mesmo estado (`statusFilter`) e mesmos valores de
              antes, só a apresentação mudou. */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
            {(
              [
                { value: "", label: t("finance.statusFilterAll") },
                { value: "paid", label: t("finance.status.paid") },
                { value: "pending", label: t("finance.status.pending") },
                { value: "overdue", label: t("finance.status.overdue") },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === opt.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            setSelected(null);
            setView("new");
          }}
          disabled={patients.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus size={16} /> {t("finance.newPayment")}
        </button>
      </div>

      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {t("finance.actionError")}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" /> {t("finance.loading")}
        </div>
      ) : error ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          {t("finance.errorLoading")}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-semibold text-foreground mb-2">
            {t("finance.noPatientsTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("finance.noPatientsText")}
          </p>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">💳</p>
          <p className="font-semibold text-foreground mb-2">
            {t("finance.emptyTitle")}
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            {t("finance.emptyText")}
          </p>
          <button
            onClick={() => {
              setSelected(null);
              setView("new");
            }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> {t("finance.emptyCta")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold text-foreground mb-2">
            {t("finance.noResultsTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("finance.noResultsText")}
          </p>
        </div>
      ) : (
        // Fase 59 — tabela (cabeçalho em maiúsculas, linhas com hover),
        // igual à referência do Figma, no lugar da lista de cartões.
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {[
                  t("finance.table.patient"),
                  t("finance.table.date"),
                  t("finance.table.amount"),
                  t("finance.table.status"),
                  t("finance.table.actions"),
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 shrink-0 flex items-center justify-center text-sm font-semibold text-primary">
                        {(p.patients?.full_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-foreground">
                        {p.patients?.full_name ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {p.paid_at ? dateLabel(p.paid_at) : dateLabel(p.created_at)}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {currency(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusStyles[p.status] ?? "bg-secondary text-muted-foreground"}`}
                    >
                      {t(`finance.status.${p.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {p.status !== "paid" && (
                        <button
                          onClick={() => markPaid(p.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs font-medium transition-colors"
                        >
                          <Check size={11} /> {t("finance.markPaid")}
                        </button>
                      )}
                      {p.status === "paid" && (
                        <button
                          onClick={() => handlePrintReceipt(p)}
                          title={t("finance.receipt.button")}
                          className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Receipt size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelected(p);
                          setView("edit");
                        }}
                        className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="p-1.5 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("finance.deleteTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("finance.deleteBody")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("finance.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("finance.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pacotes de sessões (Fase 41) ───────────────────────────────────────────
// "Este paciente pagou N sessões adiantado" — até aqui `payments` só sabia
// registrar UM valor por vez, sem noção de saldo de sessões restante. Fica
// numa tela própria (não uma aba dentro de Financeiro) de propósito: é
// simples o bastante pra não precisar reestruturar a tela de pagamentos, que
// já é grande e já funciona.
type SessionPackage = {
  id: string;
  patient_id: string;
  total_sessions: number;
  sessions_used: number;
  amount: number;
  purchased_at: string;
  notes: string | null;
  status: "active" | "completed" | "cancelled";
  patients?: { full_name: string } | null;
};

function PackageForm({
  patients,
  onSave,
  onCancel,
}: {
  patients: PatientOption[];
  onSave: (data: {
    patient_id: string;
    total_sessions: number;
    amount: number;
    notes: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [patientId, setPatientId] = useState("");
  const [totalSessions, setTotalSessions] = useState("10");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(totalSessions);
    const amountValue = Number(amount.replace(",", "."));
    if (!patientId || !Number.isFinite(total) || total <= 0) {
      setError(t("packages.fields.requiredError"));
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      setError(t("packages.fields.invalidAmountError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        patient_id: patientId,
        total_sessions: total,
        amount: amountValue,
        notes: notes.trim() || null,
      });
    } catch {
      setError(t("packages.fields.genericSaveError"));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("packages.fields.patientLabel")}
        </label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        >
          <option value="">{t("packages.fields.selectPatientPlaceholder")}</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("packages.fields.totalSessionsLabel")}
          </label>
          <input
            type="number"
            min={1}
            step="1"
            value={totalSessions}
            onChange={(e) => setTotalSessions(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("packages.fields.amountLabel")}
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("packages.fields.amountPlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("packages.fields.notesLabel")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          {t("packages.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {t("packages.fields.saveNew")}
        </button>
      </div>
    </form>
  );
}

function SessionPackagesView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new">("list");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [profCurrency, setProfCurrency] = useState("BRL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [packagesRes, patientsRes, professionalRes] = await Promise.all([
      supabase
        .from("session_packages")
        .select(
          "id, patient_id, total_sessions, sessions_used, amount, purchased_at, notes, status, patients(full_name)",
        )
        .eq("professional_id", user.id)
        .order("purchased_at", { ascending: false }),
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("professional_id", user.id)
        .order("full_name", { ascending: true }),
      supabase
        .from("professionals")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    if (packagesRes.error) {
      setError(true);
    } else {
      setPackages((packagesRes.data as any as SessionPackage[]) ?? []);
    }
    setPatients((patientsRes.data as PatientOption[]) ?? []);
    setProfCurrency(
      (professionalRes.data as any)?.currency === "EUR" ? "EUR" : "BRL",
    );
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (data: {
    patient_id: string;
    total_sessions: number;
    amount: number;
    notes: string | null;
  }) => {
    const { error: err } = await supabase.from("session_packages").insert({
      ...data,
      professional_id: user.id,
      clinic_id: user.clinicId,
    });
    if (err) throw err;
    await load();
    setView("list");
  };

  // Fase 41 — "usar uma sessão" abate o saldo do pacote; ao chegar no
  // total, marca como concluído sozinho (sem precisar de uma ação manual
  // separada pra "fechar" o pacote).
  const handleUseSession = async (pkg: SessionPackage) => {
    if (pkg.sessions_used >= pkg.total_sessions) return;
    setActionError(false);
    setBusyId(pkg.id);
    const nextUsed = pkg.sessions_used + 1;
    const { error: err } = await supabase
      .from("session_packages")
      .update({
        sessions_used: nextUsed,
        status: nextUsed >= pkg.total_sessions ? "completed" : pkg.status,
      })
      .eq("id", pkg.id);
    setBusyId(null);
    if (err) {
      console.error("Falha ao registrar uso de sessão do pacote:", err);
      setActionError(true);
      return;
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    setActionError(false);
    const { error: err } = await supabase
      .from("session_packages")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Falha ao excluir pacote:", err);
      setActionError(true);
      return;
    }
    setDeleteId(null);
    await load();
  };

  const currency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: profCurrency,
      maximumFractionDigits: 2,
    }).format(value);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));

  const statusStyles: Record<string, string> = {
    active: "bg-secondary text-muted-foreground",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  if (view === "new") {
    return (
      <div>
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft size={16} /> {t("packages.backToList")}
        </button>
        <h2
          className="text-2xl font-light mb-8 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("packages.newTitle")}
        </h2>
        <div className="bg-card border border-border rounded-2xl p-8">
          <PackageForm
            patients={patients}
            onSave={handleCreate}
            onCancel={() => setView("list")}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={() => setView("new")}
          disabled={patients.length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus size={16} /> {t("packages.newPackage")}
        </button>
      </div>

      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {t("packages.actionError")}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" /> {t("packages.loading")}
        </div>
      ) : error ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          {t("packages.errorLoading")}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🌿</p>
          <p className="text-muted-foreground text-sm">
            {t("packages.noPatientsText")}
          </p>
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">📦</p>
          <p className="font-semibold text-foreground mb-2">
            {t("packages.emptyTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("packages.emptyText")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {pkg.patients?.full_name ?? "—"}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusStyles[pkg.status]}`}
                    >
                      {t(`packages.status.${pkg.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("packages.purchasedAt", { date: dateLabel(pkg.purchased_at) })}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteId(pkg.id)}
                  className="p-2 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors text-muted-foreground hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("packages.progressLabel", {
                      used: pkg.sessions_used,
                      total: pkg.total_sessions,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currency(pkg.amount)}
                  </p>
                </div>
                {pkg.status === "active" && (
                  <button
                    onClick={() => handleUseSession(pkg)}
                    disabled={busyId === pkg.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {busyId === pkg.id && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    {t("packages.useSessionButton")}
                  </button>
                )}
              </div>

              {pkg.notes && (
                <p className="text-sm text-muted-foreground mt-3">
                  {pkg.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("packages.deleteTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("packages.deleteBody")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("packages.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("packages.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Configuração da clínica (Fase 9) ────────────────────────────────────────
// Todo psicólogo ganha automaticamente uma clínica própria (gatilho da
// migração da Fase 9, mesmo padrão do auto-provisionamento de
// `professionals` na Fase 3) — então essa tela sempre tem o que editar,
// mesmo pra quem atua sozinho e nunca pensou nisso como "uma clínica".
// Nome e horário de atendimento são salvos direto via supabase-js (RLS
// permite o dono editar a própria clínica); o logo passa pelo backend
// porque grava no Storage com a service role.
type ClinicHours = {
  closed: boolean;
  start: string;
  end: string;
};

type PlanTier = "free" | "professional" | "clinic";

type ClinicRow = {
  id: string;
  name: string;
  logo_url: string | null;
  business_hours: Record<string, ClinicHours>;
  plan: PlanTier;
  owner_id: string | null;
};

const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const DEFAULT_HOURS: ClinicHours = {
  closed: false,
  start: "09:00",
  end: "18:00",
};

function ClinicSettingsView({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const [clinic, setClinic] = useState<ClinicRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [hours, setHours] = useState<Record<string, ClinicHours>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"success" | "error" | null>(
    null,
  );
  const [saveErrorDetail, setSaveErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      if (!user.clinicId) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, logo_url, business_hours, plan, owner_id")
        .eq("id", user.clinicId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        if (error) {
          console.error("Falha ao carregar configurações da clínica:", error);
        }
        setNotFound(true);
        setLoading(false);
        return;
      }

      const row = data as ClinicRow;
      setClinic(row);
      setName(row.name ?? "");
      const filledHours: Record<string, ClinicHours> = {};
      WEEK_DAYS.forEach((day) => {
        filledHours[day] = row.business_hours?.[day] ?? { ...DEFAULT_HOURS };
      });
      setHours(filledHours);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user.clinicId]);

  const setDayHours = (day: string, patch: Partial<ClinicHours>) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB — mesmo limite do backend

  const handleLogoChange = (file: File | null) => {
    if (file && file.size > MAX_LOGO_BYTES) {
      // Antes só descobria isso depois de preencher o resto do formulário
      // inteiro e clicar em salvar — checar aqui dá o aviso na hora, sem
      // nem deixar o arquivo grande demais entrar no estado.
      setSaveErrorDetail(t("clinicSettings.logoTooLarge"));
      setSaveResult("error");
      return;
    }
    setSaveResult(null);
    setSaveErrorDetail(null);
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    if (!name.trim()) {
      setSaveErrorDetail(t("clinicSettings.nameRequired"));
      setSaveResult("error");
      return;
    }
    setSaving(true);
    setSaveResult(null);
    setSaveErrorDetail(null);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ name: name.trim(), business_hours: hours })
        .eq("id", clinic.id);
      if (error) throw error;

      // Nome/horário já estão persistidos neste ponto — reflete no estado
      // local já aqui, e não só no final. Antes, se o upload do logo (passo
      // separado, com sua própria chance de falhar) desse errado, o `catch`
      // avisava "não foi possível salvar" como se nada tivesse sido salvo, e
      // `clinic.name` continuava mostrando o valor antigo mesmo já tendo
      // sido atualizado no banco.
      setClinic((prev) => (prev ? { ...prev, name: name.trim() } : prev));

      if (logoFile) {
        try {
          const body = new FormData();
          body.append("logo_file", logoFile);
          const res = await apiFetch("/clinic/logo", {
            method: "POST",
            body,
          });
          setClinic((prev) =>
            prev ? { ...prev, logo_url: res.logo_url } : prev,
          );
          setLogoFile(null);
          if (logoPreview) URL.revokeObjectURL(logoPreview);
          setLogoPreview(null);
        } catch (logoErr: any) {
          console.error("Falha ao salvar logo da clínica:", logoErr);
          setSaveErrorDetail(t("clinicSettings.logoSaveError"));
          setSaveResult("error");
          return;
        }
      }

      setSaveResult("success");
    } catch (err: any) {
      const raw = err?.message ?? "";
      console.error("Falha ao salvar configuração da clínica:", raw);
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) detail = parsed.error;
      } catch {
        // not JSON — use the raw text as-is
      }
      setSaveErrorDetail(detail || null);
      setSaveResult("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> {t("clinicSettings.loading")}
      </div>
    );
  }

  if (notFound || !clinic) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
        {t("clinicSettings.notFound")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
    <form
      onSubmit={handleSave}
      className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-8"
    >
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("clinicSettings.nameLabel")} *
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("clinicSettings.namePlaceholder")}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("clinicSettings.logoLabel")}
        </label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview || clinic.logo_url ? (
              <img
                src={logoPreview ?? clinic.logo_url ?? undefined}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 size={22} className="text-muted-foreground" />
            )}
          </div>
          <label className="flex items-center gap-2 border border-border rounded-full px-4 py-2 text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer">
            <Upload size={13} />
            {t("clinicSettings.logoUpload")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("clinicSettings.hoursLabel")}
        </label>
        <div className="flex flex-col gap-2">
          {WEEK_DAYS.map((day) => {
            const dayHours = hours[day] ?? DEFAULT_HOURS;
            return (
              <div
                key={day}
                className="flex items-center gap-3 flex-wrap sm:flex-nowrap"
              >
                <span className="text-sm text-foreground w-28 shrink-0">
                  {t(`clinicSettings.days.${day}`)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDayHours(day, { closed: !dayHours.closed })
                  }
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {dayHours.closed ? (
                    <ToggleLeft size={22} />
                  ) : (
                    <ToggleRight size={22} className="text-primary" />
                  )}
                  {dayHours.closed
                    ? t("clinicSettings.closed")
                    : t("clinicSettings.open")}
                </button>
                {!dayHours.closed && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={dayHours.start}
                      onChange={(e) =>
                        setDayHours(day, { start: e.target.value })
                      }
                      className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                    <span className="text-muted-foreground text-xs">
                      {t("clinicSettings.hoursTo")}
                    </span>
                    <input
                      type="time"
                      value={dayHours.end}
                      onChange={(e) =>
                        setDayHours(day, { end: e.target.value })
                      }
                      className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {saveResult === "error" && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {t("clinicSettings.saveError")}
          {saveErrorDetail ? ` (${saveErrorDetail})` : ""}
        </p>
      )}
      {saveResult === "success" && (
        <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          {t("clinicSettings.saveSuccess")}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {saving ? t("clinicSettings.saving") : t("clinicSettings.save")}
        </button>
      </div>
    </form>

      <ProfessionalTeamSection
        clinicId={clinic.id}
        plan={clinic.plan}
        ownerId={clinic.owner_id}
        currentUserId={user.id}
      />
      <ClinicPatientReassignSection
        clinicId={clinic.id}
        plan={clinic.plan}
        ownerId={clinic.owner_id}
        currentUserId={user.id}
      />
      <SecretaryTeamSection clinicId={clinic.id} plan={clinic.plan} />
    </div>
  );
}

// ─── Equipe: profissionais (Fase 26 — só no pacote empresarial) ────────────
// Todo cadastro público de psicólogo ganha uma clínica própria automática
// (Fase 9) — bom pra quem atua sozinho, mas sem saída nenhuma pra reunir
// vários psicólogos que já têm conta numa única clínica de verdade (o caso
// de uma empresa/consultório com equipe). Esta seção fecha essa ponta:
// mesmo padrão de "vincular conta existente" já usado pra secretária, só
// que pra outro psicólogo. O dono da clínica nunca aparece com botão de
// remover (não faz sentido "remover o dono" por aqui — ver comentário no
// backend).
type ClinicProfessionalRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  // Fase 37 — % que fica com a clínica sobre o que este profissional
  // recebe dos próprios pacientes. Null = ainda não configurado.
  commission_percent: number | null;
};

function ProfessionalTeamSection({
  clinicId,
  plan,
  ownerId,
  currentUserId,
}: {
  clinicId: string;
  plan: PlanTier;
  ownerId: string | null;
  currentUserId: string;
}) {
  const { t } = useTranslation();
  const [professionals, setProfessionals] = useState<ClinicProfessionalRow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [removeTarget, setRemoveTarget] =
    useState<ClinicProfessionalRow | null>(null);
  const [removeError, setRemoveError] = useState(false);
  // Fase 37 — rascunho do % de comissão por profissional (chave = id),
  // separado do valor já salvo em `professionals` pra permitir editar sem
  // disparar save a cada tecla; e o estado de "salvando"/"erro" por linha.
  const [commissionDrafts, setCommissionDrafts] = useState<
    Record<string, string>
  >({});
  const [savingCommissionId, setSavingCommissionId] = useState<string | null>(
    null,
  );
  const [commissionErrorId, setCommissionErrorId] = useState<string | null>(
    null,
  );

  const isBusinessPlan = plan === "clinic";

  const load = useCallback(async () => {
    setLoading(true);
    // Fase 37 — busca a partir de `professionals` (não `profiles`) porque
    // é o mesmo sentido de embed já usado no resto do app (ver
    // mapProfessionalRow e afins); `professionals.clinic_id` já filtra só
    // quem é psicólogo desta clínica, então o `.eq("role", "psychologist")`
    // de antes era redundante. `commission_percent` mora numa tabela à
    // parte (`professional_commissions`, não coluna aqui) — ver comentário
    // na migração da Fase 37 — mas dá pra embutir do mesmo jeito porque
    // existe FK entre as duas; a RLS dessa tabela garante que só o dono da
    // clínica (ou o próprio profissional) recebe algo aqui, sem precisar
    // de nenhum filtro extra no frontend.
    const { data } = await supabase
      .from("professionals")
      .select(
        "id, profiles(full_name, email), professional_commissions(commission_percent)",
      )
      .eq("clinic_id", clinicId);
    const rows: ClinicProfessionalRow[] = ((data ?? []) as any[]).map(
      (p) => ({
        id: p.id,
        full_name: p.profiles?.full_name ?? null,
        email: p.profiles?.email ?? null,
        commission_percent:
          typeof p.professional_commissions?.commission_percent === "number"
            ? p.professional_commissions.commission_percent
            : null,
      }),
    );
    setProfessionals(rows);
    setCommissionDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const r of rows) {
        next[r.id] =
          prev[r.id] !== undefined
            ? prev[r.id]
            : r.commission_percent != null
              ? String(r.commission_percent)
              : "";
      }
      return next;
    });
    setLoading(false);
  }, [clinicId]);

  const handleSaveCommission = async (id: string) => {
    const raw = (commissionDrafts[id] ?? "").trim();
    let value: number | null = null;
    if (raw !== "") {
      const parsed = Number(raw.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        setCommissionErrorId(id);
        return;
      }
      value = parsed;
    }
    setCommissionErrorId(null);
    setSavingCommissionId(id);
    try {
      await apiFetch(`/clinic/professional/${id}/commission`, {
        method: "PUT",
        body: JSON.stringify({ commission_percent: value }),
      });
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, commission_percent: value } : p,
        ),
      );
    } catch (err) {
      console.error("Falha ao salvar comissão do profissional:", err);
      setCommissionErrorId(id);
    } finally {
      setSavingCommissionId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    setRemoveError(false);
    try {
      await apiFetch(`/clinic/professional/${id}`, { method: "DELETE" });
      setRemoveTarget(null);
      await load();
    } catch (err) {
      console.error("Falha ao remover profissional da clínica:", err);
      setRemoveError(true);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-8">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-lg font-semibold text-foreground">
          {t("clinicSettings.professionals.title")}
        </h3>
        {!isBusinessPlan ? (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
            {t("clinicSettings.professionals.badge")}
          </span>
        ) : (
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <LinkIcon size={14} /> {t("linkAccount.professionalButton")}
          </button>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        {t("clinicSettings.professionals.subtitle")}
      </p>

      {!isBusinessPlan ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          {t("clinicSettings.professionals.upsell")}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-3">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        professionals.length > 0 && (
          <div className="space-y-2">
            {professionals.map((p) => {
              const isOwner = p.id === ownerId;
              const isSelf = p.id === currentUserId;
              // Fase 37 — só o dono da clínica pode ver/editar o campo de
              // comissão; pro backend, tentativa de outra pessoa salvar é
              // rejeitada de qualquer forma (ver rota PUT .../commission),
              // isso aqui é só pra não mostrar um campo que não vai
              // funcionar pra quem não é dono.
              const viewerIsOwner = currentUserId === ownerId;
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 bg-secondary rounded-lg px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                        {p.full_name || t("userMenu.noName")}
                        {isOwner && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent shrink-0">
                            {t("clinicSettings.professionals.ownerBadge")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.email}
                      </p>
                    </div>
                    {!isOwner && !isSelf && (
                      <button
                        onClick={() => {
                          setRemoveError(false);
                          setRemoveTarget(p);
                        }}
                        disabled={removingId === p.id}
                        className="text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {removingId === p.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          t("clinicSettings.professionals.remove")
                        )}
                      </button>
                    )}
                  </div>
                  {/* Fase 37 — % de comissão só faz sentido pra quem não é o
                      dono (o dono não tem repasse consigo mesmo). */}
                  {!isOwner && viewerIsOwner && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <label className="text-xs text-muted-foreground shrink-0">
                        {t("clinicSettings.professionals.commissionLabel")}
                      </label>
                      <div className="relative w-24">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={commissionDrafts[p.id] ?? ""}
                          onChange={(e) =>
                            setCommissionDrafts((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="w-full pl-2 pr-5 py-1 text-sm rounded-md border border-border bg-background text-foreground"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          %
                        </span>
                      </div>
                      <button
                        onClick={() => handleSaveCommission(p.id)}
                        disabled={savingCommissionId === p.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0 flex items-center gap-1.5"
                      >
                        {savingCommissionId === p.id && (
                          <Loader2 size={12} className="animate-spin" />
                        )}
                        {t("clinicSettings.professionals.commissionSave")}
                      </button>
                      {commissionErrorId === p.id && (
                        <span className="text-xs text-red-500">
                          {t("clinicSettings.professionals.commissionError")}
                        </span>
                      )}
                    </div>
                  )}
                  {!isOwner && !viewerIsOwner && p.commission_percent != null && (
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-xs text-muted-foreground">
                        {t("clinicSettings.professionals.commissionReadOnly", {
                          value: p.commission_percent,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {showLinkModal && (
        <LinkAccountModal
          title={t("linkAccount.professionalTitle")}
          subtitle={t("linkAccount.professionalSubtitle")}
          endpoint="/clinic/professional/link-existing"
          onLinked={() => {
            setShowLinkModal(false);
            load();
          }}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {removeTarget && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("clinicSettings.professionals.removeConfirmTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("clinicSettings.professionals.removeConfirmBody", {
                name: removeTarget.full_name || removeTarget.email,
              })}
            </p>
            {removeError && (
              <p className="text-red-500 text-xs mb-4">
                {t("clinicSettings.professionals.removeError")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("admin.cancel")}
              </button>
              <button
                onClick={() => handleRemove(removeTarget.id)}
                disabled={removingId === removeTarget.id}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
              >
                {removingId === removeTarget.id && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {t("clinicSettings.professionals.remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reatribuir paciente entre profissionais da clínica (Fase 39) ─────────
// Até aqui só o admin da plataforma conseguia mudar o profissional
// responsável por um paciente já cadastrado (`AdminPatientsView`). Isso
// obrigava a clínica a pedir suporte pra mover um paciente entre membros da
// própria equipe — algo que o dono devia poder fazer sozinho. A tela normal
// de pacientes (`PatientsView`) não serve pra isso: ela só existe do ponto
// de vista de UM profissional logado (`.eq("professional_id", user.id)`),
// então esta seção é separada, dentro de Configurações → Clínica, só pro
// dono.
type ClinicPatientRow = {
  id: string;
  full_name: string;
  professional_id: string;
};

function ClinicPatientReassignSection({
  clinicId,
  plan,
  ownerId,
  currentUserId,
}: {
  clinicId: string;
  plan: PlanTier;
  ownerId: string | null;
  currentUserId: string;
}) {
  const { t } = useTranslation();
  const isOwner = currentUserId === ownerId;
  const isBusinessPlan = plan === "clinic";
  const [patients, setPatients] = useState<ClinicPatientRow[]>([]);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccessId, setActionSuccessId] = useState<string | null>(null);

  // Só é útil pro dono, com plano empresarial — o resto nem carrega os
  // dados (evita uma query que a RLS ia negar de qualquer forma pra
  // quem não é dono).
  const shouldLoad = isOwner && isBusinessPlan;

  const load = useCallback(async () => {
    if (!shouldLoad) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [patientsRes, teamRes] = await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name, professional_id")
        .eq("clinic_id", clinicId)
        .order("full_name", { ascending: true }),
      supabase
        .from("professionals")
        .select("id, profiles(full_name)")
        .eq("clinic_id", clinicId),
    ]);
    setPatients((patientsRes.data as ClinicPatientRow[]) ?? []);
    setTeam(
      ((teamRes.data ?? []) as any[]).map((p) => ({
        id: p.id,
        name: p.profiles?.full_name || t("userMenu.noName"),
      })),
    );
    setLoading(false);
  }, [shouldLoad, clinicId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const teamById = new Map(team.map((p) => [p.id, p.name]));

  const handleReassign = async (patient: ClinicPatientRow) => {
    const targetId = pick[patient.id];
    if (!targetId || targetId === patient.professional_id) return;
    setBusyId(patient.id);
    setActionError(null);
    setActionSuccessId(null);
    try {
      await apiFetch(`/clinic/patient/${patient.id}/reassign`, {
        method: "PUT",
        body: JSON.stringify({ professional_id: targetId }),
      });
      setActionSuccessId(patient.id);
      await load();
    } catch (err) {
      console.error("Falha ao reatribuir paciente:", err);
      setActionError(patient.id);
    } finally {
      setBusyId(null);
    }
  };

  // Não mostra nada pra quem não é dono, nem no plano gratuito/profissional
  // (não faz sentido reatribuir com um profissional só), nem quando a
  // equipe ainda não tem ninguém além do próprio dono.
  if (!isOwner || !isBusinessPlan || (!loading && team.length < 2)) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8">
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {t("clinicSettings.reassign.title")}
      </h3>
      <p className="text-muted-foreground text-sm mb-6">
        {t("clinicSettings.reassign.subtitle")}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-3">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : patients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("clinicSettings.reassign.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {actionError && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-2">
              {t("clinicSettings.reassign.error")}
            </p>
          )}
          {patients.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-secondary rounded-lg px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {p.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t("clinicSettings.reassign.currentLabel", {
                    name: teamById.get(p.professional_id) || "—",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {actionSuccessId === p.id && (
                  <Check size={14} className="text-green-600" />
                )}
                <select
                  value={pick[p.id] ?? p.professional_id}
                  onChange={(e) =>
                    setPick((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors max-w-[200px]"
                >
                  {team.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleReassign(p)}
                  disabled={
                    !pick[p.id] ||
                    pick[p.id] === p.professional_id ||
                    busyId === p.id
                  }
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-foreground text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {busyId === p.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <LinkIcon size={12} />
                  )}
                  {t("clinicSettings.reassign.button")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Repasses e comissões (Fase 37 — só o dono da clínica, plano
// empresarial com mais de um profissional) ──────────────────────────────
// "Quanto cada profissional da equipe já recebeu dos próprios pacientes,
// quanto disso é comissão da clínica, quanto já foi repassado e quanto
// ainda falta" — só existe pra quem tem `commission_percent` configurado
// (ver ProfessionalTeamSection); sem isso não dá pra calcular nada.
type ClinicPayoutSummary = {
  professionalId: string;
  fullName: string | null;
  currency: string;
  commissionPercent: number | null;
  grossPaid: number;
  paidOut: number;
  pending: number;
};

type ClinicPayoutRecord = {
  id: string;
  professional_id: string;
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
  notes: string | null;
  commission_percent_snapshot: number | null;
  created_at: string;
};

// Fase 47 — relatórios agregados da CLÍNICA (faturamento e retenção do
// time todo), diferente do `FinanceView` (individual, só o próprio
// profissional) e do `ClinicPayoutsView` (comissão/repasse, não
// faturamento bruto nem retenção). Moeda de referência dos totais é a do
// dono da clínica — clínicas normalmente operam numa moeda só; se algum
// dia a equipe tiver moedas diferentes, os totais viram uma aproximação
// (soma bruta sem conversão), o que já é bem mais raro que o caso comum.
type ClinicReportProfessionalRow = {
  professionalId: string;
  fullName: string | null;
  revenueThisMonth: number;
  revenueTotal: number;
  activePatients: number;
  completedThisMonth: number;
};

function ClinicReportsView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currency, setCurrency] = useState("BRL");
  const [rows, setRows] = useState<ClinicReportProfessionalRow[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<
    { month: string; total: number }[]
  >([]);
  const [retentionRate, setRetentionRate] = useState<number | null>(null);
  const [totalActivePatients, setTotalActivePatients] = useState(0);
  const [totalRevenueThisMonth, setTotalRevenueThisMonth] = useState(0);
  const [totalCompletedThisMonth, setTotalCompletedThisMonth] = useState(0);

  const load = useCallback(async () => {
    if (!user.clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    const [ownerRes, professionalsRes] = await Promise.all([
      supabase
        .from("professionals")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("professionals")
        .select("id, profiles(full_name)")
        .eq("clinic_id", user.clinicId),
    ]);

    setCurrency(
      (ownerRes.data as any)?.currency === "EUR" ? "EUR" : "BRL",
    );

    if (professionalsRes.error) {
      console.error(
        "Falha ao carregar equipe pros relatórios:",
        professionalsRes.error,
      );
      setError(true);
      setLoading(false);
      return;
    }

    const team = (professionalsRes.data ?? []) as any[];
    const teamIds = team.map((p) => p.id);
    if (teamIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const [paymentsRes, patientsRes, appointmentsRes] = await Promise.all([
      supabase
        .from("payments")
        .select("professional_id, amount, status, paid_at")
        .in("professional_id", teamIds),
      supabase
        .from("patients")
        .select("id, professional_id, status")
        .eq("clinic_id", user.clinicId),
      supabase
        .from("appointments")
        .select("professional_id, patient_id, status, starts_at")
        .eq("clinic_id", user.clinicId),
    ]);

    if (paymentsRes.error || patientsRes.error || appointmentsRes.error) {
      console.error(
        "Falha ao carregar dados dos relatórios:",
        paymentsRes.error || patientsRes.error || appointmentsRes.error,
      );
      setError(true);
      setLoading(false);
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const payments = (paymentsRes.data ?? []) as any[];
    const patients = (patientsRes.data ?? []) as any[];
    const appointments = (appointmentsRes.data ?? []) as any[];

    // Faturamento por mês (últimos 6), clínica toda — mesmo padrão de
    // bucket usado em `FinanceView`/`PatientArea`.
    const buckets = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    payments.forEach((p) => {
      if (p.status !== "paid" || !p.paid_at) return;
      const d = new Date(p.paid_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount));
      }
    });
    setRevenueByMonth(
      Array.from(buckets.entries()).map(([key, total]) => {
        const [y, m] = key.split("-").map(Number);
        return { month: new Date(y, m, 1).toISOString(), total };
      }),
    );

    // Retenção: entre os pacientes que já tiveram ao menos 1 sessão
    // concluída, quantos voltaram pra uma 2ª (ou mais) — proxy simples e
    // padrão de "cliente que retorna" pra terapia.
    const completedByPatient = new Map<string, number>();
    appointments.forEach((a) => {
      if (a.status !== "completed") return;
      completedByPatient.set(
        a.patient_id,
        (completedByPatient.get(a.patient_id) ?? 0) + 1,
      );
    });
    const patientsWithSession = completedByPatient.size;
    const patientsReturning = Array.from(completedByPatient.values()).filter(
      (c) => c >= 2,
    ).length;
    setRetentionRate(
      patientsWithSession > 0
        ? (patientsReturning / patientsWithSession) * 100
        : null,
    );

    setTotalActivePatients(
      patients.filter((p) => p.status === "active").length,
    );
    setTotalRevenueThisMonth(
      payments
        .filter(
          (p) =>
            p.status === "paid" && p.paid_at && new Date(p.paid_at) >= monthStart,
        )
        .reduce((sum, p) => sum + Number(p.amount), 0),
    );
    setTotalCompletedThisMonth(
      appointments.filter(
        (a) => a.status === "completed" && new Date(a.starts_at) >= monthStart,
      ).length,
    );

    const nextRows: ClinicReportProfessionalRow[] = team.map((p) => {
      const profPayments = payments.filter((x) => x.professional_id === p.id);
      const profPatients = patients.filter((x) => x.professional_id === p.id);
      const profAppointments = appointments.filter(
        (x) => x.professional_id === p.id,
      );
      return {
        professionalId: p.id,
        fullName: p.profiles?.full_name ?? null,
        revenueThisMonth: profPayments
          .filter(
            (x) =>
              x.status === "paid" &&
              x.paid_at &&
              new Date(x.paid_at) >= monthStart,
          )
          .reduce((sum, x) => sum + Number(x.amount), 0),
        revenueTotal: profPayments
          .filter((x) => x.status === "paid")
          .reduce((sum, x) => sum + Number(x.amount), 0),
        activePatients: profPatients.filter((x) => x.status === "active")
          .length,
        completedThisMonth: profAppointments.filter(
          (x) =>
            x.status === "completed" && new Date(x.starts_at) >= monthStart,
        ).length,
      };
    });
    setRows(nextRows);
    setLoading(false);
  }, [user.clinicId, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const money = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const monthLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(
      new Date(iso),
    );

  if (!user.clinicId) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("clinicReports.noClinic")}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />
        {t("clinicReports.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-500 text-sm">{t("clinicReports.errorLoading")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("clinicReports.kpi.revenueThisMonth")}
          </p>
          <p
            className="text-2xl font-light text-foreground mt-1"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {money(totalRevenueThisMonth)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("clinicReports.kpi.activePatients")}
          </p>
          <p
            className="text-2xl font-light text-foreground mt-1"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {totalActivePatients}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("clinicReports.kpi.retentionRate")}
          </p>
          <p
            className="text-2xl font-light text-foreground mt-1"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {retentionRate == null ? "—" : `${retentionRate.toFixed(0)}%`}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("clinicReports.kpi.completedThisMonth")}
          </p>
          <p
            className="text-2xl font-light text-foreground mt-1"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {totalCompletedThisMonth}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {t("clinicReports.chartTitle")}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {t("clinicReports.chartHint")}
        </p>
        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByMonth}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="month"
                tickFormatter={monthLabel}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => money(Number(v))}
              />
              <RechartsTooltip
                labelFormatter={(v) => monthLabel(String(v))}
                formatter={(v: number) => money(v)}
              />
              <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {t("clinicReports.byProfessionalTitle")}
        </h3>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("clinicReports.noProfessionals")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="pb-2 pr-3 font-semibold">
                    {t("clinicReports.table.professional")}
                  </th>
                  <th className="pb-2 pr-3 font-semibold">
                    {t("clinicReports.table.revenueThisMonth")}
                  </th>
                  <th className="pb-2 pr-3 font-semibold">
                    {t("clinicReports.table.revenueTotal")}
                  </th>
                  <th className="pb-2 pr-3 font-semibold">
                    {t("clinicReports.table.activePatients")}
                  </th>
                  <th className="pb-2 font-semibold">
                    {t("clinicReports.table.completedThisMonth")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.professionalId}>
                    <td className="py-2.5 pr-3 text-foreground">
                      {r.fullName ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-foreground">
                      {money(r.revenueThisMonth)}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {money(r.revenueTotal)}
                    </td>
                    <td className="py-2.5 pr-3 text-foreground">
                      {r.activePatients}
                    </td>
                    <td className="py-2.5 text-foreground">
                      {r.completedThisMonth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ClinicPayoutsView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summaries, setSummaries] = useState<ClinicPayoutSummary[]>([]);
  const [records, setRecords] = useState<ClinicPayoutRecord[]>([]);
  const [namesById, setNamesById] = useState<Record<string, string | null>>(
    {},
  );

  const [registerTarget, setRegisterTarget] =
    useState<ClinicPayoutSummary | null>(null);
  const [registerAmount, setRegisterAmount] = useState("");
  const [registerNotes, setRegisterNotes] = useState("");
  const [registerSaving, setRegisterSaving] = useState(false);
  const [registerError, setRegisterError] = useState(false);

  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  const load = useCallback(async () => {
    if (!user.clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    const professionalsRes = await supabase
      .from("professionals")
      .select(
        "id, currency, profiles(full_name), professional_commissions(commission_percent)",
      )
      .eq("clinic_id", user.clinicId);

    if (professionalsRes.error) {
      console.error(
        "Falha ao carregar equipe pra repasses:",
        professionalsRes.error,
      );
      setError(true);
      setLoading(false);
      return;
    }

    // O dono não tem comissão consigo mesmo (ver mesma regra em
    // ProfessionalTeamSection) — fora dele da lista de repasses.
    const team = ((professionalsRes.data ?? []) as any[]).filter(
      (p) => p.id !== user.id,
    );
    const teamIds = team.map((p) => p.id);
    const namesMap: Record<string, string | null> = {};
    team.forEach((p) => {
      namesMap[p.id] = p.profiles?.full_name ?? null;
    });
    setNamesById(namesMap);

    if (teamIds.length === 0) {
      setSummaries([]);
      setRecords([]);
      setLoading(false);
      return;
    }

    const [paymentsRes, payoutsRes] = await Promise.all([
      supabase
        .from("payments")
        .select("professional_id, amount, status")
        .in("professional_id", teamIds),
      supabase
        .from("payouts")
        .select(
          "id, professional_id, amount, status, paid_at, notes, commission_percent_snapshot, created_at",
        )
        .eq("clinic_id", user.clinicId)
        .order("created_at", { ascending: false }),
    ]);

    if (paymentsRes.error || payoutsRes.error) {
      console.error(
        "Falha ao carregar pagamentos/repasses da equipe:",
        paymentsRes.error || payoutsRes.error,
      );
      setError(true);
      setLoading(false);
      return;
    }

    const grossByProf = new Map<string, number>();
    (paymentsRes.data ?? []).forEach((p: any) => {
      if (p.status !== "paid") return;
      grossByProf.set(
        p.professional_id,
        (grossByProf.get(p.professional_id) ?? 0) + Number(p.amount),
      );
    });

    const paidOutByProf = new Map<string, number>();
    (payoutsRes.data ?? []).forEach((p: any) => {
      if (p.status !== "paid") return;
      paidOutByProf.set(
        p.professional_id,
        (paidOutByProf.get(p.professional_id) ?? 0) + Number(p.amount),
      );
    });

    const nextSummaries: ClinicPayoutSummary[] = team.map((p) => {
      const gross = grossByProf.get(p.id) ?? 0;
      const commission =
        typeof p.professional_commissions?.commission_percent === "number"
          ? p.professional_commissions.commission_percent
          : null;
      // Repasse pendente é calculado sobre o total histórico (não
      // período), pra não contar duas vezes — ver nota no início da Fase
      // 37: (recebido líquido de comissão) − (já pago), nunca negativo.
      const netOwed = commission != null ? gross * (1 - commission / 100) : 0;
      const paidOut = paidOutByProf.get(p.id) ?? 0;
      const pending = Math.max(0, netOwed - paidOut);
      return {
        professionalId: p.id,
        fullName: p.profiles?.full_name ?? null,
        currency: p.currency === "EUR" ? "EUR" : "BRL",
        commissionPercent: commission,
        grossPaid: gross,
        paidOut,
        pending,
      };
    });
    setSummaries(nextSummaries);
    setRecords((payoutsRes.data as ClinicPayoutRecord[]) ?? []);
    setLoading(false);
  }, [user.clinicId, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openRegister = (summary: ClinicPayoutSummary) => {
    setRegisterTarget(summary);
    setRegisterAmount(summary.pending > 0 ? summary.pending.toFixed(2) : "");
    setRegisterNotes("");
    setRegisterError(false);
  };

  const handleRegister = async () => {
    if (!registerTarget || !user.clinicId) return;
    const parsed = Number(registerAmount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRegisterError(true);
      return;
    }
    setRegisterSaving(true);
    setRegisterError(false);
    // Repasse nasce "pendente" (espelha handleSave de FinanceView) — vira
    // "pago" só quando alguém confirma via markPaid, ação separada.
    const { error: err } = await supabase.from("payouts").insert({
      professional_id: registerTarget.professionalId,
      clinic_id: user.clinicId,
      amount: parsed,
      commission_percent_snapshot: registerTarget.commissionPercent,
      status: "pending",
      notes: registerNotes.trim() || null,
      created_by: user.id,
    });
    if (err) {
      console.error("Falha ao registrar repasse:", err);
      setRegisterError(true);
      setRegisterSaving(false);
      return;
    }
    setRegisterSaving(false);
    setRegisterTarget(null);
    await load();
  };

  const markPaid = async (id: string) => {
    setActionError(false);
    setMarkingPaidId(id);
    const { error: err } = await supabase
      .from("payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      console.error("Falha ao marcar repasse como pago:", err);
      setActionError(true);
    } else {
      await load();
    }
    setMarkingPaidId(null);
  };

  const currency = (value: number, curr: string) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: curr === "EUR" ? "EUR" : "BRL",
      maximumFractionDigits: 2,
    }).format(value);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> {t("payouts.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("payouts.errorLoading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {summaries.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🤝</p>
          <p className="font-semibold text-foreground mb-2">
            {t("payouts.emptyTeamTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("payouts.emptyTeamBody")}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {summaries.map((s) => (
            <div
              key={s.professionalId}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-foreground truncate">
                  {s.fullName || t("userMenu.noName")}
                </p>
                {s.commissionPercent != null ? (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground shrink-0">
                    {t("payouts.commissionBadge", {
                      value: s.commissionPercent,
                    })}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                    {t("payouts.commissionMissingBadge")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("payouts.grossPaidLabel")}
                  </p>
                  <p className="font-medium text-foreground">
                    {currency(s.grossPaid, s.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("payouts.paidOutLabel")}
                  </p>
                  <p className="font-medium text-foreground">
                    {currency(s.paidOut, s.currency)}
                  </p>
                </div>
              </div>
              <div className="bg-secondary rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("payouts.pendingLabel")}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {currency(s.pending, s.currency)}
                  </p>
                </div>
                <button
                  onClick={() => openRegister(s)}
                  disabled={s.commissionPercent == null}
                  className="text-xs font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {t("payouts.registerButton")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t("payouts.historyTitle")}
        </h3>
        {actionError && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {t("payouts.actionError")}
          </p>
        )}
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("payouts.historyEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {namesById[r.professional_id] || t("userMenu.noName")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.status === "paid" && r.paid_at
                      ? t("payouts.historyPaidAt", {
                          date: dateLabel(r.paid_at),
                        })
                      : t("payouts.historyRegisteredAt", {
                          date: dateLabel(r.created_at),
                        })}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-foreground">
                    {currency(
                      Number(r.amount),
                      summaries.find(
                        (s) => s.professionalId === r.professional_id,
                      )?.currency ?? "BRL",
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                      r.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {t(
                      r.status === "paid"
                        ? "payouts.status.paid"
                        : "payouts.status.pending",
                    )}
                  </span>
                  {r.status === "pending" && (
                    <button
                      onClick={() => markPaid(r.id)}
                      disabled={markingPaidId === r.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {markingPaidId === r.id && (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      {t("payouts.markPaid")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {registerTarget && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => {
            if (!registerSaving) setRegisterTarget(null);
          }}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-1">
              {t("payouts.registerModalTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {registerTarget.fullName || t("userMenu.noName")}
            </p>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {t("payouts.amountLabel")}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={registerAmount}
              onChange={(e) => setRegisterAmount(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors mb-4"
            />
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {t("payouts.notesLabel")}
            </label>
            <textarea
              value={registerNotes}
              onChange={(e) => setRegisterNotes(e.target.value)}
              rows={2}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors mb-4 resize-none"
            />
            {registerError && (
              <p className="text-red-500 text-xs mb-4">
                {t("payouts.registerError")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRegisterTarget(null)}
                disabled={registerSaving}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {t("admin.cancel")}
              </button>
              <button
                onClick={handleRegister}
                disabled={registerSaving}
                className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
              >
                {registerSaving && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {t("payouts.registerConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Equipe: secretária (Fase 18 — só no pacote empresarial) ────────────────
// Convite/remoção fica fora do <form> de cima de propósito — são ações
// próprias (cada uma sua própria chamada, seu próprio estado de
// carregamento), não faz sentido serem submetidas junto com nome/horário da
// clínica.
type ClinicSecretaryRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function SecretaryTeamSection({
  clinicId,
  plan,
}: {
  clinicId: string;
  plan: PlanTier;
}) {
  const { t } = useTranslation();
  const [secretaries, setSecretaries] = useState<ClinicSecretaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ClinicSecretaryRow | null>(
    null,
  );
  const [removeError, setRemoveError] = useState(false);
  // Fase 27 — código de convite da clínica: cadastro autônomo de
  // secretária sem precisar convidar uma por uma (nome + e-mail).
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isBusinessPlan = plan === "clinic";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("clinic_id", clinicId)
      .eq("role", "secretary");
    setSecretaries((data as ClinicSecretaryRow[]) ?? []);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isBusinessPlan) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("clinics")
        .select("secretary_invite_code")
        .eq("id", clinicId)
        .maybeSingle();
      if (!cancelled) setInviteCode(data?.secretary_invite_code ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [clinicId, isBusinessPlan]);

  const inviteLink = inviteCode
    ? `${window.location.origin}${window.location.pathname}#cadastro-secretaria?code=${inviteCode}`
    : "";

  const copyText = async (
    text: string,
    setCopied: (v: boolean) => void,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível — sem tela de erro dedicada, ainda dá pra
      // selecionar e copiar o texto na mão.
    }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.rpc(
        "regenerate_secretary_invite_code",
        { target_clinic_id: clinicId },
      );
      if (error) throw error;
      setInviteCode(data as string);
      setConfirmingRegenerate(false);
    } catch (err) {
      console.error("Falha ao gerar novo código de convite:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await apiFetch("/clinic/secretary/invite", {
        method: "POST",
        body: JSON.stringify({ full_name: name.trim(), email: email.trim() }),
      });
      setName("");
      setEmail("");
      setInviteSuccess(true);
      await load();
    } catch (err: any) {
      let message = err?.message || "";
      try {
        const parsed = JSON.parse(message);
        if (parsed?.error) message = parsed.error;
      } catch {
        /* raw message already usable */
      }
      setInviteError(
        message === "secretary_requires_business_plan"
          ? t("clinicSettings.secretary.planRequired")
          : message || t("clinicSettings.secretary.inviteError"),
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    setRemoveError(false);
    try {
      await apiFetch(`/clinic/secretary/${id}`, { method: "DELETE" });
      setRemoveTarget(null);
      await load();
    } catch (err) {
      console.error("Falha ao remover secretária:", err);
      setRemoveError(true);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-8">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-lg font-semibold text-foreground">
          {t("clinicSettings.secretary.title")}
        </h3>
        {!isBusinessPlan ? (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
            {t("clinicSettings.secretary.badge")}
          </span>
        ) : (
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <LinkIcon size={14} /> {t("linkAccount.secretaryButton")}
          </button>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        {t("clinicSettings.secretary.subtitle")}
      </p>

      {!isBusinessPlan ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          {t("clinicSettings.secretary.upsell")}
        </div>
      ) : (
        <>
          {inviteCode && (
            <div className="bg-secondary border border-border rounded-xl p-5 mb-6">
              <p className="text-sm font-semibold text-foreground mb-1">
                {t("clinicSettings.secretary.inviteCode.title")}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("clinicSettings.secretary.inviteCode.hint")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg tracking-widest bg-background border border-border rounded-lg px-4 py-2 text-foreground">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(inviteCode, setCopiedCode)}
                  className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-full px-3 py-1.5 hover:bg-background transition-colors text-muted-foreground"
                >
                  <Copy size={12} />
                  {copiedCode
                    ? t("clinicSettings.secretary.inviteCode.copied")
                    : t("clinicSettings.secretary.inviteCode.copyCode")}
                </button>
                <button
                  type="button"
                  onClick={() => copyText(inviteLink, setCopiedLink)}
                  className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-full px-3 py-1.5 hover:bg-background transition-colors text-muted-foreground"
                >
                  <LinkIcon size={12} />
                  {copiedLink
                    ? t("clinicSettings.secretary.inviteCode.copied")
                    : t("clinicSettings.secretary.inviteCode.copyLink")}
                </button>
                {confirmingRegenerate ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {t("clinicSettings.secretary.inviteCode.confirmRegenerate")}
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      disabled={regenerating}
                      className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {regenerating ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        t("clinicSettings.secretary.inviteCode.confirmYes")
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingRegenerate(false)}
                      className="text-muted-foreground hover:underline"
                    >
                      {t("admin.cancel")}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingRegenerate(true)}
                    className="text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    {t("clinicSettings.secretary.inviteCode.regenerate")}
                  </button>
                )}
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-3">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : (
            secretaries.length > 0 && (
              <div className="space-y-2 mb-6">
                {secretaries.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 bg-secondary rounded-lg px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.full_name || t("userMenu.noName")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setRemoveError(false);
                        setRemoveTarget(s);
                      }}
                      disabled={removingId === s.id}
                      className="text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {removingId === s.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        t("clinicSettings.secretary.remove")
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("clinicSettings.secretary.orInviteByEmail")}
          </p>
          <form
            onSubmit={handleInvite}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profileForm.namePlaceholder")}
              className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
              className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
            >
              {inviting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {t("clinicSettings.secretary.invite")}
            </button>
          </form>
          {inviteError && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4">
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3 mt-4">
              {t("clinicSettings.secretary.inviteSuccess")}
            </p>
          )}
        </>
      )}

      {showLinkModal && (
        <LinkAccountModal
          title={t("linkAccount.secretaryTitle")}
          subtitle={t("linkAccount.secretarySubtitle")}
          endpoint="/clinic/secretary/link-existing"
          onLinked={() => {
            setShowLinkModal(false);
            load();
          }}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {removeTarget && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {t("clinicSettings.secretary.removeConfirmTitle")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t("clinicSettings.secretary.removeConfirmBody", {
                name: removeTarget.full_name || removeTarget.email,
              })}
            </p>
            {removeError && (
              <p className="text-red-500 text-xs mb-4">
                {t("clinicSettings.secretary.removeError")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("admin.cancel")}
              </button>
              <button
                onClick={() => handleRemove(removeTarget.id)}
                disabled={removingId === removeTarget.id}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
              >
                {removingId === removeTarget.id && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {t("clinicSettings.secretary.remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Planos comerciais (Fase 10) ─────────────────────────────────────────────
// Troca de plano self-service — sem cobrança real ainda (não há Stripe
// ligado), mas a estrutura já é a definitiva: plan mora em `clinics.plan`,
// o limite de pacientes ativos é aplicado de verdade no banco (gatilho da
// migração da Fase 10), e trocar de "plano" aqui já muda esse limite pra
// valer. Quando o checkout de pagamento existir, só troca o que acontece no
// clique do botão — o resto (schema, RLS, enforcement) não muda.
const PLAN_ORDER: PlanTier[] = ["free", "professional", "clinic"];

const PLAN_LIMITS: Record<PlanTier, number | null> = {
  free: 10,
  professional: null,
  clinic: null,
};

type SubscriptionRow = {
  status: string;
  started_at: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  // Fase 31 — presente só quando existe uma assinatura Stripe de verdade
  // por trás; usado pra decidir se ainda mostramos o aviso de "sem cobrança
  // por enquanto" ou já a cobrança real.
  stripe_subscription_id: string | null;
};

function PlanView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [clinic, setClinic] = useState<{ id: string; plan: PlanTier } | null>(
    null,
  );
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    null,
  );
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [switching, setSwitching] = useState<PlanTier | null>(null);
  const [switchError, setSwitchError] = useState(false);
  // Guarda o plano-alvo quando a troca é um downgrade (perde recursos) —
  // qualquer downgrade passa por confirmação antes de acontecer de verdade,
  // não só o botão dedicado de "cancelar assinatura". Antes, clicar
  // "Selecionar" no card de um plano inferior trocava na hora, sem aviso.
  const [pendingDowngrade, setPendingDowngrade] = useState<PlanTier | null>(
    null,
  );
  // Fase 31 — cobrança real via Stripe. `checkoutStatus` reflete a volta do
  // Stripe Checkout (`?checkout=success|cancel` na URL); `reactivating`
  // cobre o botão "continuar assinando" quando já tem cancelamento
  // agendado; `deferredMessage` mostra o aviso depois de pedir cancelamento
  // (`plans.cancelHint` já dizia que isso ia acontecer — Fase 31 entrega
  // de verdade).
  const [checkoutStatus, setCheckoutStatus] = useState<
    "success" | "cancel" | null
  >(null);
  const [reactivating, setReactivating] = useState(false);
  const [deferredMessage, setDeferredMessage] = useState(false);

  useEffect(() => {
    const queryPart = window.location.hash.split("?")[1];
    if (!queryPart) return;
    const status = new URLSearchParams(queryPart).get("checkout");
    if (status === "success" || status === "cancel") {
      setCheckoutStatus(status);
      // Limpa o parâmetro da URL sem recarregar a página — só uma vez, pra
      // não reaparecer se a pessoa atualizar a tela depois.
      window.history.replaceState(null, "", `${window.location.pathname}#configuracoes`);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);

    if (!user.clinicId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const [clinicRes, countRes, subRes] = await Promise.all([
      supabase
        .from("clinics")
        .select("id, plan")
        .eq("id", user.clinicId)
        .maybeSingle(),
      // Conta pelos pacientes do próprio profissional — hoje toda clínica
      // tem exatamente 1 profissional (Fase 9), então dá igual ao total
      // da clínica. Se um dia várias contas dividirem uma clínica, isso
      // aqui vira uma soma por clínica; o limite de verdade (o gatilho no
      // banco) já conta assim desde já.
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .eq("status", "active"),
      // Registro de assinatura (Fase 16) — status/data de início mantidos
      // em sincronia automaticamente sempre que `clinics.plan` muda.
      supabase
        .from("subscriptions")
        .select(
          "status, started_at, current_period_end, cancel_at_period_end, stripe_subscription_id",
        )
        .eq("clinic_id", user.clinicId)
        .maybeSingle(),
    ]);

    if (clinicRes.error || !clinicRes.data) {
      if (clinicRes.error) {
        console.error("Falha ao carregar clínica (plano):", clinicRes.error);
      }
      setNotFound(true);
    } else {
      setClinic(clinicRes.data as { id: string; plan: PlanTier });
      setActiveCount(countRes.count ?? 0);
      setSubscription((subRes.data as SubscriptionRow | null) ?? null);
    }
    setLoading(false);
  }, [user.clinicId, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Fase 31 — tenta cobrança real primeiro (`/billing/change-plan`); se a
  // instalação não tiver Stripe configurado (`billing_not_configured`),
  // cai de volta pro comportamento self-service de sempre (troca a hora,
  // sem cobrar) — ninguém que ainda não configurou Stripe percebe
  // diferença nenhuma.
  const handleSwitch = async (plan: PlanTier) => {
    if (!clinic || plan === clinic.plan) return;
    setSwitching(plan);
    setSwitchError(false);
    setDeferredMessage(false);
    try {
      const result = await apiFetch("/billing/change-plan", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (result?.mode === "checkout" && result?.url) {
        window.location.href = result.url;
        return; // navegando pra fora — não limpa `switching` de propósito
      }
      if (result?.mode === "deferred") {
        setDeferredMessage(true);
      }
      await load();
    } catch (err: any) {
      let billingNotConfigured = false;
      try {
        const parsed = JSON.parse(err?.message || "");
        billingNotConfigured = parsed?.error === "billing_not_configured";
      } catch {
        /* mensagem não era JSON — não é o caso de fallback */
      }

      if (billingNotConfigured) {
        // Instalação sem Stripe configurado — comportamento de sempre
        // (troca o plano na hora, sem cobrar).
        try {
          const { error } = await supabase
            .from("clinics")
            .update({ plan })
            .eq("id", clinic.id);
          if (error) throw error;
          await load();
        } catch (fallbackErr) {
          console.error(
            "Falha ao trocar de plano (fallback self-service):",
            fallbackErr,
          );
          setSwitchError(true);
        } finally {
          setSwitching(null);
        }
        return;
      }

      console.error("Falha ao trocar de plano:", err);
      setSwitchError(true);
    } finally {
      setSwitching(null);
    }
  };

  const handleReactivate = async () => {
    if (!clinic) return;
    setReactivating(true);
    setSwitchError(false);
    try {
      await apiFetch("/billing/change-plan", {
        method: "POST",
        body: JSON.stringify({ plan: clinic.plan }),
      });
      await load();
    } catch (err) {
      console.error("Falha ao reativar assinatura:", err);
      setSwitchError(true);
    } finally {
      setReactivating(false);
    }
  };

  const requestSwitch = (plan: PlanTier) => {
    if (!clinic || plan === clinic.plan) return;
    const isDowngrade =
      PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(clinic.plan);
    if (isDowngrade) {
      setPendingDowngrade(plan);
    } else {
      handleSwitch(plan);
    }
  };

  const confirmDowngrade = async () => {
    const plan = pendingDowngrade;
    setPendingDowngrade(null);
    if (plan) await handleSwitch(plan);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> {t("plans.loading")}
      </div>
    );
  }

  if (notFound || !clinic) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
        {t("plans.notFound")}
      </div>
    );
  }

  const limit = PLAN_LIMITS[clinic.plan];
  const usagePct =
    limit !== null ? Math.min(100, Math.round((activeCount / limit) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      {checkoutStatus === "success" && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3">
          {t("plans.checkoutSuccess")}
        </p>
      )}
      {checkoutStatus === "cancel" && (
        <p className="text-sm bg-secondary border border-border text-muted-foreground rounded-lg px-4 py-3">
          {t("plans.checkoutCanceled")}
        </p>
      )}
      {deferredMessage && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
          {t("plans.cancelDeferredMessage")}
        </p>
      )}

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {t("plans.currentPlanLabel")}
            </p>
            <h3
              className="text-xl font-light text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {t(`plans.${clinic.plan}.name`)}
            </h3>
          </div>
          {subscription && (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${subscription.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
            >
              {t(`plans.subscriptionStatus.${subscription.status}`)}
            </span>
          )}
        </div>

        {subscription && (
          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-5">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("plans.startedAtLabel")}
              </p>
              <p className="text-foreground font-medium">
                {new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: "medium",
                }).format(new Date(subscription.started_at))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("plans.nextBillingLabel")}
              </p>
              <p className="text-foreground font-medium">
                {subscription.current_period_end
                  ? new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "medium",
                    }).format(new Date(subscription.current_period_end))
                  : t("plans.nextBillingNotSet")}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">
            {t("plans.usageLabel")}
          </span>
          <span className="font-medium text-foreground">
            {limit !== null
              ? t("plans.usageValue", { count: activeCount, limit })
              : t("plans.usageUnlimited", { count: activeCount })}
          </span>
        </div>
        {limit !== null && (
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${usagePct >= 100 ? "bg-red-500" : usagePct >= 80 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}

        {clinic.plan !== "free" && subscription?.cancel_at_period_end && (
          <div className="pt-5 mt-5 border-t border-border flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-amber-700 max-w-sm">
              {subscription.current_period_end
                ? t("plans.cancelScheduledFor", {
                    date: new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "medium",
                    }).format(new Date(subscription.current_period_end)),
                  })
                : t("plans.cancelScheduled")}
            </p>
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors shrink-0 disabled:opacity-60 flex items-center gap-1.5"
            >
              {reactivating && <Loader2 size={12} className="animate-spin" />}
              {t("plans.reactivateSubscription")}
            </button>
          </div>
        )}

        {clinic.plan !== "free" && !subscription?.cancel_at_period_end && (
          <div className="pt-5 mt-5 border-t border-border flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground max-w-sm">
              {t("plans.cancelHint")}
            </p>
            <button
              onClick={() => setPendingDowngrade("free")}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-border text-muted-foreground hover:border-red-300 hover:text-red-600 transition-colors shrink-0"
            >
              {t("plans.cancelSubscription")}
            </button>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {PLAN_ORDER.map((tier) => {
          const isCurrent = tier === clinic.plan;
          return (
            <div
              key={tier}
              className={`rounded-2xl p-6 border flex flex-col gap-4 ${isCurrent ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {t(`plans.${tier}.name`)}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(`plans.${tier}.price`)}
                </p>
              </div>
              <ul className="flex flex-col gap-2 text-xs text-muted-foreground flex-1">
                {(
                  t(`plans.${tier}.features`, {
                    returnObjects: true,
                  }) as string[]
                ).map((feature) => (
                  <li key={feature} className="flex items-start gap-1.5">
                    <Check
                      size={13}
                      className="text-primary shrink-0 mt-0.5"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => requestSwitch(tier)}
                disabled={isCurrent || switching !== null}
                className={`text-xs font-semibold px-4 py-2.5 rounded-full transition-colors disabled:opacity-60 ${isCurrent ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
              >
                {isCurrent
                  ? t("plans.current")
                  : switching === tier
                    ? t("plans.switching")
                    : t("plans.select")}
              </button>
            </div>
          );
        })}
      </div>

      {switchError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {t("plans.switchError")}
        </p>
      )}
      {!subscription?.stripe_subscription_id && (
        <p className="text-xs text-muted-foreground">
          {t("plans.billingNote")}
        </p>
      )}

      {pendingDowngrade && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => setPendingDowngrade(null)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {pendingDowngrade === "free"
                ? t("plans.cancelConfirmTitle")
                : t("plans.downgradeConfirmTitle", {
                    plan: t(`plans.${pendingDowngrade}.name`),
                  })}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {pendingDowngrade === "free"
                ? t("plans.cancelConfirmBody")
                : t("plans.downgradeConfirmBody", {
                    plan: t(`plans.${pendingDowngrade}.name`),
                  })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDowngrade(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("admin.cancel")}
              </button>
              <button
                onClick={confirmDowngrade}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {pendingDowngrade === "free"
                  ? t("plans.cancelSubscription")
                  : t("plans.downgradeConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Perfil profissional (Fase 12) ─────────────────────────────────────────────
// Auto-serviço do próprio profissional editando seu perfil público — a MESMA
// tela/rota de backend (`PUT /professionals/:id`) usada pelo AdminPanel pra
// corrigir o perfil de outra pessoa, e o MESMO componente `ProfileForm`
// (definido logo abaixo). Sem diretório separado, sem formulário duplicado.
function ProfessionalProfileView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveResult, setSaveResult] = useState<"success" | null>(null);
  // Fase 58 — antes esta tela ia direto pro formulário de edição; agora
  // mostra primeiro uma visão só de leitura (foto + lista de campos, no
  // espírito da referência enviada pelo usuário) e só abre o formulário
  // (que continua exatamente o mesmo, `ProfileForm`) quando a pessoa clica
  // em "editar" — nenhum campo/validação/lógica de salvar mudou.
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("professionals")
      .select(
        "id, title, location, flag, specialties, approach, sessions_info, photo_url, years, rating, approved, crp, session_price, currency, epsi_registration, created_at, profiles(full_name, email, phone)",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Falha ao carregar perfil profissional:", error);
    }
    setProfile(data && !error ? mapProfessionalRow(data) : null);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    setSaveResult(null);
    const formData = new FormData();
    const fields = [
      "name",
      "phone",
      "title",
      "location",
      "flag",
      "approach",
      "sessions_info",
      "years",
      "crp",
      "session_price",
      "currency",
      "epsi_registration",
    ];
    fields.forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    });
    formData.append("specialties", JSON.stringify(data.specialties ?? []));
    if (data.photo_file instanceof File) {
      formData.append("photo_file", data.photo_file);
    }

    await apiFetch(`/professionals/${user.id}`, {
      method: "PUT",
      body: formData,
    });
    await load();
    setSaveResult("success");
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("professionalProfile.loading")}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("professionalProfile.notFound")}
      </div>
    );
  }

  const noticeBanners = (
    <>
      {!profile.approved && (
        <div className="mb-6 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          {t("professionalProfile.pendingApproval")}
        </div>
      )}
      {/* Fase 53 — lembrete só informativo (nunca bloqueia nada) pra manter
          o registro e-Psi (Resolução CFP Nº 011/2018) em dia, já que o
          atendimento nesta plataforma é predominantemente online. */}
      {!profile.epsi_registration && (
        <div className="mb-6 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          {t("professionalProfile.epsiReminder")}
        </div>
      )}
      {saveResult === "success" && (
        <div className="mb-6 text-sm bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
          {t("professionalProfile.saveSuccess")}
        </div>
      )}
    </>
  );

  if (editing) {
    return (
      <div className="max-w-2xl">
        {noticeBanners}
        <button
          onClick={() => setEditing(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft size={16} /> {t("professionalProfile.backToProfile")}
        </button>
        <div className="bg-card border border-border rounded-2xl p-8">
          <ProfileForm
            initial={profile}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  const currency = (value: number | null) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(i18n.language, {
          style: "currency",
          currency: profile.currency === "EUR" ? "EUR" : "BRL",
          maximumFractionDigits: 0,
        }).format(value);

  const infoFields = [
    { label: t("profileForm.nameLabel"), value: profile.name || "—" },
    { label: t("profileForm.crpLabel"), value: profile.crp || "—" },
    {
      label: t("profileForm.locationLabel"),
      value: profile.location
        ? `${profile.flag ? profile.flag + " " : ""}${profile.location}`
        : "—",
    },
    { label: t("profileForm.approachLabel"), value: profile.approach || "—" },
    {
      label: t("profileForm.yearsLabel"),
      value: profile.years ? `${profile.years} ${t("admin.yearsAbbrev")}` : "—",
    },
    {
      label: t("profileForm.sessionPriceLabel"),
      value: currency(profile.session_price),
    },
    {
      label: t("profileForm.epsiLabel"),
      value: profile.epsi_registration || "—",
    },
  ];

  return (
    <div>
      {noticeBanners}

      {/* Fase 58 — cartão de foto + lista de campos lado a lado, no
          espírito da referência (foto/identidade à esquerda, dados em
          formato de lista à direita), reaproveitando integralmente os
          dados/labels que já existiam. */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-2xl bg-secondary border-2 border-border overflow-hidden mb-4 flex items-center justify-center text-2xl font-semibold text-primary shrink-0">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              (profile.name || "?").charAt(0).toUpperCase()
            )}
          </div>
          <h3 className="font-semibold text-foreground text-lg">
            {profile.name || t("userMenu.noName")}
          </h3>
          {profile.crp && (
            <p className="text-muted-foreground text-sm">{profile.crp}</p>
          )}
          {profile.location && (
            <p className="text-muted-foreground text-sm mt-1">
              {profile.flag} {profile.location}
            </p>
          )}
          <span
            className={`inline-block mt-3 text-xs px-2.5 py-0.5 rounded-full font-medium ${profile.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
          >
            {profile.approved
              ? t("admin.statusPublished")
              : t("admin.statusPending")}
          </span>
          {profile.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-4">
              {profile.specialties.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-secondary border border-border rounded-full py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Pencil size={14} /> {t("professionalProfile.editPhotoButton")}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {infoFields.map((f) => (
            <div
              key={f.label}
              className="grid grid-cols-[160px_1fr] gap-4 items-center py-3 border-b border-border last:border-b-0"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {f.label}
              </span>
              <span className="text-sm text-foreground font-medium">
                {f.value}
              </span>
            </div>
          ))}
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity mt-6"
          >
            <Pencil size={14} /> {t("professionalProfile.editInfoButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Configurações (Fase 13) ────────────────────────────────────────────────────
// "Segurança" e "Preferências" são genéricas — funcionam do mesmo jeito pra
// qualquer papel logado (profissional, paciente, e no futuro admin), então
// vivem como componentes únicos reaproveitados em vez de uma cópia por
// papel (evita a duplicação que o pedido de unificação pediu pra evitar).

// Fase 35 — além de senha/e-mail/logout (já existia), esta tela ganhou as
// duas peças de "direitos do titular" (LGPD) comuns a QUALQUER papel
// (psicólogo, secretária, paciente, admin) — por isso os dois pedaços
// novos moram aqui, no componente já compartilhado por todo mundo, em vez
// de duplicar em cada dashboard:
//  1) Exportar meus dados — baixa um JSON com o que a PRÓPRIA conta tem
//     cadastrado (perfil + registro específico do papel). NÃO inclui dados
//     de outras pessoas que o profissional atende (pacientes, prontuários)
//     — isso é dado de terceiros, uma questão bem mais delicada que exigiria
//     revisão jurídica própria antes de virar um botão de auto-serviço.
//  2) Solicitar exclusão da conta — vira um PEDIDO revisado por um admin
//     (tabela `account_deletion_requests`, Fase 35), não uma exclusão
//     instantânea: dados de prontuário costumam ter obrigação legal de
//     retenção por um tempo mínimo, e isso não é uma decisão que dá pra
//     automatizar com segurança sem orientação jurídica.
// (Não sou advogado — isto é um ponto de partida técnico, não aconselhamento
// jurídico. Revise com um profissional antes de operar com dados reais.)
function AccountSecurityView({
  user,
  onLogout,
}: {
  user: AppUser;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExportError(false);
    try {
      const data = await apiFetch("/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Falha ao exportar dados da conta:", err);
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  const [deletionReason, setDeletionReason] = useState("");
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionError, setDeletionError] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [showDeletionForm, setShowDeletionForm] = useState(false);

  const handleRequestDeletion = async () => {
    setDeletionSubmitting(true);
    setDeletionError(false);
    try {
      await apiFetch("/account/request-deletion", {
        method: "POST",
        body: JSON.stringify({ reason: deletionReason.trim() || null }),
      });
      setDeletionRequested(true);
      setShowDeletionForm(false);
    } catch (err) {
      console.error("Falha ao solicitar exclusão da conta:", err);
      setDeletionError(true);
    } finally {
      setDeletionSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPassword.length < 8) {
      setPwError(t("settings.security.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("settings.security.passwordMismatch"));
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setPwSaving(false);
    if (error) {
      setPwError(error.message || t("settings.security.genericError"));
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPwSuccess(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess(false);
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);
    if (error) {
      setEmailError(error.message || t("settings.security.genericError"));
      return;
    }
    setNewEmail("");
    setEmailSuccess(true);
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {t("settings.security.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.security.subtitle")}
        </p>
      </div>

      <form
        onSubmit={handlePasswordSubmit}
        className="bg-card border border-border rounded-2xl p-6 space-y-4"
      >
        <h4 className="text-sm font-semibold text-foreground">
          {t("settings.security.passwordSectionTitle")}
        </h4>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("settings.security.newPasswordLabel")}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("settings.security.confirmPasswordLabel")}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
        {pwSuccess && (
          <p className="text-green-600 text-sm">
            {t("settings.security.passwordSuccess")}
          </p>
        )}
        <button
          type="submit"
          disabled={pwSaving}
          className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {pwSaving
            ? t("settings.security.saving")
            : t("settings.security.savePassword")}
        </button>
      </form>

      <form
        onSubmit={handleEmailSubmit}
        className="bg-card border border-border rounded-2xl p-6 space-y-4"
      >
        <h4 className="text-sm font-semibold text-foreground">
          {t("settings.security.emailSectionTitle")}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t("settings.security.emailSectionHint")}
        </p>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("settings.security.newEmailLabel")}
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={t("settings.security.newEmailPlaceholder")}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
        {emailSuccess && (
          <p className="text-green-600 text-sm">
            {t("settings.security.emailSuccess")}
          </p>
        )}
        <button
          type="submit"
          disabled={emailSaving}
          className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {emailSaving
            ? t("settings.security.saving")
            : t("settings.security.saveEmail")}
        </button>
      </form>

      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {t("settings.security.logoutSectionTitle")}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("settings.security.logoutSectionHint")}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors shrink-0"
        >
          <LogOut size={14} /> {t("admin.logout")}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("settings.security.sessionsNote")}
      </p>

      {/* Fase 35 — "direitos do titular" (LGPD): exportar dados + pedido de
          exclusão de conta. Comum a todo papel — ver nota no topo do
          componente. */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-foreground mb-1">
          {t("settings.security.dataSectionTitle")}
        </h4>
        <p className="text-xs text-muted-foreground mb-4 max-w-md">
          {t("settings.security.dataSectionHint")}
        </p>

        <div className="flex items-center justify-between gap-4 py-3 border-t border-border">
          <div>
            <h5 className="text-sm font-medium text-foreground">
              {t("settings.security.exportLabel")}
            </h5>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("settings.security.exportHint")}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors shrink-0 disabled:opacity-60"
          >
            {exporting
              ? t("settings.security.exporting")
              : t("settings.security.exportButton")}
          </button>
        </div>
        {exportError && (
          <p className="text-red-500 text-xs mt-1">
            {t("settings.security.exportError")}
          </p>
        )}

        <div className="py-3 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h5 className="text-sm font-medium text-foreground">
                {t("settings.security.deletionLabel")}
              </h5>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {t("settings.security.deletionHint")}
              </p>
            </div>
            {!deletionRequested && (
              <button
                onClick={() => setShowDeletionForm((v) => !v)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors shrink-0"
              >
                {t("settings.security.deletionButton")}
              </button>
            )}
          </div>
          {deletionRequested && (
            <p className="text-green-600 text-xs mt-3">
              {t("settings.security.deletionRequested")}
            </p>
          )}
          {showDeletionForm && !deletionRequested && (
            <div className="mt-3 bg-secondary/60 border border-border rounded-xl p-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("settings.security.deletionReasonLabel")}
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={2}
                placeholder={t("settings.security.deletionReasonPlaceholder")}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none mb-3"
              />
              <p className="text-xs text-muted-foreground mb-3">
                {t("settings.security.deletionDisclaimer")}
              </p>
              {deletionError && (
                <p className="text-red-500 text-xs mb-3">
                  {t("settings.security.deletionError")}
                </p>
              )}
              <button
                onClick={handleRequestDeletion}
                disabled={deletionSubmitting}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {deletionSubmitting
                  ? t("settings.security.deletionSubmitting")
                  : t("settings.security.deletionConfirm")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Fase 34 — quando `professionalUserId` é passado (só a tela de
// Configurações do PROFISSIONAL faz isso; a do paciente usa este mesmo
// componente sem essa prop), o card de notificações vira um toggle de
// verdade: liga/desliga o lembrete automático de consulta pros pacientes
// DELE. É opt-in e por profissional de propósito — cada um decide se quer
// mandar lembrete, não é um comportamento global da plataforma (ver nota
// completa na migração da Fase 34).
function PreferencesView({
  professionalUserId,
}: {
  professionalUserId?: string;
}) {
  const { t } = useTranslation();
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(
    !!professionalUserId,
  );
  const [remindersSaving, setRemindersSaving] = useState(false);
  const [remindersError, setRemindersError] = useState(false);
  // Fase 43 — estrutura de lembrete por WhatsApp/SMS: preferência e
  // telefone ficam salvos, mas nenhuma mensagem é enviada de verdade (sem
  // provedor pago configurado no backend). Ver nota completa na migração.
  const [waEnabled, setWaEnabled] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waLoading, setWaLoading] = useState(!!professionalUserId);
  const [waSaving, setWaSaving] = useState(false);
  const [waError, setWaError] = useState(false);

  useEffect(() => {
    if (!professionalUserId) return;
    let cancelled = false;
    (async () => {
      setRemindersLoading(true);
      const { data, error } = await supabase
        .from("professionals")
        .select("send_appointment_reminders")
        .eq("id", professionalUserId)
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) {
          setRemindersEnabled(!!data.send_appointment_reminders);
        }
        setRemindersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [professionalUserId]);

  useEffect(() => {
    if (!professionalUserId) return;
    let cancelled = false;
    (async () => {
      setWaLoading(true);
      const { data, error } = await supabase
        .from("professional_reminder_settings")
        .select("whatsapp_reminders_enabled, reminder_phone")
        .eq("professional_id", professionalUserId)
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) {
          setWaEnabled(!!data.whatsapp_reminders_enabled);
          setWaPhone(data.reminder_phone ?? "");
        }
        setWaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [professionalUserId]);

  const toggleReminders = async () => {
    if (!professionalUserId || remindersSaving) return;
    const next = !remindersEnabled;
    setRemindersSaving(true);
    setRemindersError(false);
    const { error } = await supabase
      .from("professionals")
      .update({ send_appointment_reminders: next })
      .eq("id", professionalUserId);
    if (error) {
      console.error("Falha ao atualizar lembrete de consulta:", error);
      setRemindersError(true);
    } else {
      setRemindersEnabled(next);
    }
    setRemindersSaving(false);
  };

  const toggleWaReminders = async () => {
    if (!professionalUserId || waSaving) return;
    const next = !waEnabled;
    setWaSaving(true);
    setWaError(false);
    const { error } = await supabase.from("professional_reminder_settings").upsert(
      {
        professional_id: professionalUserId,
        whatsapp_reminders_enabled: next,
        reminder_phone: waPhone.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "professional_id" },
    );
    if (error) {
      console.error("Falha ao atualizar lembrete por WhatsApp/SMS:", error);
      setWaError(true);
    } else {
      setWaEnabled(next);
    }
    setWaSaving(false);
  };

  const saveWaPhone = async () => {
    if (!professionalUserId || waSaving) return;
    setWaSaving(true);
    setWaError(false);
    const { error } = await supabase.from("professional_reminder_settings").upsert(
      {
        professional_id: professionalUserId,
        whatsapp_reminders_enabled: waEnabled,
        reminder_phone: waPhone.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "professional_id" },
    );
    if (error) {
      console.error("Falha ao salvar telefone de lembrete:", error);
      setWaError(true);
    }
    setWaSaving(false);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {t("settings.preferences.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.preferences.subtitle")}
        </p>
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {t("settings.preferences.languageLabel")}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("settings.preferences.languageHint")}
          </p>
        </div>
        <LanguageSwitcher />
      </div>
      {professionalUserId ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {t("settings.preferences.remindersLabel")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {t("settings.preferences.remindersHint")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={remindersEnabled}
              disabled={remindersLoading || remindersSaving}
              onClick={toggleReminders}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${remindersEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${remindersEnabled ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
          {remindersError && (
            <p className="text-red-500 text-xs mt-3">
              {t("settings.preferences.remindersError")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            {t("settings.preferences.remindersDependencyHint")}
          </p>
        </div>
      ) : null}
      {professionalUserId ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {t("settings.preferences.waRemindersLabel")}
                <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {t("settings.preferences.waComingSoonTag")}
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {t("settings.preferences.waRemindersHint")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={waEnabled}
              disabled={waLoading || waSaving}
              onClick={toggleWaReminders}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${waEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${waEnabled ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {t("settings.preferences.waPhoneLabel")}
            </label>
            <input
              type="tel"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              onBlur={saveWaPhone}
              disabled={waLoading}
              placeholder={t("settings.preferences.waPhonePlaceholder")}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60"
            />
          </div>
          {waError && (
            <p className="text-red-500 text-xs mt-3">
              {t("settings.preferences.waError")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            {t("settings.preferences.waDependencyHint")}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-foreground">
            {t("settings.preferences.notificationsLabel")}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {t("settings.preferences.notificationsComingSoon")}
          </p>
        </div>
      )}
    </div>
  );
}

function ProfessionalAccountView({
  user,
  onGoToProfile,
}: {
  user: AppUser;
  onGoToProfile: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [info, setInfo] = useState<{
    full_name: string | null;
    created_at: string;
  } | null>(null);
  // Fase 25 — clínica + dono, direto na tela de Conta: antes essa
  // informação só existia (parcialmente, sem indicar o dono) em
  // Configurações da Clínica, então quem só olhava "Conta" não tinha como
  // confirmar que a clínica auto-criada no cadastro (Fase 9) realmente
  // existe nem quem é o dono dela.
  const [clinicInfo, setClinicInfo] = useState<{
    name: string | null;
    ownerName: string | null;
    isOwner: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data }, clinicRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, created_at")
          .eq("id", user.id)
          .maybeSingle(),
        user.clinicId
          ? supabase
              .from("clinics")
              .select("name, owner_id")
              .eq("id", user.clinicId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (cancelled) return;
      setInfo((data as any) ?? null);

      if (clinicRes?.data) {
        const clinic = clinicRes.data as { name: string | null; owner_id: string | null };
        let ownerName: string | null = null;
        if (clinic.owner_id) {
          if (clinic.owner_id === user.id) {
            ownerName = data?.full_name ?? null;
          } else {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", clinic.owner_id)
              .maybeSingle();
            if (cancelled) return;
            ownerName = ownerProfile?.full_name ?? null;
          }
        }
        setClinicInfo({
          name: clinic.name,
          ownerName,
          isOwner: clinic.owner_id === user.id,
        });
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id, user.clinicId]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {t("settings.account.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.account.subtitle")}
        </p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" />{" "}
          {t("settings.account.loading")}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {t("settings.account.nameLabel")}
            </span>
            <span className="text-sm font-medium text-foreground text-right">
              {info?.full_name || "—"}
            </span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {t("settings.account.emailLabel")}
            </span>
            <span className="text-sm font-medium text-foreground text-right">
              {user.email || "—"}
            </span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {t("settings.account.roleLabel")}
            </span>
            <span className="text-sm font-medium text-foreground text-right">
              {t("settings.account.roleValuePsychologist")}
            </span>
          </div>
          {info?.created_at && (
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                {t("settings.account.memberSinceLabel")}
              </span>
              <span className="text-sm font-medium text-foreground text-right">
                {new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: "medium",
                }).format(new Date(info.created_at))}
              </span>
            </div>
          )}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {t("settings.account.clinicLabel")}
            </span>
            <span className="text-sm font-medium text-foreground text-right">
              {clinicInfo?.name || t("settings.account.clinicNone")}
            </span>
          </div>
          {clinicInfo && (
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                {t("settings.account.clinicOwnerLabel")}
              </span>
              <span className="text-sm font-medium text-foreground text-right">
                {clinicInfo.isOwner
                  ? t("settings.account.clinicOwnerYou")
                  : clinicInfo.ownerName || t("settings.account.clinicOwnerUnknown")}
              </span>
            </div>
          )}
        </div>
      )}
      <button
        onClick={onGoToProfile}
        className="w-full text-left text-sm bg-secondary border border-border rounded-xl px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted transition-colors"
      >
        <span className="text-muted-foreground">
          {t("settings.account.editProfileHint")}
        </span>
        <span className="flex items-center gap-1 font-semibold text-primary shrink-0">
          {t("settings.tabs.profile")} <ArrowRight size={12} />
        </span>
      </button>
    </div>
  );
}

function SettingsView({
  user,
  onLogout,
  initialTab,
}: {
  user: AppUser;
  onLogout: () => void;
  initialTab?: SettingsTab;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SettingsTab>(initialTab ?? "account");

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "account",
      label: t("settings.tabs.account"),
      icon: <UserCircle size={14} />,
    },
    {
      key: "profile",
      label: t("settings.tabs.profile"),
      icon: <Sparkles size={14} />,
    },
    {
      key: "clinic",
      label: t("settings.tabs.clinic"),
      icon: <Building2 size={14} />,
    },
    {
      key: "plan",
      label: t("settings.tabs.plan"),
      icon: <CreditCard size={14} />,
    },
    {
      key: "preferences",
      label: t("settings.tabs.preferences"),
      icon: <Globe size={14} />,
    },
    {
      key: "security",
      label: t("settings.tabs.security"),
      icon: <Shield size={14} />,
    },
  ];

  return (
    <div className="grid md:grid-cols-[190px_1fr] gap-8">
      <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-left whitespace-nowrap transition-colors shrink-0 ${tab === tabItem.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {tabItem.icon} {tabItem.label}
          </button>
        ))}
      </div>
      <div className="min-w-0">
        {tab === "account" && (
          <ProfessionalAccountView
            user={user}
            onGoToProfile={() => setTab("profile")}
          />
        )}
        {tab === "profile" && <ProfessionalProfileView user={user} />}
        {tab === "clinic" && <ClinicSettingsView user={user} />}
        {tab === "plan" && <PlanView user={user} />}
        {tab === "preferences" && (
          <PreferencesView professionalUserId={user.id} />
        )}
        {tab === "security" && <AccountSecurityView user={user} onLogout={onLogout} />}
      </div>
    </div>
  );
}

// ─── Admin: Profile Form ──────────────────────────────────────────────────────

function ProfileForm({
  initial,
  onSave,
  onCancel,
  hideCancel,
  emailEditable,
}: {
  initial?: ProfessionalProfile | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  // A conta (self-profile) mostra o botão "Cancelar" normalmente; a edição
  // de admin dentro de um fluxo próprio também usa cancelar. Some apenas se
  // o chamador explicitamente não tiver pra onde voltar.
  hideCancel?: boolean;
  // O e-mail é o login da conta — nunca editável por aqui (mudar e-mail de
  // login é uma ação de conta separada, fora de escopo desta tela).
  emailEditable?: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<any>(
    initial ?? {
      name: "",
      phone: "",
      email: "",
      title: "Psicólogo(a)",
      location: "",
      flag: "🇧🇷",
      specialties: [],
      approach: "",
      sessions_info: "Online · Português",
      photo_url: "",
      years: 1,
      crp: "",
      session_price: null,
      currency: "BRL",
      epsi_registration: "",
    },
  );
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const specialtySuggestions = t("profileForm.specialtySuggestions", {
    returnObjects: true,
  }) as string[];

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const addSpecialty = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed || form.specialties.includes(trimmed)) return;
    set("specialties", [...form.specialties, trimmed]);
    setSpecialtyInput("");
  };

  const removeSpecialty = (s: string) =>
    set(
      "specialties",
      form.specialties.filter((x: string) => x !== s),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) {
      setError(t("profileForm.requiredError"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        photo_file: photoFile,
      });
    } catch (err: any) {
      let message = t("profileForm.genericSaveError");
      try {
        const parsed = JSON.parse(err?.message ?? "");
        if (parsed?.error) message = parsed.error;
      } catch {
        /* fall back to generic message */
      }
      setError(message);
    } finally {
      // Precisa rodar também no caminho de sucesso: quando o formulário
      // continua montado depois de salvar (ex.: ProfessionalProfileView,
      // que só mostra um aviso de sucesso por cima em vez de desmontar),
      // sem isso o botão ficava travado em "salvando" pra sempre.
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: string,
    type = "text",
    placeholder = "",
    disabled = false,
    hint = "",
    min?: number,
  ) => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={form[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        className={`w-full border border-border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors ${disabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-secondary focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {field(
          t("profileForm.nameLabel"),
          "name",
          "text",
          t("profileForm.namePlaceholder"),
        )}
        {field(
          t("profileForm.phoneLabel"),
          "phone",
          "tel",
          t("profileForm.phonePlaceholder"),
        )}
        {field(
          t("profileForm.emailLabel"),
          "email",
          "email",
          t("profileForm.emailPlaceholder"),
          !emailEditable,
          !emailEditable ? t("profileForm.emailReadOnlyHint") : "",
        )}
        {field(
          t("profileForm.titleLabel"),
          "title",
          "text",
          t("profileForm.titlePlaceholder"),
        )}
        {field(
          t("profileForm.crpLabel"),
          "crp",
          "text",
          t("profileForm.crpPlaceholder"),
        )}
        {field(
          t("profileForm.epsiLabel"),
          "epsi_registration",
          "text",
          t("profileForm.epsiPlaceholder"),
          false,
          t("profileForm.epsiHint"),
        )}
        {field(
          t("profileForm.sessionPriceLabel"),
          "session_price",
          "number",
          t("profileForm.sessionPricePlaceholder"),
          false,
          "",
          0,
        )}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("profileForm.currencyLabel")}
          </label>
          <select
            value={form.currency ?? "BRL"}
            onChange={(e) => set("currency", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            <option value="BRL">{t("profileForm.currencyBRL")}</option>
            <option value="EUR">{t("profileForm.currencyEUR")}</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {t("profileForm.currencyHint")}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
        {field(
          t("profileForm.locationLabel"),
          "location",
          "text",
          t("profileForm.locationPlaceholder"),
        )}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("profileForm.flagLabel")}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {FLAGS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => set("flag", f)}
                className={`text-xl p-1.5 rounded-lg border transition-colors ${form.flag === f ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("profileForm.specialtiesLabel")}
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.specialties.map((s: string) => (
            <span
              key={s}
              className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1"
            >
              {s}
              <button type="button" onClick={() => removeSpecialty(s)}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={specialtyInput}
            onChange={(e) => setSpecialtyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSpecialty(specialtyInput);
              }
            }}
            placeholder={t("profileForm.addSpecialtyPlaceholder")}
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <button
            type="button"
            onClick={() => addSpecialty(specialtyInput)}
            className="bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("profileForm.add")}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {specialtySuggestions
            .filter((s) => !form.specialties.includes(s))
            .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSpecialty(s)}
              className="text-xs border border-dashed border-border text-muted-foreground rounded-full px-2.5 py-1 hover:border-primary hover:text-primary transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("profileForm.approachLabel")}
        </label>
        <textarea
          value={form.approach ?? ""}
          onChange={(e) => set("approach", e.target.value)}
          placeholder={t("profileForm.approachPlaceholder")}
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {field(
          t("profileForm.sessionsLabel"),
          "sessions_info",
          "text",
          t("profileForm.sessionsPlaceholder"),
        )}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("profileForm.yearsLabel")}
          </label>
          <input
            type="number"
            min={0}
            max={50}
            value={form.years}
            onChange={(e) => set("years", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("profileForm.photoLabel")}
        </label>

        <div>
          <label className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm cursor-pointer hover:bg-muted transition-colors block">
            {t("profileForm.selectPhoto")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />
          </label>
        </div>
        {(photoPreview || form.photo_url) && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={photoPreview || form.photo_url}
              alt="Preview"
              className="w-16 h-16 rounded-xl object-cover border border-border bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t("profileForm.previewLabel")}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {!hideCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            {t("profileForm.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {initial ? t("profileForm.saveEdit") : t("profileForm.saveNew")}
        </button>
      </div>
    </form>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

// Converte a linha de `professionals` (embutindo `profiles`) que vem do
// supabase-js pro shape achatado que a UI usa há tempos.
function mapProfessionalRow(row: any): ProfessionalProfile {
  return {
    id: row.id,
    name: row.profiles?.full_name ?? "",
    email: row.profiles?.email ?? "",
    phone: row.profiles?.phone ?? "",
    title: row.title ?? "",
    location: row.location ?? "",
    flag: row.flag ?? "🇧🇷",
    specialties: row.specialties ?? [],
    approach: row.approach ?? "",
    sessions_info: row.sessions_info ?? "",
    photo_url: row.photo_url ?? "",
    years: row.years ?? 0,
    rating: row.rating ?? 0,
    approved: !!row.approved,
    crp: row.crp ?? "",
    session_price: row.session_price ?? null,
    currency: row.currency ?? "BRL",
    epsi_registration: row.epsi_registration ?? "",
    created_at: row.created_at,
  };
}

// ─── Painel Admin: Visão geral (Fase 18) ───────────────────────────────────
// Números agregados da plataforma inteira — admin já tem acesso via RLS a
// todas as tabelas envolvidas, então é só contagem direta, sem rota nova.
type AdminStats = {
  clinics: number;
  professionalsApproved: number;
  professionalsPending: number;
  activePatients: number;
  secretaries: number;
  planFree: number;
  planProfessional: number;
  planClinic: number;
  pendingLeads: number;
};

function AdminOverview() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(false);
      const [
        clinicsRes,
        approvedRes,
        pendingRes,
        patientsRes,
        secretariesRes,
        freeRes,
        professionalPlanRes,
        clinicPlanRes,
        pendingLeadsRes,
      ] = await Promise.all([
        supabase.from("clinics").select("id", { count: "exact", head: true }),
        supabase
          .from("professionals")
          .select("id", { count: "exact", head: true })
          .eq("approved", true),
        supabase
          .from("professionals")
          .select("id", { count: "exact", head: true })
          .eq("approved", false),
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "secretary"),
        supabase
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("plan", "free"),
        supabase
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("plan", "professional"),
        supabase
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("plan", "clinic"),
        supabase
          .from("quiz_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      if (cancelled) return;

      // Antes nenhuma dessas consultas era checada — uma falha (RLS, rede)
      // em qualquer uma delas fazia o card correspondente mostrar "0" calado,
      // visualmente idêntico a "a plataforma realmente não tem nada disso".
      const results = [
        clinicsRes,
        approvedRes,
        pendingRes,
        patientsRes,
        secretariesRes,
        freeRes,
        professionalPlanRes,
        clinicPlanRes,
        pendingLeadsRes,
      ];
      const failed = results.find((r) => r.error);
      if (failed) {
        console.error("Falha ao carregar visão geral do admin:", failed.error);
        setError(true);
        setLoading(false);
        return;
      }

      setStats({
        clinics: clinicsRes.count ?? 0,
        professionalsApproved: approvedRes.count ?? 0,
        professionalsPending: pendingRes.count ?? 0,
        activePatients: patientsRes.count ?? 0,
        secretaries: secretariesRes.count ?? 0,
        planFree: freeRes.count ?? 0,
        planProfessional: professionalPlanRes.count ?? 0,
        planClinic: clinicPlanRes.count ?? 0,
        pendingLeads: pendingLeadsRes.count ?? 0,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("admin.overview.loading")}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("admin.overview.errorLoading")}
      </div>
    );
  }

  const cards: {
    label: string;
    value: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    tone: "primary" | "accent" | "danger" | "neutral";
  }[] = [
    {
      label: t("admin.overview.clinics"),
      value: stats.clinics,
      icon: Building2,
      tone: "primary",
    },
    {
      label: t("admin.overview.professionalsApproved"),
      value: stats.professionalsApproved,
      icon: Check,
      tone: "accent",
    },
    {
      label: t("admin.overview.professionalsPending"),
      value: stats.professionalsPending,
      icon: Clock,
      tone: "danger",
    },
    {
      label: t("admin.overview.activePatients"),
      value: stats.activePatients,
      icon: Users,
      tone: "primary",
    },
    {
      label: t("admin.overview.secretaries"),
      value: stats.secretaries,
      icon: UserCircle,
      tone: "neutral",
    },
    {
      label: t("admin.overview.pendingLeads"),
      value: stats.pendingLeads,
      icon: MessageSquare,
      tone: "accent",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Fase 59 — StatCard individual (ícone colorido), no lugar da grade
          com hairlines, pra bater com a referência do Figma. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {t("admin.overview.planBreakdown")}
        </h3>
        <div className="flex flex-col gap-3">
          {[
            { key: "free", label: t("plans.free.name"), value: stats.planFree },
            {
              key: "professional",
              label: t("plans.professional.name"),
              value: stats.planProfessional,
            },
            {
              key: "clinic",
              label: t("plans.clinic.name"),
              value: stats.planClinic,
            },
          ].map((row) => {
            const total = stats.planFree + stats.planProfessional + stats.planClinic;
            const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <div key={row.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">{row.value}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Painel Admin: Usuários e permissões (Fase 18) ─────────────────────────
// Lista todas as contas da plataforma (não só psicólogos, como a aba
// "Psicólogos") e permite conceder/revogar papéis extras — a peça que
// faltava pra "troca de perfil sem logout" (Fase 17) ter alguém pra
// conceder o segundo papel além de mexer direto no banco.
type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  clinic_id: string | null;
};

function AdminUsersView({ currentUserId }: { currentUserId: string }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [clinicList, setClinicList] = useState<
    { id: string; name: string | null }[]
  >([]);
  const [clinicNames, setClinicNames] = useState<Record<string, string>>({});
  const [extraRoles, setExtraRoles] = useState<Record<string, UserRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [grantRole, setGrantRole] = useState<Record<string, UserRole>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  // Fase 25 — vincular psicólogo/secretária a uma clínica já cadastrada
  // (reatribuição administrativa, ex.: juntar um profissional que se
  // cadastrou sozinho — e por isso ganhou uma clínica própria automática —
  // dentro da clínica de verdade da equipe dele).
  const [clinicPick, setClinicPick] = useState<Record<string, string>>({});
  const [clinicBusyId, setClinicBusyId] = useState<string | null>(null);
  const [clinicActionError, setClinicActionError] = useState<string | null>(
    null,
  );

  const ALL_ROLES: UserRole[] = ["admin", "psychologist", "secretary", "patient"];

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [usersRes, clinicsRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, clinic_id")
        .order("full_name", { ascending: true }),
      supabase.from("clinics").select("id, name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    // Sem checar isso, uma falha aqui (RLS, rede) produzia "0 usuários"
    // visualmente idêntico à mensagem de "nenhum resultado" de uma busca —
    // o admin não tinha como distinguir "não há ninguém" de "algo quebrou".
    if (usersRes.error) {
      console.error("Falha ao carregar usuários (admin):", usersRes.error);
      setError(true);
      setLoading(false);
      return;
    }

    setUsers((usersRes.data as AdminUserRow[]) ?? []);

    const clinicsData = (clinicsRes.data ?? []) as {
      id: string;
      name: string | null;
    }[];
    setClinicList(clinicsData);
    const names: Record<string, string> = {};
    clinicsData.forEach((c) => {
      names[c.id] = c.name ?? "";
    });
    setClinicNames(names);

    const roleMap: Record<string, UserRole[]> = {};
    (rolesRes.data ?? []).forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    setExtraRoles(roleMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGrant = async (userId: string) => {
    const role = grantRole[userId];
    if (!role) return;
    setBusyId(userId);
    setActionError(null);
    try {
      await apiFetch(`/users/${userId}/roles`, {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (err: any) {
      setActionError(t("admin.users.grantError"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (userId: string, role: UserRole) => {
    setBusyId(userId);
    setActionError(null);
    try {
      await apiFetch(`/users/${userId}/roles/${role}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      // O backend manda um código estável (`code: "last_role"`) em vez de só
      // texto livre — checar por substring do texto em português quebraria
      // silenciosamente se a mensagem do backend mudasse (mesmo cosmética).
      let code: string | null = null;
      try {
        code = JSON.parse(err?.message ?? "")?.code ?? null;
      } catch {
        /* corpo não era JSON — segue com a mensagem genérica */
      }
      setActionError(
        code === "last_role"
          ? t("admin.users.revokeLastError")
          : t("admin.users.revokeError"),
      );
    } finally {
      setBusyId(null);
    }
  };

  // Fase 25 — troca a clínica de um psicólogo ou secretária. Atualiza
  // `profiles.clinic_id` (fonte da verdade pra quem vê o quê) e, quando a
  // pessoa é psicóloga, também `professionals.clinic_id` — as duas colunas
  // precisam ficar em sincronia, senão a agenda/pacientes do profissional
  // continuam presos na clínica antiga mesmo com o perfil já apontando pra
  // nova. RLS já libera as duas escritas pra admin (policies "profiles:
  // admin edita tudo" e "professionals: admin gerencia tudo"), então dá pra
  // fazer direto do navegador, sem rota de backend dedicada.
  const handleChangeClinic = async (u: AdminUserRow) => {
    const targetClinicId = clinicPick[u.id];
    if (!targetClinicId || targetClinicId === u.clinic_id) return;
    setClinicBusyId(u.id);
    setClinicActionError(null);
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ clinic_id: targetClinicId })
        .eq("id", u.id);
      if (profileErr) throw profileErr;

      const roles = extraRoles[u.id] ?? [u.role];
      if (roles.includes("psychologist")) {
        const { error: profErr } = await supabase
          .from("professionals")
          .update({ clinic_id: targetClinicId })
          .eq("id", u.id);
        if (profErr) throw profErr;
      }

      setClinicPick((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      await load();
    } catch (err: any) {
      // O gatilho `enforce_secretary_plan_gate` recusa vincular uma
      // secretária a uma clínica fora do plano "Clínica" com essa mensagem
      // fixa — checar por ela dá um aviso específico em vez do genérico.
      const raw = String(err?.message ?? "");
      setClinicActionError(
        raw.includes("secretary_requires_business_plan")
          ? t("admin.users.clinicRequiresBusinessPlan")
          : t("admin.users.clinicUpdateError"),
      );
    } finally {
      setClinicBusyId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("admin.users.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("admin.users.errorLoading")}
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-w-sm mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.users.searchPlaceholder")}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      </div>

      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {actionError}
        </p>
      )}
      {clinicActionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {clinicActionError}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-muted-foreground text-sm">
            {t("admin.users.noResults")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const roles = extraRoles[u.id] ?? [u.role];
            const grantable = ALL_ROLES.filter((r) => !roles.includes(r));
            const isSelf = u.id === currentUserId;
            return (
              <div
                key={u.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {u.full_name || t("userMenu.noName")}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {t(`roles.${u.role}`)}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {t("admin.users.you")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {u.email}
                    </p>
                    {u.clinic_id && clinicNames[u.clinic_id] && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {clinicNames[u.clinic_id]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {t("admin.users.rolesLabel")}
                  </span>
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-full pl-2.5 pr-1.5 py-1 text-foreground"
                    >
                      {t(`roles.${r}`)}
                      {roles.length > 1 && (
                        <button
                          onClick={() => handleRevoke(u.id, r)}
                          disabled={busyId === u.id}
                          title={t("admin.users.revokeTooltip")}
                          className="hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}

                  {grantable.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <select
                        value={grantRole[u.id] ?? ""}
                        onChange={(e) =>
                          setGrantRole((prev) => ({
                            ...prev,
                            [u.id]: e.target.value as UserRole,
                          }))
                        }
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
                      >
                        <option value="">{t("admin.users.addRole")}</option>
                        {grantable.map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleGrant(u.id)}
                        disabled={!grantRole[u.id] || busyId === u.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                      >
                        {busyId === u.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Plus size={12} />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {(roles.includes("psychologist") ||
                  roles.includes("secretary")) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t("admin.users.clinicLabel")}
                    </span>
                    <select
                      value={clinicPick[u.id] ?? u.clinic_id ?? ""}
                      onChange={(e) =>
                        setClinicPick((prev) => ({
                          ...prev,
                          [u.id]: e.target.value,
                        }))
                      }
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors max-w-[220px]"
                    >
                      <option value="">
                        {t("admin.users.clinicUnassigned")}
                      </option>
                      {clinicList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || t("admin.clinics.unnamed")}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleChangeClinic(u)}
                      disabled={
                        !clinicPick[u.id] ||
                        clinicPick[u.id] === u.clinic_id ||
                        clinicBusyId === u.id
                      }
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {clinicBusyId === u.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <LinkIcon size={12} />
                      )}
                      {t("admin.users.clinicChangeButton")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Painel Admin: Profissionais por clínica (Fase 20) ─────────────────────
// Uma clínica por si só não diz quem está vinculado a ela — e isso já
// causou confusão de verdade (secretária que ficou sem clínica vinculada
// no convite). Esta aba mostra, pra cada clínica, o psicólogo dono e as
// secretárias vinculadas, e destaca em vermelho quando uma clínica não tem
// psicólogo nenhum (não devia acontecer, mas se acontecer é mais fácil de
// achar aqui do que investigando linha por linha no banco).
type AdminClinicPerson = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  clinic_id: string | null;
};

type AdminClinicRow = {
  id: string;
  name: string | null;
  plan: PlanTier;
  owner_id: string | null;
};

function AdminClinicsView() {
  const { t } = useTranslation();
  const [clinics, setClinics] = useState<AdminClinicRow[]>([]);
  const [people, setPeople] = useState<AdminClinicPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Fase 27.2 — a única forma de corrigir `clinics.owner_id` era direto no
  // banco. Isso importa porque o auto-provisionamento (gatilho da Fase 9) só
  // cria a clínica com o dono certo quando `clinic_id` está null no momento
  // em que o perfil vira "psychologist"; se um admin já vincula o perfil a
  // um `clinic_id` existente nesse mesmo passo (ex.: criando o profissional
  // já com uma clínica escolhida), nenhuma clínica nova é criada e o
  // `owner_id` da clínica apontada nunca passa a ser esse profissional —
  // mesmo sendo, na prática, "a clínica dele". Este botão deixa o admin
  // apontar/corrigir o dono manualmente, sem precisar de acesso ao banco.
  const [ownerPick, setOwnerPick] = useState<Record<string, string>>({});
  const [ownerBusyId, setOwnerBusyId] = useState<string | null>(null);
  const [ownerActionError, setOwnerActionError] = useState<string | null>(
    null,
  );
  // Fase 27.3 — `profiles.role` é só o papel "principal"; quem acumula mais
  // de um papel (Fase 17, ex.: admin que também é psicóloga) tem os extras
  // na tabela `user_roles`, não em `profiles.role`. Filtrar psicólogos e
  // secretárias direto por `profiles.role` (como esta tela fazia antes)
  // deixava de fora qualquer pessoa cujo papel principal fosse outro —
  // exatamente por isso ela não aparecia pra ser selecionada como dona.
  const [extraRoles, setExtraRoles] = useState<Record<string, UserRole[]>>(
    {},
  );
  const rolesOf = (p: AdminClinicPerson): UserRole[] =>
    extraRoles[p.id] ?? [p.role];

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [clinicsRes, peopleRes, rolesRes] = await Promise.all([
      supabase
        .from("clinics")
        .select("id, name, plan, owner_id")
        .order("name", { ascending: true }),
      // Não dá mais pra filtrar por `.in("role", [...])` no banco — precisa
      // trazer todo mundo e decidir "é psicólogo?"/"é secretária?" no
      // cliente, cruzando com `user_roles` (ver `rolesOf` acima).
      supabase.from("profiles").select("id, full_name, email, role, clinic_id"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (clinicsRes.error || peopleRes.error) {
      setError(true);
    } else {
      setClinics((clinicsRes.data as AdminClinicRow[]) ?? []);
      setPeople((peopleRes.data as AdminClinicPerson[]) ?? []);
      const roleMap: Record<string, UserRole[]> = {};
      (rolesRes.data ?? []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      setExtraRoles(roleMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSetOwner = async (clinicId: string) => {
    const newOwnerId = ownerPick[clinicId];
    if (!newOwnerId) return;
    setOwnerBusyId(clinicId);
    setOwnerActionError(null);
    try {
      // Fase 27.2 — quem o admin escolhe pode não estar (ainda) vinculado a
      // esta clínica (ex.: hoje é dono de outra clínica auto-criada e o
      // admin quer consolidar tudo numa só). Por isso este botão não só
      // marca `owner_id`: também move `profiles.clinic_id` e
      // `professionals.clinic_id` do profissional escolhido pra cá, do
      // mesmo jeito que "Vincular clínica" faz em Admin → Usuários — senão
      // ele viraria "dono" de uma clínica da qual nem é membro.
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ clinic_id: clinicId })
        .eq("id", newOwnerId);
      if (profileErr) throw profileErr;

      // Upsert em vez de update: quem só ganhou "psicólogo" como papel
      // extra (Admin → Usuários → conceder papel) pode nunca ter passado
      // por `switch_active_role` pra esse papel — e é só nesse momento que
      // o gatilho da Fase 9 cria a linha em `professionals`. Sem o upsert,
      // um `update` aqui simplesmente não afetaria nenhuma linha.
      const { error: profErr } = await supabase
        .from("professionals")
        .upsert(
          { id: newOwnerId, clinic_id: clinicId },
          { onConflict: "id" },
        );
      if (profErr) throw profErr;

      const { error: clinicErr } = await supabase
        .from("clinics")
        .update({ owner_id: newOwnerId })
        .eq("id", clinicId);
      if (clinicErr) throw clinicErr;

      setOwnerPick((prev) => ({ ...prev, [clinicId]: "" }));
      await load();
    } catch (err) {
      console.error("Falha ao definir dono da clínica:", err);
      setOwnerActionError(clinicId);
    } finally {
      setOwnerBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("admin.clinics.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("admin.clinics.errorLoading")}
      </div>
    );
  }
  if (clinics.length === 0) {
    return (
      <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
        <p className="text-4xl mb-4">🏢</p>
        <p className="text-muted-foreground text-sm">
          {t("admin.clinics.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clinics.map((c) => {
        // Fase 26 — antes isto pegava QUALQUER psicólogo com clinic_id
        // batendo (`.find`), o que (a) mostrava um "dono" arbitrário quando
        // a clínica tinha mais de um profissional (possível desde que
        // psicólogos podem ser vinculados a uma clínica já existente) e (b)
        // não distinguia dono de membro comum. Agora compara direto com
        // `clinics.owner_id`, a fonte da verdade.
        const owner = people.find((p) => p.id === c.owner_id);
        const otherProfessionals = people.filter(
          (p) =>
            rolesOf(p).includes("psychologist") &&
            p.clinic_id === c.id &&
            p.id !== c.owner_id,
        );
        const secretaries = people.filter(
          (p) => rolesOf(p).includes("secretary") && p.clinic_id === c.id,
        );
        // Fase 27.2 — a lista é TODO psicólogo do sistema, não só quem já
        // está vinculado a esta clínica: o caso mais comum é justamente o
        // contrário (o profissional certo ainda está preso à clínica
        // pessoal auto-criada pra ele, não a esta). `handleSetOwner` já
        // cuida de mover o vínculo (`clinic_id`) pra cá ao definir o dono.
        // Fase 27.3 — usa `rolesOf` (papel principal + extras de
        // `user_roles`), não só `p.role`, senão alguém cujo papel principal
        // seja outro (ex.: admin que também é psicóloga) nunca aparecia.
        const eligibleForOwner = people.filter(
          (p) => rolesOf(p).includes("psychologist") && p.id !== c.owner_id,
        );
        return (
          <div
            key={c.id}
            className={`bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${owner ? "border-border" : "border-l-2 border-l-red-400 border-y-border border-r-border"}`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap px-5 py-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Fase 59 — quadrado com ícone à esquerda do nome, igual à
                    referência do Figma (que usa a bandeira do país; como
                    clínica não tem localização própria no schema, usa
                    Building2 em vez de inventar uma bandeira). */}
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                  <Building2 size={20} />
                </div>
                <span
                  className="text-lg font-light text-foreground"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {c.name || t("admin.clinics.unnamed")}
                </span>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                {/* Fase 58 — mini-colunas de estatística (profissionais /
                    secretárias), no espírito da referência enviada pelo
                    usuário, reaproveitando os mesmos dados que já eram
                    calculados aqui (owner + otherProfessionals/secretaries)
                    em vez de nova consulta. */}
                <div className="text-center">
                  <p
                    className="text-lg font-light text-foreground leading-none"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {(owner ? 1 : 0) + otherProfessionals.length}
                  </p>
                  <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-1">
                    {t("admin.clinics.professionalsLabel")}
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-lg font-light text-foreground leading-none"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {secretaries.length}
                  </p>
                  <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-1">
                    {t("admin.clinics.secretariesLabel")}
                  </p>
                </div>
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(`plans.${c.plan}.name`)}
                </span>
              </div>
            </div>

            <div className="text-sm px-5 py-3 border-t border-border">
              <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("admin.clinics.ownerLabel")}
              </p>
              {owner ? (
                <p className="text-foreground">
                  {owner.full_name || t("userMenu.noName")}{" "}
                  <span className="text-muted-foreground">
                    · {owner.email}
                  </span>
                </p>
              ) : (
                <p className="text-red-600 font-medium">
                  {t("admin.clinics.noOwner")}
                </p>
              )}
              {eligibleForOwner.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <select
                    value={ownerPick[c.id] ?? ""}
                    onChange={(e) =>
                      setOwnerPick((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors max-w-[220px]"
                  >
                    <option value="">
                      {t("admin.clinics.setOwnerPlaceholder")}
                    </option>
                    {eligibleForOwner.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || t("userMenu.noName")} · {p.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSetOwner(c.id)}
                    disabled={
                      !ownerPick[c.id] ||
                      ownerPick[c.id] === c.owner_id ||
                      ownerBusyId === c.id
                    }
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {ownerBusyId === c.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <LinkIcon size={12} />
                    )}
                    {t("admin.clinics.setOwnerButton")}
                  </button>
                </div>
              )}
              {ownerActionError === c.id && (
                <p className="text-xs text-red-600 mt-1.5">
                  {t("admin.clinics.setOwnerError")}
                </p>
              )}
            </div>

            <div className="text-sm px-5 py-3 border-t border-border">
              <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("admin.clinics.professionalsLabel")}
              </p>
              {otherProfessionals.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("admin.clinics.noOtherProfessionals")}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {otherProfessionals.map((p) => (
                    <p key={p.id} className="text-foreground">
                      {p.full_name || t("userMenu.noName")}{" "}
                      <span className="text-muted-foreground">
                        · {p.email}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm px-5 py-3 border-t border-border">
              <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("admin.clinics.secretariesLabel")}
              </p>
              {secretaries.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("admin.clinics.noSecretaries")}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {secretaries.map((s) => (
                    <p key={s.id} className="text-foreground">
                      {s.full_name || t("userMenu.noName")}{" "}
                      <span className="text-muted-foreground">
                        · {s.email}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Painel Admin: Pacientes — vincular a outro psicólogo (Fase 25) ────────
// Sem esta tela, mudar um paciente de profissional exigia mexer direto no
// banco: `PatientsView` (a tela normal de pacientes) só existe do ponto de
// vista de UM profissional logado (RLS restringe a `professional_id =
// auth.uid()`), então não tem como reatribuir por ali. Aqui o admin já
// enxerga TODOS os pacientes (policy "patients: admin gerencia tudo") e
// pode escolher outro psicólogo aprovado pra cada um — a clínica do
// paciente é atualizada junto, pra continuar coerente com a do novo
// profissional (senão a secretária da clínica antiga continuaria vendo um
// paciente que já não é mais dela).
type AdminPatientRow = {
  id: string;
  full_name: string;
  email: string | null;
  professional_id: string;
  clinic_id: string | null;
  status: string;
};

type AdminProfessionalOption = {
  id: string;
  clinic_id: string | null;
  name: string | null;
};

function AdminPatientsView() {
  const { t, i18n } = useTranslation();
  const [patients, setPatients] = useState<AdminPatientRow[]>([]);
  const [professionals, setProfessionals] = useState<AdminProfessionalOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Fase 59 — colunas "Clínica"/"Sessões"/"Próxima", igual à referência do
  // Figma (que mostra localização/sessões/próxima sessão): o app não guarda
  // localização de paciente, então usa a clínica (dado real e útil numa
  // visão entre clínicas) no lugar; sessões/próxima vêm de `appointments`,
  // que o admin já enxerga por inteiro via RLS "gerencia tudo".
  const [clinicNames, setClinicNames] = useState<Record<string, string>>({});
  const [apptStats, setApptStats] = useState<
    Record<string, { count: number; next: string | null }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [patientsRes, professionalsRes, clinicsRes, appointmentsRes] =
      await Promise.all([
        supabase
          .from("patients")
          .select("id, full_name, email, professional_id, clinic_id, status")
          .order("full_name", { ascending: true }),
        supabase
          .from("professionals")
          .select("id, clinic_id, profiles(full_name)")
          .eq("approved", true),
        supabase.from("clinics").select("id, name"),
        supabase
          .from("appointments")
          .select("patient_id, starts_at, status")
          .neq("status", "cancelled")
          .order("starts_at", { ascending: true }),
      ]);

    if (patientsRes.error || professionalsRes.error) {
      console.error(
        "Falha ao carregar pacientes (admin):",
        patientsRes.error || professionalsRes.error,
      );
      setError(true);
      setLoading(false);
      return;
    }

    setPatients((patientsRes.data as AdminPatientRow[]) ?? []);
    setProfessionals(
      ((professionalsRes.data ?? []) as any[]).map((p) => ({
        id: p.id,
        clinic_id: p.clinic_id,
        name: p.profiles?.full_name ?? null,
      })),
    );
    const clinicMap: Record<string, string> = {};
    ((clinicsRes.data ?? []) as { id: string; name: string | null }[]).forEach(
      (c) => {
        clinicMap[c.id] = c.name || t("admin.clinics.unnamed");
      },
    );
    setClinicNames(clinicMap);

    const now = Date.now();
    const stats: Record<string, { count: number; next: string | null }> = {};
    (
      (appointmentsRes.data ?? []) as {
        patient_id: string;
        starts_at: string;
        status: string;
      }[]
    ).forEach((a) => {
      const entry = (stats[a.patient_id] ??= { count: 0, next: null });
      entry.count += 1;
      // A consulta já vem ordenada por `starts_at` crescente — a primeira
      // futura encontrada pra este paciente é a próxima.
      if (
        entry.next === null &&
        new Date(a.starts_at).getTime() >= now
      ) {
        entry.next = a.starts_at;
      }
    });
    setApptStats(stats);

    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const professionalById = new Map(professionals.map((p) => [p.id, p]));

  const handleReassign = async (patient: AdminPatientRow) => {
    const targetId = pick[patient.id];
    if (!targetId || targetId === patient.professional_id) return;
    const target = professionalById.get(targetId);
    if (!target) return;
    setBusyId(patient.id);
    setActionError(null);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          professional_id: targetId,
          clinic_id: target.clinic_id,
        })
        .eq("id", patient.id);
      if (error) throw error;
      setPick((prev) => {
        const next = { ...prev };
        delete next[patient.id];
        return next;
      });
      await load();
    } catch (err: any) {
      console.error("Falha ao reatribuir paciente:", err);
      setActionError(t("admin.patients.reassignError"));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("admin.patients.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("admin.patients.errorLoading")}
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-w-sm mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.patients.searchPlaceholder")}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      </div>

      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {actionError}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-muted-foreground text-sm">
            {patients.length === 0
              ? t("admin.patients.empty")
              : t("admin.patients.noResults")}
          </p>
        </div>
      ) : (
        // Fase 59 — tabela (Paciente/Clínica/Psicólogo/Sessões/Próxima/
        // Status), igual à referência do Figma. "Localização" da referência
        // vira "Clínica" (o app não guarda localização de paciente); a
        // reatribuição de psicólogo — que a referência não tem, mas é uma
        // função real que já existia aqui — mora dentro da própria célula
        // "Psicólogo".
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {[
                  t("admin.patients.table.patient"),
                  t("admin.patients.table.clinic"),
                  t("admin.patients.table.professional"),
                  t("admin.patients.table.sessions"),
                  t("admin.patients.table.next"),
                  t("admin.patients.table.status"),
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const current = professionalById.get(p.professional_id);
                const stats = apptStats[p.id];
                return (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors align-top">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/15 shrink-0 flex items-center justify-center text-sm font-semibold text-accent">
                          {p.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {p.full_name}
                          </p>
                          {p.email && (
                            <p className="text-xs text-muted-foreground">
                              {p.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {p.clinic_id
                        ? clinicNames[p.clinic_id] || "—"
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-foreground text-xs">
                          {current?.name || t("admin.patients.noProfessional")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={pick[p.id] ?? p.professional_id}
                            onChange={(e) =>
                              setPick((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            className="text-xs px-2 py-1 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors max-w-[150px]"
                          >
                            {professionals.map((prof) => (
                              <option key={prof.id} value={prof.id}>
                                {prof.name || t("userMenu.noName")}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleReassign(p)}
                            disabled={
                              !pick[p.id] ||
                              pick[p.id] === p.professional_id ||
                              busyId === p.id
                            }
                            title={t("admin.patients.reassignButton")}
                            className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground shrink-0"
                          >
                            {busyId === p.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <LinkIcon size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {stats?.count ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {stats?.next
                        ? new Intl.DateTimeFormat(i18n.language, {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(stats.next))
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}
                      >
                        {p.status === "active"
                          ? t("patients.statusActive")
                          : t("patients.statusInactive")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Painel Admin: Leads do quiz (Fase 29) ─────────────────────────────────
// O quiz público da Landing ("Não achou quem procura?", Fase 23) já
// gravava os leads certinho em `quiz_leads`, mas não existia nenhuma tela
// pra ver isso dentro do site — só consultando direto no painel do
// Supabase. Esta tela lista os leads (mais recentes primeiro) e deixa
// marcar como "já contatei", igual ao padrão já usado em "Solicitações".
type QuizLeadStatus = "pending" | "contacted";

type QuizLead = {
  id: string;
  full_name: string | null;
  email: string;
  answers: Record<string, string> | null;
  status: QuizLeadStatus;
  created_at: string;
  suggested_professional_id: string | null;
  suggested_at: string | null;
};

// Profissional aprovado pra escolher no seletor "Sugerir profissional"
// (Fase 30) — só precisa do necessário pra listar e identificar.
type LeadSuggestOption = {
  id: string;
  name: string;
};

function AdminLeadsView({
  onCountChange,
}: {
  onCountChange?: (delta: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const [leads, setLeads] = useState<QuizLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuizLeadStatus | "all">(
    "all",
  );
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<LeadSuggestOption[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<Record<string, string>>(
    {},
  );

  const quizQuestions = t("quiz.questions", {
    returnObjects: true,
  }) as QuizQuestionItem[];

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [leadsRes, professionalsRes] = await Promise.all([
      supabase
        .from("quiz_leads")
        .select(
          "id, full_name, email, answers, status, created_at, suggested_professional_id, suggested_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("professionals")
        .select("id, profiles(full_name)")
        .eq("approved", true),
    ]);
    if (leadsRes.error) {
      console.error("Falha ao carregar leads do quiz:", leadsRes.error);
      setError(true);
    } else {
      setLeads((leadsRes.data as QuizLead[]) ?? []);
    }
    if (professionalsRes.error) {
      console.error(
        "Falha ao carregar profissionais pra sugestão:",
        professionalsRes.error,
      );
    } else {
      setProfessionals(
        ((professionalsRes.data ?? []) as any[]).map((p) => ({
          id: p.id,
          name: p.profiles?.full_name || t("userMenu.noName"),
        })),
      );
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const professionalById = new Map(professionals.map((p) => [p.id, p]));

  const markContacted = async (lead: QuizLead) => {
    setActioningId(lead.id);
    setActionError(null);
    const { error: err } = await supabase
      .from("quiz_leads")
      .update({ status: "contacted" })
      .eq("id", lead.id);
    setActioningId(null);
    if (err) {
      console.error("Falha ao atualizar lead:", err);
      setActionError(lead.id);
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: "contacted" } : l)),
    );
    onCountChange?.(-1);
  };

  // Fase 30 — o match continua sendo escolha do admin (o seletor abaixo);
  // esta função só dispara o e-mail pro profissional escolhido e registra
  // a sugestão. Ver a rota `/leads/:id/suggest` pra detalhes de por que o
  // match não é automático e o que acontece se o e-mail ainda não estiver
  // configurado (`email_not_configured`).
  const suggestProfessional = async (lead: QuizLead) => {
    const professionalId = pick[lead.id];
    if (!professionalId) return;
    setSuggestingId(lead.id);
    setSuggestError((prev) => {
      const next = { ...prev };
      delete next[lead.id];
      return next;
    });
    try {
      await apiFetch(`/leads/${lead.id}/suggest`, {
        method: "POST",
        body: JSON.stringify({ professional_id: professionalId }),
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                status: "contacted",
                suggested_professional_id: professionalId,
                suggested_at: new Date().toISOString(),
              }
            : l,
        ),
      );
      if (lead.status === "pending") onCountChange?.(-1);
    } catch (err: any) {
      let message = err?.message || t("admin.leads.suggestError");
      try {
        const parsed = JSON.parse(message);
        if (parsed?.error) message = parsed.error;
      } catch {
        /* fall back to raw message */
      }
      setSuggestError((prev) => ({
        ...prev,
        [lead.id]:
          message === "email_not_configured"
            ? t("admin.leads.emailNotConfigured")
            : t("admin.leads.suggestError"),
      }));
    } finally {
      setSuggestingId(null);
    }
  };

  const answerLines = (lead: QuizLead) => {
    if (!lead.answers) return [];
    return Object.entries(lead.answers)
      .filter(([key]) => /^q\d+$/.test(key))
      .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
      .map(([key, value]) => {
        const index = Number(key.slice(1));
        return {
          question: quizQuestions[index]?.question ?? key,
          answer: value,
        };
      });
  };

  const filtered =
    statusFilter === "all"
      ? leads
      : leads.filter((l) => l.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> {t("admin.leads.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("admin.leads.errorLoading")}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as QuizLeadStatus | "all")
          }
          className="text-sm px-4 py-2.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer max-w-xs transition-colors"
        >
          <option value="all">{t("admin.leads.statusFilterAll")}</option>
          <option value="pending">{t("admin.leads.status.pending")}</option>
          <option value="contacted">{t("admin.leads.status.contacted")}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">💌</p>
          <p className="font-semibold text-foreground mb-2">
            {t("admin.leads.emptyTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("admin.leads.emptyText")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <div
              key={lead.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {lead.full_name || t("admin.leads.noName")}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        lead.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {t(`admin.leads.status.${lead.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dateLabel(lead.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-2">
                  <Mail size={13} className="shrink-0" /> {lead.email}
                </span>
              </div>

              {answerLines(lead).length > 0 && (
                <div className="flex flex-col gap-2 text-sm bg-secondary rounded-lg px-3 py-2.5 mb-3">
                  {answerLines(lead).map((line, i) => (
                    <div key={i}>
                      <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">
                        {line.question}
                      </p>
                      <p className="text-foreground">{line.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {lead.suggested_professional_id && (
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Send size={12} className="shrink-0" />
                  {t("admin.leads.suggestedLabel", {
                    name:
                      professionalById.get(lead.suggested_professional_id)
                        ?.name || t("userMenu.noName"),
                    date: lead.suggested_at ? dateLabel(lead.suggested_at) : "",
                  })}
                </p>
              )}

              {actionError === lead.id && (
                <p className="text-red-500 text-xs mb-2">
                  {t("admin.leads.actionError")}
                </p>
              )}

              {suggestError[lead.id] && (
                <p className="text-red-500 text-xs mb-2">
                  {suggestError[lead.id]}
                </p>
              )}

              {lead.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <select
                    value={pick[lead.id] ?? ""}
                    onChange={(e) =>
                      setPick((prev) => ({ ...prev, [lead.id]: e.target.value }))
                    }
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors max-w-[200px]"
                  >
                    <option value="">
                      {t("admin.leads.suggestPlaceholder")}
                    </option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => suggestProfessional(lead)}
                    disabled={!pick[lead.id] || suggestingId === lead.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                  >
                    {suggestingId === lead.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    {t("admin.leads.suggestButton")}
                  </button>
                  <button
                    onClick={() => markContacted(lead)}
                    disabled={actioningId === lead.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-50"
                  >
                    {t("admin.leads.markContacted")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Painel Admin: Pedidos de exclusão de conta (Fase 35) ──────────────────
// "Solicitar exclusão da minha conta" (Configurações → Segurança, qualquer
// papel) cria um PEDIDO aqui em vez de apagar a conta na hora — dados de
// prontuário costumam ter obrigação legal de retenção mínima, e decidir
// "pode apagar agora ou não" não é algo que dá pra automatizar com
// segurança sem orientação jurídica. Esta tela deixa o admin revisar cada
// pedido e marcar como concluído (depois de excluir manualmente, com
// cautela, pelo painel do Supabase) ou recusado — nenhuma das duas ações
// apaga nada sozinha; é só o registro da decisão.
type DeletionRequestStatus = "pending" | "completed" | "declined";

type DeletionRequest = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  reason: string | null;
  status: DeletionRequestStatus;
  requested_at: string;
};

function AdminDeletionRequestsView({
  adminId,
  onCountChange,
}: {
  adminId: string;
  onCountChange?: (delta: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    DeletionRequestStatus | "all"
  >("pending");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("account_deletion_requests")
      .select("id, user_id, email, role, reason, status, requested_at")
      .order("requested_at", { ascending: false });
    if (err) {
      console.error("Falha ao carregar pedidos de exclusão:", err);
      setError(true);
    } else {
      setRequests((data as DeletionRequest[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const resolve = async (
    request: DeletionRequest,
    status: "completed" | "declined",
  ) => {
    setActioningId(request.id);
    setActionError(null);
    const { error: err } = await supabase
      .from("account_deletion_requests")
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      })
      .eq("id", request.id);
    setActioningId(null);
    if (err) {
      console.error("Falha ao atualizar pedido de exclusão:", err);
      setActionError(request.id);
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status } : r)),
    );
    if (request.status === "pending") onCountChange?.(-1);
  };

  const filtered = requests.filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  const statusStyles: Record<DeletionRequestStatus, string> = {
    pending: "bg-secondary text-muted-foreground",
    completed: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground bg-secondary border border-border rounded-lg px-4 py-3 max-w-2xl">
        {t("admin.deletions.legalNotice")}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {(["pending", "completed", "declined", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
          >
            {s === "all"
              ? t("admin.deletions.statusFilterAll")
              : t(`admin.deletions.status.${s}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 size={20} className="animate-spin" />{" "}
          {t("admin.deletions.loading")}
        </div>
      ) : error ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          {t("admin.deletions.errorLoading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-4">🌿</p>
          <p className="text-muted-foreground text-sm">
            {t("admin.deletions.emptyText")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <div>
                  <span className="font-semibold text-foreground">
                    {r.email}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(`roles.${r.role}`)} ·{" "}
                    {dateLabel(r.requested_at)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${statusStyles[r.status]}`}
                >
                  {t(`admin.deletions.status.${r.status}`)}
                </span>
              </div>
              {r.reason && (
                <p className="text-sm text-muted-foreground border-t border-border pt-3 mt-2">
                  {r.reason}
                </p>
              )}
              {r.status === "pending" && (
                <div className="flex items-center gap-2 pt-3 mt-1 border-t border-border">
                  <button
                    onClick={() => resolve(r, "completed")}
                    disabled={actioningId === r.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-60"
                  >
                    {t("admin.deletions.markCompleted")}
                  </button>
                  <button
                    onClick={() => resolve(r, "declined")}
                    disabled={actioningId === r.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-60"
                  >
                    {t("admin.deletions.markDeclined")}
                  </button>
                </div>
              )}
              {actionError === r.id && (
                <p className="text-red-500 text-xs mt-2">
                  {t("admin.deletions.actionError")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Painel Admin: Financeiro — faturamento estimado por plano (Fase 20) ───
// Não existe cobrança automática configurada (o site hoje mostra "Fale
// conosco" pros planos pagos — ver `plans.professional.price`/
// `plans.clinic.price` no i18n). Em vez de inventar uma integração de
// pagamento que não existe, esta tela deixa o admin registrar manualmente
// quanto cobra por mês em cada plano (`plan_prices`, criada nesta fase,
// começa zerada) e calcula a estimativa multiplicando pelo número real de
// clínicas em cada plano. Fica óbvio pro admin que é uma estimativa —
// nunca fingimos que é uma cobrança de verdade acontecendo.
type PlanPriceRow = {
  plan: PlanTier;
  monthly_price_cents: number;
};

function AdminFinanceView() {
  const { t, i18n } = useTranslation();
  const [prices, setPrices] = useState<Record<PlanTier, number>>({
    free: 0,
    professional: 0,
    clinic: 0,
  });
  const [counts, setCounts] = useState<Record<PlanTier, number>>({
    free: 0,
    professional: 0,
    clinic: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingPlan, setSavingPlan] = useState<PlanTier | null>(null);
  const [saveError, setSaveError] = useState<PlanTier | null>(null);
  const [invalidPlan, setInvalidPlan] = useState<PlanTier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [pricesRes, freeRes, professionalRes, clinicRes] =
      await Promise.all([
        supabase.from("plan_prices").select("plan, monthly_price_cents"),
        supabase
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("plan", "free"),
        supabase
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("plan", "professional"),
        supabase
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("plan", "clinic"),
      ]);

    if (pricesRes.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const priceMap: Record<PlanTier, number> = {
      free: 0,
      professional: 0,
      clinic: 0,
    };
    (pricesRes.data as PlanPriceRow[] | null ?? []).forEach((row) => {
      priceMap[row.plan] = row.monthly_price_cents;
    });
    setPrices(priceMap);
    setDraft({
      professional: String(priceMap.professional / 100),
      clinic: String(priceMap.clinic / 100),
    });
    setCounts({
      free: freeRes.count ?? 0,
      professional: professionalRes.count ?? 0,
      clinic: clinicRes.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (plan: PlanTier) => {
    const parsed = parseLocalizedAmount(draft[plan] ?? "0");
    if (!Number.isFinite(parsed)) {
      // Antes isso só retornava sem fazer nada — o botão "Salvar" parecia
      // não reagir a um valor inválido, sem nenhuma mensagem de erro.
      setInvalidPlan(plan);
      setSaveError(null);
      return;
    }
    const value = Math.max(0, Math.round(parsed * 100));
    setInvalidPlan(null);
    setSavingPlan(plan);
    setSaveError(null);
    const { error: err } = await supabase
      .from("plan_prices")
      .update({ monthly_price_cents: value, updated_at: new Date().toISOString() })
      .eq("plan", plan);
    if (err) {
      setSaveError(plan);
    } else {
      await load();
    }
    setSavingPlan(null);
  };

  // Fase 32 — fica em BRL de propósito (não é um esquecimento): isto é
  // receita de ASSINATURA da própria Travessia (o que as clínicas pagam
  // pra usar a plataforma), cobrada via Stripe só em BRL por enquanto (ver
  // nota na rota `/billing/change-plan`) — diferente da moeda que cada
  // profissional escolhe pra cobrar SEUS pacientes (`professionals.currency`,
  // também Fase 32). Não tem relação entre as duas.
  const currency = (cents: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(cents / 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("admin.finance.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        {t("admin.finance.errorLoading")}
      </div>
    );
  }

  const paidPlans: PlanTier[] = ["professional", "clinic"];
  const totalCents = paidPlans.reduce(
    (sum, p) => sum + prices[p] * counts[p],
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Fase 59 — StatCard, mesmo padrão usado nas outras telas de
          Financeiro/Visão geral. */}
      <StatCard
        icon={Wallet}
        label={t("admin.finance.totalLabel")}
        value={currency(totalCents)}
        sub={t("admin.finance.disclaimer")}
        tone="primary"
      />

      <div className="space-y-3">
        {paidPlans.map((plan) => (
          <div
            key={plan}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
              <div>
                <span className="font-semibold text-foreground">
                  {t(`plans.${plan}.name`)}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("admin.finance.clinicsOnPlan", { count: counts[plan] })}
                </p>
              </div>
              <p
                className="text-xl font-light text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {currency(prices[plan] * counts[plan])}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <label className="text-xs text-muted-foreground shrink-0">
                {t("admin.finance.priceLabel")}
              </label>
              <div className="relative flex-1 max-w-[160px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft[plan] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [plan]: e.target.value }))
                  }
                  className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
              <button
                onClick={() => handleSave(plan)}
                disabled={savingPlan === plan}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
              >
                {savingPlan === plan
                  ? t("admin.finance.saving")
                  : t("admin.finance.saveButton")}
              </button>
            </div>
            {invalidPlan === plan && (
              <p className="text-red-500 text-xs mt-2">
                {t("admin.finance.invalidPrice")}
              </p>
            )}
            {saveError === plan && (
              <p className="text-red-500 text-xs mt-2">
                {t("admin.finance.saveError")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

type AdminTab =
  | "overview"
  | "psychologists"
  | "users"
  | "clinics"
  | "patients"
  | "leads"
  | "deletions"
  | "finance"
  | "settings";

function AdminPanel({
  user,
  onLogout,
  onSwitchRole,
}: {
  user: AppUser;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminTab>("overview");
  // Fase 28 — sidebar fixa nas telas internas em vez das abas no topo (ver
  // nota equivalente em `SecretaryDashboard`).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [psychologists, setPsychologists] = useState<ProfessionalProfile[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "edit">("list");
  const [editing, setEditing] = useState<ProfessionalProfile | null>(null);
  // Fase 58 — busca por nome/e-mail na lista de psicólogos, no espírito da
  // referência enviada pelo usuário (que tem um campo de busca acima da
  // lista/tabela em praticamente toda tela de listagem).
  const [psychSearch, setPsychSearch] = useState("");
  // Fase 59 — colunas "Pacientes"/"Sessões" da tabela (igual à referência do
  // Figma): não vinham em `professionals`, então busca à parte, uma vez, e
  // conta no cliente (o admin enxerga tudo via RLS "gerencia tudo" — sem
  // policy nova, só leitura extra).
  const [psychStats, setPsychStats] = useState<
    Record<string, { patients: number; sessions: number }>
  >({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [patientsRes, appointmentsRes] = await Promise.all([
        supabase.from("patients").select("professional_id").eq("status", "active"),
        supabase.from("appointments").select("professional_id").neq("status", "cancelled"),
      ]);
      if (cancelled) return;
      const stats: Record<string, { patients: number; sessions: number }> = {};
      ((patientsRes.data ?? []) as { professional_id: string | null }[]).forEach((r) => {
        if (!r.professional_id) return;
        (stats[r.professional_id] ??= { patients: 0, sessions: 0 }).patients += 1;
      });
      ((appointmentsRes.data ?? []) as { professional_id: string | null }[]).forEach((r) => {
        if (!r.professional_id) return;
        (stats[r.professional_id] ??= { patients: 0, sessions: 0 }).sessions += 1;
      });
      setPsychStats(stats);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [toggleError, setToggleError] = useState(false);

  // Fase 29 — contagem de leads pendentes pro badge no menu "Leads". Refaz
  // a busca a cada troca de aba (consulta leve, `head: true`) pra não ficar
  // desatualizado depois que o admin marca algum lead como contatado.
  const [pendingLeadsCount, setPendingLeadsCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("quiz_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (!cancelled) setPendingLeadsCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  // Fase 35 — mesmo padrão de badge da Fase 29, agora pros pedidos de
  // exclusão de conta pendentes de revisão.
  const [pendingDeletionsCount, setPendingDeletionsCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("account_deletion_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (!cancelled) setPendingDeletionsCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  // Fase 12: o admin já não cria "perfis" do nada nem apaga contas por aqui
  // — `professionals` agora É a conta real de quem se cadastrou na
  // plataforma (Fase 1+), então "criar" é o próprio cadastro público e
  // "apagar" seria destruir uma conta de verdade (ação perigosa demais pra
  // um botão de lista; se algum dia for necessária, merece um fluxo
  // dedicado e mais cauteloso). O que sobra — e é o que faz sentido pra um
  // diretório de moderação — é aprovar/reprovar publicação e corrigir dados
  // do perfil público.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("professionals")
        .select(
          "id, title, location, flag, specialties, approach, sessions_info, photo_url, years, rating, approved, crp, session_price, currency, epsi_registration, created_at, profiles(full_name, email, phone)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPsychologists((data ?? []).map(mapProfessionalRow));
    } catch (err) {
      // Diagnóstico temporário — este catch antes engolia o erro em
      // silêncio, o que tornou impossível descobrir por que a lista
      // aparecia vazia mesmo com "Visão geral" mostrando contagens > 0.
      // Abra o console do navegador (F12) nesta tela pra ver o erro real.
      console.error("Falha ao carregar lista de psicólogos (admin):", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    if (!editing) return;
    const formData = new FormData();
    const fields = [
      "name",
      "phone",
      "title",
      "location",
      "flag",
      "approach",
      "sessions_info",
      "years",
      "crp",
      "session_price",
      "currency",
      "epsi_registration",
    ];
    fields.forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    });
    formData.append("specialties", JSON.stringify(data.specialties ?? []));

    if (data.photo_file instanceof File) {
      formData.append("photo_file", data.photo_file);
    }

    await apiFetch(`/professionals/${editing.id}`, {
      method: "PUT",
      body: formData,
    });

    await load();
    setView("list");
    setEditing(null);
  };

  const handleToggleApproval = async (p: ProfessionalProfile) => {
    setToggleError(false);
    const { error } = await supabase
      .from("professionals")
      .update({ approved: !p.approved })
      .eq("id", p.id);
    if (error) {
      console.error("Falha ao aprovar/reprovar psicólogo:", error);
      setToggleError(true);
      return;
    }
    await load();
  };

  const approved = psychologists.filter((p) => p.approved).length;

  const filteredPsychologists = psychologists.filter((p) => {
    if (!psychSearch.trim()) return true;
    const q = psychSearch.trim().toLowerCase();
    const haystack = [p.name, p.email, p.crp].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });

  const adminNavItems: {
    key: AdminTab;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }[] = [
      {
        key: "overview",
        icon: <LayoutDashboard size={14} />,
        label: t("admin.tabs.overview"),
      },
      {
        key: "psychologists",
        icon: <UserCircle size={14} />,
        label: t("admin.tabs.psychologists"),
      },
      { key: "users", icon: <Users size={14} />, label: t("admin.tabs.users") },
      {
        key: "clinics",
        icon: <Building2 size={14} />,
        label: t("admin.tabs.clinics"),
      },
      {
        key: "patients",
        icon: <Users size={14} />,
        label: t("admin.tabs.patients"),
      },
      {
        key: "leads",
        icon: <MessageSquare size={14} />,
        label: t("admin.tabs.leads"),
        badge: pendingLeadsCount,
      },
      {
        key: "deletions",
        icon: <Trash2 size={14} />,
        label: t("admin.tabs.deletions"),
        badge: pendingDeletionsCount,
      },
      {
        key: "finance",
        icon: <Wallet size={14} />,
        label: t("admin.tabs.finance"),
      },
      {
        key: "settings",
        icon: <Settings size={14} />,
        label: t("admin.tabs.settings"),
      },
    ];

  const adminNavItemClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  const navBadge = (count?: number) =>
    count && count > 0 ? (
      <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const adminSidebarNav = (onNavigate?: () => void) => (
    <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
      {adminNavItems.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            setTab(item.key);
            onNavigate?.();
          }}
          className={adminNavItemClass(tab === item.key)}
        >
          {item.icon} {item.label} {navBadge(item.badge)}
        </button>
      ))}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-background md:flex"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Sidebar — desktop. Fica sempre visível, inclusive durante a edição
          de um perfil (diferente das abas no topo de antes, que sumiam
          nesse momento — uma sidebar fixa faz mais sentido continuar ali).
          Fase 58 — arquitetura clara (bg-card + item ativo preenchido com a
          cor primária), ver nota equivalente em SecretaryDashboard. */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-card border-r border-border h-screen sticky top-0">
        {/* Fase 36 — ver nota equivalente em SecretaryDashboard: o scroll
            precisa ficar isolado no bloco de cima, senão o menu do usuário
            (que abre pra cima) é cortado pelo overflow da própria sidebar. */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="px-5 py-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-0.5">
              <BrandMark size={16} />
              <span
                className="font-bold text-foreground"
                style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem" }}
              >
                {t("nav.brand")}
              </span>
            </div>
            <p className="text-xs font-semibold text-primary">
              {t(`roles.${user.role}`)}
            </p>
          </div>
          <p className="px-5 pb-3 text-[0.65rem] text-muted-foreground">
            {approved} {t("admin.published")} ·{" "}
            {psychologists.length - approved} {t("admin.pending")}
          </p>
          {adminSidebarNav()}
        </div>
        <div className="px-3 py-4 border-t border-border flex flex-col gap-3 shrink-0">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe size={14} /> {t("admin.viewSite")}
          </button>
          <div className="px-2.5">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              dark={false}
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-card border-b border-border h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1 text-foreground">
          <Menu size={20} />
        </button>
        <BrandMark size={16} />
        <span
          className="font-bold text-sm text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("nav.brand")}
        </span>
        <div className="ml-auto">
          <UserMenu user={user} onLogout={onLogout} onSwitchRole={onSwitchRole} dark={false} />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border">
              <div className="flex items-center gap-2">
                <BrandMark size={16} />
                <span
                  className="font-bold text-sm text-foreground"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("nav.brand")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1 text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="px-5 pb-3 pt-3 text-[0.65rem] text-muted-foreground">
              {approved} {t("admin.published")} ·{" "}
              {psychologists.length - approved} {t("admin.pending")}
            </p>
            {adminSidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-border flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe size={14} /> {t("admin.viewSite")}
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Título/subtítulo — escondidos durante a edição de um perfil
            (Ponto 4: foco total na tarefa, sem distração ao lado). A
            navegação em si não some mais junto, já que agora vive na
            sidebar fixa acima. */}
        {!(tab === "psychologists" && view === "edit") && (
          <div className="mb-8">
            <h1
              className="text-3xl font-light text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {tab === "overview"
                ? t("admin.overview.title")
                : tab === "users"
                  ? t("admin.users.title")
                  : tab === "clinics"
                    ? t("admin.clinics.title")
                    : tab === "patients"
                      ? t("admin.patients.title")
                      : tab === "leads"
                        ? t("admin.leads.title")
                        : tab === "deletions"
                          ? t("admin.deletions.title")
                          : tab === "finance"
                            ? t("admin.finance.title")
                            : tab === "settings"
                              ? t("settings.security.title")
                              : t("admin.listTitle")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {tab === "overview"
                ? t("admin.overview.subtitle")
                : tab === "users"
                  ? t("admin.users.subtitle")
                  : tab === "clinics"
                    ? t("admin.clinics.subtitle")
                    : tab === "patients"
                      ? t("admin.patients.subtitle")
                      : tab === "leads"
                        ? t("admin.leads.subtitle")
                        : tab === "deletions"
                          ? t("admin.deletions.subtitle")
                          : tab === "finance"
                            ? t("admin.finance.subtitle")
                            : tab === "settings"
                              ? t("admin.settingsSubtitle")
                              : t("admin.listSubtitle")}
            </p>
          </div>
        )}

        {tab === "overview" && <AdminOverview />}
        {tab === "users" && <AdminUsersView currentUserId={user.id} />}
        {tab === "clinics" && <AdminClinicsView />}
        {tab === "patients" && <AdminPatientsView />}
        {tab === "leads" && (
          <AdminLeadsView
            onCountChange={(delta) =>
              setPendingLeadsCount((prev) => Math.max(0, prev + delta))
            }
          />
        )}
        {tab === "deletions" && (
          <AdminDeletionRequestsView
            adminId={user.id}
            onCountChange={(delta) =>
              setPendingDeletionsCount((prev) => Math.max(0, prev + delta))
            }
          />
        )}
        {tab === "finance" && <AdminFinanceView />}
        {tab === "settings" && <AccountSecurityView user={user} onLogout={onLogout} />}

        {tab === "psychologists" && (
          <>
            {/* Form view */}
            {view === "edit" && editing && (
              <div>
                <button
                  onClick={() => {
                    setView("list");
                    setEditing(null);
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                  <ChevronLeft size={16} /> {t("admin.backToList")}
                </button>
                <h2
                  className="text-2xl font-light mb-8 text-foreground"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("admin.editTitle")}
                </h2>
                <div className="bg-card border border-border rounded-2xl p-8">
                  <ProfileForm
                    initial={editing}
                    onSave={handleSave}
                    onCancel={() => {
                      setView("list");
                      setEditing(null);
                    }}
                  />
                </div>
              </div>
            )}

            {/* List view */}
            {view === "list" && (
              <>
                {toggleError && (
                  <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
                    {t("admin.toggleApprovalError")}
                  </p>
                )}
                {!loading && psychologists.length > 0 && (
                  <div className="relative max-w-sm mb-6">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                      value={psychSearch}
                      onChange={(e) => setPsychSearch(e.target.value)}
                      placeholder={t("admin.searchPlaceholder")}
                      className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                  </div>
                )}
                {loading ? (
                  <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
                    <Loader2 size={20} className="animate-spin" />{" "}
                    {t("admin.loadingProfiles")}
                  </div>
                ) : psychologists.length === 0 ? (
                  <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
                    <p className="text-4xl mb-4">🌿</p>
                    <p className="font-semibold text-foreground mb-2">
                      {t("admin.emptyTitle")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("admin.emptyText")}
                    </p>
                  </div>
                ) : filteredPsychologists.length === 0 ? (
                  <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
                    <p className="text-4xl mb-4">🔍</p>
                    <p className="font-semibold text-foreground mb-2">
                      {t("patients.noResultsTitle")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("patients.noResultsText")}
                    </p>
                  </div>
                ) : (
                  // Fase 59 — tabela (Profissional/Localização/
                  // Especialidades/Pacientes/Sessões/Status/Ações), igual à
                  // referência do Figma, no lugar da lista de cartões.
                  // `p.email` (mostrado nos cartões antigos) não tem coluna
                  // própria na referência — continua visível no tooltip do
                  // nome pra não perder a informação.
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50">
                        <tr>
                          {[
                            t("admin.table.professional"),
                            t("admin.table.location"),
                            t("admin.table.specialties"),
                            t("admin.table.patients"),
                            t("admin.table.sessions"),
                            t("admin.table.status"),
                            t("admin.table.actions"),
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredPsychologists.map((p) => (
                          <tr
                            key={p.id}
                            className={`hover:bg-secondary/30 transition-colors ${p.approved ? "" : "bg-amber-50/30"}`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 border border-border">
                                  {p.photo_url ? (
                                    <img
                                      src={p.photo_url}
                                      alt={p.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm">
                                      {p.flag}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p
                                    className="font-semibold text-foreground"
                                    title={p.email || undefined}
                                  >
                                    {p.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {p.crp || "—"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              {p.flag} {p.location}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {p.specialties.slice(0, 2).map((s) => (
                                  <span
                                    key={s}
                                    className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground"
                                  >
                                    {s}
                                  </span>
                                ))}
                                {p.specialties.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{p.specialties.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-foreground font-medium">
                              {psychStats[p.id]?.patients ?? 0}
                            </td>
                            <td className="px-4 py-3.5 text-foreground font-medium">
                              {psychStats[p.id]?.sessions ?? 0}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${p.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                              >
                                {p.approved
                                  ? t("admin.statusPublished")
                                  : t("admin.statusPending")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1">
                                {!p.approved && (
                                  <button
                                    onClick={() => handleToggleApproval(p)}
                                    title={t("admin.publishTooltip")}
                                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors border border-green-200"
                                  >
                                    <Check size={13} />
                                  </button>
                                )}
                                {p.approved && (
                                  <button
                                    onClick={() => handleToggleApproval(p)}
                                    title={t("admin.unpublishTooltip")}
                                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground border border-border"
                                  >
                                    <EyeOff size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditing(p);
                                    setView("edit");
                                  }}
                                  title={t("admin.editProfileTooltip")}
                                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground border border-border"
                                >
                                  <Pencil size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Public Landing ───────────────────────────────────────────────────────────

type TransitionItem = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  countries: string[];
};
type StepItem = { number: string; title: string; description: string };
// Fase 26 — a seção antes exibia 3 depoimentos com nome/local/foto de
// pessoas fictícias, com o título "Histórias reais de quem atravessou."
// Não existe (ainda) nenhum depoimento real coletado na plataforma — exibir
// como se fossem reais seria enganoso. Virou uma seção de proposta de
// valor (sem atribuir a uma pessoa específica) até que existam depoimentos
// de verdade pra usar aqui.
type ValuePropItem = { emoji: string; title: string; text: string };
type QuizQuestionItem = { question: string; options: string[] };
type FaqItem = { q: string; a: string };

// Linha da view pública `public_professionals` (Fase 12) — só os campos
// seguros de profissionais aprovados, já com o nome vindo de `profiles`.
// Não é preciso login pra ler: RLS de `profiles` bloquearia um join direto
// pro visitante anônimo, por isso essa view (dona = quem rodou a migração)
// existe especificamente pra alimentar o diretório público.
type PublicProfessional = {
  id: string;
  name: string;
  title: string;
  location: string;
  flag: string;
  specialties: string[];
  approach: string;
  sessions_info: string;
  photo_url: string;
  years: number;
  crp: string;
  session_price: number | null;
  // Fase 32 — moeda de cobrança escolhida pelo profissional ("BRL" | "EUR").
  // `rating` saiu daqui: a view pública não expõe mais essa coluna (não
  // existe avaliação real por trás, ver nota na migração da Fase 32).
  currency: string;
};

// ─── Solicitações de contato — "vitrine" pública (Fase 25) ─────────────────
// Um visitante do diretório público (`public_professionals`, acima) pode
// pedir pra ser conectado a um profissional específico pra agendar. Isto
// NÃO é agendamento self-service (o visitante não vê/escolhe um horário
// livre) — é um pedido de contato que cai na tela "Solicitações" do
// profissional (ou da secretária da clínica), pra ele decidir contatar,
// recusar, ou converter direto em paciente com o cadastro que já existe.
type BookingRequestStatus = "pending" | "contacted" | "converted" | "declined";

const PREFERRED_PERIOD_LIST = [
  "morning",
  "afternoon",
  "evening",
  "flexible",
] as const;
type PreferredPeriod = (typeof PREFERRED_PERIOD_LIST)[number];

type BookingRequest = {
  id: string;
  professional_id: string;
  clinic_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_period: PreferredPeriod | null;
  message: string | null;
  status: BookingRequestStatus;
  converted_patient_id: string | null;
  created_at: string;
  updated_at: string;
};

// Perfil público completo de um profissional do diretório + formulário
// "quero agendar" — é o que "Ver perfil" abre na Landing. O envio não cria
// uma consulta (ver nota na migration da Fase 25): só grava o pedido de
// contato, que aparece pro profissional (ou secretária da clínica) na tela
// "Solicitações" do painel dele.
function PublicProfileModal({
  psych,
  onClose,
}: {
  psych: PublicProfessional;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredPeriod, setPreferredPeriod] = useState<PreferredPeriod | "">(
    "",
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  // Fase 32 — cada profissional tem sua própria moeda de cobrança (ver
  // `professionals.currency`); o preço da sessão exibido aqui usa a moeda
  // dele, não a do idioma de quem está visitando o diretório.
  const currency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: psych.currency === "EUR" ? "EUR" : "BRL",
      maximumFractionDigits: 2,
    }).format(value);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(false);
    const { error: err } = await supabase.from("booking_requests").insert({
      professional_id: psych.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      preferred_period: preferredPeriod || null,
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (err) {
      console.error("Falha ao enviar solicitação de contato:", err);
      setError(true);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl max-w-lg w-full shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 bg-muted rounded-t-2xl overflow-hidden shrink-0">
          <img
            src={
              psych.photo_url ||
              `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=400&fit=crop&auto=format`
            }
            alt={t("psychologistsSection.photoAlt", { name: psych.name })}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-8">
          <div className="mb-1">
            <h3
              className="text-2xl font-light text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {psych.name}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {psych.title} · {psych.flag} {psych.location} ·{" "}
            {psych.years} {t("psychologistsSection.yearsExperience")}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {psych.specialties.map((s) => (
              <span
                key={s}
                className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full border border-border"
              >
                {s}
              </span>
            ))}
          </div>
          {psych.approach && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {psych.approach}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground border-t border-border pt-4 mb-6">
            <span>{psych.sessions_info}</span>
            {psych.session_price != null && (
              <span>
                {t("psychologistsSection.priceLabel")}{" "}
                <strong className="text-foreground">
                  {currency(psych.session_price)}
                </strong>
              </span>
            )}
            {psych.crp && <span>CRP {psych.crp}</span>}
          </div>

          {submitted ? (
            <div className="text-center py-6 bg-secondary rounded-xl">
              <p className="text-3xl mb-3">🌿</p>
              <p className="font-semibold text-foreground mb-1">
                {t("psychologistsSection.connect.successTitle")}
              </p>
              <p className="text-muted-foreground text-sm px-4">
                {t("psychologistsSection.connect.successText", {
                  name: psych.name,
                })}
              </p>
            </div>
          ) : showForm ? (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("psychologistsSection.connect.namePlaceholder")}
                required
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(
                  "psychologistsSection.connect.emailPlaceholder",
                )}
                required
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t(
                  "psychologistsSection.connect.phonePlaceholder",
                )}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              <select
                value={preferredPeriod}
                onChange={(e) =>
                  setPreferredPeriod(e.target.value as PreferredPeriod | "")
                }
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
              >
                <option value="">
                  {t("psychologistsSection.connect.periodPlaceholder")}
                </option>
                {PREFERRED_PERIOD_LIST.map((period) => (
                  <option key={period} value={period}>
                    {t(`psychologistsSection.connect.periods.${period}`)}
                  </option>
                ))}
              </select>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(
                  "psychologistsSection.connect.messagePlaceholder",
                )}
                rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
              />
              {error && (
                <p className="text-red-500 text-xs">
                  {t("psychologistsSection.connect.error")}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {t("psychologistsSection.connect.submit")}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm"
            >
              {t("psychologistsSection.connect.cta")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Landing() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTransition, setActiveTransition] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);
  const [leadError, setLeadError] = useState(false);

  const submitQuizLead = async () => {
    if (!leadEmail.trim()) return;
    setLeadSaving(true);
    setLeadError(false);
    const { error } = await supabase.from("quiz_leads").insert({
      full_name: leadName.trim() || null,
      email: leadEmail.trim(),
      answers: quizAnswers,
    });
    setLeadSaving(false);
    if (error) {
      console.error("Falha ao salvar lead do quiz:", error);
      setLeadError(true);
    } else {
      setLeadSaved(true);
    }
  };
  const [psychologists, setPsychologists] = useState<PublicProfessional[]>(
    [],
  );
  const [loadingPsychs, setLoadingPsychs] = useState(true);
  // Fase 25 — busca/filtro no diretório (client-side, sobre a lista já
  // carregada — a quantidade de profissionais aprovados não justifica ainda
  // uma query separada por termo de busca) + o profissional cujo perfil
  // público está aberto no momento (null = nenhum modal aberto).
  const [psychSearch, setPsychSearch] = useState("");
  const [psychSpecialty, setPsychSpecialty] = useState("");
  const [profileModalPsych, setProfileModalPsych] =
    useState<PublicProfessional | null>(null);

  const transitions = t("transitions.items", {
    returnObjects: true,
  }) as TransitionItem[];
  const steps = t("howItWorks.steps", { returnObjects: true }) as StepItem[];
  const valueProps = t("testimonialsSection.items", {
    returnObjects: true,
  }) as ValuePropItem[];
  const quizQuestions = t("quiz.questions", {
    returnObjects: true,
  }) as QuizQuestionItem[];
  const faqItems = t("faqSection.items", { returnObjects: true }) as FaqItem[];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fase 32 — antes ordenava por `rating`, um número estático e igual
      // pra (quase) todo mundo (sem sistema de avaliação real por trás,
      // ver nota na migração da Fase 32). `years` é um dado real, então
      // vira o critério de ordenação até existir um sinal melhor (ex.:
      // avaliações de verdade).
      const { data, error } = await supabase
        .from("public_professionals")
        .select("*")
        .order("years", { ascending: false })
        .order("created_at", { ascending: true });
      if (!cancelled) {
        if (!error) setPsychologists((data ?? []) as PublicProfessional[]);
        setLoadingPsychs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fase 30 — link direto pro perfil de um profissional específico
  // (`#psicologos?psych=<id>`), usado no e-mail de "sugestão" mandado pro
  // lead do quiz (ver rota `/leads/:id/suggest`). Sem isso o e-mail só
  // podia apontar pra Landing inteira, deixando a pessoa procurar o nome
  // sozinha no diretório inteiro.
  useEffect(() => {
    if (loadingPsychs || psychologists.length === 0) return;
    const queryPart = window.location.hash.split("?")[1];
    const psychId = queryPart
      ? new URLSearchParams(queryPart).get("psych")
      : null;
    if (!psychId) return;
    const match = psychologists.find((p) => p.id === psychId);
    if (match) {
      setProfileModalPsych(match);
      document
        .getElementById("psicologos")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loadingPsychs, psychologists]);

  const getPhotoSrc = (p: PublicProfessional) => {
    if (p.photo_url) return p.photo_url;
    return `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=400&fit=crop&auto=format`;
  };

  const allSpecialties = Array.from(
    new Set(psychologists.flatMap((p) => p.specialties)),
  ).sort((a: string, b: string) => a.localeCompare(b));

  const filteredPsychologists = psychologists.filter((p) => {
    const term = psychSearch.trim().toLowerCase();
    const matchesTerm =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.specialties.some((s) => s.toLowerCase().includes(term));
    const matchesSpecialty =
      !psychSpecialty || p.specialties.includes(psychSpecialty);
    return matchesTerm && matchesSpecialty;
  });

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <BrandMark size={18} />
            <span
              className="text-xl font-light tracking-wide text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {t("nav.brand")}
            </span>
            <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase mt-1">
              {t("nav.brandTag")}
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase">
            <a
              href="#como-funciona"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.comoFunciona")}
            </a>
            <a
              href="#psicologos"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.psicologos")}
            </a>
            <a
              href="#faq"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.perguntas")}
            </a>
            <a
              href="#planos"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.paraPsicologos")}
            </a>
            <LanguageSwitcher compact />
            <a
              href="#admin"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("signup.logIn")}
            </a>
            <a
              href="#comecar"
              className="border border-foreground text-foreground px-5 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors"
            >
              {t("nav.comecar")}
            </a>
          </div>
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-background border-t border-border px-6 py-6 flex flex-col gap-5 text-xs font-semibold tracking-wider uppercase">
            <a
              href="#como-funciona"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              {t("nav.comoFunciona")}
            </a>
            <a
              href="#psicologos"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              {t("nav.psicologos")}
            </a>
            <a
              href="#faq"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              {t("nav.perguntas")}
            </a>
            <a
              href="#planos"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              {t("nav.paraPsicologos")}
            </a>
            <LanguageSwitcher />
            <a
              href="#admin"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              {t("signup.logIn")}
            </a>
            <a
              href="#comecar"
              onClick={() => setMenuOpen(false)}
              className="border border-foreground text-foreground px-5 py-2.5 rounded-sm text-center"
            >
              {t("nav.comecarFull")}
            </a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-16 min-h-screen grid md:grid-cols-[1fr_1fr] overflow-hidden">
        <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 py-24 md:py-32">
          <div className="mb-6 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              {t("hero.eyebrow")}
            </span>
          </div>
          <h1
            className="italic text-5xl md:text-6xl lg:text-7xl font-light leading-[1.05] mb-8 text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("hero.titleLine1")}
            <br />
            {t("hero.titleLine2")}
            <br />
            <em className="text-primary">{t("hero.titleEmphasis")}</em>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-md font-normal">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
            <a
              href="#psicologos"
              className="inline-flex items-center justify-center gap-2 border-b-2 border-foreground text-foreground pb-1 font-semibold hover:border-accent hover:text-accent transition-colors text-base w-fit"
            >
              {t("hero.ctaPrimary")} <ArrowRight size={18} />
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-base w-fit"
            >
              {t("hero.ctaSecondary")}
            </a>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {t("hero.professionalCtaText")}{" "}
            <a
              href="#planos"
              className="font-semibold text-primary hover:text-accent transition-colors"
            >
              {t("hero.professionalCtaLink")}
            </a>
          </p>
          {/* Fase 26 — os 3 números aqui (840+, 🇧🇷🇪🇸, 4.9) eram fixos no
          JSX, sem nenhum dado real por trás — inclusive uma "avaliação
          média" que não existe (não há sistema de avaliação de pacientes
          construído ainda). Ficam só 2 números agora, e ambos são reais:
          a contagem de profissionais aprovados que já carregou pro
          diretório logo abaixo, e o "100% online" — verdadeiro, já que o
          produto todo é remoto. */}
          <div className="mt-14 flex items-center gap-8 text-sm text-muted-foreground">
            <div className="flex flex-col">
              <span
                className="text-2xl font-light text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {psychologists.length}+
              </span>
              <span>{t("hero.statPatients")}</span>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="flex flex-col">
              <span
                className="text-2xl font-light text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                100%
              </span>
              <span>{t("hero.statOnline")}</span>
            </div>
          </div>
        </div>
        <div className="relative hidden md:block bg-secondary overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=1000&fit=crop&auto=format"
            alt={t("hero.imageAlt")}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent"></div>
          <div className="absolute bottom-12 left-10 right-10">
            <div className="bg-background/90 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
              <p className="text-sm leading-relaxed text-foreground font-medium">
                {t("hero.imageCaption")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSITIONS */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              {t("transitions.eyebrow")}
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-light mb-16 leading-tight max-w-lg"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("transitions.title")}
          </h2>
          <div className="grid md:grid-cols-[2fr_3fr] gap-0 border border-primary-foreground/20 rounded-2xl overflow-hidden">
            <div className="border-r border-primary-foreground/20">
              {transitions.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTransition(i)}
                  className={`w-full text-left px-6 py-5 border-b border-primary-foreground/10 last:border-b-0 transition-colors flex items-center gap-4 ${activeTransition === i ? "bg-primary-foreground/10" : "hover:bg-primary-foreground/5"}`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span
                    className={`font-semibold text-sm md:text-base ${activeTransition === i ? "text-primary-foreground" : "text-primary-foreground/70"}`}
                  >
                    {item.title}
                  </span>
                  {activeTransition === i && (
                    <ArrowRight
                      size={16}
                      className="ml-auto text-accent shrink-0"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="p-10 flex flex-col justify-center">
              <span className="text-5xl mb-6 block">
                {transitions[activeTransition].emoji}
              </span>
              <h3
                className="text-3xl font-light mb-4"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {transitions[activeTransition].title}
              </h3>
              <p className="text-primary-foreground/80 leading-relaxed text-lg mb-8">
                {transitions[activeTransition].description}
              </p>
              {transitions[activeTransition].countries.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {transitions[activeTransition].countries.map((c) => (
                    <span
                      key={c}
                      className="text-sm bg-primary-foreground/10 rounded-full px-4 py-1.5 border border-primary-foreground/20"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <a
                href="#comecar"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:gap-3 transition-all"
              >
                {t("transitions.cta")} <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="py-28 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              {t("howItWorks.eyebrow")}
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-light mb-20 leading-tight max-w-xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("howItWorks.title")}
          </h2>
          <div className="grid md:grid-cols-2 gap-0 border border-border rounded-2xl overflow-hidden">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`p-10 border-border ${i < 2 ? "border-b" : ""} ${i % 2 === 0 ? "md:border-r" : ""} hover:bg-secondary/50 transition-colors`}
              >
                <span
                  className="text-6xl font-light text-border block mb-6 leading-none"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PSYCHOLOGISTS */}
      <section id="psicologos" className="py-28 bg-secondary">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              {t("psychologistsSection.eyebrow")}
            </span>
          </div>
          <div className="md:flex md:items-end md:justify-between mb-16">
            <h2
              className="text-4xl md:text-5xl font-light leading-tight max-w-lg"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {t("psychologistsSection.title")}
            </h2>
            <p className="text-muted-foreground max-w-xs mt-4 md:mt-0 text-sm leading-relaxed">
              {t("psychologistsSection.subtitle")}
            </p>
          </div>

          {!loadingPsychs && psychologists.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <div className="relative flex-1 max-w-sm">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={psychSearch}
                  onChange={(e) => setPsychSearch(e.target.value)}
                  placeholder={t("psychologistsSection.searchPlaceholder")}
                  className="w-full bg-background border border-border rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
              <select
                value={psychSpecialty}
                onChange={(e) => setPsychSpecialty(e.target.value)}
                className="bg-background border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
              >
                <option value="">
                  {t("psychologistsSection.specialtyFilterAll")}
                </option>
                {allSpecialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingPsychs ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 size={20} className="animate-spin" />{" "}
              {t("psychologistsSection.loading")}
            </div>
          ) : psychologists.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-background/50">
              <p className="text-4xl mb-4">🌿</p>
              <p className="font-semibold text-foreground mb-2">
                {t("psychologistsSection.emptyTitle")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("psychologistsSection.emptyText")}
              </p>
            </div>
          ) : filteredPsychologists.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-background/50">
              <p className="text-4xl mb-4">🔍</p>
              <p className="font-semibold text-foreground mb-2">
                {t("psychologistsSection.noResultsTitle")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("psychologistsSection.noResultsText")}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {filteredPsychologists.map((p) => (
                <div
                  key={p.id}
                  className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-shadow group"
                >
                  <div className="relative h-64 bg-muted overflow-hidden">
                    <img
                      src={getPhotoSrc(p)}
                      alt={t("psychologistsSection.photoAlt", { name: p.name })}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-background/90 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <MapPin size={10} className="text-accent" /> {p.flag}{" "}
                        {p.location}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-3">
                      <h3 className="font-semibold text-foreground text-lg">
                        {p.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {p.years} {t("psychologistsSection.yearsExperience")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.specialties.map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full border border-border"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {p.approach}
                    </p>
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {p.sessions_info}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProfileModalPsych(p)}
                        className="text-xs font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1"
                      >
                        {t("psychologistsSection.viewProfile")}{" "}
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-muted-foreground text-sm mt-10">
            {t("psychologistsSection.footerNote")}
          </p>
        </div>
      </section>

      {profileModalPsych && (
        <PublicProfileModal
          psych={profileModalPsych}
          onClose={() => setProfileModalPsych(null)}
        />
      )}

      {/* TESTIMONIALS */}
      <section className="py-28 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              {t("testimonialsSection.eyebrow")}
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-light mb-16 leading-tight max-w-xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("testimonialsSection.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {valueProps.map((item) => (
              <div
                key={item.title}
                className="bg-card border border-border rounded-2xl p-8 flex flex-col"
              >
                <span className="text-3xl mb-5 block">{item.emoji}</span>
                <h3 className="font-semibold text-foreground text-lg mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUIZ */}
      <section
        id="comecar"
        className="py-28 bg-primary text-primary-foreground"
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              {t("quiz.eyebrow")}
            </span>
          </div>
          {quizStep === 0 && (
            <div className="text-center py-8">
              <h2
                className="text-4xl md:text-6xl font-light mb-6 leading-[1.1]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {t("quiz.introTitleLine1")}
                <br />
                {t("quiz.introTitleLine2")}
              </h2>
              <p className="text-primary-foreground/70 text-lg mb-12 max-w-md mx-auto leading-relaxed">
                {t("quiz.introSubtitle")}
              </p>
              <button
                onClick={() => setQuizStep(1)}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                {t("quiz.startCta")} <ArrowRight size={20} />
              </button>
            </div>
          )}
          {quizStep >= 1 && quizStep <= quizQuestions.length && (
            <div>
              <div className="flex items-center gap-3 mb-12">
                {quizQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i < quizStep ? "bg-accent" : "bg-primary-foreground/20"}`}
                  />
                ))}
              </div>
              <h3
                className="text-3xl md:text-4xl font-light mb-10 leading-snug"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {quizQuestions[quizStep - 1].question}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {quizQuestions[quizStep - 1].options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setQuizAnswers({ ...quizAnswers, [`q${quizStep}`]: opt });
                      setQuizStep(quizStep + 1);
                    }}
                    className="text-left px-6 py-5 rounded-xl border border-primary-foreground/20 hover:border-accent hover:bg-primary-foreground/5 transition-all text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium leading-relaxed"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {quizStep > 1 && (
                <button
                  onClick={() => setQuizStep(quizStep - 1)}
                  className="mt-8 text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
                >
                  {t("quiz.back")}
                </button>
              )}
            </div>
          )}
          {quizStep > quizQuestions.length && (
            <div className="text-center py-8">
              <div className="text-6xl mb-6">🌿</div>
              <h3
                className="text-3xl md:text-4xl font-light mb-6"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {t("quiz.thanksTitle")}
              </h3>
              <p className="text-primary-foreground/70 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                {t("quiz.thanksSubtitle")}
              </p>
              {leadSaved ? (
                <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-2xl p-8 max-w-md mx-auto text-center">
                  <p className="text-sm font-semibold text-primary-foreground">
                    {t("quiz.leadSavedMessage")}
                  </p>
                </div>
              ) : (
                <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-2xl p-8 max-w-md mx-auto text-left">
                  <p className="text-sm font-semibold text-primary-foreground mb-4">
                    {t("quiz.continueLabel")}
                  </p>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder={t("quiz.emailPlaceholder")}
                    className="w-full bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg px-4 py-3 text-primary-foreground placeholder-primary-foreground/40 text-sm mb-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors"
                  />
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder={t("quiz.namePlaceholder")}
                    className="w-full bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg px-4 py-3 text-primary-foreground placeholder-primary-foreground/40 text-sm mb-5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors"
                  />
                  {leadError && (
                    <p className="text-accent text-xs mb-3">
                      {t("quiz.leadError")}
                    </p>
                  )}
                  <button
                    onClick={submitQuizLead}
                    disabled={leadSaving || !leadEmail.trim()}
                    className="w-full bg-accent text-accent-foreground py-3.5 rounded-full font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {leadSaving && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    {t("quiz.submitCta")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-28 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              {t("faqSection.eyebrow")}
            </span>
          </div>
          <h2
            className="text-4xl font-light mb-14 leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("faqSection.title")}
          </h2>
          <div className="divide-y divide-border">
            {faqItems.map((item, i) => (
              <div key={i} className="py-6">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start justify-between gap-6 text-left group"
                >
                  <span className="font-semibold text-foreground text-base leading-snug group-hover:text-primary transition-colors">
                    {item.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground shrink-0 mt-0.5 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <p className="mt-4 text-muted-foreground leading-relaxed text-sm pr-8">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-foreground text-background py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-14">
            <div>
              <p
                className="text-2xl font-light mb-3 flex items-center gap-2"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                <BrandMark size={20} light /> {t("nav.brand")}
              </p>
              <p className="text-background/60 text-sm leading-relaxed max-w-xs">
                {t("footer.blurb")}
              </p>
              <div className="flex items-center gap-3 mt-6">
                <span className="text-xs bg-background/10 rounded-full px-3 py-1.5">
                  {t("footer.badgeBrasil")}
                </span>
                <span className="text-xs bg-background/10 rounded-full px-3 py-1.5">
                  {t("footer.badgeEspanha")}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs tracking-widest uppercase font-semibold text-background/40 mb-5">
                {t("footer.platformTitle")}
              </p>
              <ul className="space-y-3 text-sm text-background/70">
                <li>
                  <a
                    href="#como-funciona"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.comoFunciona")}
                  </a>
                </li>
                <li>
                  <a
                    href="#psicologos"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.psicologos")}
                  </a>
                </li>
                <li>
                  <a
                    href="#sobre"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.sobre")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs tracking-widest uppercase font-semibold text-background/40 mb-5">
                {t("footer.supportTitle")}
              </p>
              <ul className="space-y-3 text-sm text-background/70">
                <li>
                  <a
                    href="#faq"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.perguntasFrequentes")}
                  </a>
                </li>
                <li>
                  <a
                    href="#contato"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.falarComEquipe")}
                  </a>
                </li>
                <li>
                  <a
                    href="#planos"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.paraPsicologos")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs tracking-widest uppercase font-semibold text-background/40 mb-5">
                {t("footer.adminTitle")}
              </p>
              <ul className="space-y-3 text-sm text-background/70">
                <li>
                  <a
                    href="#admin"
                    className="hover:text-background transition-colors flex items-center gap-1.5"
                  >
                    <Shield size={12} /> {t("footer.adminArea")}
                  </a>
                </li>
                <li>
                  <a
                    href="#privacidade"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.privacidade")}
                  </a>
                </li>
                <li>
                  <a
                    href="#termos"
                    className="hover:text-background transition-colors"
                  >
                    {t("footer.termos")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/40">
            <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
            <p>{t("footer.registration")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Patient Area (Fase 8) ──────────────────────────────────────────────────────
// The patient-facing experience: view and confirm/cancel upcoming
// appointments, read anything the psychologist chose to share from
// session notes, and see basic profile info. Everything here is read
// through security-definer views/RPCs set up in the Fase 8 migration
// (`patient_own_profile`, `patient_visible_records`,
// `patient_set_appointment_status`) — the patient never has raw table
// access to `patients` or `clinical_records`, only these narrow,
// purpose-built windows into their own data.

type OwnProfile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  // Fase 52 — se o paciente é menor de idade, o Portal cobra um terceiro
  // aceite (autorização do responsável) além dos dois TCLEs da Fase 51.
  is_minor: boolean;
};

type OwnAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

// Fase 45 — pedido de remarcação, criado pelo paciente e revisado pelo
// profissional/secretária (ver nota completa na migração).
type RescheduleRequest = {
  id: string;
  appointment_id: string;
  requested_starts_at: string;
  requested_ends_at: string;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
};

type SharedRecord = {
  id: string;
  session_date: string;
  shared_notes: string;
  created_at: string;
};

// Aba de "Conta" do paciente (Fase 13): edita nome/telefone/e-mail de
// contato através de `patient_update_own_contact_info` — uma função
// SECURITY DEFINER que só altera essas 3 colunas na própria linha de
// `patients` (mesmo padrão de `patient_set_appointment_status`, Fase 8). O
// paciente nunca ganha uma policy de UPDATE direta na tabela: RLS restringe
// linhas, não colunas, e uma policy ampla deixaria editar `notes`/`tags`
// (anotações internas do profissional).
function PatientAccountView({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"success" | "error" | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_own_profile")
      .select("id, full_name, email, phone, status")
      .maybeSingle();
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const p = data as OwnProfile;
    setProfile(p);
    setName(p.full_name ?? "");
    setPhone(p.phone ?? "");
    setEmail(p.email ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);
    const { error } = await supabase.rpc("patient_update_own_contact_info", {
      p_full_name: name,
      p_phone: phone || null,
      p_email: email || null,
    });
    setSaving(false);
    setSaveResult(error ? "error" : "success");
    if (!error) await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" />{" "}
        {t("settings.account.loading")}
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t("patientArea.notLinkedText")}
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {t("settings.account.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.patientAccount.subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-card border border-border rounded-2xl p-6 space-y-4"
      >
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("profileForm.nameLabel")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("profileForm.phoneLabel")}
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("settings.patientAccount.contactEmailLabel")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("settings.patientAccount.contactEmailHint")}
          </p>
        </div>

        {saveResult === "error" && (
          <p className="text-red-500 text-sm">
            {t("settings.security.genericError")}
          </p>
        )}
        {saveResult === "success" && (
          <p className="text-green-600 text-sm">
            {t("professionalProfile.saveSuccess")}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? t("settings.security.saving") : t("profileForm.saveEdit")}
        </button>
      </form>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {t("settings.patientAccount.loginEmailLabel")}
          </span>
          <span className="text-sm font-medium text-foreground text-right">
            {user.email || "—"}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("settings.patientAccount.loginEmailHint")}
      </p>
    </div>
  );
}

// Fase 13: mesma casca de sub-abas do "Configurações" do profissional
// (SettingsView), com o subconjunto que faz sentido pro paciente — sem
// "Perfil profissional", "Clínica" nem "Plano", que não existem pra ele.
function PatientSettingsView({
  user,
  onLogout,
}: {
  user: AppUser;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"account" | "preferences" | "security">(
    "account",
  );

  const tabs: {
    key: "account" | "preferences" | "security";
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "account",
      label: t("settings.tabs.account"),
      icon: <UserCircle size={14} />,
    },
    {
      key: "preferences",
      label: t("settings.tabs.preferences"),
      icon: <Globe size={14} />,
    },
    {
      key: "security",
      label: t("settings.tabs.security"),
      icon: <Shield size={14} />,
    },
  ];

  return (
    <div className="grid md:grid-cols-[190px_1fr] gap-8">
      <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-left whitespace-nowrap transition-colors shrink-0 ${tab === tabItem.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {tabItem.icon} {tabItem.label}
          </button>
        ))}
      </div>
      <div className="min-w-0">
        {tab === "account" && <PatientAccountView user={user} />}
        {tab === "preferences" && <PreferencesView />}
        {tab === "security" && <AccountSecurityView user={user} onLogout={onLogout} />}
      </div>
    </div>
  );
}

// Fase 46 — diário de humor + escalas psicométricas, lado do paciente:
// registra o próprio humor do dia e responde PHQ-9/GAD-7 quando quiser,
// sem depender de nenhuma sessão marcada.
function PatientMoodAndScales({ patientId }: { patientId: string }) {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [assessments, setAssessments] = useState<PsychometricAssessment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [moodSaving, setMoodSaving] = useState(false);
  const [moodError, setMoodError] = useState(false);
  const [activeScale, setActiveScale] = useState<"phq9" | "gad7" | null>(
    null,
  );
  const [scaleAnswers, setScaleAnswers] = useState<number[]>([]);
  const [scaleSaving, setScaleSaving] = useState(false);
  const [scaleError, setScaleError] = useState(false);
  const [lastResult, setLastResult] = useState<PsychometricAssessment | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [entriesRes, assessmentsRes] = await Promise.all([
      supabase
        .from("mood_entries")
        .select("id, entry_date, mood_score, note, created_at")
        .eq("patient_id", patientId)
        .order("entry_date", { ascending: false })
        .limit(14),
      supabase
        .from("psychometric_assessments")
        .select("id, scale, answers, total_score, severity, flagged, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setEntries((entriesRes.data as MoodEntry[]) ?? []);
    setAssessments((assessmentsRes.data as PsychometricAssessment[]) ?? []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const submitMood = async () => {
    if (moodScore == null) return;
    setMoodSaving(true);
    setMoodError(false);
    const { error: err } = await supabase.from("mood_entries").insert({
      patient_id: patientId,
      mood_score: moodScore,
      note: moodNote.trim() || null,
    });
    if (err) {
      console.error("Falha ao registrar humor:", err);
      setMoodError(true);
    } else {
      setMoodScore(null);
      setMoodNote("");
      await load();
    }
    setMoodSaving(false);
  };

  const startScale = (scale: "phq9" | "gad7") => {
    setActiveScale(scale);
    setScaleAnswers(new Array(ASSESSMENT_QUESTION_COUNT[scale]).fill(-1));
    setScaleError(false);
    setLastResult(null);
  };

  const submitScale = async () => {
    if (!activeScale) return;
    if (scaleAnswers.some((a) => a < 0)) return;
    setScaleSaving(true);
    setScaleError(false);
    const totalScore = scaleAnswers.reduce((sum, a) => sum + a, 0);
    const severity = severityForScore(activeScale, totalScore);
    const flagged = activeScale === "phq9" && scaleAnswers[8] > 0;
    const { data, error: err } = await supabase
      .from("psychometric_assessments")
      .insert({
        patient_id: patientId,
        scale: activeScale,
        answers: scaleAnswers,
        total_score: totalScore,
        severity,
        flagged,
      })
      .select("id, scale, answers, total_score, severity, flagged, created_at")
      .maybeSingle();
    if (err) {
      console.error("Falha ao salvar escala:", err);
      setScaleError(true);
      setScaleSaving(false);
      return;
    }
    setLastResult(data as PsychometricAssessment);
    setActiveScale(null);
    setScaleSaving(false);
    await load();
  };

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(`${iso}T00:00:00`));

  const moodEmojis = ["😞", "🙁", "😐", "🙂", "😄"];

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Smile size={16} className="text-primary" />
          {t("intersession.moodTitle")}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("intersession.moodSubtitle")}
        </p>
        <div className="flex items-center gap-2 mb-3">
          {moodEmojis.map((emoji, i) => {
            const score = i + 1;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setMoodScore(score)}
                className={`w-11 h-11 rounded-full text-xl flex items-center justify-center border transition-colors ${moodScore === score ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
                aria-label={t(`intersession.moodScale.${score}`)}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
          placeholder={t("intersession.moodNotePlaceholder")}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors mb-3"
        />
        <button
          onClick={submitMood}
          disabled={moodScore == null || moodSaving}
          className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {moodSaving && <Loader2 size={12} className="animate-spin" />}
          {t("intersession.moodSubmit")}
        </button>
        {moodError && (
          <p className="text-red-500 text-xs mt-2">
            {t("intersession.moodError")}
          </p>
        )}
        {!loading && entries.length > 0 && (
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            {entries.map((e) => (
              <div
                key={e.id}
                title={e.note ?? ""}
                className="flex flex-col items-center gap-0.5 bg-secondary rounded-lg px-2.5 py-1.5"
              >
                <span className="text-base leading-none">
                  {moodEmojis[e.mood_score - 1]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {dateLabel(e.entry_date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          {t("intersession.scalesTitle")}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("intersession.scalesSubtitle")}
        </p>

        {activeScale ? (
          <div>
            <div className="space-y-4">
              {Array.from({ length: ASSESSMENT_QUESTION_COUNT[activeScale] }).map(
                (_, i) => (
                  <div key={i}>
                    <p className="text-sm text-foreground mb-2">
                      {i + 1}. {t(`assessments.${activeScale}.q${i + 1}`)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2, 3].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setScaleAnswers((prev) => {
                              const next = [...prev];
                              next[i] = opt;
                              return next;
                            })
                          }
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${scaleAnswers[i] === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                        >
                          {t(`assessments.options.${opt}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
            {scaleError && (
              <p className="text-red-500 text-xs mt-4">
                {t("intersession.scaleError")}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActiveScale(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("intersession.scaleCancel")}
              </button>
              <button
                onClick={submitScale}
                disabled={scaleAnswers.some((a) => a < 0) || scaleSaving}
                className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {scaleSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  t("intersession.scaleSubmit")
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => startScale("phq9")}
                className="text-xs font-medium px-4 py-2 rounded-full border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                {t("intersession.startPhq9")}
              </button>
              <button
                onClick={() => startScale("gad7")}
                className="text-xs font-medium px-4 py-2 rounded-full border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                {t("intersession.startGad7")}
              </button>
            </div>

            {lastResult && (
              <div className="bg-secondary rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-foreground">
                  {t(`intersession.scaleName.${lastResult.scale}`)} ·{" "}
                  {lastResult.total_score}{" "}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeStyles[lastResult.severity] ?? ""}`}
                  >
                    {t(`intersession.severity.${lastResult.severity}`)}
                  </span>
                </p>
                {lastResult.flagged && (
                  <p className="text-xs text-red-600 mt-2 leading-relaxed">
                    {t("intersession.flaggedNotice")}
                  </p>
                )}
              </div>
            )}

            {assessments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("intersession.noAssessments")}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {assessments.map((a) => (
                  <div
                    key={a.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">
                        {t(`intersession.scaleName.${a.scale}`)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeStyles[a.severity] ?? ""}`}
                      >
                        {a.total_score} ·{" "}
                        {t(`intersession.severity.${a.severity}`)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dateLabel(a.created_at.slice(0, 10))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PatientArea({
  user,
  onLogout,
  onSwitchRole,
}: {
  user: AppUser;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<"overview" | "settings">("overview");
  // Fase 29 — sidebar fixa (mesmo padrão das outras 3 telas internas) em vez
  // dos botões-pílula que existiam antes só pra alternar "Visão geral" /
  // "Configurações".
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  // Fase 29 — antes só buscava consultas FUTURAS (`gte starts_at, agora`).
  // Pra ter cartões de estatística e o gráfico de consultas por mês (igual
  // à visão geral do profissional), agora busca o histórico completo do
  // paciente de uma vez só; a lista de "próximas" é só um filtro client-side
  // sobre esse mesmo conjunto, não uma query separada.
  const [allAppointments, setAllAppointments] = useState<OwnAppointment[]>(
    [],
  );
  const [records, setRecords] = useState<SharedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  // Fase 45 — pedidos de remarcação em aberto (pendentes), por id da
  // consulta, pra saber qual consulta já tem um pedido enviado e não
  // deixar mandar dois de uma vez.
  const [rescheduleRequests, setRescheduleRequests] = useState<
    Record<string, RescheduleRequest>
  >({});
  const [rescheduleModalAppt, setRescheduleModalAppt] =
    useState<OwnAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleMessage, setRescheduleMessage] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(false);
  // Fase 51 — TCLE: quais consentimentos ainda faltam aceitar. Enquanto
  // houver algum pendente, a tela mostra só o gate de aceite (ver render
  // mais abaixo), nada do resto do Portal do Paciente. Fase 52 acrescenta
  // um terceiro tipo, cobrado só quando `profile.is_minor` é verdadeiro —
  // por isso `acceptedConsentTypes` guarda o aceite bruto e a lista de
  // pendentes é recalculada (efeito abaixo) sempre que `profile` OU os
  // aceites mudarem, não só uma vez no mount.
  const [acceptedConsentTypes, setAcceptedConsentTypes] = useState<
    Set<string>
  >(new Set());
  const [pendingConsents, setPendingConsents] = useState<
    ("general_tcle" | "online_therapy" | "guardian_authorization")[]
  >([]);
  const [consentsLoading, setConsentsLoading] = useState(true);
  const [acceptingConsent, setAcceptingConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const loadConsents = useCallback(async () => {
    setConsentsLoading(true);
    const { data } = await supabase
      .from("patient_consents")
      .select("consent_type");
    setAcceptedConsentTypes(
      new Set(
        ((data as { consent_type: string }[]) ?? []).map(
          (c) => c.consent_type,
        ),
      ),
    );
    setConsentsLoading(false);
  }, []);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  useEffect(() => {
    const missing: ("general_tcle" | "online_therapy" | "guardian_authorization")[] =
      [];
    if (!acceptedConsentTypes.has("general_tcle")) missing.push("general_tcle");
    if (!acceptedConsentTypes.has("online_therapy"))
      missing.push("online_therapy");
    if (profile?.is_minor && !acceptedConsentTypes.has("guardian_authorization")) {
      missing.push("guardian_authorization");
    }
    setPendingConsents(missing);
  }, [acceptedConsentTypes, profile]);

  const acceptConsent = async (
    consentType: "general_tcle" | "online_therapy" | "guardian_authorization",
  ) => {
    setAcceptingConsent(true);
    setConsentError(false);
    try {
      await apiFetch("/consents/accept", {
        method: "POST",
        body: JSON.stringify({ consentType }),
      });
      await loadConsents();
    } catch (err) {
      console.error("Falha ao registrar aceite de TCLE:", err);
      setConsentError(true);
    } finally {
      setAcceptingConsent(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const profileRes = await supabase
      .from("patient_own_profile")
      .select("id, full_name, email, phone, status, is_minor")
      .maybeSingle();

    if (profileRes.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const ownProfile = profileRes.data as OwnProfile | null;
    setProfile(ownProfile);

    if (ownProfile) {
      // Fase 57 — as anotações compartilhadas passam a vir do backend
      // (que decripta quando preciso) em vez da view `patient_visible_
      // records` direto — a view continua existindo no banco, só não é
      // mais usada por aqui.
      const [apptRes, recordsRes, reschedRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, starts_at, ends_at, status")
          .eq("patient_id", ownProfile.id)
          .order("starts_at", { ascending: true }),
        apiFetch("/patient/shared-records")
          .then((res) => ({ data: (res?.records as SharedRecord[]) ?? [] }))
          .catch((err) => {
            console.error("Falha ao carregar anotações compartilhadas:", err);
            return { data: null };
          }),
        supabase
          .from("appointment_reschedule_requests")
          .select(
            "id, appointment_id, requested_starts_at, requested_ends_at, message, status",
          )
          .eq("patient_id", ownProfile.id)
          .eq("status", "pending"),
      ]);
      setAllAppointments((apptRes.data as OwnAppointment[]) ?? []);
      setRecords((recordsRes.data as SharedRecord[]) ?? []);
      const reschedMap: Record<string, RescheduleRequest> = {};
      ((reschedRes.data as RescheduleRequest[]) ?? []).forEach((r) => {
        reschedMap[r.appointment_id] = r;
      });
      setRescheduleRequests(reschedMap);
    }
    setLoading(false);
  }, [user.id]);

  const now = new Date();
  const appointments = allAppointments.filter(
    (a) => new Date(a.starts_at) >= now,
  );
  const completedCount = allAppointments.filter(
    (a) => a.status === "completed",
  ).length;

  // Últimos 6 meses, mesmo padrão de bucket usado no gráfico de faturamento
  // do `ProfessionalDashboard` — meses sem nenhuma consulta aparecem com 0
  // em vez de simplesmente sumirem do gráfico.
  const sessionsByMonth = (() => {
    const buckets = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    allAppointments
      .filter((a) => a.status !== "cancelled")
      .forEach((a) => {
        const d = new Date(a.starts_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });
    return Array.from(buckets.entries()).map(([key, count]) => {
      const [y, m] = key.split("-").map(Number);
      return { month: new Date(y, m, 1).toISOString(), count };
    });
  })();

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (id: string, status: "confirmed" | "cancelled") => {
    setActioningId(id);
    setActionError(false);
    const { error: err } = await supabase.rpc(
      "patient_set_appointment_status",
      { p_appointment_id: id, p_new_status: status },
    );
    if (err) {
      setActionError(true);
    } else {
      await load();
    }
    setActioningId(null);
  };

  const openRescheduleModal = (appt: OwnAppointment) => {
    const d = new Date(appt.starts_at);
    setRescheduleDate(toDateInputValue(d));
    setRescheduleTime(toTimeInputValue(d));
    setRescheduleMessage("");
    setRescheduleError(false);
    setRescheduleModalAppt(appt);
  };

  const submitReschedule = async () => {
    if (!rescheduleModalAppt || !profile || !rescheduleDate || !rescheduleTime) return;
    setRescheduleSaving(true);
    setRescheduleError(false);
    const original = rescheduleModalAppt;
    const durationMs =
      new Date(original.ends_at).getTime() -
      new Date(original.starts_at).getTime();
    const newStart = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
    const newEnd = new Date(newStart.getTime() + (durationMs > 0 ? durationMs : 50 * 60 * 1000));
    const { error: err } = await supabase
      .from("appointment_reschedule_requests")
      .insert({
        appointment_id: original.id,
        patient_id: profile.id,
        requested_starts_at: newStart.toISOString(),
        requested_ends_at: newEnd.toISOString(),
        message: rescheduleMessage.trim() || null,
      });
    if (err) {
      console.error("Falha ao pedir remarcação:", err);
      setRescheduleError(true);
      setRescheduleSaving(false);
      return;
    }
    setRescheduleSaving(false);
    setRescheduleModalAppt(null);
    await load();
  };

  const cancelRescheduleRequest = async (requestId: string) => {
    setActioningId(requestId);
    setActionError(false);
    const { error: err } = await supabase
      .from("appointment_reschedule_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId);
    if (err) {
      setActionError(true);
    } else {
      await load();
    }
    setActioningId(null);
  };

  const dateTimeLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));

  const monthLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(
      new Date(iso),
    );

  const patientNavItems: {
    key: "overview" | "settings";
    icon: React.ReactNode;
    label: string;
  }[] = [
    {
      key: "overview",
      icon: <LayoutDashboard size={14} />,
      label: t("dashboard.navOverview"),
    },
    {
      key: "settings",
      icon: <UserCircle size={14} />,
      label: t("dashboard.navSettings"),
    },
  ];

  const patientNavItemClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  const patientSidebarNav = (onNavigate?: () => void) => (
    <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
      {patientNavItems.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            setView(item.key);
            onNavigate?.();
          }}
          className={patientNavItemClass(view === item.key)}
        >
          {item.icon} {item.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div
      className="min-h-screen bg-background md:flex"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Fase 51 — TCLE: enquanto houver consentimento pendente, cobre a
          tela inteira (sem botão de fechar) até o paciente aceitar. O
          resto do Portal continua "por baixo" (não removido do DOM, só
          coberto) — mantém o resto do componente exatamente como já
          funcionava, sem precisar reestruturar todo o retorno. */}
      {!consentsLoading && !loading && pendingConsents.length > 0 && (
        <div className="fixed inset-0 bg-background z-[100] overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 py-16">
            <h1
              className="text-2xl font-light text-foreground mb-2"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {t(`consents.${pendingConsents[0]}.title`)}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("consents.intro")}
            </p>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 max-h-[50vh] overflow-y-auto">
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                {t(`consents.${pendingConsents[0]}.text`)}
              </p>
            </div>
            {consentError && (
              <p className="text-red-500 text-sm mb-4">
                {t("consents.error")}
              </p>
            )}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("consents.logout")}
              </button>
              <button
                onClick={() => acceptConsent(pendingConsents[0])}
                disabled={acceptingConsent}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {acceptingConsent ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {t("consents.acceptButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar — desktop. Fase 58 — arquitetura clara (bg-card + item
          ativo preenchido com a cor primária), ver nota equivalente em
          SecretaryDashboard. */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-card border-r border-border h-screen sticky top-0">
        {/* Fase 36 — ver nota equivalente em SecretaryDashboard: o scroll
            precisa ficar isolado no bloco de cima, senão o menu do usuário
            (que abre pra cima) é cortado pelo overflow da própria sidebar. */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="px-5 py-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-0.5">
              <BrandMark size={16} />
              <span
                className="font-bold text-foreground"
                style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem" }}
              >
                {t("nav.brand")}
              </span>
            </div>
            <p className="text-xs font-semibold text-primary">
              {t(`roles.${user.role}`)}
            </p>
          </div>
          {patientSidebarNav()}
        </div>
        <div className="px-3 py-4 border-t border-border flex flex-col gap-3 shrink-0">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe size={14} /> {t("admin.viewSite")}
          </button>
          <div className="px-2.5">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              onOpenSettings={() => setView("settings")}
              dark={false}
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-card border-b border-border h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1 text-foreground">
          <Menu size={20} />
        </button>
        <BrandMark size={16} />
        <span
          className="font-bold text-sm text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("nav.brand")}
        </span>
        <div className="ml-auto">
          <UserMenu
            user={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
            onOpenSettings={() => setView("settings")}
            dark={false}
          />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border">
              <div className="flex items-center gap-2">
                <BrandMark size={16} />
                <span
                  className="font-bold text-sm text-foreground"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("nav.brand")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1 text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            {patientSidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-border flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe size={14} /> {t("admin.viewSite")}
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1
            className="text-3xl font-light text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {view === "settings"
              ? t("settings.title")
              : user.fullName
                ? t("dashboard.greeting", {
                    name: user.fullName.trim().split(/\s+/)[0],
                  })
                : t("patientArea.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {view === "settings"
              ? t("settings.subtitle")
              : t("patientArea.subtitle")}
          </p>
        </div>

        {view === "settings" ? (
          <PatientSettingsView user={user} onLogout={onLogout} />
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 size={20} className="animate-spin" />{" "}
            {t("patientArea.loading")}
          </div>
        ) : error ? (
          <div className="text-center py-24 text-muted-foreground text-sm">
            {t("patientArea.errorLoading")}
          </div>
        ) : !profile ? (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <p className="text-4xl mb-4">🌿</p>
            <p className="font-semibold text-foreground mb-2">
              {t("patientArea.notLinkedTitle")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("patientArea.notLinkedText")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Fase 29 — cartões de estatística + gráfico, no mesmo espírito
                da visão geral do profissional. Fase 59: StatCard
                individual (ícone colorido) no lugar da grade com
                hairlines, pra bater com a referência do Figma. */}
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard
                icon={Calendar}
                label={t("patientArea.kpi.upcoming")}
                value={appointments.length}
                tone="primary"
              />
              <StatCard
                icon={Check}
                label={t("patientArea.kpi.completed")}
                value={completedCount}
                tone="accent"
              />
              <StatCard
                icon={FileText}
                label={t("patientArea.kpi.sharedNotes")}
                value={records.length}
                tone="neutral"
              />
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {t("patientArea.kpi.chartTitle")}
              </h3>
              {sessionsByMonth.every((m) => m.count === 0) && (
                <p className="text-xs text-muted-foreground mb-2">
                  {t("dashboard.charts.noData")}
                </p>
              )}
              <div className="h-48 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionsByMonth}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthLabel}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <RechartsTooltip labelFormatter={(v) => monthLabel(String(v))} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {t("patientArea.upcomingTitle")}
              </h3>
              {appointments.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">
                  {t("patientArea.noUpcoming")}
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-muted-foreground" />
                        <span className="text-sm text-foreground capitalize">
                          {dateTimeLabel(appt.starts_at)}
                        </span>
                        <span className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
                          {t(`dashboard.appointmentStatus.${appt.status}`)}
                        </span>
                      </div>
                      {(appt.status === "scheduled" ||
                        appt.status === "confirmed") && (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <a
                            href={jitsiRoomUrl(appt.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Video size={13} /> {t("patientArea.joinVideo")}
                          </a>
                          {appt.status === "scheduled" && (
                            <button
                              onClick={() =>
                                handleAction(appt.id, "confirmed")
                              }
                              disabled={actioningId === appt.id}
                              className="text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
                            >
                              {t("patientArea.confirm")}
                            </button>
                          )}
                          {rescheduleRequests[appt.id] ? (
                            <button
                              onClick={() =>
                                cancelRescheduleRequest(
                                  rescheduleRequests[appt.id].id,
                                )
                              }
                              disabled={
                                actioningId === rescheduleRequests[appt.id].id
                              }
                              className="text-xs font-medium px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
                            >
                              {t("patientArea.reschedulePendingBadge")}
                            </button>
                          ) : (
                            <button
                              onClick={() => openRescheduleModal(appt)}
                              className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors"
                            >
                              {t("patientArea.reschedule")}
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(appt.id, "cancelled")}
                            disabled={actioningId === appt.id}
                            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-60"
                          >
                            {t("patientArea.cancel")}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {actionError && (
                <p className="text-red-500 text-xs mt-3">
                  {t("patientArea.actionError")}
                </p>
              )}
            </div>

            {rescheduleModalAppt && (
              <div
                className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
                onClick={() => setRescheduleModalAppt(null)}
              >
                <div
                  className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-semibold text-foreground mb-1">
                    {t("patientArea.rescheduleModalTitle")}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("patientArea.rescheduleModalHint")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t("patientArea.rescheduleDateLabel")}
                      </label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t("patientArea.rescheduleTimeLabel")}
                      </label>
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      {t("patientArea.rescheduleMessageLabel")}
                    </label>
                    <textarea
                      value={rescheduleMessage}
                      onChange={(e) => setRescheduleMessage(e.target.value)}
                      rows={3}
                      placeholder={t(
                        "patientArea.rescheduleMessagePlaceholder",
                      )}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
                    />
                  </div>
                  {rescheduleError && (
                    <p className="text-red-500 text-xs mt-3">
                      {t("patientArea.rescheduleError")}
                    </p>
                  )}
                  <div className="flex gap-3 justify-end mt-5">
                    <button
                      onClick={() => setRescheduleModalAppt(null)}
                      className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      {t("patientArea.cancel")}
                    </button>
                    <button
                      onClick={submitReschedule}
                      disabled={
                        rescheduleSaving || !rescheduleDate || !rescheduleTime
                      }
                      className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {rescheduleSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        t("patientArea.rescheduleSubmit")
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {profile && <PatientMoodAndScales patientId={profile.id} />}

            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {t("patientArea.sharedNotesTitle")}
              </h3>
              {records.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">
                  {t("patientArea.noSharedNotes")}
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {records.map((r) => (
                    <div key={r.id} className="py-4">
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {dateLabel(r.session_date)}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {r.shared_notes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {t("patientArea.myInfoTitle")}
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {t("patientArea.nameLabel")}
                  </p>
                  <p className="text-foreground">{profile.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {t("patientArea.emailLabel")}
                  </p>
                  <p className="text-foreground">{profile.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {t("patientArea.phoneLabel")}
                  </p>
                  <p className="text-foreground">
                    {profile.phone || t("patientArea.noPhone")}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-4">
                {t("patientArea.infoHint")}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Páginas institucionais (Fase 14) ──────────────────────────────────────────
// Sobre / Contato / Termos de uso / Privacidade — as 4 páginas que faltavam
// pra nenhum link do rodapé apontar pra lugar nenhum. Compartilham essa
// casca (header simples + "voltar ao início" + rodapé mínimo) em vez de cada
// uma remontar sua própria navegação.
function InfoPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <nav className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <a
            href="#"
            className="flex items-center gap-2"
            onClick={() => {
              window.location.hash = "";
            }}
          >
            <BrandMark size={18} />
            <span
              className="text-xl font-bold text-primary"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {t("nav.brand")}
            </span>
          </a>
          <div className="flex items-center gap-4">
            <LanguageSwitcher compact />
            <a
              href="#"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} /> {t("infoPages.backToHome")}
            </a>
          </div>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16 flex-1 w-full">
        <h1
          className="text-3xl md:text-4xl font-light text-foreground mb-10"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {title}
        </h1>
        <div className="prose-content text-foreground/90 leading-relaxed space-y-6 text-sm md:text-base">
          {children}
        </div>
      </div>
      <footer className="border-t border-border py-8">
        <div className="max-w-3xl mx-auto px-6 text-xs text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}

function AboutPage() {
  const { t } = useTranslation();
  const paragraphs = t("sobrePage.paragraphs", {
    returnObjects: true,
  }) as string[];
  return (
    <InfoPageShell title={t("sobrePage.title")}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </InfoPageShell>
  );
}

function ContactPage() {
  const { t } = useTranslation();
  return (
    <InfoPageShell title={t("contatoPage.title")}>
      <p>{t("contatoPage.intro")}</p>
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4 not-prose">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Globe size={16} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("contatoPage.emailLabel")}
            </p>
            <a
              href={`mailto:${t("contatoPage.emailValue")}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {t("contatoPage.emailValue")}
            </a>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("contatoPage.responseTimeNote")}
      </p>
    </InfoPageShell>
  );
}

function TermsPage() {
  const { t } = useTranslation();
  const sections = t("termosPage.sections", {
    returnObjects: true,
  }) as { heading: string; body: string }[];
  return (
    <InfoPageShell title={t("termosPage.title")}>
      <p className="text-sm text-muted-foreground bg-secondary border border-border rounded-lg px-4 py-3 not-prose">
        {t("termosPage.draftNotice")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("termosPage.lastUpdated")}
      </p>
      {sections.map((s, i) => (
        <div key={i}>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {s.heading}
          </h2>
          <p>{s.body}</p>
        </div>
      ))}
    </InfoPageShell>
  );
}

function PrivacyPage() {
  const { t } = useTranslation();
  const sections = t("privacidadePage.sections", {
    returnObjects: true,
  }) as { heading: string; body: string }[];
  return (
    <InfoPageShell title={t("privacidadePage.title")}>
      <p className="text-sm text-muted-foreground bg-secondary border border-border rounded-lg px-4 py-3 not-prose">
        {t("privacidadePage.draftNotice")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("privacidadePage.lastUpdated")}
      </p>
      {sections.map((s, i) => (
        <div key={i}>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {s.heading}
          </h2>
          <p>{s.body}</p>
        </div>
      ))}
    </InfoPageShell>
  );
}

// ─── Página pública de planos (Fase 15) ────────────────────────────────────────
// Pré-cadastro — não depende de sessão. Reaproveita o mesmo conteúdo
// (nome/preço/recursos) e as mesmas constantes (`PLAN_ORDER`, definidas na
// Fase 10 junto com `PlanView`) que a aba autenticada "Configurações →
// Plano" já usa, só que aqui cada cartão sempre mostra "Escolher esse
// plano" (não existe "plano atual" pra quem ainda não tem conta) levando
// pra `#cadastro?plan=<tier>`. Preço vem do texto configurável em
// `plans.<tier>.price` (Fase 10) — sem valores fixos inventados aqui.
function PublicPlansPage() {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a
            href="#"
            className="flex items-center gap-2"
            onClick={() => {
              window.location.hash = "";
            }}
          >
            <BrandMark size={18} />
            <span
              className="text-xl font-bold text-primary"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {t("nav.brand")}
            </span>
          </a>
          <div className="flex items-center gap-4">
            <LanguageSwitcher compact />
            <a
              href="#admin"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("signup.logIn")}
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 flex-1 w-full">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h1
            className="text-3xl md:text-4xl font-light text-foreground mb-4"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("publicPlans.title")}
          </h1>
          <p className="text-muted-foreground">{t("publicPlans.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_ORDER.map((tier) => {
            const features = t(`plans.${tier}.features`, {
              returnObjects: true,
            }) as string[];
            const highlighted = tier === "professional";
            return (
              <div
                key={tier}
                className={`rounded-2xl p-6 flex flex-col ${highlighted ? "border-2 border-primary bg-card shadow-lg" : "border border-border bg-card"}`}
              >
                {highlighted && (
                  <span className="self-start text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-full mb-3">
                    {t("publicPlans.mostPopular")}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-foreground">
                  {t(`plans.${tier}.name`)}
                </h3>
                <p className="text-2xl font-light text-foreground mt-2 mb-5">
                  {t(`plans.${tier}.price`)}
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check
                        size={14}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={`#cadastro?plan=${tier}`}
                  className={`text-center px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 ${highlighted ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground border border-border"}`}
                >
                  {t("publicPlans.selectPlan")}
                </a>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          {t("publicPlans.billingNote")}
        </p>
      </div>

      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 text-xs text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}

// ─── Root Router ──────────────────────────────────────────────────────────────

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Captured once, synchronously, on first render — before supabase-js's
  // async detectSessionInUrl has a chance to process (and effectively
  // consume) the #access_token=...&type=invite|recovery hash Supabase Auth
  // appends when someone opens an invite or "forgot password" email link.
  const [authFlowType] = useState<"invite" | "recovery" | null>(() => {
    const type = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    ).get("type");
    return type === "invite" || type === "recovery" ? type : null;
  });
  const [passwordFlowDone, setPasswordFlowDone] = useState(false);

  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser().then((u) => {
      if (cancelled) return;
      setUser(u);
      setAuthChecked(true);
    });

    // Uses the `session` passed into the callback directly instead of
    // calling supabase.auth.getSession() here — see the comment on
    // callMeWithToken for why that matters.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callMeWithToken(session?.access_token ?? null).then((u) => {
        if (cancelled) return;
        setUser(u);
        setAuthChecked(true);
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.hash = "";
  };

  // Fase 17 — troca de perfil sem logout: valida no banco (não é só um
  // toggle visual) e, se autorizado, atualiza o `AppUser` em memória. Como
  // todo o roteamento abaixo (`renderRoleArea`) já decide qual painel
  // mostrar só olhando `user.role`, essa única troca de estado já basta
  // pra trocar dashboard, menu e permissões — sem sair e entrar de novo.
  const handleSwitchRole = async (role: UserRole) => {
    const updated = await switchActiveRole(role);
    if (updated) setUser(updated);
  };

  // Compartilhado entre `#admin` (login) e `#cadastro` já logado (alguém
  // que volta pra tela de cadastro depois de já ter conta) — mesma lógica
  // de "pra onde essa pessoa vai" em um só lugar.
  const renderRoleArea = (u: AppUser) => {
    if (u.role === "admin") {
      return (
        <AdminPanel
          user={u}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
        />
      );
    }
    if (u.role === "psychologist") {
      return (
        <ProfessionalDashboard
          user={u}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
        />
      );
    }
    if (u.role === "patient") {
      return (
        <PatientArea
          user={u}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
        />
      );
    }
    if (u.role === "secretary") {
      return (
        <SecretaryDashboard
          user={u}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
        />
      );
    }
    return (
      <ComingSoonArea
        user={u}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
      />
    );
  };

  if (authFlowType && !passwordFlowDone) {
    if (!authChecked) return null;
    if (!user) return <InviteLinkExpiredScreen />;
    return (
      <SetPasswordScreen
        mode={authFlowType}
        onDone={() => {
          setPasswordFlowDone(true);
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search + "#admin",
          );
          setHash("#admin");
        }}
      />
    );
  }

  if (hash === "#admin") {
    if (!authChecked) return null;
    if (!user) return <LoginForm onLogin={setUser} />;
    return renderRoleArea(user);
  }

  // Cadastro público de secretária por código (Fase 27) — `#cadastro-secretaria`
  // ou `#cadastro-secretaria?code=XXXXXXXX` (vindo do link que a clínica
  // compartilha). Checado ANTES de `#cadastro` abaixo — senão o
  // `startsWith` genérico capturaria essa rota também, por engano.
  if (hash.startsWith("#cadastro-secretaria")) {
    if (!authChecked) return null;
    if (user) return renderRoleArea(user);
    const queryPart = hash.split("?")[1];
    const codeParam = queryPart
      ? new URLSearchParams(queryPart).get("code")
      : null;
    return (
      <SecretarySignupForm
        initialCode={codeParam}
        onSignedUp={(u) => {
          setUser(u);
          window.location.hash = "#admin";
        }}
      />
    );
  }

  // Cadastro público de psicólogo (Fase 15) — `#cadastro` ou
  // `#cadastro?plan=professional` (vindo da página pública de planos).
  // Quem já tem conta e chega aqui de qualquer jeito (link antigo, aba
  // duplicada) só é levado direto pra própria área, sem ver o formulário.
  if (hash.startsWith("#cadastro")) {
    if (!authChecked) return null;
    if (user) return renderRoleArea(user);
    const queryPart = hash.split("?")[1];
    const planParam = queryPart
      ? new URLSearchParams(queryPart).get("plan")
      : null;
    const initialPlan: PlanTier | null =
      planParam === "free" ||
      planParam === "professional" ||
      planParam === "clinic"
        ? planParam
        : null;
    return (
      <SignupForm
        initialPlan={initialPlan}
        onSignedUp={(u) => {
          setUser(u);
          // Plano gratuito não passa por checkout — não há nada pra
          // "confirmar". Planos pagos passam pela tela de checkout (Fase
          // 16) antes de cair no painel.
          window.location.hash =
            initialPlan && initialPlan !== "free"
              ? `#checkout?plan=${initialPlan}`
              : "#admin";
        }}
      />
    );
  }

  // Checkout (Fase 16) — só acessível logado (é o passo seguinte ao
  // cadastro, ou alguém trocando de plano manualmente digitando a URL).
  if (hash.startsWith("#checkout")) {
    if (!authChecked) return null;
    if (!user) return <LoginForm onLogin={setUser} />;
    const queryPart = hash.split("?")[1];
    const planParam = queryPart
      ? new URLSearchParams(queryPart).get("plan")
      : null;
    const checkoutPlan: PlanTier =
      planParam === "professional" || planParam === "clinic"
        ? planParam
        : "professional";
    return (
      <CheckoutScreen
        plan={checkoutPlan}
        user={user}
        onDone={() => {
          window.location.hash = "#admin";
        }}
      />
    );
  }

  if (hash === "#planos") return <PublicPlansPage />;

  // Páginas institucionais (Fase 14) — públicas, não dependem de sessão.
  if (hash === "#sobre") return <AboutPage />;
  if (hash === "#contato") return <ContactPage />;
  if (hash === "#termos") return <TermsPage />;
  if (hash === "#privacidade") return <PrivacyPage />;

  return <Landing />;
}
