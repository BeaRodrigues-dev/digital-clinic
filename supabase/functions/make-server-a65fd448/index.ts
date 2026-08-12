import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Supabase admin client (service role — server-side only) ──
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Auth: real Supabase Auth accounts + roles (Fase 1) ──────────────────
// Replaces the old shared-PIN system. The frontend now sends the logged-in
// user's Supabase session token as `Authorization: Bearer <token>` (instead
// of the project's anon/publishable key) for anything that needs a role.
type Role = "admin" | "psychologist" | "secretary" | "patient";

async function getCallingUser(c: any) {
  const authHeader = c.req.header("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null; // anon key, or not logged in

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, clinic_id, full_name")
      .eq("id", data.user.id)
      .maybeSingle(),
    // Fase 17 (troca de perfil): quais papéis esta conta tem direito de
    // assumir — usado pelo frontend pra mostrar (ou não) "Alternar perfil".
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
  ]);

  const availableRoles = Array.from(
    new Set([
      ...(roleRows ?? []).map((r: any) => r.role as Role),
      (profile?.role as Role) ?? "patient",
    ]),
  );

  // Foto só existe pra quem tem perfil profissional (Fase 12) — buscada só
  // quando faz sentido, pra não gastar uma consulta à toa em toda chamada.
  let photoUrl: string | null = null;
  if (
    (profile?.role as Role) === "psychologist" ||
    availableRoles.includes("psychologist")
  ) {
    const { data: prof } = await supabase
      .from("professionals")
      .select("photo_url")
      .eq("id", data.user.id)
      .maybeSingle();
    photoUrl = prof?.photo_url ?? null;
  }

  // Fase 19 — a secretária cadastra pacientes/consultas em nome do
  // profissional dono da clínica (hoje toda clínica tem exatamente 1
  // profissional). O front precisa desse id pra preencher
  // `professional_id` nos inserts; buscamos aqui (com service role, sem
  // depender de RLS) em vez de expor uma policy nova de `profiles` pra
  // secretária enxergar o psicólogo — menos superfície de RLS depois do
  // susto da recursão na Fase 18.
  let clinicProfessionalId: string | null = null;
  if ((profile?.role as Role) === "secretary" && profile?.clinic_id) {
    const { data: owner } = await supabase
      .from("profiles")
      .select("id")
      .eq("clinic_id", profile.clinic_id)
      .eq("role", "psychologist")
      .maybeSingle();
    clinicProfessionalId = owner?.id ?? null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
    role: (profile?.role as Role) ?? "patient",
    clinicId: profile?.clinic_id ?? null,
    clinicProfessionalId,
    availableRoles,
    fullName: profile?.full_name ?? null,
    photoUrl,
  };
}

// Acha uma conta de Auth já existente pelo e-mail (a Admin API não tem um
// "getUserByEmail" direto). Usado só como recuperação — ver comentário em
// /patients/:id/invite — pra religar um convite que criou a conta no Auth
// mas falhou antes de vincular `patient_user_id` (deixando o e-mail "preso":
// nem o convite terminou, nem tinha id salvo pra reenviar).
async function findAuthUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data?.users?.length) return null;
    const match = data.users.find(
      (u: any) => (u.email ?? "").toLowerCase() === target,
    );
    if (match) return match;
    if (data.users.length < perPage) return null; // última página
  }
  return null;
}

// Sem isso, o Supabase Auth manda os e-mails de convite/redefinição de
// senha de volta pro "Site URL" configurado no painel do projeto (Settings
// → Auth) — que pode ser qualquer coisa, ou nem estar configurado direito
// — em vez de voltar pro app de verdade, onde o SetPasswordScreen sabe ler
// o #access_token=...&type=invite|recovery da URL. Pegamos o `Origin` de
// quem chamou a nossa própria function (sempre presente em chamadas
// `fetch` de navegador) como o endereço certo pra voltar, então funciona
// igual em dev/preview/produção sem precisar configurar nada a mais.
function getRedirectOrigin(c: any): string | undefined {
  return c.req.header("Origin") || undefined;
}

function requireRole(...roles: Role[]) {
  return async (c: any, next: () => Promise<void>) => {
    const user = await getCallingUser(c);
    if (!user) return c.json({ error: "Não autenticado." }, 401);
    if (!roles.includes(user.role)) {
      return c.json({ error: "Sem permissão para esta ação." }, 403);
    }
    c.set("user", user);
    await next();
  };
}

app.get("/make-server-a65fd448/health", (c) => c.json({ status: "ok" }));

// ── Quem sou eu (usado pelo frontend logo após o login) ──
app.get("/make-server-a65fd448/me", async (c) => {
  const user = await getCallingUser(c);
  if (!user) return c.json({ error: "Não autenticado." }, 401);
  return c.json(user);
});

