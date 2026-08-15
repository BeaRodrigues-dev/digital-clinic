-- Fase 30 — admin sugere um profissional pra um lead do quiz e o sistema
-- manda o e-mail de verdade (em vez do admin ter que copiar o contato e
-- mandar por fora). O match em si continua sendo escolha do admin — as
-- respostas do quiz são sobre o momento emocional da pessoa, não mapeiam
-- de forma confiável pra especialidade/localização pra decidir isso
-- sozinho (ver nota completa na rota `/leads/:id/suggest`, no index.ts).
--
-- Guarda qual profissional foi sugerido e quando, pra a tela de Leads (e
-- qualquer admin depois) saber que aquele lead já recebeu uma sugestão —
-- e pra não sugerir a mesma pessoa duas vezes sem perceber.
alter table public.quiz_leads
  add column suggested_professional_id uuid references public.professionals (id) on delete set null,
  add column suggested_at timestamptz;
