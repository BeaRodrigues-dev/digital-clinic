-- ============================================================================
-- Fase 10 — Planos comerciais
--
-- Estrutura de planos (gratuito / profissional / clínica) com limite real de
-- pacientes ativos, pronta pra ligar num checkout de verdade (Stripe) depois
-- — por enquanto a troca de plano é self-service (sem cobrança), então o
-- profissional pode testar o fluxo completo já.
--
-- O limite é por CLÍNICA (não por profissional isolado): já que uma clínica
-- pode um dia ter mais de um profissional (fase de secretária/multi-usuário,
-- ainda não construída), contar por clínica evita ter que redesenhar isso
-- depois. Hoje, como cada psicólogo tem sua própria clínica 1:1 (Fase 9), na
-- prática dá no mesmo — mas o enforcement já nasce correto pro cenário
-- futuro, sem depender de nenhuma coluna que ainda não é preenchida
-- (patients.clinic_id nunca chegou a ser usado, então não contamos por ele).
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create type public.plan_tier as enum ('free', 'professional', 'clinic');

alter table public.clinics
  add column plan public.plan_tier not null default 'free';

-- ── Limite de pacientes ativos por clínica, conforme o plano ───────────────
-- 'free' = 10 pacientes ativos; 'professional' e 'clinic' = sem limite.
-- Aplicado tanto na criação de um paciente quanto na reativação de um
-- paciente inativo (é o outro jeito de "ganhar" um paciente ativo a mais).
create or replace function public.enforce_patient_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan public.plan_tier;
  v_clinic_id uuid;
  v_limit integer;
  v_count integer;
begin
  select p.clinic_id, c.plan into v_clinic_id, v_plan
  from public.professionals p
  join public.clinics c on c.id = p.clinic_id
  where p.id = new.professional_id;

  -- Profissional sem clínica associada (não deveria acontecer após a Fase 9,
  -- mas por segurança) — não bloqueia, só não aplica limite.
  if v_clinic_id is null then
    return new;
  end if;

  v_limit := case v_plan
    when 'free' then 10
    else null -- profissional e clínica: sem limite
  end;

  if v_limit is not null then
    select count(*) into v_count
    from public.patients pt
    join public.professionals p2 on p2.id = pt.professional_id
    where p2.clinic_id = v_clinic_id
      and pt.status = 'active';

    if v_count >= v_limit then
      raise exception 'plan_patient_limit_reached'
        using hint = v_limit::text;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_patient_limit_insert
  before insert on public.patients
  for each row execute procedure public.enforce_patient_limit();

create trigger trg_enforce_patient_limit_reactivate
  before update of status on public.patients
  for each row
  when (new.status = 'active' and old.status is distinct from 'active')
  execute procedure public.enforce_patient_limit();
