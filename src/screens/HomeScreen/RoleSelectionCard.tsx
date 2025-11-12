import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  useColorScheme,
  Modal,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { YStack, Text, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { RadioButton } from '../../components/SelectButton';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

const GETTING_STARTED_IMAGES = {
  chooseRole: require('../../../assets/images/getting_started/getting_started_05.png'),
};

const { height } = Dimensions.get('window');

export const RoleSelectionCard = () => {
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme();
  const { profile, user, refreshProfile } = useAuth();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(profile?.role || 'student');
  const [isCardHidden, setIsCardHidden] = useState(false);

  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  // Modal animation with snap points
  const roleBackdropOpacity = useRef(new Animated.Value(0)).current;
  const roleSnapPoints = useMemo(
    () => ({
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.7, // Top at 70% of screen (show 30% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height,
    }),
    [],
  );

  const roleTranslateY = useSharedValue(height);
  const roleIsAnimating = useSharedValue(false);
  const roleCurrentState = useSharedValue(roleSnapPoints.large);

  const rolePanGesture = Gesture.Pan()
    .onBegin(() => {
      if (roleIsAnimating.value) return;
      roleIsAnimating.value = true;
    })
    .onUpdate((event) => {
      if (roleIsAnimating.value === false) return;
      const { translationY } = event;
      const newPosition = roleCurrentState.value + translationY;

      // Constrain to snap points range (large is smallest Y, allow dragging past mini for dismissal)
      const minPosition = roleSnapPoints.large; // Smallest Y (show most)
      const maxPosition = roleSnapPoints.mini + 100; // Allow dragging past mini for dismissal
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

      roleTranslateY.value = boundedPosition;
    })
    .onEnd((event) => {
      if (roleIsAnimating.value === false) return;
      const { translationY, velocityY } = event;
      const currentPosition = roleCurrentState.value + translationY;

      // Dismiss if dragged down past mini with reasonable velocity
      if (currentPosition > roleSnapPoints.mini + 30 && velocityY > 200) {
        roleIsAnimating.value = false;
        runOnJS(hideRoleSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        // Fast upward swipe - go to larger size (smaller Y)
        targetSnapPoint = roleSnapPoints.large;
      } else if (velocityY > 500) {
        // Fast downward swipe - go to smaller size (larger Y)
        targetSnapPoint = roleSnapPoints.mini;
      } else {
        // Find closest snap point
        const positions = [
          roleSnapPoints.large,
          roleSnapPoints.medium,
          roleSnapPoints.small,
          roleSnapPoints.mini,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      // Constrain target to valid range
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, roleSnapPoints.large),
        roleSnapPoints.mini,
      );

      roleTranslateY.value = withSpring(
        boundedTarget,
        {
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
        () => {
          roleIsAnimating.value = false;
        },
      );

      roleCurrentState.value = boundedTarget;
    });

  const showRoleSheet = () => {
    if (showRoleModal) return;
    setShowRoleModal(true);
    roleIsAnimating.value = false;
    roleTranslateY.value = withSpring(roleSnapPoints.large, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    roleCurrentState.value = roleSnapPoints.large;

    Animated.timing(roleBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideRoleSheet = () => {
    if (!showRoleModal) return;
    roleIsAnimating.value = false;
    roleTranslateY.value = withSpring(roleSnapPoints.dismissed, {
      damping: 20,
      stiffness: 300,
    });
    Animated.timing(roleBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      setShowRoleModal(false);
    }, 300);
  };

  const handleRoleSelect = async (roleId: string) => {
    setSelectedRole(roleId);

    if (!user) return;

    try {
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
        await refreshProfile();
        hideRoleSheet();
      }
    } catch (err) {
      console.error('Error saving role selection:', err);
    }
  };

  // Hide card if manually hidden
  if (isCardHidden) {
    return null;
  }

  return (
    <>
      <YStack paddingHorizontal="$4">
        <Card
          backgroundColor={profile?.role_confirmed ? '$green5' : '$backgroundStrong'}
          borderRadius="$4"
          overflow="hidden"
          borderWidth={1}
          borderColor="$borderColor"
        >
          {/* Percentage badge - absolutely positioned */}
          {profile?.role_confirmed ? (
            <View
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: '#00E6C3',
                borderRadius: 10,
                paddingHorizontal: 6,
                paddingVertical: 3,
                zIndex: 1,
              }}
            >
              <Text fontSize={9} color="#000" fontWeight="bold">
                100%
              </Text>
            </View>
          ) : (
            <View
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: '#4B6BFF',
                borderRadius: 10,
                paddingHorizontal: 6,
                paddingVertical: 3,
                zIndex: 1,
              }}
            >
              <Text fontSize={9} color="#fff" fontWeight="bold">
                0%
              </Text>
            </View>
          )}

          <Image
            source={GETTING_STARTED_IMAGES.chooseRole}
            style={{
              width: '100%',
              height: 140,
              resizeMode: 'cover',
            }}
          />

          <YStack alignItems="center" gap="$4" padding="$6">
            <YStack alignItems="center" gap="$2">
              <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                {profile?.role_confirmed && profile?.role
                  ? profile.role === 'student'
                    ? getTranslation('onboarding.role.student', language === 'sv' ? 'Elev' : 'Student')
                    : getTranslation('onboarding.role.instructor', language === 'sv' ? 'Handledare' : 'Instructor')
                  : getTranslation(
                      'home.gettingStarted.chooseRole.title',
                      language === 'sv' ? 'Välj din roll' : 'Choose Your Role',
                    )}
              </Text>
              <Text fontSize="$4" color="$gray11" textAlign="center">
                {profile?.role_confirmed && profile?.role
                  ? profile.role === 'student'
                    ? getTranslation('onboarding.role.studentDescription', language === 'sv' ? 'Du lär dig köra' : 'I want to learn to drive')
                    : getTranslation('onboarding.role.instructorDescription', language === 'sv' ? 'Du lär andra att köra' : 'I teach others to drive')
                  : getTranslation(
                      'home.gettingStarted.chooseRole.description',
                      language === 'sv'
                        ? 'Elev, handledare eller körskola?'
                        : 'Student, instructor, or driving school?',
                    )}
              </Text>
            </YStack>

            <TouchableOpacity
              onPress={showRoleSheet}
              style={{
                backgroundColor: '#00E6C3',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Text fontSize="$4" fontWeight="600" color="#000">
                {getTranslation(
                  'home.roleSelection.selectRole',
                  language === 'sv' ? 'Välj roll' : 'Select Role',
                )}
              </Text>
            </TouchableOpacity>
          </YStack>
        </Card>
      </YStack>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="none"
        onRequestClose={hideRoleSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            opacity: roleBackdropOpacity,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                roleIsAnimating.value = false;
                hideRoleSheet();
              }}
            />
            <GestureDetector gesture={rolePanGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: height,
                    backgroundColor: colorScheme === 'dark' ? '#151515' : '#fff',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 20,
                  },
                  {
                    transform: [{ translateY: roleTranslateY }],
                  },
                ]}
              >
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                    }}
                  />
                </View>

                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {getTranslation(
                    'home.roleSelection.modalTitle',
                    language === 'sv' ? 'Välj din roll' : 'Choose Your Role',
                  )}
                </Text>
                <YStack gap="$2" marginTop="$4">
                  {[
                    {
                      id: 'student',
                      title: t('onboarding.role.student') || 'Student',
                      description:
                        t('onboarding.role.studentDescription') || 'I want to learn to drive',
                    },
                    {
                      id: 'instructor',
                      title: t('onboarding.role.instructor') || 'Instructor',
                      description:
                        t('onboarding.role.instructorDescription') || 'I teach others to drive',
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
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
};
