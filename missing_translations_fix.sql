-- Add missing translation keys
INSERT INTO public.translations (key, language, value, platform)
VALUES
  -- Experience levels
  ('profile.experienceLevels.title', 'en', 'Experience Level', 'mobile'),
  ('profile.experienceLevels.title', 'sv', 'Erfarenhetsnivå', 'mobile'),
  ('profile.experienceLevels.beginner', 'en', 'Beginner', 'mobile'),
  ('profile.experienceLevels.beginner', 'sv', 'Nybörjare', 'mobile'),
  ('profile.experienceLevels.intermediate', 'en', 'Intermediate', 'mobile'),
  ('profile.experienceLevels.intermediate', 'sv', 'Mellannivå', 'mobile'),
  ('profile.experienceLevels.advanced', 'en', 'Advanced', 'mobile'),
  ('profile.experienceLevels.advanced', 'sv', 'Avancerad', 'mobile'),
  
  -- Roles
  ('profile.roles.title', 'en', 'Role', 'mobile'),
  ('profile.roles.title', 'sv', 'Roll', 'mobile'),
  ('profile.roles.student', 'en', 'Student', 'mobile'),
  ('profile.roles.student', 'sv', 'Elev', 'mobile'),
  ('profile.roles.instructor', 'en', 'Instructor', 'mobile'),
  ('profile.roles.instructor', 'sv', 'Instruktör', 'mobile'),
  ('profile.roles.school', 'en', 'School', 'mobile'),
  ('profile.roles.school', 'sv', 'Skola', 'mobile'),
  
  -- Profile actions
  ('profile.translationDemo', 'en', 'Translation Demo', 'mobile'),
  ('profile.translationDemo', 'sv', 'Översättnings Demo', 'mobile'),
  ('profile.onboardingTour', 'en', 'Onboarding Tour', 'mobile'),
  ('profile.onboardingTour', 'sv', 'Introduktionstur', 'mobile'),
  ('profile.resetOnboarding', 'en', 'Reset Onboarding', 'mobile'),
  ('profile.resetOnboarding', 'sv', 'Återställ Introduktion', 'mobile'),
  ('profile.refreshTranslations', 'en', 'Refresh Translations', 'mobile'),
  ('profile.refreshTranslations', 'sv', 'Uppdatera Översättningar', 'mobile'),
  
  -- Additional missing keys
  ('profile.title', 'en', 'Profile', 'mobile'),
  ('profile.title', 'sv', 'Profil', 'mobile'),
  ('profile.fullName', 'en', 'Full Name', 'mobile'),
  ('profile.fullName', 'sv', 'Fullständigt Namn', 'mobile'),
  ('profile.fullNamePlaceholder', 'en', 'Enter your full name', 'mobile'),
  ('profile.fullNamePlaceholder', 'sv', 'Ange ditt fullständiga namn', 'mobile'),
  ('profile.location', 'en', 'Location', 'mobile'),
  ('profile.location', 'sv', 'Plats', 'mobile'),
  ('profile.locationPlaceholder', 'en', 'Enter your location', 'mobile'),
  ('profile.locationPlaceholder', 'sv', 'Ange din plats', 'mobile'),
  ('profile.privateProfile', 'en', 'Private Profile', 'mobile'),
  ('profile.privateProfile', 'sv', 'Privat Profil', 'mobile'),
  ('profile.updating', 'en', 'Updating...', 'mobile'),
  ('profile.updating', 'sv', 'Uppdaterar...', 'mobile'),
  ('profile.updateProfile', 'en', 'Update Profile', 'mobile'),
  ('profile.updateProfile', 'sv', 'Uppdatera Profil', 'mobile'),
  ('profile.signOut', 'en', 'Sign Out', 'mobile'),
  ('profile.signOut', 'sv', 'Logga Ut', 'mobile'),
  ('profile.developerOptions', 'en', 'Developer Options', 'mobile'),
  ('profile.developerOptions', 'sv', 'Utvecklaralternativ', 'mobile'),
  ('profile.contentUpdatesDemo', 'en', 'Content Updates Demo', 'mobile'),
  ('profile.contentUpdatesDemo', 'sv', 'Innehållsuppdateringar Demo', 'mobile'),
  ('profile.refreshConfirm', 'en', 'This will reload all translations from the database. Continue?', 'mobile'),
  ('profile.refreshConfirm', 'sv', 'Detta kommer att ladda om alla översättningar från databasen. Fortsätta?', 'mobile'),
  ('profile.refreshSuccess', 'en', 'Translations refreshed successfully', 'mobile'),
  ('profile.refreshSuccess', 'sv', 'Översättningar uppdaterade framgångsrikt', 'mobile'),
  
  -- Settings
  ('settings.language.title', 'en', 'Language', 'mobile'),
  ('settings.language.title', 'sv', 'Språk', 'mobile')
  
ON CONFLICT (key, language) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

SELECT 'Missing translations added successfully!' as status; 