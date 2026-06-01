
-- Backfill match_score for completed DISC sessions that have null match_score
-- Uses the same advanced mode calculation as the orchestrator
UPDATE candidate_disc_results cdr
SET match_score = (
  SELECT 
    CASE 
      -- Check eliminators first
      WHEN (rdp.eliminator_d IS NOT NULL AND cdr.d_normalized < rdp.eliminator_d) THEN 0
      WHEN (rdp.eliminator_i IS NOT NULL AND cdr.i_normalized < rdp.eliminator_i) THEN 0
      WHEN (rdp.eliminator_s IS NOT NULL AND cdr.s_normalized < rdp.eliminator_s) THEN 0
      WHEN (rdp.eliminator_c IS NOT NULL AND cdr.c_normalized < rdp.eliminator_c) THEN 0
      -- Advanced mode: calculate match based on targets
      WHEN rdp.use_advanced_mode = true THEN (
        SELECT COALESCE(
          AVG(GREATEST(0, 100 - (ABS(dim.score - dim.target) / COALESCE(NULLIF(rdp.tolerance, 0), 10)) * 50)),
          0
        )
        FROM (
          VALUES 
            (cdr.d_normalized, rdp.target_d),
            (cdr.i_normalized, rdp.target_i),
            (cdr.s_normalized, rdp.target_s),
            (cdr.c_normalized, rdp.target_c)
        ) AS dim(score, target)
        WHERE dim.target IS NOT NULL
      )
      ELSE NULL
    END
  FROM recruitment_disc_profiles rdp
  JOIN candidate_disc_sessions cds ON cds.id = cdr.session_id
  WHERE rdp.job_id = cds.job_id
)
WHERE cdr.match_score IS NULL
AND EXISTS (
  SELECT 1 FROM candidate_disc_sessions cds 
  WHERE cds.id = cdr.session_id AND cds.status = 'completed'
);
