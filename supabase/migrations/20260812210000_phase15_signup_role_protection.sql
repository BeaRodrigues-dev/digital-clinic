-- ============================================================================
-- Fase 15 — Cadastro público de psicólogo + trava de segurança em profiles.role
--
-- Achado de segurança (Ponto 18 do pedido — "não confiar no frontend"): a
-- policy "profiles: usuário atualiza o próprio perfil" (Fase 1) permite ao
-- dono da conta atualizar QUALQUER coluna da própria linha, incluindo
-- `role`. RLS restringe linhas, não colunas — então, sem esta trava,
-- qualquer paciente ou psicólogo logado poderia, direto do console do
-- navegador, rodar:
--
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', meuId)
--
-- ...e virar admin. Esta migração fecha essa brecha, no mesmo padrão já
-- usado pra `professionals.approved/clinic_id/rating` (Fase 12): um gatilho
-- BEFORE UPDATE que reverte `role` pra o valor anterior sempre que quem
-- edita não é admin nem a service role key (o backend, rodando com a
-- service role, PRECISA poder promover alguém a psicólogo no momento do
-- cadastro — ver `POST /signup/psychologist` no backend).
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and public.current_role() <> 'admin' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_role
  before update of role on public.profiles
  for each row execute procedure public.protect_profile_role();
