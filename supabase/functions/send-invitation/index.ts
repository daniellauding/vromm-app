import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      email, 
      role = 'student', 
      supervisorId, 
      supervisorName,
      inviterRole,
      relationshipType 
    } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format if supervisorId is provided
    if (supervisorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supervisorId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid supervisor ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Create pending invitation record with enhanced metadata
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        invited_by: supervisorId,
        metadata: {
          supervisorName,
          inviterRole,
          relationshipType,
          invitedAt: new Date().toISOString(),
        },
        status: 'pending',
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Customize redirect URL based on relationship type
    // For mobile app, use deep link; for web, use web URL
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production'
    const webUrl = 'https://app.vromm.se'
    const mobileScheme = 'myapp://signup'
    
    const redirectTo = relationshipType === 'student_invites_supervisor' 
      ? `${mobileScheme}?role=instructor&invited_by=${supervisorId}`
      : `${mobileScheme}?role=${role}`

    // Send invitation email using Supabase Auth Admin API with enhanced data
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        supervisorId,
        supervisorName,
        inviterRole,
        relationshipType,
        invitationId: invitation.id,
      },
      redirectTo
    })

    if (error) {
      console.error('Error sending invitation email:', error)
      
      // Update invitation status to failed
      await supabaseAdmin
        .from('pending_invitations')
        .update({ status: 'failed', metadata: { ...invitation.metadata, error: error.message } })
        .eq('id', invitation.id)

      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        invitationId: invitation.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})