import React, { useState, useEffect } from 'react';
import { Modal, TouchableOpacity, Dimensions, Linking, Platform } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/TranslationContext';
import { useThemePreference } from '../../hooks/useThemeOverride';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SchoolDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'school' | 'instructor';
}

interface EntityData {
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  logo_url?: string;
}

const SNAP_POINTS = {
  medium: SCREEN_HEIGHT * 0.4,
  dismissed: SCREEN_HEIGHT,
};

export function SchoolDetailSheet({ visible, onClose, entityId, entityType }: SchoolDetailSheetProps) {
  const { t } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';

  const [data, setData] = useState<EntityData | null>(null);
  const [loading, setLoading] = useState(true);

  const translateY = useSharedValue(SNAP_POINTS.dismissed);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(SNAP_POINTS.medium, { damping: 20, stiffness: 150 });
      loadData();
    } else {
      translateY.value = withSpring(SNAP_POINTS.dismissed, { damping: 20, stiffness: 150 });
    }
  }, [visible, entityId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (entityType === 'school') {
        // Extract actual school id (remove prefix)
        const actualId = entityId.replace('school-', '');
        const { data: school } = await supabase
          .from('schools')
          .select('id, name, description, contact_email, phone, location, logo_url')
          .eq('id', actualId)
          .single();

        if (school) {
          setData({
            name: school.name || 'Unknown School',
            description: school.description || undefined,
            email: school.contact_email || undefined,
            phone: school.phone || undefined,
            location: school.location || undefined,
            logo_url: school.logo_url || undefined,
          });
        }
      } else {
        const actualId = entityId.replace('instructor-', '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, location, avatar_url')
          .eq('id', actualId)
          .single();

        if (profile) {
          setData({
            name: profile.full_name || 'Unknown Instructor',
            email: profile.email || undefined,
            phone: (profile as any).phone || undefined,
            location: profile.location || undefined,
            avatar_url: profile.avatar_url || undefined,
          });
        }
      }
    } catch (error) {
      console.error('Error loading entity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    translateY.value = withSpring(SNAP_POINTS.dismissed, { damping: 20, stiffness: 150 });
    setTimeout(onClose, 300);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate(event => {
      const newY = SNAP_POINTS.medium + event.translationY;
      if (newY >= SNAP_POINTS.medium) {
        translateY.value = newY;
      }
    })
    .onEnd(event => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(SNAP_POINTS.medium, { damping: 20, stiffness: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { top: translateY.value };
    }
    return { transform: [{ translateY: translateY.value }] };
  });

  const openEmail = () => {
    if (data?.email) Linking.openURL(`mailto:${data.email}`);
  };

  const openPhone = () => {
    if (data?.phone) Linking.openURL(`tel:${data.phone}`);
  };

  const openDirections = () => {
    if (data?.location) {
      const url = Platform.select({
        ios: `maps:?q=${encodeURIComponent(data.location)}`,
        android: `geo:0,0?q=${encodeURIComponent(data.location)}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          activeOpacity={1}
          onPress={dismiss}
        />

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                height: SCREEN_HEIGHT * 0.65,
                backgroundColor: isDark ? '#1A1A1A' : '#FFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 10,
              },
              animatedStyle,
            ]}
          >
            {/* Drag handle */}
            <YStack alignItems="center" paddingVertical="$3">
              <YStack
                width={40}
                height={4}
                borderRadius={2}
                backgroundColor={isDark ? '#444' : '#CCC'}
              />
            </YStack>

            {loading ? (
              <YStack flex={1} justifyContent="center" alignItems="center">
                <Spinner size="large" color="#00E6C3" />
              </YStack>
            ) : data ? (
              <YStack padding="$4" gap="$3">
                {/* Hero section */}
                <XStack alignItems="center" gap="$3">
                  <YStack
                    width={60}
                    height={60}
                    borderRadius={30}
                    backgroundColor={entityType === 'school' ? '#FF6B0020' : '#0A84FF20'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Feather
                      name={entityType === 'school' ? 'home' : 'user'}
                      size={28}
                      color={entityType === 'school' ? '#FF6B00' : '#0A84FF'}
                    />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$6" fontWeight="bold" color={isDark ? '#FFF' : '#000'}>
                      {data.name}
                    </Text>
                    {data.location && (
                      <XStack alignItems="center" gap="$1" marginTop="$1">
                        <Feather name="map-pin" size={14} color={isDark ? '#AAA' : '#666'} />
                        <Text fontSize="$3" color={isDark ? '#AAA' : '#666'}>
                          {data.location}
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                </XStack>

                {/* Description */}
                {data.description && (
                  <Text fontSize="$3" color={isDark ? '#CCC' : '#333'} lineHeight={20}>
                    {data.description}
                  </Text>
                )}

                {/* Contact info */}
                {data.email && (
                  <TouchableOpacity onPress={openEmail}>
                    <XStack alignItems="center" gap="$2" padding="$2">
                      <Feather name="mail" size={18} color="#00E6C3" />
                      <Text fontSize="$3" color="#00E6C3">{data.email}</Text>
                    </XStack>
                  </TouchableOpacity>
                )}

                {data.phone && (
                  <TouchableOpacity onPress={openPhone}>
                    <XStack alignItems="center" gap="$2" padding="$2">
                      <Feather name="phone" size={18} color="#00E6C3" />
                      <Text fontSize="$3" color="#00E6C3">{data.phone}</Text>
                    </XStack>
                  </TouchableOpacity>
                )}

                {/* Action buttons */}
                <XStack gap="$2" marginTop="$2">
                  {data.email && (
                    <TouchableOpacity
                      onPress={openEmail}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: '#00E6C3',
                      }}
                    >
                      <Feather name="mail" size={18} color="#000" />
                      <Text fontSize="$3" fontWeight="600" color="#000">
                        Contact
                      </Text>
                    </TouchableOpacity>
                  )}

                  {data.location && (
                    <TouchableOpacity
                      onPress={openDirections}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#333' : '#E5E5E5',
                      }}
                    >
                      <Feather name="navigation" size={18} color={isDark ? '#FFF' : '#333'} />
                      <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#333'}>
                        Directions
                      </Text>
                    </TouchableOpacity>
                  )}
                </XStack>
              </YStack>
            ) : (
              <YStack flex={1} justifyContent="center" alignItems="center">
                <Text color={isDark ? '#666' : '#999'}>No data available</Text>
              </YStack>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
