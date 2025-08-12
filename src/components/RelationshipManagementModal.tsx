import React, { useState, useEffect } from 'react';
import { Modal, ScrollView, Alert, TextInput, Dimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { supabase } from '../lib/supabase';
import { inviteMultipleUsers, getPendingInvitations, cancelInvitation } from '../services/invitationService';
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
  const { profile } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { t } = useTranslation();
  
  // Modal tabs/modes
  const [activeTab, setActiveTab] = useState<'view' | 'invite' | 'pending'>('view');
  
  // Invitation states
  const [inviteMode, setInviteMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [newUserEmails, setNewUserEmails] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Local state for supervisor selection
  const [localSelectedSupervisorIds, setLocalSelectedSupervisorIds] = useState<string[]>(selectedSupervisorIds);

  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    setLocalSelectedSupervisorIds(selectedSupervisorIds);
  }, [selectedSupervisorIds]);

  useEffect(() => {
    if (visible && activeTab === 'pending') {
      loadPendingInvitations();
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search for existing users based on role
      const targetRole = userRole === 'student' ? ['supervisor', 'teacher', 'school'] : ['student'];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .in('role', targetRole)
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
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
      const targetRole = userRole === 'student' ? 'supervisor' : 'student';
      await onInviteUsers(emails, targetRole);
      setNewUserEmails('');
      setActiveTab('pending');
      loadPendingInvitations();
    } catch (error) {
      console.error('Invitation error:', error);
      Alert.alert('Error', 'Failed to send invitations');
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
        { key: 'view', label: 'Select Supervisors', icon: 'users' },
        { key: 'invite', label: 'Invite Supervisors', icon: 'user-plus' }
      );
    } else if (['supervisor', 'teacher', 'school', 'admin'].includes(userRole)) {
      tabs.push(
        { key: 'view', label: 'Select Students', icon: 'eye' },
        { key: 'invite', label: 'Invite Students', icon: 'user-plus' }
      );
    }
    
    tabs.push({ key: 'pending', label: 'Pending', icon: 'clock' });

    return (
      <XStack gap="$2" marginBottom="$4">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            variant={activeTab === tab.key ? 'primary' : 'outline'}
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

  const renderViewTab = () => {
    if (userRole === 'student') {
      // Show supervisors to select
      return (
        <YStack gap="$2">
          <Text size="sm" color="$gray11">
            Select supervisors who can view your progress and help with your learning
          </Text>
          
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
            <YStack gap="$2">
              {availableSupervisors.map((supervisor) => {
                const isSelected = localSelectedSupervisorIds.includes(supervisor.id);
                return (
                  <Button
                    key={supervisor.id}
                    onPress={() => handleSupervisorToggle(supervisor.id)}
                    variant={isSelected ? 'primary' : 'outline'}
                    justifyContent="flex-start"
                  >
                    <XStack alignItems="center" gap="$2" flex={1}>
                      <Feather 
                        name={isSelected ? 'check-circle' : 'circle'} 
                        size={16} 
                      />
                      <YStack flex={1} alignItems="flex-start">
                        <Text weight="600" size="sm">{supervisor.full_name}</Text>
                        <Text color="$gray11" size="xs">{supervisor.email}</Text>
                      </YStack>
                    </XStack>
                  </Button>
                );
              })}
            </YStack>
          </ScrollView>

          {localSelectedSupervisorIds.length > 0 && (
            <Button onPress={handleAddSupervisors} variant="primary">
              Add {localSelectedSupervisorIds.length} Supervisor{localSelectedSupervisorIds.length > 1 ? 's' : ''}
            </Button>
          )}
        </YStack>
      );
    } else {
      // Show students to view
      return (
        <YStack gap="$2">
          <Text size="sm" color="$gray11">
            Choose a student to view their progress, routes, and exercises
          </Text>

          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
            <YStack gap="$2">
              {/* Option to view own profile */}
              <Button
                onPress={() => {
                  onStudentSelect?.(null);
                  onClose();
                }}
                variant={activeStudentId === null ? 'primary' : 'outline'}
              >
                <XStack alignItems="center" gap="$2">
                  <Feather name="user" size={16} />
                  <YStack alignItems="flex-start">
                    <Text weight="600" size="sm">My Own Profile</Text>
                    <Text color="$gray11" size="xs">View your own progress and data</Text>
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
                    variant={isActive ? 'primary' : 'outline'}
                    justifyContent="flex-start"
                  >
                    <XStack alignItems="center" gap="$2" flex={1}>
                      <Feather name="user" size={16} />
                      <YStack flex={1} alignItems="flex-start">
                        <Text weight="600" size="sm">{student.full_name}</Text>
                        <Text color="$gray11" size="xs">{student.email}</Text>
                      </YStack>
                    </XStack>
                  </Button>
                );
              })}
            </YStack>
          </ScrollView>
        </YStack>
      );
    }
  };

  const renderInviteTab = () => {
    return (
      <YStack gap="$4">
        <Text size="sm" color="$gray11">
          {userRole === 'student' 
            ? 'Search existing users or enter email addresses to invite new supervisors'
            : 'Search existing users or enter email addresses to invite new students'}
        </Text>

        {/* Toggle between search existing and invite new */}
        <XStack gap="$2">
          <Button
            onPress={() => setInviteMode('search')}
            variant={inviteMode === 'search' ? 'primary' : 'outline'}
            size="sm"
            flex={1}
          >
            SEARCH EXISTING
          </Button>
          <Button
            onPress={() => setInviteMode('new')}
            variant={inviteMode === 'new' ? 'primary' : 'outline'}
            size="sm"
            flex={1}
          >
            INVITE NEW
          </Button>
        </XStack>

        {inviteMode === 'search' ? (
          <YStack gap="$3">
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name or email..."
              style={{
                backgroundColor: '#2A2A2A',
                padding: 12,
                borderRadius: 8,
                color: 'white',
                borderWidth: 1,
                borderColor: '#444',
              }}
            />

            <ScrollView style={{ maxHeight: 200 }}>
              <YStack gap="$2">
                {searchResults.map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    justifyContent="flex-start"
                    onPress={() => {
                      // Handle adding existing user
                      Alert.alert('Add User', `Add ${user.full_name} as your ${userRole === 'student' ? 'supervisor' : 'student'}?`, [
                        { text: 'Cancel' },
                        { text: 'Add', onPress: () => console.log('Add existing user logic here') }
                      ]);
                    }}
                  >
                    <YStack alignItems="flex-start">
                      <Text weight="600" size="sm">{user.full_name}</Text>
                      <Text color="$gray11" size="xs">{user.email}</Text>
                    </YStack>
                  </Button>
                ))}
              </YStack>
            </ScrollView>
          </YStack>
        ) : (
          <YStack gap="$3">
            <TextInput
              value={newUserEmails}
              onChangeText={setNewUserEmails}
              placeholder="Enter email addresses (one per line or comma-separated)..."
              multiline
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

            <Button onPress={handleInviteNewUsers} variant="primary">
              Send Invitation{newUserEmails.split(/[,;\n]/).filter(e => e.trim().includes('@')).length > 1 ? 's' : ''}
            </Button>
          </YStack>
        )}
      </YStack>
    );
  };

  const renderPendingTab = () => {
    return (
      <YStack gap="$3">
        <Text size="sm" color="$gray11">
          Manage your pending invitations
        </Text>

        <ScrollView style={{ maxHeight: 300 }}>
          <YStack gap="$2">
            {pendingInvitations.length === 0 ? (
              <Text color="$gray11" textAlign="center">
                No pending invitations
              </Text>
            ) : (
              pendingInvitations.map((invitation) => (
                <YStack
                  key={invitation.id}
                  backgroundColor="$backgroundStrong"
                  padding="$3"
                  borderRadius="$2"
                  gap="$2"
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack flex={1}>
                      <Text weight="600" size="sm">{invitation.email}</Text>
                      <Text color="$gray11" size="xs">
                        Role: {invitation.role} • Status: {invitation.status}
                      </Text>
                      <Text color="$gray11" size="xs">
                        Sent: {new Date(invitation.created_at).toLocaleDateString()}
                      </Text>
                    </YStack>
                    
                    <XStack gap="$2">
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => handleCancelInvitation(invitation.id)}
                      >
                        <Feather name="x" size={12} />
                      </Button>
                    </XStack>
                  </XStack>
                </YStack>
              ))
            )}
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
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <YStack
        flex={1}
        backgroundColor="rgba(0,0,0,0.7)"
        justifyContent="flex-end"
      >
        <YStack
          backgroundColor="$background"
          padding="$4"
          borderTopLeftRadius="$4"
          borderTopRightRadius="$4"
          gap="$4"
          maxHeight={screenHeight * 0.8}
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text size="xl" weight="bold" color="$color">
              {getModalTitle()}
            </Text>
            <Button
              onPress={onClose}
              variant="ghost"
              size="sm"
              circular
              icon={<Feather name="x" size={16} />}
            />
          </XStack>

          {/* Tabs */}
          {renderTabs()}

          {/* Content */}
          <YStack flex={1}>
            {activeTab === 'view' && renderViewTab()}
            {activeTab === 'invite' && renderInviteTab()}
            {activeTab === 'pending' && renderPendingTab()}
          </YStack>

          {/* Footer */}
          <Button
            onPress={onClose}
            variant="outline"
            size="lg"
          >
            CANCEL
          </Button>
        </YStack>
      </YStack>
    </Modal>
  );
}