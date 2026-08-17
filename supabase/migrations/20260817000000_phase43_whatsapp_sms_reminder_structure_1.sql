-- Fase 43 — estrutura de lembrete por WhatsApp/SMS (canal adicional ao
-- e-mail da Fase 34, item "Lembretes automáticos" do checklist). Fica
-- desligada de verdade: o backend não tem nenhum provedor pago (Twilio,
-- Zenvia, Meta Cloud API etc.) configurado, então nenhuma mensagem é
-- enviada por aqui — esta fase só guarda a preferência e o telefone,
-- prontos pra quando o profissional configurar um provedor de verdade.
--
-- Tabela própria (não colunas direto em `professionals`) de propósito:
-- igual `professional_commissions` na Fase 37 — `professionals` tem uma
-- policy de diretório público (`approved = true`) sem nenhuma restrição de
-- coluna, então qualquer coluna nova ali fica visível pra qualquer
-- visitante anônimo do site. Telefone de lembrete é dado sensível — não
-- pode entrar numa tabela com SELECT público.
create table public.professional_reminder_settings (
  professional_id uuid primary key references public.professionals (id) on delete cascade,
  whatsapp_reminders_enabled boolean not null default false,
  reminder_phone text,
  updated_at timestamptz not null default now()
);

alter table public.professional_reminder_settings enable row level security;

create policy "professional_reminder_settings: profissional gerencia o próprio"
  on public.professional_reminder_settings for all
  to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "professional_reminder_settings: admin gerencia tudo"
  on public.professional_reminder_settings for all
  to authenticated
  using (public.current_role() = 'admin');
