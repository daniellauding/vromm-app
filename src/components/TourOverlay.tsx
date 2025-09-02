import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  useColorScheme,
  Platform,
  StatusBar 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTour } from '../contexts/TourContext';
import Svg, { Polygon } from 'react-native-svg';

interface ArrowProps {
  direction: 'up' | 'down' | 'left' | 'right';
  color: string;
  size?: number;
}

// Arrow component pointing to target elements
const TourArrow: React.FC<ArrowProps> = ({ direction, color, size = 20 }) => {
  const getArrowPath = () => {
    const half = size / 2;
    switch (direction) {
      case 'up':
        return `${half},0 0,${size} ${size},${size}`; // Triangle pointing up
      case 'down': 
        return `0,0 ${size},0 ${half},${size}`; // Triangle pointing down
      case 'left':
        return `0,${half} ${size},0 ${size},${size}`; // Triangle pointing left  
      case 'right':
        return `0,0 0,${size} ${size},${half}`; // Triangle pointing right
      default:
        return `0,0 ${size},0 ${half},${size}`; // Default down
    }
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon 
        points={getArrowPath()}
        fill={color}
        stroke={color}
        strokeWidth="1"
      />
    </Svg>
  );
};

interface TourTooltipProps {
  step: any;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
  currentIndex: number;
  totalSteps: number;
  targetCoords?: { x: number; y: number; width: number; height: number } | null;
}

