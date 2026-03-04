-- Remove duplicate approval_workflows (keep one per type, delete duplicates)
-- Run before 20260305_seed_rbac_defaults if both are in same batch

DELETE FROM approval_workflows a
USING approval_workflows b
WHERE a.id > b.id AND a.type = b.type;

-- Add UNIQUE constraint to prevent future duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.approval_workflows'::regclass
    AND conname = 'approval_workflows_type_key'
  ) THEN
    ALTER TABLE approval_workflows ADD CONSTRAINT approval_workflows_type_key UNIQUE (type);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint may fail if duplicates remain; ignore
  NULL;
END $$;
