import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import Svg, { Circle } from 'react-native-svg';

const RECOMMENDED_HOURS = 120;

interface DrivingLogEntry {
  id: string;
  date: string;
  duration_minutes: number;
  distance_km: number;
  supervisor_name?: string;
  notes?: string;
  signed: boolean;
  signed_by?: string;
  source: 'auto' | 'manual';
  route_id?: string;
  route_name?: string;
}

function HoursProgressCircle({ hours, target, size = 80 }: { hours: number; target: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(hours / target, 1);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="#333" strokeWidth={strokeWidth} fill="none"
      />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={progress >= 1 ? '#00E6C3' : '#0A84FF'}
        strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round" rotation="-90"
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
}

export function DrivingLogScreen() {
  const { user, profile } = useAuth();
  const { t, language } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';

  const [entries, setEntries] = useState<DrivingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Manual entry form
  const [manualDuration, setManualDuration] = useState('');
  const [manualDistance, setManualDistance] = useState('');
  const [manualSupervisor, setManualSupervisor] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Load auto-recorded routes
      const { data: routes } = await supabase
        .from('routes')
        .select('id, name, created_at, recording_stats')
        .eq('created_by', user.id)
        .not('recording_stats', 'is', null)
        .order('created_at', { ascending: false });

      const autoEntries: DrivingLogEntry[] = (routes || []).map((route: any) => {
        const stats = route.recording_stats || {};
        return {
          id: `auto-${route.id}`,
          date: route.created_at,
          duration_minutes: Math.round((stats.totalDuration || 0) / 60),
          distance_km: Math.round(((stats.totalDistance || 0) / 1000) * 10) / 10,
          route_id: route.id,
          route_name: route.name || 'Recorded Route',
          signed: false,
          source: 'auto' as const,
        };
      });

      // Load manual entries from daily_status where status = 'drove'
      const { data: dailyEntries } = await supabase
        .from('daily_status')
        .select('id, date, duration_minutes, distance_km, supervisor_name, notes, signed, signed_by, status')
        .eq('user_id', user.id)
        .eq('status', 'drove')
        .order('date', { ascending: false });

      const manualEntries: DrivingLogEntry[] = (dailyEntries || []).map((entry: any) => ({
        id: `manual-${entry.id}`,
        date: entry.date,
        duration_minutes: entry.duration_minutes || 0,
        distance_km: entry.distance_km || 0,
        supervisor_name: entry.supervisor_name,
        notes: entry.notes,
        signed: entry.signed || false,
        signed_by: entry.signed_by,
        source: 'manual' as const,
      }));

      // Merge and sort by date
      const allEntries = [...autoEntries, ...manualEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setEntries(allEntries);
    } catch (error) {
      console.error('Error loading driving log:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const totalHours = entries.reduce((s, e) => s + e.duration_minutes, 0) / 60;
  const totalDistance = entries.reduce((s, e) => s + e.distance_km, 0);
  const totalSessions = entries.length;
  const signedCount = entries.filter(e => e.signed).length;

  const handleAddManualEntry = async () => {
    if (!user?.id) return;
    const duration = parseInt(manualDuration);
    const distance = parseFloat(manualDistance);

    if (!duration || duration <= 0) {
      Alert.alert('Invalid', 'Please enter a valid duration');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('daily_status').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        status: 'drove',
        duration_minutes: duration,
        distance_km: distance || 0,
        supervisor_name: manualSupervisor || null,
        notes: manualNotes || null,
      });

      if (error) throw error;

      setShowAddModal(false);
      setManualDuration('');
      setManualDistance('');
      setManualSupervisor('');
      setManualNotes('');
      loadEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
      Alert.alert(t('common.error') || 'Error', 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const renderEntry = ({ item }: { item: DrivingLogEntry }) => (
    <XStack
      backgroundColor={isDark ? '#1A1A1A' : '#FFF'}
      borderRadius="$3"
      padding="$3"
      marginBottom="$2"
      borderWidth={1}
      borderColor={isDark ? '#333' : '#E5E5E5'}
      alignItems="center"
      gap="$3"
    >
      {/* Source icon */}
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        backgroundColor={item.source === 'auto' ? '#00E6C320' : '#0A84FF20'}
        justifyContent="center"
        alignItems="center"
      >
        <Feather
          name={item.source === 'auto' ? 'navigation' : 'edit-3'}
          size={16}
          color={item.source === 'auto' ? '#00E6C3' : '#0A84FF'}
        />
      </YStack>

      {/* Entry info */}
      <YStack flex={1}>
        <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#000'}>
          {item.route_name || formatDate(item.date)}
        </Text>
        <XStack gap="$2" marginTop="$1">
          <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
            {formatDuration(item.duration_minutes)}
          </Text>
          {item.distance_km > 0 && (
            <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
              {item.distance_km} km
            </Text>
          )}
          {item.supervisor_name && (
            <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
              w/ {item.supervisor_name}
            </Text>
          )}
        </XStack>
        {item.notes && (
          <Text fontSize="$1" color={isDark ? '#666' : '#999'} marginTop="$1" numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </YStack>

      {/* Date */}
      <YStack alignItems="flex-end">
        <Text fontSize="$2" color={isDark ? '#666' : '#999'}>
          {formatDate(item.date)}
        </Text>
        <XStack alignItems="center" gap="$1" marginTop="$1">
          <Feather
            name={item.signed ? 'check-circle' : 'circle'}
            size={12}
            color={item.signed ? '#00E6C3' : (isDark ? '#555' : '#CCC')}
          />
          <Text fontSize="$1" color={item.signed ? '#00E6C3' : (isDark ? '#555' : '#CCC')}>
            {item.signed ? (t('drivingLog.signed') || 'Signed') : (t('drivingLog.unsigned') || 'Unsigned')}
          </Text>
        </XStack>
      </YStack>
    </XStack>
  );

  if (loading) {
    return (
      <Screen>
        <Header title={t('drivingLog.title') || 'Driving Log'} showBack />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#00E6C3" />
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={language === 'sv' ? (t('drivingLog.korjournal') || 'Körjournal') : (t('drivingLog.title') || 'Driving Log')} showBack />

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={renderEntry}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$3">
            {/* Hours progress */}
            <XStack
              backgroundColor={isDark ? '#1A1A1A' : '#FFF'}
              borderRadius="$4"
              padding="$4"
              borderWidth={1}
              borderColor={isDark ? '#333' : '#E5E5E5'}
              alignItems="center"
              gap="$4"
            >
              <HoursProgressCircle hours={totalHours} target={RECOMMENDED_HOURS} />
              <YStack flex={1}>
                <Text fontSize="$7" fontWeight="bold" color={isDark ? '#FFF' : '#000'}>
                  {Math.round(totalHours * 10) / 10}h
                </Text>
                <Text fontSize="$3" color={isDark ? '#AAA' : '#666'}>
                  {t('drivingLog.recommended') || `Recommended: ${RECOMMENDED_HOURS}h`}
                </Text>
                <YStack
                  marginTop="$2"
                  height={4}
                  backgroundColor={isDark ? '#333' : '#E5E5E5'}
                  borderRadius={2}
                >
                  <YStack
                    height={4}
                    width={`${Math.min((totalHours / RECOMMENDED_HOURS) * 100, 100)}%`}
                    backgroundColor={totalHours >= RECOMMENDED_HOURS ? '#00E6C3' : '#0A84FF'}
                    borderRadius={2}
                  />
                </YStack>
              </YStack>
            </XStack>

            {/* Stat cards */}
            <XStack gap="$2">
              <DashboardStatCard
                value={Math.round(totalDistance)}
                label={t('drivingLog.totalDistance') || 'Total km'}
                icon="map"
                color="#0A84FF"
              />
              <DashboardStatCard
                value={totalSessions}
                label={t('drivingLog.totalSessions') || 'Sessions'}
                icon="list"
                color="#FF6B00"
              />
              <DashboardStatCard
                value={signedCount}
                label={t('drivingLog.signed') || 'Signed'}
                icon="check-circle"
                color="#00E6C3"
              />
            </XStack>

            {/* Add manual entry button */}
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: '#00E6C3',
              }}
            >
              <Feather name="plus" size={18} color="#000" />
              <Text fontSize="$3" fontWeight="600" color="#000">
                {t('drivingLog.addManualEntry') || 'Add Manual Entry'}
              </Text>
            </TouchableOpacity>
          </YStack>
        }
        ListEmptyComponent={
          <YStack alignItems="center" padding="$6" gap="$3">
            <Feather name="book" size={48} color={isDark ? '#444' : '#CCC'} />
            <Text fontSize="$4" color={isDark ? '#666' : '#999'} textAlign="center">
              {t('drivingLog.noEntries') || 'No driving log entries yet'}
            </Text>
          </YStack>
        }
      />

      {/* Add Manual Entry Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <YStack
              backgroundColor={isDark ? '#1A1A1A' : '#FFF'}
              borderTopLeftRadius={24}
              borderTopRightRadius={24}
              padding="$4"
            >
              <Text fontSize="$6" fontWeight="bold" color={isDark ? '#FFF' : '#000'} marginBottom="$4">
                {t('drivingLog.addManualEntry') || 'Add Manual Entry'}
              </Text>

              <YStack gap="$3">
                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#000'}>
                    {t('drivingLog.duration') || 'Duration (minutes)'} *
                  </Text>
                  <TextInput
                    value={manualDuration}
                    onChangeText={setManualDuration}
                    keyboardType="numeric"
                    placeholder="60"
                    placeholderTextColor={isDark ? '#555' : '#AAA'}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      color: isDark ? '#FFF' : '#000',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 16,
                      borderWidth: 1,
                      borderColor: isDark ? '#444' : '#E5E5E5',
                    }}
                  />
                </YStack>

                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#000'}>
                    {t('drivingLog.distance') || 'Distance (km)'}
                  </Text>
                  <TextInput
                    value={manualDistance}
                    onChangeText={setManualDistance}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={isDark ? '#555' : '#AAA'}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      color: isDark ? '#FFF' : '#000',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 16,
                      borderWidth: 1,
                      borderColor: isDark ? '#444' : '#E5E5E5',
                    }}
                  />
                </YStack>

                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#000'}>
                    {t('drivingLog.supervisor') || 'Supervisor'}
                  </Text>
                  <TextInput
                    value={manualSupervisor}
                    onChangeText={setManualSupervisor}
                    placeholder="Name"
                    placeholderTextColor={isDark ? '#555' : '#AAA'}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      color: isDark ? '#FFF' : '#000',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 16,
                      borderWidth: 1,
                      borderColor: isDark ? '#444' : '#E5E5E5',
                    }}
                  />
                </YStack>

                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#000'}>
                    {t('drivingLog.notes') || 'Notes'}
                  </Text>
                  <TextInput
                    value={manualNotes}
                    onChangeText={setManualNotes}
                    placeholder="Optional notes..."
                    placeholderTextColor={isDark ? '#555' : '#AAA'}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      color: isDark ? '#FFF' : '#000',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 16,
                      minHeight: 80,
                      textAlignVertical: 'top',
                      borderWidth: 1,
                      borderColor: isDark ? '#444' : '#E5E5E5',
                    }}
                  />
                </YStack>
              </YStack>

              <XStack gap="$2" marginTop="$4">
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: isDark ? '#333' : '#E5E5E5',
                  }}
                >
                  <Text color={isDark ? '#FFF' : '#000'}>{t('common.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddManualEntry}
                  disabled={saving}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: '#00E6C3',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text fontWeight="bold" color="#000">
                    {saving ? '...' : (t('common.save') || 'Save')}
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
