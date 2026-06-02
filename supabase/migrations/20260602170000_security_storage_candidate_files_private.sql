-- ============================================================================
-- FIX DE SEGURANÇA 🟡 — bucket `candidate-files` privado (PII: CVs e avatares)
-- ----------------------------------------------------------------------------
-- O bucket era PÚBLICO e tinha policy SELECT `to public USING(bucket_id=...)`
-- → qualquer pessoa (anon, sem login) podia baixar/listar CVs e avatares de
-- candidatos via URL pública. Risco de PII/LGPD.
--
-- Correção:
--   1) Bucket privado (getPublicUrl deixa de servir os arquivos; o front passa
--      a usar createSignedUrl — ver ajuste em src/.../MinhaBiografia.tsx e nos
--      pontos de exibição do recrutador).
--   2) Remove a leitura pública; leitura passa a exigir usuário autenticado.
--   As policies de INSERT/UPDATE/DELETE já eram owner-based (auth.uid() = pasta)
--   e seguem valendo (anon não tem auth.uid(), então não passam).
--
-- NOTA (refinamento documentado em docs/SECURITY_AUDIT.md §10): a leitura está
-- como "qualquer autenticado" (fecha o vazamento anon, que é o crítico). O
-- isolamento fino (recrutador só vê CV de candidato vinculado às suas vagas)
-- exigiria signed URL emitida por edge function validando o vínculo — proposto
-- para evolução futura; o path usa o user.id (UUID não enumerável).
-- ============================================================================

update storage.buckets set public = false where id = 'candidate-files';

drop policy if exists "Candidate files are publicly accessible" on storage.objects;

create policy "candidate-files: leitura apenas autenticada"
  on storage.objects for select to authenticated
  using (bucket_id = 'candidate-files');
