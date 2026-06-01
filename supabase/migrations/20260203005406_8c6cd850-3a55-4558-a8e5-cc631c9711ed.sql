-- Add template_id to recurrence table for auto-applying templates
ALTER TABLE public.meeting_one_on_one_recurrence 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.meeting_one_on_one_templates(id) ON DELETE SET NULL;

-- Create index for better performance on recurrence queries
CREATE INDEX IF NOT EXISTS idx_recurrence_next_occurrence 
ON public.meeting_one_on_one_recurrence(next_occurrence) 
WHERE is_active = true;

-- Create a function to be called by pg_cron
CREATE OR REPLACE FUNCTION public.process_one_on_one_recurrences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  new_meeting_id UUID;
  next_date DATE;
  template_items JSONB;
  item JSONB;
  item_index INTEGER;
  last_meeting_id UUID;
  pending_action RECORD;
  max_order INTEGER;
BEGIN
  -- Process all active recurrences where next_occurrence is today or past
  FOR rec IN 
    SELECT * FROM meeting_one_on_one_recurrence 
    WHERE is_active = true 
    AND next_occurrence <= CURRENT_DATE
  LOOP
    BEGIN
      -- Create the new meeting
      INSERT INTO meetings_one_on_one (
        account_id,
        manager_id,
        collaborator_id,
        scheduled_at,
        duration_minutes,
        status,
        recurrence_id,
        template_id
      ) VALUES (
        rec.account_id,
        rec.manager_id,
        rec.collaborator_id,
        (rec.next_occurrence || ' ' || COALESCE(rec.preferred_time, '10:00:00'))::TIMESTAMPTZ,
        30,
        'scheduled',
        rec.id,
        rec.template_id
      ) RETURNING id INTO new_meeting_id;

      -- If there's a template, copy items
      IF rec.template_id IS NOT NULL THEN
        SELECT items INTO template_items 
        FROM meeting_one_on_one_templates 
        WHERE id = rec.template_id;
        
        IF template_items IS NOT NULL THEN
          item_index := 0;
          FOR item IN SELECT * FROM jsonb_array_elements(template_items)
          LOOP
            INSERT INTO meeting_one_on_one_items (
              meeting_id,
              item_type,
              content,
              order_index,
              created_by
            ) VALUES (
              new_meeting_id,
              (item->>'type')::text,
              (item->>'content')::text,
              item_index,
              rec.manager_id
            );
            item_index := item_index + 1;
          END LOOP;
        END IF;
      END IF;

      -- Carry over pending actions from last completed meeting
      SELECT id INTO last_meeting_id
      FROM meetings_one_on_one
      WHERE account_id = rec.account_id
        AND manager_id = rec.manager_id
        AND collaborator_id = rec.collaborator_id
        AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1;

      IF last_meeting_id IS NOT NULL THEN
        SELECT COALESCE(MAX(order_index), -1) INTO max_order
        FROM meeting_one_on_one_items
        WHERE meeting_id = new_meeting_id;

        FOR pending_action IN
          SELECT * FROM meeting_one_on_one_items
          WHERE meeting_id = last_meeting_id
            AND item_type = 'action'
            AND is_completed = false
        LOOP
          max_order := max_order + 1;
          INSERT INTO meeting_one_on_one_items (
            meeting_id,
            item_type,
            content,
            due_date,
            order_index,
            created_by
          ) VALUES (
            new_meeting_id,
            'action',
            '[Pendente] ' || pending_action.content,
            pending_action.due_date,
            max_order,
            rec.manager_id
          );
        END LOOP;
      END IF;

      -- Calculate next occurrence
      next_date := CASE rec.frequency
        WHEN 'weekly' THEN rec.next_occurrence + INTERVAL '7 days'
        WHEN 'biweekly' THEN rec.next_occurrence + INTERVAL '14 days'
        WHEN 'monthly' THEN rec.next_occurrence + INTERVAL '1 month'
        ELSE rec.next_occurrence + INTERVAL '7 days'
      END;

      -- Update the recurrence with next date
      UPDATE meeting_one_on_one_recurrence
      SET next_occurrence = next_date,
          updated_at = NOW()
      WHERE id = rec.id;

      RAISE NOTICE 'Created meeting % for recurrence %, next: %', new_meeting_id, rec.id, next_date;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing recurrence %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Schedule the cron job to run daily at 6:00 AM UTC
SELECT cron.schedule(
  'process-one-on-one-recurrences',
  '0 6 * * *',
  'SELECT public.process_one_on_one_recurrences()'
);