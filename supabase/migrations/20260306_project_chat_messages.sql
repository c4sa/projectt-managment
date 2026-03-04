-- Project Chat Messages
-- Enables team members to chat within each project

CREATE TABLE IF NOT EXISTS project_chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_chat_messages_project_id ON project_chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_chat_messages_created_at ON project_chat_messages(created_at);

ALTER TABLE project_chat_messages ENABLE ROW LEVEL SECURITY;
