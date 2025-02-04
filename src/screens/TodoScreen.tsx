import React, { useState, useEffect } from 'react';
import { YStack, XStack, ToggleGroup } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { ScrollView, Modal, useColorScheme, Image } from 'react-native';
import { Database } from '../lib/database.types';
import { TodoItem } from '../components/TodoItem';
import { TodoForm } from '../components/TodoForm';
import { RoutePreviewCard } from '../components/RoutePreviewCard';

type AttachmentType = 'youtube' | 'image' | 'file';

type DbMetadata = {
  routeId?: string;
  routeName?: string;
  subtasks?: { id: string; title: string; is_completed: boolean }[];
  attachments?: { type: string; url: string; title?: string; description?: string; }[];
  study_materials?: string[];
};

type Todo = {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
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

type MediaAttachment = {
  type: 'youtube' | 'image' | 'video';
  url: string;
  description?: string;
};

type RouteData = {
  id: string;
  name: string;
  description: string;
  media_attachments: MediaAttachment[];
};

type SavedRoute = {
  id: string;
  name: string;
  description: string;
  saved_at: string;
  media_attachments: MediaAttachment[];
};

type DrivenRoute = {
  id: string;
  name: string;
  description: string;
  driven_at: string;
  media_attachments: MediaAttachment[];
};

type TodoFromDB = Omit<Database['public']['Tables']['todos']['Row'], 'metadata'> & {
  metadata: DbMetadata | null;
};

type TodoFormData = {
  id?: string;
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

export function TodoScreen() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [drivenRoutes, setDrivenRoutes] = useState<DrivenRoute[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoFormData | null>(null);
  const [activeView, setActiveView] = useState('todos');
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  useEffect(() => {
    if (user?.id) {
      loadTodos();
      loadSavedRoutes();
      loadDrivenRoutes();
    }
  }, [user?.id]);

  const loadTodos = async () => {
    if (!user?.id) return;

    const { data: rawData, error } = await supabase
      .from('todos')
      .select('*')
      .or(`assigned_to.eq.${user.id},assigned_by.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading todos:', error);
      return;
    }

    const data = rawData as unknown as TodoFromDB[];
    setTodos(data.map((todo): Todo => {
      const metadata = todo.metadata || {};
      const attachments = Array.isArray(metadata.attachments) 
        ? metadata.attachments.map(att => ({
            ...att,
            type: (att.type === 'youtube' || att.type === 'image' || att.type === 'file' 
              ? att.type 
              : 'file') as AttachmentType,
            title: att.title || `Attachment`,
            description: att.description
          }))
        : [];

      const study_materials = Array.isArray(metadata.study_materials)
        ? metadata.study_materials
        : [];

      return {
        id: todo.id,
        title: todo.title,
        description: todo.description || undefined,
        due_date: todo.due_date || undefined,
        is_completed: todo.is_completed || false,
        metadata: {
          routeId: metadata.routeId,
          routeName: metadata.routeName,
          subtasks: Array.isArray(metadata.subtasks) ? metadata.subtasks : [],
          attachments,
          study_materials
        }
      };
    }));
  };

  const loadSavedRoutes = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('saved_routes')
      .select('*, routes(*)')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Error loading saved routes:', error);
      return;
    }

    setSavedRoutes(data.map(item => {
      const route = item.routes as any;
      return {
        id: route?.id || '',
        name: route?.name || '',
        description: route?.description || '',
        saved_at: item.saved_at || '',
        media_attachments: Array.isArray(route?.media_attachments) 
          ? route.media_attachments.map((att: any) => ({
              type: (att.type === 'youtube' || att.type === 'image' || att.type === 'video' 
                ? att.type 
                : 'image') as 'youtube' | 'image' | 'video',
              url: att.url || '',
              description: att.description
            }))
          : []
      };
    }));
  };

  const loadDrivenRoutes = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('driven_routes')
      .select('*, routes(*)')
      .eq('user_id', user.id)
      .order('driven_at', { ascending: false });

    if (error) {
      console.error('Error loading driven routes:', error);
      return;
    }

    setDrivenRoutes(data.map(item => {
      const route = item.routes as any;
      return {
        id: route?.id || '',
        name: route?.name || '',
        description: route?.description || '',
        driven_at: item.driven_at || '',
        media_attachments: Array.isArray(route?.media_attachments) 
          ? route.media_attachments.map((att: any) => ({
              type: (att.type === 'youtube' || att.type === 'image' || att.type === 'video' 
                ? att.type 
                : 'image') as 'youtube' | 'image' | 'video',
              url: att.url || '',
              description: att.description
            }))
          : []
      };
    }));
  };

  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const { error: todoError } = await supabase
      .from('todos')
      .update({ is_completed: !currentStatus })
      .eq('id', id);

    if (todoError) {
      console.error('Error toggling todo:', todoError);
      return;
    }

    // If this todo is associated with a route and is being marked as completed,
    // also mark the route as driven if not already
    if (!currentStatus && todo.metadata?.routeId) {
      const routeId = todo.metadata.routeId;
      const { data: existingDriven } = await supabase
        .from('driven_routes')
        .select('*')
        .eq('route_id', routeId)
        .eq('user_id', user?.id)
        .single();

      if (!existingDriven) {
        const { error: drivenError } = await supabase
          .from('driven_routes')
          .insert([{
            route_id: routeId,
            user_id: user?.id,
            driven_at: new Date().toISOString()
          }]);

        if (drivenError) {
          console.error('Error marking route as driven:', drivenError);
        } else {
          // Refresh the driven routes list
          await loadDrivenRoutes();
        }
      }
    }

    await loadTodos();
  };

  const handleToggleSubtask = async (todoId: string, subtaskId: string, currentStatus: boolean) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.metadata?.subtasks) return;

    const updatedSubtasks = todo.metadata.subtasks.map(subtask =>
      subtask.id === subtaskId
        ? { ...subtask, is_completed: !currentStatus }
        : subtask
    );

    const { error } = await supabase
      .from('todos')
      .update({
        metadata: {
          ...todo.metadata,
          subtasks: updatedSubtasks
        }
      })
      .eq('id', todoId);

    if (error) {
      console.error('Error toggling subtask:', error);
      return;
    }

    await loadTodos();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting todo:', error);
      return;
    }

    await loadTodos();
  };

  const handleSubmit = async (data: TodoFormData) => {
    if (editingTodo) {
      const { error } = await supabase
        .from('todos')
        .update({
          title: data.title,
          description: data.description,
          due_date: data.due_date,
          metadata: data.metadata
        })
        .eq('id', editingTodo.id);

      if (error) {
        console.error('Error updating todo:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('todos')
        .insert([{
          assigned_to: user?.id,
          assigned_by: user?.id,
          title: data.title,
          description: data.description,
          due_date: data.due_date,
          metadata: data.metadata,
          is_completed: false
        }]);

      if (error) {
        console.error('Error creating todo:', error);
        return;
      }
    }

    setShowForm(false);
    setEditingTodo(null);
    await loadTodos();
  };

  const getRouteImage = (route: SavedRoute | DrivenRoute) => {
    const firstImage = route.media_attachments?.find(
      (attachment) => attachment.type === 'image'
    );
    return firstImage?.url || null;
  };

  return (
    <Screen scroll={false}>
      <Header title="You" showBack={false} />
      
      <YStack padding="$4" gap="$4">
        <ToggleGroup
          type="single"
          value={activeView}
          onValueChange={(value) => value && setActiveView(value)}
          disableDeactivation
        >
          <ToggleGroup.Item value="todos" flex={1}>
            <XStack gap="$2" alignItems="center" justifyContent="center">
              <Feather name="check-square" size={16} color={activeView === 'todos' ? 'white' : iconColor} />
              <Text color={activeView === 'todos' ? 'white' : '$color'}>Tasks</Text>
            </XStack>
          </ToggleGroup.Item>
          <ToggleGroup.Item value="saved" flex={1}>
            <XStack gap="$2" alignItems="center" justifyContent="center">
              <Feather name="bookmark" size={16} color={activeView === 'saved' ? 'white' : iconColor} />
              <Text color={activeView === 'saved' ? 'white' : '$color'}>Saved</Text>
            </XStack>
          </ToggleGroup.Item>
          <ToggleGroup.Item value="driven" flex={1}>
            <XStack gap="$2" alignItems="center" justifyContent="center">
              <Feather name="map" size={16} color={activeView === 'driven' ? 'white' : iconColor} />
              <Text color={activeView === 'driven' ? 'white' : '$color'}>Driven</Text>
            </XStack>
          </ToggleGroup.Item>
        </ToggleGroup>
      </YStack>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16
        }}
      >
        <YStack gap="$4">
          {activeView === 'todos' && (
            <>
              <Button
                onPress={() => {
                  setEditingTodo(null);
                  setShowForm(true);
                }}
                size="lg"
              >
                <XStack gap="$2" alignItems="center">
                  <Feather name="plus" size={20} color="white" />
                  <Text color="white">Add Task</Text>
                </XStack>
              </Button>

              {todos.length > 0 ? (
                todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    {...todo}
                    onToggle={handleToggleTodo}
                    onEdit={() => {
                      const formData: TodoFormData = {
                        title: todo.title,
                        description: todo.description,
                        due_date: todo.due_date,
                        metadata: todo.metadata
                      };
                      setEditingTodo(formData);
                      setShowForm(true);
                    }}
                    onDelete={() => handleDelete(todo.id)}
                    onToggleSubtask={handleToggleSubtask}
                  />
                ))
              ) : (
                <YStack gap="$4" alignItems="center" paddingVertical="$8">
                  <Feather name="check-circle" size={64} color={colorScheme === 'dark' ? 'white' : 'black'} opacity={0.5} />
                  <YStack gap="$2" alignItems="center">
                    <Text size="xl" weight="bold" textAlign="center">No tasks yet</Text>
                    <Text size="lg" color="$gray11" textAlign="center">Create your first task by clicking the Add Task button above</Text>
                  </YStack>
                </YStack>
              )}
            </>
          )}

          {activeView === 'saved' && (
            <YStack gap="$4">
              {savedRoutes.length > 0 ? (
                savedRoutes.map((route) => (
                  <RoutePreviewCard
                    key={route.id}
                    route={{
                      id: route.id,
                      name: route.name,
                      description: route.description || '',
                      difficulty: 'beginner',
                      spot_type: 'urban',
                      media_attachments: route.media_attachments
                        .filter(m => m.type === 'image' || m.type === 'video')
                        .map(m => ({
                          type: m.type === 'youtube' ? 'image' : m.type,
                          url: m.url,
                          description: m.description
                        })),
                      waypoint_details: [],
                      metadata: { waypoints: [] },
                      reviews: [],
                      average_rating: []
                    }}
                  />
                ))
              ) : (
                <YStack gap="$4" alignItems="center" paddingVertical="$8">
                  <Feather name="bookmark" size={64} color={colorScheme === 'dark' ? 'white' : 'black'} opacity={0.5} />
                  <YStack gap="$2" alignItems="center">
                    <Text size="xl" weight="bold" textAlign="center">No saved routes</Text>
                    <Text size="lg" color="$gray11" textAlign="center">Save routes to practice them later</Text>
                  </YStack>
                </YStack>
              )}
            </YStack>
          )}

          {activeView === 'driven' && (
            <YStack gap="$4">
              {drivenRoutes.length > 0 ? (
                drivenRoutes.map((route) => (
                  <RoutePreviewCard
                    key={route.id}
                    route={{
                      id: route.id,
                      name: route.name,
                      description: route.description || '',
                      difficulty: 'beginner',
                      spot_type: 'urban',
                      media_attachments: route.media_attachments
                        .filter(m => m.type === 'image' || m.type === 'video')
                        .map(m => ({
                          type: m.type === 'youtube' ? 'image' : m.type,
                          url: m.url,
                          description: m.description
                        })),
                      waypoint_details: [],
                      metadata: { waypoints: [] },
                      reviews: [],
                      average_rating: []
                    }}
                  />
                ))
              ) : (
                <YStack gap="$4" alignItems="center" paddingVertical="$8">
                  <Feather name="map" size={64} color={colorScheme === 'dark' ? 'white' : 'black'} opacity={0.5} />
                  <YStack gap="$2" alignItems="center">
                    <Text size="xl" weight="bold" textAlign="center">No driven routes</Text>
                    <Text size="lg" color="$gray11" textAlign="center">Routes you've driven will appear here</Text>
                  </YStack>
                </YStack>
              )}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowForm(false);
          setEditingTodo(null);
        }}
      >
        <Screen>
          <YStack f={1}>
            <Header
              title={editingTodo ? 'Edit Task' : 'New Task'}
              showBack
              leftElement={
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setShowForm(false);
                    setEditingTodo(null);
                  }}
                >
                  <Feather name="x" size={20} color={colorScheme === 'dark' ? 'white' : 'black'} />
                </Button>
              }
            />
            <TodoForm
              initialData={editingTodo || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingTodo(null);
              }}
            />
          </YStack>
        </Screen>
      </Modal>
    </Screen>
  );
} 