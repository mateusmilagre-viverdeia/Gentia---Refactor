-- Add seen_at column to track which badges have been celebrated
ALTER TABLE public.user_badges 
ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- Create index for efficient querying of unseen badges
CREATE INDEX IF NOT EXISTS idx_user_badges_unseen 
ON public.user_badges (user_id, seen_at) 
WHERE seen_at IS NULL;

-- Backfill: Mark all existing badges as already seen to prevent historical backlog
UPDATE public.user_badges 
SET seen_at = COALESCE(earned_at, now()) 
WHERE seen_at IS NULL;

-- Add unique constraint to prevent duplicate badge awards per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badges_unique_award 
ON public.user_badges (user_id, badge_id);

-- Update RLS policy to allow users to update their own badges (for seen_at)
DROP POLICY IF EXISTS "Users can update their own badges" ON public.user_badges;
CREATE POLICY "Users can update their own badges" 
ON public.user_badges 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);