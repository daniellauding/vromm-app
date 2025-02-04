import React, { useState, useEffect, useCallback, useRef } from 'react';
import { YStack, XStack } from 'tamagui';
import { Button } from './Button';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { useColorScheme, Linking, InteractionManager, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';

// Debug logger with flag to enable/disable
const DEBUG_ENABLED = false;
const debug = (message: string, data?: any) => {
  if (!DEBUG_ENABLED) return;
  if (data?.error) {
    console.error(`[TodoItem] ${message}`, data);
  } else {
    console.log(`[TodoItem] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

const safeRenderCheck = (metadata: TodoItemProps['metadata']) => {
  try {
    if (!metadata) return false;
    if (typeof metadata !== 'object') return false;
    return true;
  } catch (e) {
    debug('Error in safeRenderCheck', { error: e });
    return false;
  }
};

export type TodoItemProps = {
  id: string;
  title: string;
  is_completed: boolean;
  description?: string;
  due_date?: string;
  metadata: {
    routeId?: string;
    routeName?: string;
    attachments?: Array<{
      type: 'youtube' | 'image' | 'file';
      url: string;
      title?: string;
      description?: string;
    }>;
    study_materials?: string[];
    subtasks?: { id: string; title: string; is_completed: boolean }[];
  } | null;
  onToggle: (id: string, currentStatus: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleSubtask?: (todoId: string, subtaskId: string, currentStatus: boolean) => void;
};

export function TodoItem({
  id,
  title,
  is_completed,
  description,
  due_date,
  metadata = null,
  onToggle,
  onEdit,
  onDelete,
  onToggleSubtask
}: TodoItemProps) {
  try {
    // Validate required props
    if (!id || typeof id !== 'string') {
      debug('Invalid ID provided', { id });
      return null;
    }

    if (!title || typeof title !== 'string') {
      debug('Invalid title provided', { id, title });
      return null;
    }

    if (typeof is_completed !== 'boolean') {
      debug('Invalid is_completed value', { id, is_completed });
      return null;
    }

    const [expanded, setExpanded] = useState(false);
    const [shouldRenderContent, setShouldRenderContent] = useState(false);
    const colorScheme = useColorScheme();
    const iconColor = colorScheme === 'dark' ? 'white' : 'black';
    const navigation = useNavigation<NavigationProp>();
    const mountedRef = useRef(true);
    const expandTimer = useRef<NodeJS.Timeout>();

    // Component mount
    useEffect(() => {
      debug('TodoItem mounted', { id });
      mountedRef.current = true;
      return () => {
        debug('TodoItem unmounting', { id });
        mountedRef.current = false;
        if (expandTimer.current) {
          debug('Clearing expand timer during unmount', { id });
          clearTimeout(expandTimer.current);
        }
      };
    }, [id]);

    // Expansion state effect
    useEffect(() => {
      if (!mountedRef.current) return;

      debug('Expansion state changed', { id, expanded, shouldRenderContent });
      
      if (expanded) {
        debug('Setting shouldRenderContent to true', { id });
        setShouldRenderContent(true);
      } else {
        if (expandTimer.current) {
          debug('Clearing previous expand timer', { id });
          clearTimeout(expandTimer.current);
        }
        
        debug('Starting collapse timer', { id });
        expandTimer.current = setTimeout(() => {
          if (mountedRef.current) {
            debug('Collapse timer finished, setting shouldRenderContent to false', { id });
            setShouldRenderContent(false);
          } else {
            debug('Component unmounted during collapse timer', { id });
          }
        }, 300);
      }
    }, [expanded, id]);

    const handleExpand = useCallback(() => {
      if (!mountedRef.current) return;
      
      debug('handleExpand called', { id, currentExpanded: expanded });
      
      InteractionManager.runAfterInteractions(() => {
        if (mountedRef.current) {
          debug('Toggling expanded state', { id });
          setExpanded(prev => {
            debug('New expanded state will be', { id, newState: !prev });
            return !prev;
          });
        } else {
          debug('Attempted to toggle expanded state after unmount', { id });
        }
      });
    }, [id, expanded]);

    const handleRoutePress = useCallback(() => {
      if (!mountedRef.current) return;

      debug('handleRoutePress called', { id, routeId: metadata?.routeId });
      const routeId = metadata?.routeId;
      if (!routeId) {
        debug('No routeId found in metadata', { id });
        return;
      }
      
      try {
        navigation.navigate('RouteDetail', { routeId });
      } catch (error) {
        debug('Error navigating to route', { id, routeId, error });
      }
    }, [metadata?.routeId, navigation, id]);

    const handleOpenMedia = useCallback((url: string) => {
      if (!mountedRef.current) return;

      debug('handleOpenMedia called', { id, url });
      try {
        if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
          debug('Opening YouTube URL', { id, url });
          Linking.openURL(url);
        }
      } catch (error) {
        console.error('[TodoItem] Error opening media URL:', { id, url, error });
      }
    }, [id]);

    const renderAttachments = useCallback(() => {
      if (!metadata?.attachments || !expanded) return null;
      
      try {
        return (
          <YStack gap="$3">
            <Text size="sm" weight="medium">Attachments</Text>
            {metadata.attachments.map((attachment, index) => {
              if (!attachment?.url) return null;
              
              const isYouTube = attachment.type === 'youtube' || 
                               attachment.url.includes('youtube.com') || 
                               attachment.url.includes('youtu.be');
              
              return (
                <YStack key={`${id}-${index}-${attachment.url}`} gap="$2">
                  <XStack gap="$2" alignItems="center">
                    <Feather 
                      name={
                        attachment.type === 'image' ? "image" : 
                        isYouTube ? "youtube" : "file"
                      } 
                      size={16} 
                      color={iconColor} 
                    />
                    <Text size="sm" flex={1} weight="medium">
                      {attachment.title || `Attachment ${index + 1}`}
                    </Text>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => handleOpenMedia(attachment.url)}
                    >
                      <Feather 
                        name={attachment.type === 'image' ? "eye" : "external-link"} 
                        size={16} 
                        color={iconColor} 
                      />
                    </Button>
                  </XStack>
                  {attachment.description && (
                    <Text size="sm" color="$gray11" paddingLeft="$6">
                      {attachment.description}
                    </Text>
                  )}
                </YStack>
              );
            })}
          </YStack>
        );
      } catch (error) {
        debug('Error rendering attachments', { id, error });
        return null;
      }
    }, [metadata?.attachments, expanded, id, iconColor, handleOpenMedia]);

    const renderStudyMaterials = useCallback(() => {
      if (!metadata?.study_materials || !expanded) return null;

      try {
        return (
          <YStack gap="$3">
            <Text size="sm" weight="medium">Study Materials</Text>
            {metadata.study_materials.map((material, index) => {
              const isUrl = material.startsWith('http://') || material.startsWith('https://');
              
              return (
                <XStack key={`${id}-study-${index}`} gap="$2" alignItems="center">
                  <Feather 
                    name={isUrl ? "link" : "file-text"} 
                    size={16} 
                    color={iconColor} 
                  />
                  {isUrl ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      backgroundColor="transparent"
                      flex={1}
                      justifyContent="flex-start"
                      onPress={() => handleOpenMedia(material)}
                    >
                      <Text size="sm" color="$blue10">
                        {material}
                      </Text>
                    </Button>
                  ) : (
                    <Text size="sm" flex={1}>
                      {material}
                    </Text>
                  )}
                </XStack>
              );
            })}
          </YStack>
        );
      } catch (error) {
        debug('Error rendering study materials', { id, error });
        return null;
      }
    }, [metadata?.study_materials, expanded, id, iconColor, handleOpenMedia]);

    return (
      <YStack
        backgroundColor="$backgroundStrong"
        padding="$4"
        borderRadius="$4"
        gap="$2"
      >
        <XStack gap="$3" alignItems="center">
          {(metadata?.attachments?.some(att => att.type === 'image') || metadata?.routeId) && (
            <YStack
              width={40}
              height={40}
              borderRadius={8}
              overflow="hidden"
              backgroundColor="$gray5"
              justifyContent="center"
              alignItems="center"
            >
              {metadata?.attachments?.find(att => att.type === 'image') ? (
                <Image
                  source={{ uri: metadata.attachments.find(att => att.type === 'image')?.url }}
                  style={{ width: 40, height: 40 }}
                  resizeMode="cover"
                />
              ) : (
                <Feather name="map" size={20} color={iconColor} />
              )}
            </YStack>
          )}

          <YStack flex={1}>
            <Text 
              size="md" 
              textDecorationLine={is_completed ? "line-through" : "none"}
              opacity={is_completed ? 0.6 : 1}
            >
              {title}
            </Text>
            {metadata?.routeName && (
              <XStack gap="$2" alignItems="center">
                <Text size="sm" color="$gray11">
                  Route: {metadata.routeName}
                </Text>
                {metadata?.routeId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    backgroundColor="transparent"
                    onPress={handleRoutePress}
                  >
                    <Feather name="map" size={16} color={iconColor} />
                  </Button>
                )}
              </XStack>
            )}
          </YStack>

          <XStack gap="$2" alignItems="center">
            {onEdit && (
              <Button
                size="sm"
                padding="$2"
                backgroundColor="transparent"
                onPress={onEdit}
              >
                <Feather name="edit-2" size={18} color={iconColor} />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                padding="$2"
                backgroundColor="transparent"
                onPress={onDelete}
              >
                <Feather name="trash-2" size={18} color={iconColor} />
              </Button>
            )}
            <Button
              size="sm"
              padding="$2"
              backgroundColor="transparent"
              onPress={handleExpand}
            >
              <Feather 
                name={expanded ? "chevron-up" : "chevron-down"} 
                size={18} 
                color={iconColor} 
              />
            </Button>
            <Button
              size="sm"
              padding="$0"
              backgroundColor={is_completed ? "$green10" : "$gray5"}
              onPress={() => onToggle(id, is_completed)}
            >
              <Feather 
                name={is_completed ? "check" : "circle"} 
                size={20} 
                color={is_completed ? "white" : "$gray11"} 
              />
            </Button>
          </XStack>
        </XStack>

        {shouldRenderContent && (
          <YStack
            gap="$3"
            paddingLeft="$8"
            opacity={expanded ? 1 : 0}
            height={expanded ? 'auto' : 0}
            overflow="hidden"
          >
            {description && (
              <Text size="sm" color="$gray11">
                {description}
              </Text>
            )}

            {due_date && (
              <XStack gap="$2" alignItems="center">
                <Feather name="calendar" size={16} color={iconColor} />
                <Text size="sm" color="$gray11">
                  Due: {new Date(due_date).toLocaleDateString()}
                </Text>
              </XStack>
            )}

            {metadata?.subtasks && metadata.subtasks.length > 0 && (
              <YStack gap="$2">
                <Text size="sm" weight="medium">Subtasks</Text>
                {metadata.subtasks.map((subtask) => (
                  <XStack key={subtask.id} gap="$2" alignItems="center">
                    <Button
                      size="xs"
                      padding="$0"
                      backgroundColor={subtask.is_completed ? "$green10" : "$gray5"}
                      onPress={() => onToggleSubtask?.(id, subtask.id, subtask.is_completed)}
                    >
                      <Feather 
                        name={subtask.is_completed ? "check" : "circle"} 
                        size={16} 
                        color={subtask.is_completed ? "white" : "$gray11"} 
                      />
                    </Button>
                    <Text 
                      size="sm"
                      textDecorationLine={subtask.is_completed ? "line-through" : "none"}
                      opacity={subtask.is_completed ? 0.6 : 1}
                    >
                      {subtask.title}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            )}

            {renderAttachments()}
            {renderStudyMaterials()}
          </YStack>
        )}
      </YStack>
    );
  } catch (error) {
    debug('Error rendering TodoItem', { id, error });
    return null;
  }
} 