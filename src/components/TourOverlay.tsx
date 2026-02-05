import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, useColorScheme, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTour } from '../contexts/TourContext';
import { useTranslation } from '../contexts/TranslationContext';

interface TourTooltipProps {
  step: any;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
  onEnd: () => void;
  onDismiss: () => void; // Close temporarily - can see again
  onSkip: () => void; // Close permanently - never see again
  currentIndex: number;
  totalSteps: number;
  targetCoords?: { x: number; y: number; width: number; height: number } | null;
  isNavigating?: boolean;
}

// Main tour tooltip component with smart positioning
const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  onNext,
  onPrev,
  onEnd,
  onDismiss,
  onSkip,
  currentIndex,
  totalSteps,
  targetCoords,
  isNavigating = false,
}) => {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const screenDimensions = Dimensions.get('window');
  const [animValue] = useState(new Animated.Value(0));
  const [isLoading, setIsLoading] = useState(false);

  // Handle next with loading state
  const handleNext = async () => {
    if (isLoading || isNavigating) return;
    setIsLoading(true);
    try {
      await onNext();
    } finally {
      setIsLoading(false);
    }
  };

  // Theme colors - flatter design
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#B0B0B0' : '#666666';
  const accentColor = '#00E6C3';
  const buttonColor = isDark ? '#333333' : '#F0F0F0';
  const buttonTextColor = isDark ? '#FFFFFF' : '#000000';

  // Animate in when tooltip appears
  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [currentIndex, animValue]);

  // Calculate tooltip position and arrow direction
  const calculatePosition = React.useCallback(() => {
    if (!targetCoords) {
      // Default to center if no target coords
      return {
        tooltipX: 20,
        tooltipY: screenDimensions.height * 0.4,
        tooltipWidth: screenDimensions.width - 40,
        arrowDirection: 'down' as const,
        arrowX: (screenDimensions.width - 40) / 2,
        arrowY: -10,
        showArrow: false,
      };
    }

    const targetCenterX = targetCoords.x + targetCoords.width / 2;
    const targetCenterY = targetCoords.y + targetCoords.height / 2;

    const tooltipWidth = Math.min(screenDimensions.width - 40, 320);
    const tooltipHeight = 200; // Estimate
    const arrowSize = 20;
    const margin = 20;

    // Determine best position based on available space
    let tooltipX: number;
    let tooltipY: number;
    let arrowDirection: 'up' | 'down' | 'left' | 'right';
    let arrowX: number;
    let arrowY: number;

    // Check if we can place tooltip above target
    const spaceAbove = targetCoords.y;
    const spaceBelow = screenDimensions.height - (targetCoords.y + targetCoords.height);
    const spaceLeft = targetCoords.x;
    const spaceRight = screenDimensions.width - (targetCoords.x + targetCoords.width);

    if (spaceAbove > tooltipHeight + margin && spaceAbove > spaceBelow) {
      // Place above target
      arrowDirection = 'down';
      tooltipX = Math.max(
        margin,
        Math.min(screenDimensions.width - tooltipWidth - margin, targetCenterX - tooltipWidth / 2),
      );
      tooltipY = targetCoords.y - tooltipHeight - 5; // Closer to target
      arrowX = targetCenterX - tooltipX - arrowSize / 2;
      arrowY = tooltipHeight - 2; // Arrow comes out of tooltip bottom
    } else if (spaceBelow > tooltipHeight + margin) {
      // Place below target
      arrowDirection = 'up';
      tooltipX = Math.max(
        margin,
        Math.min(screenDimensions.width - tooltipWidth - margin, targetCenterX - tooltipWidth / 2),
      );
      tooltipY = targetCoords.y + targetCoords.height + 5; // Closer to target
      arrowX = targetCenterX - tooltipX - arrowSize / 2;
      arrowY = -2; // Arrow comes out of tooltip top
    } else if (spaceLeft > tooltipWidth + margin) {
      // Place to the left
      arrowDirection = 'right';
      tooltipX = targetCoords.x - tooltipWidth - 5; // Closer to target
      tooltipY = Math.max(
        margin,
        Math.min(
          screenDimensions.height - tooltipHeight - margin,
          targetCenterY - tooltipHeight / 2,
        ),
      );
      arrowX = tooltipWidth - 2; // Arrow comes out of tooltip right edge
      arrowY = targetCenterY - tooltipY - arrowSize / 2;
    } else if (spaceRight > tooltipWidth + margin) {
      // Place to the right
      arrowDirection = 'left';
      tooltipX = targetCoords.x + targetCoords.width + 5; // Closer to target
      tooltipY = Math.max(
        margin,
        Math.min(
          screenDimensions.height - tooltipHeight - margin,
          targetCenterY - tooltipHeight / 2,
        ),
      );
      arrowX = -2; // Arrow comes out of tooltip left edge
      arrowY = targetCenterY - tooltipY - arrowSize / 2;
    } else {
      // Not enough space anywhere - place in center
      arrowDirection = 'down';
      tooltipX = margin;
      tooltipY = screenDimensions.height * 0.3;
      arrowX = tooltipWidth / 2;
      arrowY = -arrowSize;
    }

    // Clamp arrow positions to tooltip bounds
    arrowX = Math.max(10, Math.min(arrowX, tooltipWidth - 30));
    arrowY = Math.max(-arrowSize, Math.min(arrowY, tooltipHeight));

    return {
      tooltipX: Math.max(0, Math.min(tooltipX, screenDimensions.width - tooltipWidth)),
      tooltipY: Math.max(0, Math.min(tooltipY, screenDimensions.height - tooltipHeight)),
      tooltipWidth,
      arrowDirection,
      arrowX,
      arrowY,
      showArrow: true,
    };
  }, [targetCoords, screenDimensions]);

  const position = calculatePosition();

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: position.tooltipX,
        top: position.tooltipY,
        width: position.tooltipWidth,
        zIndex: 100000, // ✅ Even higher z-index for tooltip
        elevation: 100000, // ✅ Android elevation
        transform: [
          { scale: animValue },
          {
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
        opacity: animValue,
      }}
    >
      {/* Arrow removed - works better without */}

      {/* Main tooltip content - flatter design */}
      <View
        style={{
          backgroundColor,
          borderRadius: 16,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 16,
        }}
      >
        {/* Close button - top right corner (dismiss temporarily) */}
        <TouchableOpacity
          onPress={onDismiss}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(128, 128, 128, 0.3)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={16} color={secondaryTextColor} />
        </TouchableOpacity>

        {/* Content */}
        <View style={{ marginBottom: 20, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: accentColor,
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            {step.title}
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: textColor,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {step.content}
          </Text>
        </View>

        {/* Navigation - flatter design with arrow icons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={onPrev}
            style={{
              backgroundColor: currentIndex > 0 ? buttonColor : 'transparent',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 20,
              opacity: currentIndex > 0 ? 1 : 0.3,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            disabled={currentIndex === 0}
          >
            <Feather
              name="chevron-left"
              size={16}
              color={currentIndex > 0 ? buttonTextColor : secondaryTextColor}
            />
            <Text
              style={{
                color: currentIndex > 0 ? buttonTextColor : secondaryTextColor,
                fontWeight: '600',
              }}
            >
              {t('tour.navigation.previous') || 'Previous'}
            </Text>
          </TouchableOpacity>

          <Text style={{ color: accentColor, fontSize: 14, fontWeight: '600' }}>
            {currentIndex + 1} / {totalSteps}
          </Text>

          <TouchableOpacity
            onPress={currentIndex === totalSteps - 1 ? onEnd : handleNext}
            disabled={isLoading || isNavigating}
            style={{
              backgroundColor: isLoading || isNavigating ? '#99E6D9' : accentColor,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              opacity: isLoading || isNavigating ? 0.7 : 1,
            }}
          >
            <Text style={{ color: '#000000', fontWeight: '600' }}>
              {isLoading || isNavigating
                ? '...'
                : currentIndex === totalSteps - 1
                  ? t('tour.navigation.finish') || 'Finish'
                  : t('tour.navigation.next') || 'Next'}
            </Text>
            <Feather
              name={currentIndex === totalSteps - 1 ? 'check' : 'chevron-right'}
              size={16}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        {/* Skip tour permanently link */}
        <TouchableOpacity
          onPress={onSkip}
          style={{
            marginTop: 12,
            paddingVertical: 8,
            alignItems: 'center',
          }}
          hitSlop={{ top: 8, bottom: 8, left: 20, right: 20 }}
        >
          <Text
            style={{
              fontSize: 12,
              color: secondaryTextColor,
              textDecorationLine: 'underline',
            }}
          >
            {t('tour.navigation.skipTour') || 'Visa inte denna guide igen'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Target element highlight component - simplified
const ElementHighlight: React.FC<{
  coords: { x: number; y: number; width: number; height: number };
}> = ({ coords }) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(pulse);
    loop.start();

    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: coords.x,
        top: coords.y,
        width: coords.width,
        height: coords.height,
        borderWidth: 3,
        borderColor: '#00E6C3',
        borderRadius: 8,
        backgroundColor: 'rgba(0, 230, 195, 0.15)',
        shadowColor: '#00E6C3',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 99997, // ✅ Very high elevation for Android
        zIndex: 99997, // ✅ Very high z-index
        transform: [{ scale: pulseAnim }],
      }}
    />
  );
};

