-- Add completed_at column to tasks table for tracking when tasks are completed
-- This enables auto-deletion of tasks completed > 24 hours ago

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at 
ON tasks(completed_at) 
WHERE status = 'completed';

-- Update existing completed tasks to have a completed_at timestamp
UPDATE tasks 
SET completed_at = created_at 
WHERE status = 'completed' AND completed_at IS NULL;
