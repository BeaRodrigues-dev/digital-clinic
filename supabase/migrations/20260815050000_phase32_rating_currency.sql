-- Fase 32 (parte 1/4 do "corrija tudo") — duas correções de honestidade e
-- consistência que não dependem de nenhuma infraestrutura nova.

-- 1) A nota (`rating`) de cada profissional sempre foi um número estático
-- (default 5.0 pra todo mundo, sem nenhum sistema de avaliação/depoimento
-- real por trás) mas era exibida no diretório público como se fosse uma
-- nota de verdade — inclusive usada pra ORDENAR o diretório, o que na
-- prática não ordenava nada de forma significativa (todo mundo empatado
-- em 5.0, exceto quem um admin editasse manualmente via SQL). Isso é
-- enganoso pro visitante. Não removemos a coluna (pode virar a base de um
-- sistema de avaliação real no futuro), só paramos de fingir que ela
-- significa algo hoje: a view pública deixa de expor `rating`, e o app
-- passa a ordenar o diretório por tempo de experiência (`years`), que é
-- um dado real preenchido pelo próprio profissional.
alter table public.professionals
  alter column rating drop default;

comment on column public.professionals.rating is
  'Não exibido/usado no diretório público (Fase 32) — não existe sistema de avaliação real ainda. Mantida a coluna pra uma futura feature de avaliações de verdade.';

-- 2) Moeda por profissional. O app inteiro formatava todo valor monetário
-- como BRL, sem opção — o que fica errado pra um profissional atendendo
-- no mercado espanhol (deveria mostrar €, não R$). Cada profissional passa
-- a escolher a própria moeda de cobrança nas configurações do perfil.
alter table public.professionals
  add column currency text not null default 'BRL' check (currency in ('BRL', 'EUR'));

-- Recria a view pública já sem `rating` e com `currency`, pro card/perfil
-- público mostrar o preço da sessão na moeda certa.
create or replace view public.public_professionals as
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
    pr.crp,
    pr.session_price,
    pr.currency
  from public.professionals pr
  join public.profiles p on p.id = pr.id
  where pr.approved = true;

grant select on public.public_professionals to anon, authenticated;
