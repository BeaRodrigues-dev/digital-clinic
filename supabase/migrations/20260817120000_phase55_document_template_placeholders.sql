-- Fase 55 — motor de templates com variáveis no gerador de documentos
-- ({{paciente.nome}}, {{paciente.cpf}}, {{psicologo.nome}}, {{psicologo.crp}},
-- {{consulta.data}}) — a substituição em si acontece no front, na hora de
-- copiar/baixar/gerar PDF (ver `DocumentForm` no App.tsx); esta migração só
-- adiciona o dado que faltava pra alimentar {{paciente.cpf}}, já que
-- `patients` nunca teve essa coluna.
--
-- Opcional de propósito (sem `not null`, sem `unique`): nem todo cadastro
-- vai preencher CPF, e nada mais na plataforma depende deste campo.
alter table public.patients
  add column if not exists cpf text;