// Main tour tooltip component with smart positioning
const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  onNext,
  onPrev, 
  onEnd,
  currentIndex,
  totalSteps,
  targetCoords
}) => {
  const colorScheme = useColorScheme();
  const screenDimensions = Dimensions.get('window');
  
  // Theme colors
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDark ? '#B0B0B0' : '#666666';
  const borderColor = '#00E6C3';
  const buttonColor = isDark ? '#333333' : '#F0F0F0';
  const buttonTextColor = isDark ? '#FFFFFF' : '#000000';
  
  // Calculate tooltip position and arrow direction
  const calculatePosition = () => {
    if (!targetCoords) {
      // Default to center if no target coords
      return {
        tooltipX: 20,
        tooltipY: screenDimensions.height * 0.4,
        tooltipWidth: screenDimensions.width - 40,
        arrowDirection: 'down' as const,
        arrowX: (screenDimensions.width - 40) / 2,
        arrowY: -10,
        showArrow: false
      };
    }

    const targetCenterX = targetCoords.x + (targetCoords.width / 2);
    const targetCenterY = targetCoords.y + (targetCoords.height / 2);
    
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
      tooltipX = Math.max(margin, Math.min(
        screenDimensions.width - tooltipWidth - margin,
        targetCenterX - tooltipWidth / 2
      ));
      tooltipY = targetCoords.y - tooltipHeight - arrowSize - 10;
      arrowX = targetCenterX - tooltipX - arrowSize / 2;
      arrowY = tooltipHeight;
      
    } else if (spaceBelow > tooltipHeight + margin) {
      // Place below target  
      arrowDirection = 'up';
      tooltipX = Math.max(margin, Math.min(
        screenDimensions.width - tooltipWidth - margin,
        targetCenterX - tooltipWidth / 2
      ));
      tooltipY = targetCoords.y + targetCoords.height + arrowSize + 10;
      arrowX = targetCenterX - tooltipX - arrowSize / 2;
      arrowY = -arrowSize;
      
    } else if (spaceLeft > tooltipWidth + margin) {
      // Place to the left
      arrowDirection = 'right';
      tooltipX = targetCoords.x - tooltipWidth - arrowSize - 10;
      tooltipY = Math.max(margin, Math.min(
        screenDimensions.height - tooltipHeight - margin,
        targetCenterY - tooltipHeight / 2
      ));
      arrowX = tooltipWidth;
      arrowY = targetCenterY - tooltipY - arrowSize / 2;
      
    } else if (spaceRight > tooltipWidth + margin) {
      // Place to the right
      arrowDirection = 'left';
      tooltipX = targetCoords.x + targetCoords.width + arrowSize + 10;
      tooltipY = Math.max(margin, Math.min(
        screenDimensions.height - tooltipHeight - margin,
        targetCenterY - tooltipHeight / 2
      ));
      arrowX = -arrowSize;
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
      showArrow: true
    };
  };

  const position = calculatePosition();

  return (
    <View style={{
      position: 'absolute',
      left: position.tooltipX,
      top: position.tooltipY,
      width: position.tooltipWidth,
      zIndex: 10000,
    }}>
      {/* Arrow pointing to target element */}
      {position.showArrow && (
        <View style={{
          position: 'absolute',
          left: position.arrowX,
          top: position.arrowY,
          zIndex: 10001,
        }}>
          <TourArrow 
            direction={position.arrowDirection} 
            color={borderColor} 
            size={20} 
          />
        </View>
      )}
      
      {/* Main tooltip content */}
      <View style={{
        backgroundColor,
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
      }}>
        {/* Content */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: borderColor,
            marginBottom: 8,
            textAlign: 'center'
          }}>
            {step.title}
          </Text>
          
          <Text style={{
            fontSize: 14,
            color: textColor,
            textAlign: 'center',
            lineHeight: 20
          }}>
            {step.content}
          </Text>
        </View>

        {/* Navigation */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <TouchableOpacity
            onPress={onPrev}
            style={{
              backgroundColor: currentIndex > 0 ? buttonColor : 'transparent',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              opacity: currentIndex > 0 ? 1 : 0.5,
            }}
            disabled={currentIndex === 0}
          >
            <Text style={{ color: buttonTextColor, fontWeight: '600' }}>
              Previous
            </Text>
          </TouchableOpacity>

          <Text style={{ color: borderColor, fontSize: 14, fontWeight: '600' }}>
            {currentIndex + 1} / {totalSteps}
          </Text>

          <TouchableOpacity
            onPress={currentIndex === totalSteps - 1 ? onEnd : onNext}
            style={{
              backgroundColor: borderColor,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#000000', fontWeight: '600' }}>
              {currentIndex === totalSteps - 1 ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Target element highlight component
const ElementHighlight: React.FC<{ coords: { x: number; y: number; width: number; height: number } }> = ({ coords }) => {
  return (
    <View style={{
      position: 'absolute',
      left: coords.x - 4,
      top: coords.y - 4,
      width: coords.width + 8,
      height: coords.height + 8,
      borderWidth: 3,
      borderColor: '#00E6C3',
      borderRadius: 8,
      backgroundColor: 'rgba(0, 230, 195, 0.1)',
      shadowColor: '#00E6C3',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 9999,
    }} />
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
    measureElement,
    updateStepCoords 
  } = useTour();
  
  const [targetCoords, setTargetCoords] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [measuring, setMeasuring] = useState(false);

  // Get current step object
  const getCurrentStepObject = () => {
    if (!isActive || typeof currentStep !== 'number' || !steps[currentStep]) return null;
    return steps[currentStep];
  };

  const step = getCurrentStepObject();

  // Measure target element when step changes
  useEffect(() => {
    const measureTarget = async () => {
      if (!step || !step.targetElement) {
        setTargetCoords(null);
        return;
      }

      setMeasuring(true);
      console.log(`🎯 [TourOverlay] Measuring target: ${step.targetElement}`);
      
      // Add small delay to let UI settle
      setTimeout(async () => {
        try {
          const coords = await measureElement(step.targetElement!);
          if (coords) {
            console.log(`🎯 [TourOverlay] Got coords for ${step.targetElement}:`, coords);
            setTargetCoords(coords);
            updateStepCoords(currentStep, coords);
          } else {
            console.log(`🎯 [TourOverlay] No coords for ${step.targetElement}`);
            setTargetCoords(null);
          }
        } catch (error) {
          console.error(`🎯 [TourOverlay] Error measuring ${step.targetElement}:`, error);
          setTargetCoords(null);
        } finally {
          setMeasuring(false);
        }
      }, 100);
    };

    measureTarget();
  }, [step, measureElement, updateStepCoords, currentStep]);

  // Don't render if tour is not active
  if (!isActive || !step) {
    return null;
  }

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      pointerEvents: 'box-none', // Allow touches to pass through to highlighted elements
    }}>
      {/* Element highlight (if target coords available) */}
      {targetCoords && (
        <ElementHighlight coords={targetCoords} />
      )}

      {/* Tour tooltip with smart positioning */}
      <TourTooltip
        step={step}
        onNext={nextStep}
        onPrev={prevStep}
        onEnd={endTour}
        currentIndex={currentStep}
        totalSteps={steps.length}
        targetCoords={targetCoords}
      />

      {/* Measuring indicator */}
      {measuring && (
        <View style={{
          position: 'absolute',
          top: 50,
          right: 20,
          backgroundColor: 'rgba(0, 230, 195, 0.8)',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
        }}>
          <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>
            📐 Measuring...
          </Text>
        </View>
      )}
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