-- Fase 49 — restringir o acesso do admin da plataforma às anotações
-- clínicas, por decisão explícita (checklist de conformidade CFP/LGPD:
-- "só o profissional responsável pode ler o prontuário"). Remove o bypass
-- "admin gerencia tudo" que existia em `clinical_records` desde a Fase 1 —
-- daqui pra frente, só o profissional dono do atendimento enxerga o
-- conteúdo (`private_notes`/`shared_notes`). Nenhuma tela do admin hoje
-- depende disso (confirmado: nenhuma AdminView consulta clinical_records;
-- as rotas de IA no backend usam service role + filtro manual por
-- professional_id, não RLS, então não são afetadas).
drop policy "clinical_records: admin gerencia tudo" on public.clinical_records;

-- Sem o bypass do admin pra corrigir um prontuário já assinado (Fase 38),
-- o profissional dono passa a poder acrescentar um ADENDO a um registro
-- travado — sem reabrir/editar o conteúdo original, texto acrescentado
-- com autor e data, nunca apagando o que já foi assinado. É exatamente o
-- "audit trail com adendo, sem apagar o texto original" pedido no
-- checklist (Resolução CFP Nº 004/2019).
-- `professional_id` tem default `auth.uid()` de propósito: o frontend só
-- manda `clinical_record_id` + `content`, sem precisar saber o próprio
-- user id — mesmo espírito de não confiar em nada que o cliente mandasse
-- manualmente pra esse campo.
create table public.clinical_record_amendments (
  id uuid primary key default gen_random_uuid(),
  clinical_record_id uuid not null references public.clinical_records (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade default auth.uid(),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.clinical_record_amendments enable row level security;

-- `with check` também confirma que o `clinical_record_id` informado é de
-- um registro que já é do próprio profissional — sem isso, bastaria
-- adivinhar/enumerar o id de um registro de outro profissional pra
-- pendurar um adendo nele.
create policy "clinical_record_amendments: profissional gerencia os próprios adendos"
  on public.clinical_record_amendments for all
  to authenticated
  using (professional_id = auth.uid())
  with check (
    professional_id = auth.uid()
    and exists (
      select 1 from public.clinical_records
      where id = clinical_record_id and professional_id = auth.uid()
    )
  );

create index if not exists clinical_record_amendments_record_idx
  on public.clinical_record_amendments (clinical_record_id);
