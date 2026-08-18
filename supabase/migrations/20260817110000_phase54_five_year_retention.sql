-- Fase 54 — guarda obrigatória de 5 anos (Resolução CFP Nº 004/2019).
--
-- `clinical_records` já fica protegido contra exclusão pra sempre depois de
-- assinado (trava da Fase 38 — `locked_at is null` como condição da policy
-- de delete), o que por si só já cumpre (e excede) o mínimo de 5 anos.
--
-- `psychological_documents` (laudos, atestados, TCI etc. — Fase 24) nunca
-- teve nenhuma trava: uma única policy "for all" liberava delete a
-- qualquer momento. Este bloco troca essa policy por: SELECT/INSERT/UPDATE
-- continuam livres pro profissional dono (sem trava de tempo — só a
-- EXCLUSÃO é uma ação irreversível o suficiente pra justificar bloquear),
-- e DELETE só depois de passados 5 anos da criação do documento. Mesma
-- regra pro admin — retenção obrigatória vale pra a plataforma inteira,
-- não é uma questão de quem está apagando.
drop policy "psychological_documents: profissional gerencia os próprios documentos"
  on public.psychological_documents;

drop policy "psychological_documents: admin gerencia tudo"
  on public.psychological_documents;

create policy "psychological_documents: profissional vê os próprios documentos"
  on public.psychological_documents for select
  using (professional_id = auth.uid());

create policy "psychological_documents: profissional cria os próprios documentos"
  on public.psychological_documents for insert
  with check (professional_id = auth.uid());

create policy "psychological_documents: profissional edita os próprios documentos"
  on public.psychological_documents for update
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "psychological_documents: profissional exclui após 5 anos de guarda"
  on public.psychological_documents for delete
  using (
    professional_id = auth.uid()
    and created_at < now() - interval '5 years'
  );

create policy "psychological_documents: admin vê/edita tudo"
  on public.psychological_documents for select
  using (public.current_role() = 'admin');

create policy "psychological_documents: admin atualiza tudo"
  on public.psychological_documents for update
  using (public.current_role() = 'admin');

create policy "psychological_documents: admin exclui após 5 anos de guarda"
  on public.psychological_documents for delete
  using (
    public.current_role() = 'admin'
    and created_at < now() - interval '5 years'
  );
