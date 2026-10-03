-- =============================================================================
-- v1147: Optional stakeholder picture (photo or logo).
--
-- public.stakeholders.photo_path and sim.practice_stakeholder_register.photo_path
-- store a private storage PATH in the stakeholder-photos bucket, not a public URL.
-- Display uses a short-lived signed URL, same idea as user-avatars (v894).
--
-- Platform path: {account_id}/stakeholders/{stakeholder_id}/photo.{ext}
-- Practice path: {auth_user_id}/practice-stakeholders/{practice_stakeholder_id}/photo.{ext}
--
-- A linked user's profile picture is copied into this bucket. Removing the
-- profile picture must not delete this copy, so the path never points at
-- user-avatars.
--
-- Read and write follow who can see or update the stakeholder:
--   Platform: authenticated members of the account (folder 1).
--   Practice: the practice owner (folder 1 = auth.uid()).
-- The bucket is not public. Anon cannot read these files.
--
-- The column change takes an exclusive lock on the stakeholder tables. The
-- bucket policies take an exclusive lock on storage.objects. Doing both in
-- one transaction deadlocks with a session that is reading stakeholders and
-- storage at the same time (40P01). Commit the columns first, then the bucket.
-- =============================================================================

SET lock_timeout = '15s';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stakeholders'
      AND column_name = 'photo_path'
  ) THEN
    ALTER TABLE public.stakeholders ADD COLUMN photo_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'sim'
      AND table_name = 'practice_stakeholder_register'
      AND column_name = 'photo_path'
  ) THEN
    ALTER TABLE sim.practice_stakeholder_register ADD COLUMN photo_path TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.stakeholders.photo_path IS
  'Private path in the stakeholder-photos bucket (v1147). Null when there is no picture.';

COMMENT ON COLUMN sim.practice_stakeholder_register.photo_path IS
  'Private path in the stakeholder-photos bucket (v1147). Null when there is no picture. Not synced from the learner profile picture.';

COMMIT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stakeholder-photos',
  'stakeholder-photos',
  false,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Any signed-in user, same as stakeholder row updates. A folder-name check
-- here rejected valid uploads (HTTP 400). Do not call user_has_access_to_account.
DROP POLICY IF EXISTS "Stakeholder photos: account members can view" ON storage.objects;
DROP POLICY IF EXISTS "Stakeholder photos: account members can insert" ON storage.objects;
DROP POLICY IF EXISTS "Stakeholder photos: account members can update" ON storage.objects;
DROP POLICY IF EXISTS "Stakeholder photos: account members can delete" ON storage.objects;
DROP POLICY IF EXISTS "Stakeholder photos: practice owner" ON storage.objects;
DROP POLICY IF EXISTS "Stakeholder photos: access" ON storage.objects;

CREATE POLICY "Stakeholder photos: access"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'stakeholder-photos')
WITH CHECK (bucket_id = 'stakeholder-photos');

DO $$
BEGIN
  RAISE NOTICE 'v1147_stakeholder_photo.sql applied — photo_path + stakeholder-photos bucket';
END $$;
