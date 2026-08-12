-- ============================================================================
-- Fase 1 — Fundação de contas e banco de dados
-- Cria: papéis de usuário, clínicas, profissionais, pacientes, agenda,
-- prontuário e pagamentos, com Row Level Security por papel.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Papéis de usuário ────────────────────────────────────────────────────
create type public.user_role as enum ('admin', 'psychologist', 'secretary', 'patient');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.payment_status as enum ('pending', 'paid', 'overdue');

-- ── Clínicas ─────────────────────────────────────────────────────────────
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  public_info jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Perfis (1:1 com auth.users) ─────────────────────────────────────────
-- Todo usuário autenticado ganha uma linha aqui automaticamente (trigger
-- abaixo). O papel padrão é 'patient' — promoções para admin/psicólogo/
-- secretária são feitas manualmente (ver instruções de deploy).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'patient',
  clinic_id uuid references public.clinics (id) on delete set null,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Profissionais ────────────────────────────────────────────────────────
-- Substitui, para contas com login real, o diretório hoje guardado no
-- key-value store (psych:*). A migração dos dados existentes acontece numa
-- fase seguinte, sem risco para o diretório público atual.
create table public.professionals (
  id uuid primary key references public.profiles (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  title text default 'Psicólogo(a)',
  location text,
  flag text default '🇧🇷',
  specialties text[] default '{}',
  approach text,
  sessions_info text default 'Online · Português',
  photo_url text,
  years integer default 1,
  rating numeric(2,1) default 5.0,
  crp text,
  approved boolean not null default false,
  session_price numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Pacientes ────────────────────────────────────────────────────────────
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  patient_user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  notes text,
  tags text[] default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Agenda ───────────────────────────────────────────────────────────────
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  recurrence_rule text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Prontuário ───────────────────────────────────────────────────────────
-- private_notes: só o profissional (e admin) veem.
-- shared_notes: podem ser expostas ao paciente (fase da área do paciente).
create table public.clinical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  session_date date not null default current_date,
  private_notes text,
  shared_notes text,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Pagamentos ───────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  amount numeric(10,2) not null,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.clinical_records enable row level security;
alter table public.payments enable row level security;

-- Helper: papel do usuário autenticado atual
create function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── profiles ──
create policy "profiles: usuário vê/edita o próprio perfil" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: usuário atualiza o próprio perfil" on public.profiles
  for update using (id = auth.uid());
create policy "profiles: admin vê tudo" on public.profiles
  for select using (public.current_role() = 'admin');
create policy "profiles: admin edita tudo" on public.profiles
  for update using (public.current_role() = 'admin');

-- ── professionals ──
create policy "professionals: diretório público (aprovados)" on public.professionals
  for select using (approved = true);
create policy "professionals: dono vê/edita o próprio perfil" on public.professionals
  for select using (id = auth.uid());
create policy "professionals: dono edita o próprio perfil" on public.professionals
  for update using (id = auth.uid());
create policy "professionals: admin gerencia tudo" on public.professionals
  for all using (public.current_role() = 'admin');

-- ── patients ──
create policy "patients: profissional vê os próprios pacientes" on public.patients
  for select using (professional_id = auth.uid());
create policy "patients: profissional gerencia os próprios pacientes" on public.patients
  for all using (professional_id = auth.uid());
create policy "patients: secretária vê pacientes da clínica" on public.patients
  for select using (
    public.current_role() = 'secretary'
    and clinic_id = (select clinic_id from public.profiles where id = auth.uid())
  );
create policy "patients: admin gerencia tudo" on public.patients
  for all using (public.current_role() = 'admin');

-- ── appointments ──
create policy "appointments: profissional gerencia a própria agenda" on public.appointments
  for all using (professional_id = auth.uid());
create policy "appointments: secretária vê agenda da clínica" on public.appointments
  for select using (
    public.current_role() = 'secretary'
    and clinic_id = (select clinic_id from public.profiles where id = auth.uid())
  );
create policy "appointments: paciente vê as próprias consultas" on public.appointments
  for select using (
    patient_id in (select id from public.patients where patient_user_id = auth.uid())
  );
create policy "appointments: admin gerencia tudo" on public.appointments
  for all using (public.current_role() = 'admin');

-- ── clinical_records ──
-- Só o profissional dono e o admin têm acesso à tabela — inclui private_notes,
-- que NUNCA deve ser exposta ao paciente. De propósito, não existe (e não deve
-- ser criada) nenhuma policy de SELECT para o papel 'patient' nesta tabela:
-- RLS restringe linhas, não colunas, e uma policy aqui vazaria private_notes.
create policy "clinical_records: profissional gerencia os próprios registros" on public.clinical_records
  for all using (professional_id = auth.uid());
create policy "clinical_records: admin gerencia tudo" on public.clinical_records
  for all using (public.current_role() = 'admin');

-- View sem RLS (roda com o privilégio de quem a criou, não do paciente) que
-- expõe só as colunas seguras, filtrando explicitamente pelo paciente logado.
-- É o único jeito do paciente enxergar suas evoluções compartilhadas.
create view public.patient_visible_records as
  select id, patient_id, professional_id, session_date, shared_notes, created_at
  from public.clinical_records
  where patient_id in (
    select id from public.patients where patient_user_id = auth.uid()
  );

grant select on public.patient_visible_records to authenticated;

-- ── payments ──
create policy "payments: profissional gerencia os próprios pagamentos" on public.payments
  for all using (professional_id = auth.uid());
create policy "payments: paciente vê os próprios pagamentos" on public.payments
  for select using (
    patient_id in (select id from public.patients where patient_user_id = auth.uid())
  );
create policy "payments: admin gerencia tudo" on public.payments
  for all using (public.current_role() = 'admin');

-- ── clinics ──
create policy "clinics: membros veem a própria clínica" on public.clinics
  for select using (
    id = (select clinic_id from public.profiles where id = auth.uid())
  );
create policy "clinics: admin gerencia tudo" on public.clinics
  for all using (public.current_role() = 'admin');
