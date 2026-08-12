-- ============================================================================
-- Fase 12 — Unificação de perfil (Psico / Perfil do Psico)
--
-- Contexto: até aqui existiam DOIS sistemas de "psicólogo" desconectados —
-- um diretório antigo no key-value store (editado só por admin, mostrado na
-- landing pública) e a tabela `professionals` de verdade (ligada à conta de
-- login real, usada em todo o painel do profissional desde a Fase 1). Um
-- psicólogo que se cadastra de verdade nunca aparecia no diretório público,
-- porque a página pública lia do sistema antigo.
--
-- Esta migração não migra dados do key-value store (é um formato diferente
-- e arriscado de migrar às cegas) — ela prepara `professionals` pra ser a
-- ÚNICA fonte de verdade daqui pra frente: telefone na conta, e trava de
-- segurança pra impedir que o próprio profissional se auto-aprove ou mude de
-- clínica editando o próprio perfil.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

alter table public.profiles
  add column phone text;

-- ── Trava de segurança: RLS restringe LINHAS, não colunas ──────────────────
-- A policy "professionals: dono edita o próprio perfil" (Fase 1) permite
-- update na própria linha sem restringir quais colunas — ou seja, sem esta
-- trava, o próprio profissional poderia setar approved = true (se
-- autoaprovar no diretório público), trocar seu clinic_id (furando o limite
-- de plano por clínica da Fase 10) ou editar rating (nota exibida
-- publicamente, deveria ser um agregado do sistema). Este gatilho força
-- essas 3 colunas a permanecerem como estavam sempre que quem edita não é
-- admin — silenciosamente, sem quebrar updates legítimos que não mexem nelas.
create or replace function public.protect_professional_admin_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then
    new.approved := old.approved;
    new.clinic_id := old.clinic_id;
    new.rating := old.rating;
  end if;
  return new;
end;
$$;

create trigger trg_protect_professional_admin_fields
  before update on public.professionals
  for each row execute procedure public.protect_professional_admin_fields();

-- ── Diretório público (landing) ─────────────────────────────────────────────
-- O visitante da landing não está logado, então usa a chave anônima (role
-- `anon`). A RLS de `professionals` já permite isso pra linhas aprovadas
-- ("professionals: diretório público (aprovados)", Fase 1) — mas o NOME vem
-- de `profiles.full_name`, e `profiles` só permite ao próprio dono ou a um
-- admin ler qualquer linha. Um join direto `professionals(...).select("*,
-- profiles(full_name)")` feito pelo navegador do visitante retornaria
-- profiles nulo por causa dessa RLS.
--
-- Esta view roda com o privilégio de quem a criou (a migração, via
-- `supabase db push`, roda como o role `postgres`, que não está sujeito à
-- RLS das tabelas) — é o mesmo padrão já usado em `patient_visible_records`
-- e `patient_own_profile` (Fase 1/8): a view já filtra e expõe só o que é
-- seguro tornar público, então dar select nela pro `anon` não vaza nada além
-- do que o diretório sempre mostrou.
create view public.public_professionals as
  select
    pr.id,
    p.full_name as name,
    pr.title,
    pr.location,
    pr.flag,
    pr.specialties,
    pr.approach,
    pr.sessions_info,
    pr.photo_url,
    pr.years,
    pr.rating,
    pr.crp,
    pr.session_price
  from public.professionals pr
  join public.profiles p on p.id = pr.id
  where pr.approved = true;

grant select on public.public_professionals to anon, authenticated;
