-- Create onboarding_slides table
CREATE TABLE IF NOT EXISTS public.onboarding_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_sv TEXT NOT NULL,
  text_en TEXT NOT NULL,
  text_sv TEXT NOT NULL,
  image_url TEXT,
  icon TEXT,
  icon_color TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.onboarding_slides ENABLE ROW LEVEL SECURITY;

-- Grant all access to authenticated users
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Enable read access for authenticated users" 
      ON public.onboarding_slides
      FOR SELECT 
      TO authenticated
      USING (true);
  EXCEPTION
    WHEN duplicate_object THEN
      -- Policy already exists, do nothing
  END;
END
$$;

-- Grant all access to admin users 
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Enable all access for admin users" 
      ON public.onboarding_slides
      FOR ALL 
      TO authenticated
      USING (auth.jwt() ->> 'role' = 'admin');
  EXCEPTION
    WHEN duplicate_object THEN
      -- Policy already exists, do nothing
  END;
END
$$;

-- Insert some default slides if they don't exist
INSERT INTO public.onboarding_slides (title_en, title_sv, text_en, text_sv, icon, icon_color, "order")
SELECT 
  'Welcome to Vromm', 
  'Välkommen till Vromm', 
  'Your new companion for driver training', 
  'Din nya kompanjon för körkortsutbildning', 
  'road', 
  '#3498db', 
  1
WHERE 
  NOT EXISTS (SELECT 1 FROM public.onboarding_slides WHERE "order" = 1);

INSERT INTO public.onboarding_slides (title_en, title_sv, text_en, text_sv, icon, icon_color, "order")
SELECT 
  'Discover Routes', 
  'Upptäck Rutter', 
  'Find training routes created by driving schools and other learners', 
  'Hitta övningsrutter skapade av trafikskolor och andra elever', 
  'map-marker', 
  '#2ecc71', 
  2
WHERE 
  NOT EXISTS (SELECT 1 FROM public.onboarding_slides WHERE "order" = 2);

INSERT INTO public.onboarding_slides (title_en, title_sv, text_en, text_sv, icon, icon_color, "order")
SELECT 
  'Join the Community', 
  'Gå med i gemenskapen', 
  'Share your experiences and learn from others', 
  'Dela med dig av dina erfarenheter och lär från andra', 
  'users', 
  '#e74c3c', 
  3
WHERE 
  NOT EXISTS (SELECT 1 FROM public.onboarding_slides WHERE "order" = 3);

-- Add triggers for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS set_updated_at ON public.onboarding_slides;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.onboarding_slides
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 