-- Fase 24 — criação de documentos psicológicos (relatório, encaminhamento,
-- declaração de comparecimento, atestado) com auxílio de IA, dentro do
-- Prontuário.
--
-- Tabela separada de `clinical_records` de propósito: prontuário é a
-- anotação clínica de cada sessão (privada + compartilhável), enquanto um
-- documento aqui é uma peça formal e independente (pode ser gerada sem
-- referência a nenhuma sessão específica, editada livremente pelo
-- profissional antes de salvar, e potencialmente reaproveitada/reimpressa
-- depois). Mesma política de acesso do prontuário — só o profissional dono e
-- o admin enxergam; de propósito NÃO existe (e não deve ser criada) nenhuma
-- policy de SELECT pro papel 'patient' aqui, pelo mesmo motivo do
-- `clinical_records`: RLS restringe linhas, não colunas, e o conteúdo pode
-- trazer informação clínica sensível não destinada ao paciente.
create table public.psychological_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  doc_type text not null check (
    doc_type in (
      'psychological_report',
      'referral',
      'attendance_declaration',
      'medical_certificate'
    )
  ),
  title text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.psychological_documents enable row level security;

create policy "psychological_documents: profissional gerencia os próprios documentos"
  on public.psychological_documents for all
  using (professional_id = auth.uid());

create policy "psychological_documents: admin gerencia tudo"
  on public.psychological_documents for all
  using (public.current_role() = 'admin');

create index if not exists psychological_documents_patient_id_idx
  on public.psychological_documents (patient_id);

create index if not exists psychological_documents_professional_id_idx
  on public.psychological_documents (professional_id);