// Main tour overlay component
export const TourOverlay: React.FC = () => {
  const {
    isActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    endTour,
    dismissTour,
    skipTour,
    measureElement,
    updateStepCoords,
  } = useTour();

  const [targetCoords, setTargetCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Wrap nextStep to track navigation state
  const handleNextStep = async () => {
    setIsNavigating(true);
    try {
      await nextStep();
    } finally {
      // Small delay to let UI settle after navigation
      setTimeout(() => setIsNavigating(false), 100);
    }
  };

  // Tour overlay active tracking

  // Get current step object
  const getCurrentStepObject = React.useCallback(() => {
    if (!isActive || typeof currentStep !== 'number' || !steps[currentStep]) return null;
    return steps[currentStep];
  }, [isActive, currentStep, steps]);

  const step = getCurrentStepObject();

  // Measure target element when step changes
  useEffect(() => {
    const measureTarget = async () => {
      if (!step || !step.targetElement) {
        setTargetCoords(null);
        return;
      }

      setMeasuring(true);

      // Add delay to let UI settle
      setTimeout(async () => {
        try {
          const coords = await measureElement(step.targetElement!);
          if (coords) {
            setTargetCoords(coords);
            updateStepCoords(currentStep, coords);
          } else {
            // Retry once for elements that render slowly
            setTimeout(async () => {
              const retryCoords = await measureElement(step.targetElement!);
              if (retryCoords) {
                setTargetCoords(retryCoords);
                updateStepCoords(currentStep, retryCoords);
              } else {
                // Don't auto-advance - let user manually advance or close tour
                setTargetCoords(null);
              }
            }, 500);
          }
        } catch (error) {
          console.error(`Error measuring ${step.targetElement}:`, error);
          setTargetCoords(null);
        } finally {
          setMeasuring(false);
        }
      }, 300);
    };

    measureTarget();
  }, [step, measureElement, updateStepCoords, currentStep, nextStep]);

  // Don't render if tour is not active or if target element is missing
  if (!isActive || !step) {
    return null;
  }

  // Show tour even if target element not found - user can still read content and navigate

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999, // ✅ Maximum z-index to ensure always above everything
        elevation: 99999, // ✅ Android elevation
      }}
      pointerEvents="box-none" // ✅ Allow touches to pass through to content below (enables scrolling)
    >
      {/* Background overlay - visual only, no touch blocking */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
        pointerEvents="none" // ✅ Don't capture any touches - purely visual
      />

      {/* Element highlight (if target coords available) - renders above background */}
      {targetCoords && (
        <View
          style={{
            position: 'absolute',
            left: targetCoords.x - 2,
            top: targetCoords.y - 2,
            width: targetCoords.width + 4,
            height: targetCoords.height + 4,
            zIndex: 99998, // ✅ High z-index for element highlight
            elevation: 99998, // ✅ Android elevation
            pointerEvents: 'box-none', // Allow touches to pass through to actual element
          }}
        >
          <ElementHighlight
            coords={{ x: 2, y: 2, width: targetCoords.width, height: targetCoords.height }}
          />
        </View>
      )}

      {/* Tour tooltip with smart positioning */}
      <TourTooltip
        step={step}
        onNext={handleNextStep}
        onPrev={prevStep}
        onEnd={endTour}
        onDismiss={dismissTour}
        onSkip={skipTour}
        currentIndex={currentStep}
        totalSteps={steps.length}
        targetCoords={targetCoords}
        isNavigating={isNavigating}
      />

      {/* Measuring indicator */}
      {/* Measuring text removed - cleaner UI */}
    </View>
  );
};

// Hook to register elements for tour targeting
export const useTourTarget = (targetId: string) => {
  const { registerElement } = useTour();
  const ref = React.useRef(null);

  useEffect(() => {
    if (ref.current && targetId) {
      registerElement(targetId, ref);
    }
  }, [registerElement, targetId]);

  return ref;
};
