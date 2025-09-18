import React, { useRef } from 'react';
import { YStack, XStack, ScrollView, TextArea, Switch } from 'tamagui';

import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { 
  View, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Easing, 
  Pressable, 
  useColorScheme,
  Platform,
  TextInput 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import Popover from 'react-native-popover-view';
import { RadioButton } from '../../components/SelectButton';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import * as Haptics from 'expo-haptics';

import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { useTour } from '../../contexts/TourContext';
import { useTourTarget } from '../../components/TourOverlay';

export const GettingStarted = () => {
  const { profile, user, updateProfile, refreshProfile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { isActive: tourActive, currentStep, steps } = useTour();
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme();
  
  // Register license plan card for tour targeting
  const licensePlanRef = useTourTarget('GettingStarted.LicensePlan');
  
  // License plan modal state and animation refs
  const [showKorkortsplanModal, setShowKorkortsplanModal] = React.useState(false);
  const korkortsplanBackdropOpacity = useRef(new Animated.Value(0)).current;
  const korkortsplanSheetTranslateY = useRef(new Animated.Value(300)).current;

  // License plan form state (copied from ProfileScreen)
  const [targetDate, setTargetDate] = React.useState<Date | null>(() => {
    const planData = profile?.license_plan_data as any;
    if (planData?.target_date) {
      return new Date(planData.target_date);
    }
    return null;
  });
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showDatePopover, setShowDatePopover] = React.useState(false);
  const [selectedDateOption, setSelectedDateOption] = React.useState<string>('6months');
  const dateButtonRef = useRef<any>(null);
  const [hasTheory, setHasTheory] = React.useState<boolean>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.has_theory || false;
  });
  const [hasPractice, setHasPractice] = React.useState<boolean>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.has_practice || false;
  });
  const [previousExperience, setPreviousExperience] = React.useState<string>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.previous_experience || '';
  });
  const [specificGoals, setSpecificGoals] = React.useState<string>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.specific_goals || '';
  });
  const [loading, setLoading] = React.useState(false);

  // Role selection modal state (copied from OnboardingInteractive)
  const [showRoleModal, setShowRoleModal] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<string | null>(() => {
    return profile?.role || 'student';
  });
  const roleBackdropOpacity = useRef(new Animated.Value(0)).current;
  const roleSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Connections modal state (copied from OnboardingInteractive)
  const [showConnectionsModal, setShowConnectionsModal] = React.useState(false);
  const [connectionSearchQuery, setConnectionSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [selectedConnections, setSelectedConnections] = React.useState<Array<{ id: string; full_name: string; email: string; role?: string }>>([]);
  const [connectionCustomMessage, setConnectionCustomMessage] = React.useState('');
  const connectionsBackdropOpacity = useRef(new Animated.Value(0)).current;
  const connectionsSheetTranslateY = useRef(new Animated.Value(300)).current;


  // Helper function to check if license plan should be highlighted
  const isLicensePlanHighlighted = (): boolean => {
    if (!tourActive || typeof currentStep !== 'number' || !steps[currentStep]) return false;
    const step = steps[currentStep];
    return step.targetScreen === 'GettingStarted.LicensePlan' || 
           step.targetElement === 'GettingStarted.LicensePlan';
  };

  const [hasCreatedRoutes, setHasCreatedRoutes] = React.useState(false);
  const [hasCompletedExercise, setHasCompletedExercise] = React.useState(false);
  const [hasSavedRoute, setHasSavedRoute] = React.useState(false);
  const [hasConnections, setHasConnections] = React.useState(false);
  const [hasCreatedEvent, setHasCreatedEvent] = React.useState(false);
  
  // Existing relationships state (copied from OnboardingInteractive)
  const [existingRelationships, setExistingRelationships] = React.useState<Array<{ 
    id: string; 
    name: string; 
    email: string; 
    role: string; 
    relationship_type: string;
    created_at: string;
  }>>([]);

  // Relationship removal modal state
  const [showRelationshipRemovalModal, setShowRelationshipRemovalModal] = React.useState(false);
  const [relationshipRemovalTarget, setRelationshipRemovalTarget] = React.useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    relationship_type: string;
  } | null>(null);
  const [relationshipRemovalMessage, setRelationshipRemovalMessage] = React.useState('');
  const relationshipRemovalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const relationshipRemovalSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Pending invitations state
  const [pendingInvitations, setPendingInvitations] = React.useState<any[]>([]);

  // Körkortsplan modal show/hide functions (copied from ProfileScreen)
  const showKorkortsplanSheet = () => {
    setShowKorkortsplanModal(true);
    Animated.timing(korkortsplanBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(korkortsplanSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideKorkortsplanSheet = () => {
    Animated.timing(korkortsplanBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(korkortsplanSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowKorkortsplanModal(false);
    });
  };

  // License plan functions (copied from ProfileScreen)
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleLicensePlanSubmit = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Format the data to save
      const licenseData = {
        target_date: targetDate ? targetDate.toISOString() : null,
        has_theory: hasTheory,
        has_practice: hasPractice,
        previous_experience: previousExperience,
        specific_goals: specificGoals,
      };

      // Update the profile
      const { error } = await supabase
        .from('profiles')
        .update({
          license_plan_completed: true,
          license_plan_data: licenseData,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh the profile to get the updated data
      await refreshProfile();

      // Hide the modal
      hideKorkortsplanSheet();
    } catch (err) {
      console.error('Error saving license plan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Role modal show/hide functions (copied from OnboardingInteractive)
  const showRoleSheet = () => {
    setShowRoleModal(true);
    Animated.timing(roleBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(roleSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideRoleSheet = () => {
    Animated.timing(roleBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(roleSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowRoleModal(false);
    });
  };

  // Load pending invitations
  const loadPendingInvitations = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('invited_by', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending invitations:', error);
        return;
      }

      // Filter out invitations where the relationship already exists
      const filteredInvitations = [];
      if (data) {
        for (const invitation of data) {
          // Get the target user ID from the invitation
          const targetUserId = invitation.targetUserId || invitation.invited_by;
          
          // Check if relationship already exists
          const { data: existingRelationship } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(`and(student_id.eq.${targetUserId},supervisor_id.eq.${user.id}),and(student_id.eq.${user.id},supervisor_id.eq.${targetUserId})`)
            .eq('status', 'active')
            .single();

          if (!existingRelationship) {
            filteredInvitations.push(invitation);
          } else {
            console.log('📤 [GettingStarted] Filtering out processed invitation:', invitation.id, 'relationship already exists');
            // Mark the invitation as processed
            await supabase
              .from('pending_invitations')
              .update({ status: 'accepted' })
              .eq('id', invitation.id);
          }
        }
      }

      console.log('📤 [GettingStarted] Loaded pending invitations:', {
        total: data?.length || 0,
        filtered: filteredInvitations.length,
        removed: (data?.length || 0) - filteredInvitations.length
      });
      console.log('📤 [GettingStarted] Invitation IDs:', filteredInvitations.map(inv => inv.id));
      console.log('📤 [GettingStarted] Full invitation data:', filteredInvitations);
      
      setPendingInvitations(filteredInvitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  // Connections modal show/hide functions (copied from OnboardingInteractive)
  const showConnectionsSheet = () => {
    // Load existing relationships and pending invitations when opening the modal
    loadExistingRelationships();
    loadPendingInvitations();
    
    setShowConnectionsModal(true);
    Animated.timing(connectionsBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(connectionsSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideConnectionsSheet = () => {
    Animated.timing(connectionsBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(connectionsSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowConnectionsModal(false);
    });
  };

  // Relationship removal modal show/hide functions
  const openRelationshipRemovalModal = () => {
    setShowRelationshipRemovalModal(true);
    Animated.timing(relationshipRemovalBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(relationshipRemovalSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeRelationshipRemovalModal = () => {
    Animated.timing(relationshipRemovalBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(relationshipRemovalSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowRelationshipRemovalModal(false);
      setRelationshipRemovalTarget(null);
      setRelationshipRemovalMessage('');
    });
  };

  // Role and connections handlers (copied from OnboardingInteractive)
  const handleRoleSelect = async (roleId: string) => {
    setSelectedRole(roleId);
    
    if (!user) return;

    try {
      // Update the profile with the selected role
      const { error } = await supabase
        .from('profiles')
        .update({
          role: roleId,
          role_confirmed: true,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving role selection:', error);
      } else {
        // Refresh the profile to get the updated data
        await refreshProfile();
        hideRoleSheet();
      }
    } catch (err) {
      console.error('Error saving role selection:', err);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setConnectionSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      // Search based on user's role
      let targetRole = '';
      if (selectedRole === 'student') {
        targetRole = 'instructor'; // Students search for instructors
      } else if (selectedRole === 'instructor' || selectedRole === 'school') {
        targetRole = 'student'; // Instructors search for students
      }

      let query_builder = supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      // Filter by target role if we have one
      if (targetRole) {
        query_builder = query_builder.eq('role', targetRole);
      }

      const { data, error } = await query_builder;

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleCreateConnections = async () => {
    if (!user?.id || selectedConnections.length === 0) return;

    try {
      console.log('🔗 [GettingStarted] Creating connections for:', selectedConnections.length, 'users');
      console.log('🔗 [GettingStarted] User role:', selectedRole);
      
      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;

      // Create invitations for each selected connection
      for (const targetUser of selectedConnections) {
        if (!targetUser.email) {
          console.warn('🔗 [GettingStarted] Skipping user without email:', targetUser);
          failCount++;
          continue;
        }
        
        try {
          // Check if relationship already exists
          const { data: existingRelationship } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(
              `and(student_id.eq.${user.id},supervisor_id.eq.${targetUser.id}),and(student_id.eq.${targetUser.id},supervisor_id.eq.${user.id})`
            )
            .single();

          if (existingRelationship) {
            console.log('⚠️ [GettingStarted] Relationship already exists with:', targetUser.email);
            duplicateCount++;
            continue;
          }

          // Check if pending invitation already exists
          const { data: existingInvitation } = await supabase
            .from('pending_invitations')
            .select('id')
            .eq('invited_by', user.id)
            .eq('email', targetUser.email.toLowerCase())
            .eq('status', 'pending')
            .single();

          if (existingInvitation) {
            console.log('⚠️ [GettingStarted] Pending invitation already exists for:', targetUser.email);
            duplicateCount++;
            continue;
          }

          // Determine relationship type and target role
          const relationshipType = selectedRole === 'student' 
            ? 'student_invites_supervisor' 
            : 'supervisor_invites_student';
          const targetRole = selectedRole === 'student' ? 'instructor' : 'student';
          
          console.log('🔗 [GettingStarted] Creating invitation for:', targetUser.email, 'as', targetRole);
          
          // Create pending invitation (exactly like OnboardingInteractive)
          const { error: inviteError } = await supabase
            .from('pending_invitations')
            .insert({
              email: targetUser.email.toLowerCase(),
              role: targetRole,
              invited_by: user.id,
              metadata: {
                supervisorName: profile?.full_name || user.email,
                inviterRole: selectedRole,
                relationshipType,
                invitedAt: new Date().toISOString(),
                targetUserId: targetUser.id,
                targetUserName: targetUser.full_name,
                customMessage: connectionCustomMessage.trim() || undefined,
              },
              status: 'pending',
            });

          if (inviteError && inviteError.code !== '23505') {
            console.error('🔗 [GettingStarted] Error creating invitation:', inviteError);
            failCount++;
            continue;
          }

          console.log('✅ [GettingStarted] Invitation created successfully');
          
          // Create notification for the target user (exactly like OnboardingInteractive)
          const notificationType = selectedRole === 'student' 
            ? 'supervisor_invitation' 
            : 'student_invitation';
          const baseMessage = selectedRole === 'student' 
            ? `${profile?.full_name || user.email || 'Someone'} wants you to be their supervisor`
            : `${profile?.full_name || user.email || 'Someone'} wants you to be their student`;
          
          // Include custom message if provided
          const fullMessage = connectionCustomMessage.trim() 
            ? `${baseMessage}\n\nPersonal message: "${connectionCustomMessage.trim()}"`
            : baseMessage;
          
          await supabase
            .from('notifications')
            .insert({
              user_id: targetUser.id,
              actor_id: user.id,
              type: notificationType as any,
              title: 'New Supervision Request',
              message: fullMessage,
              metadata: {
                relationship_type: relationshipType,
                from_user_id: user.id,
                from_user_name: profile?.full_name || user.email,
                customMessage: connectionCustomMessage.trim() || undefined,
              },
              action_url: 'vromm://notifications',
              priority: 'high',
              is_read: false,
            });

          console.log('✅ [GettingStarted] Notification created for:', targetUser.email);

          successCount++;
        } catch (error) {
          console.error('🔗 [GettingStarted] Error processing invitation for:', targetUser.email, error);
          failCount++;
        }
      }
      
      console.log('🔗 [GettingStarted] Invitations complete. Success:', successCount, 'Duplicates:', duplicateCount, 'Failed:', failCount);
      
      // Show success message
      if (successCount > 0) {
        console.log('🎉 [GettingStarted] Showing success message for', successCount, 'invitations');
      }
      
      // Refresh pending invitations to show the new ones
      await loadPendingInvitations();
      
      // Clear selections and search query
      setSelectedConnections([]);
      setConnectionCustomMessage('');
      setConnectionSearchQuery('');
      setSearchResults([]);
      
      // Close the modal after sending invitations
      hideConnectionsSheet();
      
    } catch (error) {
      console.error('🔗 [GettingStarted] Error creating connections:', error);
    }
  };

  // Handle relationship removal (copied from OnboardingInteractive)
  const handleRemoveRelationship = async () => {
    if (!relationshipRemovalTarget || !user?.id) return;
    
    try {
      // Remove the relationship
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .delete()
        .or(
          relationshipRemovalTarget.relationship_type === 'has_supervisor' 
            ? `and(student_id.eq.${user.id},supervisor_id.eq.${relationshipRemovalTarget.id})`
            : `and(student_id.eq.${relationshipRemovalTarget.id},supervisor_id.eq.${user.id})`
        );

      if (error) throw error;
      
      // TODO: Save removal message if provided
      if (relationshipRemovalMessage.trim()) {
        console.log('Removal message:', relationshipRemovalMessage.trim());
        // Could save to a removal_logs table or as metadata
      }
      
      loadExistingRelationships(); // Refresh the list
      closeRelationshipRemovalModal(); // Use animated close
      
    } catch (error) {
      console.error('Error removing relationship:', error);
    }
  };

  // Load existing relationships (copied from OnboardingInteractive)
  const loadExistingRelationships = async () => {
    if (!user?.id) return;

    try {
      // Get relationships where user is either student or supervisor
      const { data: relationships, error } = await supabase
        .from('student_supervisor_relationships')
        .select(`
          student_id,
          supervisor_id,
          created_at,
          student:profiles!ssr_student_id_fkey (id, full_name, email, role),
          supervisor:profiles!ssr_supervisor_id_fkey (id, full_name, email, role)
        `)
        .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

      if (error) {
        console.error('Error loading relationships:', error);
        return;
      }

      const transformedRelationships = relationships?.map(rel => {
        const isUserStudent = rel.student_id === user.id;
        const otherUser = isUserStudent ? (rel as any).supervisor : (rel as any).student;
        
        return {
          id: otherUser?.id || '',
          name: otherUser?.full_name || 'Unknown User',
          email: otherUser?.email || '',
          role: otherUser?.role || '',
          relationship_type: isUserStudent ? 'has_supervisor' : 'supervises_student',
          created_at: rel.created_at,
        };
      }) || [];

      setExistingRelationships(transformedRelationships);
    } catch (error) {
      console.error('Error loading existing relationships:', error);
    }
  };

  // Type assertion helper for profile to handle new fields
  const typedProfile = profile as typeof profile & {
    license_plan_completed?: boolean;
    license_plan_data?: {
      target_date?: string;
      has_theory?: boolean;
      has_practice?: boolean;
      previous_experience?: string;
      specific_goals?: string;
    };
    role_confirmed?: boolean;
  };

  React.useEffect(() => {
    const checkCreatedRoutes = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('routes')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', user.id);

        if (!error && typeof count === 'number') {
          setHasCreatedRoutes(count > 0);
        } else {
          setHasCreatedRoutes(false);
        }
      } catch (err) {
        setHasCreatedRoutes(false);
      }
    };

    checkCreatedRoutes();
  }, [user]);

  // Query supabase and check if the user has completed at least one exercise
  React.useEffect(() => {
    if (!user) return;
    const checkCompletedExercises = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('learning_path_exercise_completions')
          .select('exercise_id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && typeof count === 'number') {
          setHasCompletedExercise(count > 0);
        } else {
          setHasCompletedExercise(false);
        }
      } catch (err) {
        setHasCompletedExercise(false);
      }
    };

    checkCompletedExercises();

    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('exercise-completions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_path_exercise_completions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkCompletedExercises();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Query supabase and check if the user has at least one saved route
  React.useEffect(() => {
    const checkSavedRoutes = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('saved_routes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && typeof count === 'number') {
          setHasSavedRoute(count > 0);
        } else {
          setHasSavedRoute(false);
        }
      } catch (err) {
        setHasSavedRoute(false);
      }
    };

    checkSavedRoutes();
  }, [user]);

  // Check if user has connections (supervisors or students)
  React.useEffect(() => {
    const checkConnections = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('student_supervisor_relationships')
          .select('id', { count: 'exact', head: true })
          .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

        if (!error && typeof count === 'number') {
          setHasConnections(count > 0);
        } else {
          setHasConnections(false);
        }
      } catch (err) {
        setHasConnections(false);
      }
    };

    checkConnections();
  }, [user]);

  // Check if user has created events - DISABLED FOR BETA
  // React.useEffect(() => {
  //   const checkCreatedEvents = async () => {
  //     if (!user) return;
  //     try {
  //       const { count, error } = await supabase
  //         .from('events')
  //         .select('id', { count: 'exact', head: true })
  //         .eq('creator_id', user.id);

  //       if (!error && typeof count === 'number') {
  //         setHasCreatedEvent(count > 0);
  //       } else {
  //         setHasCreatedEvent(false);
  //       }
  //     } catch (err) {
  //       setHasCreatedEvent(false);
  //     }
  //   };

  //   checkCreatedEvents();
  // }, [user]);

  // Update license plan form data when profile changes (copied from ProfileScreen)
  React.useEffect(() => {
    if (profile) {
      const planData = profile.license_plan_data as any;
      if (planData?.target_date) {
        setTargetDate(new Date(planData.target_date));
      } else {
        setTargetDate(null);
      }
      setHasTheory(planData?.has_theory || false);
      setHasPractice(planData?.has_practice || false);
      setPreviousExperience(planData?.previous_experience || '');
      setSpecificGoals(planData?.specific_goals || '');
      
      // Also update role selection
      setSelectedRole(profile?.role || 'student');
    }
  }, [profile]);

  const hasLicensePlan = typedProfile?.license_plan_completed;
  const hasRoleSelected = typedProfile?.role_confirmed === true;

  // Add this helper function before the return statement in the HomeScreen component
  const isAllOnboardingCompleted =
    hasLicensePlan &&
    hasCreatedRoutes &&
    hasCompletedExercise &&
    hasSavedRoute &&
    hasRoleSelected &&
    hasConnections;
    // hasCreatedEvent; // DISABLED FOR BETA
  
  // Always show GettingStarted section for all users
  // if (isAllOnboardingCompleted) {
  //   return <></>;
  // }
  return (
    <YStack space="$4" marginBottom="$6">
      {/* <SectionHeader title={t('home.gettingStarted.title') || 'Getting Started'} variant="chevron" onAction={() => {}} actionLabel="" /> */}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$4" paddingHorizontal="$4">
          {/* 1. Din körkortsplan */}
          <TouchableOpacity
            ref={licensePlanRef}
            onPress={showKorkortsplanSheet}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              // ✅ Simplified tour highlighting - let TourOverlay handle main highlight
              isLicensePlanHighlighted() && {
                backgroundColor: 'rgba(0, 230, 195, 0.1)',
              },
            ]}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={
                isLicensePlanHighlighted() 
                  ? 'rgba(0, 230, 195, 0.2)' // Tour highlight background
                  : typedProfile?.license_plan_completed 
                    ? '$green5' 
                    : '$blue5'
              }
              borderRadius={16}
              padding="$4"
              justifyContent="space-between"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Feather
                  name="clipboard"
                  size={24}
                  color={typedProfile?.license_plan_completed ? '#00E6C3' : '#4B6BFF'}
                />
                {typedProfile?.license_plan_completed ? (
                  <View
                    style={{
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#000" fontWeight="bold">
                      100%
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#4B6BFF',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#fff" fontWeight="bold">
                      0%
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.licensePlan.title') || 'Your License Plan'}
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.licensePlan.description') || 'Tell us about yourself and your goals'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 2. Lägg till din första rutt */}
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateRoute', {})}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasCreatedRoutes ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$4"
              justifyContent="space-between"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Feather
                  name="map-pin"
                  size={24}
                  color={hasCreatedRoutes ? '#00E6C3' : '#FF9500'}
                />
                {hasCreatedRoutes && (
                  <View
                    style={{
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#000" fontWeight="bold">
                      {t('home.gettingStarted.status.completed') || 'DONE'}
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.firstRoute.title') || 'Add Your First Route'}
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.firstRoute.description') || 'Create a route you use often'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 3. Progress start step 1 */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ProgressTab', { showDetail: false })}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasCompletedExercise ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$4"
              justifyContent="space-between"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Feather
                  name="play-circle"
                  size={24}
                  color={hasCompletedExercise ? '#00E6C3' : '#4B6BFF'}
                />
                {hasCompletedExercise && (
                  <View
                    style={{
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#000" fontWeight="bold">
                      {t('home.gettingStarted.status.completed') || 'DONE'}
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.startLearning.title') || 'Start on Step 1 of 16'}
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.startLearning.description') || 'Start your license journey'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 4. Save a public route */}
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', {
              screen: 'MapTab',
              params: { screen: 'MapScreen' }
            } as any)}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasSavedRoute ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$4"
              justifyContent="space-between"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Feather name="bookmark" size={24} color={hasSavedRoute ? '#00E6C3' : '#FF9500'} />
                {hasSavedRoute && (
                  <View
                    style={{
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#000" fontWeight="bold">
                      {t('home.gettingStarted.status.completed') || 'DONE'}
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.saveRoute.title') || 'Save a Route'}
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.saveRoute.description') || 'Find and save a route from the map'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 5. Select your role */}
          <TouchableOpacity
            onPress={showRoleSheet}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasRoleSelected ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$4"
              justifyContent="space-between"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Feather name="user" size={24} color={hasRoleSelected ? '#00E6C3' : '#4B6BFF'} />
                {hasRoleSelected ? (
                  <View
                    style={{
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#000" fontWeight="bold">
                      100%
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#4B6BFF',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#fff" fontWeight="bold">
                      0%
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.chooseRole.title') || 'Choose Your Role'}
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.chooseRole.description') || 'Student, instructor, or driving school?'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 6. Connect with others - only show if role is selected */}
          {hasRoleSelected && (
            <TouchableOpacity
              onPress={showConnectionsSheet}
              activeOpacity={0.8}
              delayPressIn={50}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <YStack
                width={180}
                height={180}
                backgroundColor={hasConnections ? '$green5' : '$backgroundStrong'}
                borderRadius={16}
                padding="$4"
                justifyContent="space-between"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Feather name="users" size={24} color={hasConnections ? '#00E6C3' : '#4B6BFF'} />
                  {hasConnections && (
                    <View
                      style={{
                        backgroundColor: '#00E6C3',
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text fontSize={10} color="#000" fontWeight="bold">
                        KLART
                      </Text>
                    </View>
                  )}
                </XStack>

                <YStack>
                  <Text fontSize={18} fontWeight="bold" color="$color">
                    {typedProfile?.role === 'student' 
                      ? t('home.gettingStarted.connectStudent.title') || 'Add Supervisor'
                      : t('home.gettingStarted.connectInstructor.title') || 'Add Students'
                    }
                  </Text>
                  <Text fontSize={14} color="$gray11" marginTop="$1">
                    {typedProfile?.role === 'student'
                      ? t('home.gettingStarted.connectStudent.description') || 'Connect with driving schools and supervisors'
                      : t('home.gettingStarted.connectInstructor.description') || 'Connect with students to supervise'
                    }
                  </Text>
                </YStack>
              </YStack>
            </TouchableOpacity>
          )}

          {/* 7. Plan Your First Practice Event - DISABLED FOR BETA */}
          {/* <TouchableOpacity
            onPress={() => navigation.navigate('CreateEvent', {})}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasCreatedEvent ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$4"
              justifyContent="space-between"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Feather name="calendar" size={24} color={hasCreatedEvent ? '#00E6C3' : '#8B5CF6'} />
                {hasCreatedEvent && (
                  <View
                    style={{
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#000" fontWeight="bold">
                      {t('home.gettingStarted.status.completed') || 'DONE'}
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.createEvent.title') || 'Plan Practice Event'}
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.createEvent.description') || 'Create your first practice session or driving event'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity> */}
        </XStack>
      </ScrollView>

      {/* Körkortsplan Modal - copied from ProfileScreen */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showKorkortsplanModal}
        onRequestClose={hideKorkortsplanSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: korkortsplanBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideKorkortsplanSheet} />
            <Animated.View
              style={{
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                minHeight: '85%',
                transform: [{ translateY: korkortsplanSheetTranslateY }],
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <YStack gap="$4">
                  {/* Header - matching connections modal style (centered, no X) */}
                  <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                    {t('onboarding.licensePlan.title') || 'Your License Journey'}
                  </Text>

                  <Text fontSize="$3" color="$gray11" textAlign="center">
                    {t('onboarding.licensePlan.description') || 'Tell us about your experience level, driving goals and vehicle preferences'}
                  </Text>

                  <YStack gap="$4" marginTop="$4">
                    {/* Target License Date with Quick Options */}
                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('onboarding.date.title') || 'When do you want your license?'}</Text>
                      
                      {/* Quick Date Options */}
                      {[
                        { label: t('onboarding.date.within3months') || 'Within 3 months', months: 3, key: '3months' },
                        { label: t('onboarding.date.within6months') || 'Within 6 months', months: 6, key: '6months' },
                        { label: t('onboarding.date.within1year') || 'Within 1 year', months: 12, key: '1year' },
                        { label: t('onboarding.date.noSpecific') || 'No specific date', months: 24, key: 'nodate' },
                      ].map((option) => {
                        const optionTargetDate = new Date();
                        optionTargetDate.setMonth(optionTargetDate.getMonth() + option.months);
                        const isSelected = selectedDateOption === option.key;
                        
                        return (
                          <RadioButton
                            key={option.label}
                            onPress={() => {
                              setTargetDate(optionTargetDate);
                              setSelectedDateOption(option.key);
                            }}
                            title={option.label}
                            description={optionTargetDate.toLocaleDateString('sv-SE')}
                            isSelected={isSelected}
                          />
                        );
                      })}
                      
                      {/* Custom Date Picker with Popover - using RadioButton component */}
                      <View ref={dateButtonRef}>
                        <RadioButton
                          onPress={() => {
                            console.log('🗓️ [GettingStarted] Opening date popover');
                            setSelectedDateOption('custom');
                            setShowDatePopover(true);
                          }}
                          title={t('onboarding.date.pickSpecific') || 'Pick specific date'}
                          description={targetDate ? targetDate.toLocaleDateString() : new Date().toLocaleDateString()}
                          isSelected={selectedDateOption === 'custom'}
                        />
                      </View>
                      
                      <Popover
                        isVisible={showDatePopover}
                        onRequestClose={() => {
                          console.log('🗓️ [GettingStarted] Popover onRequestClose called');
                          setShowDatePopover(false);
                          // Complete cleanup to prevent any blocking issues
                          setTimeout(() => {
                            console.log('🗓️ [GettingStarted] Complete cleanup after popover close');
                            setSelectedDateOption('custom');
                          }, 10);
                        }}
                        from={dateButtonRef}
                        placement={'top' as any}
                        backgroundStyle={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                        popoverStyle={{
                          backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFF',
                          borderRadius: 12,
                          padding: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 12,
                          elevation: 12,
                          width: 380,
                          height: 480,
                          borderWidth: colorScheme === 'dark' ? 1 : 0,
                          borderColor: colorScheme === 'dark' ? '#333' : 'transparent',
                        }}
                      >
                        <YStack alignItems="center" gap="$2" width="100%">
                          <Text color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} size="lg" weight="semibold" textAlign="center">
                            {t('onboarding.date.selectTarget') || 'Select Target Date'}
                          </Text>
                          
                          {/* Container for full inline DateTimePicker */}
                          <View style={{
                            width: 350,
                            height: 380,
                            backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFF',
                            borderRadius: 8,
                            overflow: 'visible',
                          }}>
                            <DateTimePicker
                              testID="dateTimePicker"
                              value={targetDate || new Date()}
                              mode="date"
                              display="inline"
                              minimumDate={new Date()}
                              maximumDate={(() => {
                                const maxDate = new Date();
                                maxDate.setFullYear(maxDate.getFullYear() + 3);
                                return maxDate;
                              })()}
                              onChange={(event, selectedDate) => {
                                console.log('🗓️ [GettingStarted] Date changed:', selectedDate?.toLocaleDateString());
                                if (selectedDate) {
                                  setTargetDate(selectedDate);
                                  setSelectedDateOption('custom');
                                  // Don't auto-close - let user press save button
                                  console.log('🗓️ [GettingStarted] Date updated, waiting for save button');
                                }
                              }}
                              style={{ 
                                width: 350, 
                                height: 380,
                                backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFF',
                              }}
                              themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                              accentColor="#00E6C3"
                              locale={language === 'sv' ? 'sv-SE' : 'en-US'}
                            />
                          </View>
                          
                        </YStack>
                      </Popover>
                    </YStack>

                    {/* Theory Test Toggle */}
                    <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                      <Text size="md" weight="semibold" color="$color">
                        {t('onboarding.licensePlan.hasTheory') || 'Have you passed the theory test?'}
                      </Text>
                      <XStack alignItems="center" gap="$2">
                        <Switch 
                          size="$4"
                          checked={hasTheory} 
                          onCheckedChange={setHasTheory}
                          backgroundColor={hasTheory ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                        <Text size="md" color="$color">
                          {hasTheory ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Practice Test Toggle */}
                    <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                      <Text size="md" weight="semibold" color="$color">
                        {t('onboarding.licensePlan.hasPractice') || 'Have you passed the practical test?'}
                      </Text>
                      <XStack alignItems="center" gap="$2">
                        <Switch 
                          size="$4"
                          checked={hasPractice} 
                          onCheckedChange={setHasPractice}
                          backgroundColor={hasPractice ? '$blue8' : '$gray6'}
                        >
                          <Switch.Thumb />
                        </Switch>
                        <Text size="md" color="$color">
                          {hasPractice ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Previous Experience */}
                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('onboarding.licensePlan.previousExperience') || 'Previous driving experience'}</Text>
                      <TextArea
                        placeholder={t('onboarding.licensePlan.experiencePlaceholder') || 'Describe your previous driving experience'}
                        value={previousExperience}
                        onChangeText={setPreviousExperience}
                        minHeight={100}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        focusStyle={{
                          borderColor: '$blue8',
                        }}
                      />
                    </YStack>

                    {/* Specific Goals */}
                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('onboarding.licensePlan.specificGoals') || 'Specific goals'}</Text>
                      <TextArea
                        placeholder={t('onboarding.licensePlan.goalsPlaceholder') || 'Do you have specific goals with your license?'}
                        value={specificGoals}
                        onChangeText={setSpecificGoals}
                        minHeight={100}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        focusStyle={{
                          borderColor: '$blue8',
                        }}
                      />
                    </YStack>
                  </YStack>

                  <Button variant="primary" size="lg" onPress={handleLicensePlanSubmit} marginTop="$4">
                    {t('onboarding.licensePlan.savePreferences') || 'Save My Preferences'}
                  </Button>
                </YStack>
              </ScrollView>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Role Selection Modal - copied from OnboardingInteractive */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="none"
        onRequestClose={hideRoleSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: roleBackdropOpacity,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={hideRoleSheet} />
            <Animated.View
              style={{
                transform: [{ translateY: roleSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  Choose Your Role
                </Text>
                <YStack gap="$2">
                  {[
                    {
                      id: 'student',
                      title: t('onboarding.role.student') || 'Student',
                      description: t('onboarding.role.studentDescription') || 'I want to learn to drive',
                    },
                    {
                      id: 'instructor',
                      title: t('onboarding.role.instructor') || 'Instructor',
                      description: t('onboarding.role.instructorDescription') || 'I teach others to drive',
                    },
                    {
                      id: 'school',
                      title: t('onboarding.role.school') || 'Driving School',
                      description: t('onboarding.role.schoolDescription') || 'I represent a driving school',
                    },
                  ].map((role) => (
                    <RadioButton
                      key={role.id}
                      onPress={() => handleRoleSelect(role.id)}
                      title={role.title}
                      description={role.description}
                      isSelected={selectedRole === role.id}
                    />
                  ))}
                </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Connections Selection Modal - copied from OnboardingInteractive */}
      <Modal
        visible={showConnectionsModal}
        transparent
        animationType="none"
        onRequestClose={hideConnectionsSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: connectionsBackdropOpacity,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={hideConnectionsSheet} />
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: connectionsSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
                maxHeight="90%"
              >
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {selectedRole === 'student' 
                    ? 'Find Instructors'
                    : selectedRole === 'instructor' || selectedRole === 'school' 
                      ? 'Find Students'
                      : 'Find Users'
                  }
                </Text>
                
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {selectedRole === 'student' 
                    ? 'Search for driving instructors to connect with'
                    : selectedRole === 'instructor' || selectedRole === 'school' 
                      ? 'Search for students to connect with'
                      : 'Search for users to connect with'
                  }
                </Text>

                {/* Show existing relationships - using OnboardingInteractive styling */}
                {existingRelationships.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text size="md" fontWeight="600" color="$color">
                      {t('onboarding.relationships.existingTitle') || 'Your Existing Relationships'} ({existingRelationships.length}):
                    </Text>
                    {existingRelationships.map((relationship) => (
                      <XStack key={relationship.id} gap="$2" alignItems="center">
                        <YStack flex={1}>
                          <RadioButton
                            onPress={() => {}} // No action on tap for existing relationships
                            title={relationship.name}
                            description={`${relationship.email} • ${relationship.role} • ${relationship.relationship_type === 'has_supervisor' ? (t('onboarding.relationships.yourSupervisor') || 'Your supervisor') : (t('onboarding.relationships.studentYouSupervise') || 'Student you supervise')} ${t('onboarding.relationships.since') || 'since'} ${new Date(relationship.created_at).toLocaleDateString()}`}
                            isSelected={false} // Don't show as selected
                          />
                        </YStack>
                        <TouchableOpacity
                          onPress={() => {
                            setRelationshipRemovalTarget({
                              id: relationship.id,
                              name: relationship.name,
                              email: relationship.email,
                              role: relationship.role,
                              relationship_type: relationship.relationship_type,
                            });
                            openRelationshipRemovalModal();
                          }}
                        >
                          <Feather name="trash-2" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </XStack>
                    ))}
                  </YStack>
                )}

                {/* Show pending invitations */}
                {pendingInvitations.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text size="md" fontWeight="600" color="$color">
                      Pending Invitations ({pendingInvitations.length}):
                    </Text>
                    {pendingInvitations.map((invitation) => (
                      <XStack key={invitation.id} gap="$2" alignItems="center">
                        <YStack flex={1}>
                          <Text fontSize="$4" fontWeight="600" color="$color">
                            {invitation.metadata?.targetUserName || invitation.email}
                          </Text>
                          <Text fontSize="$3" color="$gray11">
                            {invitation.email} • Invited as {invitation.role} • {new Date(invitation.created_at).toLocaleDateString()}
                          </Text>
                          {invitation.metadata?.customMessage && (
                            <Text fontSize="$2" color="$gray9" fontStyle="italic">
                              Message: "{invitation.metadata.customMessage}"
                            </Text>
                          )}
                        </YStack>
                        <Text fontSize="$3" color="$orange10" fontWeight="600">
                          PENDING
                        </Text>
                        <TouchableOpacity
                          onPress={async () => {
                            console.log('🗑️ [GettingStarted] TRASH BUTTON PRESSED for invitation:', invitation.id);
                            
                            // Add haptic feedback to confirm tap
                            try {
                              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            } catch (e) {
                              // Haptics might not be available
                            }
                            
                            try {
                              console.log('🗑️ [GettingStarted] Starting deletion process...');
                              
                              // Cancel the pending invitation (update status instead of delete)
                              console.log('🗑️ [GettingStarted] Attempting to cancel invitation with ID:', invitation.id);
                              
                              // First try to update pending_invitations table
                              const { data: pendingData, error: pendingError } = await supabase
                                .from('pending_invitations')
                                .update({ 
                                  status: 'cancelled',
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', invitation.id)
                                .select();

                              console.log('🗑️ [GettingStarted] Pending invitations result:', { data: pendingData, error: pendingError });

                              // If that fails, try to mark notification as read (for notification-based invitations)
                              if (pendingError || !pendingData || pendingData.length === 0) {
                                console.log('🗑️ [GettingStarted] Not found in pending_invitations, trying notifications table...');
                                
                                const { data: notifData, error: notifError } = await supabase
                                  .from('notifications')
                                  .update({ 
                                    is_read: true,
                                    read_at: new Date().toISOString()
                                  })
                                  .eq('id', invitation.id)
                                  .select();

                                console.log('🗑️ [GettingStarted] Notifications result:', { data: notifData, error: notifError });

                                if (notifError) {
                                  console.error('❌ [GettingStarted] Error cancelling notification:', notifError);
                                  return;
                                }

                                if (!notifData || notifData.length === 0) {
                                  console.warn('⚠️ [GettingStarted] No rows were updated in notifications either - invitation might not exist');
                                  return;
                                }

                                console.log('✅ [GettingStarted] Notification marked as read successfully:', notifData);
                              } else {
                                console.log('✅ [GettingStarted] Pending invitation cancelled successfully:', pendingData);
                              }
                              
                              // Refresh the pending invitations list
                              console.log('🔄 [GettingStarted] Refreshing pending invitations list...');
                              await loadPendingInvitations();
                              console.log('🔄 [GettingStarted] Pending invitations refreshed');
                            } catch (error) {
                              console.error('❌ [GettingStarted] Caught error removing invitation:', error);
                            }
                          }}
                          style={{ 
                            padding: 12,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 8,
                            marginLeft: 8
                          }}
                          activeOpacity={0.6}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="trash-2" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </XStack>
                    ))}
                  </YStack>
                )}
                
                {/* Show selected connections with message - using OnboardingInteractive styling */}
                {selectedConnections.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text size="md" fontWeight="600" color="$color">
                      {t('onboarding.relationships.newConnectionsTitle') || 'New Connection to Add'} ({selectedConnections.length}):
                    </Text>
                    {selectedConnections.map((connection) => (
                      <RadioButton
                        key={connection.id}
                        onPress={() => {
                          // Remove this connection
                          setSelectedConnections(prev => 
                            prev.filter(conn => conn.id !== connection.id)
                          );
                        }}
                        title={connection.full_name || connection.email}
                        description={`${connection.email} • ${connection.role || 'instructor'} • ${t('onboarding.connections.tapToRemove') || 'Tap to remove'}`}
                        isSelected={true}
                      />
                    ))}
                    
                    {/* Show custom message if provided */}
                    {connectionCustomMessage.trim() && (
                      <YStack gap="$1" marginTop="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                        <Text size="sm" color="$gray11" fontWeight="600">Your message:</Text>
                        <Text size="sm" color="$color" fontStyle="italic">
                          "{connectionCustomMessage.trim()}"
                        </Text>
                      </YStack>
                    )}
                  </YStack>
                )}
                
                {/* Custom message input */}
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray11">Optional message:</Text>
                  <TextInput
                    value={connectionCustomMessage}
                    onChangeText={setConnectionCustomMessage}
                    placeholder="Add a personal message..."
                    multiline
                    style={{
                      backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#fff',
                      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 60,
                      textAlignVertical: 'top',
                    }}
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
                  />
                </YStack>
                
                <FormField
                  placeholder="Search by name or email..."
                  value={connectionSearchQuery}
                  onChangeText={handleSearchUsers}
                />
                
                <ScrollView style={{ flex: 1, maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                  <YStack gap="$2">
                    {searchResults.length === 0 && connectionSearchQuery.length >= 2 && (
                      <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                        No users found
                      </Text>
                    )}
                    
                    {searchResults.length === 0 && connectionSearchQuery.length < 2 && (
                      <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                        Start typing to search for users
                      </Text>
                    )}
                    
                    {searchResults.map((user) => {
                      const isSelected = selectedConnections.some(conn => conn.id === user.id);
                      return (
                        <TouchableOpacity
                          key={user.id}
                          onPress={async () => {
                            if (isSelected) {
                              // Remove from selection
                              setSelectedConnections(prev => prev.filter(conn => conn.id !== user.id));
                            } else {
                              // Add to selection
                              setSelectedConnections(prev => [...prev, user]);
                            }
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? '#00E6C3' : '#ccc',
                            backgroundColor: isSelected ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                            marginVertical: 4,
                          }}
                        >
                          <XStack gap={8} alignItems="center">
                            <YStack flex={1}>
                              <Text color="$color" fontSize={14} fontWeight="600">
                                {user.full_name || 'Unknown User'}
                              </Text>
                              <Text fontSize={12} color="$gray11">
                                {user.email} • {user.role}
                              </Text>
                            </YStack>
                            {isSelected ? (
                              <Feather name="check" size={16} color="#00E6C3" />
                            ) : (
                              <Feather name="plus-circle" size={16} color="#ccc" />
                            )}
                          </XStack>
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>
                </ScrollView>
                
                {/* Action Buttons */}
                <YStack gap="$2" marginTop="$4">
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleCreateConnections}
                    disabled={selectedConnections.length === 0}
                  >
                    <Text color="white" fontWeight="600">
                      {selectedConnections.length > 0 
                        ? `Send ${selectedConnections.length} Invitation${selectedConnections.length > 1 ? 's' : ''}`
                        : 'Select Users to Invite'
                      }
                    </Text>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onPress={hideConnectionsSheet}
                  >
                    <Text color="$color">Cancel</Text>
                  </Button>
                </YStack>
              </YStack>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>

      {/* Relationship Removal Modal - copied from OnboardingInteractive */}
      <Modal
        visible={showRelationshipRemovalModal}
        transparent
        animationType="none"
        onRequestClose={closeRelationshipRemovalModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: relationshipRemovalBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={closeRelationshipRemovalModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: relationshipRemovalSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
                minHeight="60%"
              >
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {relationshipRemovalTarget?.relationship_type === 'has_supervisor' 
                    ? (t('onboarding.relationships.removeSupervisorTitle') || 'Remove Supervisor')
                    : (t('onboarding.relationships.removeStudentTitle') || 'Remove Student')
                  }
                </Text>
                
                <Text fontSize="$4" color="$color">
                  {relationshipRemovalTarget?.relationship_type === 'has_supervisor'
                    ? (t('onboarding.relationships.removeSupervisorConfirm') || 'Are you sure you want to remove {name} as your supervisor?').replace('{name}', relationshipRemovalTarget?.name || '')
                    : (t('onboarding.relationships.removeStudentConfirm') || 'Are you sure you want to remove {name} as your student?').replace('{name}', relationshipRemovalTarget?.name || '')
                  }
                </Text>
                
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray11">{t('onboarding.relationships.optionalMessage') || 'Optional message:'}</Text>
                  <TextInput
                    value={relationshipRemovalMessage}
                    onChangeText={setRelationshipRemovalMessage}
                    placeholder={t('onboarding.relationships.messagePlaceholder') || 'Add a message explaining why (optional)...'}
                    multiline
                    style={{
                      backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#fff',
                      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 80,
                      textAlignVertical: 'top',
                    }}
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
                  />
                </YStack>
                
                <YStack gap="$2">
                  <Button
                    variant="primary"
                    backgroundColor="$red9"
                    size="lg"
                    onPress={handleRemoveRelationship}
                  >
                    <Text color="white">{t('common.remove') || 'Remove'}</Text>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onPress={closeRelationshipRemovalModal}
                  >
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                </YStack>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </YStack>
  );
};
