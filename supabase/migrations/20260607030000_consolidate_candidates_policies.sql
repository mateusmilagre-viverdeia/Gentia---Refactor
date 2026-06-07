-- Performance RLS (piloto): consolida multiple_permissive_policies em
-- recruitment_candidates (tabela quente, 181 linhas). Policies PERMISSIVAS são
-- avaliadas em OR; ter 2 por ação faz o Postgres avaliar ambas por linha. Fundir
-- em 1 (OR das mesmas condições) = SEMÂNTICA IDÊNTICA, menos avaliação por linha.
-- DELETE/UPDATE já eram únicas (não mexidas). Isolamento re-testado após aplicar.

-- SELECT: "Candidates can view their own record" (email próprio) + "Members can view"
drop policy if exists "Candidates can view their own record" on public.recruitment_candidates;
drop policy if exists "Members can view candidates" on public.recruitment_candidates;
create policy "candidates_select_consolidated" on public.recruitment_candidates
  for select to authenticated
  using (
    email = get_auth_email()
    or is_account_member((select auth.uid()), account_id)
    or can_edit_client_project((select auth.uid()), account_id)
  );

-- INSERT: "Candidates can self-register" (email próprio) + "Members can insert"
drop policy if exists "Candidates can self-register" on public.recruitment_candidates;
drop policy if exists "Members can insert candidates" on public.recruitment_candidates;
create policy "candidates_insert_consolidated" on public.recruitment_candidates
  for insert to authenticated
  with check (
    email = get_auth_email()
    or is_account_member((select auth.uid()), account_id)
    or can_edit_client_project((select auth.uid()), account_id)
  );
