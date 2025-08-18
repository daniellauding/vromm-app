-- Add missing profile translations for mobile platform
INSERT INTO public.translations (key, language, value, platform, created_at, updated_at)
VALUES 
  -- English translations
  ('profile.title', 'en', 'Profile', 'mobile', now(), now()),
  ('profile.fullName', 'en', 'Full Name', 'mobile', now(), now()),
  ('profile.fullNamePlaceholder', 'en', 'Enter your full name', 'mobile', now(), now()),
  ('profile.location', 'en', 'Location', 'mobile', now(), now()),
  ('profile.locationPlaceholder', 'en', 'Enter your location', 'mobile', now(), now()),
  ('profile.roles.instructor', 'en', 'Instructor', 'mobile', now(), now()),
  ('profile.schools', 'en', 'Schools', 'mobile', now(), now()),
  ('profile.privateProfile', 'en', 'Private Profile', 'mobile', now(), now()),
  ('profile.onboardingTour', 'en', 'Take Onboarding Tour', 'mobile', now(), now()),
  ('profile.contentUpdatesDemo', 'en', 'Content Updates Demo', 'mobile', now(), now()),
  ('profile.translationDemo', 'en', 'Translation Demo', 'mobile', now(), now()),
  ('profile.updateProfile', 'en', 'Update Profile', 'mobile', now(), now()),
  ('profile.signOut', 'en', 'Sign Out', 'mobile', now(), now()),
  ('profile.developerOptions', 'en', 'Developer Options', 'mobile', now(), now()),
  ('profile.resetOnboarding', 'en', 'Reset Onboarding', 'mobile', now(), now()),
  ('profile.refreshTranslations', 'en', 'Refresh Translations', 'mobile', now(), now()),
  ('profile.roles.title', 'en', 'Select Role', 'mobile', now(), now()),
  ('profile.roles.student', 'en', 'Student', 'mobile', now(), now()),
  ('profile.experienceLevels.advanced', 'en', 'Advanced', 'mobile', now(), now()),
  
  -- Swedish translations
  ('profile.title', 'sv', 'Profil', 'mobile', now(), now()),
  ('profile.fullName', 'sv', 'Fullständigt namn', 'mobile', now(), now()),
  ('profile.fullNamePlaceholder', 'sv', 'Ange ditt fullständiga namn', 'mobile', now(), now()),
  ('profile.location', 'sv', 'Plats', 'mobile', now(), now()),
  ('profile.locationPlaceholder', 'sv', 'Ange din plats', 'mobile', now(), now()),
  ('profile.roles.instructor', 'sv', 'Instruktör', 'mobile', now(), now()),
  ('profile.schools', 'sv', 'Skolor', 'mobile', now(), now()),
  ('profile.privateProfile', 'sv', 'Privat profil', 'mobile', now(), now()),
  ('profile.onboardingTour', 'sv', 'Ta onboarding-turné', 'mobile', now(), now()),
  ('profile.contentUpdatesDemo', 'sv', 'Demo av innehållsuppdateringar', 'mobile', now(), now()),
  ('profile.translationDemo', 'sv', 'Översättningsdemo', 'mobile', now(), now()),
  ('profile.updateProfile', 'sv', 'Uppdatera profil', 'mobile', now(), now()),
  ('profile.signOut', 'sv', 'Logga ut', 'mobile', now(), now()),
  ('profile.developerOptions', 'sv', 'Utvecklaralternativ', 'mobile', now(), now()),
  ('profile.resetOnboarding', 'sv', 'Återställ onboarding', 'mobile', now(), now()),
  ('profile.refreshTranslations', 'sv', 'Uppdatera översättningar', 'mobile', now(), now()),
  ('profile.roles.title', 'sv', 'Välj roll', 'mobile', now(), now()),
  ('profile.roles.student', 'sv', 'Elev', 'mobile', now(), now()),
  ('profile.experienceLevels.advanced', 'sv', 'Avancerad', 'mobile', now(), now())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();