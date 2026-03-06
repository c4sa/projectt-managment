-- Add archived column to projects table for archive functionality
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
