-- Fase 34 (parte 3/4 do "corrija tudo") — lembrete automático de consulta
-- por e-mail, ~24h antes. IMPORTANTE: opt-in POR PROFISSIONAL — cada um
-- decide se quer mandar lembrete pros próprios pacientes (toggle em
-- Configurações → Preferências). Não existe comportamento global "todo
-- mundo recebe lembrete" — o default é desligado.

alter table public.professionals
  add column send_appointment_reminders boolean not null default false;

-- Evita mandar o mesmo lembrete duas vezes (a varredura roda de hora em
-- hora, com uma janela de 2h — sem essa marca, uma consulta apareceria em
-- mais de uma varredura).
alter table public.appointments
  add column reminder_sent_at timestamptz;

create extension if not exists pg_cron;

-- Mesmo padrão da Fase 33: a varredura só dispara a chamada HTTP (via
-- `pg_net`) pra Edge Function se o admin já tiver configurado, no Supabase
-- Vault, os mesmos segredos usados pro aviso de novo lead:
--   edge_function_base_url, internal_webhook_secret
-- (ver instruções completas na migração da Fase 33 — são os MESMOS
-- segredos, reaproveitados aqui). Enquanto isso não estiver configurado, a
-- função não faz nada, silenciosamente, todo run.
create or replace function public.trigger_appointment_reminders_sweep()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'edge_function_base_url';
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'internal_webhook_secret';

  if base_url is null or secret is null then
    return;
  end if;

  perform net.http_post(
    url := base_url || '/internal/send-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', secret
    ),
    body := '{}'::jsonb
  );
exception
  when others then
    return;
end;
$$;

-- Roda a cada hora — a rota chamada (`/internal/send-appointment-reminders`)
-- é quem decide, a cada execução, quais consultas realmente precisam de
-- lembrete agora (ver nota completa na rota, no index.ts).
do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'appointment-reminders-hourly-sweep'
  ) then
    perform cron.unschedule('appointment-reminders-hourly-sweep');
  end if;
end $$;

select cron.schedule(
  'appointment-reminders-hourly-sweep',
  '0 * * * *',
  $$select public.trigger_appointment_reminders_sweep();$$
);
