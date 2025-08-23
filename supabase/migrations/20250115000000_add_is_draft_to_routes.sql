-- Add is_draft column to routes table
-- This allows routes to be saved as drafts (private, work-in-progress routes)

-- Add the is_draft column with default false
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Create an index for better performance when filtering drafts
CREATE INDEX IF NOT EXISTS idx_routes_is_draft ON routes(is_draft);

-- Create a composite index for user drafts (common query pattern)
CREATE INDEX IF NOT EXISTS idx_routes_creator_draft ON routes(creator_id, is_draft) 
WHERE is_draft = true;

-- Update existing routes to ensure they are not drafts by default
UPDATE routes 
SET is_draft = false 
WHERE is_draft IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN routes.is_draft IS 'Indicates if the route is a draft (work-in-progress, private route)';
