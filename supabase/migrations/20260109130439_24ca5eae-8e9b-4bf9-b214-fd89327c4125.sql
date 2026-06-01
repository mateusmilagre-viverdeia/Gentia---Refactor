-- Create table for post comments
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.intranet_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_id);
CREATE INDEX idx_post_comments_user_id ON public.post_comments(user_id);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_comments
CREATE POLICY "Users can view comments in their org posts"
  ON public.post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.intranet_posts p
      JOIN public.account_members am ON am.account_id = p.account_id
      WHERE p.id = post_comments.post_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
    )
  );

CREATE POLICY "Users can create comments"
  ON public.post_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.intranet_posts p
      JOIN public.account_members am ON am.account_id = p.account_id
      WHERE p.id = post_comments.post_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.post_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Create birthday_messages table for congratulations
CREATE TABLE public.birthday_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_birthday_messages_to_employee ON public.birthday_messages(to_employee_id);
CREATE INDEX idx_birthday_messages_account ON public.birthday_messages(account_id);

-- Enable RLS
ALTER TABLE public.birthday_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for birthday_messages
CREATE POLICY "Users can view messages in their org"
  ON public.birthday_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = birthday_messages.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
    )
  );

CREATE POLICY "Users can send birthday messages"
  ON public.birthday_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = birthday_messages.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
    )
  );