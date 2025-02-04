import { useState, useEffect } from 'react';
import { YStack, XStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { ScrollView, Modal, useColorScheme } from 'react-native';
import { Database } from '../lib/database.types';
import { TodoItem, TodoItemProps } from '../components/TodoItem';
import { TodoForm } from '../components/TodoForm';

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

type TodoFromDB = Omit<Database['public']['Tables']['todos']['Row'], 'metadata'> & {
  metadata: DbMetadata | null;
};

type TodoFormData = Omit<Todo, 'is_completed'>;

export function TodoView() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoFormData | null>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (user?.id) {
      loadTodos();
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

    // Cast the raw data to our expected type
    const data = rawData as unknown as TodoFromDB[];

    setTodos(data.map((todo): Todo => {
      // Transform metadata to ensure correct types
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

  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error toggling todo:', error);
      return;
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

  const handleSubmit = async (data: Omit<TodoFormData, 'id'>) => {
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

  return (
    <Screen scroll={false}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: 0
        }}
      >
        <YStack gap="$4" padding="$4">
          <XStack gap="$2" alignItems="center">
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
          </XStack>

          {todos.length > 0 ? (
            todos.map((todo) => (
              <TodoItem
                key={todo.id}
                {...todo}
                onToggle={handleToggleTodo}
                onEdit={() => {
                  const formData: TodoFormData = {
                    id: todo.id,
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
              initialData={editingTodo ? { 
                title: editingTodo.title,
                description: editingTodo.description,
                due_date: editingTodo.due_date,
                metadata: editingTodo.metadata
              } : undefined}
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