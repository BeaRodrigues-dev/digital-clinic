-- ============================================================================
-- Fase 18 — Painel Admin completo + Secretária (só no pacote empresarial)
--
-- Duas coisas independentes, na mesma migração porque uma prepara a outra:
--
-- 1) Papel de secretária já existia no esquema desde a Fase 1 (enum
--    `user_role`, e políticas de RLS em `patients`/`appointments` dando à
--    secretária visão — só leitura — dos pacientes e da agenda da própria
--    clínica), mas nunca existiu um jeito de criar uma conta com esse papel
--    nem uma trava dizendo quem pode ter uma. Esta migração:
--      a) deixa o profissional dono da clínica enxergar o perfil de sua(s)
--         própria(s) secretária(s) (hoje só self + admin conseguiam ler
--         `profiles`);
--      b) trava — no banco, não só na tela — que só clínica no plano
--         "Clínica" (o pacote empresarial, `clinics.plan = 'clinic'`) pode
--         ter uma conta com `role = 'secretary'` vinculada. Mesmo padrão já
--         usado pro limite de pacientes (Fase 10) e pra IA (Fase 16): quem
--         decide isso é o banco, o frontend só mostra a mensagem certa.
--
-- 2) Nada de schema novo pro painel admin em si (usuários/permissões e a
--    visão geral são só leitura sobre tabelas que já existem, com RLS que
--    admin já tinha) — só a rota de conceder/revogar papel (Fase 17 já
--    trouxe a de conceder; aqui completa com a de revogar).
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

-- ── (1a) Profissional enxerga o perfil da própria secretária ───────────────
create policy "profiles: profissional vê secretárias da própria clínica" on public.profiles
  for select using (
    role = 'secretary'
    and public.current_role() = 'psychologist'
    and clinic_id = (select clinic_id from public.profiles where id = auth.uid())
  );

-- ── (1b) Secretária só em clínica no plano empresarial ("Clínica") ─────────
-- BEFORE INSERT/UPDATE de `role` OU `clinic_id` — cobre tanto "promover uma
-- conta existente a secretária" quanto "mudar a secretária de clínica".
-- Não reage a mudanças de plano (rebaixar o plano depois não desliga quem
-- já tinha acesso — mesmo comportamento já adotado no limite de pacientes,
-- que só barra ENTRADA nova acima do limite, não expulsa quem já passou).
create or replace function public.enforce_secretary_plan_gate()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan public.plan_tier;
begin
  if new.role = 'secretary' then
    select plan into v_plan from public.clinics where id = new.clinic_id;
    if v_plan is distinct from 'clinic' then
      raise exception 'secretary_requires_business_plan';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_secretary_plan_gate
  before insert or update of role, clinic_id on public.profiles
  for each row execute procedure public.enforce_secretary_plan_gate();

-- ── (2) Revogar um papel concedido (completa a Fase 17, que só tinha o
-- "conceder") — usado pelo painel Admin → Usuários e por "remover acesso da
-- secretária" nas Configurações da clínica. Sem RPC dedicada: a rota do
-- backend já faz isso com um DELETE simples usando a service role (RLS de
-- `user_roles` não libera DELETE pra ninguém — de propósito, mesma razão
-- de não liberar INSERT/UPDATE: conceder ou tirar um papel é sempre uma
-- decisão validada no backend, nunca um DELETE direto do navegador).
