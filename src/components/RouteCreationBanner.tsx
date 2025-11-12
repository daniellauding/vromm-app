import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import { CreateRouteSheet } from './CreateRouteSheet';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width - 32; // 16px padding on each side

interface RouteCreationBannerProps {
  onDismiss: () => void;
}

export function RouteCreationBanner({ onDismiss }: RouteCreationBannerProps) {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { showModal, hideModal } = useModal();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [hasCreatedRoutes, setHasCreatedRoutes] = useState(false);
  const [hasSavedRoutes, setHasSavedRoutes] = useState(false);
  const [hasDrivenRoutes, setHasDrivenRoutes] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Check if user has created routes
  useEffect(() => {
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
      } catch (_err) {
        setHasCreatedRoutes(false);
      }
    };

    checkCreatedRoutes();
  }, [user]);

  // Check if user has saved routes
  useEffect(() => {
    const checkSavedRoutes = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('saved_routes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && typeof count === 'number') {
          setHasSavedRoutes(count > 0);
        } else {
          setHasSavedRoutes(false);
        }
      } catch (_err) {
        setHasSavedRoutes(false);
      }
    };

    checkSavedRoutes();
  }, [user]);

  // Check if user has driven routes
  useEffect(() => {
    const checkDrivenRoutes = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('driven_routes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && typeof count === 'number') {
          setHasDrivenRoutes(count > 0);
        } else {
          setHasDrivenRoutes(false);
        }
      } catch (_err) {
        setHasDrivenRoutes(false);
      }
    };

    checkDrivenRoutes();
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const routesSubscription = supabase
      .channel('user-routes-banner')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'routes',
          filter: `creator_id=eq.${user.id}`,
        },
        () => {
          setHasCreatedRoutes(true);
        },
      )
      .subscribe();

    const savedSubscription = supabase
      .channel('user-saved-routes-banner')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'saved_routes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setHasSavedRoutes(true);
        },
      )
      .subscribe();

    const drivenSubscription = supabase
      .channel('user-driven-routes-banner')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driven_routes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setHasDrivenRoutes(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(routesSubscription);
      supabase.removeChannel(savedSubscription);
      supabase.removeChannel(drivenSubscription);
    };
  }, [user]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  // Build slides array based on what user hasn't done yet
  const slides = [];

  if (!hasCreatedRoutes) {
    slides.push({
      id: 'create',
      icon: 'upload' as const,
      title: getTranslation(
        'banner.createRoute.title',
        language === 'sv' ? 'Ladda upp din egen rutt' : 'Upload your own route'
      ),
      description: getTranslation(
        'banner.createRoute.description',
        language === 'sv' ? 'Skapa och dela dina favoritrutter' : 'Create and share your favorite driving routes'
      ),
      buttonText: getTranslation(
        'banner.createRoute.button',
        language === 'sv' ? 'Skapa rutt' : 'Create Route'
      ),
      onPress: () => {
        showModal(
          <CreateRouteSheet
            visible={true}
            onClose={() => hideModal()}
            onRouteCreated={(routeId) => {
              console.log('✅ Route created with ID:', routeId);
              hideModal();
              setHasCreatedRoutes(true);
            }}
          />
        );
      },
    });
  }

  if (!hasSavedRoutes) {
    slides.push({
      id: 'save',
      icon: 'bookmark' as const,
      title: getTranslation(
        'banner.saveRoute.title',
        language === 'sv' ? 'Spara en rutt' : 'Save a route'
      ),
      description: getTranslation(
        'banner.saveRoute.description',
        language === 'sv' ? 'Hitta och spara rutter från kartan' : 'Find and save routes from the map'
      ),
      buttonText: getTranslation(
        'banner.saveRoute.button',
        language === 'sv' ? 'Utforska rutter' : 'Explore Routes'
      ),
      onPress: () => {
        navigation.navigate('MainTabs', {
          screen: 'MapTab',
          params: { screen: 'MapScreen' },
        } as any);
      },
    });
  }

  if (!hasDrivenRoutes) {
    slides.push({
      id: 'drive',
      icon: 'navigation' as const,
      title: getTranslation(
        'banner.driveRoute.title',
        language === 'sv' ? 'Markera en rutt som körd' : 'Mark a route as driven'
      ),
      description: getTranslation(
        'banner.driveRoute.description',
        language === 'sv' ? 'Spåra din körningshistorik' : 'Track your driving history'
      ),
      buttonText: getTranslation(
        'banner.driveRoute.button',
        language === 'sv' ? 'Hitta rutter' : 'Find Routes'
      ),
      onPress: () => {
        navigation.navigate('MainTabs', {
          screen: 'MapTab',
          params: { screen: 'MapScreen' },
        } as any);
      },
    });
  }

  // Don't show banner if all actions completed or if dismissed
  if (slides.length === 0 || isDismissed) {
    return null;
  }

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setCurrentSlide(slideIndex);
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 180, // Above the routes drawer
        left: 0,
        right: 0,
        zIndex: 100, // Lower z-index so route detail sheets can appear above
      }}
    >
      <YStack gap="$2">
        {/* Carousel Container */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          snapToInterval={SLIDE_WIDTH}
          decelerationRate="fast"
        >
          {slides.map((slide, index) => (
            <View
              key={slide.id}
              style={{
                width: SLIDE_WIDTH,
                marginRight: index < slides.length - 1 ? 0 : 0,
              }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(0, 230, 195, 0.95)',
                  borderRadius: 12,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: 'rgba(0, 230, 195, 0.3)',
                }}
              >
                <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
                  <YStack flex={1} gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <Feather name={slide.icon} size={20} color="#000" />
                      <Text fontSize={16} fontWeight="bold" color="#000" style={{ fontStyle: 'italic' }}>
                        {slide.title}
                      </Text>
                    </XStack>
                    <Text fontSize={14} color="rgba(0, 0, 0, 0.8)" lineHeight={18}>
                      {slide.description}
                    </Text>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={slide.onPress}
                      backgroundColor="rgba(0, 0, 0, 0.1)"
                      marginTop="$2"
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <Text color="#000" fontWeight="600" fontSize={14}>
                        {slide.buttonText}
                      </Text>
                    </Button>
                  </YStack>

                  {/* Only show X button on the last slide or if there's only one slide */}
                  {(slides.length === 1 || index === slides.length - 1) && (
                    <TouchableOpacity
                      onPress={handleDismiss}
                      style={{
                        padding: 4,
                        borderRadius: 16,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={16} color="rgba(0, 0, 0, 0.7)" />
                    </TouchableOpacity>
                  )}
                </XStack>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Pagination Dots - only show if more than one slide */}
        {slides.length > 1 && (
          <XStack justifyContent="center" gap="$2" paddingVertical="$2">
            {slides.map((_, index) => (
              <View
                key={index}
                style={{
                  width: currentSlide === index ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    currentSlide === index ? 'rgba(0, 230, 195, 0.95)' : 'rgba(0, 230, 195, 0.3)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </XStack>
        )}
      </YStack>
    </View>
  );
}
