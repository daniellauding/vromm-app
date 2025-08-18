import React, { useState, useEffect } from 'react';
import { Modal, ScrollView, Alert, TextInput } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Text } from '../components/Text';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import {
  getPendingInvitations,
  cancelInvitation,
  removeSupervisorRelationship,
  getStudentSupervisors,
  getIncomingInvitations,
  acceptInvitationById,
  rejectInvitation,
} from '../services/invitationService';
import { getPendingInvitations as getPendingInvitationsV2 } from '../services/invitationService_v2';
import { Feather } from '@expo/vector-icons';
import { RelationshipReviewModal } from './RelationshipReviewModal';

interface RelationshipManagementModalProps {
  visible: boolean;
  onClose: () => void;
  userRole: 'student' | 'supervisor' | 'teacher' | 'school' | 'admin' | 'instructor';
  // Student viewing functionality
  supervisedStudents?: Array<{ id: string; full_name: string; email: string; relationship_created?: string }>;
  onStudentSelect?: (studentId: string | null, studentName?: string) => void;
  // Supervisor selection functionality
  availableSupervisors?: Array<{ id: string; full_name: string; email: string }>;
  selectedSupervisorIds?: string[];
  onSupervisorSelect?: (supervisorIds: string[]) => void;
  onAddSupervisors?: (supervisorIds: string[]) => Promise<void>;
  // Invitation functionality
  onInviteUsers?: (emails: string[], role: string) => Promise<void>;
  // Refresh data
  onRefresh?: () => Promise<void>;
}

