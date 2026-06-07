-- post_reactions: a policy SELECT era `qual=true` para `{public}` → ANON lia todas
-- as reações (quem reagiu em quê). É feature social INTERNA (sem uso em páginas
-- públicas; posts/post_reactions não têm account_id). Restringe a `authenticated`
-- (mantém o comportamento "ver todas as reações" dentro do app; remove o anon).
-- INSERT/DELETE já são gated por user_id = auth.uid() (anon não escreve).

drop policy if exists "Users can view all reactions" on public.post_reactions;

create policy "Authenticated can view reactions"
  on public.post_reactions
  for select
  to authenticated
  using (true);
