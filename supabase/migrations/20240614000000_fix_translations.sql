-- Ensure the common.cancel translation exists
INSERT INTO public.translations (key, language, value, platform)
VALUES
  ('common.cancel', 'en', 'Cancel', 'mobile'),
  ('common.cancel', 'sv', 'Avbryt', 'mobile')
ON CONFLICT (key, language) DO UPDATE 
SET value = EXCLUDED.value, 
    updated_at = NOW();

-- Fix organization_number_required_for_school constraint
-- First check if the constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_number_required_for_school'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE public.profiles DROP CONSTRAINT organization_number_required_for_school;
    
    -- Re-create it with a less strict check
    ALTER TABLE public.profiles ADD CONSTRAINT organization_number_required_for_school 
      CHECK (
        role != 'school' OR 
        (role = 'school' AND organization_number IS NOT NULL AND organization_number != '')
      );
  END IF;
END $$; 