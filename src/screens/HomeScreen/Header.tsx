import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Modal, ScrollView, TouchableOpacity, View, Alert, Image } from 'react-native';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Calendar } from '@tamagui/lucide-icons';

// ADD MESSAGING COMPONENTS
// import { MessageBell } from '../../components/MessageBell';
// import { NotificationBell } from '../../components/NotificationBell';
// import { EventsBell } from '../../components/EventsBell';

import { useAuth } from '@/src/context/AuthContext';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { supabase } from '../../lib/supabase';

export const HomeHeader = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { setActiveStudent, activeStudentId } = useStudentSwitch();

  const [showStudentPicker, setShowStudentPicker] = React.useState(false);
  const [students, setStudents] = React.useState<Array<{ id: string; full_name: string; email: string; created_at?: string }>>([]);
  const isSupervisorRole = ['instructor', 'admin', 'school'].includes((profile as any)?.role || '');

  const loadSupervisedStudents = React.useCallback(async (): Promise<Array<{ id: string; full_name: string; email: string; created_at?: string }>> => {
    if (!profile?.id) {
      setStudents([]);
      return [];
    }
    try {
      // Step 1: fetch relationships
      const { data: rels, error: relErr } = await supabase
        .from('student_supervisor_relationships')
        .select('student_id, created_at')
        .eq('supervisor_id', profile.id)
        .order('created_at', { ascending: false });
      if (relErr) throw relErr;

      const studentIds = (rels || []).map((r: any) => r.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        return [];
      }

      // Step 2: fetch profile details
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds);
      if (profErr) throw profErr;

      const createdAtById = Object.fromEntries((rels || []).map((r: any) => [r.student_id, r.created_at]));
      const list: Array<{ id: string; full_name: string; email: string; created_at?: string }> = (profs || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name || 'Unknown',
        email: p.email || '',
        created_at: createdAtById[p.id],
      }));
      setStudents(list);
      return list;
    } catch (e) {
      console.warn('Failed to load supervised students', e);
      setStudents([]);
      return [];
    }
  }, [profile?.id]);

  const onPressAvatar = async () => {
    // If user is not a supervisor (i.e., student), go to their public profile
    if (!isSupervisorRole) {
      if (profile?.id) (navigation as any).navigate('PublicProfile', { userId: profile.id });
      return;
    }
    // For instructors/admin/school: load students, if fewer than 2, go to own public profile; else open modal
    try {
      const list = (await loadSupervisedStudents()) || [];
      if ((list?.length || 0) < 2) {
        if (profile?.id) (navigation as any).navigate('PublicProfile', { userId: profile.id });
      } else {
        setShowStudentPicker(true);
      }
    } catch {
      // Fallback: open the picker as before
      setShowStudentPicker(true);
    }
  };
  return (
    <YStack
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal="$4"
      marginBottom="$2"
    >
      <XStack alignItems="center" gap={12} width="100%" justifyContent="space-between">
        <YStack gap={8} flexShrink={1} alignItems="flex-start" width="100%">
          <TouchableOpacity
            onPress={onPressAvatar}
            activeOpacity={isSupervisorRole ? 0.7 : 1}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#333',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: activeStudentId ? 2 : 0,
              borderColor: activeStudentId ? '#00E6C3' : 'transparent',
            }}
          >
            {/* Show avatar image if present */}
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            ) : (
              <Feather name="user" size={20} color="#fff" />
            )}
          </TouchableOpacity>
          <Text fontSize="$6" fontWeight="800" fontStyle="italic" color="$color" numberOfLines={5}>
            {profile?.full_name &&
            !profile.full_name.includes('@') &&
            profile.full_name !== 'Unknown' &&
            !profile.full_name.startsWith('user_')
              ? t('home.welcomeWithName').replace('{name}', profile.full_name)
              : t('home.welcome')}
          </Text>
        </YStack>

        <XStack gap={12} alignItems="center">
          {/* Hidden temporarily: MessageBell, NotificationBell, EventsBell, Users button */}
        </XStack>
      </XStack>

      {/* Student picker modal (only opens for instructor/admin/school) */}
      <Modal
        visible={showStudentPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStudentPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowStudentPicker(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: '#1a1a1a', borderRadius: 12, maxHeight: '70%', padding: 16 }}
          >
            <Text size="lg" weight="bold" color="#fff" style={{ marginBottom: 12 }}>
              Select student to view
            </Text>
            <ScrollView>
              <TouchableOpacity
                onPress={() => {
                  setActiveStudent(null);
                  setShowStudentPicker(false);
                }}
                style={{ paddingVertical: 10 }}
              >
                <XStack alignItems="center" gap={8}>
                  <Feather name="user" size={16} color="#888" />
                  <Text color="#fff">My own profile</Text>
                </XStack>
              </TouchableOpacity>
              {students.length === 0 ? (
                <Text color="#ddd" style={{ paddingVertical: 10 }}>
                  {isSupervisorRole ? 'No students yet' : 'Not available for your role'}
                </Text>
              ) : (
                students.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      setActiveStudent(s.id, s.full_name || null);
                      setShowStudentPicker(false);
                    }}
                    style={{ paddingVertical: 10 }}
                  >
                    <XStack alignItems="center" gap={8}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 14, backgroundColor: '#333',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: activeStudentId === s.id ? 2 : 0, borderColor: '#00E6C3'
                      }}>
                        <Feather name="user" size={14} color="#fff" />
                      </View>
                      <YStack>
                        <Text color="#fff" weight="semibold" size="sm">{s.full_name || 'Unknown'}</Text>
                        <Text color="#ccc" size="xs">{s.email}</Text>
                      </YStack>
                    </XStack>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </YStack>
  );
};
