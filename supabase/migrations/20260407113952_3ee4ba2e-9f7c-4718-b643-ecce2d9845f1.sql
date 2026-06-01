CREATE OR REPLACE FUNCTION public.notify_high_score_hunting_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.match_score IS NOT NULL AND NEW.match_score >= 80 THEN
    INSERT INTO public.hunting_notifications (account_id, type, title, message, reference_id, reference_type)
    SELECT
      rhs.account_id,
      'high_score',
      'Candidato de alto score encontrado',
      'Score ' || NEW.match_score || ' - ' || COALESCE(NEW.extracted_data->>'title', 'Candidato'),
      NEW.id,
      'hunting_result'
    FROM public.recruitment_hunting_searches rhs
    WHERE rhs.id = NEW.search_id;
  END IF;
  RETURN NEW;
END;
$$;