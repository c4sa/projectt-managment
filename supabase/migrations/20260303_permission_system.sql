-- Permission System Migration
-- Run in Supabase SQL Editor or via supabase db push

-- 1. Add assigned manager columns to projects
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS assigned_manager_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_manager_name TEXT;

-- 1b. Allow project_manager role in app_users
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.app_users'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE app_users DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
    CHECK (role IN ('admin', 'user', 'project_manager'));
EXCEPTION WHEN duplicate_object THEN NULL; -- constraint already allows project_manager
END $$;

-- 2. Convert team_members from text[] to JSONB if needed (for TeamMember objects)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'team_members'
    AND udt_name = '_text'
  ) THEN
    ALTER TABLE projects
      ALTER COLUMN team_members TYPE JSONB
      USING (COALESCE(to_jsonb(ARRAY(SELECT unnest(team_members))::text[]), '[]'::jsonb));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Create approval_workflows table (TEXT id for consistency with schema)
CREATE TABLE IF NOT EXISTS approval_workflows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create document_comments table (TEXT FKs to match documents.id and app_users.id)
CREATE TABLE IF NOT EXISTS document_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: Create index for document_comments lookups
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);

-- 5. Enable RLS on new tables (consistent with schema)
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
