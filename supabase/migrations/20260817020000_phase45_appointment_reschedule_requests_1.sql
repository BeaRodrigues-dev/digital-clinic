-- Fase 45 — remarcação de consulta pelo portal do paciente. Até aqui o
-- paciente só podia confirmar ou cancelar (Fase 8, `patient_set_appointment_
-- status`) — não existia nenhum jeito de pedir uma data/hora diferente sem
-- sair do sistema (ligar, mandar mensagem).
--
-- Fica como PEDIDO, não como remarcação direta: o paciente propõe uma nova
-- data/hora, o profissional (ou secretária da clínica) aceita ou recusa. A
-- consulta em `appointments` só muda de horário quando alguém do lado do
-- profissional aceitar — evita paciente sobrescrever a agenda sem o
-- profissional saber, e evita conflito de horário sem ninguém revisando.
--
-- Tabela nova (não reaproveita `booking_requests` da Fase 25): aquela é
-- pedido de contato de visitante anônimo pra virar paciente, esta é pedido
-- de um paciente JÁ cadastrado sobre uma consulta que já existe — dados e
-- ciclo de vida diferentes.
create table public.appointment_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  requested_starts_at timestamptz not null,
  requested_ends_at timestamptz not null,
  message text,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.appointment_reschedule_requests enable row level security;

-- Preenche professional_id/clinic_id a partir da própria consulta —
-- mesmo princípio da Fase 19/25: dado de roteamento/RLS derivado no
-- servidor, nunca aceito direto do cliente.
create function public.set_reschedule_request_routing()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select professional_id, clinic_id
    into new.professional_id, new.clinic_id
  from public.appointments
  where id = new.appointment_id;

  if new.professional_id is null then
    raise exception 'appointment not found';
  end if;

  return new;
end;
$$;

create trigger trg_set_reschedule_request_routing
  before insert on public.appointment_reschedule_requests
  for each row execute procedure public.set_reschedule_request_routing();

-- Paciente cria pedido só pra consulta que é dele.
create policy "appointment_reschedule_requests: paciente cria pedido pra própria consulta"
  on public.appointment_reschedule_requests for insert
  to authenticated
  with check (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
    and exists (
      select 1 from public.appointments
      where id = appointment_id and patient_id = appointment_reschedule_requests.patient_id
    )
  );

-- Paciente vê os próprios pedidos.
create policy "appointment_reschedule_requests: paciente vê os próprios pedidos"
  on public.appointment_reschedule_requests for select
  to authenticated
  using (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

-- Paciente só pode desistir de um pedido próprio ainda pendente — o
-- `with check` trava o novo valor em 'cancelled' de propósito, pra um
-- paciente não conseguir se auto-aprovar mudando o status pra 'accepted'.
create policy "appointment_reschedule_requests: paciente cancela o próprio pedido pendente"
  on public.appointment_reschedule_requests for update
  to authenticated
  using (
    status = 'pending'
    and patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  )
  with check (
    status = 'cancelled'
    and patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "appointment_reschedule_requests: profissional gerencia pedidos da própria agenda"
  on public.appointment_reschedule_requests for all
  to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "appointment_reschedule_requests: secretária gerencia pedidos da própria clínica"
  on public.appointment_reschedule_requests for all
  to authenticated
  using (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  )
  with check (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  );

create policy "appointment_reschedule_requests: admin gerencia tudo"
  on public.appointment_reschedule_requests for all
  to authenticated
  using (public.current_role() = 'admin');

create index if not exists appointment_reschedule_requests_appointment_idx
  on public.appointment_reschedule_requests (appointment_id);
create index if not exists appointment_reschedule_requests_professional_idx
  on public.appointment_reschedule_requests (professional_id, status);
create index if not exists appointment_reschedule_requests_patient_idx
  on public.appointment_reschedule_requests (patient_id);
