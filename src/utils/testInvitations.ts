import { inviteNewUser, inviteMultipleUsers } from '../services/invitationService';

// Simple test function to verify invitation service works
export async function testInvitationFlow() {
  try {
    console.log('Testing invitation service...');
    
    // Test single invitation
    const singleResult = await inviteNewUser({
      email: 'test@example.com',
      role: 'student',
      supervisorId: 'supervisor-123',
      supervisorName: 'Test Supervisor',
    });
    
    console.log('Single invitation result:', singleResult);
    
    // Test bulk invitations
    const bulkResult = await inviteMultipleUsers(
      ['student1@example.com', 'student2@example.com'],
      'student',
      'supervisor-123',
      'Test Supervisor'
    );
    
    console.log('Bulk invitation result:', bulkResult);
    
    return { singleResult, bulkResult };
  } catch (error) {
    console.error('Test failed:', error);
    return { error };
  }
}

// Test email validation
export function testEmailValidation(emails: string[]): string[] {
  return emails.filter(email => email.includes('@') && email.includes('.'));
}