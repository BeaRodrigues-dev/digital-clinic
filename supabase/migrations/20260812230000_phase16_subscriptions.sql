-- ============================================================================
-- Fase 16 — Estrutura de assinaturas (preparada para cobrança recorrente)
--
-- IMPORTANTE: nenhuma cobrança real acontece ainda. Não há gateway de
-- pagamento configurado (Stripe ou outro) — esta migração só prepara a
-- ARQUITETURA pra quando houver: entidade de assinatura, estados possíveis,
-- e os campos que um gateway real vai precisar preencher (stripe_customer_id,
-- stripe_subscription_id, current_period_end...).
--
-- Relação com `clinics.plan` (Fase 10): `clinics.plan` continua sendo a
-- ÚNICA fonte de verdade sobre "qual plano vale agora" — é nela que o
-- gatilho de limite de pacientes (Fase 10) e qualquer outro enforcement já
-- olham, e continua assim. `subscriptions` é um registro complementar (o
-- "extrato"/histórico da assinatura: status, datas, IDs do gateway) — não
-- substitui nem duplica `clinics.plan`, só guarda o que `clinics.plan`
-- sozinho não tem espaço pra guardar. Um gatilho mantém as duas coisas em
-- sincronia automaticamente sempre que o plano da clínica muda.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create type public.subscription_status as enum (
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete'
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  plan public.plan_tier not null,
  status public.subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  -- Preenchido quando existir cobrança recorrente de verdade. Enquanto não
  -- houver, fica null — o frontend trata null como "sem cobrança agendada"
  -- em vez de inventar uma data.
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Preenchidos pelo webhook do gateway de pagamento no dia em que existir
  -- um. Hoje ficam sempre null.
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id)
);

alter table public.subscriptions enable row level security;

-- Só leitura direta pelo dono da clínica ou por admin. De propósito NÃO
-- existe nenhuma policy de INSERT/UPDATE/DELETE pra 'authenticated' — uma
-- assinatura não é algo que o próprio usuário deveria conseguir escrever
-- direto (isso é exatamente o tipo de escrita que precisa vir de um
-- backend/webhook confiável, nunca do navegador). Por enquanto, quem
-- escreve aqui é só o gatilho abaixo (roda como o dono da migração) e, no
-- futuro, o webhook do gateway de pagamento (rodando com a service role,
-- que ignora RLS).
create policy "subscriptions: dono vê a própria assinatura" on public.subscriptions
  for select using (
    clinic_id in (select id from public.clinics where owner_id = auth.uid())
  );
create policy "subscriptions: admin vê tudo" on public.subscriptions
  for select using (public.current_role() = 'admin');

-- ── Sincronização automática com clinics.plan ───────────────────────────
-- Sempre que o plano de uma clínica muda (hoje: troca self-service em
-- Configurações → Plano; no futuro: também via webhook de pagamento),
-- garante que exista uma linha de assinatura refletindo isso — sem exigir
-- que o código que troca o plano (`PlanView`, `SignupForm`) saiba nada
-- sobre a tabela `subscriptions`.
create or replace function public.sync_subscription_from_clinic_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.subscriptions (clinic_id, plan, status, started_at)
  values (new.id, new.plan, 'active', now())
  on conflict (clinic_id) do update
  set
    plan = excluded.plan,
    status = 'active',
    started_at = case
      when public.subscriptions.plan <> excluded.plan then now()
      else public.subscriptions.started_at
    end,
    cancel_at_period_end = false,
    updated_at = now();
  return new;
end;
$$;

create trigger trg_sync_subscription_from_clinic_plan
  after insert or update of plan on public.clinics
  for each row execute procedure public.sync_subscription_from_clinic_plan();

-- Backfill: cria a linha de assinatura pra clínicas que já existiam antes
-- desta migração.
insert into public.subscriptions (clinic_id, plan, status, started_at)
select id, plan, 'active', created_at
from public.clinics
on conflict (clinic_id) do nothing;