// ── Cadastro público de psicólogo (Fase 15) ─────────────────────────────
// Rota PÚBLICA (sem requireRole — quem chama ainda não tem conta). É a
// única forma seguro-por-padrão de criar uma conta já nascendo com
// `role = 'psychologist'`: fazemos isso aqui, com a service role key,
// porque um UPDATE de `profiles.role` feito pelo próprio navegador do
// usuário (mesmo logo após o cadastro) cairia na trava
// `trg_protect_profile_role` (Fase 15) que impede autopromoção de papel —
// e essa trava é o que impede qualquer usuário logado de virar admin só
// rodando um update no console do navegador.
app.post("/make-server-a65fd448/signup/psychologist", async (c) => {
  try {
    const body = await c.req.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const fullName = String(body?.full_name ?? "").trim();

    if (!email || !fullName) {
      return c.json({ error: "Nome e e-mail são obrigatórios." }, 400);
    }
    if (password.length < 8) {
      return c.json(
        { error: "A senha deve ter pelo menos 8 caracteres." },
        400,
      );
    }

    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createErr || !created?.user) {
      const message = (createErr?.message || "").includes("already")
        ? "Já existe uma conta com este e-mail. Tente entrar em vez de cadastrar."
        : createErr?.message || "Não foi possível criar a conta.";
      return c.json({ error: message }, 400);
    }

    const userId = created.user.id;

    // `handle_new_user()` já criou a linha em `profiles` (role padrão
    // 'patient') reagindo ao insert em auth.users acima. Promovemos pra
    // psicólogo aqui — isso dispara `handle_professional_role()`, que cria
    // a linha em `professionals` e a clínica própria (Fase 3/9).
    const { error: roleErr } = await supabase
      .from("profiles")
      .update({ role: "psychologist" })
      .eq("id", userId);

    if (roleErr) {
      console.error("Failed to set psychologist role on signup:", roleErr);
      // Não deixa uma conta "pela metade" (criada, mas sem papel de
      // psicólogo) — desfaz a criação e retorna erro.
      await supabase.auth.admin.deleteUser(userId);
      return c.json({ error: "Não foi possível concluir o cadastro." }, 500);
    }

    // Fase 17 (troca de perfil): o UPDATE acima disparou um gatilho que
    // registra 'psychologist' como papel que esta conta tem direito de
    // assumir — mas o INSERT anterior (o `handle_new_user()` que criou a
    // linha em `profiles` com o valor padrão da coluna, 'patient') também
    // registrou 'patient' pelo mesmo motivo. Aqui essa passagem por
    // 'patient' durou milissegundos e nunca foi um papel de verdade desta
    // conta — sem esta limpeza, todo psicólogo cadastrado pelo formulário
    // público veria "Paciente" (que ele nunca teve) na lista de "Alternar
    // perfil".
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "patient");

    return c.json({ success: true });
  } catch (err: any) {
    console.error("Failed to sign up psychologist:", err);
    return c.json(
      { error: err?.message ?? "Não foi possível criar a conta." },
      500,
    );
  }
});

// ── LIST all psychologists (public: only approved; admin: all) ──
app.get("/make-server-a65fd448/psychologists", async (c) => {
  const adminMode = c.req.query("admin") === "true";

  if (adminMode) {
    // Unapproved profiles can contain unvetted contact info (email, CRP),
    // so listing them requires an authenticated admin.
    const guard = await requireRole("admin")(c, async () => {});
    if (guard) return guard;
  }

  const all = await kv.getByPrefix("psych:");
  const list = adminMode ? all : all.filter((p: any) => p.approved);
  list.sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return c.json(list);
});

// ── GET single psychologist ──
app.get("/make-server-a65fd448/psychologists/:id", async (c) => {
  const data = await kv.get(`psych:${c.req.param("id")}`);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.json(data);
});

