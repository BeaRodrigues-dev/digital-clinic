-- Fase 39 — reatribuir o psicólogo responsável por um paciente já
-- cadastrado, mas pela própria clínica (dono), não só pelo admin da
-- plataforma. Até aqui isso só existia em `AdminPatientsView` (visão global
-- da Fase 26/27), o que obrigava a clínica a pedir pro suporte cada vez que
-- precisava mover um paciente de um profissional pra outro da mesma equipe.

-- SELECT: o dono precisa enxergar os pacientes de TODOS os profissionais da
-- própria clínica (hoje só vê os próprios, via
-- "patients: profissional vê os próprios pacientes") pra poder escolher
-- quem reatribuir. Mesmo escopo já usado pra secretária, só que por
-- `owner_id` em vez de papel.
create policy "patients: dono da clínica vê pacientes da equipe"
  on public.patients for select
  to authenticated
  using (
    clinic_id in (select id from public.clinics where owner_id = auth.uid())
  );

-- Sem policy nova de UPDATE aqui de propósito — mesmo raciocínio da Fase 37
-- com `commission_percent`: uma policy de UPDATE ampla deixaria o dono
-- editar QUALQUER campo do paciente de um colega (nome, notas, tags...),
-- não só o profissional responsável. A reatribuição em si passa por uma
-- rota dedicada no backend (`PUT /clinic/patient/:id/reassign`), que só
-- mexe em `professional_id`/`clinic_id` depois de validar tudo com a
-- service role.
