-- ============================================================================
-- Fase 20 — Financeiro do admin: faturamento estimado por plano
--
-- Não existe cobrança automática configurada na plataforma ainda (ver
-- `plans.billingNote` no i18n) — os preços hoje são só texto ("Grátis" /
-- "Fale conosco"). Em vez de inventar uma integração de pagamento que não
-- existe, esta migração cria uma tabela simples pro admin registrar o
-- valor mensal de cada plano manualmente (começa em 0 pra todos); a tela
-- de Financeiro do admin multiplica isso pela contagem real de clínicas
-- em cada plano pra mostrar uma estimativa. Quando a cobrança de verdade
-- existir, essa mesma tabela pode virar a fonte de preço real sem
-- precisar mudar a tela.
--
-- Como aplicar:
--   supabase db push
-- ============================================================================

create table public.plan_prices (
  plan public.plan_tier primary key,
  monthly_price_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.plan_prices (plan) values ('free'), ('professional'), ('clinic');

alter table public.plan_prices enable row level security;

create policy "plan_prices: admin vê" on public.plan_prices
  for select using (public.current_role() = 'admin');

create policy "plan_prices: admin edita" on public.plan_prices
  for update using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
