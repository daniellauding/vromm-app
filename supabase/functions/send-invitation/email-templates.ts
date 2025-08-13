// Email templates for different invitation scenarios

export interface EmailTemplateParams {
  email: string;
  role: string;
  supervisorName?: string;
  inviterRole?: string;
  relationshipType?: string;
  inviteUrl: string;
}

export function getEmailTemplate(params: EmailTemplateParams): { subject: string; html: string } {
  const { email, role, supervisorName, inviterRole, relationshipType, inviteUrl } = params;

  // Determine the email content based on relationship type
  if (relationshipType === 'student_invites_supervisor') {
    return getStudentInvitesSupervisorTemplate(params);
  } else if (relationshipType === 'supervisor_invites_student') {
    return getSupervisorInvitesStudentTemplate(params);
  } else {
    return getGenericInvitationTemplate(params);
  }
}

function getStudentInvitesSupervisorTemplate(params: EmailTemplateParams): { subject: string; html: string } {
  const { supervisorName, inviteUrl } = params;
  
  return {
    subject: `${supervisorName} needs your guidance on Vromm`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e1e1e1; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .role-badge { display: inline-block; padding: 5px 15px; background: #f0f4ff; color: #667eea; border-radius: 20px; font-weight: bold; margin: 10px 0; }
            .benefits { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .benefits ul { margin: 10px 0; padding-left: 20px; }
            .footer { text-align: center; color: #888; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 You're Invited to Guide a Student</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              
              <p><strong>${supervisorName}</strong> has invited you to become their <span class="role-badge">Driving Supervisor</span> on Vromm.</p>
              
              <div class="benefits">
                <h3>As a Supervisor, you'll be able to:</h3>
                <ul>
                  <li>📊 Track ${supervisorName}'s driving progress and practice hours</li>
                  <li>🗺️ View their practice routes and driving patterns</li>
                  <li>✅ Help them complete their driving exercises</li>
                  <li>📈 Monitor their improvement over time</li>
                  <li>🎯 Guide them towards their driving license goals</li>
                </ul>
              </div>
              
              <p>This invitation allows you to support ${supervisorName} in their journey to becoming a confident driver.</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation & Create Account</a>
              </div>
              
              <p><small>If you don't want to accept this invitation, you can safely ignore this email.</small></p>
            </div>
            <div class="footer">
              <p>© 2025 Vromm - Your Driving Journey Companion</p>
              <p>This invitation was sent to ${params.email}</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

function getSupervisorInvitesStudentTemplate(params: EmailTemplateParams): { subject: string; html: string } {
  const { supervisorName, inviteUrl } = params;
  
  return {
    subject: `${supervisorName} wants to help you with your driving journey`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e1e1e1; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #56ab2f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .role-badge { display: inline-block; padding: 5px 15px; background: #f0fff4; color: #56ab2f; border-radius: 20px; font-weight: bold; margin: 10px 0; }
            .benefits { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .benefits ul { margin: 10px 0; padding-left: 20px; }
            .footer { text-align: center; color: #888; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Start Your Driving Journey with Vromm</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              
              <p><strong>${supervisorName}</strong> has invited you to join Vromm as a <span class="role-badge">Student Driver</span>.</p>
              
              <div class="benefits">
                <h3>With Vromm, you'll be able to:</h3>
                <ul>
                  <li>📱 Track your driving practice hours automatically</li>
                  <li>🗺️ Record and review your practice routes</li>
                  <li>📚 Complete structured driving exercises</li>
                  <li>📊 Monitor your progress towards your license</li>
                  <li>👨‍🏫 Get guidance from ${supervisorName} as your supervisor</li>
                </ul>
              </div>
              
              <p>${supervisorName} will be able to view your progress and help guide you through your driving education.</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation & Start Learning</a>
              </div>
              
              <p><small>If you don't want to accept this invitation, you can safely ignore this email.</small></p>
            </div>
            <div class="footer">
              <p>© 2025 Vromm - Your Driving Journey Companion</p>
              <p>This invitation was sent to ${params.email}</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

function getGenericInvitationTemplate(params: EmailTemplateParams): { subject: string; html: string } {
  const { role, supervisorName, inviteUrl } = params;
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  
  return {
    subject: `You're invited to join Vromm as a ${roleDisplay}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #e1e1e1; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #888; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Welcome to Vromm</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              
              <p>${supervisorName ? `<strong>${supervisorName}</strong> has invited you` : 'You have been invited'} to join Vromm as a <strong>${roleDisplay}</strong>.</p>
              
              <p>Vromm is your comprehensive driving education companion, helping you track progress, complete exercises, and achieve your driving goals.</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </div>
              
              <p><small>If you don't want to accept this invitation, you can safely ignore this email.</small></p>
            </div>
            <div class="footer">
              <p>© 2025 Vromm - Your Driving Journey Companion</p>
              <p>This invitation was sent to ${params.email}</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}