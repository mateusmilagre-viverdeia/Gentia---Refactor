-- Add column to store the order of selling sections
ALTER TABLE public.careers_page_settings
ADD COLUMN IF NOT EXISTS selling_sections_order text[] DEFAULT ARRAY[
  'opening', 'about', 'moment', 'dayToDay', 
  'fit', 'challenges', 'offerings', 'cta'
];