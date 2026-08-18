-- Fase 52 — autorização de responsável legal para paciente menor de idade.
--
-- Guarda a marcação de "menor de idade" e os dados do responsável
-- diretamente em `patients` (mesmo padrão do contato de emergência da
-- Fase 40): quem cadastra o paciente é o profissional/secretária, então
-- não precisa de tabela separada nem de policy nova — as policies que já
-- existem em `patients` cobrem as colunas novas também.
--
-- O aceite em si do responsável reaproveita a estrutura de TCLE da Fase
-- 51 (`patient_consents`), com um terceiro `consent_type`:
-- 'guardian_authorization'. Limitação honesta: como o paciente menor pode
-- não ter e-mail/login próprio, quem loga no Portal do Paciente e aceita
-- esse termo, na prática, costuma ser o próprio responsável usando o
-- acesso do paciente — o texto do termo (i18n) deixa isso explícito e
-- pede que seja o responsável quem leia e aceite.
alter table public.patients
  add column if not exists is_minor boolean not null default false,
  add column if not exists guardian_name text,
  add column if not exists guardian_relationship text,
  add column if not exists guardian_contact text;

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.patient_consents'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%consent_type%';

  if con_name is not null then
    execute format(
      'alter table public.patient_consents drop constraint %I',
      con_name
    );
  end if;
end $$;

alter table public.patient_consents
  add constraint patient_consents_consent_type_check
  check (
    consent_type in ('general_tcle', 'online_therapy', 'guardian_authorization')
  );

-- `patient_own_profile` (Fase 8) precisa expor `is_minor` pro Portal do
-- Paciente saber se deve cobrar o terceiro aceite (autorização do
-- responsável) além dos dois TCLEs da Fase 51. Não expõe os outros dados
-- do responsável aqui de propósito — o paciente/responsável já sabe esses
-- dados, e o gate de consentimento não precisa reexibi-los.
create or replace view public.patient_own_profile as
  select id, full_name, email, phone, status, is_minor
  from public.patients
  where patient_user_id = auth.uid();
