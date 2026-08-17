-- Fase 40 — contato de emergência no cadastro de paciente. Item do
-- checklist que faltava por completo: `patients` não tinha nenhum campo
-- pra isso.
alter table public.patients
  add column emergency_contact_name text,
  add column emergency_contact_phone text;

-- Sem policy nova — os dois campos entram nas mesmas policies que já
-- protegem o resto de `patients` (profissional dono, secretária da
-- clínica, dono da clínica via Fase 39, admin).
