-- Insert profiles for existing auth.users that don't have one
INSERT INTO profiles (id, email, first_name, last_name, account_id)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'last_name',
  (SELECT c.id FROM companies c WHERE c.user_id = u.id LIMIT 1)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;