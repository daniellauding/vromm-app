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
CREATE POLICY "Enable read access for authenticated users" 
  ON public.onboarding_slides
  FOR SELECT 
  TO authenticated
  USING (true);

-- Grant all access to admin users (assuming admin role exists)
CREATE POLICY "Enable all access for admin users" 
  ON public.onboarding_slides
  FOR ALL 
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Insert some default slides
INSERT INTO public.onboarding_slides (title_en, title_sv, text_en, text_sv, icon, icon_color, "order")
VALUES 
  ('Welcome to Vromm', 'Välkommen till Vromm', 'Your new companion for driver training', 'Din nya kompanjon för körkortsutbildning', 'road', '#3498db', 1),
  ('Discover Routes', 'Upptäck Rutter', 'Find training routes created by driving schools and other learners', 'Hitta övningsrutter skapade av trafikskolor och andra elever', 'map-marker', '#2ecc71', 2),
  ('Join the Community', 'Gå med i gemenskapen', 'Share your experiences and learn from others', 'Dela med dig av dina erfarenheter och lär från andra', 'users', '#e74c3c', 3);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.onboarding_slides
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 