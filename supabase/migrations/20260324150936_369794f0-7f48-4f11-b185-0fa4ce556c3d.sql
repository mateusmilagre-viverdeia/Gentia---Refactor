-- Backfill candidate_id on culture_interview_sessions where NULL
UPDATE culture_interview_sessions cis
SET candidate_id = rc.id
FROM candidate_profiles cp
JOIN profiles p ON p.id = cp.user_id
JOIN recruitment_candidates rc ON rc.email = p.email
WHERE cis.candidate_profile_id = cp.id
  AND rc.account_id = cis.account_id
  AND cis.candidate_id IS NULL;

-- Create missing recruitment_applications for completed sessions with no application
INSERT INTO recruitment_applications (candidate_id, job_id, status)
SELECT DISTINCT cis.candidate_id, cis.job_id, 'applied'
FROM culture_interview_sessions cis
WHERE cis.status = 'completed'
  AND cis.candidate_id IS NOT NULL
  AND cis.job_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM recruitment_applications ra
    WHERE ra.candidate_id = cis.candidate_id
      AND ra.job_id = cis.job_id
  );