
-- Create candidate_profiles table for basic candidate information
CREATE TABLE public.candidate_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  city TEXT,
  gender TEXT,
  linkedin_url TEXT,
  other_social_urls TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate_education table for education history
CREATE TABLE public.candidate_education (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  degree_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate_work_history table for professional experience
CREATE TABLE public.candidate_work_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  company TEXT NOT NULL,
  responsibilities TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_work_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for candidate_profiles
CREATE POLICY "Users can view their own candidate profile"
ON public.candidate_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own candidate profile"
ON public.candidate_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own candidate profile"
ON public.candidate_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for candidate_education
CREATE POLICY "Users can view their own education"
ON public.candidate_education FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = candidate_profile_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own education"
ON public.candidate_education FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = candidate_profile_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own education"
ON public.candidate_education FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = candidate_profile_id AND cp.user_id = auth.uid()
  )
);

-- RLS policies for candidate_work_history
CREATE POLICY "Users can view their own work history"
ON public.candidate_work_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = candidate_profile_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own work history"
ON public.candidate_work_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = candidate_profile_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own work history"
ON public.candidate_work_history FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = candidate_profile_id AND cp.user_id = auth.uid()
  )
);

-- Trigger for updated_at on candidate_profiles
CREATE TRIGGER update_candidate_profiles_updated_at
BEFORE UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