// ── Shared form parsing for CREATE / UPDATE ──
async function parseProfileForm(c: any) {
  const formData = await c.req.formData();

  const specialtiesRaw = formData.get("specialties");
  let specialties: string[] = [];
  try {
    specialties = specialtiesRaw ? JSON.parse(specialtiesRaw as string) : [];
  } catch {
    specialties = [];
  }

  const photoFile = formData.get("photo_file") as File | null;

  return {
    name: (formData.get("name") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    location: (formData.get("location") as string) ?? "",
    flag: (formData.get("flag") as string) ?? "",
    specialties,
    approach: (formData.get("approach") as string) ?? "",
    sessions: (formData.get("sessions") as string) ?? "",
    years: formData.get("years"),
    rating: formData.get("rating"),
    crp: (formData.get("crp") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    photo_file: photoFile && photoFile instanceof File ? photoFile : null,
  };
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

async function uploadProfilePhoto(photoFile: File): Promise<string> {
  if (photoFile.size > MAX_PHOTO_BYTES) {
    throw new Error("A foto excede o tamanho máximo de 5MB.");
  }

  const fileExt = photoFile.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const arrayBuffer = await photoFile.arrayBuffer();

  const { data, error } = await supabase.storage
    .from("Profiles")
    .upload(fileName, arrayBuffer, {
      contentType: photoFile.type || "application/octet-stream",
    });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from("Profiles")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}

// ── CREATE psychologist ──
app.post(
  "/make-server-a65fd448/psychologists",
  requireRole("admin"),
  async (c) => {
    try {
      const body = await parseProfileForm(c);

      let photoUrl = "";
      if (body.photo_file) {
        photoUrl = await uploadProfilePhoto(body.photo_file);
      }

      const id = crypto.randomUUID();
      const profile = {
        id,
        name: body.name,
        title: body.title || "Psicólogo(a)",
        location: body.location,
        flag: body.flag || "🇧🇷",
        specialties: body.specialties,
        approach: body.approach,
        sessions: body.sessions || "Online · Português",
        photo_url: photoUrl,
        years: Number(body.years) || 1,
        rating: Number(body.rating) || 5.0,
        approved: false,
        crp: body.crp,
        email: body.email,
        created_at: new Date().toISOString(),
      };
      await kv.set(`psych:${id}`, profile);
      return c.json(profile, 201);
    } catch (err: any) {
      console.error("Failed to create psychologist:", err);
      return c.json({ error: err?.message ?? "Erro ao criar perfil." }, 500);
    }
  },
);

// ── UPDATE psychologist ──
app.put(
  "/make-server-a65fd448/psychologists/:id",
  requireRole("admin"),
  async (c) => {
    try {
      const id = c.req.param("id");
      const existing = await kv.get(`psych:${id}`);
      if (!existing) return c.json({ error: "Not found" }, 404);

      const body = await parseProfileForm(c);

      let photoUrl = existing.photo_url;
      if (body.photo_file) {
        photoUrl = await uploadProfilePhoto(body.photo_file);
      }

      const updated = {
        ...existing,
        name: body.name,
        title: body.title || existing.title,
        location: body.location,
        flag: body.flag || existing.flag,
        specialties: body.specialties,
        approach: body.approach,
        sessions: body.sessions || existing.sessions,
        photo_url: photoUrl,
        years: Number(body.years) || existing.years,
        rating:
          body.rating !== null && body.rating !== ""
            ? Number(body.rating)
            : existing.rating,
        crp: body.crp,
        email: body.email,
        id,
        created_at: existing.created_at,
        updated_at: new Date().toISOString(),
      };
      await kv.set(`psych:${id}`, updated);
      return c.json(updated);
    } catch (err: any) {
      console.error("Failed to update psychologist:", err);
      return c.json({ error: err?.message ?? "Erro ao salvar perfil." }, 500);
    }
  },
);

// ── TOGGLE approval ──
app.patch(
  "/make-server-a65fd448/psychologists/:id/approve",
  requireRole("admin"),
  async (c) => {
    const id = c.req.param("id");
    const existing = await kv.get(`psych:${id}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, approved: !existing.approved };
    await kv.set(`psych:${id}`, updated);
    return c.json(updated);
  },
);

// ── DELETE psychologist ──
app.delete(
  "/make-server-a65fd448/psychologists/:id",
  requireRole("admin"),
  async (c) => {
    const id = c.req.param("id");
    await kv.del(`psych:${id}`);
    return c.json({ success: true });
  },
);

// ── Convidar paciente para a área do paciente (Fase 8) ──
// Cria a conta de login do paciente (via Admin API, exige service role — por
// isso passa pelo backend em vez de ir direto do frontend) e vincula essa
// conta ao cadastro que o profissional já fez em `patients`. O gatilho
// on_auth_user_created (Fase 1) cuidará de criar a linha em `profiles` com o
// papel padrão "patient" automaticamente.
app.post(
  "/make-server-a65fd448/patients/:id/invite",
  requireRole("psychologist", "admin"),
  async (c) => {
    try {
      const user = c.get("user");
      const patientId = c.req.param("id");

      const { data: patient, error: fetchErr } = await supabase
        .from("patients")
        .select("id, professional_id, email, full_name, patient_user_id")
        .eq("id", patientId)
        .maybeSingle();

      if (fetchErr || !patient) {
        return c.json({ error: "Paciente não encontrado." }, 404);
      }
      if (user.role !== "admin" && patient.professional_id !== user.id) {
        return c.json({ error: "Sem permissão para este paciente." }, 403);
      }
      if (!patient.email) {
        return c.json(
          { error: "Cadastre um e-mail para este paciente antes de convidar." },
          400,
        );
      }
      if (patient.patient_user_id) {
        return c.json({ error: "Este paciente já tem acesso." }, 409);
      }

      const { data: invited, error: inviteErr } =
        await supabase.auth.admin.inviteUserByEmail(patient.email, {
          data: { full_name: patient.full_name },
          redirectTo: getRedirectOrigin(c),
        });

      let newUserId = invited?.user?.id;
      let sentRecoveryInstead = false;

      if (inviteErr) {
        // "E-mail já cadastrado" — normalmente sinal de que um convite
        // anterior chegou a criar a conta no Auth, mas algo deu errado
        // antes de vincular `patient_user_id` (ex.: um erro de banco no
        // meio do caminho). Isso deixava o paciente preso: o botão de
        // convidar falha de novo (e-mail já existe), e não tinha o
        // `patient_user_id` salvo pra habilitar o botão de reenviar.
        // Recupera a conta pelo e-mail, vincula, e manda o e-mail de
        // redefinição de senha no lugar do convite (mesmo mecanismo do
        // /resend-access, que funciona pra contas já existentes).
        const looksAlreadyRegistered =
          /already|registered|existe|cadastrad/i.test(inviteErr.message ?? "");
        if (!looksAlreadyRegistered) {
          console.error("Failed to invite patient (auth):", inviteErr);
          return c.json({ error: inviteErr.message }, 400);
        }
        const existing = await findAuthUserByEmail(patient.email);
        if (!existing) {
          console.error(
            "Invite disse 'já cadastrado' mas não achou o usuário pelo e-mail:",
            patient.email,
          );
          return c.json({ error: inviteErr.message }, 400);
        }
        newUserId = existing.id;
        sentRecoveryInstead = true;
      }

      if (!newUserId) {
        return c.json({ error: "Falha ao criar acesso do paciente." }, 500);
      }

      const { error: linkErr } = await supabase
        .from("patients")
        .update({ patient_user_id: newUserId })
        .eq("id", patientId);

      if (linkErr) {
        console.error("Failed to link invited patient:", linkErr);
        return c.json({ error: linkErr.message }, 500);
      }

      if (sentRecoveryInstead) {
        const { error: resendErr } = await supabase.auth.resetPasswordForEmail(
          patient.email,
          { redirectTo: getRedirectOrigin(c) },
        );
        if (resendErr) {
          console.error(
            "Failed to send recovery e-mail after relinking patient:",
            resendErr,
          );
          return c.json({ error: resendErr.message }, 500);
        }
      }

      return c.json({ success: true, invited_email: patient.email });
    } catch (err: any) {
      console.error("Failed to invite patient:", err);
      return c.json(
        { error: err?.message ?? "Erro ao convidar paciente." },
        500,
      );
    }
  },
);

// ── Reenviar acesso a um paciente já vinculado (Fase 8) ──
// Cobre o caso de o convite original (e-mail "invite") ter expirado antes do
// paciente definir uma senha — o que deixa a conta criada e vinculada em
// `patients.patient_user_id`, mas sem senha nenhuma, e sem jeito de o
// paciente entrar. Em vez de tentar reemitir um convite (a Admin API trata
// e-mail já cadastrado como erro), usamos o fluxo padrão de "esqueci minha
// senha" do Supabase (resetPasswordForEmail): ele funciona pra qualquer
// conta já existente, confirmada ou não, e usa o mesmo e-mail transacional
// pronto do Supabase — sem precisar de SMTP customizado. O link resultante
// tem #type=recovery, que o frontend (SetPasswordScreen) já sabe tratar
// exatamente como um convite.
app.post(
  "/make-server-a65fd448/patients/:id/resend-access",
  requireRole("psychologist", "admin"),
  async (c) => {
    try {
      const user = c.get("user");
      const patientId = c.req.param("id");

      const { data: patient, error: fetchErr } = await supabase
        .from("patients")
        .select("id, professional_id, email, patient_user_id")
        .eq("id", patientId)
        .maybeSingle();

      if (fetchErr || !patient) {
        return c.json({ error: "Paciente não encontrado." }, 404);
      }
      if (user.role !== "admin" && patient.professional_id !== user.id) {
        return c.json({ error: "Sem permissão para este paciente." }, 403);
      }
      if (!patient.email) {
        return c.json(
          { error: "Cadastre um e-mail para este paciente antes de reenviar." },
          400,
        );
      }
      if (!patient.patient_user_id) {
        return c.json(
          { error: "Este paciente ainda não foi convidado." },
          409,
        );
      }

      const { error: resendErr } = await supabase.auth.resetPasswordForEmail(
        patient.email,
        { redirectTo: getRedirectOrigin(c) },
      );

      if (resendErr) {
        console.error("Failed to resend patient access:", resendErr);
        return c.json({ error: resendErr.message }, 400);
      }

      return c.json({ success: true, invited_email: patient.email });
    } catch (err: any) {
      console.error("Failed to resend patient access:", err);
      return c.json(
        { error: err?.message ?? "Erro ao reenviar acesso." },
        500,
      );
    }
  },
);

// ── Vincular uma conta de paciente já existente (Fase 21) ────────────────
// Cobre o buraco que sobrou de conceder o papel "paciente" pela aba Admin
// → Usuários (Fase 18): aquilo só marca `profiles.role = 'patient'`, não
// cria nenhum cadastro em `patients` nem vincula a nenhum profissional —
// de propósito, porque essa vinculação é uma decisão de cada profissional/
// clínica, não do admin geral da plataforma. Esta rota é o profissional
// "reivindicando" essa conta como paciente dele, pelo e-mail.
app.post(
  "/make-server-a65fd448/patients/link-existing",
  requireRole("psychologist"),
  async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json().catch(() => ({}));
      const email = String(body?.email ?? "").trim();

      if (!email) {
        return c.json(
          { error: "Informe o e-mail da conta a vincular." },
          400,
        );
      }

      const { data: target, error: findErr } = await supabase
        .from("profiles")
        .select("id, role, full_name, email")
        .eq("email", email)
        .maybeSingle();

      if (findErr || !target) {
        return c.json(
          { error: "Nenhuma conta encontrada com este e-mail." },
          404,
        );
      }
      if (target.role !== "patient") {
        return c.json(
          {
            error:
              "Esta conta não tem o papel de paciente. Peça para um administrador conceder o papel de paciente a ela primeiro (Painel Admin → Usuários).",
          },
          400,
        );
      }

      const { count } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("patient_user_id", target.id);

      if ((count ?? 0) > 0) {
        return c.json(
          { error: "Esta conta já está vinculada a um paciente existente." },
          409,
        );
      }

      const { error: insertErr } = await supabase.from("patients").insert({
        professional_id: user.id,
        clinic_id: user.clinicId,
        patient_user_id: target.id,
        full_name: target.full_name || email,
        email: target.email ?? email,
        status: "active",
      });

      if (insertErr) {
        const message =
          insertErr.message === "plan_patient_limit_reached"
            ? "plan_patient_limit_reached"
            : insertErr.message;
        return c.json({ error: message }, 400);
      }

      return c.json({ success: true, linked_email: target.email ?? email });
    } catch (err: any) {
      console.error("Failed to link existing patient:", err);
      return c.json(
        { error: err?.message ?? "Erro ao vincular paciente." },
        500,
      );
    }
  },
);

// ── Logo da clínica (Fase 9) ──
// Igual ao upload de foto do psicólogo (mesmo bucket "Profiles", mesmo
// limite de tamanho): passa pelo backend porque grava no Storage com a
// service role, evitando depender de policies de Storage no bucket que o
// cliente talvez não tenha permissão de usar diretamente.
app.post(
  "/make-server-a65fd448/clinic/logo",
  requireRole("psychologist", "admin"),
  async (c) => {
    try {
      const user = c.get("user");

      const { data: clinic, error: fetchErr } = await supabase
        .from("clinics")
        .select("id, logo_url")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (fetchErr || !clinic) {
        return c.json(
          { error: "Você não é dono de nenhuma clínica." },
          404,
        );
      }

      const formData = await c.req.formData();
      const logoFile = formData.get("logo_file") as File | null;
      if (!logoFile || !(logoFile instanceof File)) {
        return c.json({ error: "Envie um arquivo de logo." }, 400);
      }

      const logoUrl = await uploadProfilePhoto(logoFile);

      const { error: updateErr } = await supabase
        .from("clinics")
        .update({ logo_url: logoUrl })
        .eq("id", clinic.id);

      if (updateErr) {
        console.error("Failed to save clinic logo:", updateErr);
        return c.json({ error: updateErr.message }, 500);
      }

      return c.json({ success: true, logo_url: logoUrl });
    } catch (err: any) {
      console.error("Failed to upload clinic logo:", err);
      return c.json(
        { error: err?.message ?? "Erro ao enviar o logo." },
        500,
      );
    }
  },
);

// ── IA: resumir/organizar notas do prontuário (Fase 11) ──
// Usa a Groq API (compatível com o formato da OpenAI) porque, ao contrário
// da Anthropic/OpenAI, o tier gratuito da Groq não pede cartão e — segundo a
// política deles — não retém nem treina modelos com os dados enviados, o
// que importa bastante aqui: o texto enviado são anotações clínicas.
// Configuração necessária (uma vez só):
//   supabase secrets set GROQ_API_KEY=sua_chave_aqui
// (gere a chave em https://console.groq.com/keys)
//
// Se o modelo abaixo for descontinuado pela Groq no futuro (acontece com
// modelos hospedados por eles de tempos em tempos), troque o valor de
// GROQ_MODEL — confira os modelos disponíveis em
// https://console.groq.com/docs/models
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

const AI_NOTE_PROMPTS: Record<string, string> = {
  summarize:
    "Você é um assistente de um psicólogo clínico. Resuma a anotação de " +
    "sessão abaixo em um parágrafo curto e objetivo (3 a 5 frases), " +
    "mantendo os pontos clínicos relevantes (queixas, estado emocional, " +
    "intervenções, encaminhamentos). Não invente informação que não esteja " +
    "no texto original. Responda só com o resumo, sem introdução.",
  organize:
    "Você é um assistente de um psicólogo clínico. Reorganize a anotação " +
    "de sessão abaixo em um formato mais claro e estruturado, agrupando em " +
    "seções curtas quando fizer sentido (por exemplo: queixa principal, " +
    "observações, intervenções, encaminhamentos) — só inclua as seções que " +
    "tiverem conteúdo correspondente no texto original. Não invente " +
    "informação nova, só reorganize e clarifique o que já foi escrito. " +
    "Responda só com o texto reorganizado, sem introdução.",
};

app.post(
  "/make-server-a65fd448/ai/notes",
  requireRole("psychologist", "admin"),
  async (c) => {
    try {
      const user = c.get("user");

      // Recurso de IA é um diferencial dos planos pagos (Fase 16, Ponto 14
      // do pedido — limite de plano precisa ser aplicado de verdade, não só
      // mostrado na tela). Checado aqui no backend, não só escondendo o
      // botão no frontend — o frontend também esconde/avisa, mas quem
      // decide é o servidor. Admin sempre passa (não tem clínica/plano
      // próprio pra checar).
      if (user.role !== "admin") {
        const { data: prof } = await supabase
          .from("professionals")
          .select("clinics(plan)")
          .eq("id", user.id)
          .maybeSingle();
        const plan = (prof as any)?.clinics?.plan ?? "free";
        if (plan === "free") {
          return c.json({ error: "ai_requires_paid_plan" }, 403);
        }
      }

      const apiKey = Deno.env.get("GROQ_API_KEY");
      if (!apiKey) {
        return c.json(
          {
            error:
              "IA não configurada: falta a chave GROQ_API_KEY no backend.",
          },
          503,
        );
      }

      const body = await c.req.json().catch(() => ({}));
      const action = body?.action;
      const text = (body?.text ?? "").toString().trim();

      const systemPrompt = AI_NOTE_PROMPTS[action];
      if (!systemPrompt) {
        return c.json({ error: "Ação de IA inválida." }, 400);
      }
      if (!text) {
        return c.json({ error: "Não há texto para processar." }, 400);
      }

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: text },
            ],
            temperature: 0.3,
            max_tokens: 800,
          }),
        },
      );

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error("Groq API error:", groqRes.status, errText);
        return c.json(
          { error: `Falha ao chamar o serviço de IA (${groqRes.status}).` },
          502,
        );
      }

      const groqData = await groqRes.json();
      const result = groqData?.choices?.[0]?.message?.content?.trim();
      if (!result) {
        return c.json({ error: "A IA não retornou nenhum texto." }, 502);
      }

      return c.json({ result });
    } catch (err: any) {
      console.error("Failed to process AI note request:", err);
      return c.json(
        { error: err?.message ?? "Erro ao processar com IA." },
        500,
      );
    }
  },
);

// ── Perfil profissional unificado (Fase 12) ──
// Substitui o fluxo antigo (diretório no key-value store, só editável por
// admin) por um único formulário que o próprio psicólogo usa pra editar seu
// perfil público, e que o admin também usa pra moderar/corrigir qualquer
// profissional. Sempre grava direto na tabela `professionals` (a mesma que
// alimenta todo o resto do painel) + `profiles.full_name`/`phone` quando é
// o próprio profissional editando (nome de conta = nome exibido, não faz
// sentido ter dois campos de nome separados).
//
// `approved`, `clinic_id` e `rating` nunca são aceitos daqui — além do
// gatilho de banco que já bloqueia isso pra quem não é admin, filtramos
// aqui também (defesa em profundidade).
app.put(
  "/make-server-a65fd448/professionals/:id",
  requireRole("psychologist", "admin"),
  async (c) => {
    try {
      const user = c.get("user");
      const targetId = c.req.param("id");
      const isSelf = targetId === user.id;

      if (user.role !== "admin" && !isSelf) {
        return c.json(
          { error: "Você só pode editar o próprio perfil." },
          403,
        );
      }

      const { data: existing, error: fetchErr } = await supabase
        .from("professionals")
        .select("id, photo_url")
        .eq("id", targetId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return c.json({ error: "Profissional não encontrado." }, 404);
      }

      const formData = await c.req.formData();

      const specialtiesRaw = formData.get("specialties");
      let specialties: string[] = [];
      try {
        specialties = specialtiesRaw
          ? JSON.parse(specialtiesRaw as string)
          : [];
      } catch {
        specialties = [];
      }

      const photoFile = formData.get("photo_file") as File | null;
      let photoUrl = existing.photo_url;
      if (photoFile && photoFile instanceof File) {
        photoUrl = await uploadProfilePhoto(photoFile);
      }

      const yearsRaw = formData.get("years");
      const priceRaw = formData.get("session_price");
      // Nenhum dos dois faz sentido negativo — o campo do front já tem
      // `min={0}`, mas isso só bloqueia o submit no navegador, não protege
      // a rota em si (ex.: chamada direta à API).
      const yearsNum = yearsRaw ? Number(yearsRaw) : null;
      const priceNum = priceRaw ? Number(priceRaw) : null;

      const update: Record<string, unknown> = {
        title: (formData.get("title") as string) || null,
        location: (formData.get("location") as string) || null,
        flag: (formData.get("flag") as string) || null,
        specialties,
        approach: (formData.get("approach") as string) || null,
        sessions_info: (formData.get("sessions_info") as string) || null,
        photo_url: photoUrl,
        years:
          yearsNum != null && Number.isFinite(yearsNum)
            ? Math.max(0, yearsNum)
            : null,
        crp: (formData.get("crp") as string) || null,
        session_price:
          priceNum != null && Number.isFinite(priceNum)
            ? Math.max(0, priceNum)
            : null,
      };

      const { error: updateErr } = await supabase
        .from("professionals")
        .update(update)
        .eq("id", targetId);

      if (updateErr) {
        console.error("Failed to update professional profile:", updateErr);
        return c.json({ error: updateErr.message }, 500);
      }

      // Nome/telefone moram na conta (profiles), não no perfil público —
      // atualiza quando é o próprio profissional editando a própria conta,
      // ou quando é admin corrigindo o cadastro de alguém (admin já tem
      // acesso total a profiles via RLS "admin edita tudo", então isso não
      // abre nenhum acesso que ele não tivesse).
      if (isSelf || user.role === "admin") {
        const name = (formData.get("name") as string) || null;
        const phone = (formData.get("phone") as string) || null;
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ full_name: name, phone })
          .eq("id", targetId);
        if (profileErr) {
          console.error("Failed to update profile name/phone:", profileErr);
        }
      }

      return c.json({ success: true, photo_url: photoUrl });
    } catch (err: any) {
      console.error("Failed to save professional profile:", err);
      return c.json(
        { error: err?.message ?? "Erro ao salvar o perfil." },
        500,
      );
    }
  },
);

// ── Cobrança recorrente (Fase 16) — stub pronto pra integrar um gateway ──
// Hoje NÃO existe gateway de pagamento configurado (nem Stripe nem outro).
// A troca de plano em `PlanView`/`CheckoutScreen` continua indo direto em
// `clinics.plan` (sem cobrar nada), e é isso que fica valendo enquanto essa
// rota não estiver de verdade implementada.
//
// Esta rota existe só pra deixar documentado, num lugar central, o que uma
// integração real vai precisar:
//   1. Variáveis de ambiente da function (configurar via
//      `supabase secrets set NOME=valor`, nunca hardcoded no código):
//        STRIPE_SECRET_KEY        — chave secreta da conta Stripe
//        STRIPE_WEBHOOK_SECRET    — segredo pra validar assinatura dos webhooks
//        STRIPE_PRICE_PROFESSIONAL — Price ID do plano "Profissional"
//        STRIPE_PRICE_CLINIC       — Price ID do plano "Clínica"
//   2. Esta rota passaria a criar uma Stripe Checkout Session (ou
//      equivalente de outro gateway) e devolver a URL de redirecionamento
//      pro frontend, em vez do 501 abaixo.
//   3. Um webhook separado (nova rota, ex.:
//      POST /make-server-a65fd448/billing/webhook) precisaria validar a
//      assinatura do evento e, nos eventos de pagamento confirmado/
//      cancelado, atualizar `clinics.plan` e os campos
//      `stripe_customer_id`/`stripe_subscription_id` em `subscriptions`
//      (essa tabela já existe — Fase 16 — e já fica em sincronia automática
//      com `clinics.plan` via gatilho no banco).
// Enquanto essas variáveis não existirem, a rota responde 501 (Not
// Implemented) de propósito, pra nunca fingir uma cobrança que não
// acontece de verdade.
app.post(
  "/make-server-a65fd448/billing/create-checkout-session",
  requireRole("psychologist", "secretary", "admin"),
  async (c) => {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return c.json(
        {
          error: "billing_not_configured",
          message:
            "Cobrança automática ainda não está configurada nesta instalação. Configure STRIPE_SECRET_KEY (e demais variáveis — veja os comentários desta rota) para habilitar.",
        },
        501,
      );
    }
    // A partir daqui entraria a chamada real à API do Stripe (ou outro
    // gateway) pra criar a sessão de checkout — não implementado ainda.
    return c.json(
      { error: "billing_not_configured", message: "Não implementado." },
      501,
    );
  },
);

// ── Conceder um papel extra a uma conta (Fase 17 — troca de perfil) ──────
// Só admin pode dar a outra conta o direito de assumir um papel a mais
// (ex.: tornar uma psicóloga também administradora). Isso NÃO troca o papel
// ativo de ninguém na hora — só registra em `user_roles` que a conta passa
// a poder alternar pra esse papel quando quiser (via `switch_active_role`,
// chamada pelo próprio usuário depois, na própria sessão dele).
app.post(
  "/make-server-a65fd448/users/:id/roles",
  requireRole("admin"),
  async (c) => {
    const targetId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const role = String(body?.role ?? "");
    const validRoles = ["admin", "psychologist", "secretary", "patient"];

    if (!validRoles.includes(role)) {
      return c.json({ error: "Papel inválido." }, 400);
    }

    const { error } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: targetId, role },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

    if (error) {
      console.error("Failed to grant role entitlement:", error);
      return c.json({ error: "Não foi possível conceder o papel." }, 500);
    }

    return c.json({ success: true });
  },
);

// ── Revogar um papel concedido (Fase 18) ──────────────────────────────────
// Completa a rota acima. Não deixa remover o ÚLTIMO papel de uma conta —
// isso deixaria a conta sem nenhum papel pra assumir, uma conta "presa".
app.delete(
  "/make-server-a65fd448/users/:id/roles/:role",
  requireRole("admin"),
  async (c) => {
    const targetId = c.req.param("id");
    const role = c.req.param("role");

    const { data: rolesData, count } = await supabase
      .from("user_roles")
      .select("role", { count: "exact" })
      .eq("user_id", targetId);

    if ((count ?? 0) <= 1) {
      return c.json(
        {
          error: "Não é possível remover o último papel de uma conta.",
          code: "last_role",
        },
        400,
      );
    }

    // Precisa saber o papel ATIVO antes de apagar — se for justamente o que
    // está sendo revogado, `profiles.role` fica apontando pra um papel sem
    // mais entitlement em `user_roles` (ver troca abaixo).
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", targetId)
      .maybeSingle();

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", targetId)
      .eq("role", role);

    if (error) {
      console.error("Failed to revoke role entitlement:", error);
      return c.json({ error: "Não foi possível remover o papel." }, 500);
    }

    // Sem isso, revogar o papel ativo quebrava a troca de perfil sem logout
    // (Fase 17): a conta continuava "logada" nesse papel do ponto de vista
    // de `profiles.role`, mas sem entitlement pra voltar a ele
    // (`switch_active_role` passaria a rejeitar com `role_not_available`).
    // Troca automaticamente pro primeiro papel remanescente da conta.
    if (profile?.role === role) {
      const remaining = (rolesData ?? [])
        .map((r) => r.role as string)
        .filter((r) => r !== role);
      const nextRole = remaining[0];
      if (nextRole) {
        await supabase
          .from("profiles")
          .update({ role: nextRole })
          .eq("id", targetId);
      }
    }

    return c.json({ success: true });
  },
);

// ── Secretária — só no pacote empresarial (Fase 18) ───────────────────────
// Quem convida é o próprio dono da clínica (psicólogo) ou um admin — não é
// uma ação de plataforma como as de cima, é uma decisão de equipe da
// própria clínica. A trava de plano de verdade mora no banco
// (`enforce_secretary_plan_gate`, Fase 18); a checagem aqui é só pra dar uma
// mensagem amigável antes de gastar um convite por e-mail.
app.post(
  "/make-server-a65fd448/clinic/secretary/invite",
  requireRole("psychologist", "admin"),
  async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json().catch(() => ({}));
      const email = String(body?.email ?? "").trim();
      const fullName = String(body?.full_name ?? "").trim();

      if (!email || !fullName) {
        return c.json({ error: "Nome e e-mail são obrigatórios." }, 400);
      }
      if (!user.clinicId) {
        return c.json(
          { error: "Nenhuma clínica vinculada a esta conta." },
          400,
        );
      }

      const { data: clinic } = await supabase
        .from("clinics")
        .select("plan")
        .eq("id", user.clinicId)
        .maybeSingle();

      if (clinic?.plan !== "clinic") {
        return c.json({ error: "secretary_requires_business_plan" }, 403);
      }

      const { data: invited, error: inviteErr } =
        await supabase.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: getRedirectOrigin(c),
        });

      if (inviteErr) {
        const message = (inviteErr.message || "").includes("already")
          ? "Já existe uma conta com este e-mail."
          : inviteErr.message;
        return c.json({ error: message }, 400);
      }

      const newUserId = invited?.user?.id;
      if (!newUserId) {
        return c.json(
          { error: "Falha ao criar o acesso da secretária." },
          500,
        );
      }

      // Dispara `handle_new_user()` -> profiles com role padrão 'patient' ->
      // aqui promovemos a 'secretary' e vinculamos à clínica de quem
      // convidou. `enforce_secretary_plan_gate` (Fase 18) valida de novo, no
      // banco, que essa clínica está no plano certo — dupla checagem de
      // propósito, a de cima só existe pra dar erro amigável mais cedo.
      const { error: roleErr } = await supabase
        .from("profiles")
        .update({ role: "secretary", clinic_id: user.clinicId })
        .eq("id", newUserId);

      if (roleErr) {
        console.error("Failed to set secretary role:", roleErr);
        await supabase.auth.admin.deleteUser(newUserId);
        const message = roleErr.message.includes("secretary_requires_business_plan")
          ? "secretary_requires_business_plan"
          : "Não foi possível concluir o convite.";
        return c.json({ error: message }, message === "secretary_requires_business_plan" ? 403 : 500);
      }

      // A mesma passagem transitória por 'patient' que o cadastro de
      // psicólogo já tinha (Fase 17) — limpa pra não sobrar um papel que
      // essa conta nunca teve de verdade.
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", newUserId)
        .eq("role", "patient");

      return c.json({ success: true, invited_email: email });
    } catch (err: any) {
      console.error("Failed to invite secretary:", err);
      return c.json(
        { error: err?.message ?? "Erro ao convidar secretária." },
        500,
      );
    }
  },
);

// ── Vincular uma conta de secretária já existente (Fase 21) ──────────────
// Mesmo raciocínio do /patients/link-existing: conceder o papel
// "secretária" pela aba Admin → Usuários não vincula a nenhuma clínica —
// de propósito, essa decisão é de cada clínica. Só o próprio dono da
// clínica reivindica essa conta como sua secretária, pelo e-mail (não o
// admin geral — por isso não está em requireRole aqui).
app.post(
  "/make-server-a65fd448/clinic/secretary/link-existing",
  requireRole("psychologist"),
  async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json().catch(() => ({}));
      const email = String(body?.email ?? "").trim();

      if (!email) {
        return c.json(
          { error: "Informe o e-mail da conta a vincular." },
          400,
        );
      }
      if (!user.clinicId) {
        return c.json(
          { error: "Nenhuma clínica vinculada a esta conta." },
          400,
        );
      }

      const { data: clinic } = await supabase
        .from("clinics")
        .select("plan")
        .eq("id", user.clinicId)
        .maybeSingle();

      if (clinic?.plan !== "clinic") {
        return c.json({ error: "secretary_requires_business_plan" }, 403);
      }

      const { data: target, error: findErr } = await supabase
        .from("profiles")
        .select("id, role, clinic_id, email")
        .eq("email", email)
        .maybeSingle();

      if (findErr || !target) {
        return c.json(
          { error: "Nenhuma conta encontrada com este e-mail." },
          404,
        );
      }
      if (target.role !== "secretary") {
        return c.json(
          {
            error:
              "Esta conta não tem o papel de secretária. Peça para um administrador conceder o papel a ela primeiro (Painel Admin → Usuários).",
          },
          400,
        );
      }
      if (target.clinic_id) {
        return c.json(
          {
            error:
              target.clinic_id === user.clinicId
                ? "Esta conta já está vinculada à sua clínica."
                : "Esta conta já está vinculada a outra clínica.",
          },
          409,
        );
      }

      const { error: linkErr } = await supabase
        .from("profiles")
        .update({ clinic_id: user.clinicId })
        .eq("id", target.id);

      if (linkErr) {
        const message = linkErr.message.includes(
          "secretary_requires_business_plan",
        )
          ? "secretary_requires_business_plan"
          : linkErr.message;
        return c.json(
          { error: message },
          message === "secretary_requires_business_plan" ? 403 : 500,
        );
      }

      return c.json({ success: true, linked_email: target.email ?? email });
    } catch (err: any) {
      console.error("Failed to link existing secretary:", err);
      return c.json(
        { error: err?.message ?? "Erro ao vincular secretária." },
        500,
      );
    }
  },
);

// ── Remover acesso de uma secretária (Fase 18) ────────────────────────────
// Só o dono da clínica dela (ou um admin) pode remover — comparação por
// `clinic_id` evita que um psicólogo remova a secretária de outra clínica.
app.delete(
  "/make-server-a65fd448/clinic/secretary/:id",
  requireRole("psychologist", "admin"),
  async (c) => {
    const user = c.get("user");
    const targetId = c.req.param("id");

    const { data: target } = await supabase
      .from("profiles")
      .select("clinic_id, role")
      .eq("id", targetId)
      .maybeSingle();

    if (!target || target.role !== "secretary") {
      return c.json({ error: "Secretária não encontrada." }, 404);
    }
    if (user.role !== "admin" && target.clinic_id !== user.clinicId) {
      return c.json({ error: "Sem permissão para esta conta." }, 403);
    }

    // Some com o papel ativo (volta pra 'patient', o padrão neutro) e com o
    // direito de assumi-lo de novo — remover mesmo, não só trocar de tela.
    const { error } = await supabase
      .from("profiles")
      .update({ role: "patient", clinic_id: null })
      .eq("id", targetId);

    if (error) {
      console.error("Failed to remove secretary access:", error);
      return c.json({ error: "Não foi possível remover o acesso." }, 500);
    }

    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", targetId)
      .eq("role", "secretary");

    return c.json({ success: true });
  },
);

Deno.serve(app.fetch);