export function RelationshipManagementModal({
  visible,
  onClose,
  userRole,
  supervisedStudents = [],
  onStudentSelect,
  availableSupervisors = [],
  selectedSupervisorIds = [],
  onSupervisorSelect,
  onAddSupervisors,
  onInviteUsers,
  onRefresh,
}: RelationshipManagementModalProps) {
  const { profile, user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  
  // Modal tabs/modes - default to 'manage' for instructors
  const [activeTab, setActiveTab] = useState<'view' | 'manage' | 'invite' | 'pending'>(
    ['instructor', 'school', 'admin'].includes(userRole) ? 'manage' : 'view',
  );
  
  // Invitation states
  const [inviteMode, setInviteMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; full_name: string; email: string; role?: string }>
  >([]);
  const [newUserEmails, setNewUserEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<
    Array<{ id: string; email: string; role: string; status: string; created_at: string; metadata?: any }>
  >([]);
  const [incomingInvitations, setIncomingInvitations] = useState<
    Array<{ id: string; email: string; role: string; status: string; created_at: string }>
  >([]);
  const [currentSupervisors, setCurrentSupervisors] = useState<
    Array<{ 
      supervisor_id: string; 
      created_at: string; 
      profiles: { id: string; full_name: string; email: string; role: string } | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  
  // Local state for supervisor selection
  const [localSelectedSupervisorIds, setLocalSelectedSupervisorIds] = useState<string[]>(
    selectedSupervisorIds,
  );
  
  // Removal review modal state
  const [showRemovalReviewModal, setShowRemovalReviewModal] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    setLocalSelectedSupervisorIds(selectedSupervisorIds);
  }, [selectedSupervisorIds]);

  useEffect(() => {
    if (visible) {
      console.log('🚪 RelationshipManagementModal opened with data:');
      console.log('👤 User Role:', userRole);
      console.log('🔍 Available Supervisors:', availableSupervisors);
      console.log('👨‍🎓 Supervised Students:', supervisedStudents);
      console.log('📑 Active Tab:', activeTab);
      console.log('🆔 Current User ID:', user?.id);
      console.log('📧 Current User Email:', user?.email);
      console.log('👤 Profile ID:', profile?.id);
    }
    if (visible) {
      console.log('🔄 Modal opened, loading data for tab:', activeTab, 'userRole:', userRole);
      
      // Always load pending invitations (sent by user) for all roles
      console.log('📋 Loading pending invitations (sent by user)...');
      loadPendingInvitations();
      
      // Always load incoming invitations (received by user) for all roles
      console.log('📥 Loading incoming invitations (received by user)...');
      loadIncomingInvitations();
      
      // Load role-specific data
      if (activeTab === 'manage' && userRole === 'student' && profile?.id) {
        console.log('👨‍🎓 Loading current supervisors for student...');
        loadCurrentSupervisors();
      }
    }
  }, [visible, activeTab]);

  // Add real-time subscription for pending invitations updates
  useEffect(() => {
    if (!visible || !profile?.id) return;

    console.log('🔔 Setting up real-time subscription for pending invitations');
    const subscription = supabase
      .channel('pending_invitations_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pending_invitations',
        filter: `invited_by=eq.${profile.id}`,
      }, (payload) => {
        console.log('🔄 Pending invitation changed:', payload);
        // Refresh pending invitations when they change
        loadPendingInvitations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pending_invitations',
        filter: `email=eq.${user?.email}`,
      }, (payload) => {
        console.log('🔄 Incoming invitation changed:', payload);
        // Refresh incoming invitations when they change
        loadIncomingInvitations();
      })
      .subscribe();

    return () => {
      console.log('🔕 Unsubscribing from pending invitations changes');
      subscription.unsubscribe();
    };
  }, [visible, profile?.id, user?.email]);

  const loadPendingInvitations = async () => {
    if (!profile?.id) {
      console.log('❌ No profile ID for loading pending invitations');
      return;
    }
    
    console.log('📤 Loading pending invitations for user:', profile.id);
    try {
      const invitations = await getPendingInvitationsV2(profile.id);
      console.log('📤 Loaded pending invitations:', invitations);
      console.log('📤 Setting pending invitations state with', invitations.length, 'items');
      
      // Filter out old accepted invitations (older than 24 hours) and clean them up
      const now = new Date();
      const filteredInvitations = [];
      const toCleanup = [];
      
      for (const invitation of invitations) {
        if (invitation.status === 'accepted') {
          const acceptedAt = new Date(invitation.accepted_at || invitation.updated_at);
          const hoursOld = (now.getTime() - acceptedAt.getTime()) / (1000 * 60 * 60);
          
          if (hoursOld > 24) {
            toCleanup.push(invitation.id);
          } else {
            filteredInvitations.push(invitation);
          }
        } else {
          filteredInvitations.push(invitation);
        }
      }
      
      // Clean up old accepted invitations
      if (toCleanup.length > 0) {
        console.log('🧹 Cleaning up', toCleanup.length, 'old accepted invitations');
        await supabase
          .from('pending_invitations')
          .delete()
          .in('id', toCleanup);
      }
      
      console.log('📤 Setting pending invitations state:', filteredInvitations);
      setPendingInvitations(filteredInvitations);
    } catch (error) {
      console.error('❌ Error loading pending invitations:', error);
    }
  };

  const loadIncomingInvitations = async () => {
    if (!user?.email) {
      console.log('❌ No user email for loading incoming invitations');
      return;
    }
    
    console.log('📥 Loading incoming invitations for email:', user.email);
    try {
      // Use direct query instead of service function for more control
      const { data: invitations, error } = await supabase
        .from('pending_invitations')
        .select(`
          id, 
          email, 
          role, 
          status, 
          created_at, 
          invited_by, 
          metadata,
          inviter:profiles!pending_invitations_invited_by_fkey (
            full_name,
            email,
            role
          )
        `)
        .eq('email', user.email.toLowerCase())
        .in('status', ['pending', 'accepted']) // Show both pending and recently accepted
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading incoming invitations:', error);
        return;
      }

      console.log('📥 Raw incoming invitations:', invitations);
      
      // Filter out invitations where relationship already exists (unless recently accepted)
      const filteredInvitations: Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        created_at: string;
        invited_by: string;
        metadata?: any;
        inviter?: any;
      }> = [];
      for (const inv of invitations || []) {
        if (inv.status === 'accepted') {
          // Show recently accepted invitations (within 24 hours)
          const acceptedTime = new Date(inv.created_at).getTime();
          const now = Date.now();
          const hoursOld = (now - acceptedTime) / (1000 * 60 * 60);
          
          if (hoursOld <= 24) {
            filteredInvitations.push(inv);
          }
        } else {
          // For pending invitations, check if relationship already exists
          const { data: existingRelationship } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(`and(student_id.eq.${user.id},supervisor_id.eq.${inv.invited_by}),and(student_id.eq.${inv.invited_by},supervisor_id.eq.${user.id})`)
            .limit(1);

          if (!existingRelationship || existingRelationship.length === 0) {
            filteredInvitations.push(inv);
          }
        }
      }

      console.log('📥 Setting incoming invitations state:', filteredInvitations);
      setIncomingInvitations(filteredInvitations);
      
      // Force a re-render by updating a dummy state if we have invitations but they're not showing
      if (filteredInvitations.length > 0) {
        console.log('📥 Force updating state to ensure render...');
        setTimeout(() => setIncomingInvitations([...filteredInvitations]), 100);
      }
    } catch (error) {
      console.error('❌ Error loading incoming invitations:', error);
      setIncomingInvitations([]); // Ensure state is reset on error
    }
  };

  const loadCurrentSupervisors = async () => {
    if (!profile?.id) {
      console.log('❌ No profile ID for loading current supervisors');
      return;
    }
    
    console.log('👨‍🏫 Loading current supervisors for student:', profile.id);
    try {
      const supervisors = await getStudentSupervisors(profile.id);
      console.log('👨‍🏫 Loaded current supervisors:', supervisors);
      setCurrentSupervisors(supervisors);
    } catch (error) {
      console.error('❌ Error loading current supervisors:', error);
    }
  };

  const handleRemoveSupervisor = async (supervisorId: string) => {
    if (!profile?.id) return;
    
    // Find the supervisor details
    const supervisor = currentSupervisors.find(s => s.supervisor_id === supervisorId);
    if (!supervisor) return;
    
    setRemovalTarget({
      id: supervisorId,
      name: supervisor.profiles?.full_name || 'Unknown Supervisor',
      email: supervisor.profiles?.email || '',
      role: supervisor.profiles?.role || 'instructor',
    });
    setShowRemovalReviewModal(true);
  };

  // Handle removal completion after review
  const handleRemovalComplete = async () => {
    if (!removalTarget || !profile?.id) return;

    try {
      const success = await removeSupervisorRelationship(
        profile.id, // studentId
        removalTarget.id, // supervisorId
        'Review submitted', // removalMessage
        profile.id // removedByUserId
      );
      
      if (success) {
        Alert.alert('Success', 'Supervisor removed successfully and review submitted');
        loadCurrentSupervisors();
        onRefresh?.();
      } else {
        Alert.alert('Error', 'Failed to remove supervisor');
      }
    } catch (error) {
      console.error('Error removing supervisor:', error);
      Alert.alert('Error', 'Failed to remove supervisor');
    } finally {
      setRemovalTarget(null);
      setShowRemovalReviewModal(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!profile?.id) return;
    
    // Show input dialog for removal message
    Alert.prompt(
      'Remove Student',
      'Are you sure you want to stop supervising this student?\n\nOptional: Add a message explaining why:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async (message) => {
            try {
              const success = await removeSupervisorRelationship(
                studentId, 
                profile.id, 
                message?.trim() || undefined,
                profile.id
              );
              if (success) {
                Alert.alert('Success', 'Student removed successfully');
                onRefresh?.();
              } else {
                Alert.alert('Error', 'Failed to remove student');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove student');
            }
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleSearch = async (query: string) => {
    console.log('🔍 handleSearch called with query:', query);
    setSearchQuery(query);
    if (query.length < 2) {
      console.log('❌ Query too short, clearing results');
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      console.log('⏳ Starting search...');
      
      // Search for existing users based on role (only use valid database enum values)
      const targetRole = userRole === 'student' ? ['instructor', 'admin', 'school'] : ['student'];
      console.log('🎯 Searching for users with query:', query);
      console.log('🎭 Target roles:', targetRole);
      console.log('👤 Current user role:', userRole);
      
      // First, let's see what roles exist for this query
      const { data: allMatchingUsers, error: allError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
        
      console.log('🔍 All users matching query (before role filter):', allMatchingUsers);
      console.log('❌ All users error:', allError);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .in('role', targetRole)
        .limit(10);

      console.log('📊 Search results raw:', data);
      console.log('❌ Search error:', error);
      console.log('🔢 Results count:', data?.length || 0);

      if (!error && data) {
        // Filter out users without emails and log the issue
        const usersWithEmails = data.filter(user => {
          if (!user.email) {
            console.warn('User found without email:', { id: user.id, name: user.full_name, role: user.role });
            return false;
          }
          return true;
        });
        
        console.log('📋 Setting search results to:', usersWithEmails);
        setSearchResults(usersWithEmails);
        usersWithEmails.forEach(user => {
          console.log('👤 Found user:', { id: user.id, name: user.full_name, email: user.email, role: user.role });
        });
        
        if (data.length > usersWithEmails.length) {
          console.warn(`Filtered out ${data.length - usersWithEmails.length} users without email addresses`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteNewUsers = async () => {
    if (!newUserEmails.trim() || !onInviteUsers) return;

    const emails = newUserEmails
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.includes('@'));

    if (emails.length === 0) {
      Alert.alert('Error', 'Please enter valid email addresses');
      return;
    }

    try {
      setLoading(true);
      const targetRole = userRole === 'student' ? 'supervisor' : 'student';
      
      // Create invitations with custom message
      const invitationsWithMessage = emails.map(email => ({ 
        email, 
        customMessage: customMessage.trim() || undefined 
      }));
      
      // For now, call the existing function - we'll need to update it to handle custom messages
      await onInviteUsers(emails, targetRole);
      
      setNewUserEmails('');
      setCustomMessage(''); // Clear custom message
      setActiveTab('pending');
      loadPendingInvitations();
    } catch (error) {
      console.error('Invitation error:', error);
      Alert.alert('Error', `Failed to send invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle invitation for existing users - always create pending invitation that requires acceptance
  const handleInviteExistingUserDirectly = async (targetUser: {
    id: string;
    full_name: string;
    email: string | null;
    role?: string;
  }) => {
    console.log('🚀🚀🚀 handleInviteExistingUserDirectly STARTED');
    console.log('🚀 handleInviteExistingUserDirectly called with:', {
      targetUser,
      userRole,
      currentUserId: user?.id,
      currentUserEmail: user?.email,
    });
    
    if (!user?.id || !targetUser.id || !targetUser.email) {
      console.error('❌ Missing required data:', {
        userId: user?.id,
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
      });
      return;
    }
    
    try {
      setLoading(true);
      console.log('📝 Creating pending invitation...');
      
      // Check for ANY existing invitation from this user to this email (regardless of status)
      const { data: existingInvitations } = await supabase
        .from('pending_invitations')
        .select('id, status, created_at')
        .eq('email', targetUser.email.toLowerCase())
        .eq('invited_by', user.id)
        .in('status', ['pending', 'accepted']);

      if (existingInvitations && existingInvitations.length > 0) {
        const pendingInvitation = existingInvitations.find(inv => inv.status === 'pending');
        const acceptedInvitation = existingInvitations.find(inv => inv.status === 'accepted');
        
        if (pendingInvitation) {
          const invitationAge = Date.now() - new Date(pendingInvitation.created_at).getTime();
          const hoursOld = invitationAge / (1000 * 60 * 60);
          
          console.log('ℹ️ Pending invitation already exists (', hoursOld.toFixed(1), 'hours old)');
          Alert.alert(
            'Invitation Already Sent',
            `You already sent an invitation to ${targetUser.full_name || targetUser.email} ${hoursOld < 1 ? 'less than an hour' : Math.round(hoursOld) + ' hours'} ago. Please wait for them to respond.`,
          );
          return;
        }
        
        if (acceptedInvitation) {
          console.log('ℹ️ Invitation already accepted - relationship should exist');
          Alert.alert(
            'Invitation Already Accepted',
            `${targetUser.full_name || targetUser.email} has already accepted your invitation. The relationship should be active.`,
          );
          return;
        }
      }
      
      // Determine relationship type and target role
      const relationshipType = userRole === 'student' 
        ? 'student_invites_supervisor' 
        : 'supervisor_invites_student';
      const targetRole = userRole === 'student' ? 'instructor' : 'student';
      
      // Create pending invitation that requires acceptance
      const { data: invitationData, error: inviteError } = await supabase
        .from('pending_invitations')
        .insert({
          email: targetUser.email.toLowerCase(),
          role: targetRole,
          invited_by: user.id,
          metadata: {
            supervisorName: profile?.full_name || user.email,
            inviterRole: userRole,
            relationshipType,
            invitedAt: new Date().toISOString(),
            targetUserId: targetUser.id, // Store target user ID for existing users
            targetUserName: targetUser.full_name,
            customMessage: customMessage.trim() || undefined, // Add custom message
          },
          status: 'pending',
        })
        .select()
        .single();
        
      console.log('📤 Invitation creation result:', {
        data: invitationData,
        error: inviteError,
      });
        
      if (inviteError) {
        if (inviteError.code === '23505') {
          console.log('ℹ️ Invitation already exists (duplicate key)');
          Alert.alert('Info', 'An invitation has already been sent to this user.');
          return;
        } else {
          console.error('❌ Error creating invitation:', inviteError);
          throw new Error('Failed to create invitation');
        }
      }
      
      // CRITICAL: Ensure invitation was created successfully before proceeding
      if (!invitationData || !invitationData.id) {
        console.error('❌ Invitation creation failed - no data returned');
        throw new Error('Failed to create invitation - no data returned');
      }
      
      console.log('✅ Invitation created successfully with ID:', invitationData.id);
      
      // Create in-app notification for the target user about the invitation
      console.log('📢 Creating invitation notification for target user...');
      const notificationType = userRole === 'student' 
        ? 'supervisor_invitation' 
        : 'student_invitation';
      const message = userRole === 'student' 
        ? `${profile?.full_name || user.email || 'Someone'} wants you to be their supervisor`
        : `${profile?.full_name || user.email || 'Someone'} wants you to be their student`;
      
      console.log('📧 Invitation notification details:', {
        user_id: targetUser.id,
        actor_id: user.id,
        type: notificationType,
        title: 'New Invitation',
        message,
      });
      
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUser.id,
          actor_id: user.id,
          type: notificationType as Database['public']['Enums']['notification_type'],
          title: 'New Supervision Request',
          message,
          metadata: {
            relationship_type: relationshipType,
            from_user_id: user.id,
            from_user_name: profile?.full_name || user.email,
            invitation_id: invitationData.id, // Now guaranteed to exist
          },
          action_url: 'vromm://notifications',
          priority: 'high',
          is_read: false,
        })
        .select()
        .single();
        
      console.log('📢 Invitation notification creation result:', {
        data: notificationData,
        error: notificationError,
      });
        
      if (notificationError) {
        console.warn('⚠️ Failed to create invitation notification:', notificationError);
        // Don't fail the whole operation for notification errors
      } else {
        console.log('✅ Invitation notification created successfully');
      }
      
      console.log('🎉 Showing success alert...');
      Alert.alert(
        'Invitation Sent! 📤',
        `An invitation has been sent to ${targetUser.full_name || 'the user'}. They will need to accept it before the relationship is created.`,
      );
      
      // Clear search and refresh
      console.log('🔄 Clearing search and refreshing data...');
      setSearchQuery('');
      setSearchResults([]);
      setCustomMessage(''); // Clear custom message
      onRefresh?.();
      
    } catch (error) {
      console.error('❌ Error creating invitation:', error);
      Alert.alert(
        'Error',
        `Failed to send invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      
      // Also remove any related notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('metadata->invitation_id', invitationId);
      
      loadPendingInvitations();
      Alert.alert('Success', 'Invitation cancelled');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      Alert.alert('Error', 'Failed to cancel invitation');
    }
  };

  const handleSupervisorToggle = (supervisorId: string) => {
    const newSelection = localSelectedSupervisorIds.includes(supervisorId)
      ? localSelectedSupervisorIds.filter((id) => id !== supervisorId)
      : [...localSelectedSupervisorIds, supervisorId];
    
    setLocalSelectedSupervisorIds(newSelection);
    onSupervisorSelect?.(newSelection);
  };

  const handleAddSupervisors = async () => {
    if (onAddSupervisors && localSelectedSupervisorIds.length > 0) {
      try {
        // TODO: Pass custom message to onAddSupervisors function
        console.log('📧 Adding supervisors with custom message:', customMessage);
        await onAddSupervisors(localSelectedSupervisorIds);
        
        // Clear custom message after successful addition
        setCustomMessage('');
        onClose();
      } catch (error) {
        console.error('Error adding supervisors:', error);
      }
    }
  };

  const renderTabs = () => {
    const tabs = [];
    
    if (userRole === 'student') {
      tabs.push(
        { key: 'view', label: 'Request', icon: 'user-plus' },
        { key: 'manage', label: 'Current', icon: 'users' },
        { key: 'invite', label: 'Invite New', icon: 'send' }
      );
    } else if (['instructor', 'school', 'admin', 'supervisor', 'teacher'].includes(userRole)) {
      tabs.push(
        { key: 'manage', label: 'My Students', icon: 'users' },
        { key: 'view', label: 'Select Student', icon: 'eye' },
        { key: 'invite', label: 'Invite', icon: 'user-plus' }
      );
    }
    
    tabs.push({ key: 'pending', label: 'Pending', icon: 'clock' });

    return (
      <XStack gap="$2" marginBottom="$4">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onPress={() => {
              setActiveTab(tab.key as any);
              // Force refresh data when Pending tab is clicked
              if (tab.key === 'pending') {
                console.log('📋 Pending tab clicked - force refreshing data');
                setTimeout(() => {
                  loadPendingInvitations();
                  loadIncomingInvitations();
                }, 100);
              }
            }}
            variant={activeTab === tab.key ? 'primary' : 'tertiary'}
            size="sm"
            flex={1}
          >
            <XStack alignItems="center" gap="$1">
              <Feather name={tab.icon as any} size={14} />
              <Text size="xs">{tab.label}</Text>
            </XStack>
          </Button>
        ))}
      </XStack>
    );
  };

  const renderManageTab = () => {
    if (userRole === 'student') {
      // Show current supervisors for students
      return (
        <YStack gap="$2" flex={1}>
          <Text size="sm" color="$gray11">
            Your current supervisors ({currentSupervisors.length})
          </Text>
          {/* Debug info */}
          {__DEV__ && (
            <Text size="xs" color="$blue11">
              Debug: Found {currentSupervisors.length} supervisors
            </Text>
          )}
          {currentSupervisors.length === 0 ? (
            <Text color="$gray11" textAlign="center" padding="$4">
              No supervisors assigned yet
            </Text>
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              <YStack gap="$2" padding="$2">
                {currentSupervisors.map((supervisor) => (
                  <XStack
                    key={supervisor.supervisor_id}
                    justifyContent="space-between"
                    alignItems="center"
                    backgroundColor="$backgroundHover"
                    padding="$3"
                    borderRadius="$3"
                  >
                    <YStack flex={1}>
                      <Text weight="semibold" size="sm">
                        {supervisor.profiles?.full_name || 'Unknown'}
                      </Text>
                      <Text color="$gray11" size="xs">
                        {supervisor.profiles?.email || 'No email'}
                      </Text>
                      <Text color="$gray11" size="xs">
                        Supervising since {new Date(supervisor.created_at).toLocaleDateString()} at {new Date(supervisor.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </YStack>
                    <Button
                      size="sm"
                      variant="secondary"
                      backgroundColor="$red9"
                      onPress={() => handleRemoveSupervisor(supervisor.supervisor_id)}
                    >
                      <Text color="white">Remove</Text>
                    </Button>
                  </XStack>
                ))}
              </YStack>
            </ScrollView>
          )}
        </YStack>
      );
    } else {
      // Show supervised students for instructors with ability to remove
      return (
        <YStack gap="$4" flex={1}>
          {/* Removed duplicate incoming invitations section - they appear in Pending tab */}
          <Text size="sm" color="$gray11">
            Students you are currently supervising
          </Text>
          {supervisedStudents.length === 0 ? (
            <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
              <Text color="$gray11" textAlign="center">
                No students supervised yet. Invite students to get started.
              </Text>
            </YStack>
          ) : (
            <ScrollView 
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              <YStack gap="$3">
                {supervisedStudents.map((student) => (
                  <XStack
                    key={student.id}
                    justifyContent="space-between"
                    alignItems="center"
                    backgroundColor="$gray3"
                    padding="$3"
                    borderRadius="$3"
                    borderWidth={1}
                    borderColor="$gray6"
                  >
                    <YStack flex={1}>
                      <Text weight="semibold" size="sm" color="$color">{student.full_name}</Text>
                      <Text color="$gray11" size="xs">{student.email}</Text>
                      {student.relationship_created && (
                        <Text color="$gray11" size="xs">
                          Student since {new Date(student.relationship_created).toLocaleDateString()} at {new Date(student.relationship_created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </YStack>
                    <XStack gap="$2">
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => {
                          onStudentSelect?.(student.id, student.full_name);
                          onClose();
                        }}
                      >
                        View
                      </Button>
                                <Button
            size="sm"
            variant="tertiary"
            backgroundColor="$red9"
            onPress={() => {
              // Find the student details for removal review
              const studentToRemove = supervisedStudents.find(s => s.id === student.id);
              if (!studentToRemove) return;
              
              setRemovalTarget({
                id: student.id,
                name: studentToRemove.full_name,
                email: studentToRemove.email,
                role: 'student',
              });
              setShowRemovalReviewModal(true);
            }}
          >
                                    <Text color="white">Remove</Text>
          </Button>
                    </XStack>
                  </XStack>
                ))}
              </YStack>
            </ScrollView>
          )}
        </YStack>
      );
    }
  };

  const renderViewTab = () => {
    if (userRole === 'student') {
      // Show supervisors to select
      console.log('Rendering supervisor list for student view:');
      console.log('Available supervisors count:', availableSupervisors.length);
      availableSupervisors.forEach(supervisor => {
        console.log('Rendering supervisor:', supervisor);
      });
      
      return (
        <YStack gap="$2" flex={1}>
          <Text size="sm" color="$gray11">
            Select supervisors who can view your progress and help with your learning
          </Text>
          
          {/* Custom message field for Request tab */}
          <YStack gap="$1">
            <Text size="sm" color="$gray11">Optional personal message:</Text>
            <TextInput
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Add a personal message to your request..."
              multiline
              style={{
                backgroundColor: '#2A2A2A',
                padding: 12,
                borderRadius: 8,
                color: 'white',
                borderWidth: 1,
                borderColor: '#444',
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />
          </YStack>
          
          <ScrollView 
            style={{ 
              flex: 1,
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#333'
            }}
            contentContainerStyle={{ padding: 8 }}
          >
              {availableSupervisors.length === 0 ? (
                <>
                  {console.log('🚨 No supervisors available to display!')}
                  <Text color="$gray11" textAlign="center" padding="$4">
                    No supervisors/schools/teachers/admins available. They may need to be invited first.
                  </Text>
                </>
              ) : (
                availableSupervisors.map((supervisor) => {
                  const isSelected = localSelectedSupervisorIds.includes(supervisor.id);
                  const hasPendingInvite = pendingInvitations.some((inv) => inv.email?.toLowerCase() === (supervisor.email || '').toLowerCase() && inv.status === 'pending');
                  console.log(`Rendering button for ${supervisor.full_name}, selected: ${isSelected}`);
                  return (
                      <Button
                      key={supervisor.id}
                      onPress={() => { if (!hasPendingInvite) handleSupervisorToggle(supervisor.id); }}
                        variant={hasPendingInvite ? 'secondary' : isSelected ? 'primary' : 'tertiary'}
                      justifyContent="flex-start"
                      width="100%"
                      marginBottom="$2"
                    >
                      <XStack alignItems="center" gap="$2" flex={1} width="100%">
                        {hasPendingInvite ? (
                          <Feather name="clock" size={16} color="#F59E0B" />
                        ) : (
                          <Feather 
                            name={isSelected ? 'check-circle' : 'circle'} 
                            size={16} 
                            color={isSelected ? 'white' : '#999'}
                          />
                        )}
                        <YStack flex={1} alignItems="flex-start">
                          <Text weight="semibold" size="sm" color={isSelected ? 'white' : '$color'}>
                            {supervisor.full_name || 'Unnamed'}
                          </Text>
                          <Text color={isSelected ? '$gray3' : '$gray11'} size="xs">
                            {supervisor.email || 'No email'}{hasPendingInvite ? ' • Invitation pending' : ''}
                          </Text>
                        </YStack>
                      </XStack>
                    </Button>
                  );
                })
              )}
          </ScrollView>

          {localSelectedSupervisorIds.length > 0 && (
            <Button onPress={handleAddSupervisors} variant="primary">
              Add {localSelectedSupervisorIds.length} Supervisor{localSelectedSupervisorIds.length > 1 ? 's' : ''}
            </Button>
          )}
        </YStack>
      );
    } else {
      // Show current supervised students for quick selection
      console.log('Rendering student selection for instructor view:');
      console.log('User role:', userRole);
      console.log('Supervised students count:', supervisedStudents.length);
      
      return (
        <YStack gap="$4" flex={1}>
          <Text size="sm" color="$gray11">
            Select a student to view their progress and data
          </Text>

          {supervisedStudents.length === 0 ? (
            <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
              <Text color="$gray11" textAlign="center">
                No students supervised yet. Go to "My Students" tab to manage your students.
              </Text>
            </YStack>
          ) : (
            <ScrollView 
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              <YStack gap="$3">
                {/* Option to view own profile */}
                  <Button
                  onPress={() => {
                    onStudentSelect?.(null);
                    onClose();
                  }}
                    variant={activeStudentId === null ? 'primary' : 'tertiary'}
                  backgroundColor={activeStudentId === null ? '$blue9' : '$gray3'}
                  borderWidth={1}
                  borderColor="$gray6"
                  justifyContent="flex-start"
                  padding="$3"
                >
                  <XStack alignItems="center" gap="$3" flex={1}>
                    <Feather name="user" size={16} color={activeStudentId === null ? 'white' : '$gray11'} />
                    <YStack alignItems="flex-start" flex={1}>
                          <Text weight="semibold" size="sm" color={activeStudentId === null ? 'white' : '$color'}>
                        My Own Profile
                      </Text>
                      <Text color={activeStudentId === null ? '$gray3' : '$gray11'} size="xs">
                        View your own progress and data
                      </Text>
                    </YStack>
                  </XStack>
                </Button>

                {supervisedStudents.map((student) => {
                  const isActive = activeStudentId === student.id;
                  return (
                    <Button
                      key={student.id}
                      onPress={() => {
                        onStudentSelect?.(student.id, student.full_name);
                        onClose();
                      }}
                      variant={isActive ? 'primary' : 'tertiary'}
                      backgroundColor={isActive ? '$blue9' : '$gray3'}
                      borderWidth={1}
                      borderColor="$gray6"
                      justifyContent="flex-start"
                      padding="$3"
                    >
                      <XStack alignItems="center" gap="$3" flex={1}>
                        <Feather name="user" size={16} color={isActive ? 'white' : '$gray11'} />
                        <YStack flex={1} alignItems="flex-start">
                          <Text weight="semibold" size="sm" color={isActive ? 'white' : '$color'}>
                            {student.full_name}
                          </Text>
                          <Text color={isActive ? '$gray3' : '$gray11'} size="xs">
                            {student.email}
                          </Text>
                        </YStack>
                      </XStack>
                    </Button>
                  );
                })}
              </YStack>
            </ScrollView>
          )}
        </YStack>
      );
    }
  };

  const renderInviteTab = () => {
    return (
      <YStack flex={1} gap="$4">
        <Text size="sm" color="$gray11">
          {userRole === 'student' 
            ? 'Search existing users or enter email addresses to invite new supervisors'
            : 'Search existing users or enter email addresses to invite new students'}
        </Text>

        {/* Toggle between search existing and invite new */}
        <XStack gap="$2">
          <Button
            onPress={() => setInviteMode('search')}
            variant={inviteMode === 'search' ? 'primary' : 'tertiary'}
            size="sm"
            flex={1}
          >
            SEARCH EXISTING
          </Button>
          <Button
            onPress={() => setInviteMode('new')}
            variant={inviteMode === 'new' ? 'primary' : 'tertiary'}
            size="sm"
            flex={1}
          >
            INVITE NEW
          </Button>
        </XStack>

        {inviteMode === 'search' ? (
          <YStack flex={1} gap="$3">
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name or email..."
              autoCapitalize="none"
              style={{
                backgroundColor: '#2A2A2A',
                padding: 12,
                borderRadius: 8,
                color: 'white',
                borderWidth: 1,
                borderColor: '#444',
              }}
            />
            
            <TextInput
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Optional: Add a personal message..."
              multiline
              autoCapitalize="sentences"
              style={{
                backgroundColor: '#2A2A2A',
                padding: 12,
                borderRadius: 8,
                color: 'white',
                borderWidth: 1,
                borderColor: '#444',
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />

            {loading ? (
              <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
                <Text intent="muted" textAlign="center">
                  Searching...
                </Text>
              </YStack>
            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
              <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
                <Text intent="muted" textAlign="center">
                  No users found matching "{searchQuery}"
                </Text>
              </YStack>
            ) : searchQuery.length < 2 ? (
              <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
                <Text intent="muted" textAlign="center">
                  Type at least 2 characters to search
                </Text>
              </YStack>
            ) : (
              <ScrollView 
                style={{ flex: 1 }} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingVertical: 8 }}
              >
                <YStack gap="$3">
                  {searchResults.map((user) => (
                    <Button
                      key={user.id}
                      variant="tertiary"
                      backgroundColor="$gray3"
                      borderWidth={1}
                      borderColor="$gray6"
                      justifyContent="flex-start"
                      padding="$3"
                      onPress={() => {
                        console.log('🔍 Search result button pressed for user:', user);
                        console.log('📋 Current context:', { userRole, currentUserId: profile?.id });
                        
                        // Handle sending invitation to existing user
                        console.log('🚨 About to show Alert.alert for user:', user);
                        
                        // Check if there's already a pending invitation
                        const hasPendingInvite = pendingInvitations.some(
                          (inv) => inv.email?.toLowerCase() === (user.email || '').toLowerCase()
                        );
                        
                        if (hasPendingInvite) {
                          Alert.alert(
                            'Resend Invitation?', 
                            `There's already a pending invitation to ${user.full_name || user.email}. Would you like to resend it?`, 
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Resend Invitation', 
                                onPress: () => {
                                  console.log('🔄 User confirmed resending invitation:', user);
                                  handleInviteExistingUserDirectly(user);
                                }
                              }
                            ]
                          );
                        } else {
                          Alert.alert(
                            'Send Invitation', 
                            `Send an invitation to ${user.full_name || user.id} to become your ${userRole === 'student' ? 'supervisor' : 'student'}? They will need to accept it.`, 
                            [
                              { 
                                text: 'Cancel',
                                onPress: () => console.log('❌ User cancelled invitation')
                              },
                              { 
                                text: 'Send Invitation', 
                                onPress: () => {
                                  console.log('✅ User confirmed sending invitation:', user);
                                  handleInviteExistingUserDirectly(user);
                                }
                              }
                            ]
                          );
                        }
                      }}
                    >
                      <YStack alignItems="flex-start" flex={1}>
                        <Text weight="semibold" size="sm">{user.full_name || 'No name'}</Text>
                        <Text intent="muted" size="xs">{user.email || 'No email'} • {user.role}</Text>
                      </YStack>
                    </Button>
                  ))}
                </YStack>
              </ScrollView>
            )}
          </YStack>
        ) : (
          <YStack gap="$3">
            <TextInput
              value={newUserEmails}
              onChangeText={setNewUserEmails}
              placeholder="Enter email addresses (one per line or comma-separated)..."
              multiline
              autoCapitalize="none"
              style={{
                backgroundColor: '#2A2A2A',
                padding: 12,
                borderRadius: 8,
                color: 'white',
                borderWidth: 1,
                borderColor: '#444',
                minHeight: 100,
                textAlignVertical: 'top',
              }}
            />
            
            <TextInput
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Optional: Add a personal message..."
              multiline
              autoCapitalize="sentences"
              style={{
                backgroundColor: '#2A2A2A',
                padding: 12,
                borderRadius: 8,
                color: 'white',
                borderWidth: 1,
                borderColor: '#444',
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />

            <Button onPress={handleInviteNewUsers} variant="primary" disabled={loading}>
              {loading ? 'Sending...' : `Send Invitation${newUserEmails.split(/[,;\n]/).filter(e => e.trim().includes('@')).length > 1 ? 's' : ''}`}
            </Button>
          </YStack>
        )}
      </YStack>
    );
  };

  const renderPendingTab = () => {
    console.log('🎭 Rendering Pending tab with data:');
    console.log('📤 Pending invitations (sent):', pendingInvitations.length, pendingInvitations);
    console.log('📥 Incoming invitations (received):', incomingInvitations.length, incomingInvitations);
    
    return (
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <Text size="sm" color="$gray11">
            Manage your pending invitations ({pendingInvitations.length} sent, {incomingInvitations.length} received)
          </Text>
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => {
              console.log('🔄 Manual refresh of pending invitations');
              loadPendingInvitations();
              loadIncomingInvitations();
            }}
          >
            <Feather name="refresh-cw" size={14} />
          </Button>
        </XStack>

        {/* Debug info */}
        <YStack padding="$2" backgroundColor="$backgroundHover" borderRadius="$2" marginBottom="$2">
          <Text color="$gray11" fontSize="$1">
            Debug: Pending={pendingInvitations.length}, Incoming={incomingInvitations.length}
          </Text>
          <Text color="$gray11" fontSize="$1">
            Incoming IDs: {incomingInvitations.map(inv => inv.id).join(', ')}
          </Text>
        </YStack>

        <ScrollView style={{ flex: 1, minHeight: 300 }} showsVerticalScrollIndicator={true}>
          <YStack gap="$3">
            <YStack gap="$2">
              <XStack alignItems="center" gap="$2">
                <Feather name="send" size={16} color="#10B981" />
                <Text size="sm" color="$gray11" fontWeight="600">
                  Sent by you ({pendingInvitations.length})
                </Text>
              </XStack>
              {pendingInvitations.length === 0 ? (
                <Text color="$gray11" textAlign="center" padding="$3">
                  No invitations sent yet
                </Text>
              ) : (
                pendingInvitations.map((invitation) => (
                  <YStack
                    key={invitation.id}
                    backgroundColor="$backgroundStrong"
                    padding="$3"
                    borderRadius="$2"
                    gap="$2"
                    borderWidth={1}
                    borderColor={invitation.status === 'accepted' ? '$green8' : '$blue8'}
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text weight="semibold" size="sm">
                          {invitation.email}
                        </Text>
                        <Text color="$gray11" size="xs">
                          Role: {invitation.role} • Status: {invitation.status}
                        </Text>
                        {invitation.metadata?.customMessage && (
                          <Text color="$blue11" size="xs" fontStyle="italic">
                            💬 "{invitation.metadata.customMessage}"
                          </Text>
                        )}
                        <Text color="$gray11" size="xs">
                          Sent: {new Date(invitation.created_at).toLocaleDateString()}
                        </Text>
                        {invitation.status === 'accepted' && (
                          <Text color="$green11" size="xs" fontWeight="bold">
                            ✅ Invitation accepted!
                          </Text>
                        )}
                      </YStack>
                      <XStack gap="$2">
                        {invitation.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            backgroundColor="$red9"
                            onPress={() => handleCancelInvitation(invitation.id)}
                          >
                            <Feather name="x" size={12} color="white" />
                            <Text color="white" ml="$1" fontSize="$2">Cancel</Text>
                          </Button>
                        )}
                        {invitation.status === 'accepted' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            backgroundColor="$gray7"
                            onPress={() => handleCancelInvitation(invitation.id)}
                          >
                            <Feather name="trash-2" size={12} />
                            <Text ml="$1" fontSize="$2">Clear</Text>
                          </Button>
                        )}
                      </XStack>
                    </XStack>
                  </YStack>
                ))
              )}
            </YStack>

            <YStack gap="$2" minHeight={200}>
              <XStack alignItems="center" gap="$2">
                <Feather name="inbox" size={16} color="#3B82F6" />
                <Text size="sm" color="$gray11" fontWeight="600">
                  Received by you ({incomingInvitations.length})
                </Text>
                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => {
                    console.log('🔄 Force refresh incoming invitations');
                    loadIncomingInvitations();
                  }}
                >
                  <Feather name="refresh-cw" size={12} />
                </Button>
              </XStack>
              {incomingInvitations.length === 0 ? (
                <Text color="$gray11" textAlign="center" padding="$3">
                  No invitations received yet
                </Text>
              ) : (
                <>
                  <Text color="$blue11" fontSize="$2" marginBottom="$2">
                    📋 Rendering {incomingInvitations.length} invitations...
                  </Text>
                  {incomingInvitations.map((invitation: any) => {
                    console.log('🎭 Rendering incoming invitation:', invitation.id, invitation);
                    const metadata = invitation.metadata || {};
                    const inviterName = metadata.supervisorName || metadata.inviterName || invitation.inviter?.full_name || 'Unknown User';
                    const relationshipType = metadata.relationshipType || 'unknown';
                  
                  return (
                    <YStack
                      key={invitation.id}
                      backgroundColor="$backgroundStrong"
                      padding="$3"
                      borderRadius="$2"
                      gap="$2"
                      borderWidth={1}
                      borderColor={invitation.status === 'accepted' ? '$green8' : '$blue8'}
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <YStack flex={1}>
                          <XStack alignItems="center" gap="$2">
                            <Feather 
                              name={relationshipType === 'student_invites_supervisor' ? 'user-plus' : 'users'} 
                              size={14} 
                              color={invitation.status === 'accepted' ? '#10B981' : '#3B82F6'} 
                            />
                            <Text weight="semibold" size="sm">
                              {inviterName}
                            </Text>
                            {invitation.status === 'accepted' && (
                              <Text color="$green11" size="xs" fontWeight="bold">✅</Text>
                            )}
                          </XStack>
                          <Text color="$gray11" size="xs">
                            Wants you as their {relationshipType === 'student_invites_supervisor' ? 'supervisor' : 'student'}
                          </Text>
                          {metadata.customMessage && (
                            <Text color="$blue11" size="xs" fontStyle="italic">
                              💬 "{metadata.customMessage}"
                            </Text>
                          )}
                          <Text color="$gray11" size="xs">
                            {invitation.email} • {new Date(invitation.created_at).toLocaleDateString()}
                          </Text>
                        </YStack>
                        <XStack gap="$2">
                          {invitation.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                backgroundColor="$green9"
                                onPress={async () => {
                                  console.log('🎯 PENDING TAB - Accepting invitation:', invitation.id);
                                  
                                  try {
                                    const success = await acceptInvitationById(invitation.id, profile!.id);
                                    console.log('🎯 PENDING TAB - Accept result:', success);
                                    
                                    if (success) {
                                      // Also clean up any related notifications
                                      const { error: notificationError } = await supabase
                                        .from('notifications')
                                        .delete()
                                        .eq('metadata->>invitation_id', invitation.id);
                                      
                                      if (notificationError) {
                                        console.warn('⚠️ Could not delete related notification:', notificationError);
                                      } else {
                                        console.log('🗑️ Related notification deleted after acceptance');
                                      }
                                      
                                      Alert.alert('Success', 'Invitation accepted! Relationship created.');
                                      
                                      // Force refresh the UI immediately
                                      setTimeout(() => {
                                        loadIncomingInvitations();
                                        loadPendingInvitations();
                                        onRefresh?.();
                                      }, 100);
                                    } else {
                                      Alert.alert('Error', 'Failed to accept invitation - please try again');
                                    }
                                  } catch (error) {
                                    console.error('❌ Error accepting invitation:', error);
                                    Alert.alert('Error', 'Failed to accept invitation');
                                  }
                                }}
                              >
                                <Text color="white">Accept</Text>
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                backgroundColor="$red9"
                                onPress={async () => {
                                  console.log('🚫 PENDING TAB - Declining invitation:', invitation.id);
                                  
                                  try {
                                    // Delete the invitation instead of updating status to avoid constraint issues
                                    const { error: inviteError } = await supabase
                                      .from('pending_invitations')
                                      .delete()
                                      .eq('id', invitation.id);
                                    
                                    if (inviteError) {
                                      console.error('❌ Error declining invitation:', inviteError);
                                      Alert.alert('Error', 'Failed to decline invitation');
                                      return;
                                    }
                                    
                                    // Also delete any related notifications to keep NotificationsScreen in sync
                                    const { error: notificationError } = await supabase
                                      .from('notifications')
                                      .delete()
                                      .eq('metadata->>invitation_id', invitation.id);
                                    
                                    if (notificationError) {
                                      console.warn('⚠️ Could not delete related notification:', notificationError);
                                      // Don't fail the whole operation for this
                                    } else {
                                      console.log('🗑️ Related notification deleted successfully');
                                    }
                                    
                                    console.log('✅ Invitation declined successfully');
                                    Alert.alert('Success', 'Invitation declined');
                                    
                                    // Force refresh the UI immediately
                                    setTimeout(() => {
                                      loadIncomingInvitations();
                                      loadPendingInvitations();
                                      onRefresh?.();
                                    }, 100);
                                  } catch (error) {
                                    console.error('❌ Error in decline process:', error);
                                    Alert.alert('Error', 'Failed to decline invitation');
                                  }
                                }}
                              >
                                <Text color="white">Decline</Text>
                              </Button>
                            </>
                          )}
                          {invitation.status === 'accepted' && (
                            <Text color="$green11" size="xs" fontWeight="bold">
                              Recently Accepted
                            </Text>
                          )}
                        </XStack>
                      </XStack>
                    </YStack>
                  );
                  })}
                </>
              )}
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    );
  };

  const getModalTitle = () => {
    if (userRole === 'student') {
      return 'Supervisor Management';
    } else if (['supervisor', 'teacher', 'school', 'instructor', 'admin'].includes(userRole)) {
      return 'Student Management';
    } else {
      return 'Relationship Management';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <YStack
        flex={1}
        backgroundColor="$background"
      >
        <YStack
          flex={1}
          padding="$4"
          gap="$4"
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text size="xl" weight="bold" color="$color">
              {getModalTitle()}
            </Text>
            <Button onPress={onClose} variant="link" size="sm">
              <Feather name="x" size={16} />
            </Button>
          </XStack>

          {/* Tabs */}
          {renderTabs()}

          {/* Content */}
          <YStack flex={1} backgroundColor="$backgroundStrong" padding="$3" borderRadius="$2">
            {activeTab === 'manage' && renderManageTab()}
            {activeTab === 'view' && renderViewTab()}
            {activeTab === 'invite' && renderInviteTab()}
            {activeTab === 'pending' && renderPendingTab()}
          </YStack>

          {/* Footer */}
          <Button
            onPress={onClose}
            variant="tertiary"
            size="lg"
          >
            CANCEL
          </Button>
        </YStack>
      </YStack>

      {/* Removal Review Modal */}
      {removalTarget && (
        <RelationshipReviewModal
          visible={showRemovalReviewModal}
          onClose={() => {
            setShowRemovalReviewModal(false);
            setRemovalTarget(null);
          }}
          profileUserId={removalTarget.id}
          profileUserRole={removalTarget.role as any}
          profileUserName={removalTarget.name}
          canReview={true}
          reviews={[]}
          onReviewAdded={() => {}} // We handle this in handleRemovalComplete
          title={`Review ${removalTarget.name}`}
          subtitle="Please share your experience before ending this supervisory relationship"
          isRemovalContext={true}
          onRemovalComplete={handleRemovalComplete}
        />
      )}
    </Modal>
  );
}