-- Fase 25 — "vitrine": visitante encontra um psicólogo no diretório público
-- da Landing e pede pra ser conectado com ele pra agendar.
--
-- Importante o que isto NÃO é: não é agendamento self-service em tempo real
-- (o visitante não escolhe um horário livre na agenda do profissional e não
-- cria uma consulta sozinho — isso exigiria expor a agenda a desconhecidos e
-- lidar com conflito de horário/spam, fora do escopo desta fase). O que
-- existe de verdade: o visitante manda nome/contato/mensagem pra um
-- profissional específico, o pedido cai na tela "Solicitações" do painel
-- dele (ou da secretária da clínica), e a partir daí quem já usa o sistema
-- decide contatar/recusar ou converter direto em paciente com as
-- ferramentas que já existem (cadastro de paciente, agenda).
--
-- `clinic_id` não vem do formulário público (não dá pra confiar no que o
-- navegador de um visitante anônimo manda) — é preenchido por trigger a
-- partir do próprio `professional_id`, igual ao paciente/consulta que a
-- secretária cria (mesmo princípio da Fase 19: dado sensível de
-- roteamento/RLS é derivado no servidor, nunca aceito direto do cliente).

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  preferred_period text check (
    preferred_period in ('morning', 'afternoon', 'evening', 'flexible')
  ),
  message text,
  status text not null default 'pending' check (
    status in ('pending', 'contacted', 'converted', 'declined')
  ),
  converted_patient_id uuid references public.patients (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_requests enable row level security;

-- Preenche clinic_id a partir do professional_id informado — sempre
-- sobrescreve o que vier do cliente (não existe caso legítimo de um
-- visitante público saber ou precisar mandar isso).
create function public.set_booking_request_clinic_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select clinic_id into new.clinic_id
  from public.professionals
  where id = new.professional_id;
  return new;
end;
$$;

create trigger trg_set_booking_request_clinic_id
  before insert on public.booking_requests
  for each row execute procedure public.set_booking_request_clinic_id();

-- Qualquer visitante (autenticado ou não) pode enviar — é o formulário
-- público "quero agendar" do perfil do profissional na Landing. Só trava
-- que o profissional de destino exista e esteja aprovado (mesma regra que
-- já decide quem aparece no diretório público, Fase 1).
create policy "booking_requests: qualquer visitante pode solicitar contato"
  on public.booking_requests for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.professionals
      where id = professional_id and approved = true
    )
  );

create policy "booking_requests: profissional gerencia as próprias solicitações"
  on public.booking_requests for all
  using (professional_id = auth.uid());

create policy "booking_requests: secretária vê solicitações da própria clínica"
  on public.booking_requests for select
  using (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  );

create policy "booking_requests: secretária atualiza status da própria clínica"
  on public.booking_requests for update
  using (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  ) with check (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  );

create policy "booking_requests: admin gerencia tudo"
  on public.booking_requests for all
  using (public.current_role() = 'admin');

create index if not exists booking_requests_professional_id_idx
  on public.booking_requests (professional_id);

create index if not exists booking_requests_clinic_id_idx
  on public.booking_requests (clinic_id);

create index if not exists booking_requests_status_idx
  on public.booking_requests (status);
