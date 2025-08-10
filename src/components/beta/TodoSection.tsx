import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';

const todosByRole: Record<'student' | 'teacher', string[]> = {
  student: [
    'Download and register',
    'Complete onboarding',
    'Explore dashboard',
    'Practice a route',
    'Update profile settings',
  ],
  teacher: [
    'Set up instructor profile',
    'Upload credentials',
    'Create a practice exercise',
    'Test student management',
    'Review analytics',
  ],
};

export const TodoSection: React.FC = () => {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(`beta_todos_${role}`);
        if (saved) setCompleted(JSON.parse(saved));
        else setCompleted([]);
      } catch {}
    })();
  }, [role]);

  const toggle = async (id: string) => {
    const next = completed.includes(id) ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);
    await AsyncStorage.setItem(`beta_todos_${role}`, JSON.stringify(next));
  };

  return (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700">Testing Checklist</Text>

      <XStack gap="$2">
        <Button variant={role === 'student' ? 'outlined' : 'ghost'} onPress={() => setRole('student')}>Student</Button>
        <Button variant={role === 'teacher' ? 'outlined' : 'ghost'} onPress={() => setRole('teacher')}>Teacher</Button>
      </XStack>

      <YStack gap="$2">
        {todosByRole[role].map((todo, idx) => {
          const id = `${role}_${idx}`;
          const done = completed.includes(id);
          return (
            <TouchableOpacity key={id} onPress={() => toggle(id)}>
              <Card padding="$3" bordered>
                <XStack gap="$3" alignItems="center">
                  <Text>{done ? '☑︎' : '☐'}</Text>
                  <Text flex={1}>{todo}</Text>
                </XStack>
              </Card>
            </TouchableOpacity>
          );
        })}
      </YStack>
    </YStack>
  );
};

export default TodoSection; 