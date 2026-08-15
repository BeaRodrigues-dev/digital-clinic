-- Fase 27 — corrige o vínculo da secretária com a clínica e cria o cadastro
-- autônomo por código de convite.
--
-- ── Parte 1: bug real encontrado ao testar troca de perfil ─────────────────
-- `current_clinic_professional_id()` (Fase 19) achava "o psicólogo dono da
-- clínica" fazendo `profiles where clinic_id = X and role = 'psychologist'`
-- — ou seja, olhava qual papel está ATIVO agora, não quem de fato é dono.
-- Com a troca de perfil sem logout (Fase 17), uma conta pode ter o papel
-- "psychologist" só como um dos vários que tem direito de assumir — se
-- estiver navegando como admin (ou qualquer outro papel) no momento, essa
-- consulta não encontra ninguém, e qualquer coisa que dependesse dela
-- quebra: a secretária vê "não encontramos o profissional dono desta
-- clínica" e fica sem conseguir agendar/cadastrar paciente.
--
-- `clinics.owner_id` (Fase 9) já existe exatamente pra isso — é preenchido
-- uma vez, quando a clínica é criada, e nunca muda com troca de papel.
-- Passa a ser a fonte de verdade aqui.
create or replace function public.current_clinic_professional_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select owner_id from public.clinics
  where id = public.current_clinic_id();
$$;

-- ── Parte 2: código de convite da clínica ───────────────────────────────────
-- Pedido do usuário: convidar secretária uma por uma (nome + e-mail, por
-- profissional) tem atrito demais. Em vez disso, cada clínica ganha um
-- código curto — a pessoa se cadastra sozinha escolhendo "sou secretária" e
-- colando o código, e já nasce vinculada à clínica certa. Não usamos o NOME
-- da clínica pra isso (nomes se repetem e agora até aparecem no diretório
-- público — Fase 25) porque isso permitiria qualquer visitante se cadastrar
-- como secretária de qualquer clínica só sabendo o nome dela. O código é
-- aleatório, curto o bastante pra compartilhar fácil (copiar/colar, ou por
-- link direto) e longo o bastante pra não ser adivinhado.
alter table public.clinics
  add column secretary_invite_code text unique;

-- Alfabeto sem caracteres ambíguos (sem O/0, I/1) — pensado pra ser digitado
-- à mão sem confusão, mesmo sendo mais comum compartilhar como link.
create or replace function public.generate_clinic_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  already_used boolean;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(
      select 1 from public.clinics where secretary_invite_code = code
    ) into already_used;
    exit when not already_used;
  end loop;
  return code;
end;
$$;

create or replace function public.set_clinic_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.secretary_invite_code is null then
    new.secretary_invite_code := public.generate_clinic_invite_code();
  end if;
  return new;
end;
$$;

create trigger trg_set_clinic_invite_code
  before insert on public.clinics
  for each row execute procedure public.set_clinic_invite_code();

-- Backfill das clínicas que já existem.
update public.clinics
set secretary_invite_code = public.generate_clinic_invite_code()
where secretary_invite_code is null;

alter table public.clinics
  alter column secretary_invite_code set not null;

-- Regenerar o código (ex.: se vazou pra alguém indevido) — só o dono da
-- clínica ou um admin. SECURITY DEFINER porque o UPDATE em si já é coberto
-- pela policy "clinics: dono edita a própria clínica", mas queremos que a
-- GERAÇÃO do código novo (e a garantia de unicidade) aconteça sempre pelo
-- mesmo caminho, não reimplementada no frontend.
create or replace function public.regenerate_secretary_invite_code(target_clinic_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  new_code text;
begin
  if not exists (
    select 1 from public.clinics
    where id = target_clinic_id
      and (owner_id = auth.uid() or public.current_role() = 'admin')
  ) then
    raise exception 'not_authorized';
  end if;

  new_code := public.generate_clinic_invite_code();
  update public.clinics
  set secretary_invite_code = new_code
  where id = target_clinic_id;

  return new_code;
end;
$$;
