import { useState, useEffect, useCallback } from "react";
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
  ToggleLeft,
  ToggleRight,
  Upload,
} from "lucide-react";

const API =
  "https://iicsmwkqjuasbsgehrce.supabase.co/functions/v1/make-server-a65fd448";
const ADMIN_PIN = "travessia2025";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_mcwLWzbq2k4ESakccGLUFw_4QyLhcTt";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Psychologist {
  id: string;
  name: string;
  title: string;
  location: string;
  flag: string;
  specialties: string[];
  approach: string;
  sessions: string;
  photo_url: string;
  years: number;
  rating: number;
  approved: boolean;
  crp: string;
  email: string;
  created_at: string;
}

const EMPTY_FORM: Omit<Psychologist, "id" | "created_at" | "approved"> = {
  name: "",
  title: "Psicólogo(a)",
  location: "",
  flag: "🇧🇷",
  specialties: [],
  approach: "",
  sessions: "Online · Português",
  photo_url: "",
  years: 1,
  rating: 5.0,
  crp: "",
  email: "",
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      ...opts?.headers,
    },
  });

  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ─── Static content ───────────────────────────────────────────────────────────

const transitions = [
  {
    id: "exterior",
    emoji: "✈️",
    title: "Morar no Exterior",
    description:
      "A saudade do Brasil, o choque cultural, construir uma vida nova longe de tudo que conhecia.",
    countries: ["🇪🇸 Espanha", "🇵🇹 Portugal", "🇺🇸 EUA"],
  },
  {
    id: "carreira",
    emoji: "🔄",
    title: "Mudança de Carreira",
    description:
      "Deixar uma identidade profissional para trás. Quem sou eu quando não sou mais aquilo que fazia?",
    countries: [],
  },
  {
    id: "relacionamento",
    emoji: "💔",
    title: "Fim de Relacionamento",
    description:
      "Separação, divórcio, luto afetivo. Reconstruir-se depois que um projeto de vida termina.",
    countries: [],
  },
  {
    id: "luto",
    emoji: "🕊️",
    title: "Luto e Perda",
    description:
      "A morte de alguém amado, ou o fim de algo que você pensava que duraria para sempre.",
    countries: [],
  },
  {
    id: "identidade",
    emoji: "🌀",
    title: "Crise de Identidade",
    description:
      "A sensação de não saber mais quem você é, o que quer, ou onde pertence.",
    countries: [],
  },
  {
    id: "maternidade",
    emoji: "🌱",
    title: "Maternidade e Paternidade",
    description:
      "A chegada de um filho transforma tudo. A identidade, os sonhos, o casal.",
    countries: [],
  },
];

const steps = [
  {
    number: "01",
    title: "Conte sua história",
    description:
      "Um questionário cuidadoso — não genérico — para entender seu momento de vida, seus valores e o que você está atravessando agora.",
  },
  {
    number: "02",
    title: "Receba seu match",
    description:
      "Nossa curadoria combina você com psicólogos selecionados por especialidade, experiência com sua situação e estilo terapêutico.",
  },
  {
    number: "03",
    title: "Sessão experimental",
    description:
      "Uma primeira sessão para sentir a conexão. Sem compromisso longo. Você decide se quer continuar.",
  },
  {
    number: "04",
    title: "Seu processo começa",
    description:
      "Sessões semanais online, no seu horário, no seu idioma. Com acompanhamento da nossa equipe durante toda a jornada.",
  },
];

