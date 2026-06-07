-- Re-afirma o bucket candidate-files como PRIVADO.
-- A migração de STORAGE (importação manual dos 337 arquivos) recriou/resetou o
-- bucket como public=true, REGREDINDO o fix de segurança 20260602170000 e
-- re-expondo CVs/avatares de candidatos (PII) a acesso anônimo.
-- O front já consome candidate-files via SIGNED URLs (src/lib/storageUrl.ts +
-- SignedCvLink), então PRIVADO é o estado correto e não quebra nada.
--
-- ⚠️ IMPORTANTE (cutover): a configuração de bucket (public/privado, limites,
-- mime types) NÃO é garantida por migration quando o storage é importado
-- manualmente DEPOIS do `db push`. Portanto, SEMPRE re-checar a privacidade dos
-- buckets sensíveis APÓS cada importação de storage. Sensíveis que devem ser
-- privados: candidate-files, external-resumes, project-documents,
-- technical-interview-audio, culture-interview-audio, offline-interviews.

update storage.buckets set public = false where id = 'candidate-files';
