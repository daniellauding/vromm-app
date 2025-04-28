import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';

// Define Step type
interface Step {
  id: number;
  title: { en: string; sv: string };
  subtext: { en: string; sv: string };
  exercises: string[];
  level?: string;
  tag?: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: {
      en: 'Driving Position',
      sv: 'Körställning'
    },
    subtext: {
      en: 'Description coming soon...',
      sv: 'Beskrivning kommer snart...'
    },
    exercises: ['Basic Seating', 'Mirror Adjustment'],
    level: 'Beginner',
  },
  {
    id: 2,
    title: { en: 'Initial Maneuvering', sv: 'Inledande manövrering' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Starting the Engine', 'Gentle Acceleration'],
    level: 'Beginner',
  },
  {
    id: 3,
    title: { en: 'Increasing and Decreasing Speed', sv: 'Öka och minska hastighet' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Smooth Acceleration', 'Gradual Braking'],
    level: 'Beginner',
    tag: 'Safety',
  },
  {
    id: 4,
    title: { en: 'Maneuvering on an Incline', sv: 'Manövrering i lutning' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Hill Starts', 'Controlled Descents'],
    level: 'Intermediate',
  },
  {
    id: 5,
    title: { en: 'General Maneuvering', sv: 'Allmän manövrering' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Lane Changing', 'Reverse Parking'],
    level: 'Intermediate',
  },
  {
    id: 6,
    title: { en: 'Safety Checks and Functions', sv: 'Säkerhetskontroller och funktioner' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Pre-Drive Inspection', 'Emergency Procedures'],
    tag: 'Safety',
  },
  {
    id: 7,
    title: { en: 'Coordination and Braking', sv: 'Koordination och bromsning' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Emergency Stops', 'Feathering the Brake'],
    level: 'Intermediate',
    tag: 'Safety',
  },
  {
    id: 8,
    title: { en: 'Driving in a Small Town', sv: 'Körning i småstad' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Navigating Roundabouts', 'Residential Area Driving'],
    tag: 'Practical',
  },
  {
    id: 9,
    title: { en: 'Driving on a Small Country Road', sv: 'Körning på landsväg' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Narrow Road Navigation', 'Passing Oncoming Traffic'],
    level: 'Advanced',
    tag: 'Practical',
  },
  {
    id: 10,
    title: { en: 'Driving in the City', sv: 'Körning i stad' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Heavy Traffic Management', 'Multi-Lane Navigation'],
    level: 'Advanced',
    tag: 'Practical',
  },
  {
    id: 11,
    title: { en: 'Driving on a Main Road', sv: 'Körning på huvudväg' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Merging', 'Lane Discipline'],
    level: 'Advanced',
  },
  {
    id: 12,
    title: { en: 'Driving on a Motorway and Expressway', sv: 'Körning på motorväg och motortrafikled' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['High-Speed Control', 'Safe Overtaking'],
    level: 'Advanced',
  },
  {
    id: 13,
    title: { en: 'Night Driving', sv: 'Nattkörning' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Headlight Management', 'Reduced Visibility Techniques'],
    tag: 'Special Conditions',
  },
  {
    id: 14,
    title: { en: 'Slippery Road Conditions', sv: 'Halka och svåra vägförhållanden' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Snow Driving', 'Wet Road Handling'],
    tag: 'Special Conditions',
  },
  {
    id: 15,
    title: { en: 'Preparation for the Driving Test', sv: 'Förberedelse för uppkörning' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Mock Test', 'Common Mistake Review'],
    tag: 'Test Preparation',
  },
  {
    id: 16,
    title: { en: 'Driving Test', sv: 'Uppkörning' },
    subtext: { en: 'Description coming soon...', sv: 'Beskrivning kommer snart...' },
    exercises: ['Test Day Preparation', 'Test Route Familiarity'],
    tag: 'Test Preparation',
  },
];

// For demo, English only. Replace with language context if needed.
const lang = 'en';

export function ProgressScreen() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [detailStep, setDetailStep] = useState<Step | null>(null);

  const handleStepPress = (step: Step) => {
    setDetailStep(step);
    setShowDetail(true);
  };

  if (showDetail && detailStep) {
    return (
      <YStack flex={1} backgroundColor="$background" padding={24}>
        <TouchableOpacity onPress={() => setShowDetail(false)} style={{ marginBottom: 24 }}>
          <Feather name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text fontSize={28} fontWeight="bold" color="$color" marginBottom={8}>
          {detailStep.title[lang]}
        </Text>
        <Text color="$gray11" marginBottom={16}>
          {detailStep.subtext[lang]}
        </Text>
        <Text fontWeight="600" marginBottom={8}>Exercises / Tips:</Text>
        <YStack gap={8}>
          {detailStep.exercises.map((ex: string, i: number) => (
            <XStack key={i} alignItems="center" gap={8}>
              <Feather name="check-circle" size={18} color="#00E6C3" />
              <Text color="$color">{ex}</Text>
            </XStack>
          ))}
        </YStack>
        {detailStep.level && (
          <Text marginTop={16} color="$blue10">Level: {detailStep.level}</Text>
        )}
        {detailStep.tag && (
          <Text color="$blue10">Tag: {detailStep.tag}</Text>
        )}
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding={0}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {steps.map((step, idx) => {
          const isActive = activeStep === step.id;
          const isFinished = step.id < activeStep;
          return (
            <TouchableOpacity
              key={step.id}
              onPress={() => { setActiveStep(step.id); handleStepPress(step); }}
              activeOpacity={0.8}
              style={{ marginBottom: 20 }}
            >
              <Card
                backgroundColor={isActive ? "$blue5" : "$backgroundStrong"}
                padding={20}
                borderRadius={20}
                elevate
                style={{ opacity: isFinished ? 0.6 : 1 }}
              >
                <XStack alignItems="center" gap={16}>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: isActive ? '#00E6C3' : '#222', alignItems: 'center', justifyContent: 'center' }}>
                    {isFinished ? (
                      <Feather name="check" size={32} color="#fff" />
                    ) : (
                      <View style={{ position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="circle" size={40} color={isActive ? '#fff' : '#444'} />
                        {isActive && (
                          <View style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderColor: '#00E6C3', borderRightColor: 'transparent', transform: [{ rotate: '45deg' }] }} />
                        )}
                      </View>
                    )}
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={20} fontWeight={isActive ? 'bold' : '600'} color={isActive ? '$color' : '$gray11'}>
                      {step.id}. {step.title[lang]}
                    </Text>
                    <Text color="$gray11" fontSize={14} marginTop={2}>
                      {step.subtext[lang]}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </YStack>
  );
} 