const testimonials = [
  {
    name: "Mariana Costa",
    location: "Barcelona há 2 anos",
    flag: "🇪🇸",
    transition: "Expatriada",
    text: "Cheguei na Espanha com uma mala e a sensação de que havia perdido quem eu era. A psicóloga foi a primeira pessoa que entendeu de verdade o que é ser imigrante brasileira. Não precisei explicar o que é saudade.",
    rating: 5,
  },
  {
    name: "Thiago Lemos",
    location: "São Paulo, Brasil",
    flag: "🇧🇷",
    transition: "Mudança de Carreira",
    text: "Larguei a advocacia aos 38 anos. Todo mundo ao redor achava que eu estava em crise. O processo me ajudou a perceber que eu estava, na verdade, acordando.",
    rating: 5,
  },
  {
    name: "Renata Figueiredo",
    location: "Madrid há 4 anos",
    flag: "🇪🇸",
    transition: "Maternidade no Exterior",
    text: "Ser mãe longe da família é um desafio que não tem manual. A psicóloga me deu ferramentas e, principalmente, me fez sentir menos sozinha nessa jornada.",
    rating: 5,
  },
];

const faqItems = [
  {
    q: "Como funciona o processo de matching?",
    a: "Você preenche nosso questionário detalhado sobre sua história, momento de vida e preferências terapêuticas. Nossa equipe — formada por psicólogos — analisa seu perfil e sugere 2 a 3 profissionais compatíveis. Não é um algoritmo: é uma curadoria humana.",
  },
  {
    q: "Os psicólogos atendem em português?",
    a: "Sim. Todos os profissionais da nossa plataforma atendem em português brasileiro. Alguns também atendem em espanhol, inglês ou outras línguas.",
  },
  {
    q: "Quanto custa?",
    a: "O cadastro e o matching são gratuitos. O valor das sessões varia por profissional, entre R$150 e R$350 (ou equivalente em euros). Não cobramos taxa de plataforma sobre as sessões.",
  },
  {
    q: "E se o match não funcionar?",
    a: "Faz parte. Se a conexão com o profissional indicado não fluir na primeira sessão, nossa equipe revisa seu perfil e sugere novas opções sem custo adicional.",
  },
];

const quizQuestions = [
  {
    question: "Onde você está agora?",
    options: [
      "No Brasil",
      "Na Espanha",
      "Em outro país da Europa",
      "Em outro lugar do mundo",
    ],
  },
  {
    question: "O que melhor descreve seu momento?",
    options: [
      "Passei por uma mudança grande recentemente",
      "Estou no meio de uma transição",
      "Sinto que preciso de mudança, mas não sei por onde começar",
      "Estou bem, mas quero me conhecer melhor",
    ],
  },
  {
    question: "O que mais ressoa com você agora?",
    options: [
      "Sinto que perdi minha identidade",
      "Estou carregando muito peso sozinho/a",
      "Não me reconheço mais nas minhas escolhas",
      "Preciso de apoio para atravessar uma fase difícil",
    ],
  },
];

const FLAGS = ["🇧🇷", "🇪🇸", "🇵🇹", "🇺🇸", "🇩🇪", "🇫🇷", "🇬🇧", "🇮🇹"];
const SPECIALTY_SUGGESTIONS = [
  "Expatriados",
  "Luto Cultural",
  "Ansiedade",
  "Depressão",
  "Identidade",
  "Relacionamentos",
  "Carreira",
  "Saudade",
  "Maternidade",
  "Divórcio",
  "Trauma",
  "Autoestima",
];

// ─── Admin: Login ─────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onLogin();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6">
      <div className="bg-background rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={20} className="text-accent" />
          <span
            className="font-bold text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Travessia · Admin
          </span>
        </div>
        <h2
          className="text-2xl font-light mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Área restrita
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          Digite a senha de acesso para continuar.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="Senha de acesso"
            autoFocus
            className={`w-full bg-secondary border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${error ? "border-red-400 text-red-600" : "border-border focus:border-primary"}`}
          />
          {error && (
            <p className="text-red-500 text-xs">
              Senha incorreta. Tente novamente.
            </p>
          )}
          <button
            type="submit"
            className="bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm"
          >
            Entrar
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Senha padrão:{" "}
          <code className="bg-secondary px-1.5 py-0.5 rounded">
            travessia2025
          </code>
        </p>
      </div>
    </div>
  );
}

