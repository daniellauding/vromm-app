-- Show exact table structures
SELECT 
  'student_supervisor_relationships' as table_name,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships' 
AND table_schema = 'public'
ORDER BY ordinal_position;
