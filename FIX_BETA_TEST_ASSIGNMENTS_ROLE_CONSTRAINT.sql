-- Fix beta_test_assignments role constraint to include all valid roles
-- This will resolve the "violates check constraint beta_test_assignments_role_check" error

-- First, let's see what the current constraint is
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'beta_test_assignments'::regclass AND contype = 'c';

-- Check what roles currently exist in the table
-- SELECT DISTINCT role FROM beta_test_assignments;

-- Drop the existing constraint (it might have a different name)
ALTER TABLE beta_test_assignments DROP CONSTRAINT IF EXISTS beta_test_assignments_role_check;
ALTER TABLE beta_test_assignments DROP CONSTRAINT IF EXISTS beta_test_assignments_check;
ALTER TABLE beta_test_assignments DROP CONSTRAINT IF EXISTS beta_test_assignments_role_check1;

-- Update any invalid roles to valid ones
UPDATE beta_test_assignments SET role = 'student' WHERE role NOT IN ('student', 'instructor', 'teacher', 'school', 'admin');
UPDATE beta_test_assignments SET role = 'instructor' WHERE role = 'supervisor';
UPDATE beta_test_assignments SET role = 'school' WHERE role = 'driving_school';

-- Add the new constraint that includes all valid roles from user_role enum
ALTER TABLE beta_test_assignments ADD CONSTRAINT beta_test_assignments_role_check 
CHECK (role IN ('student', 'instructor', 'teacher', 'school', 'admin'));

-- Verify the constraint was added
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'beta_test_assignments'::regclass AND contype = 'c';

-- Test that all roles are now accepted
-- INSERT INTO beta_test_assignments (assignment_id, browser_id, role, title, description, order_index) 
-- VALUES ('test-1', '00000000-0000-0000-0000-000000000000', 'instructor', 'Test', 'Test description', 1);
-- INSERT INTO beta_test_assignments (assignment_id, browser_id, role, title, description, order_index) 
-- VALUES ('test-2', '00000000-0000-0000-0000-000000000000', 'school', 'Test', 'Test description', 1);
