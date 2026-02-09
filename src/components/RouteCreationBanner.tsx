import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from './Text';
import { Button } from './Button';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import { CreateRouteSheet } from './CreateRouteSheet';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';

const BANNER_DISMISSED_KEY = 'vromm_route_creation_banner_dismissed';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width - 32; // 16px padding on each side
const AUTO_SLIDE_INTERVAL = 5000; // 5 seconds

interface RouteCreationBannerProps {
  onDismiss: () => void;
  onRoutePress?: (routeId: string) => void;
  isRouteSelected?: boolean; // Hide banner when a route is selected
}

export function RouteCreationBanner({ onDismiss, onRoutePress, isRouteSelected }: RouteCreationBannerProps) {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { showModal, hideModal } = useModal();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const autoSlideTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [hasCreatedRoutes, setHasCreatedRoutes] = useState(false);
  const [hasSavedRoutes, setHasSavedRoutes] = useState(false);
  const [hasDrivenRoutes, setHasDrivenRoutes] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoadingDismissed, setIsLoadingDismissed] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [nearbyRoutes, setNearbyRoutes] = useState<any[]>([]);

  // Check if banner was previously dismissed
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
        if (dismissed === 'true') {
          setIsDismissed(true);
        }
      } catch (error) {
        console.error('Error checking banner dismissed state:', error);
      } finally {
        setIsLoadingDismissed(false);
      }
    };
    checkDismissed();
  }, []);

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

  const handleDismiss = async () => {
    setIsDismissed(true);
    try {
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    } catch (error) {
      console.error('Error saving banner dismissed state:', error);
    }
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
        // If we have nearby routes, open one; otherwise go to map
        if (nearbyRoutes.length > 0 && onRoutePress) {
          const randomRoute = nearbyRoutes[Math.floor(Math.random() * nearbyRoutes.length)];
          onRoutePress(randomRoute.id);
        } else {
          navigation.navigate('MainTabs', {
            screen: 'MapTab',
            params: { screen: 'MapScreen' },
          } as any);
        }
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
        // If we have nearby routes, open one; otherwise go to map
        if (nearbyRoutes.length > 0 && onRoutePress) {
          const randomRoute = nearbyRoutes[Math.floor(Math.random() * nearbyRoutes.length)];
          onRoutePress(randomRoute.id);
        } else {
          navigation.navigate('MainTabs', {
            screen: 'MapTab',
            params: { screen: 'MapScreen' },
          } as any);
        }
      },
    });
  }

  // Load nearby routes for save/drive CTAs
  useEffect(() => {
    const loadNearbyRoutes = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('id, name, creator_id')
          .neq('creator_id', user.id)
          .limit(10)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setNearbyRoutes(data);
        }
      } catch (err) {
        console.error('Error loading nearby routes:', err);
      }
    };

    loadNearbyRoutes();
  }, [user]);

  // Auto-slide functionality
  useEffect(() => {
    if (slides.length <= 1) return; // No need to auto-slide if only one slide

    // Clear existing timer
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
    }

    // Start auto-slide timer
    autoSlideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % slides.length;
        scrollViewRef.current?.scrollTo({
          x: nextSlide * width,
          animated: true,
        });
        return nextSlide;
      });
    }, AUTO_SLIDE_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
      }
    };
  }, [slides.length]);

  // Don't show banner if loading, all actions completed, dismissed, or route is selected
  if (isLoadingDismissed || slides.length === 0 || isDismissed || isRouteSelected) {
    return null;
  }

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
    
    // Reset auto-slide timer when user manually scrolls
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
    }
    autoSlideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % slides.length;
        scrollViewRef.current?.scrollTo({
          x: nextSlide * width,
          animated: true,
        });
        return nextSlide;
      });
    }, AUTO_SLIDE_INTERVAL);
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 180, // Above the routes drawer
        left: 0,
        right: 0,
        zIndex: 1100, // Above locate me and zoom buttons (zIndex 1000)
      }}
    >
      <YStack gap="$2">
        {/* Carousel Container */}
        <View style={{ width: width, overflow: 'visible', paddingTop: 8 }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={width}
            decelerationRate="fast"
            style={{ width: width }}
          >
            {slides.map((slide, index) => (
              <View
                key={slide.id}
                style={{
                  width: width,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  overflow: 'visible',
                }}
              >
                <View
                  style={{
                    position: 'relative',
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
                  {/* X button - absolute positioned in top right corner */}
                  <TouchableOpacity
                    onPress={handleDismiss}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={14} color="rgba(0, 0, 0, 0.7)" />
                  </TouchableOpacity>

                  <YStack gap="$2">
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
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

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