// ─── Admin: Profile Form ──────────────────────────────────────────────────────

function ProfileForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Psychologist | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<any>(initial ?? { ...EMPTY_FORM });
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

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
      setError("Nome e localização são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch {
      setError("Erro ao salvar. Tente novamente.");
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: string,
    type = "text",
    placeholder = "",
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
        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {field("Nome completo *", "name", "text", "Dra. Ana Lima")}
        {field(
          "Título / Registro",
          "title",
          "text",
          "Psicóloga · CRP 06/12345",
        )}
        {field("CRP", "crp", "text", "06/12345")}
        {field("E-mail", "email", "email", "ana@email.com")}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
        {field("Localização *", "location", "text", "Barcelona, Espanha")}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Bandeira
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
          Especialidades
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
            placeholder="Adicionar especialidade..."
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => addSpecialty(specialtyInput)}
            className="bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Adicionar
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SPECIALTY_SUGGESTIONS.filter(
            (s) => !form.specialties.includes(s),
          ).map((s) => (
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
          Abordagem terapêutica
        </label>
        <textarea
          value={form.approach ?? ""}
          onChange={(e) => set("approach", e.target.value)}
          placeholder="Descreva sua abordagem em 1-2 frases..."
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {field(
          "Modalidade de sessão",
          "sessions",
          "text",
          "Online · Português / Español",
        )}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Anos de experiência
          </label>
          <input
            type="number"
            min={0}
            max={50}
            value={form.years}
            onChange={(e) => set("years", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Foto de perfil
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              setPhotoFile(file);
              setPhotoPreview(URL.createObjectURL(file));
            }
          }}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
        />
        {(photoPreview || form.photo_url) && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={photoPreview || form.photo_url}
              alt="Preview"
              className="w-16 h-16 rounded-xl object-cover border border-border bg-muted"
            />
            <p className="text-xs text-muted-foreground">Preview da foto</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">
          Sugestão Unsplash:{" "}
          <code className="bg-muted px-1 rounded">
            https://images.unsplash.com/photo-XXXXXXX?w=500&h=400&fit=crop&auto=format
          </code>
        </p>
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
          Cancelar
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
          {initial ? "Salvar alterações" : "Cadastrar perfil"}
        </button>
      </div>
    </form>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [editing, setEditing] = useState<Psychologist | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPsychologists(await apiFetch("/psychologists?admin=true"));
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    if (editing) {
      await apiFetch(`/psychologists/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } else {
      await apiFetch("/psychologists", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
    await load();
    setView("list");
    setEditing(null);
  };

  const handleToggleApproval = async (id: string) => {
    await apiFetch(`/psychologists/${id}/approve`, { method: "PATCH" });
    await load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/psychologists/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await load();
  };

  const approved = psychologists.filter((p) => p.approved).length;

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Admin Nav */}
      <header className="bg-primary text-primary-foreground h-14 flex items-center px-6 gap-4 sticky top-0 z-40">
        <Shield size={16} className="text-accent" />
        <span
          className="font-bold text-sm"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Travessia · Administração
        </span>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-primary-foreground/60">
            {approved} publicados · {psychologists.length - approved} pendentes
          </span>
          <button
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
            className="flex items-center gap-1.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Globe size={14} /> Ver site
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header row */}
        {view === "list" && (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="text-3xl font-light text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Psicólogos
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Gerencie os perfis publicados na plataforma.
              </p>
            </div>
            <button
              onClick={() => {
                setEditing(null);
                setView("new");
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={16} /> Novo perfil
            </button>
          </div>
        )}

        {/* Form view */}
        {(view === "new" || view === "edit") && (
          <div>
            <button
              onClick={() => {
                setView("list");
                setEditing(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ChevronLeft size={16} /> Voltar à lista
            </button>
            <h2
              className="text-2xl font-light mb-8 text-foreground"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {view === "edit" ? "Editar perfil" : "Cadastrar novo psicólogo"}
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
            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
                <Loader2 size={20} className="animate-spin" /> Carregando
                perfis...
              </div>
            ) : psychologists.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
                <p className="text-4xl mb-4">🌿</p>
                <p className="font-semibold text-foreground mb-2">
                  Nenhum perfil cadastrado ainda
                </p>
                <p className="text-muted-foreground text-sm mb-6">
                  Clique em "Novo perfil" para começar.
                </p>
                <button
                  onClick={() => {
                    setEditing(null);
                    setView("new");
                  }}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} /> Cadastrar primeiro perfil
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {psychologists.map((p) => (
                  <div
                    key={p.id}
                    className={`bg-card border rounded-xl p-5 flex items-center gap-5 transition-colors ${p.approved ? "border-border" : "border-amber-200 bg-amber-50/30"}`}
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
                        <span className="font-semibold text-foreground">
                          {p.name}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${p.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {p.approved ? "Publicado" : "Pendente"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {p.flag} {p.location} · {p.years} anos · {p.sessions}
                      </p>
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
                        onClick={() => handleToggleApproval(p.id)}
                        title={p.approved ? "Despublicar" : "Publicar"}
                        className={`p-2 rounded-lg border transition-colors text-sm flex items-center gap-1.5 font-medium ${p.approved ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                      >
                        {p.approved ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span className="hidden sm:inline">
                          {p.approved ? "Publicado" : "Publicar"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setEditing(p);
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
          </>
        )}
      </div>

      {/* Delete confirm modal */}
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
              Remover perfil?
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Esta ação não pode ser desfeita. O perfil será removido
              permanentemente da plataforma.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Public Landing ───────────────────────────────────────────────────────────

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTransition, setActiveTransition] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loadingPsychs, setLoadingPsychs] = useState(true);

  useEffect(() => {
    apiFetch("/psychologists")
      .then(setPsychologists)
      .catch(() => {})
      .finally(() => setLoadingPsychs(false));
  }, []);

  const getPhotoSrc = (p: Psychologist) => {
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
          <a href="#" className="flex items-center gap-2">
            <span
              className="text-xl font-bold text-primary"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Travessia
            </span>
            <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase mt-1">
              Psicologia
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#como-funciona"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Como funciona
            </a>
            <a
              href="#psicologos"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Psicólogos
            </a>
            <a
              href="#faq"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Perguntas
            </a>
            <div className="flex items-center gap-1 text-muted-foreground text-xs border border-border rounded-full px-3 py-1">
              <Globe size={12} />
              <span>PT · ES</span>
            </div>
            <a
              href="#comecar"
              className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Começar
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
          <div className="md:hidden bg-background border-t border-border px-6 py-6 flex flex-col gap-5 text-sm font-medium">
            <a
              href="#como-funciona"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              Como funciona
            </a>
            <a
              href="#psicologos"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              Psicólogos
            </a>
            <a
              href="#faq"
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground"
            >
              Perguntas
            </a>
            <a
              href="#comecar"
              onClick={() => setMenuOpen(false)}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-center font-semibold"
            >
              Começar minha jornada
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
              Psicologia para quem está em travessia
            </span>
          </div>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-light leading-[1.05] mb-8 text-foreground"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Você não precisa
            <br />
            atravessar isso
            <br />
            <em className="not-italic text-primary">sozinho.</em>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-md font-normal">
            Conectamos brasileiros que vivem grandes mudanças — dentro e fora do
            Brasil — com psicólogos selecionados para sua história.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#comecar"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full font-semibold hover:opacity-90 transition-opacity text-base"
            >
              Encontrar meu psicólogo <ArrowRight size={18} />
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-7 py-3.5 rounded-full font-semibold hover:bg-secondary transition-colors text-base"
            >
              Como funciona
            </a>
          </div>
          <div className="mt-14 flex items-center gap-8 text-sm text-muted-foreground">
            <div className="flex flex-col">
              <span
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                840+
              </span>
              <span>pacientes acompanhados</span>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="flex flex-col">
              <span
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                🇧🇷 🇪🇸
              </span>
              <span>Brasil · Espanha</span>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="flex flex-col">
              <span
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                4.9
              </span>
              <span>avaliação média</span>
            </div>
          </div>
        </div>
        <div className="relative hidden md:block bg-secondary overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=1000&fit=crop&auto=format"
            alt="Vista de Barcelona ao entardecer"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent"></div>
          <div className="absolute bottom-12 left-10 right-10">
            <blockquote className="bg-background/90 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
              <Quote size={20} className="text-accent mb-3" />
              <p className="text-sm leading-relaxed text-foreground font-medium mb-4">
                "A mudança me tirou tudo que eu conhecia — cidade, trabalho,
                amigos. Mas também me devolveu a mim mesma."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Ana Paula, 34
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={10} /> Barcelona, Espanha
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
              Momentos que atendemos
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-light mb-16 leading-tight max-w-lg"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Toda travessia tem seu próprio peso.
          </h2>
          <div className="grid md:grid-cols-[2fr_3fr] gap-0 border border-primary-foreground/20 rounded-2xl overflow-hidden">
            <div className="border-r border-primary-foreground/20">
              {transitions.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTransition(i)}
                  className={`w-full text-left px-6 py-5 border-b border-primary-foreground/10 last:border-b-0 transition-colors flex items-center gap-4 ${activeTransition === i ? "bg-primary-foreground/10" : "hover:bg-primary-foreground/5"}`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span
                    className={`font-semibold text-sm md:text-base ${activeTransition === i ? "text-primary-foreground" : "text-primary-foreground/70"}`}
                  >
                    {t.title}
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
                Iniciar meu processo <ArrowRight size={16} />
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
              Como funciona
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-light mb-20 leading-tight max-w-xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Um cuidado que começa antes da primeira sessão.
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
              Psicólogos
            </span>
          </div>
          <div className="md:flex md:items-end md:justify-between mb-16">
            <h2
              className="text-4xl md:text-5xl font-light leading-tight max-w-lg"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Profissionais selecionados para o seu momento.
            </h2>
            <p className="text-muted-foreground max-w-xs mt-4 md:mt-0 text-sm leading-relaxed">
              Não listamos todos os psicólogos do mundo. Curadoria rigorosa —
              profissionais com experiência real em transições de vida.
            </p>
          </div>

          {loadingPsychs ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 size={20} className="animate-spin" /> Carregando
              profissionais...
            </div>
          ) : psychologists.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-background/50">
              <p className="text-4xl mb-4">🌿</p>
              <p className="font-semibold text-foreground mb-2">
                Em breve, novos profissionais
              </p>
              <p className="text-muted-foreground text-sm">
                Nossa curadoria está em andamento. Em breve anunciamos os
                primeiros psicólogos da plataforma.
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
                      alt={`Foto de ${p.name}`}
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
                          {p.years} anos de experiência
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
                        {p.sessions}
                      </span>
                      <button className="text-xs font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1">
                        Ver perfil <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-muted-foreground text-sm mt-10">
            O seu match é feito com base no seu perfil — você pode ser conectado
            a profissionais não listados aqui.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-28 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="w-8 h-px bg-accent"></div>
            <span className="text-xs tracking-widest uppercase font-semibold text-accent">
              Depoimentos
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-light mb-16 leading-tight max-w-xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Histórias reais de quem atravessou.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-card border border-border rounded-2xl p-8 flex flex-col"
              >
                <Quote size={24} className="text-accent mb-5" />
                <p className="text-foreground leading-relaxed mb-8 flex-1 text-[15px]">
                  "{t.text}"
                </p>
                <div className="pt-6 border-t border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {t.flag} {t.location}
                      </p>
                    </div>
                    <span className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full border border-border">
                      {t.transition}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mt-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
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
              Começar
            </span>
          </div>
          {quizStep === 0 && (
            <div className="text-center py-8">
              <h2
                className="text-4xl md:text-6xl font-light mb-6 leading-[1.1]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Pronto para
                <br />
                sua travessia?
              </h2>
              <p className="text-primary-foreground/70 text-lg mb-12 max-w-md mx-auto leading-relaxed">
                Leva menos de 3 minutos. Vamos entender seu momento antes de
                sugerir qualquer profissional.
              </p>
              <button
                onClick={() => setQuizStep(1)}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                Começar o questionário <ArrowRight size={20} />
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
                  ← Voltar
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
                Obrigado por compartilhar.
              </h3>
              <p className="text-primary-foreground/70 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                Nossa equipe entrará em contato em até 24 horas com suas
                indicações personalizadas.
              </p>
              <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-2xl p-8 max-w-md mx-auto text-left">
                <p className="text-sm font-semibold text-primary-foreground mb-4">
                  Continue o cadastro:
                </p>
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  className="w-full bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg px-4 py-3 text-primary-foreground placeholder-primary-foreground/40 text-sm mb-3 outline-none focus:border-accent transition-colors"
                />
                <input
                  type="text"
                  placeholder="Seu nome"
                  className="w-full bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg px-4 py-3 text-primary-foreground placeholder-primary-foreground/40 text-sm mb-5 outline-none focus:border-accent transition-colors"
                />
                <button className="w-full bg-accent text-accent-foreground py-3.5 rounded-full font-semibold hover:opacity-90 transition-opacity">
                  Quero encontrar meu psicólogo
                </button>
              </div>
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
              Perguntas frequentes
            </span>
          </div>
          <h2
            className="text-4xl font-light mb-14 leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Dúvidas comuns.
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
                className="text-2xl font-light mb-3"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Travessia
              </p>
              <p className="text-background/60 text-sm leading-relaxed max-w-xs">
                Psicologia especializada em pessoas que estão passando por
                grandes mudanças de vida. Brasileiros no Brasil e no mundo.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <span className="text-xs bg-background/10 rounded-full px-3 py-1.5">
                  🇧🇷 Brasil
                </span>
                <span className="text-xs bg-background/10 rounded-full px-3 py-1.5">
                  🇪🇸 Espanha
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs tracking-widest uppercase font-semibold text-background/40 mb-5">
                Plataforma
              </p>
              <ul className="space-y-3 text-sm text-background/70">
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Como funciona
                  </a>
                </li>
                <li>
                  <a
                    href="#psicologos"
                    className="hover:text-background transition-colors"
                  >
                    Psicólogos
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Para empresas
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs tracking-widest uppercase font-semibold text-background/40 mb-5">
                Suporte
              </p>
              <ul className="space-y-3 text-sm text-background/70">
                <li>
                  <a
                    href="#faq"
                    className="hover:text-background transition-colors"
                  >
                    Perguntas frequentes
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Falar com a equipe
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Para psicólogos
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs tracking-widest uppercase font-semibold text-background/40 mb-5">
                Admin
              </p>
              <ul className="space-y-3 text-sm text-background/70">
                <li>
                  <a
                    href="#admin"
                    className="hover:text-background transition-colors flex items-center gap-1.5"
                  >
                    <Shield size={12} /> Área de administração
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Privacidade
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-background transition-colors"
                  >
                    Termos de uso
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/40">
            <p>© 2025 Travessia Psicologia. Todos os direitos reservados.</p>
            <p>Plataforma registrada no CFP · CRP regularizado</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Root Router ──────────────────────────────────────────────────────────────

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [adminAuth, setAdminAuth] = useState(false);

  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (hash === "#admin") {
    if (!adminAuth) return <AdminLogin onLogin={() => setAdminAuth(true)} />;
    return (
      <AdminPanel
        onLogout={() => {
          setAdminAuth(false);
          window.location.hash = "";
        }}
      />
    );
  }

  return <Landing />;
}
