import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowRight,
  MapPin,
  Globe,
  ChevronDown,
  Menu,
  X,
  Star,
  Quote,
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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    setSubmitting(true);
    try {
      await apiFetch("/signup/psychologist", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: name.trim(),
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

  const confirm = async () => {
    setApplying(true);
    setError(false);
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
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center text-sm font-semibold text-primary">
                {p.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span className="font-medium text-sm px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                    {p.full_name}
                  </span>
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
      .select("id, amount, status, paid_at, created_at, patients(full_name)")
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

  const currency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: "BRL",
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
    <div className="space-y-3">
      {actionError && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {t("secretary.actionError")}
        </p>
      )}
      {payments.map((p) => (
        <div
          key={p.id}
          className="bg-card border border-border rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center text-base font-semibold text-primary">
            {(p.patients?.full_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                {p.patients?.full_name ?? "—"}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusStyles[p.status] ?? "bg-secondary text-muted-foreground"}`}
              >
                {t(`finance.status.${p.status}`)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currency(Number(p.amount))} ·{" "}
              {p.paid_at ? dateLabel(p.paid_at) : dateLabel(p.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {p.status !== "paid" ? (
              <button
                onClick={() => setStatus(p.id, "paid")}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                {t("finance.markPaid")}
              </button>
            ) : (
              <button
                onClick={() => setStatus(p.id, "pending")}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors text-muted-foreground"
              >
                {t("secretary.markPending")}
              </button>
            )}
          </div>
        </div>
      ))}
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
    "agenda" | "patients" | "finance" | "settings"
  >("agenda");
  // Fase 28 — menu lateral fixo (em vez das abas no topo) nas telas
  // internas, no mesmo espírito do mockup de referência: sidebar com a
  // marca no topo, itens de navegação empilhados, e o menu do usuário no
  // rodapé. Em telas pequenas a sidebar vira uma gaveta (drawer) acionada
  // pelo botão de menu na barra superior — não existe versão mobile no
  // mockup de referência pros painéis internos, então segui o padrão mais
  // comum pra esse tipo de layout.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems: {
    key: "agenda" | "patients" | "finance" | "settings";
    icon: React.ReactNode;
    label: string;
  }[] = [
    { key: "agenda", icon: <Calendar size={14} />, label: t("dashboard.navAgenda") },
    { key: "patients", icon: <Users size={14} />, label: t("dashboard.navPatients") },
    { key: "finance", icon: <Wallet size={14} />, label: t("dashboard.navFinance") },
    { key: "settings", icon: <Settings size={14} />, label: t("dashboard.navSettings") },
  ];

  const navItemClass = (active: boolean) =>
    `flex items-center gap-2.5 pl-2.5 pr-3 py-2.5 rounded-r-lg text-xs font-semibold uppercase tracking-wider border-l-2 transition-colors ${
      active
        ? "bg-primary-foreground/10 text-primary-foreground border-accent"
        : "text-primary-foreground/70 border-transparent hover:bg-primary-foreground/5 hover:text-primary-foreground"
    }`;

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
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-primary text-primary-foreground h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-2 px-6 h-16 shrink-0">
          <BrandMark size={16} light />
          <span
            className="font-bold text-sm"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("secretary.navTitle")}
          </span>
        </div>
        {sidebarNav()}
        <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Globe size={14} /> {t("admin.viewSite")}
          </button>
          <div className="px-2.5">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              onOpenSettings={() => setView("settings")}
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-primary text-primary-foreground h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1">
          <Menu size={20} />
        </button>
        <BrandMark size={16} light />
        <span
          className="font-bold text-sm"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("secretary.navTitle")}
        </span>
        <div className="ml-auto">
          <UserMenu
            user={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
            onOpenSettings={() => setView("settings")}
          />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-primary text-primary-foreground h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
              <div className="flex items-center gap-2">
                <BrandMark size={16} light />
                <span
                  className="font-bold text-sm"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("secretary.navTitle")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1">
                <X size={18} />
              </button>
            </div>
            {sidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
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
          {view === "finance" && <SecretaryFinanceView user={user} />}
          {view === "settings" && <AccountSecurityView onLogout={onLogout} />}
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
    "overview" | "patients" | "agenda" | "records" | "finance" | "settings"
  >("overview");
  // Fase 28 — sidebar fixa nas telas internas em vez das abas no topo (ver
  // nota equivalente em `SecretaryDashboard`).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
            .select("id, approach, approved")
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

  const currency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: "BRL",
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


  const kpiCard = (
    icon: React.ReactNode,
    label: string,
    value: React.ReactNode,
  ) => (
    <div className="bg-background flex flex-col items-center text-center gap-1.5 py-6 px-3">
      <span className="text-accent">{icon}</span>
      <p
        className="text-2xl font-light text-foreground"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        {value}
      </p>
      <p className="text-[0.65rem] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
    </div>
  );

  const proNavItems: {
    key: "overview" | "agenda" | "patients" | "records" | "finance" | "settings";
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
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
      key: "finance",
      icon: <Wallet size={14} />,
      label: t("dashboard.navFinance"),
      onClick: () => setView("finance"),
    },
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
    `flex items-center gap-2.5 pl-2.5 pr-3 py-2.5 rounded-r-lg text-xs font-semibold uppercase tracking-wider border-l-2 transition-colors ${
      active
        ? "bg-primary-foreground/10 text-primary-foreground border-accent"
        : "text-primary-foreground/70 border-transparent hover:bg-primary-foreground/5 hover:text-primary-foreground"
    }`;

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
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-primary text-primary-foreground h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-2 px-6 h-16 shrink-0">
          <BrandMark size={16} light />
          <span
            className="font-bold text-sm"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("dashboard.title")}
          </span>
        </div>
        {proSidebarNav()}
        <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
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
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-primary text-primary-foreground h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1">
          <Menu size={20} />
        </button>
        <BrandMark size={16} light />
        <span
          className="font-bold text-sm"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("dashboard.title")}
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
          />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-primary text-primary-foreground h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
              <div className="flex items-center gap-2">
                <BrandMark size={16} light />
                <span
                  className="font-bold text-sm"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("dashboard.title")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1">
                <X size={18} />
              </button>
            </div>
            {proSidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
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
                  : view === "finance"
                    ? t("finance.title")
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
                  : view === "finance"
                    ? t("finance.subtitle")
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
        ) : view === "finance" ? (
          <FinanceView user={user} />
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
            {/* KPI cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mb-8">
              {kpiCard(
                <Users size={16} />,
                t("dashboard.kpi.activePatients"),
                stats.activePatients,
              )}
              {kpiCard(
                <Calendar size={16} />,
                t("dashboard.kpi.sessionsThisMonth"),
                stats.sessionsThisMonth,
              )}
              {kpiCard(
                <AlertTriangle size={16} />,
                t("dashboard.kpi.noShowRate"),
                stats.noShowRate === null
                  ? "—"
                  : `${Math.round(stats.noShowRate * 100)}%`,
              )}
              {kpiCard(
                <Wallet size={16} />,
                t("dashboard.kpi.revenueThisMonth"),
                currency(stats.revenueThisMonth),
              )}
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
        "id, full_name, email, phone, notes, tags, status, created_at, patient_user_id, professional_id",
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
        <div className="space-y-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                setView("detail");
              }}
              className="w-full text-left bg-card border border-border rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center text-lg font-semibold text-primary">
                {p.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
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
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {[p.email, p.phone].filter(Boolean).join(" · ") || "—"}
                </p>
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
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
      } else {
        setRecordedApptIds(new Set());
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
            <div className="flex flex-wrap gap-2 mt-5">
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
  patients?: { full_name: string } | null;
};

type AppointmentOption = { id: string; starts_at: string };

function RecordForm({
  initial,
  patients,
  onSave,
  onCancel,
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
}) {
  const { t, i18n } = useTranslation();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState<"summarize" | "organize" | null>(
    null,
  );
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            disabled={!!initial}
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
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
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
          disabled={!patientId}
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
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
        />

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
          {t("records.cancel")}
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
            ? t("records.fields.saveEdit")
            : t("records.fields.saveNew")}
        </button>
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
  const [aiLoading, setAiLoading] = useState<"summarize" | "organize" | null>(
    null,
  );
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: fetchErr } = await supabase
        .from("clinical_records")
        .select("id, private_notes, shared_notes")
        .eq("appointment_id", appointment.id)
        .maybeSingle();
      if (!cancelled) {
        if (fetchErr) {
          // `.maybeSingle()` também retorna erro se mais de uma linha bater
          // com o filtro (não devia acontecer — uma consulta só tem um
          // prontuário — mas sem checar isso o modal ficava carregando pra
          // sempre e, pior, deixava criar um terceiro registro por cima).
          console.error("Falha ao carregar prontuário da sessão:", fetchErr);
          setLoadError(true);
        } else if (data) {
          setRecordId(data.id as string);
          setPrivateNotes((data.private_notes as string | null) ?? "");
          setSharedNotes((data.shared_notes as string | null) ?? "");
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointment.id]);

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
      const sessionDate = toDateInputValue(new Date(appointment.starts_at));
      if (recordId) {
        const { error: err } = await supabase
          .from("clinical_records")
          .update({
            private_notes: privateNotes.trim() || null,
            shared_notes: sharedNotes.trim() || null,
          })
          .eq("id", recordId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("clinical_records").insert({
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          professional_id: professionalId,
          session_date: sessionDate,
          private_notes: privateNotes.trim() || null,
          shared_notes: sharedNotes.trim() || null,
        });
        if (err) throw err;
      }
      onSaved();
    } catch (err: any) {
      // Código 23505 = unique_violation — já existe um prontuário pra essa
      // consulta (a checagem em `useEffect` já devia ter carregado ele, mas
      // se outra aba/pessoa criou um entre o load e o save, o índice único
      // do banco barra a duplicata em vez de deixar passar).
      setError(
        err?.code === "23505"
          ? t("sessionRecord.duplicateError")
          : t("records.fields.genericSaveError"),
      );
    } finally {
      setSaving(false);
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
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
              />

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
                onClick={onClose}
                className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                {t("records.cancel")}
              </button>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordsView({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [selected, setSelected] = useState<ClinicalRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState("");
  const [deleteError, setDeleteError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [recordsRes, patientsRes] = await Promise.all([
      supabase
        .from("clinical_records")
        .select(
          "id, patient_id, appointment_id, session_date, private_notes, shared_notes, created_at, patients(full_name)",
        )
        .eq("professional_id", user.id)
        .order("session_date", { ascending: false }),
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("professional_id", user.id)
        .order("full_name", { ascending: true }),
    ]);
    if (recordsRes.error) {
      setError(true);
    } else {
      setRecords((recordsRes.data as any as ClinicalRecord[]) ?? []);
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
    if (view === "edit" && selected) {
      const { error: err } = await supabase
        .from("clinical_records")
        .update({
          appointment_id: data.appointment_id,
          session_date: data.session_date,
          private_notes: data.private_notes,
          shared_notes: data.shared_notes,
        })
        .eq("id", selected.id);
      if (err) throw err;
    } else {
      const { error: err } = await supabase.from("clinical_records").insert({
        ...data,
        professional_id: user.id,
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
      .from("clinical_records")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("Falha ao excluir prontuário:", err);
      setDeleteError(true);
      return;
    }
    setDeleteId(null);
    await load();
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
            <div
              key={r.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center text-lg font-semibold text-primary">
                {(r.patients?.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                    {r.patients?.full_name ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateLabel(r.session_date)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
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
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSelected(r);
                    setView("edit");
                  }}
                  className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="p-2 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors text-muted-foreground hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
    </div>
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [paymentsRes, patientsRes, professionalRes] = await Promise.all([
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
        .select("session_price")
        .eq("id", user.id)
        .maybeSingle(),
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
    setLoading(false);
  }, [user.id]);

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
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(value);

  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));

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
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-2xl font-semibold text-foreground">
            {currency(receivedThisMonth)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("finance.summary.receivedThisMonth")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-2xl font-semibold text-foreground">
            {currency(totalPending)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("finance.summary.pending")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-2xl font-semibold text-foreground">
            {currency(totalOverdue)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("finance.summary.overdue")}
          </p>
        </div>
      </div>

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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm px-4 py-2.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
          >
            <option value="">{t("finance.statusFilterAll")}</option>
            <option value="pending">{t("finance.status.pending")}</option>
            <option value="paid">{t("finance.status.paid")}</option>
            <option value="overdue">{t("finance.status.overdue")}</option>
          </select>
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
        <div className="space-y-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center text-lg font-semibold text-primary">
                {(p.patients?.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                    {p.patients?.full_name ?? "—"}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusStyles[p.status] ?? "bg-secondary text-muted-foreground"}`}
                  >
                    {t(`finance.status.${p.status}`)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {currency(Number(p.amount))} ·{" "}
                  {p.paid_at
                    ? dateLabel(p.paid_at)
                    : dateLabel(p.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.status !== "paid" && (
                  <button
                    onClick={() => markPaid(p.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    {t("finance.markPaid")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelected(p);
                    setView("edit");
                  }}
                  className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(p.id)}
                  className="p-2 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors text-muted-foreground hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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

  const isBusinessPlan = plan === "clinic";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("clinic_id", clinicId)
      .eq("role", "psychologist");
    setProfessionals((data as ClinicProfessionalRow[]) ?? []);
    setLoading(false);
  }, [clinicId]);

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
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 bg-secondary rounded-lg px-4 py-3"
                >
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
        .select("status, started_at, current_period_end, cancel_at_period_end")
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

  const handleSwitch = async (plan: PlanTier) => {
    if (!clinic || plan === clinic.plan) return;
    setSwitching(plan);
    setSwitchError(false);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ plan })
        .eq("id", clinic.id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error("Falha ao trocar de plano:", err);
      setSwitchError(true);
    } finally {
      setSwitching(null);
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

        {clinic.plan !== "free" && (
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
      <p className="text-xs text-muted-foreground">{t("plans.billingNote")}</p>

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
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveResult, setSaveResult] = useState<"success" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("professionals")
      .select(
        "id, title, location, flag, specialties, approach, sessions_info, photo_url, years, rating, approved, crp, session_price, created_at, profiles(full_name, email, phone)",
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

  return (
    <div className="max-w-2xl">
      {!profile.approved && (
        <div className="mb-6 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          {t("professionalProfile.pendingApproval")}
        </div>
      )}
      {saveResult === "success" && (
        <div className="mb-6 text-sm bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
          {t("professionalProfile.saveSuccess")}
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl p-8">
        <ProfileForm
          initial={profile}
          onSave={handleSave}
          onCancel={() => {}}
          hideCancel
        />
      </div>
    </div>
  );
}

// ─── Configurações (Fase 13) ────────────────────────────────────────────────────
// "Segurança" e "Preferências" são genéricas — funcionam do mesmo jeito pra
// qualquer papel logado (profissional, paciente, e no futuro admin), então
// vivem como componentes únicos reaproveitados em vez de uma cópia por
// papel (evita a duplicação que o pedido de unificação pediu pra evitar).

function AccountSecurityView({ onLogout }: { onLogout: () => void }) {
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
    </div>
  );
}

function PreferencesView() {
  const { t } = useTranslation();
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
      <div className="bg-card border border-border rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-foreground">
          {t("settings.preferences.notificationsLabel")}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {t("settings.preferences.notificationsComingSoon")}
        </p>
      </div>
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
        {tab === "preferences" && <PreferencesView />}
        {tab === "security" && <AccountSecurityView onLogout={onLogout} />}
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
          t("profileForm.sessionPriceLabel"),
          "session_price",
          "number",
          t("profileForm.sessionPricePlaceholder"),
          false,
          "",
          0,
        )}
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
      ]);

      if (cancelled) return;

      // Antes nenhuma dessas 8 consultas era checada — uma falha (RLS, rede)
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

  const cards = [
    { label: t("admin.overview.clinics"), value: stats.clinics, icon: Building2 },
    {
      label: t("admin.overview.professionalsApproved"),
      value: stats.professionalsApproved,
      icon: Check,
    },
    {
      label: t("admin.overview.professionalsPending"),
      value: stats.professionalsPending,
      icon: Clock,
    },
    {
      label: t("admin.overview.activePatients"),
      value: stats.activePatients,
      icon: Users,
    },
    {
      label: t("admin.overview.secretaries"),
      value: stats.secretaries,
      icon: UserCircle,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-background flex flex-col items-center text-center gap-1.5 py-6 px-3"
          >
            <card.icon size={16} className="text-accent" />
            <p
              className="text-2xl font-light text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {card.value}
            </p>
            <p className="text-[0.65rem] uppercase tracking-wider font-semibold text-muted-foreground">
              {card.label}
            </p>
          </div>
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
                      <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                        {u.full_name || t("userMenu.noName")}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {t(`roles.${u.role}`)}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {t("admin.users.you")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      {u.email}
                    </p>
                    {u.clinic_id && clinicNames[u.clinic_id] && (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md bg-accent/10 text-accent mt-1.5">
                        {clinicNames[u.clinic_id]}
                      </span>
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
              <span
                className="inline-block text-lg font-light px-3 py-1 rounded-lg bg-accent/10 text-accent"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {c.name || t("admin.clinics.unnamed")}
              </span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 pt-1.5">
                {t(`plans.${c.plan}.name`)}
              </span>
            </div>

            <div className="text-sm px-5 py-3 border-t border-border">
              <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t("admin.clinics.ownerLabel")}
              </p>
              {owner ? (
                <p className="text-foreground">
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                    {owner.full_name || t("userMenu.noName")}
                  </span>{" "}
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
                <div className="flex flex-col gap-1.5">
                  {otherProfessionals.map((p) => (
                    <p key={p.id} className="text-foreground">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {p.full_name || t("userMenu.noName")}
                      </span>{" "}
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
                <div className="flex flex-col gap-1.5">
                  {secretaries.map((s) => (
                    <p key={s.id} className="text-foreground">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {s.full_name || t("userMenu.noName")}
                      </span>{" "}
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
  const { t } = useTranslation();
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [patientsRes, professionalsRes] = await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name, email, professional_id, clinic_id, status")
        .order("full_name", { ascending: true }),
      supabase
        .from("professionals")
        .select("id, clinic_id, profiles(full_name)")
        .eq("approved", true),
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
    setLoading(false);
  }, []);

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
        <div className="space-y-3">
          {filtered.map((p) => {
            const current = professionalById.get(p.professional_id);
            return (
              <div
                key={p.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="px-5 py-4">
                  <span
                    className="inline-block text-lg font-light px-3 py-1 rounded-lg bg-primary/10 text-primary"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {p.full_name}
                  </span>
                  {p.email && (
                    <p className="text-sm text-muted-foreground mt-1.5">
                      {p.email}
                    </p>
                  )}
                </div>

                <div className="text-sm px-5 py-3 border-t border-border">
                  <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t("admin.patients.currentProfessional")}
                  </p>
                  <p className="text-foreground">
                    {current?.name || t("admin.patients.noProfessional")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {t("admin.patients.reassignLabel")}
                  </span>
                  <select
                    value={pick[p.id] ?? p.professional_id}
                    onChange={(e) =>
                      setPick((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors max-w-[220px]"
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
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-foreground text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {busyId === p.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <LinkIcon size={12} />
                    )}
                    {t("admin.patients.reassignButton")}
                  </button>
                </div>
              </div>
            );
          })}
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
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {t("admin.finance.totalLabel")}
        </p>
        <p
          className="text-3xl font-light text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {currency(totalCents)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("admin.finance.disclaimer")}
        </p>
      </div>

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
  const [toggleError, setToggleError] = useState(false);

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
          "id, title, location, flag, specialties, approach, sessions_info, photo_url, years, rating, approved, crp, session_price, created_at, profiles(full_name, email, phone)",
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

  const adminNavItems: { key: AdminTab; icon: React.ReactNode; label: string }[] =
    [
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
    `flex items-center gap-2.5 pl-2.5 pr-3 py-2.5 rounded-r-lg text-xs font-semibold uppercase tracking-wider border-l-2 transition-colors ${
      active
        ? "bg-primary-foreground/10 text-primary-foreground border-accent"
        : "text-primary-foreground/70 border-transparent hover:bg-primary-foreground/5 hover:text-primary-foreground"
    }`;

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
      {/* Sidebar — desktop. Fica sempre visível, inclusive durante a edição
          de um perfil (diferente das abas no topo de antes, que sumiam
          nesse momento — uma sidebar fixa faz mais sentido continuar ali). */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-primary text-primary-foreground h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-2 px-6 h-16 shrink-0">
          <BrandMark size={16} light />
          <span
            className="font-bold text-sm"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("admin.navTitle")}
          </span>
        </div>
        <p className="px-6 text-[0.65rem] text-primary-foreground/60">
          {approved} {t("admin.published")} ·{" "}
          {psychologists.length - approved} {t("admin.pending")}
        </p>
        {adminSidebarNav()}
        <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Globe size={14} /> {t("admin.viewSite")}
          </button>
          <div className="px-2.5">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-primary text-primary-foreground h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1">
          <Menu size={20} />
        </button>
        <BrandMark size={16} light />
        <span
          className="font-bold text-sm"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("admin.navTitle")}
        </span>
        <div className="ml-auto">
          <UserMenu user={user} onLogout={onLogout} onSwitchRole={onSwitchRole} />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-primary text-primary-foreground h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
              <div className="flex items-center gap-2">
                <BrandMark size={16} light />
                <span
                  className="font-bold text-sm"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("admin.navTitle")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1">
                <X size={18} />
              </button>
            </div>
            <p className="px-6 text-[0.65rem] text-primary-foreground/60">
              {approved} {t("admin.published")} ·{" "}
              {psychologists.length - approved} {t("admin.pending")}
            </p>
            {adminSidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
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
        {tab === "finance" && <AdminFinanceView />}
        {tab === "settings" && <AccountSecurityView onLogout={onLogout} />}

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
                ) : (
                  <div className="space-y-3">
                    {psychologists.map((p) => (
                      <div
                        key={p.id}
                        className={`bg-card border rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-all ${p.approved ? "border-border" : "border-amber-200 bg-amber-50/30"}`}
                      >
                        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {p.flag}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                              {p.name}
                            </span>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${p.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {p.approved
                                ? t("admin.statusPublished")
                                : t("admin.statusPending")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {p.flag} {p.location} · {p.years}{" "}
                            {t("admin.yearsAbbrev")} · {p.sessions_info}
                          </p>
                          {p.email && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {p.email}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.specialties.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground"
                              >
                                {s}
                              </span>
                            ))}
                            {p.specialties.length > 4 && (
                              <span className="text-xs text-muted-foreground">
                                +{p.specialties.length - 4}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleApproval(p)}
                            title={
                              p.approved
                                ? t("admin.unpublishTooltip")
                                : t("admin.publishTooltip")
                            }
                            className={`p-2 rounded-lg border transition-colors text-sm flex items-center gap-1.5 font-medium ${p.approved ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                          >
                            {p.approved ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}
                            <span className="hidden sm:inline">
                              {p.approved
                                ? t("admin.statusPublished")
                                : t("admin.publishTooltip")}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setEditing(p);
                              setView("edit");
                            }}
                            title={t("admin.editProfileTooltip")}
                            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
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
type TestimonialItem = {
  name: string;
  location: string;
  flag: string;
  transition: string;
  text: string;
  rating: number;
};
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
  rating: number;
  crp: string;
  session_price: number | null;
};

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

  const transitions = t("transitions.items", {
    returnObjects: true,
  }) as TransitionItem[];
  const steps = t("howItWorks.steps", { returnObjects: true }) as StepItem[];
  const testimonials = t("testimonialsSection.items", {
    returnObjects: true,
  }) as TestimonialItem[];
  const quizQuestions = t("quiz.questions", {
    returnObjects: true,
  }) as QuizQuestionItem[];
  const faqItems = t("faqSection.items", { returnObjects: true }) as FaqItem[];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("public_professionals")
        .select("*")
        .order("rating", { ascending: false });
      if (!cancelled) {
        if (!error) setPsychologists((data ?? []) as PublicProfessional[]);
        setLoadingPsychs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getPhotoSrc = (p: PublicProfessional) => {
    if (p.photo_url) return p.photo_url;
    return `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=400&fit=crop&auto=format`;
  };

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
              href="#comecar"
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
          <div className="mt-14 flex items-center gap-8 text-sm text-muted-foreground">
            <div className="flex flex-col">
              <span
                className="text-2xl font-light text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                840+
              </span>
              <span>{t("hero.statPatients")}</span>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="flex flex-col">
              <span
                className="text-2xl font-light text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                🇧🇷 🇪🇸
              </span>
              <span>{t("hero.statCountries")}</span>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="flex flex-col">
              <span
                className="text-2xl font-light text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                4.9
              </span>
              <span>{t("hero.statRating")}</span>
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
            <blockquote className="bg-background/90 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
              <Quote size={20} className="text-accent mb-3" />
              <p className="text-sm leading-relaxed text-foreground font-medium mb-4">
                "{t("hero.quoteText")}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {t("hero.quoteAuthor")}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={10} /> {t("hero.quoteLocation")}
                  </p>
                </div>
              </div>
            </blockquote>
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
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {psychologists.map((p) => (
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
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {p.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {p.years} {t("psychologistsSection.yearsExperience")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <Star size={12} className="text-accent fill-accent" />{" "}
                        {Number(p.rating).toFixed(1)}
                      </div>
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
                      <a
                        href="#comecar"
                        className="text-xs font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1"
                      >
                        {t("psychologistsSection.viewProfile")}{" "}
                        <ArrowRight size={12} />
                      </a>
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
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="bg-card border border-border rounded-2xl p-8 flex flex-col"
              >
                <Quote size={24} className="text-accent mb-5" />
                <p className="text-foreground leading-relaxed mb-8 flex-1 text-[15px]">
                  "{item.text}"
                </p>
                <div className="pt-6 border-t border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {item.flag} {item.location}
                      </p>
                    </div>
                    <span className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full border border-border">
                      {item.transition}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mt-3">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className="text-accent fill-accent"
                      />
                    ))}
                  </div>
                </div>
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
            <p>{t("footer.copyright")}</p>
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
};

type OwnAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
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
        {tab === "security" && <AccountSecurityView onLogout={onLogout} />}
      </div>
    </div>
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const profileRes = await supabase
      .from("patient_own_profile")
      .select("id, full_name, email, phone, status")
      .maybeSingle();

    if (profileRes.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const ownProfile = profileRes.data as OwnProfile | null;
    setProfile(ownProfile);

    if (ownProfile) {
      const [apptRes, recordsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, starts_at, ends_at, status")
          .eq("patient_id", ownProfile.id)
          .order("starts_at", { ascending: true }),
        supabase
          .from("patient_visible_records")
          .select("id, session_date, shared_notes, created_at")
          .not("shared_notes", "is", null)
          .order("session_date", { ascending: false }),
      ]);
      setAllAppointments((apptRes.data as OwnAppointment[]) ?? []);
      setRecords((recordsRes.data as SharedRecord[]) ?? []);
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

  const kpiCard = (
    icon: React.ReactNode,
    label: string,
    value: React.ReactNode,
  ) => (
    <div className="bg-background flex flex-col items-center text-center gap-1.5 py-6 px-3">
      <span className="text-accent">{icon}</span>
      <p
        className="text-2xl font-light text-foreground"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        {value}
      </p>
      <p className="text-[0.65rem] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
    </div>
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
    `flex items-center gap-2.5 pl-2.5 pr-3 py-2.5 rounded-r-lg text-xs font-semibold uppercase tracking-wider border-l-2 transition-colors ${
      active
        ? "bg-primary-foreground/10 text-primary-foreground border-accent"
        : "text-primary-foreground/70 border-transparent hover:bg-primary-foreground/5 hover:text-primary-foreground"
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
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-primary text-primary-foreground h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-2 px-6 h-16 shrink-0">
          <BrandMark size={16} light />
          <span
            className="font-bold text-sm"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {t("patientArea.title")}
          </span>
        </div>
        {patientSidebarNav()}
        <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Globe size={14} /> {t("admin.viewSite")}
          </button>
          <div className="px-2.5">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onSwitchRole={onSwitchRole}
              onOpenSettings={() => setView("settings")}
              openUp
            />
          </div>
        </div>
      </aside>

      {/* Barra superior + gaveta — mobile */}
      <header className="md:hidden bg-primary text-primary-foreground h-14 flex items-center px-4 gap-3 sticky top-0 z-40">
        <button onClick={() => setMobileNavOpen(true)} className="p-1">
          <Menu size={20} />
        </button>
        <BrandMark size={16} light />
        <span
          className="font-bold text-sm"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {t("patientArea.title")}
        </span>
        <div className="ml-auto">
          <UserMenu
            user={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
            onOpenSettings={() => setView("settings")}
          />
        </div>
      </header>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-primary text-primary-foreground h-full flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
              <div className="flex items-center gap-2">
                <BrandMark size={16} light />
                <span
                  className="font-bold text-sm"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {t("patientArea.title")}
                </span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1">
                <X size={18} />
              </button>
            </div>
            {patientSidebarNav(() => setMobileNavOpen(false))}
            <div className="px-3 py-4 border-t border-primary-foreground/10 flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-2.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
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
                da visão geral do profissional (mesma grade com hairline
                dividers e o mesmo gráfico de barras por mês). */}
            <div className="grid sm:grid-cols-3 gap-px bg-border border border-border">
              {kpiCard(
                <Calendar size={16} />,
                t("patientArea.kpi.upcoming"),
                appointments.length,
              )}
              {kpiCard(
                <Check size={16} />,
                t("patientArea.kpi.completed"),
                completedCount,
              )}
              {kpiCard(
                <FileText size={16} />,
                t("patientArea.kpi.sharedNotes"),
                records.length,
              )}
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
                        <div className="flex items-center gap-2">
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
          {t("footer.copyright")}
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
          {t("footer.copyright")}
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
