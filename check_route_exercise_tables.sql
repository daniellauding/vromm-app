-- Check if route exercise tables exist and their structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('route_exercise_sessions', 'route_exercise_completions')
ORDER BY table_name, ordinal_position;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('route_exercise_sessions', 'route_exercise_completions');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('route_exercise_sessions', 'route_exercise_completions');

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('route_exercise_sessions', 'route_exercise_completions'); 