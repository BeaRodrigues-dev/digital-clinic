-- ============================================================================
-- Fase 19 — Secretária ganha acesso de verdade: agendar, cadastrar
-- pacientes e marcar pagamento como pago/pendente
--
-- Até aqui (Fase 18) a secretária só tinha SELECT — agenda e pacientes da
-- clínica, só leitura. Esta migração adiciona:
--   a) `patients`: INSERT (cadastrar paciente novo da própria clínica)
--   b) `appointments`: INSERT + UPDATE (agendar e reagendar/mudar status)
--   c) `payments`: SELECT + UPDATE — mas só `status`/`paid_at`. Valor,
--      paciente, profissional e consulta vinculados continuam travados; é
--      "marcar como pago/pendente", não a parte financeira inteira (isso
--      seguiu pedido explícito: secretária não edita valor nem vê
--      relatório de faturamento — só as ações do dia a dia dela).
--
-- Todas as novas policies usam `current_clinic_id()` (a função SECURITY
-- DEFINER criada na correção da Fase 18) em vez de subselect cru — mesma
-- razão de sempre: subselect cru é seguro em policies de OUTRAS tabelas,
-- mas perigoso dentro de uma policy da própria `profiles`. Aqui não é o
-- caso (as tabelas protegidas são patients/appointments/payments), mas
-- manter o mesmo helper evita reintroduzir o padrão problemático em outro
-- lugar por engano.
--
-- Como aplicar:
--   supabase db push
-- ============================================================================

-- Quem é o profissional dono da clínica da secretária que está logada —
-- hoje toda clínica tem exatamente 1 profissional (Fase 9), então isso
-- resolve "em nome de quem a secretária está cadastrando/agendando".
create function public.current_clinic_professional_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.profiles
  where clinic_id = public.current_clinic_id() and role = 'psychologist'
  limit 1;
$$;

-- ── patients: secretária cadastra ──
create policy "patients: secretária cadastra pacientes da própria clínica" on public.patients
  for insert with check (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
    and professional_id = public.current_clinic_professional_id()
  );

-- ── appointments: secretária agenda e atualiza ──
create policy "appointments: secretária agenda consultas da própria clínica" on public.appointments
  for insert with check (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
    and professional_id = public.current_clinic_professional_id()
  );

create policy "appointments: secretária reagenda/atualiza consultas da própria clínica" on public.appointments
  for update using (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  ) with check (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  );

-- ── payments: secretária vê e marca pago/pendente, só isso ──
create policy "payments: secretária vê pagamentos da própria clínica" on public.payments
  for select using (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  );

create policy "payments: secretária marca pago/pendente" on public.payments
  for update using (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  ) with check (
    public.current_role() = 'secretary'
    and clinic_id = public.current_clinic_id()
  );

-- A policy de UPDATE acima libera a linha inteira (RLS não restringe
-- coluna); esta trava, à parte, garante que — quando quem está editando é
-- a secretária — só `status`/`paid_at` realmente mudam. Valor, paciente,
-- profissional, consulta vinculada e clínica ficam intocáveis por ela.
create or replace function public.protect_payment_fields_from_secretary()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.current_role() = 'secretary' then
    if new.amount is distinct from old.amount
      or new.patient_id is distinct from old.patient_id
      or new.professional_id is distinct from old.professional_id
      or new.appointment_id is distinct from old.appointment_id
      or new.clinic_id is distinct from old.clinic_id
    then
      raise exception 'secretary_cannot_edit_payment_details';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_payment_fields_from_secretary
  before update on public.payments
  for each row execute procedure public.protect_payment_fields_from_secretary();
