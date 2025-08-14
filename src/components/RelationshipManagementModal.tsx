import React, { useState, useEffect } from 'react';
import { Modal, ScrollView, Alert, TextInput, Dimensions } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Text } from '../components/Text';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { supabase } from '../lib/supabase';
import { inviteMultipleUsers, getPendingInvitations, cancelInvitation, removeSupervisorRelationship, getStudentSupervisors, getIncomingInvitations, acceptInvitationById, rejectInvitation } from '../services/invitationService';
import { Feather } from '@expo/vector-icons';

interface RelationshipManagementModalProps {
  visible: boolean;
  onClose: () => void;
  userRole: 'student' | 'supervisor' | 'teacher' | 'school' | 'admin';
  
  // Student viewing functionality
  supervisedStudents?: Array<{ id: string; full_name: string; email: string }>;
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
  onRefresh
}: RelationshipManagementModalProps) {
  const { profile, user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { t } = useTranslation();
  
  // Modal tabs/modes - default to 'manage' for instructors
  const [activeTab, setActiveTab] = useState<'view' | 'manage' | 'invite' | 'pending'>(
    ['instructor', 'school', 'admin'].includes(userRole) ? 'manage' : 'view'
  );
  
  // Invitation states
  const [inviteMode, setInviteMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; full_name: string; email: string; role?: string }>>([]);
  const [newUserEmails, setNewUserEmails] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<any[]>([]);
  const [currentSupervisors, setCurrentSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Local state for supervisor selection
  const [localSelectedSupervisorIds, setLocalSelectedSupervisorIds] = useState<string[]>(selectedSupervisorIds);

  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    setLocalSelectedSupervisorIds(selectedSupervisorIds);
  }, [selectedSupervisorIds]);

  useEffect(() => {
    if (visible) {
      console.log('RelationshipManagementModal opened with data:');
      console.log('User Role:', userRole);
      console.log('Available Supervisors:', availableSupervisors);
      console.log('Supervised Students:', supervisedStudents);
      console.log('Active Tab:', activeTab);
    }
    if (visible) {
      if (activeTab === 'pending') {
        loadPendingInvitations();
        loadIncomingInvitations();
      } else if (activeTab === 'manage' && userRole === 'student' && profile?.id) {
        loadCurrentSupervisors();
      }
    }
  }, [visible, activeTab]);

  const loadPendingInvitations = async () => {
    if (!profile?.id) return;
    
    try {
      const invitations = await getPendingInvitations(profile.id);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  const loadIncomingInvitations = async () => {
    if (!user?.email) return;
    try {
      const invitations = await getIncomingInvitations(user.email);
      setIncomingInvitations(invitations);
    } catch (error) {
      console.error('Error loading incoming invitations:', error);
    }
  };

  const loadCurrentSupervisors = async () => {
    if (!profile?.id) return;
    
    try {
      const supervisors = await getStudentSupervisors(profile.id);
      setCurrentSupervisors(supervisors);
    } catch (error) {
      console.error('Error loading current supervisors:', error);
    }
  };

  const handleRemoveSupervisor = async (supervisorId: string) => {
    if (!profile?.id) return;
    
    Alert.alert(
      'Remove Supervisor',
      'Are you sure you want to remove this supervisor? They will no longer be able to view your progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await removeSupervisorRelationship(profile.id, supervisorId);
              if (success) {
                Alert.alert('Success', 'Supervisor removed successfully');
                loadCurrentSupervisors();
                onRefresh?.();
              } else {
                Alert.alert('Error', 'Failed to remove supervisor');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove supervisor');
            }
          }
        }
      ]
    );
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!profile?.id) return;
    
    Alert.alert(
      'Remove Student',
      'Are you sure you want to stop supervising this student?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('student_supervisor_relationships')
                .delete()
                .eq('supervisor_id', profile.id)
                .eq('student_id', studentId);
              
              if (!error) {
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
      ]
    );
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search for existing users based on role
      const targetRole = userRole === 'student' ? ['instructor', 'admin', 'school'] : ['student'];
      console.log('Searching for users with query:', query);
      console.log('Target roles:', targetRole);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .in('role', targetRole)
        .limit(10);

      console.log('Search results:', data);
      console.log('Search error:', error);

      if (!error && data) {
        setSearchResults(data);
        data.forEach(user => {
          console.log('Found user:', { id: user.id, name: user.full_name, email: user.email, role: user.role });
        });
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
      await onInviteUsers(emails, targetRole);
      setNewUserEmails('');
      setActiveTab('pending');
      loadPendingInvitations();
    } catch (error) {
      console.error('Invitation error:', error);
      Alert.alert('Error', `Failed to send invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      loadPendingInvitations();
      Alert.alert('Success', 'Invitation cancelled');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel invitation');
    }
  };

  const handleSupervisorToggle = (supervisorId: string) => {
    const newSelection = localSelectedSupervisorIds.includes(supervisorId)
      ? localSelectedSupervisorIds.filter(id => id !== supervisorId)
      : [...localSelectedSupervisorIds, supervisorId];
    
    setLocalSelectedSupervisorIds(newSelection);
    onSupervisorSelect?.(newSelection);
  };

  const handleAddSupervisors = async () => {
    if (onAddSupervisors && localSelectedSupervisorIds.length > 0) {
      try {
        await onAddSupervisors(localSelectedSupervisorIds);
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
        { key: 'view', label: 'Add', icon: 'user-plus' },
        { key: 'manage', label: 'Manage', icon: 'users' },
        { key: 'invite', label: 'Invite', icon: 'send' }
      );
    } else if (['instructor', 'school', 'admin'].includes(userRole)) {
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
            onPress={() => setActiveTab(tab.key as any)}
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
        <YStack gap="$2">
          <Text size="sm" color="$gray11">
            Your current supervisors
          </Text>
          <ScrollView style={{ flex: 1 }}>
            <YStack gap="$2">
              {currentSupervisors.length === 0 ? (
                <Text color="$gray11" textAlign="center" padding="$4">
                  No supervisors assigned yet
                </Text>
              ) : (
                currentSupervisors.map((supervisor) => (
                  <XStack
                    key={supervisor.supervisor_id}
                    justifyContent="space-between"
                    alignItems="center"
                    backgroundColor="$backgroundHover"
                    padding="$3"
                    borderRadius="$3"
                  >
                    <YStack flex={1}>
                      <Text weight="semibold" size="sm">{supervisor.supervisor_name}</Text>
                      <Text color="$gray11" size="xs">{supervisor.supervisor_email}</Text>
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
                ))
              )}
            </YStack>
          </ScrollView>
        </YStack>
      );
    } else {
      // Show supervised students for instructors with ability to remove
      return (
        <YStack gap="$4" flex={1}>
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
                        theme="red"
                        onPress={() => handleRemoveStudent(student.id)}
                      >
                        Remove
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
                  console.log(`Rendering button for ${supervisor.full_name}, selected: ${isSelected}`);
                  return (
                      <Button
                      key={supervisor.id}
                      onPress={() => handleSupervisorToggle(supervisor.id)}
                        variant={isSelected ? 'primary' : 'tertiary'}
                      justifyContent="flex-start"
                      width="100%"
                      marginBottom="$2"
                    >
                      <XStack alignItems="center" gap="$2" flex={1} width="100%">
                        <Feather 
                          name={isSelected ? 'check-circle' : 'circle'} 
                          size={16} 
                          color={isSelected ? 'white' : '#999'}
                        />
                        <YStack flex={1} alignItems="flex-start">
                          <Text weight="semibold" size="sm" color={isSelected ? 'white' : '$color'}>
                            {supervisor.full_name || 'Unnamed'}
                          </Text>
                          <Text color={isSelected ? '$gray3' : '$gray11'} size="xs">
                            {supervisor.email || 'No email'}
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
                        // Handle adding existing user
                        Alert.alert('Add User', `Add ${user.full_name || user.email} as your ${userRole === 'student' ? 'supervisor' : 'student'}?`, [
                          { text: 'Cancel' },
                          { 
                            text: 'Add', 
                            onPress: async () => {
                              try {
                                setLoading(true);
                                
                                if (userRole === 'student') {
                                  // Student inviting a supervisor
                                  const targetRole = 'instructor';
                                  await onInviteUsers?.([user.email], targetRole);
                                } else {
                                  // Instructor inviting a student
                                  const targetRole = 'student';
                                  await onInviteUsers?.([user.email], targetRole);
                                }
                                
                                // Clear search and switch to pending tab
                                setSearchQuery('');
                                setSearchResults([]);
                                setActiveTab('pending');
                                loadPendingInvitations();
                                
                                Alert.alert('Success', `Invitation sent to ${user.full_name || user.email}`);
                              } catch (error) {
                                console.error('Error sending invitation:', error);
                                Alert.alert('Error', 'Failed to send invitation. Please try again.');
                              } finally {
                                setLoading(false);
                              }
                            }
                          }
                        ]);
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

            <Button onPress={handleInviteNewUsers} variant="primary" disabled={loading}>
              {loading ? 'Sending...' : `Send Invitation${newUserEmails.split(/[,;\n]/).filter(e => e.trim().includes('@')).length > 1 ? 's' : ''}`}
            </Button>
          </YStack>
        )}
      </YStack>
    );
  };

  const renderPendingTab = () => {
    return (
      <YStack gap="$3">
        <Text size="sm" color="$gray11">Manage your pending invitations</Text>

        <ScrollView style={{ flex: 1 }}>
          <YStack gap="$3">
            <YStack gap="$2">
              <Text size="sm" color="$gray11">Sent by you</Text>
              {pendingInvitations.length === 0 ? (
                <Text color="$gray11" textAlign="center">No pending invitations</Text>
              ) : (
                pendingInvitations.map((invitation) => (
                  <YStack key={invitation.id} backgroundColor="$backgroundStrong" padding="$3" borderRadius="$2" gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text weight="semibold" size="sm">{invitation.email}</Text>
                        <Text color="$gray11" size="xs">Role: {invitation.role} • Status: {invitation.status}</Text>
                        <Text color="$gray11" size="xs">Sent: {new Date(invitation.created_at).toLocaleDateString()}</Text>
                      </YStack>
                      <XStack gap="$2">
                        <Button size="sm" variant="tertiary" onPress={() => handleCancelInvitation(invitation.id)}>
                          <Feather name="x" size={12} />
                        </Button>
                      </XStack>
                    </XStack>
                  </YStack>
                ))
              )}
            </YStack>

            <YStack gap="$2">
              <Text size="sm" color="$gray11">Received by you</Text>
              {incomingInvitations.length === 0 ? (
                <Text color="$gray11" textAlign="center">No incoming invitations</Text>
              ) : (
                incomingInvitations.map((invitation) => (
                  <YStack key={invitation.id} backgroundColor="$backgroundStrong" padding="$3" borderRadius="$2" gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text weight="semibold" size="sm">{invitation.email}</Text>
                        <Text color="$gray11" size="xs">Role: {invitation.role} • Status: {invitation.status}</Text>
                        <Text color="$gray11" size="xs">Sent: {new Date(invitation.created_at).toLocaleDateString()}</Text>
                      </YStack>
                      <XStack gap="$2">
                        <Button size="sm" variant="primary" onPress={async () => { await acceptInvitationById(invitation.id, profile!.id); loadIncomingInvitations(); onRefresh?.(); }}>Accept</Button>
                        <Button size="sm" variant="tertiary" onPress={async () => { await rejectInvitation(invitation.id); loadIncomingInvitations(); }}>Decline</Button>
                      </XStack>
                    </XStack>
                  </YStack>
                ))
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
    } else if (['supervisor', 'teacher', 'school'].includes(userRole)) {
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
    </Modal>
  );
}