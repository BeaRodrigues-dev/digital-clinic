-- ============================================================================
-- Fase 3 — Painel do profissional
--
-- Garante que todo usuário promovido a psicólogo (profiles.role = 'psychologist')
-- ganhe automaticamente uma linha em `professionals`, necessária para o painel
-- funcionar mesmo antes do profissional preencher seu perfil manualmente.
-- A linha nasce com approved = false (não aparece no diretório público até
-- ser aprovada por um admin) e sem afetar o diretório existente.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create function public.handle_professional_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role = 'psychologist' then
    insert into public.professionals (id, clinic_id, title, approved)
    values (new.id, new.clinic_id, 'Psicólogo(a)', false)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_profile_role_change
  after insert or update of role on public.profiles
  for each row execute procedure public.handle_professional_role();

-- Cobre quem já foi promovido a psicólogo antes desta migração existir.
insert into public.professionals (id, clinic_id, title, approved)
select p.id, p.clinic_id, 'Psicólogo(a)', false
from public.profiles p
where p.role = 'psychologist'
on conflict (id) do nothing;
