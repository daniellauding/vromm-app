import React, { useState, useEffect, useCallback } from 'react';
import { RefreshControl, Alert } from 'react-native';
import { YStack, XStack, Card, ScrollView, Button, Input } from 'tamagui';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { ProfileRatingBadge } from '../components/ProfileRatingBadge';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RelationshipReviewService } from '../services/relationshipReviewService';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../types/navigation';
import { RelationshipManagementModal } from '../components/RelationshipManagementModal';

type Student = {
  id: string;
  full_name: string;
  email: string;
  location?: string;
  avatar_url?: string;
  relationship_created: string;
  average_rating: number;
  review_count: number;
  recent_review?: string;
  last_activity?: string;
};

export function StudentManagementScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp>();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const loadStudents = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all students with their ratings
      const { data: relationships, error } = await supabase
        .from('student_supervisor_relationships')
        .select(`
          student_id,
          created_at,
          profiles:student_id (
            id,
            full_name,
            email,
            location,
            avatar_url
          )
        `)
        .eq('supervisor_id', user.id);

      if (error) throw error;

      // Get ratings for each student
      const studentsWithRatings = await Promise.all(
        (relationships || []).map(async (rel) => {
          const student = rel.profiles;
          if (!student) return null;

          try {
            const rating = await RelationshipReviewService.getUserRating(
              student.id,
              'student'
            );

            return {
              id: student.id,
              full_name: student.full_name || 'Unknown',
              email: student.email || '',
              location: student.location,
              avatar_url: student.avatar_url,
              relationship_created: rel.created_at,
              average_rating: rating.averageRating,
              review_count: rating.reviewCount,
              recent_review: '', // Could add recent review content
              last_activity: rel.created_at, // Could add last login/activity
            };
          } catch (error) {
            console.error('Error getting rating for student:', student.id, error);
            return {
              id: student.id,
              full_name: student.full_name || 'Unknown',
              email: student.email || '',
              location: student.location,
              avatar_url: student.avatar_url,
              relationship_created: rel.created_at,
              average_rating: 0,
              review_count: 0,
            };
          }
        })
      );

      setStudents(studentsWithRatings.filter(Boolean) as Student[]);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
    fetchAvailableStudents();
  }, [user?.id, fetchAvailableStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    Alert.alert(
      'Remove Student',
      `Are you sure you want to stop supervising ${studentName}?`,
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
                .eq('student_id', studentId)
                .eq('supervisor_id', user?.id);

              if (error) throw error;

              setStudents(prev => prev.filter(s => s.id !== studentId));
              Alert.alert('Success', 'Student removed successfully');
            } catch (error) {
              console.error('Error removing student:', error);
              Alert.alert('Error', 'Failed to remove student');
            }
          },
        },
      ]
    );
  };

  const handleViewStudent = (studentId: string) => {
    navigation.navigate('PublicProfile', { userId: studentId });
  };

  const handleReviewStudent = (studentId: string, studentName: string) => {
    // Navigate to review modal or screen
    // This could open the RelationshipReviewSection in a modal
    navigation.navigate('PublicProfile', { 
      userId: studentId,
      openReviewModal: true 
    });
  };

  // Fetch available students for invitation
  const fetchAvailableStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (error) {
      console.error('Error fetching available students:', error);
      Alert.alert('Error', 'Failed to load available students');
    }
  }, []);

  // Handle inviting new users
  const handleInviteUsers = async (emails: string[], inviteRole: string) => {
    if (!profile?.id || !profile.full_name) return;

    try {
      // Import the invitation service
      const { inviteUsersWithPasswords } = await import('../services/invitationService_v2');
      
      // Create invitation entries
      const invitations = emails.map(email => ({ email }));

      // Send invitations for students
      const result = await inviteUsersWithPasswords(
        invitations,
        'student',
        profile.id,
        profile.full_name || profile.email || undefined,
        profile.role as any,
        'supervisor_invites_student'
      );
      
      if (result.failed.length > 0) {
        const errors = result.failed.map(f => `${f.email}: ${f.error}`).join(', ');
        throw new Error(`Failed to send ${result.failed.length} invitation(s): ${errors}`);
      }
      
      Alert.alert(
        'Invitations Sent! 🎉',
        `${result.successful.length} invitation${result.successful.length > 1 ? 's' : ''} sent successfully! Students can login immediately with auto-generated passwords.`,
      );
      
      // Refresh the student list
      loadStudents();
    } catch (error) {
      console.error('Error in handleInviteUsers:', error);
      throw error;
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStudentCard = (student: Student) => (
    <Card key={student.id} bordered padding="$4" marginBottom="$3">
      <YStack space="$3">
        {/* Header with name and rating */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            <Text size="lg" weight="bold" color="$color">
              {student.full_name}
            </Text>
            <Text size="sm" color="$gray11">
              {student.email}
            </Text>
            {student.location && (
              <XStack alignItems="center" space="$1" marginTop="$1">
                <Feather name="map-pin" size={14} color="$gray11" />
                <Text size="sm" color="$gray11">
                  {student.location}
                </Text>
              </XStack>
            )}
          </YStack>

          {/* Rating Badge */}
          {student.review_count > 0 && (
            <ProfileRatingBadge
              averageRating={student.average_rating}
              reviewCount={student.review_count}
              size="sm"
            />
          )}
        </XStack>

        {/* Relationship Info */}
        <XStack space="$4">
          <XStack alignItems="center" space="$1">
            <Feather name="calendar" size={14} color="$gray11" />
            <Text size="sm" color="$gray11">
              Student since {new Date(student.relationship_created).toLocaleDateString()}
            </Text>
          </XStack>
        </XStack>

        {/* Action Buttons */}
        <XStack space="$2" justifyContent="flex-end">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => handleViewStudent(student.id)}
          >
            <XStack alignItems="center" space="$1">
              <Feather name="eye" size={14} />
              <Text size="sm">View</Text>
            </XStack>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            backgroundColor="$blue10"
            onPress={() => handleReviewStudent(student.id, student.full_name)}
          >
            <XStack alignItems="center" space="$1">
              <Feather name="star" size={14} color="white" />
              <Text size="sm" color="white">Review</Text>
            </XStack>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            backgroundColor="$red10"
            onPress={() => handleRemoveStudent(student.id, student.full_name)}
          >
            <XStack alignItems="center" space="$1">
              <Feather name="user-minus" size={14} color="white" />
              <Text size="sm" color="white">Remove</Text>
            </XStack>
          </Button>
        </XStack>
      </YStack>
    </Card>
  );

  return (
    <Screen>
      <YStack flex={1}>
        <Header 
          title="My Students" 
          showBack 
          rightElement={
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setShowRelationshipModal(true)}
            >
              <XStack alignItems="center" space="$1">
                <Feather name="user-plus" size={16} />
                <Text size="sm">Invite</Text>
              </XStack>
            </Button>
          }
        />

        <YStack padding="$4" space="$3">
          {/* Search Bar */}
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            size="$4"
          />

          {/* Statistics */}
          <Card bordered padding="$3">
            <XStack justifyContent="space-around">
              <YStack alignItems="center">
                <Text size="xl" weight="bold" color="$blue11">
                  {students.length}
                </Text>
                <Text size="sm" color="$gray11">
                  Total Students
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text size="xl" weight="bold" color="$green11">
                  {students.filter(s => s.review_count > 0).length}
                </Text>
                <Text size="sm" color="$gray11">
                  With Reviews
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text size="xl" weight="bold" color="$orange11">
                  {students.length > 0 
                    ? (students.reduce((sum, s) => sum + s.average_rating, 0) / students.length).toFixed(1)
                    : '0.0'
                  }
                </Text>
                <Text size="sm" color="$gray11">
                  Avg Rating
                </Text>
              </YStack>
            </XStack>
          </Card>
        </YStack>

        {/* Students List */}
        <ScrollView
          flex={1}
          padding="$4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading && !refreshing ? (
            <YStack padding="$4" alignItems="center">
              <Text>Loading students...</Text>
            </YStack>
          ) : filteredStudents.length > 0 ? (
            <YStack>
              {filteredStudents.map(renderStudentCard)}
            </YStack>
          ) : (
            <YStack padding="$4" alignItems="center" space="$3">
              <Feather name="users" size={48} color="$gray11" />
              <Text color="$gray11" textAlign="center">
                {searchQuery 
                  ? `No students found matching "${searchQuery}"`
                  : 'No students yet. Start by inviting students to supervise.'
                }
              </Text>
              {!searchQuery && (
                <Button
                  variant="primary"
                  onPress={() => setShowRelationshipModal(true)}
                >
                  <XStack alignItems="center" space="$2">
                    <Feather name="user-plus" size={16} color="white" />
                    <Text color="white">Invite Students</Text>
                  </XStack>
                </Button>
              )}
            </YStack>
          )}
        </ScrollView>
      </YStack>

      {/* Relationship Management Modal for inviting students */}
      <RelationshipManagementModal
        visible={showRelationshipModal}
        onClose={() => setShowRelationshipModal(false)}
        userRole="instructor"
        supervisedStudents={[]}
        onStudentSelect={() => {}}
        availableSupervisors={availableStudents}
        selectedSupervisorIds={selectedStudentIds}
        onSupervisorSelect={setSelectedStudentIds}
        onAddSupervisors={() => {}}
        onInviteUsers={handleInviteUsers}
        onRefresh={async () => {
          await fetchAvailableStudents();
          await loadStudents();
        }}
      />
    </Screen>
  );
}
