import React, { useState } from 'react';
import { YStack, XStack } from 'tamagui';
import { Button } from './Button';
import { Text } from './Text';
import { FormField } from './FormField';
import { Feather } from '@expo/vector-icons';
import { useColorScheme, Alert, Image, Modal, TouchableOpacity, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Buffer } from 'buffer';

type AttachmentType = 'youtube' | 'image' | 'file';

type TodoFormData = {
  title: string;
  description?: string;
  due_date?: string;
  metadata: {
    routeId?: string;
    routeName?: string;
    subtasks?: { id: string; title: string; is_completed: boolean }[];
    attachments?: Array<{
      type: AttachmentType;
      url: string;
      title?: string;
      description?: string;
    }>;
    study_materials?: string[];
  };
};

type TodoFormProps = {
  initialData?: TodoFormData;
  onSubmit: (data: TodoFormData) => void;
  onCancel: () => void;
};

export function TodoForm({ initialData, onSubmit, onCancel }: TodoFormProps) {
  const [formData, setFormData] = useState<TodoFormData>(initialData || {
    title: '',
    description: '',
    metadata: {
      subtasks: [],
      attachments: [],
      study_materials: []
    }
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');
  const [showYoutubeForm, setShowYoutubeForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const screenWidth = Dimensions.get('window').width;

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;

    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        subtasks: [
          ...(prev.metadata.subtasks || []),
          {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: newSubtask.trim(),
            is_completed: false
          }
        ]
      }
    }));
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        subtasks: prev.metadata.subtasks?.filter(task => task.id !== id) || []
      }
    }));
  };

  const handleImageUpload = async (uri: string) => {
    try {
      // Show loading state
      Alert.alert('Uploading...', 'Please wait while we upload your image');

      // Fetch the image
      const response = await fetch(uri);
      const blob = await response.blob();

      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });

      // Generate unique filename
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `todo-attachments/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('todo-attachments')
        .upload(path, Buffer.from(base64, 'base64'), {
          contentType: `image/${ext}`,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('todo-attachments')
        .getPublicUrl(path);

      // Update form data with new attachment
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          attachments: [
            ...(prev.metadata.attachments || []),
            {
              type: 'image',
              url: publicUrl,
              title: `Image ${(prev.metadata.attachments?.length || 0) + 1}`,
              description: ''
            }
          ]
        }
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        'Upload Failed',
        'There was an error uploading your image. Please try again.'
      );
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await handleImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(
        'Error',
        'Failed to take photo. Please try again.'
      );
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant media library permissions to choose photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets.length > 0) {
        // Upload images sequentially to prevent memory issues
        for (const asset of result.assets) {
          await handleImageUpload(asset.uri);
        }
      }
    } catch (error) {
      console.error('Error choosing photo:', error);
      Alert.alert(
        'Error',
        'Failed to select photo(s). Please try again.'
      );
    }
  };

  const handleAddYoutube = () => {
    if (!newYoutubeUrl.trim()) return;

    if (!newYoutubeUrl.includes('youtube.com') && !newYoutubeUrl.includes('youtu.be')) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        attachments: [
          ...(prev.metadata.attachments || []),
          {
            type: 'youtube',
            url: newYoutubeUrl.trim(),
            title: `Video ${(prev.metadata.attachments?.filter(a => a.type === 'youtube').length || 0) + 1}`,
            description: ''
          }
        ]
      }
    }));
    setNewYoutubeUrl('');
    setShowYoutubeForm(false);
  };

  const handleRemoveAttachment = (url: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        attachments: prev.metadata.attachments?.filter(a => a.url !== url) || []
      }
    }));
  };

  const handleAddStudyMaterial = () => {
    if (!newYoutubeUrl.trim()) return;

    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        study_materials: [
          ...(prev.metadata.study_materials || []),
          newYoutubeUrl.trim()
        ]
      }
    }));
    setNewYoutubeUrl('');
  };

  const handleRemoveStudyMaterial = (material: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        study_materials: prev.metadata.study_materials?.filter(m => m !== material) || []
      }
    }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <YStack gap="$4" padding="$4">
      <FormField
        label="Title"
        value={formData.title}
        onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
        placeholder="Task title"
      />

      <FormField
        label="Description"
        value={formData.description}
        onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
        placeholder="Task description"
        multiline
        numberOfLines={3}
      />

      <FormField
        label="Due Date"
        value={formData.due_date}
        onChangeText={(text) => setFormData(prev => ({ ...prev, due_date: text }))}
        placeholder="YYYY-MM-DD"
      />

      {/* Subtasks Section */}
      <YStack gap="$3">
        <Text size="sm" weight="medium">Subtasks</Text>
        
        <XStack gap="$2">
          <FormField
            flex={1}
            value={newSubtask}
            onChangeText={setNewSubtask}
            placeholder="Add a subtask"
            onSubmitEditing={handleAddSubtask}
          />
          <Button
            size="sm"
            onPress={handleAddSubtask}
            disabled={!newSubtask.trim()}
          >
            Add
          </Button>
        </XStack>

        <YStack gap="$2">
          {formData.metadata.subtasks?.map((subtask) => (
            <XStack key={subtask.id} gap="$2" alignItems="center">
              <Text size="sm" flex={1}>{subtask.title}</Text>
              <Button
                size="sm"
                padding="$2"
                backgroundColor="transparent"
                onPress={() => handleRemoveSubtask(subtask.id)}
              >
                <Feather name="x" size={18} color={iconColor} />
              </Button>
            </XStack>
          ))}
        </YStack>
      </YStack>

      {/* Attachments Section */}
      <YStack gap="$3">
        <Text size="sm" weight="medium">Attachments</Text>
        
        <XStack gap="$2">
          <Button
            flex={1}
            size="sm"
            onPress={handleTakePhoto}
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="camera" size={16} color="white" />
              <Text color="white">Take Photo</Text>
            </XStack>
          </Button>
          <Button
            flex={1}
            size="sm"
            onPress={handleChoosePhoto}
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="image" size={16} color="white" />
              <Text color="white">Upload</Text>
            </XStack>
          </Button>
        </XStack>

        <Button
          size="sm"
          onPress={() => setShowYoutubeForm(!showYoutubeForm)}
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="youtube" size={16} color="white" />
            <Text color="white">Add YouTube Video</Text>
          </XStack>
        </Button>

        {showYoutubeForm && (
          <YStack gap="$2">
            <FormField
              value={newYoutubeUrl}
              onChangeText={setNewYoutubeUrl}
              placeholder="Enter YouTube URL"
              onSubmitEditing={handleAddYoutube}
            />
            <Button
              size="sm"
              onPress={handleAddYoutube}
              disabled={!newYoutubeUrl.trim()}
            >
              Add Video
            </Button>
          </YStack>
        )}

        {/* Image Grid */}
        <XStack flexWrap="wrap" gap="$2">
          {formData.metadata.attachments
            ?.filter(att => att.type === 'image')
            .map((attachment, index) => (
              <TouchableOpacity
                key={`image-${index}`}
                onPress={() => {
                  setSelectedImage(attachment.url);
                  setShowImageViewer(true);
                }}
                style={{
                  width: (screenWidth - 48) / 3,
                  height: (screenWidth - 48) / 3,
                  position: 'relative'
                }}
              >
                <Image
                  source={{ uri: attachment.url }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8
                  }}
                />
                <Button
                  size="sm"
                  padding="$1"
                  backgroundColor="$red10"
                  position="absolute"
                  top={4}
                  right={4}
                  onPress={() => handleRemoveAttachment(attachment.url)}
                >
                  <Feather name="x" size={14} color="white" />
                </Button>
              </TouchableOpacity>
            ))}
        </XStack>

        {/* YouTube Videos List */}
        <YStack gap="$2">
          {formData.metadata.attachments
            ?.filter(att => att.type === 'youtube')
            .map((attachment, index) => (
              <XStack key={`youtube-${index}`} gap="$2" alignItems="center">
                <Feather name="youtube" size={16} color={iconColor} />
                <Text size="sm" flex={1} numberOfLines={1}>{attachment.url}</Text>
                <Button
                  size="sm"
                  padding="$2"
                  backgroundColor="transparent"
                  onPress={() => handleRemoveAttachment(attachment.url)}
                >
                  <Feather name="x" size={18} color={iconColor} />
                </Button>
              </XStack>
            ))}
        </YStack>
      </YStack>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        onRequestClose={() => setShowImageViewer(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onPress={() => setShowImageViewer(false)}
        >
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{
                width: screenWidth,
                height: screenWidth,
                resizeMode: 'contain'
              }}
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Study Materials Section */}
      <YStack gap="$3">
        <Text size="sm" weight="medium">Study Materials</Text>
        
        <XStack gap="$2">
          <FormField
            flex={1}
            value={newYoutubeUrl}
            onChangeText={setNewYoutubeUrl}
            placeholder="Add URL or note"
            onSubmitEditing={handleAddStudyMaterial}
          />
          <Button
            size="sm"
            onPress={handleAddStudyMaterial}
            disabled={!newYoutubeUrl.trim()}
          >
            Add
          </Button>
        </XStack>

        <YStack gap="$2">
          {formData.metadata.study_materials?.map((material, index) => (
            <XStack key={`study-${index}`} gap="$2" alignItems="center">
              <Feather 
                name={material.startsWith('http') ? "link" : "file-text"} 
                size={16} 
                color={iconColor} 
              />
              <Text size="sm" flex={1}>{material}</Text>
              <Button
                size="sm"
                padding="$2"
                backgroundColor="transparent"
                onPress={() => handleRemoveStudyMaterial(material)}
              >
                <Feather name="x" size={18} color={iconColor} />
              </Button>
            </XStack>
          ))}
        </YStack>
      </YStack>

      <XStack gap="$2" justifyContent="flex-end" marginTop="$4">
        <Button
          size="md"
          variant="secondary"
          onPress={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="md"
          variant="primary"
          onPress={handleSubmit}
          disabled={!formData.title.trim()}
        >
          {initialData ? 'Update' : 'Create'} Task
        </Button>
      </XStack>
    </YStack>
  );
} 