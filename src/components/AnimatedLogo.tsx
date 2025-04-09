import React, { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';
import { YStack } from 'tamagui';
import { Asset } from 'expo-asset';

// Import symbol with simpler path
const symbolImage = require('../../assets/symbol.png');

// Static flag to track if the animation has run during this app session
let hasAnimationRunThisSession = false;

interface AnimatedLogoProps {
  onAnimationComplete?: () => void;
  size?: number;
}

type LetterKey = 'v' | 'r' | 'o' | 'm1' | 'm2';
const LETTERS: LetterKey[] = ['v', 'r', 'o', 'm1', 'm2'];

// Define letter image modules with simpler paths
const letterImages = {
  v: require('../../assets/v.png'),
  r: require('../../assets/r.png'),
  o: require('../../assets/o.png'),
  m1: require('../../assets/m1.png'),
  m2: require('../../assets/m2.png')
};

// Define positioning for each letter
const LETTER_POSITIONS = {
  v: 0,
  r: 30,
  o: 60,
  m1: 90,
  m2: 120
};

export function AnimatedLogo({ onAnimationComplete, size = 200 }: AnimatedLogoProps) {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasRunAnimation = useRef(false);

  // Animation values for each element
  const symbolOpacity = useRef(new Animated.Value(0)).current;
  const letterAnimations = useRef<
    Record<LetterKey, { opacity: Animated.Value; scale: Animated.Value }>
  >({
    v: {
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.2)
    },
    r: {
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.2)
    },
    o: {
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.2)
    },
    m1: {
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.2)
    },
    m2: {
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.2)
    }
  }).current;

  // Load assets
  useEffect(() => {
    async function loadAssets() {
      try {
        // Load symbol and letter images
        await Promise.all([
          Asset.fromModule(symbolImage).downloadAsync(),
          ...Object.values(letterImages).map(module => Asset.fromModule(module).downloadAsync())
        ]);
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Error loading assets:', error);
        // Even if there's an error, try to proceed with the animation
        setAssetsLoaded(true);
      }
    }
    loadAssets();

    // Cleanup function
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  // Run animation when assets are loaded
  useEffect(() => {
    if (!assetsLoaded || hasRunAnimation.current) return;

    // Create animation sequence
    const animationSequence = [
      // Symbol fade in
      Animated.timing(symbolOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }),
      // Letters sequence with stagger
      Animated.stagger(
        100,
        LETTERS.map(letter =>
          Animated.parallel([
            Animated.timing(letterAnimations[letter].opacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            }),
            Animated.timing(letterAnimations[letter].scale, {
              toValue: 1,
              duration: 350,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            })
          ])
        )
      )
    ];

    // Run the sequence
    animationRef.current = Animated.sequence(animationSequence);
    animationRef.current.start(({ finished }) => {
      if (finished) {
        // Mark as completed
        hasRunAnimation.current = true;

        // Ensure all letters end at exact values
        LETTERS.forEach(letter => {
          letterAnimations[letter].scale.setValue(1);
          letterAnimations[letter].opacity.setValue(1);
        });

        // Notify completion
        onAnimationComplete?.();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [assetsLoaded, onAnimationComplete]);

  if (!assetsLoaded) {
    return null;
  }

  const scale = size / 200; // Base size is 200

  return (
    <YStack alignItems="center" justifyContent="center">
      <View style={[styles.container, { transform: [{ scale }] }]}>
        {/* Symbol */}
        <Animated.Image
          source={symbolImage}
          style={[
            styles.symbol,
            {
              opacity: symbolOpacity
            }
          ]}
          resizeMode="contain"
        />

        {/* Letters */}
        <View style={styles.lettersContainer}>
          {LETTERS.map(letter => (
            <Animated.Image
              key={letter}
              source={letterImages[letter]}
              style={[
                styles.letter,
                letter === 'm1' ? styles.m1Letter : null,
                letter === 'm2' ? styles.m2Letter : null,
                {
                  opacity: letterAnimations[letter].opacity,
                  transform: [{ scale: letterAnimations[letter].scale }],
                  left: LETTER_POSITIONS[letter]
                }
              ]}
              resizeMode="contain"
            />
          ))}
        </View>
      </View>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center'
  },
  symbol: {
    width: 100,
    height: 100,
    position: 'absolute'
  },
  lettersContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 10, // Adjusted for better centering
    height: 40
  },
  letter: {
    width: 28, // Default letter width
    height: 36, // Default letter height
    position: 'absolute'
  },
  m1Letter: {
    width: 37,
    height: 47,
    bottom: -2
  },
  m2Letter: {
    width: 37,
    height: 47,
    bottom: -2,
    marginLeft: 10,
    transform: [{ scaleX: 1 }] // Ensure exact same width as m1
  }
});
