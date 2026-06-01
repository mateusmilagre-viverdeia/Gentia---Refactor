-- Drop the overly-permissive public UPDATE policy
DROP POLICY IF EXISTS "Public token can mark viewed/respond" ON public.commercial_proposals;

-- Replace with a SECURITY DEFINER function that only updates allowed fields
CREATE OR REPLACE FUNCTION public.mark_commercial_proposal_response(
  _token UUID,
  _action TEXT,
  _reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_id UUID;
  v_status public.commercial_proposal_status;
BEGIN
  IF _token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_token');
  END IF;

  SELECT id, status INTO v_proposal_id, v_status
  FROM public.commercial_proposals
  WHERE public_token = _token;

  IF v_proposal_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF _action = 'view' THEN
    UPDATE public.commercial_proposals
    SET viewed_at = COALESCE(viewed_at, now()),
        viewed_count = viewed_count + 1,
        status = CASE WHEN status = 'sent' THEN 'viewed'::public.commercial_proposal_status ELSE status END
    WHERE id = v_proposal_id;
  ELSIF _action = 'accept' THEN
    IF v_status IN ('accepted','rejected','expired') THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_decided');
    END IF;
    UPDATE public.commercial_proposals
    SET accepted_at = now(), status = 'accepted'
    WHERE id = v_proposal_id;
  ELSIF _action = 'reject' THEN
    IF v_status IN ('accepted','rejected','expired') THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_decided');
    END IF;
    UPDATE public.commercial_proposals
    SET rejected_at = now(), status = 'rejected', rejection_reason = _reason
    WHERE id = v_proposal_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action');
  END IF;

  RETURN jsonb_build_object('success', true, 'proposal_id', v_proposal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_commercial_proposal_response(UUID, TEXT, TEXT) TO anon, authenticated;