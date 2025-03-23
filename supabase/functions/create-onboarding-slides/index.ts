import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies will be applied.
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Only proceed if the request is authenticated as admin
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the admin status
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Error fetching user profile", details: profileError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized, admin role required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Using a service role client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create the table if it doesn't exist
    const createTableQuery = `
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
    `;

    const rlsPolicyQuery = `
      ALTER TABLE public.onboarding_slides ENABLE ROW LEVEL SECURITY;

      CREATE POLICY IF NOT EXISTS "Enable read access for authenticated users" 
        ON public.onboarding_slides
        FOR SELECT 
        TO authenticated
        USING (true);

      CREATE POLICY IF NOT EXISTS "Enable all access for admin users" 
        ON public.onboarding_slides
        FOR ALL 
        TO authenticated
        USING (auth.jwt() ->> 'role' = 'admin');
    `;

    const triggerQuery = `
      CREATE OR REPLACE FUNCTION public.handle_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS set_updated_at ON public.onboarding_slides;
      
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.onboarding_slides
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
    `;

    // Execute the queries
    const { error: createTableError } = await supabaseAdmin.rpc('pgql_exec', { 
      query: createTableQuery 
    });

    if (createTableError) {
      return new Response(
        JSON.stringify({ error: "Error creating table", details: createTableError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error: rlsPolicyError } = await supabaseAdmin.rpc('pgql_exec', { 
      query: rlsPolicyQuery 
    });

    if (rlsPolicyError) {
      return new Response(
        JSON.stringify({ error: "Error setting RLS policies", details: rlsPolicyError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error: triggerError } = await supabaseAdmin.rpc('pgql_exec', { 
      query: triggerQuery 
    });

    if (triggerError) {
      return new Response(
        JSON.stringify({ error: "Error creating trigger", details: triggerError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert default slides if none exist
    const { count, error: countError } = await supabaseAdmin
      .from('onboarding_slides')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return new Response(
        JSON.stringify({ error: "Error checking for existing slides", details: countError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (count === 0) {
      const { error: insertError } = await supabaseAdmin
        .from('onboarding_slides')
        .insert([
          {
            title_en: 'Welcome to Vromm',
            title_sv: 'Välkommen till Vromm',
            text_en: 'Your new companion for driver training',
            text_sv: 'Din nya kompanjon för körkortsutbildning',
            icon: 'road',
            icon_color: '#3498db',
            order: 1
          },
          {
            title_en: 'Discover Routes',
            title_sv: 'Upptäck Rutter',
            text_en: 'Find training routes created by driving schools and other learners',
            text_sv: 'Hitta övningsrutter skapade av trafikskolor och andra elever',
            icon: 'map-marker',
            icon_color: '#2ecc71',
            order: 2
          },
          {
            title_en: 'Join the Community',
            title_sv: 'Gå med i gemenskapen',
            text_en: 'Share your experiences and learn from others',
            text_sv: 'Dela med dig av dina erfarenheter och lär från andra',
            icon: 'users',
            icon_color: '#e74c3c',
            order: 3
          }
        ]);

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Error inserting default slides", details: insertError }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Onboarding slides table created and initialized successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 