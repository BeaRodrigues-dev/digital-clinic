-- ============================================================================
-- Correção urgente — a policy nova da Fase 18 em `profiles` derrubou o
-- banco inteiro (erro 500 em profiles/clinics/patients/professionals)
--
-- Causa: a policy "profiles: profissional vê secretárias da própria
-- clínica" (20260813120000) usa, dentro de uma policy DA PRÓPRIA
-- `profiles`, o subselect cru:
--   (select clinic_id from public.profiles where id = auth.uid())
--
-- Esse exato padrão já existia desde a Fase 1 (patients/appointments/
-- clinics), mas sempre em policies de OUTRAS tabelas consultando
-- `profiles` — nesses casos é seguro, porque avaliar RLS de `profiles`
-- pro subselect não reabre a policy da tabela que está sendo consultada.
-- Usar o mesmo subselect cru dentro de uma policy que protege a própria
-- `profiles` é diferente: pra avaliar UMA linha de `profiles`, o Postgres
-- precisa reavaliar RLS de `profiles` de novo (pro subselect), o que
-- reabre esta mesma policy — o Postgres detecta esse ciclo e recusa a
-- consulta inteira com "infinite recursion detected in policy for
-- relation profiles", que o PostgREST devolve como 500. Como `clinics`,
-- `patients` e o embed `professionals→profiles` também dependem de RLS
-- de `profiles` por baixo, o erro se espalhou pra essas consultas também
-- — por isso a lista de psicólogos, o perfil profissional, a clínica e
-- os planos pararam de funcionar ao mesmo tempo.
--
-- Correção: mesmo truque já usado pra `current_role()` desde a Fase 1 —
-- envolver a leitura em uma função SECURITY DEFINER, que roda com o
-- privilégio de quem criou a função (ignora RLS por dentro), então não
-- reabre a policy que a está chamando.
--
-- Como aplicar:
--   supabase db push
-- (ou cole o conteúdo deste arquivo no SQL Editor do painel do Supabase)
-- ============================================================================

create function public.current_clinic_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select clinic_id from public.profiles where id = auth.uid();
$$;

drop policy if exists "profiles: profissional vê secretárias da própria clínica" on public.profiles;

create policy "profiles: profissional vê secretárias da própria clínica" on public.profiles
  for select using (
    role = 'secretary'
    and public.current_role() = 'psychologist'
    and clinic_id = public.current_clinic_id()
  );
