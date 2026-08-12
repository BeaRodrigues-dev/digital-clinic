-- ============================================================================
-- Fase 17 — Troca de perfil sem logout (múltiplos papéis por conta)
--
-- Pedido do usuário: uma mesma conta pode ter mais de um papel (ex.: a
-- mesma pessoa é Administradora E Psicóloga) e precisa poder alternar entre
-- eles sem sair e entrar de novo.
--
-- Como o esquema funcionava até aqui: `profiles.role` guarda UM único
-- papel por conta, e é essa coluna que toda a segurança do app olha — toda
-- policy de RLS, a função `current_role()`, o backend inteiro
-- (`getCallingUser()`) e o roteamento do frontend (`renderRoleArea`)
-- dependem só dela. Trocar esse modelo por um "papel múltiplo direto" exigiria
-- reescrever every policy — exatamente o tipo de recriação que o pedido
-- original proíbe.
--
-- Solução adotada (aditiva, não recria nada): `profiles.role` continua
-- sendo a ÚNICA fonte de verdade sobre "qual papel vale AGORA" — nenhuma
-- policy, função ou rota existente precisa mudar. O que muda é só isso:
-- agora existe uma tabela `user_roles` guardando QUAIS papéis aquela conta
-- tem DIREITO de assumir, e uma função seguríssima (`switch_active_role`)
-- que troca `profiles.role` para um desses papéis já autorizados —
-- reaproveitando o gatilho que já existia (`on_profile_role_change`) pra
-- garantir que a linha de `professionals`/clínica apareça automaticamente
-- se o papel novo for "psychologist" e ainda não existir uma.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

-- ── Quais papéis cada conta tem direito de assumir ──────────────────────────
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Só leitura. De propósito não existe policy de INSERT/UPDATE/DELETE pra
-- 'authenticated' — dar um papel novo a uma conta é uma decisão de quem
-- administra a plataforma, não algo que o próprio usuário deveria conseguir
-- fazer sozinho (isso seria a mesma brecha de autopromoção que a Fase 15 já
-- fechou, só que por outra porta). Concessão de papéis extras acontece via
-- backend (rota admin, service role) ou diretamente por SQL.
create policy "user_roles: usuário vê os próprios papéis" on public.user_roles
  for select using (user_id = auth.uid());
create policy "user_roles: admin vê tudo" on public.user_roles
  for select using (public.current_role() = 'admin');

-- Backfill: todo mundo que já tem conta ganha, automaticamente, o direito
-- de assumir o papel que já é o seu hoje — ninguém ganha acesso extra
-- nenhum com esta migração; só passa a existir a possibilidade de conceder
-- mais papéis depois.
insert into public.user_roles (user_id, role)
select id, role from public.profiles
on conflict (user_id, role) do nothing;

-- Mantém user_roles em dia automaticamente sempre que alguém ganha um papel
-- novo por qualquer caminho já existente (ex.: cadastro público de
-- psicólogo, que faz `profiles.role = 'psychologist'`) — sem isso, a conta
-- teria o papel ativo mas não o "direito" registrado, e não conseguiria
-- voltar pra ele depois de trocar pra outro.
create or replace function public.grant_role_entitlement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, new.role)
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

create trigger trg_grant_role_entitlement
  after insert or update of role on public.profiles
  for each row execute procedure public.grant_role_entitlement();

-- ── Trocar o papel ativo (o que o usuário vê e pode fazer agora) ───────────
-- SECURITY DEFINER pra poder passar pela trava de autopromoção (Fase 15)
-- de forma controlada: só libera a troca de `profiles.role` quando (a) o
-- alvo é um papel que essa conta já tem o direito de assumir (linha em
-- `user_roles`) e (b) a chamada passou por ESTA função — nunca um UPDATE
-- direto na tabela. Isso é sinalizado pra `protect_profile_role` (Fase 15)
-- por uma configuração de sessão válida só durante esta transação.
create or replace function public.switch_active_role(target_role public.user_role)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_allowed boolean;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select exists(
    select 1 from public.user_roles
    where user_id = v_user_id and role = target_role
  ) into v_allowed;

  if not v_allowed then
    raise exception 'role_not_available';
  end if;

  -- Sinaliza pro gatilho de proteção que esta é uma troca legítima,
  -- validada acima — só vale dentro desta transação (is_local = true).
  perform set_config('app.switching_active_role', 'true', true);

  update public.profiles set role = target_role where id = v_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

-- Atualiza a trava da Fase 15 pra reconhecer essa troca legítima, além dos
-- dois casos que já existiam (service role do backend; admin editando
-- outra conta). O comportamento original pra qualquer UPDATE direto feito
-- por fora desta função continua bloqueado exatamente como antes.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     and public.current_role() <> 'admin'
     and coalesce(current_setting('app.switching_active_role', true), '') <> 'true'
  then
    new.role := old.role;
  end if;
  return new;
end;
$$;
