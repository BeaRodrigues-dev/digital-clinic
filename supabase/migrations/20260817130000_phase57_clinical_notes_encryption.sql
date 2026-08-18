-- Fase 57 — camada extra de criptografia nas anotações de sessão
-- (`clinical_records.private_notes` / `shared_notes`), por cima da
-- criptografia em repouso que a própria Supabase já garante no banco.
-- Decisão explícita do usuário ("quero a camada extra"), ciente da
-- troca: sem busca por texto completo nessas duas colunas a partir de
-- agora, e a chave fica fora do banco (Edge Function secret), gerenciada
-- separadamente — ver nota completa em `index.ts`, seção "Fase 57".
--
-- `is_encrypted` existe pra manter compatibilidade com linhas antigas
-- (gravadas antes desta fase, em texto puro): o backend decide decriptar
-- ou não por linha, nunca por uma regra global — assim registros antigos
-- continuam legíveis sem precisar de uma migração de dados forçada agora
-- (reencriptar o que já existe fica como um passo futuro, opcional,
-- separado desta fase).
alter table public.clinical_records
  add column if not exists is_encrypted boolean not null default false,
  add column if not exists private_notes_iv text,
  add column if not exists shared_notes_iv text;
