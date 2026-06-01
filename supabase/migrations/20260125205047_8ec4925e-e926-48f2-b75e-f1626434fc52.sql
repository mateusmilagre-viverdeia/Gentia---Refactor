-- Helper function to increment unlock count
CREATE OR REPLACE FUNCTION increment_unlock_count(pool_entry_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE shared_talent_pool
  SET unlock_count = unlock_count + 1
  WHERE id = pool_entry_id;
END;
$$;