-- Add requires_confirmation column to intranet_posts
ALTER TABLE public.intranet_posts 
ADD COLUMN IF NOT EXISTS requires_confirmation boolean DEFAULT false;

-- Create post_read_confirmations table
CREATE TABLE public.post_read_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.intranet_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_read_confirmations ENABLE ROW LEVEL SECURITY;

-- Policies for post_read_confirmations
CREATE POLICY "Users can view their own confirmations"
ON public.post_read_confirmations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own confirmations"
ON public.post_read_confirmations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create post_reactions table
CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.intranet_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'celebrate', 'support')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for post_reactions
CREATE POLICY "Users can view all reactions"
ON public.post_reactions
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reactions"
ON public.post_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.post_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_post_read_confirmations_post_id ON public.post_read_confirmations(post_id);
CREATE INDEX idx_post_read_confirmations_user_id ON public.post_read_confirmations(user_id);
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON public.post_reactions(user_id);

-- Enable realtime for reactions (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;