import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, Button, Input, TextArea } from 'tamagui';
import {
  ArrowLeft,
  Save,
  Calendar,
  MapPin,
  Globe,
  Lock,
  Users,
} from '@tamagui/lucide-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { db } from '../lib/supabase';

interface CreateEventFormData {
  title: string;
  description: string;
  location: string;
  visibility: 'public' | 'private' | 'invite-only';
  eventDate: string;
}

export const CreateEventScreen: React.FC = () => {
  const [formData, setFormData] = useState<CreateEventFormData>({
    title: '',
    description: '',
    location: '',
    visibility: 'public',
    eventDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { eventId } = (route.params as { eventId?: string }) || {};

  useEffect(() => {
    if (eventId) {
      setIsEditing(true);
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      if (!eventId) return;
      
      const event = await db.events.getById(eventId);
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        visibility: event.visibility,
        eventDate: event.event_date ? event.event_date.split('T')[0] : '',
      });
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    // Validate form
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      setLoading(true);
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        visibility: formData.visibility,
        event_date: formData.eventDate ? new Date(formData.eventDate).toISOString() : undefined,
      };

      if (isEditing && eventId) {
        await db.events.update(eventId, eventData);
      } else {
        await db.events.create(eventData);
      }
      
      Alert.alert(
        'Success',
        isEditing ? 'Event updated successfully' : 'Event created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateEventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const visibilityOptions = [
    {
      value: 'public' as const,
      label: 'Public',
      description: 'Anyone can see and join',
      icon: <Globe size={16} color="#00FFBC" />,
      color: '#00FFBC',
    },
    {
      value: 'invite-only' as const,
      label: 'Invite Only',
      description: 'Only invited users can see and join',
      icon: <Users size={16} color="#F59E0B" />,
      color: '#F59E0B',
    },
    {
      value: 'private' as const,
      label: 'Private',
      description: 'Only you can see this event',
      icon: <Lock size={16} color="#EF4444" />,
      color: '#EF4444',
    },
  ];

  return (
    <YStack flex={1} backgroundColor="#0F172A">
      {/* Header */}
      <XStack
        padding={16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.1)"
        justifyContent="space-between"
        alignItems="center"
      >
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text fontSize={20} fontWeight="bold" color="$color" flex={1} textAlign="center">
          {isEditing ? 'Edit Event' : 'Create Event'}
        </Text>

        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Save size={20} color={loading ? "#6B7280" : "#00FFBC"} />
        </TouchableOpacity>
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding={16} gap={24}>
          {/* Event Title */}
          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color="$color">
              Event Title *
            </Text>
            <Input
              placeholder="Enter event title"
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              backgroundColor="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="$color"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              fontSize={16}
              padding={12}
            />
          </YStack>

          {/* Event Description */}
          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color="$color">
              Description
            </Text>
            <TextArea
              placeholder="Describe what this event is about..."
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              backgroundColor="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="$color"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              fontSize={16}
              padding={12}
              minHeight={100}
              textAlignVertical="top"
            />
          </YStack>

          {/* Location */}
          <YStack gap={8}>
            <XStack alignItems="center" gap={8}>
              <MapPin size={16} color="#00FFBC" />
              <Text fontSize={16} fontWeight="600" color="$color">
                Location
              </Text>
            </XStack>
            <Input
              placeholder="Enter event location"
              value={formData.location}
              onChangeText={(text) => updateFormData('location', text)}
              backgroundColor="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="$color"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              fontSize={16}
              padding={12}
            />
          </YStack>

          {/* Event Date */}
          <YStack gap={8}>
            <XStack alignItems="center" gap={8}>
              <Calendar size={16} color="#00FFBC" />
              <Text fontSize={16} fontWeight="600" color="$color">
                Date
              </Text>
            </XStack>
            <Input
              placeholder="YYYY-MM-DD"
              value={formData.eventDate}
              onChangeText={(text) => updateFormData('eventDate', text)}
              backgroundColor="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="$color"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              fontSize={16}
              padding={12}
            />
          </YStack>

          {/* Visibility Settings */}
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="600" color="$color">
              Event Visibility
            </Text>
            
            {visibilityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => updateFormData('visibility', option.value)}
              >
                <XStack
                  padding={16}
                  backgroundColor={
                    formData.visibility === option.value
                      ? `${option.color}20`
                      : 'rgba(255, 255, 255, 0.05)'
                  }
                  borderColor={
                    formData.visibility === option.value
                      ? option.color
                      : 'rgba(255, 255, 255, 0.1)'
                  }
                  borderWidth={1}
                  borderRadius={12}
                  alignItems="center"
                  gap={12}
                >
                  {option.icon}
                  
                  <YStack flex={1}>
                    <Text fontSize={16} fontWeight="600" color="$color">
                      {option.label}
                    </Text>
                    <Text fontSize={14} color="$gray11">
                      {option.description}
                    </Text>
                  </YStack>

                  {formData.visibility === option.value && (
                    <YStack
                      width={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor={option.color}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text fontSize={12} color="#000">
                        ✓
                      </Text>
                    </YStack>
                  )}
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>

          {/* Save Button */}
          <YStack paddingTop={24}>
            <Button
              size="lg"
              backgroundColor="#00FFBC"
              color="#000"
              fontWeight="600"
              onPress={handleSave}
              disabled={loading || !formData.title.trim()}
              opacity={loading || !formData.title.trim() ? 0.5 : 1}
              icon={<Save size={20} color="#000" />}
            >
              {loading 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Event' : 'Create Event')
              }
            </Button>
          </YStack>

          {/* Help Text */}
          <YStack
            padding={16}
            backgroundColor="rgba(0, 255, 188, 0.1)"
            borderRadius={12}
            borderWidth={1}
            borderColor="rgba(0, 255, 188, 0.2)"
          >
            <Text fontSize={14} color="#00FFBC" fontWeight="600" marginBottom={8}>
              💡 Pro Tips
            </Text>
            <Text fontSize={13} color="$gray11" lineHeight={18}>
              • Use descriptive titles to help others find your event{'\n'}
              • Include specific location details for driving events{'\n'}
              • Choose the right visibility setting for your audience{'\n'}
              • You can edit your event anytime after creation
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};