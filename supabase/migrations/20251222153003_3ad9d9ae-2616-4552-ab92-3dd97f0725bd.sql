-- Create survey_benchmarks table for market reference data
CREATE TABLE public.survey_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  benchmark_type TEXT NOT NULL, -- 'enps', 'gallup_q12', 'general'
  sector TEXT DEFAULT 'all', -- 'technology', 'retail', 'finance', 'healthcare', 'all'
  metric_name TEXT NOT NULL, -- 'overall', 'q1', 'q2', etc.
  metric_label TEXT, -- Human readable label for the metric
  min_value NUMERIC,
  max_value NUMERIC,
  average_value NUMERIC NOT NULL,
  top_quartile NUMERIC,
  bottom_quartile NUMERIC,
  source TEXT, -- 'Gallup 2024', 'Hive HR Q3 2024'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.survey_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for reading benchmarks (public read)
CREATE POLICY "Anyone can read benchmarks"
ON public.survey_benchmarks
FOR SELECT
USING (true);

-- Insert E-NPS benchmarks
INSERT INTO public.survey_benchmarks (benchmark_type, sector, metric_name, metric_label, min_value, max_value, average_value, top_quartile, bottom_quartile, source) VALUES
('enps', 'all', 'overall', 'E-NPS Geral', -100, 100, 14, 50, -10, 'Hive HR 2024'),
('enps', 'technology', 'overall', 'E-NPS Geral', -100, 100, 25, 55, 5, 'Hive HR 2024'),
('enps', 'retail', 'overall', 'E-NPS Geral', -100, 100, 8, 40, -20, 'Hive HR 2024'),
('enps', 'finance', 'overall', 'E-NPS Geral', -100, 100, 18, 48, -5, 'Hive HR 2024'),
('enps', 'healthcare', 'overall', 'E-NPS Geral', -100, 100, 12, 45, -15, 'Hive HR 2024');

-- Insert Gallup Q12 benchmarks (scale 1-5)
INSERT INTO public.survey_benchmarks (benchmark_type, sector, metric_name, metric_label, min_value, max_value, average_value, top_quartile, bottom_quartile, source) VALUES
('gallup_q12', 'all', 'overall', 'Média Geral Q12', 1, 5, 3.5, 4.0, 3.0, 'Gallup 2024'),
('gallup_q12', 'all', 'q1', 'Expectativas claras', 1, 5, 3.8, 4.2, 3.4, 'Gallup 2024'),
('gallup_q12', 'all', 'q2', 'Materiais e equipamentos', 1, 5, 3.6, 4.0, 3.2, 'Gallup 2024'),
('gallup_q12', 'all', 'q3', 'Fazer o que faço de melhor', 1, 5, 3.7, 4.1, 3.3, 'Gallup 2024'),
('gallup_q12', 'all', 'q4', 'Reconhecimento', 1, 5, 3.3, 3.9, 2.7, 'Gallup 2024'),
('gallup_q12', 'all', 'q5', 'Alguém se importa', 1, 5, 3.4, 4.0, 2.8, 'Gallup 2024'),
('gallup_q12', 'all', 'q6', 'Desenvolvimento', 1, 5, 3.5, 4.0, 3.0, 'Gallup 2024'),
('gallup_q12', 'all', 'q7', 'Opiniões contam', 1, 5, 3.4, 3.9, 2.9, 'Gallup 2024'),
('gallup_q12', 'all', 'q8', 'Missão/propósito', 1, 5, 3.6, 4.1, 3.1, 'Gallup 2024'),
('gallup_q12', 'all', 'q9', 'Qualidade do trabalho', 1, 5, 3.7, 4.2, 3.2, 'Gallup 2024'),
('gallup_q12', 'all', 'q10', 'Melhor amigo no trabalho', 1, 5, 3.2, 3.8, 2.6, 'Gallup 2024'),
('gallup_q12', 'all', 'q11', 'Progresso', 1, 5, 3.4, 3.9, 2.9, 'Gallup 2024'),
('gallup_q12', 'all', 'q12', 'Aprender e crescer', 1, 5, 3.5, 4.0, 3.0, 'Gallup 2024');

-- Create index for faster queries
CREATE INDEX idx_survey_benchmarks_type_sector ON public.survey_benchmarks(benchmark_type, sector);