-- Fase 35 (parte 4/4 do "corrija tudo") — alicerce de LGPD: aceite de
-- termos no cadastro, e pedido (revisado por admin) de exclusão de conta.
-- IMPORTANTE: isto é um ponto de partida técnico, não aconselhamento
-- jurídico — não substitui revisão de um advogado antes de operar com
-- dados reais de pacientes.

-- 1) Registro de quando cada conta aceitou os Termos de Uso/Política de
-- Privacidade (checkbox agora obrigatório nos dois formulários de
-- cadastro público — psicólogo e secretária; ver rotas /signup/*).
alter table public.profiles
  add column terms_accepted_at timestamptz;

-- 2) Pedidos de exclusão de conta. NÃO é um "excluir minha conta" de
-- self-service — vira um pedido que um admin revisa manualmente (dados de
-- prontuário costumam ter obrigação legal de retenção mínima; decidir "dá
-- pra apagar agora" não é algo pra automatizar sem orientação jurídica).
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  role public.user_role not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'declined')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);

alter table public.account_deletion_requests enable row level security;

-- Qualquer pessoa autenticada pode pedir a exclusão da PRÓPRIA conta.
create policy "account_deletion_requests: usuário pede a própria exclusão"
  on public.account_deletion_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- Só o próprio usuário (pra acompanhar o próprio pedido) ou um admin (pra
-- revisar todos) podem ver.
create policy "account_deletion_requests: dono ou admin vê"
  on public.account_deletion_requests for select
  to authenticated
  using (user_id = auth.uid() or public.current_role() = 'admin');

-- Só admin decide o status (concluído/recusado) — o próprio usuário não
-- pode "auto-aprovar" a exclusão.
create policy "account_deletion_requests: só admin resolve"
  on public.account_deletion_requests for update
  to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status);
