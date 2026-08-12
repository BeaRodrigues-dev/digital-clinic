-- ============================================================================
-- Fase 13 — Configurações (Conta / Preferências / Segurança) + autoatendimento
-- do paciente
--
-- A maior parte da Fase 13 é só reorganização de frontend (nova tela de
-- "Configurações" com abas, reaproveitando telas que já existiam: perfil
-- profissional, clínica, plano). A única peça nova de banco é esta: o
-- paciente hoje só consegue LER os próprios dados de contato
-- (`patient_own_profile`, Fase 8) — não existe nenhum jeito dele corrigir o
-- próprio nome/telefone/e-mail de contato se estiverem errados.
--
-- Mesmo padrão de segurança já usado em `patient_set_appointment_status`
-- (Fase 8): uma função SECURITY DEFINER bem estreita, que só altera essas 3
-- colunas na própria linha de `patients` — nunca uma policy de UPDATE
-- direta, que abriria `notes`/`tags` (anotações internas do profissional
-- sobre o paciente) pra edição.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create or replace function public.patient_update_own_contact_info(
  p_full_name text,
  p_phone text,
  p_email text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.patients
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    phone = p_phone,
    email = p_email,
    updated_at = now()
  where patient_user_id = auth.uid();

  if not found then
    raise exception 'patient record not found';
  end if;
end;
$$;

grant execute on function public.patient_update_own_contact_info(text, text, text) to authenticated;
