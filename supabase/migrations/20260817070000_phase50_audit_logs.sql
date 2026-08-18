-- Fase 50 — log de auditoria (Audit Trail) pras ações mais sensíveis sobre
-- prontuário e documentos: quem criou, editou, excluiu ou assinou, e
-- quando. Guarda só METADADO (ação, tipo de recurso, id, paciente) — nunca
-- o conteúdo da anotação em si, que continua só na tabela original e só
-- visível ao profissional dono (Fase 49).
--
-- Sem policy de UPDATE/DELETE de propósito: log de auditoria imutável —
-- uma vez inserido, ninguém (nem admin) consegue alterar ou apagar uma
-- entrada.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  action text not null check (
    action in ('create', 'update', 'delete', 'lock', 'export')
  ),
  resource_type text not null check (
    resource_type in ('clinical_record', 'psychological_document')
  ),
  resource_id uuid not null,
  patient_id uuid references public.patients (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- Insere só em nome de si mesmo — `with check` trava `actor_id` em
-- `auth.uid()`, sem confiar em nada que o cliente mande manualmente ali.
create policy "audit_logs: autenticado registra a própria ação"
  on public.audit_logs for insert
  to authenticated
  with check (actor_id = auth.uid());

create policy "audit_logs: profissional vê os próprios logs"
  on public.audit_logs for select
  to authenticated
  using (actor_id = auth.uid());

-- Admin continua enxergando METADADO de auditoria (quem fez o quê, quando)
-- mesmo depois de perder acesso ao conteúdo clínico na Fase 49 — são
-- coisas diferentes: isto aqui não expõe nenhuma anotação.
create policy "audit_logs: admin vê tudo"
  on public.audit_logs for select
  to authenticated
  using (public.current_role() = 'admin');

create index if not exists audit_logs_resource_idx
  on public.audit_logs (resource_type, resource_id);
create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);
