-- Cleanup script for route exercise tables
-- WARNING: This will delete all route exercise data!
-- Only run this if you want to start completely fresh

-- Drop tables in reverse order due to foreign key constraints
DROP TABLE IF EXISTS route_exercise_completions CASCADE;
DROP TABLE IF EXISTS route_exercise_sessions CASCADE;

-- Drop indexes (they should be dropped automatically with tables, but just in case)
DROP INDEX IF EXISTS idx_route_exercise_sessions_route_user;
DROP INDEX IF EXISTS idx_route_exercise_sessions_user_status;
DROP INDEX IF EXISTS idx_route_exercise_completions_session;

-- Confirm cleanup
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_exercise_sessions') 
        THEN 'route_exercise_sessions still exists'
        ELSE 'route_exercise_sessions dropped successfully'
    END as sessions_status,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_exercise_completions') 
        THEN 'route_exercise_completions still exists'
        ELSE 'route_exercise_completions dropped successfully'
    END as completions_status; 