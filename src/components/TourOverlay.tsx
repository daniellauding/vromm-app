import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTour } from '../contexts/TourContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TourStep {
  id: string;
  title: string;
  content: string;
  targetScreen: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  variant?: 'compact' | 'chat' | 'tooltip';
  icon?: string;
}

export function TourOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, endTour } = useTour();
  const { language } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Load tour steps from Supabase
  useEffect(() => {
    if (isActive && steps.length === 0) {
      loadTourSteps();
    }
  }, [isActive]);

  const loadTourSteps = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'tour')
        .eq('active', true)
        .contains('platforms', ['mobile'])
        .order('order_index');

      if (error) throw error;

      if (data && data.length > 0) {
        const dbSteps: TourStep[] = data.map((item) => ({
          id: item.id,
          title: item.title?.[language] || item.title?.en || 'Tour Step',
          content: item.body?.[language] || item.body?.en || 'Tour content',
          targetScreen: item.target || 'HomeTab',
          targetElement: item.target || undefined,
          position: (item.category as any) || 'center',
          variant: 'chat',
          icon: item.icon || '🎯',
        }));
        setTourSteps(dbSteps);
      }
    } catch (error) {
      console.error('Error loading tour steps:', error);
      // Fallback to default steps
      setTourSteps(steps as TourStep[]);
    }
  };

  console.log('🎯 [TourOverlay] Render check:', { 
    isActive, 
    stepsLength: steps.length, 
    tourStepsLength: tourSteps.length,
    currentStep,
    shouldRender: isActive && (steps.length > 0 || tourSteps.length > 0)
  });

  if (!isActive || (steps.length === 0 && tourSteps.length === 0)) {
    return null;
  }

  const currentSteps = tourSteps.length > 0 ? tourSteps : (steps as TourStep[]);
  const step = currentSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === currentSteps.length - 1;

  if (!step) return null;

  // Determine bubble position
  const getBubblePosition = () => {
    const bubbleSize = { width: 280, height: expanded ? 200 : 120 };
    const margin = 20;

    switch (step.position) {
      case 'top-left':
        return { top: insets.top + margin, left: margin };
      case 'top-right':
        return { top: insets.top + margin, right: margin };
      case 'bottom-left':
        return { bottom: margin + 100, left: margin };
      case 'bottom-right':
        return { bottom: margin + 100, right: margin };
      case 'top':
        return { top: insets.top + margin, left: (SCREEN_WIDTH - bubbleSize.width) / 2 };
      case 'bottom':
        return { bottom: margin + 100, left: (SCREEN_WIDTH - bubbleSize.width) / 2 };
      default: // center
        return { 
          top: (SCREEN_HEIGHT - bubbleSize.height) / 2, 
          left: (SCREEN_WIDTH - bubbleSize.width) / 2 
        };
    }
  };

  const bubblePosition = getBubblePosition();

  return (
    <Modal visible={isActive} transparent animationType="fade">
      {/* Semi-transparent overlay - tap to close */}
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={endTour}
      >
        {/* Chat bubble */}
        <TouchableOpacity 
          style={[styles.chatBubble, bubblePosition]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()} // Prevent closing when tapping bubble
        >
          <YStack
            backgroundColor="#1A1A1A"
            borderRadius={12}
            padding="$2"
            gap="$1"
            borderWidth={1}
            borderColor="#333"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.4}
            shadowRadius={6}
            maxWidth={220}
            minWidth={180}
            position="relative"
          >
            {/* Close button */}
            <TouchableOpacity
              onPress={endTour}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#666',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Feather name="x" size={10} color="white" />
            </TouchableOpacity>
            {/* Compact content - no title, just text */}
            <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
              <Text 
                fontSize={13} 
                color="#fff" 
                lineHeight={16}
                numberOfLines={expanded ? undefined : 3}
                textAlign="left"
              >
                {step.content}
              </Text>
              {step.content.length > 60 && (
                <Text fontSize={10} color="#00E6C3" marginTop={2}>
                  {expanded ? '▲' : '▼'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Minimal navigation - just left/right arrows */}
            <XStack justifyContent="space-between" alignItems="center" marginTop="$1">
              <TouchableOpacity
                onPress={prevStep}
                disabled={isFirst}
                style={[styles.smallNavButton, { opacity: isFirst ? 0.3 : 1 }]}
              >
                <Feather name="chevron-left" size={12} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={isLast ? endTour : nextStep}
                style={[styles.smallNavButton, { backgroundColor: '#00E6C3' }]}
              >
                {isLast ? (
                  <Feather name="check" size={12} color="#000" />
                ) : (
                  <Feather name="chevron-right" size={12} color="#000" />
                )}
              </TouchableOpacity>
            </XStack>
            
            {/* Hint text */}
            <Text fontSize={9} color="#888" textAlign="center" marginTop="$1">
              Tap outside to close
            </Text>
          </YStack>

          {/* Chat bubble tail */}
          <View style={[styles.bubbleTail, getBubbleTailStyle(step.position)]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Helper function for bubble tail positioning
const getBubbleTailStyle = (position?: string) => {
  const tailSize = 8;
  
  switch (position) {
    case 'top-left':
    case 'top-right':
    case 'top':
      return {
        bottom: -tailSize,
        left: '50%',
        marginLeft: -tailSize,
        borderTopColor: '#1A1A1A',
        borderTopWidth: tailSize,
        borderLeftWidth: tailSize,
        borderRightWidth: tailSize,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
      };
    case 'bottom-left':
    case 'bottom-right':
    case 'bottom':
      return {
        top: -tailSize,
        left: '50%',
        marginLeft: -tailSize,
        borderBottomColor: '#1A1A1A',
        borderBottomWidth: tailSize,
        borderLeftWidth: tailSize,
        borderRightWidth: tailSize,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
      };
    default:
      return { display: 'none' };
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay to indicate tap-to-dismiss
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBubble: {
    position: 'absolute',
    zIndex: 10000, // Higher z-index to ensure it's above other modals
  },
  bubbleTail: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallNavButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
