-- ============================================================================
-- Fase 9 — Configuração da clínica
--
-- A tabela `clinics` já existia desde a Fase 1 (name, logo_url, public_info),
-- mas nada nunca criava uma linha nela nem dava a um profissional permissão
-- pra editá-la — só admin conseguia (policy "clinics: admin gerencia tudo").
-- Esta migração:
--   1. adiciona `owner_id` (quem é dono/pode editar a clínica) e
--      `business_hours` (horário de atendimento, em jsonb);
--   2. estende o gatilho que já promove psicólogo -> `professionals` (Fase 3)
--      pra também criar automaticamente uma clínica própria pra quem ainda
--      não tem uma — sem isso, a tela de configuração não teria o que editar
--      na primeira vez que o profissional entra nela;
--   3. faz o backfill dos psicólogos que já existem e ainda não têm clínica;
--   4. adiciona a policy de UPDATE que faltava pro dono editar sua clínica
--      (SELECT já funcionava, via "clinics: membros veem a própria clínica").
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

alter table public.clinics
  add column owner_id uuid references public.profiles (id) on delete set null;

alter table public.clinics
  add column business_hours jsonb not null default '{}'::jsonb;

-- ── Auto-provisionamento: psicólogo sem clínica ganha uma ──────────────────
create or replace function public.handle_professional_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_clinic_id uuid;
begin
  if new.role = 'psychologist' then
    v_clinic_id := new.clinic_id;

    if v_clinic_id is null then
      insert into public.clinics (name, owner_id)
      values (coalesce(new.full_name, 'Minha clínica'), new.id)
      returning id into v_clinic_id;

      update public.profiles set clinic_id = v_clinic_id where id = new.id;
    end if;

    insert into public.professionals (id, clinic_id, title, approved)
    values (new.id, v_clinic_id, 'Psicólogo(a)', false)
    on conflict (id) do update set clinic_id = excluded.clinic_id;
  end if;
  return new;
end;
$$;

-- Cobre quem já era psicólogo antes desta migração e ainda não tem clínica.
do $$
declare
  r record;
  v_clinic_id uuid;
begin
  for r in
    select p.id, p.full_name
    from public.profiles p
    where p.role = 'psychologist' and p.clinic_id is null
  loop
    insert into public.clinics (name, owner_id)
    values (coalesce(r.full_name, 'Minha clínica'), r.id)
    returning id into v_clinic_id;

    update public.profiles set clinic_id = v_clinic_id where id = r.id;
    update public.professionals set clinic_id = v_clinic_id where id = r.id;
  end loop;
end $$;

-- ── RLS: dono edita a própria clínica ───────────────────────────────────────
-- SELECT já era coberto por "clinics: membros veem a própria clínica"
-- (Fase 1) — o dono também é membro da própria clínica (profiles.clinic_id
-- aponta pra ela), então só faltava a permissão de escrita.
create policy "clinics: dono edita a própria clínica" on public.clinics
  for update using (owner_id = auth.uid());
