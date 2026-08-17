-- Fase 48 — três tipos de documento que faltavam no gerador (Fase 24):
-- laudo psicológico, parecer psicológico e TCI (Termo de Consentimento
-- Informado) — cada um com estrutura/finalidade própria pela Resolução
-- CFP Nº 06/2019, diferentes do "relatório psicológico" que já existia.
--
-- O check constraint original não tinha nome explícito (Postgres gerou um
-- automático na criação da tabela, Fase 24) — em vez de arriscar adivinhar
-- o nome, este bloco descobre o constraint de verdade pelo catálogo antes
-- de trocar.
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.psychological_documents'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%doc_type%';

  if con_name is not null then
    execute format(
      'alter table public.psychological_documents drop constraint %I',
      con_name
    );
  end if;
end $$;

alter table public.psychological_documents
  add constraint psychological_documents_doc_type_check
  check (
    doc_type in (
      'psychological_report',
      'referral',
      'attendance_declaration',
      'medical_certificate',
      'psychological_appraisal',
      'professional_opinion',
      'informed_consent'
    )
  );
