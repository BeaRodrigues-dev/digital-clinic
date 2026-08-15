-- Fase 33 (parte 2/4 do "corrija tudo") — hoje um lead do quiz ou um pedido
-- "quero agendar" só aparece como um número no badge do menu (Fase 29) —
-- fácil de não perceber se ninguém está de olho no painel. Isso manda um
-- e-mail automático assim que um desses registros é criado.
--
-- `quiz_leads`/`booking_requests` são inseridos direto pelo cliente Supabase
-- (não passam pela API/Hono), então não dá pra interceptar isso numa rota
-- comum — precisa de um gatilho de banco. Como Postgres não faz requisição
-- HTTP sozinho, usamos a extensão `pg_net` (mantida pela própria Supabase)
-- pra chamar de volta uma rota nova da nossa Edge Function, que manda o
-- e-mail de verdade via Resend (mesma integração da Fase 30).
create extension if not exists pg_net;

-- Função genérica: dispara uma notificação assíncrona (não bloqueia o
-- insert, não derruba o cadastro do lead/pedido se a notificação falhar)
-- pra rota `/internal/notify-lead` da Edge Function.
--
-- Só funciona depois que o admin configurar, via Supabase Vault (nunca
-- fica hardcoded aqui):
--   select vault.create_secret('https://SEU-PROJETO.supabase.co/functions/v1/make-server-a65fd448', 'edge_function_base_url');
--   select vault.create_secret('UM-VALOR-SECRETO-ALEATORIO', 'internal_webhook_secret');
-- E configurar o MESMO valor secreto como variável de ambiente da Edge
-- Function: `supabase secrets set INTERNAL_WEBHOOK_SECRET=UM-VALOR-SECRETO-ALEATORIO`
-- (tem que ser idêntico ao salvo no Vault — é o que prova pra rota que a
-- chamada veio do nosso próprio gatilho, não de qualquer um na internet).
--
-- Enquanto isso não for configurado, a função simplesmente não faz nada —
-- nunca trava o insert do lead/pedido por falta de configuração.
create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_url text;
  secret text;
  lead_type text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'edge_function_base_url';
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'internal_webhook_secret';

  if base_url is null or secret is null then
    return new;
  end if;

  lead_type := case tg_table_name
    when 'quiz_leads' then 'quiz_lead'
    when 'booking_requests' then 'booking_request'
    else tg_table_name
  end;

  perform net.http_post(
    url := base_url || '/internal/notify-lead',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', secret
    ),
    body := jsonb_build_object('type', lead_type, 'id', new.id)
  );

  return new;
exception
  -- Nunca deixa uma falha na notificação (rede fora do ar, Vault sem
  -- permissão, o que for) impedir o cadastro do lead/pedido em si.
  when others then
    return new;
end;
$$;

drop trigger if exists quiz_leads_notify_new on public.quiz_leads;
create trigger quiz_leads_notify_new
  after insert on public.quiz_leads
  for each row execute function public.notify_new_lead();

drop trigger if exists booking_requests_notify_new on public.booking_requests;
create trigger booking_requests_notify_new
  after insert on public.booking_requests
  for each row execute function public.notify_new_lead();
