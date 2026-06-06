-- Fecha LEAK: a policy SELECT `qual=true` ("public can read invite by token") em
-- consultant_satisfaction_invites deixava ANON ler TODOS os invites (incl. tokens) —
-- permitindo enumerar tokens e responder/abrir avaliação de qualquer consultor.
-- A página pública SatisfactionSurvey precisa ler só o invite do SEU token →
-- trocado por uma RPC SECURITY DEFINER escopada ao token (retorna invite + nome do
-- consultor + perguntas, nada além). A UPDATE pública ("mark completed") também é
-- removida: a conclusão é feita pela edge function submit-satisfaction-response
-- (service_role). As policies de admin e de "consultor lê os próprios" permanecem.

create or replace function public.get_satisfaction_survey_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id,
    'status', i.status,
    'expires_at', i.expires_at,
    'template_id', i.template_id,
    'consultant_user_id', i.consultant_user_id,
    'consultant_name', nullif(btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(q) order by q.order_index)
      from public.consultant_satisfaction_questions q
      where q.template_id = i.template_id
    ), '[]'::jsonb)
  )
  from public.consultant_satisfaction_invites i
  left join public.profiles p on p.id = i.consultant_user_id
  where i.token = p_token
  limit 1;
$$;

revoke all on function public.get_satisfaction_survey_by_token(text) from public;
grant execute on function public.get_satisfaction_survey_by_token(text) to anon, authenticated;

drop policy if exists "public can read invite by token"   on public.consultant_satisfaction_invites;
drop policy if exists "public can mark invite completed"   on public.consultant_satisfaction_invites;
