-- Preferences only: membership and authorization remain exclusively in SSO.
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS team_id uuid;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."user"'::regclass AND conname='user_team_context_requires_org') THEN
  ALTER TABLE public."user" ADD CONSTRAINT user_team_context_requires_org CHECK (team_id IS NULL OR organization_id IS NOT NULL);
 END IF;
END $$;
