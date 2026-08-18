-- Fase 53 — registro e-Psi autodeclarado (Resolução CFP Nº 011/2018).
--
-- Coluna simples em `professionals`, autodeclarada pelo próprio
-- profissional (mesmo formulário do CRP) e SEM nenhuma validação contra
-- uma API do CFP — não existe API pública para isso. A tela do próprio
-- profissional mostra um lembrete (não bloqueante) enquanto o campo
-- estiver vazio, pra incentivar manter o dado em dia.
alter table public.professionals
  add column if not exists epsi_registration text;
