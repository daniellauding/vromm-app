-- SQL to fix the creator information in saved and driven routes

-- First, update the join query in HomeScreen for saved routes
-- Original: .select('*, routes(*)')
-- Update to: .select('*, routes(*, creator:creator_id(full_name))')

-- Second, update the join query in HomeScreen for driven routes
-- Original: .select('*, routes(*)')
-- Update to: .select('*, routes(*, creator:creator_id(full_name))')

-- No actual database schema changes are needed, just update the queries in the code 