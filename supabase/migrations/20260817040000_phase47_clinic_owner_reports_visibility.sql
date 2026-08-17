-- Fase 47 — relatórios agregados da clínica (faturamento/retenção no nível
-- da clínica, não só por profissional individual). O dono da clínica já
-- enxerga pagamentos (Fase 37) e pacientes (Fase 39) da equipe toda — só
-- faltava consultas, necessárias pra calcular sessões concluídas/retenção
-- por profissional. Mesmo padrão das duas: policy de SELECT só-leitura,
-- sem abrir escrita nenhuma sobre a agenda de outro profissional.
create policy "appointments: dono da clínica vê consultas da equipe"
  on public.appointments for select
  to authenticated
  using (
    clinic_id in (select id from public.clinics where owner_id = auth.uid())
  );
