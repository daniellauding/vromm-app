-- Create A/B testing tables for onboarding and other feature tests
CREATE TABLE IF NOT EXISTS "public"."ab_tests" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "feature" text NOT NULL,
    "percentage" integer NOT NULL DEFAULT 50,
    "active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id"),
    CONSTRAINT "unique_active_feature_test" UNIQUE ("feature", "name", "active")
);

-- Add RLS policies
ALTER TABLE "public"."ab_tests" ENABLE ROW LEVEL SECURITY;

-- Allow admins to do anything with AB tests
CREATE POLICY "Admins can do anything with AB tests" ON "public"."ab_tests"
    USING (auth.jwt() ? 'admin')
    WITH CHECK (auth.jwt() ? 'admin');

-- Create user_settings table to track user preferences including onboarding status
-- This can be joined with users table in queries
CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id"),
    CONSTRAINT "unique_user_settings" UNIQUE ("user_id")
);

-- Add RLS policies
ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own settings
CREATE POLICY "Users can view their own settings" ON "public"."user_settings"
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own settings
CREATE POLICY "Users can update their own settings" ON "public"."user_settings"
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to do anything with user settings
CREATE POLICY "Admins can do anything with user settings" ON "public"."user_settings"
    USING (auth.jwt() ? 'admin')
    WITH CHECK (auth.jwt() ? 'admin');

-- Create a function to update timestamps automatically
CREATE OR REPLACE FUNCTION "public"."handle_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_ab_tests_updated_at
BEFORE UPDATE ON "public"."ab_tests"
FOR EACH ROW
EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER set_user_settings_updated_at
BEFORE UPDATE ON "public"."user_settings"
FOR EACH ROW
EXECUTE FUNCTION "public"."handle_updated_at"();

-- Function to reset onboarding for all users (admin only)
CREATE OR REPLACE FUNCTION "public"."reset_all_users_onboarding"()
RETURNS void AS $$
BEGIN
  -- Update all records in user_settings table
  UPDATE "public"."user_settings"
  SET 
    settings = jsonb_set(
      CASE WHEN settings IS NULL THEN '{}'::jsonb ELSE settings END,
      '{onboarding_completed}',
      'false'::jsonb
    ),
    updated_at = now();
  
  -- For any users who don't have a settings record yet, create one
  INSERT INTO "public"."user_settings" (user_id, settings)
  SELECT id, '{"onboarding_completed": false}'::jsonb
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM "public"."user_settings")
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set permissions on function
REVOKE ALL ON FUNCTION "public"."reset_all_users_onboarding"() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."reset_all_users_onboarding"() TO authenticated; 