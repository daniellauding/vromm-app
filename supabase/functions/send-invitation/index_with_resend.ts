import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email template function
function getEmailTemplate(params: any) {
  const { email, role, supervisorName, inviterRole, relationshipType, inviteUrl } = params;

  if (relationshipType === 'student_invites_supervisor') {
    return {
      subject: `${supervisorName} needs your guidance on Vromm`,
      html: `
        <h2>🚗 You're Invited to Guide a Student</h2>
        <p><strong>${supervisorName}</strong> has invited you to become their Driving Supervisor on Vromm.</p>
        <p>As a Supervisor, you'll be able to:</p>
        <ul>
          <li>📊 Track ${supervisorName}'s driving progress</li>
          <li>🗺️ View their practice routes</li>
          <li>✅ Help them complete exercises</li>
          <li>📈 Monitor their improvement</li>
        </ul>
        <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
      `
    };
  } else if (relationshipType === 'supervisor_invites_student') {
    return {
      subject: `${supervisorName} wants to help you with your driving journey`,
      html: `
        <h2>🎓 Start Your Driving Journey with Vromm</h2>
        <p><strong>${supervisorName}</strong> has invited you to join Vromm as a Student Driver.</p>
        <p>With Vromm, you'll be able to:</p>
        <ul>
          <li>📱 Track your practice hours</li>
          <li>🗺️ Record your routes</li>
          <li>📚 Complete driving exercises</li>
          <li>👨‍🏫 Get guidance from ${supervisorName}</li>
        </ul>
        <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 30px; background: #56ab2f; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
      `
    };
  }

  return {
    subject: `You're invited to join Vromm`,
    html: `
      <h2>Welcome to Vromm</h2>
      <p>${supervisorName ? `${supervisorName} has invited you` : 'You have been invited'} to join Vromm as a ${role}.</p>
      <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
    `
  };
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Create invitation record
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

    // Generate invite URL
    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'
    const inviteToken = crypto.randomUUID()
    const inviteUrl = `${baseUrl}/auth/invite?token=${inviteToken}&email=${encodeURIComponent(email)}&role=${role}`

    // Get email template
    const { subject, html } = getEmailTemplate({
      email,
      role,
      supervisorName,
      inviterRole,
      relationshipType,
      inviteUrl,
    })

    // Try to send with Resend if API key is available
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Vromm <noreply@your-domain.com>', // Update with your verified domain
          to: email,
          subject,
          html,
        }),
      })

      if (!res.ok) {
        const error = await res.text()
        console.error('Resend error:', error)
        // Fall back to Supabase Auth
      } else {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Custom invitation sent successfully',
            invitationId: invitation.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fallback to Supabase Auth invitation
    const redirectTo = relationshipType === 'student_invites_supervisor' 
      ? `${baseUrl}/signup?role=instructor&invited_by=${supervisorId}`
      : `${baseUrl}/signup?role=${role}`

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