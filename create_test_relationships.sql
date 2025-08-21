-- Create test relationships between existing users
-- This will help test the relationship display in the admin panel

-- First, let's check what users we have available
SELECT 
  id, 
  full_name, 
  role, 
  email 
FROM profiles 
WHERE role IN ('student', 'instructor') 
  AND account_status = 'active'
ORDER BY role, full_name
LIMIT 10;

-- Now let's create some test relationships
-- We'll use some of the existing users from your database

-- Relationship 1: daniel+handledare (instructor) supervises daniel+student (student)
INSERT INTO student_supervisor_relationships (
  student_id, 
  supervisor_id, 
  status, 
  created_at
) VALUES (
  'c16a364f-3bc4-4d60-bca9-460e977fddea', -- daniel+student
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa', -- daniel+handledare
  'active',
  NOW()
) ON CONFLICT (student_id, supervisor_id) DO NOTHING;

-- Relationship 2: daniel+handledare (instructor) supervises daniel+lullu (student)
INSERT INTO student_supervisor_relationships (
  student_id, 
  supervisor_id, 
  status, 
  created_at
) VALUES (
  '8141d3d4-a666-4f87-a95c-f8f11ab7a4d6', -- daniel+lullu
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa', -- daniel+handledare
  'active',
  NOW()
) ON CONFLICT (student_id, supervisor_id) DO NOTHING;

-- Relationship 3: lauding (instructor) supervises daniel+testflight (student)
INSERT INTO student_supervisor_relationships (
  student_id, 
  supervisor_id, 
  status, 
  created_at
) VALUES (
  '0de9edf1-ae51-49bf-96e6-6a72ff91b54e', -- daniel+testflight
  'c9d6b566-3068-49bd-8d49-79ab2592bbaa', -- lauding
  'active',
  NOW()
) ON CONFLICT (student_id, supervisor_id) DO NOTHING;

-- Relationship 4: Test Instructor supervises daniel+testarsignaupp (student)
INSERT INTO student_supervisor_relationships (
  student_id, 
  supervisor_id, 
  status, 
  created_at
) VALUES (
  '33e36544-39ea-4444-838c-618837ad26d2', -- daniel+testarsignaupp
  '2fc29fc0-f582-4b2b-bc34-f81571161ddb', -- Test Instructor
  'active',
  NOW()
) ON CONFLICT (student_id, supervisor_id) DO NOTHING;

-- Relationship 5: daniel+handledare (instructor) supervises daniel+android (student)
INSERT INTO student_supervisor_relationships (
  student_id, 
  supervisor_id, 
  status, 
  created_at
) VALUES (
  'b6e5c34b-1f1a-4cb5-8990-ada27af7af2a', -- daniel+android
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa', -- daniel+handledare
  'active',
  NOW()
) ON CONFLICT (student_id, supervisor_id) DO NOTHING;

-- Verify the relationships were created
SELECT 
  ssr.id,
  ssr.student_id,
  student.full_name as student_name,
  ssr.supervisor_id,
  supervisor.full_name as supervisor_name,
  ssr.status,
  ssr.created_at
FROM student_supervisor_relationships ssr
JOIN profiles student ON student.id = ssr.student_id
JOIN profiles supervisor ON supervisor.id = ssr.supervisor_id
ORDER BY ssr.created_at DESC;
