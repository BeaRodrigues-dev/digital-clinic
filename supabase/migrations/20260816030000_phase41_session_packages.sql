-- Fase 41 — pacote de sessões: várias sessões pagas de uma vez só, item do
-- checklist financeiro que faltava ("pagos, pendentes, pacotes"). Até aqui
-- `payments` só sabia registrar UM valor por vez (pago/pendente/vencido) —
-- não existia nenhum jeito de dizer "este paciente comprou 10 sessões
-- adiantado" e ir abatendo o saldo conforme as sessões acontecem.
create table public.session_packages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  total_sessions integer not null check (total_sessions > 0),
  sessions_used integer not null default 0 check (sessions_used >= 0),
  amount numeric(10, 2) not null check (amount >= 0),
  purchased_at timestamptz not null default now(),
  notes text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.session_packages
  add constraint session_packages_used_within_total
  check (sessions_used <= total_sessions);

alter table public.session_packages enable row level security;

-- Mesmo escopo básico de `payments` na Fase 1 (dono do paciente + admin) —
-- sem reproduzir aqui, de propósito, todas as extensões que `payments`
-- ganhou depois (secretária, dono de clínica): pacote de sessões é uma
-- funcionalidade nova, não uma continuação direta de algo que essas outras
-- pessoas já mexiam; dá pra abrir esse acesso depois, se aparecer a
-- necessidade real.
create policy "session_packages: profissional gerencia os próprios"
  on public.session_packages for all
  to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "session_packages: admin gerencia tudo"
  on public.session_packages for all
  to authenticated
  using (public.current_role() = 'admin');

create index if not exists session_packages_patient_idx on public.session_packages (patient_id);
create index if not exists session_packages_professional_idx on public.session_packages (professional_id);
