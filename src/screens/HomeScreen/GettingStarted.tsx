import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';

import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { View, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';

import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '@/src/context/AuthContext';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';

export const GettingStarted = () => {
  const { profile, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [hasCreatedRoutes, setHasCreatedRoutes] = React.useState(false);
  const [hasCompletedExercise, setHasCompletedExercise] = React.useState(false);
  const [hasSavedRoute, setHasSavedRoute] = React.useState(false);

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
    }
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

  const hasLicensePlan = typedProfile?.license_plan_completed;
  const hasRoleSelected = typedProfile?.role_confirmed === true;

  // Add this helper function before the return statement in the HomeScreen component
  const isAllOnboardingCompleted =
    hasLicensePlan && hasCreatedRoutes && hasCompletedExercise && hasSavedRoute && hasRoleSelected;
  if (isAllOnboardingCompleted) {
    return null;
  }
  return (
    <YStack space="$4" marginBottom="$6">
      <SectionHeader title="Komma igång" variant="chevron" onAction={() => {}} actionLabel="" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$4" paddingHorizontal="$4">
          {/* 1. Din körkortsplan */}
          <TouchableOpacity
            onPress={() => navigation.navigate('LicensePlanScreen')}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={typedProfile?.license_plan_completed ? '$green5' : '$blue5'}
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
                  Din körkortsplan
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  Berätta om dig och dina mål
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
                      KLART
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  Lägg till din första rutt
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  Skapa en körrutt du använder ofta
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
                      KLART
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  Börja på steg 1 av 16
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  Starta din körkortsresa
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 4. Save a public route */}
          <TouchableOpacity
            onPress={() => navigation.navigate('MapTab')}
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
                      KLART
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  Spara en körrutt
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  Hitta och spara en rutt från kartan
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 5. Select your role */}
          <TouchableOpacity
            onPress={() => navigation.navigate('RoleSelectionScreen')}
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
                  Välj din roll
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  Student, lärare eller trafikskola?
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>
        </XStack>
      </ScrollView>
    </YStack>
  );
};
