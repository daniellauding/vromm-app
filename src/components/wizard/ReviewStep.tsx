import React, { useCallback } from 'react';
import { View, Image, ScrollView } from 'react-native';
import { YStack, XStack, Text, Card, Chip } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { WizardRouteData } from '../RouteCreationWizard';

interface ReviewStepProps {
  data: WizardRouteData;
  onUpdate: (updates: Partial<WizardRouteData>) => void;
}

export function ReviewStep({ data, onUpdate }: ReviewStepProps) {
  const { t } = useTranslation();

  const getDrawingModeLabel = useCallback((mode: string) => {
    switch (mode) {
      case 'pin': return 'Single Location Pin';
      case 'waypoint': return 'Connected Waypoints';
      case 'pen': return 'Hand-drawn Path';
      case 'record': return 'GPS Recorded Route';
      default: return mode;
    }
  }, []);

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack padding="$4" gap="$6">
        {/* Header */}
        <YStack gap="$2">
          <Text size="lg" fontWeight="600" color="$color">
            Review your route
          </Text>
          <Text size="sm" color="$gray11">
            Check everything looks good before saving
          </Text>
        </YStack>

        {/* Route Overview */}
        <Card bordered padding="$4">
          <YStack gap="$3">
            <Text size="md" fontWeight="600" color="$color">
              Route Overview
            </Text>
            
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$gray11">Name:</Text>
                <Text fontWeight="500" color="$color" flex={1} textAlign="right">
                  {data.name || 'Untitled Route'}
                </Text>
              </XStack>
              
              <XStack justifyContent="space-between">
                <Text color="$gray11">Drawing Mode:</Text>
                <Text fontWeight="500" color="$color">
                  {getDrawingModeLabel(data.drawingMode)}
                </Text>
              </XStack>
              
              <XStack justifyContent="space-between">
                <Text color="$gray11">Waypoints:</Text>
                <Text fontWeight="500" color="$color">
                  {data.waypoints.length}
                </Text>
              </XStack>
              
              {data.routePath && (
                <XStack justifyContent="space-between">
                  <Text color="$gray11">GPS Points:</Text>
                  <Text fontWeight="500" color="$color">
                    {data.routePath.length}
                  </Text>
                </XStack>
              )}
            </YStack>

            {data.description && (
              <YStack gap="$2">
                <Text color="$gray11">Description:</Text>
                <Text color="$color" backgroundColor="$backgroundHover" padding="$2" borderRadius="$2">
                  {data.description}
                </Text>
              </YStack>
            )}
          </YStack>
        </Card>

        {/* Waypoints */}
        {data.waypoints.length > 0 && (
          <Card bordered padding="$4">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$2">
                <Feather name="map-pin" size={18} color="$blue10" />
                <Text size="md" fontWeight="600" color="$color">
                  Waypoints ({data.waypoints.length})
                </Text>
              </XStack>
              
              <YStack gap="$2" maxHeight={200} overflow="scroll">
                {data.waypoints.slice(0, 5).map((waypoint, index) => (
                  <XStack key={index} alignItems="center" gap="$3">
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: index === 0 ? '#22C55E' : index === data.waypoints.length - 1 ? '#EF4444' : '#3B82F6',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text size="xs" color="white" fontWeight="bold">
                        {index + 1}
                      </Text>
                    </View>
                    <YStack flex={1}>
                      <Text size="sm" fontWeight="500" numberOfLines={1}>
                        {waypoint.title}
                      </Text>
                      <Text size="xs" color="$gray11">
                        {waypoint.latitude.toFixed(4)}, {waypoint.longitude.toFixed(4)}
                      </Text>
                    </YStack>
                  </XStack>
                ))}
                
                {data.waypoints.length > 5 && (
                  <Text size="sm" color="$gray11" textAlign="center">
                    ... and {data.waypoints.length - 5} more waypoints
                  </Text>
                )}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Media */}
        {data.media.length > 0 && (
          <Card bordered padding="$4">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$2">
                <Feather name="image" size={18} color="$purple10" />
                <Text size="md" fontWeight="600" color="$color">
                  Media ({data.media.length})
                </Text>
              </XStack>
              
              <XStack gap="$2" flexWrap="wrap">
                {data.media.slice(0, 6).map((item, index) => (
                  <View key={item.id} style={{ width: 60, height: 60 }}>
                    {item.type === 'image' ? (
                      <Image
                        source={{ uri: item.uri }}
                        style={{ width: 60, height: 60, borderRadius: 8 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          backgroundColor: item.type === 'youtube' ? '#FF0000' : '#000',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Feather
                          name={item.type === 'youtube' ? 'youtube' : 'video'}
                          size={20}
                          color="white"
                        />
                      </View>
                    )}
                  </View>
                ))}
                
                {data.media.length > 6 && (
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      backgroundColor: '$backgroundHover',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text size="xs" color="$gray11" textAlign="center">
                      +{data.media.length - 6}{'\n'}more
                    </Text>
                  </View>
                )}
              </XStack>
              
              <YStack gap="$1">
                {data.media.filter(m => m.type === 'image').length > 0 && (
                  <Text size="xs" color="$gray11">
                    📷 {data.media.filter(m => m.type === 'image').length} photos
                  </Text>
                )}
                {data.media.filter(m => m.type === 'video').length > 0 && (
                  <Text size="xs" color="$gray11">
                    🎥 {data.media.filter(m => m.type === 'video').length} videos
                  </Text>
                )}
                {data.media.filter(m => m.type === 'youtube').length > 0 && (
                  <Text size="xs" color="$gray11">
                    📺 {data.media.filter(m => m.type === 'youtube').length} YouTube videos
                  </Text>
                )}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Exercises */}
        {data.exercises.length > 0 && (
          <Card bordered padding="$4">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$2">
                <Feather name="book-open" size={18} color="$green10" />
                <Text size="md" fontWeight="600" color="$color">
                  Exercises ({data.exercises.length})
                </Text>
              </XStack>
              
              <YStack gap="$2" maxHeight={200} overflow="scroll">
                {data.exercises.map((exercise) => (
                  <XStack key={exercise.id} alignItems="center" gap="$3">
                    <Feather name="play-circle" size={16} color="$green10" />
                    <YStack flex={1}>
                      <Text size="sm" fontWeight="500" numberOfLines={1}>
                        {exercise.title}
                      </Text>
                      <XStack gap="$2" alignItems="center">
                        <Chip size="sm" backgroundColor={exercise.source === 'learning_path' ? '$green5' : '$blue5'}>
                          <Text size="xs" color={exercise.source === 'learning_path' ? '$green11' : '$blue11'}>
                            {exercise.source === 'learning_path' ? 'Learning Path' : 'Custom'}
                          </Text>
                        </Chip>
                        {exercise.has_quiz && (
                          <Chip size="sm" backgroundColor="$purple5">
                            <Text size="xs" color="$purple11">Quiz</Text>
                          </Chip>
                        )}
                      </XStack>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Summary Stats */}
        <Card bordered padding="$4" backgroundColor="$green1" borderColor="$green8">
          <YStack gap="$3">
            <XStack alignItems="center" gap="$2">
              <Feather name="check-circle" size={18} color="$green10" />
              <Text size="md" fontWeight="600" color="$green11">
                Ready to Save!
              </Text>
            </XStack>
            
            <YStack gap="$1">
              <Text size="sm" color="$green10">
                ✅ Route created with {data.waypoints.length} waypoint{data.waypoints.length !== 1 ? 's' : ''}
              </Text>
              {data.description && (
                <Text size="sm" color="$green10">
                  ✅ Description added
                </Text>
              )}
              {data.media.length > 0 && (
                <Text size="sm" color="$green10">
                  ✅ {data.media.length} media item{data.media.length !== 1 ? 's' : ''} attached
                </Text>
              )}
              {data.exercises.length > 0 && (
                <Text size="sm" color="$green10">
                  ✅ {data.exercises.length} exercise{data.exercises.length !== 1 ? 's' : ''} included
                </Text>
              )}
            </YStack>
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
