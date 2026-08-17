-- Fase 46 — módulo inter-sessões: diário de humor + escalas psicométricas
-- (PHQ-9, GAD-7) que o paciente preenche sozinho entre as sessões. Duas
-- tabelas novas, sem nenhuma ligação com `clinical_records` (aquilo é
-- anotação do profissional; isto é autorrelato do paciente).
--
-- Mesmo padrão de roteamento das Fases 25/45: `professional_id` não vem do
-- cliente — é derivado por trigger a partir de `patients.professional_id`,
-- pra permitir uma policy de SELECT direta pro profissional sem abrir mão
-- de nenhuma validação no servidor.
--
-- Sem policy nenhuma pra secretária de propósito: mesmo limite já usado em
-- `clinical_records` (Fase 38) — autorrelato de humor/escala é dado
-- clínico sensível, não administrativo.

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  entry_date date not null default current_date,
  mood_score integer not null check (mood_score between 1 and 5),
  note text,
  created_at timestamptz not null default now()
);

create function public.set_mood_entry_professional_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select professional_id into new.professional_id
  from public.patients
  where id = new.patient_id;

  if new.professional_id is null then
    raise exception 'patient not found';
  end if;

  return new;
end;
$$;

create trigger trg_set_mood_entry_professional_id
  before insert on public.mood_entries
  for each row execute procedure public.set_mood_entry_professional_id();

alter table public.mood_entries enable row level security;

create policy "mood_entries: paciente cria o próprio registro"
  on public.mood_entries for insert
  to authenticated
  with check (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "mood_entries: paciente vê os próprios registros"
  on public.mood_entries for select
  to authenticated
  using (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "mood_entries: paciente edita os próprios registros"
  on public.mood_entries for update
  to authenticated
  using (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  )
  with check (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "mood_entries: paciente exclui os próprios registros"
  on public.mood_entries for delete
  to authenticated
  using (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "mood_entries: profissional vê os registros dos próprios pacientes"
  on public.mood_entries for select
  to authenticated
  using (professional_id = auth.uid());

create policy "mood_entries: admin gerencia tudo"
  on public.mood_entries for all
  to authenticated
  using (public.current_role() = 'admin');

create index if not exists mood_entries_patient_idx
  on public.mood_entries (patient_id, entry_date desc);
create index if not exists mood_entries_professional_idx
  on public.mood_entries (professional_id, entry_date desc);

-- ── Escalas psicométricas (PHQ-9 / GAD-7) ───────────────────────────────────
-- `answers` guarda cada resposta (0–3, padrão dos dois instrumentos);
-- `total_score`/`severity` vêm calculados do lado do cliente na hora do
-- envio (fórmula pública, padrão dos instrumentos) — guardados prontos
-- pra não recalcular toda vez que a tela de histórico for aberta.
-- `flagged` marca item 9 do PHQ-9 (ideação/risco) respondido > 0, pra dar
-- destaque na tela do profissional sem precisar reabrir cada resposta.
create table public.psychometric_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  scale text not null check (scale in ('phq9', 'gad7')),
  answers integer[] not null,
  total_score integer not null check (total_score >= 0),
  severity text not null,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.set_assessment_professional_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select professional_id into new.professional_id
  from public.patients
  where id = new.patient_id;

  if new.professional_id is null then
    raise exception 'patient not found';
  end if;

  return new;
end;
$$;

create trigger trg_set_assessment_professional_id
  before insert on public.psychometric_assessments
  for each row execute procedure public.set_assessment_professional_id();

alter table public.psychometric_assessments enable row level security;

create policy "psychometric_assessments: paciente cria o próprio registro"
  on public.psychometric_assessments for insert
  to authenticated
  with check (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "psychometric_assessments: paciente vê os próprios registros"
  on public.psychometric_assessments for select
  to authenticated
  using (
    patient_id in (
      select id from public.patients where patient_user_id = auth.uid()
    )
  );

create policy "psychometric_assessments: profissional vê os registros dos próprios pacientes"
  on public.psychometric_assessments for select
  to authenticated
  using (professional_id = auth.uid());

create policy "psychometric_assessments: admin gerencia tudo"
  on public.psychometric_assessments for all
  to authenticated
  using (public.current_role() = 'admin');

create index if not exists psychometric_assessments_patient_idx
  on public.psychometric_assessments (patient_id, created_at desc);
create index if not exists psychometric_assessments_professional_idx
  on public.psychometric_assessments (professional_id, created_at desc);
