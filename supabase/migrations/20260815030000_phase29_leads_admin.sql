-- Fase 29 — tela de administração pra leads do quiz + indicadores de
-- pendências nos menus (Solicitações e Leads).
--
-- `quiz_leads` (Fase 23) guardava os dados certinho, mas não tinha pra onde
-- ir dentro do site — só dava pra consultar direto no painel do Supabase.
-- Pra existir uma tela de admin que lista os leads e deixa marcar "já
-- contatei", falta uma coluna de status (só tinha insert público e select
-- de admin, nenhum update).
alter table public.quiz_leads
  add column status text not null default 'pending' check (status in ('pending', 'contacted'));

create policy "quiz_leads: admin atualiza status"
  on public.quiz_leads for update
  to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create index if not exists quiz_leads_status_idx on public.quiz_leads (status);
