-- Remove duplicate mission_sessions keeping the oldest per user
DELETE FROM mission_sessions 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM mission_sessions 
  ORDER BY user_id, created_at ASC
);

-- Remove duplicate vision_sessions keeping the oldest per user
DELETE FROM vision_sessions 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM vision_sessions 
  ORDER BY user_id, created_at ASC
);

-- Add unique constraints to prevent future duplicates
ALTER TABLE mission_sessions ADD CONSTRAINT mission_sessions_user_id_unique UNIQUE (user_id);
ALTER TABLE vision_sessions ADD CONSTRAINT vision_sessions_user_id_unique UNIQUE (user_id);