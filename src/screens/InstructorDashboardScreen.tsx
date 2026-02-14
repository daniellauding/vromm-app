import React, { useState, useEffect, useCallback } from 'react';
import { RefreshControl, Alert, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { YStack, XStack, ScrollView, Text, Spinner } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../types/navigation';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import { Button } from '../components/Button';
import Svg, { Circle } from 'react-native-svg';

type StudentWithProgress = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  location?: string;
  private_profile?: boolean;
  last_activity?: string;
  status: 'on_track' | 'stalling' | 'inactive';
  learning_paths: { pathId: string; pathTitle: string; completed: number; total: number }[];
  totalCompleted: number;
  totalExercises: number;
  note?: string;
};

function ProgressCircle({ percent, size = 28, color = '#00E6C3' }: { percent: number; size?: number; color?: string }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percent, 1));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#333" strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round" rotation="-90" origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
}

export function InstructorDashboardScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { t, language } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';

  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Assign learning path state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [learningPaths, setLearningPaths] = useState<{ id: string; title: { en: string; sv: string } }[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Notes state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteStudentId, setNoteStudentId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Expanded student for progress detail
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Get student relationships
      const { data: relationships, error: relError } = await supabase
        .from('student_supervisor_relationships')
        .select(`
          student_id,
          created_at,
          profiles!fk_student_supervisor_relationships_student_id (
            id, full_name, email, avatar_url, location, private_profile, updated_at
          )
        `)
        .eq('supervisor_id', user.id);

      if (relError) throw relError;

      // For each student, get learning path progress
      const studentsWithProgress = (await Promise.all(
        (relationships || []).map(async (rel: any) => {
          const student = rel.profiles;
          if (!student) return null;

          // Get exercise completions
          const { data: completions } = await supabase
            .from('learning_path_exercise_completions')
            .select('exercise_id, completed_at, learning_path_exercises!inner(learning_path_id)')
            .eq('user_id', student.id);

          // Get all learning paths with exercises
          const { data: paths } = await supabase
            .from('learning_paths')
            .select('id, title, learning_path_exercises(id)')
            .eq('active', true);

          // Build progress per path
          const completionsByPath: Record<string, Set<string>> = {};
          (completions || []).forEach((c: any) => {
            const pathId = c.learning_path_exercises?.learning_path_id;
            if (pathId) {
              if (!completionsByPath[pathId]) completionsByPath[pathId] = new Set();
              completionsByPath[pathId].add(c.exercise_id);
            }
          });

          const learningPathProgress = (paths || [])
            .filter((p: any) => completionsByPath[p.id]?.size > 0)
            .map((p: any) => ({
              pathId: p.id,
              pathTitle: (language === 'sv' ? p.title?.sv : p.title?.en) || p.title?.en || 'Untitled',
              completed: completionsByPath[p.id]?.size || 0,
              total: p.learning_path_exercises?.length || 0,
            }));

          const totalCompleted = learningPathProgress.reduce((s, p) => s + p.completed, 0);
          const totalExercises = learningPathProgress.reduce((s, p) => s + p.total, 0);

          // Calculate activity status
          const lastActivity = student.updated_at || rel.created_at;
          const daysSinceActivity = lastActivity
            ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          let status: 'on_track' | 'stalling' | 'inactive' = 'on_track';
          if (daysSinceActivity > 7) status = 'inactive';
          else if (daysSinceActivity > 3) status = 'stalling';

          // Load note from AsyncStorage-like approach (use metadata or local)
          let note = '';
          try {
            const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
            note = (await AsyncStorage.getItem(`instructor_note_${user.id}_${student.id}`)) || '';
          } catch {}

          return {
            id: student.id,
            full_name: student.full_name || 'Unknown',
            email: student.email || '',
            avatar_url: student.avatar_url,
            location: student.location,
            private_profile: student.private_profile,
            last_activity: lastActivity,
            status,
            learning_paths: learningPathProgress,
            totalCompleted,
            totalExercises,
            note,
          };
        }),
      )).filter(Boolean) as StudentWithProgress[];

      setStudents(studentsWithProgress);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, language]);

  const loadLearningPaths = useCallback(async () => {
    const { data } = await supabase
      .from('learning_paths')
      .select('id, title')
      .eq('active', true)
      .order('order_index');
    setLearningPaths(data || []);
  }, []);

  useEffect(() => {
    loadStudents();
    loadLearningPaths();
  }, [loadStudents, loadLearningPaths]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const handleAssignPath = async () => {
    if (!selectedPathId || selectedStudentIds.length === 0 || !user?.id) return;
    setAssigning(true);
    try {
      // Create a notification for each student about the assigned path
      const path = learningPaths.find(p => p.id === selectedPathId);
      const pathTitle = path ? (language === 'sv' ? path.title.sv : path.title.en) : '';

      for (const studentId of selectedStudentIds) {
        await supabase.from('notifications').insert({
          user_id: studentId,
          type: 'system',
          message: `${profile?.full_name || 'Your instructor'} assigned you: ${pathTitle}`,
          actor_id: user.id,
          target_id: selectedPathId,
        });
      }

      Alert.alert(
        t('common.success') || 'Success',
        `${pathTitle} assigned to ${selectedStudentIds.length} student(s)`,
      );
      setShowAssignModal(false);
      setSelectedPathId(null);
      setSelectedStudentIds([]);
    } catch (error) {
      console.error('Error assigning path:', error);
      Alert.alert(t('common.error') || 'Error', 'Failed to assign learning path');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteStudentId || !user?.id) return;
    setSavingNote(true);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(`instructor_note_${user.id}_${noteStudentId}`, noteText);
      setStudents(prev =>
        prev.map(s => (s.id === noteStudentId ? { ...s, note: noteText } : s)),
      );
      setShowNoteModal(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  const toggleMapVisibility = async (studentId: string, currentPrivate: boolean) => {
    try {
      await supabase
        .from('profiles')
        .update({ private_profile: !currentPrivate })
        .eq('id', studentId);
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, private_profile: !currentPrivate } : s)),
      );
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'on_track') return '#00E6C3';
    if (status === 'stalling') return '#FFB800';
    return '#FF4444';
  };

  const statusLabel = (status: string) => {
    if (status === 'on_track') return t('instructor.onTrack') || 'On Track';
    if (status === 'stalling') return t('instructor.stalling') || 'Stalling';
    return t('instructor.inactive') || 'Inactive';
  };

  const activeCount = students.filter(s => s.status !== 'inactive').length;

  const renderStudent = ({ item: student }: { item: StudentWithProgress }) => {
    const isExpanded = expandedStudentId === student.id;
    const overallPercent = student.totalExercises > 0 ? student.totalCompleted / student.totalExercises : 0;

    return (
      <YStack
        backgroundColor={isDark ? '#1A1A1A' : '#FFF'}
        borderRadius="$4"
        padding="$3"
        marginBottom="$2"
        borderWidth={1}
        borderColor={isDark ? '#333' : '#E5E5E5'}
      >
        <TouchableOpacity onPress={() => setExpandedStudentId(isExpanded ? null : student.id)}>
          <XStack alignItems="center" gap="$3">
            {/* Avatar circle */}
            <YStack
              width={40} height={40} borderRadius={20}
              backgroundColor={statusColor(student.status) + '30'}
              justifyContent="center" alignItems="center"
            >
              <Text fontSize="$4" fontWeight="bold" color={statusColor(student.status)}>
                {student.full_name.charAt(0).toUpperCase()}
              </Text>
            </YStack>

            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color={isDark ? '#FFF' : '#000'}>
                {student.full_name}
              </Text>
              <XStack alignItems="center" gap="$2">
                <YStack
                  width={8} height={8} borderRadius={4}
                  backgroundColor={statusColor(student.status)}
                />
                <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
                  {statusLabel(student.status)}
                </Text>
                {student.last_activity && (
                  <Text fontSize="$1" color={isDark ? '#666' : '#999'}>
                    {Math.floor((Date.now() - new Date(student.last_activity).getTime()) / (1000 * 60 * 60 * 24))}d
                  </Text>
                )}
              </XStack>
            </YStack>

            {/* Overall progress */}
            <XStack alignItems="center" gap="$2">
              <ProgressCircle percent={overallPercent} color={statusColor(student.status)} />
              <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
                {Math.round(overallPercent * 100)}%
              </Text>
            </XStack>

            <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={isDark ? '#AAA' : '#666'} />
          </XStack>
        </TouchableOpacity>

        {/* Expanded detail */}
        {isExpanded && (
          <YStack marginTop="$3" gap="$2">
            {/* Per-path progress */}
            {student.learning_paths.length > 0 ? (
              student.learning_paths.map(path => (
                <XStack key={path.pathId} alignItems="center" gap="$2" paddingLeft="$4">
                  <ProgressCircle
                    percent={path.total > 0 ? path.completed / path.total : 0}
                    size={22}
                    color="#00E6C3"
                  />
                  <Text fontSize="$2" color={isDark ? '#CCC' : '#333'} flex={1} numberOfLines={1}>
                    {path.pathTitle}
                  </Text>
                  <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
                    {path.completed}/{path.total}
                  </Text>
                </XStack>
              ))
            ) : (
              <Text fontSize="$2" color={isDark ? '#666' : '#999'} paddingLeft="$4">
                {t('instructor.noActivity') || 'No recent activity'}
              </Text>
            )}

            {/* Note */}
            {student.note ? (
              <TouchableOpacity
                onPress={() => {
                  setNoteStudentId(student.id);
                  setNoteText(student.note || '');
                  setShowNoteModal(true);
                }}
              >
                <XStack
                  backgroundColor={isDark ? '#2A2A2A' : '#F5F5F5'}
                  padding="$2" borderRadius="$2" marginTop="$1" marginLeft="$4"
                  alignItems="center" gap="$2"
                >
                  <Feather name="file-text" size={14} color={isDark ? '#AAA' : '#666'} />
                  <Text fontSize="$2" color={isDark ? '#CCC' : '#333'} flex={1} numberOfLines={2}>
                    {student.note}
                  </Text>
                </XStack>
              </TouchableOpacity>
            ) : null}

            {/* Action buttons */}
            <XStack gap="$2" marginTop="$2" paddingLeft="$4" flexWrap="wrap">
              <TouchableOpacity
                onPress={() => navigation.navigate('PublicProfile', { userId: student.id })}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: isDark ? '#333' : '#E5E5E5',
                }}
              >
                <Feather name="user" size={14} color={isDark ? '#FFF' : '#333'} />
                <Text fontSize="$2" color={isDark ? '#FFF' : '#333'}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setNoteStudentId(student.id);
                  setNoteText(student.note || '');
                  setShowNoteModal(true);
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: isDark ? '#333' : '#E5E5E5',
                }}
              >
                <Feather name="edit-3" size={14} color={isDark ? '#FFF' : '#333'} />
                <Text fontSize="$2" color={isDark ? '#FFF' : '#333'}>
                  {student.note ? (t('instructor.editNote') || 'Edit Note') : (t('instructor.addNote') || 'Add Note')}
                </Text>
              </TouchableOpacity>
            </XStack>
          </YStack>
        )}
      </YStack>
    );
  };

  if (loading) {
    return (
      <Screen>
        <Header title={t('instructor.title') || 'Instructor Dashboard'} showBack />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#00E6C3" />
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={t('instructor.title') || 'Instructor Dashboard'} showBack />
      <FlatList
        data={students}
        keyExtractor={item => item.id}
        renderItem={renderStudent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$3">
            {/* Stat cards */}
            <XStack gap="$3">
              <DashboardStatCard
                value={students.length}
                label={t('instructor.totalStudents') || 'Total Students'}
                icon="users"
                color="#00E6C3"
              />
              <DashboardStatCard
                value={activeCount}
                label={t('instructor.activeStudents') || 'Active Students'}
                icon="activity"
                color="#0A84FF"
              />
            </XStack>

            {/* Action buttons */}
            <XStack gap="$2">
              <TouchableOpacity
                onPress={() => setShowAssignModal(true)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: '#00E6C3',
                }}
              >
                <Feather name="book-open" size={18} color="#000" />
                <Text fontSize="$3" fontWeight="600" color="#000">
                  {t('instructor.assignPath') || 'Assign Path'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('QRConnectScreen' as any)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: isDark ? '#333' : '#E5E5E5',
                }}
              >
                <Feather name="maximize" size={18} color={isDark ? '#FFF' : '#333'} />
                <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#333'}>
                  {t('qrConnect.title') || 'QR Connect'}
                </Text>
              </TouchableOpacity>
            </XStack>

            {/* Section header */}
            <Text fontSize="$5" fontWeight="bold" color={isDark ? '#FFF' : '#000'} marginTop="$2">
              {t('instructor.progressOverview') || 'Progress Overview'}
            </Text>
          </YStack>
        }
        ListEmptyComponent={
          <YStack alignItems="center" padding="$6" gap="$3">
            <Feather name="users" size={48} color={isDark ? '#444' : '#CCC'} />
            <Text fontSize="$4" color={isDark ? '#666' : '#999'} textAlign="center">
              {t('instructor.noActivity') || 'No students yet'}
            </Text>
          </YStack>
        }
      />

      {/* Assign Learning Path Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowAssignModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <YStack
              backgroundColor={isDark ? '#1A1A1A' : '#FFF'}
              borderTopLeftRadius={24} borderTopRightRadius={24}
              padding="$4" maxHeight="80%"
            >
              <Text fontSize="$6" fontWeight="bold" color={isDark ? '#FFF' : '#000'} marginBottom="$3">
                {t('instructor.assignPath') || 'Assign Learning Path'}
              </Text>

              {/* Select path */}
              <Text fontSize="$4" fontWeight="600" color={isDark ? '#FFF' : '#000'} marginBottom="$2">
                {t('instructor.selectPath') || 'Select Learning Path'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <XStack gap="$2">
                  {learningPaths.map(path => (
                    <TouchableOpacity
                      key={path.id}
                      onPress={() => setSelectedPathId(path.id)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: selectedPathId === path.id ? '#00E6C3' : (isDark ? '#333' : '#E5E5E5'),
                      }}
                    >
                      <Text
                        fontSize="$3"
                        color={selectedPathId === path.id ? '#000' : (isDark ? '#FFF' : '#333')}
                        fontWeight={selectedPathId === path.id ? 'bold' : 'normal'}
                      >
                        {language === 'sv' ? path.title.sv : path.title.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </XStack>
              </ScrollView>

              {/* Select students */}
              <Text fontSize="$4" fontWeight="600" color={isDark ? '#FFF' : '#000'} marginBottom="$2">
                {t('instructor.selectStudents') || 'Select Students'}
              </Text>
              <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                {students.map(student => (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => {
                      setSelectedStudentIds(prev =>
                        prev.includes(student.id)
                          ? prev.filter(id => id !== student.id)
                          : [...prev, student.id],
                      );
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingVertical: 10, paddingHorizontal: 4,
                      borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#EEE',
                    }}
                  >
                    <Feather
                      name={selectedStudentIds.includes(student.id) ? 'check-square' : 'square'}
                      size={20}
                      color={selectedStudentIds.includes(student.id) ? '#00E6C3' : (isDark ? '#666' : '#AAA')}
                    />
                    <Text fontSize="$3" color={isDark ? '#FFF' : '#000'}>
                      {student.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Assign button */}
              <TouchableOpacity
                onPress={handleAssignPath}
                disabled={!selectedPathId || selectedStudentIds.length === 0 || assigning}
                style={{
                  paddingVertical: 14, borderRadius: 12, alignItems: 'center',
                  backgroundColor: selectedPathId && selectedStudentIds.length > 0 ? '#00E6C3' : '#555',
                  opacity: assigning ? 0.6 : 1,
                }}
              >
                <Text fontSize="$4" fontWeight="bold" color="#000">
                  {assigning ? '...' : `${t('instructor.assignPath') || 'Assign'} (${selectedStudentIds.length})`}
                </Text>
              </TouchableOpacity>
            </YStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Note Modal */}
      <Modal visible={showNoteModal} transparent animationType="fade" onRequestClose={() => setShowNoteModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}
          activeOpacity={1}
          onPress={() => setShowNoteModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <YStack
              backgroundColor={isDark ? '#1A1A1A' : '#FFF'}
              borderRadius={20} padding="$4"
            >
              <Text fontSize="$5" fontWeight="bold" color={isDark ? '#FFF' : '#000'} marginBottom="$3">
                {t('instructor.notes') || 'Notes'}
              </Text>
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder={t('instructor.notePlaceholder') || 'e.g., Needs more highway practice...'}
                placeholderTextColor={isDark ? '#666' : '#AAA'}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                  color: isDark ? '#FFF' : '#000',
                  borderRadius: 12, padding: 12, fontSize: 14,
                  minHeight: 100, textAlignVertical: 'top',
                  borderWidth: 1, borderColor: isDark ? '#444' : '#E5E5E5',
                }}
              />
              <XStack gap="$2" marginTop="$3">
                <TouchableOpacity
                  onPress={() => setShowNoteModal(false)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: isDark ? '#333' : '#E5E5E5',
                  }}
                >
                  <Text color={isDark ? '#FFF' : '#000'}>{t('common.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveNote}
                  disabled={savingNote}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: '#00E6C3', opacity: savingNote ? 0.6 : 1,
                  }}
                >
                  <Text fontWeight="bold" color="#000">
                    {savingNote ? '...' : (t('common.save') || 'Save')}
                  </Text>
                </TouchableOpacity>
              </XStack>
            </YStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}
