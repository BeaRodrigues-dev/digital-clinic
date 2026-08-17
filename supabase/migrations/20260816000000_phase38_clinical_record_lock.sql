-- Fase 38 — trava/assinatura de sessão concluída no prontuário. Até aqui
-- `clinical_records` podia ser editado (e até excluído) pelo profissional a
-- qualquer momento, sem limite de tempo e sem nenhum registro de que a
-- sessão foi "fechada" — item do checklist "bloqueio/assinatura de sessões
-- concluídas", que faltava por completo.

alter table public.clinical_records
  add column locked_at timestamptz,
  add column locked_by uuid references public.profiles (id);

-- A policy antiga era um único "for all" cobrindo select/insert/update/
-- delete pro profissional dono, sem diferenciar nada — não dava pra travar
-- só UPDATE/DELETE quando `locked_at` estiver preenchido. Trocando por 3
-- policies separadas (mesma ideia já usada em vários lugares da Fase 19 em
-- diante): SELECT/INSERT continuam livres pro dono, UPDATE/DELETE passam a
-- exigir `locked_at is null`.
drop policy "clinical_records: profissional gerencia os próprios registros" on public.clinical_records;

create policy "clinical_records: profissional vê os próprios registros"
  on public.clinical_records for select
  using (professional_id = auth.uid());

create policy "clinical_records: profissional cria os próprios registros"
  on public.clinical_records for insert
  with check (professional_id = auth.uid());

-- O UPDATE que faz a própria assinatura (settar `locked_at` de null pra
-- agora) continua passando por aqui: no momento da chamada o valor AINDA
-- ESTÁ null (é o que o USING enxerga), então o próprio ato de assinar é
-- permitido; qualquer tentativa de UPDATE depois disso já encontra
-- `locked_at` preenchido e cai fora da policy.
create policy "clinical_records: profissional edita registros não assinados"
  on public.clinical_records for update
  using (professional_id = auth.uid() and locked_at is null)
  with check (professional_id = auth.uid());

create policy "clinical_records: profissional exclui registros não assinados"
  on public.clinical_records for delete
  using (professional_id = auth.uid() and locked_at is null);

-- `admin gerencia tudo` (criada na Fase 1) continua valendo do jeito que
-- está — sem essa trava, de propósito: é a única forma de corrigir um
-- registro assinado por engano, e só o admin da plataforma consegue.
