// BETTER SOLUTION: Create direct relationship for existing users
// Instead of trying to use email invitations for existing users,
// create relationships directly and send in-app notifications

// Add this function to RelationshipManagementModal.tsx

const handleInviteExistingUserDirectly = async (targetUser: { id: string; full_name: string; email: string | null; role: string }) => {
  if (!user?.id || !profile?.id) return;
  
  try {
    setLoading(true);
    
    // Create relationship directly for existing users
    if (userRole === 'student') {
      // Student inviting a supervisor - create student_supervisor_relationship
      const { error: relationError } = await supabase
        .from('student_supervisor_relationships')
        .insert({
          student_id: profile.id,
          supervisor_id: targetUser.id,
          status: 'pending' // Set as pending until accepted
        });
        
      if (relationError) {
        console.error('Error creating supervisor relationship:', relationError);
        throw new Error('Failed to create supervisor relationship');
      }
      
    } else {
      // Instructor inviting a student - create student_supervisor_relationship  
      const { error: relationError } = await supabase
        .from('student_supervisor_relationships')
        .insert({
          student_id: targetUser.id,
          supervisor_id: profile.id,
          status: 'pending' // Set as pending until accepted
        });
        
      if (relationError) {
        console.error('Error creating student relationship:', relationError);
        throw new Error('Failed to create student relationship');
      }
    }
    
    // Create in-app notification for the target user
    const notificationType = userRole === 'student' ? 'supervisor_invitation' : 'student_invitation';
    const message = userRole === 'student' 
      ? `${profile.full_name || 'Someone'} invited you to be their supervisor`
      : `${profile.full_name || 'Someone'} invited you to be their student`;
    
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUser.id,
        actor_id: profile.id,
        type: notificationType,
        title: 'New Invitation',
        message,
        data: {
          invitation_type: userRole === 'student' ? 'student_invites_supervisor' : 'supervisor_invites_student',
          inviter_id: profile.id,
          inviter_name: profile.full_name
        },
        action_url: 'vromm://notifications',
        priority: 'high',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (notificationError) {
      console.warn('Failed to create notification:', notificationError);
      // Don't fail the whole operation for notification errors
    }
    
    // Try to send push notification
    try {
      const { pushNotificationService } = await import('../services/pushNotificationService');
      await pushNotificationService.sendInvitationNotification(
        profile.id,
        targetUser.id,
        profile.full_name || 'Someone',
        profile.role || 'user',
        userRole === 'student' ? 'supervisor' : 'student'
      );
    } catch (pushError) {
      console.warn('Push notification failed:', pushError);
      // Don't fail for push notification errors
    }
    
    Alert.alert(
      'Invitation Sent! 🎉', 
      `${targetUser.full_name || 'User'} will receive a notification about your invitation.`
    );
    
    // Clear search and refresh
    setSearchQuery('');
    setSearchResults([]);
    onRefresh?.();
    
  } catch (error) {
    console.error('Error sending direct invitation:', error);
    Alert.alert('Error', `Failed to send invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
};

// Replace the existing onPress logic in the search results with this:
// onPress={() => handleInviteExistingUserDirectly(user)}
