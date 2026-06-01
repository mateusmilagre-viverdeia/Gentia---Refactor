-- Remove the INTEGER overload of add_credits to prevent RPC ambiguity
DROP FUNCTION IF EXISTS public.add_credits(uuid, text, integer, text, text);
