
ALTER TABLE public.strategic_projects 
  ALTER COLUMN linked_indicator TYPE text[] USING 
    CASE WHEN linked_indicator IS NOT NULL THEN ARRAY[linked_indicator] ELSE NULL END;

ALTER TABLE public.strategic_projects 
  ADD COLUMN involved_members text[] DEFAULT '{}';
