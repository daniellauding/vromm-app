import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, TextArea, Button, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { FormField } from '../FormField';
import { WizardRouteData } from '../RouteWizardSheet';
import { ExerciseSelector, RouteExercise } from '../ExerciseSelector';
import * as mediaUtils from '../../utils/mediaUtils';

interface BasicInfoStepProps {
  data: WizardRouteData;
  onUpdate: (updates: Partial<WizardRouteData>) => void;
  onSave: (isDraft: boolean) => void;
  onCancel: () => void;
  onMaximize?: () => void;
}

export function BasicInfoStep({ data, onUpdate, onSave, onCancel, onMaximize }: BasicInfoStepProps) {
  const { t } = useTranslation();
  
  // Expandable sections
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [showExerciseSection, setShowExerciseSection] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  const handleNameChange = useCallback((name: string) => {
    onUpdate({ name });
  }, [onUpdate]);

  const handleDescriptionChange = useCallback((description: string) => {
    onUpdate({ description });
  }, [onUpdate]);

  // Quick media handlers
  const handleQuickPhoto = useCallback(async () => {
    try {
      const newMedia = await mediaUtils.takePhoto();
      if (newMedia) {
        onUpdate({
          media: [...data.media, {
            id: Date.now().toString(),
            type: newMedia.type,
            uri: newMedia.uri,
            description: newMedia.description,
          }],
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  }, [data.media, onUpdate]);

  const handleRemoveMedia = useCallback((index: number) => {
    const newMedia = data.media.filter((_, i) => i !== index);
    onUpdate({ media: newMedia });
  }, [data.media, onUpdate]);

  const handleExercisesChange = useCallback((exercises: RouteExercise[]) => {
    onUpdate({ exercises });
  }, [onUpdate]);

  return (
    <YStack flex={1} padding="$3" gap="$4">
      {/* Route Name */}
      <YStack gap="$2">
        <Text size="sm" fontWeight="500" color="$color">
          Route Name *
        </Text>
        <FormField
          value={data.name}
          onChangeText={handleNameChange}
          placeholder="Enter route name"
          autoCapitalize="words"
          maxLength={100}
        />
      </YStack>

      {/* Route Description */}
      <YStack gap="$2">
        <Text size="sm" fontWeight="500" color="$color">
          Description (optional)
        </Text>
        <TextArea
          value={data.description}
          onChangeText={handleDescriptionChange}
          placeholder="Describe your route..."
          numberOfLines={3}
          maxLength={300}
          backgroundColor="$backgroundHover"
          borderColor="$borderColor"
        />
      </YStack>

      {/* Optional: Quick Media (Accordion) */}
      <Card bordered>
        <TouchableOpacity
          onPress={() => setShowMediaSection(!showMediaSection)}
          style={{ padding: 12 }}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$2">
              <Feather name="camera" size={16} color="$blue10" />
              <Text size="sm" fontWeight="500" color="$color">
                Add Photos {data.media.length > 0 && `(${data.media.length})`}
              </Text>
            </XStack>
            <Feather 
              name={showMediaSection ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="$gray11" 
            />
          </XStack>
        </TouchableOpacity>
        
        {showMediaSection && (
          <YStack padding="$3" paddingTop={0} gap="$3">
            <XStack gap="$2">
              <Button
                flex={1}
                onPress={handleQuickPhoto}
                variant="secondary"
                size="sm"
                backgroundColor="$green5"
              >
                <XStack gap="$1" alignItems="center">
                  <Feather name="camera" size={14} color="$green11" />
                  <Text fontSize="$2" color="$green11">Photo</Text>
                </XStack>
              </Button>
              
              <Button
                flex={1}
                onPress={async () => {
                  try {
                    const newMedia = await mediaUtils.pickMediaFromLibrary(false);
                    if (newMedia && newMedia.length > 0) {
                      onUpdate({
                        media: [...data.media, ...newMedia.map(m => ({
                          id: Date.now().toString() + Math.random(),
                          type: m.type,
                          uri: m.uri,
                          description: m.description,
                        }))],
                      });
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to pick media');
                  }
                }}
                variant="secondary"
                size="sm"
                backgroundColor="$blue5"
              >
                <XStack gap="$1" alignItems="center">
                  <Feather name="image" size={14} color="$blue11" />
                  <Text fontSize="$2" color="$blue11">Gallery</Text>
                </XStack>
              </Button>
            </XStack>
            
            {data.media.length > 0 && (
              <YStack gap="$1">
                {data.media.map((item, index) => (
                  <XStack key={item.id} alignItems="center" justifyContent="space-between">
                    <Text size="xs" color="$gray11" flex={1} numberOfLines={1}>
                      📷 {item.uri.split('/').pop()}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveMedia(index)}>
                      <Feather name="x" size={14} color="$red10" />
                    </TouchableOpacity>
                  </XStack>
                ))}
              </YStack>
            )}
          </YStack>
        )}
      </Card>

      {/* Optional: Quick Exercises (Accordion) */}
      <Card bordered>
        <TouchableOpacity
          onPress={() => setShowExerciseSection(!showExerciseSection)}
          style={{ padding: 12 }}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$2">
              <Feather name="book-open" size={16} color="$green10" />
              <Text size="sm" fontWeight="500" color="$color">
                Add Exercises {data.exercises.length > 0 && `(${data.exercises.length})`}
              </Text>
            </XStack>
            <Feather 
              name={showExerciseSection ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="$gray11" 
            />
          </XStack>
        </TouchableOpacity>
        
        {showExerciseSection && (
          <YStack padding="$3" paddingTop={0} gap="$3">
            <Button
              onPress={() => setShowExerciseSelector(true)}
              variant="secondary"
              size="sm"
              backgroundColor="$green5"
            >
              <XStack gap="$2" alignItems="center">
                <Feather name="plus" size={14} color="$green11" />
                <Text fontSize="$2" color="$green11">
                  Select from Learning Paths
                </Text>
              </XStack>
            </Button>
            
            {data.exercises.length > 0 && (
              <YStack gap="$1">
                {data.exercises.slice(0, 3).map((exercise) => (
                  <XStack key={exercise.id} alignItems="center" justifyContent="space-between">
                    <Text size="xs" color="$gray11" flex={1} numberOfLines={1}>
                      📚 {exercise.title}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        const newExercises = data.exercises.filter(ex => ex.id !== exercise.id);
                        onUpdate({ exercises: newExercises });
                      }}
                    >
                      <Feather name="x" size={14} color="$red10" />
                    </TouchableOpacity>
                  </XStack>
                ))}
                {data.exercises.length > 3 && (
                  <Text size="xs" color="$gray10" textAlign="center">
                    +{data.exercises.length - 3} more exercises
                  </Text>
                )}
              </YStack>
            )}
          </YStack>
        )}
      </Card>

      {/* Compact Summary */}
      <YStack gap="$2" backgroundColor="$backgroundHover" padding="$2" borderRadius="$2">
        <Text size="xs" color="$gray11">
          📍 {data.waypoints.length} waypoint{data.waypoints.length !== 1 ? 's' : ''} • 
          🎨 {data.drawingMode === 'pin' ? 'Pin' : 
               data.drawingMode === 'waypoint' ? 'Waypoints' :
               data.drawingMode === 'pen' ? 'Drawn' : 'Recorded'}
          {data.media.length > 0 && ` • 📷 ${data.media.length} photo${data.media.length !== 1 ? 's' : ''}`}
          {data.exercises.length > 0 && ` • 📚 ${data.exercises.length} exercise${data.exercises.length !== 1 ? 's' : ''}`}
        </Text>
      </YStack>

      {/* Save Actions */}
      <YStack gap="$3" marginTop="$4">
        <YStack gap="$2">
          <Button
            onPress={() => onSave(false)}
            disabled={!data.name.trim()}
            size="lg"
            backgroundColor="#69e3c4"
            opacity={data.name.trim() ? 1 : 0.5}
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="share-2" size={18} color="white" />
              <Text color="white" fontWeight="600" fontSize="$4">
                Share Route
              </Text>
            </XStack>
          </Button>
          
          <XStack gap="$2">
            <Button
              flex={1}
              onPress={() => onSave(true)}
              disabled={!data.name.trim()}
              variant="secondary"
              size="md"
              backgroundColor="$gray5"
            >
              <XStack gap="$1" alignItems="center">
                <Feather name="save" size={16} color="$gray11" />
                <Text color="$gray11" fontSize="$3">Save Draft</Text>
              </XStack>
            </Button>
            
            <Button
              flex={1}
              onPress={onCancel}
              variant="secondary"
              size="md"
              backgroundColor="$red5"
            >
              <XStack gap="$1" alignItems="center">
                <Feather name="x" size={16} color="$red10" />
                <Text color="$red10" fontSize="$3">Cancel</Text>
              </XStack>
            </Button>
          </XStack>
        </YStack>
        
        {/* Advanced editing option */}
        {onMaximize && (
          <Button
            onPress={onMaximize}
            variant="secondary"
            size="md"
            backgroundColor="$backgroundHover"
            borderColor="$borderColor"
            borderWidth={1}
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="maximize-2" size={16} color="$gray11" />
              <Text color="$gray11" fontSize="$3">
                Open Full Editor
              </Text>
            </XStack>
          </Button>
        )}
        
        {/* Hint about advanced editing */}
        <Text size="xs" color="$gray10" textAlign="center">
          💡 Quick save here, or open full editor for exercises, advanced settings & more
        </Text>
      </YStack>

      {/* Exercise Selector Modal */}
      <ExerciseSelector
        visible={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        selectedExercises={data.exercises as RouteExercise[]}
        onExercisesChange={handleExercisesChange}
      />
    </YStack>
  );
}
