-- Fase 37 — gestão de repasses e comissões pra clínicas com mais de um
-- profissional (Fase 26, pacote empresarial). Até aqui não existia nenhum
-- jeito de registrar "a clínica fica com X% do que este profissional
-- recebe" nem de controlar quanto já foi repassado a ele — cada
-- profissional só via os próprios pagamentos (`payments`), sem nenhuma
-- divisão com a clínica.

-- 1) Percentual de comissão da clínica sobre o que cada profissional
-- recebe dos próprios pacientes.
--
-- Fica numa TABELA PRÓPRIA — não numa coluna em `professionals` — de
-- propósito: `professionals` tem uma policy "diretório público (aprovados)"
-- (`for select using (approved = true)`) sem nenhuma restrição de coluna,
-- então qualquer coisa adicionada como coluna ali fica visível pra
-- QUALQUER visitante do site (mesmo sem login) que peça essa coluna
-- explicitamente — RLS do Postgres restringe linha, não coluna. Comissão é
-- informação comercial entre a clínica e o profissional, não é pra
-- aparecer no diretório público. Ausência de linha = não configurado
-- ainda (equivalente ao null da coluna, sem precisar de coluna nullable).
create table public.professional_commissions (
  professional_id uuid primary key references public.professionals (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  commission_percent numeric(5, 2) not null check (commission_percent >= 0 and commission_percent <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.professional_commissions enable row level security;

-- Só o dono da clínica (ou admin) vê/define a comissão — mesmo cuidado da
-- Fase 19 com `payments`: não abrir isso pra todo mundo autenticado.
create policy "professional_commissions: dono da clínica gerencia"
  on public.professional_commissions for all
  to authenticated
  using (
    public.current_role() = 'admin'
    or clinic_id in (select id from public.clinics where owner_id = auth.uid())
  )
  with check (
    public.current_role() = 'admin'
    or clinic_id in (select id from public.clinics where owner_id = auth.uid())
  );

-- O profissional vê a PRÓPRIA comissão (pra saber quanto vai receber),
-- mas não pode alterá-la.
create policy "professional_commissions: profissional vê a própria"
  on public.professional_commissions for select
  to authenticated
  using (professional_id = auth.uid());

create index if not exists professional_commissions_clinic_idx on public.professional_commissions (clinic_id);

-- 2) Repasses — cada linha é um registro manual de "a clínica transferiu
-- (ou vai transferir) este valor pro profissional". NÃO movimenta dinheiro
-- de verdade (mesmo espírito de `payments`: é controle/registro, a
-- transferência em si acontece por fora, ex. PIX/transferência bancária) —
-- só ajuda a clínica a saber quanto já pagou e quanto ainda deve.
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  -- Percentual de comissão vigente no momento do registro — guardado aqui
  -- (não só lido de `professional_commissions`) pra manter o histórico
  -- correto mesmo se o percentual for renegociado depois.
  commission_percent_snapshot numeric(5, 2),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

alter table public.payouts enable row level security;

-- Só o dono da clínica (ou admin) registra/edita repasses — o profissional
-- não pode "se auto-declarar pago".
create policy "payouts: dono da clínica gerencia"
  on public.payouts for all
  to authenticated
  using (
    public.current_role() = 'admin'
    or clinic_id in (select id from public.clinics where owner_id = auth.uid())
  )
  with check (
    public.current_role() = 'admin'
    or clinic_id in (select id from public.clinics where owner_id = auth.uid())
  );

-- O profissional vê os PRÓPRIOS repasses (pra saber quanto já recebeu/tem a
-- receber), mas não pode alterar nada.
create policy "payouts: profissional vê os próprios"
  on public.payouts for select
  to authenticated
  using (professional_id = auth.uid());

create index if not exists payouts_professional_idx on public.payouts (professional_id);
create index if not exists payouts_clinic_idx on public.payouts (clinic_id);

-- 3) Pro dono da clínica calcular "quanto esse profissional já recebeu"
-- (base do cálculo de repasse), ele precisa enxergar os pagamentos
-- (`payments`) da equipe — hoje só existe policy de SELECT pra
-- secretária (Fase 19, via `payments.clinic_id`) e pro próprio
-- profissional dono do pagamento. Esta é nova: dono de clínica vê
-- pagamentos de qualquer profissional vinculado à própria clínica.
--
-- Importante: usa `professional_id` (via join com `professionals.clinic_id`),
-- não `payments.clinic_id` — esse campo existe na tabela mas nunca é
-- preenchido no INSERT feito pelo profissional (`FinanceView.handleSave`),
-- então uma policy baseada nele ficaria com resultado incompleto. Não é
-- escopo desta fase corrigir isso; a policy nova só evita depender do
-- campo não confiável.
create policy "payments: dono da clínica vê pagamentos da equipe"
  on public.payments for select
  to authenticated
  using (
    professional_id in (
      select p.id from public.professionals p
      join public.clinics c on c.id = p.clinic_id
      where c.owner_id = auth.uid()
    )
  );
