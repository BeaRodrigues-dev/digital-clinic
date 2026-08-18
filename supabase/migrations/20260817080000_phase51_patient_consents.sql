-- Fase 51 — TCLE (Termo de Consentimento Livre e Esclarecido) registrado
-- de verdade: paciente lê e aceita explicitamente pelo próprio Portal do
-- Paciente (não por e-mail/WhatsApp — nenhum provedor de envio é garantido
-- configurado nesta instalação, e o aceite dentro do próprio app é, na
-- prática, mais confiável do que confiar que um e-mail foi lido). O
-- aceite é gravado com data/hora, e-mail no momento do aceite e IP —
-- sempre pelo backend (ver rota /consents/accept), nunca aceitando o IP
-- que o cliente mandasse manualmente.
--
-- `consent_type` cobre os dois TCLEs do checklist: o termo geral de
-- entrada e o específico de atendimento online (Resolução CFP Nº
-- 011/2018/e-Psi) — mesma estrutura de dado, texto diferente.
create table public.patient_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  consent_type text not null check (
    consent_type in ('general_tcle', 'online_therapy')
  ),
  accepted_at timestamptz not null default now(),
  email_snapshot text,
  ip_address text,
  created_at timestamptz not null default now()
);

create function public.set_patient_consent_professional_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select professional_id into new.professional_id
  from public.patients
  where id = new.patient_id;

  if new.professional_id is null then
    raise exception 'patient not found';
  end if;

  return new;
end;
$$;

create trigger trg_set_patient_consent_professional_id
  before insert on public.patient_consents
  for each row execute procedure public.set_patient_consent_professional_id();

alter table public.patient_consents enable row level security;

-- Sem policy de INSERT pro papel 'patient' aqui de propósito: o aceite
-- sempre passa pela rota /consents/accept (service role), que é quem
-- resolve o IP de verdade — um INSERT direto do cliente não teria como
-- provar o IP.
create policy "patient_consents: paciente vê os próprios aceites"
  on public.patient_consents for select
  to authenticated
  using (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "patient_consents: profissional vê os aceites dos próprios pacientes"
  on public.patient_consents for select
  to authenticated
  using (professional_id = auth.uid());

create policy "patient_consents: admin vê tudo"
  on public.patient_consents for select
  to authenticated
  using (public.current_role() = 'admin');

create index if not exists patient_consents_patient_idx
  on public.patient_consents (patient_id, consent_type);
