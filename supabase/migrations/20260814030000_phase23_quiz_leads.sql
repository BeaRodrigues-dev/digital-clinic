-- Fase 23 — leads do quiz da Landing pública.
--
-- O formulário final do quiz ("me avise quando encontrar um psicólogo pra
-- mim") não tinha pra onde mandar o e-mail/nome digitados: os inputs eram
-- não controlados e o botão não tinha nenhuma ação — o visitante respondia
-- o quiz inteiro e o clique final não fazia nada. Esta tabela é o destino
-- real desses dados (nada de simular envio sem persistir).
--
-- Sem tela de administração ainda pra esses leads (fora do escopo desta
-- correção) — os dados ficam disponíveis pra consulta manual pelo painel do
-- Supabase até que uma tela dedicada seja construída.

create table if not exists public.quiz_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text not null,
  answers jsonb,
  created_at timestamptz not null default now()
);

alter table public.quiz_leads enable row level security;

-- Qualquer visitante (autenticado ou não) pode enviar o formulário — é o
-- quiz público da Landing, sem exigir login.
create policy "quiz_leads: qualquer visitante pode enviar"
  on public.quiz_leads for insert
  to anon, authenticated
  with check (true);

-- Só o admin consegue ler os leads.
create policy "quiz_leads: só admin vê"
  on public.quiz_leads for select
  to authenticated
  using (public.current_role() = 'admin');

-- Um prontuário por consulta, de verdade — o atalho de prontuário direto do
-- card da consulta na Agenda (Fase 22) buscava um registro existente antes
-- de decidir entre criar ou editar, mas sem nenhuma trava no banco nada
-- impedia duas inserções quase simultâneas (ou uma falha silenciosa na
-- busca) de gerarem dois prontuários pra mesma consulta. Índice único
-- parcial (só quando `appointment_id` não é nulo — prontuários avulsos sem
-- consulta vinculada continuam permitidos livremente).
create unique index if not exists clinical_records_appointment_id_unique
  on public.clinical_records (appointment_id)
  where appointment_id is not null;
