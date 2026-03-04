-- Projex Parity Migration
-- Run in Supabase SQL Editor or via supabase db push
-- Adds: custom_roles, role_permissions, document_folders, document_activities
-- Updates: app_users (roles + custom_role_id), approval_workflows (levels, thresholds), documents (folder_id, etc.)

-- 1. app_users: update role constraint and add custom_role_id
-- IMPORTANT: Migrate data first (user -> employee), then apply new constraint

-- Step A: Drop existing role constraint
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.app_users'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE app_users DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Step B: Migrate existing 'user' role to 'employee' BEFORE adding new constraint
UPDATE app_users SET role = 'employee' WHERE role = 'user';

-- Step C: Add new constraint (admin, project_manager, finance, employee)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.app_users'::regclass
    AND conname = 'app_users_role_check'
  ) THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
      CHECK (role IN ('admin', 'project_manager', 'finance', 'employee'));
  END IF;
END $$;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS custom_role_id TEXT;

-- 2. custom_roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role_id TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT false,
  UNIQUE(role_id, module, action)
);

-- 4. document_folders (before document_activities and documents.folder_id)
CREATE TABLE IF NOT EXISTS document_folders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES document_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_folders_project_id ON document_folders(project_id);

-- 5. document_activities
CREATE TABLE IF NOT EXISTS document_activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES document_folders(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_activities_project_id ON document_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_document_activities_document_id ON document_activities(document_id);

-- 6. documents: add columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id TEXT REFERENCES document_folders(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS permissions JSONB;

-- 7. approval_workflows: extend for Projex model
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS levels JSONB DEFAULT '[]';
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS auto_approval_threshold NUMERIC DEFAULT 0;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS escalation_timeout_hours INT DEFAULT 24;

-- Enable RLS on new tables
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activities ENABLE ROW LEVEL SECURITY;
