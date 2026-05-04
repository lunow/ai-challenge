
-- Temporarily disable the handle_new_user trigger so we can insert profiles ourselves with fixed IDs
DO $$
DECLARE
  ids uuid[] := ARRAY[
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000009',
    'a0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000012'
  ]::uuid[];
  emails text[] := ARRAY[
    'paul+seed@merge.community','ada+seed@example.com','lena+seed@example.com','marcus+seed@example.com',
    'priya+seed@example.com','sam+seed@example.com','tobias+seed@example.com','yuki+seed@example.com',
    'elif+seed@example.com','ravi+seed@example.com','nora+seed@example.com','dani+seed@example.com'
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(ids,1) LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = ids[i]) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', ids[i], 'authenticated', 'authenticated',
        emails[i], crypt('seed-password-not-used', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '', '', '', ''
      );
    END IF;
  END LOOP;
END $$;
