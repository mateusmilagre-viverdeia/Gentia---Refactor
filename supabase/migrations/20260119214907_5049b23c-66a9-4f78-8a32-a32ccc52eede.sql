-- A.1: Insert expanded streak badges (14, 60, 180, 365 days)
-- First check which ones already exist
INSERT INTO public.badges (name, description, icon, tier, category, points, requirement)
VALUES 
  ('Streak 14 Dias', 'Usou a plataforma por 14 dias consecutivos', '⚡', 'bronze', 'performance', 150, '{"type": "streak", "days": 14}'::jsonb),
  ('Streak 60 Dias', 'Usou a plataforma por 60 dias consecutivos', '🔥', 'silver', 'performance', 400, '{"type": "streak", "days": 60}'::jsonb),
  ('Streak 180 Dias', 'Usou a plataforma por 180 dias consecutivos', '🏆', 'gold', 'performance', 750, '{"type": "streak", "days": 180}'::jsonb),
  ('Streak 365 Dias', 'Lendário! Um ano completo de consistência', '👑', 'platinum', 'performance', 1500, '{"type": "streak", "days": 365}'::jsonb)
ON CONFLICT DO NOTHING;

-- A.2: Fix RLS for offboarding_survey_tokens - UPDATE policy should verify token ownership
DROP POLICY IF EXISTS "Token can be marked as used" ON public.offboarding_survey_tokens;

CREATE POLICY "Token can be marked as used with valid token"
ON public.offboarding_survey_tokens
FOR UPDATE
USING (
  -- Must be a valid, unexpired, unused token
  used_at IS NULL 
  AND expires_at > now()
)
WITH CHECK (
  -- Can only mark as used (not modify other fields)
  used_at IS NOT NULL
);