-- ============================================================================
-- Fase 8 — Área do paciente
--
-- Dois mecanismos de segurança específicos para o paciente acessar seus
-- próprios dados sem nunca conseguir ler ou escrever o que não é dele:
--
-- 1. `patient_own_profile`: view (sem RLS própria, roda com o privilégio de
--    quem a criou) que expõe apenas as colunas seguras de `patients` —
--    nome, e-mail, telefone, status — filtrando explicitamente pelo
--    paciente logado. Propositalmente NÃO expõe `notes` nem `tags`, que são
--    anotações internas do profissional sobre o paciente.
--
-- 2. `patient_set_appointment_status`: função SECURITY DEFINER que deixa o
--    paciente confirmar ou cancelar (só isso) uma consulta que é dele. Não
--    damos ao paciente uma policy de UPDATE direta na tabela `appointments`
--    porque RLS restringe linhas, não colunas — uma policy de UPDATE
--    deixaria o paciente reescrever qualquer coluna da própria consulta
--    (inclusive horário, notas do profissional etc.), não só o status.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create view public.patient_own_profile as
  select id, full_name, email, phone, status
  from public.patients
  where patient_user_id = auth.uid();

grant select on public.patient_own_profile to authenticated;

create function public.patient_set_appointment_status(
  p_appointment_id uuid,
  p_new_status text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_patient_id uuid;
begin
  if p_new_status not in ('confirmed', 'cancelled') then
    raise exception 'invalid status';
  end if;

  select patient_id into v_patient_id
  from public.appointments
  where id = p_appointment_id;

  if v_patient_id is null then
    raise exception 'appointment not found';
  end if;

  if not exists (
    select 1 from public.patients
    where id = v_patient_id and patient_user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  update public.appointments
  set status = p_new_status, updated_at = now()
  where id = p_appointment_id;
end;
$$;

grant execute on function public.patient_set_appointment_status(uuid, text) to authenticated;
