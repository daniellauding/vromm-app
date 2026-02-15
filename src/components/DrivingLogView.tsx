/**
 * DrivingLogView - Driving journal sub-view for DailyStatus sheet
 * Shows full driving log with all entries, hours progress, and manual entry
 * Used as sub-view navigation from DailyStatus (like LearningPaths → Exercises)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import Svg, { Circle } from 'react-native-svg';
import { Button } from './Button';

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

interface DrivingLogViewProps {
  onBack: () => void;
}

export function DrivingLogView({ onBack }: DrivingLogViewProps) {
  const { user } = useAuth();
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

      // Load manual entries
      const { data: manual } = await supabase
        .from('driving_log_manual')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      const manualEntries: DrivingLogEntry[] = (manual || []).map((entry: any) => ({
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

      const combined = [...autoEntries, ...manualEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setEntries(combined);
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

  const handleRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const totalHours = entries.reduce((sum, entry) => sum + entry.duration_minutes / 60, 0);

  const handleSaveManualEntry = async () => {
    if (!user?.id || !manualDuration || !manualDistance) {
      Alert.alert(
        language === 'sv' ? 'Saknade fält' : 'Missing fields',
        language === 'sv' ? 'Fyll i körtid och sträcka' : 'Fill in duration and distance'
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('driving_log_manual').insert({
        user_id: user.id,
        date: new Date().toISOString(),
        duration_minutes: parseInt(manualDuration, 10),
        distance_km: parseFloat(manualDistance),
        supervisor_name: manualSupervisor || null,
        notes: manualNotes || null,
        signed: false,
      });

      if (error) throw error;

      setShowAddModal(false);
      setManualDuration('');
      setManualDistance('');
      setManualSupervisor('');
      setManualNotes('');
      loadEntries();
    } catch (error) {
      console.error('Error saving manual entry:', error);
      Alert.alert(
        language === 'sv' ? 'Fel' : 'Error',
        language === 'sv' ? 'Kunde inte spara' : 'Could not save'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderEntry = ({ item }: { item: DrivingLogEntry }) => (
    <YStack
      padding="$3"
      marginBottom="$2"
      backgroundColor={isDark ? '#1A1A1A' : '#F8F8F8'}
      borderRadius={12}
      borderWidth={1}
      borderColor={isDark ? '#333' : '#E5E5E5'}
    >
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
        <XStack alignItems="center" gap="$2">
          <Feather
            name={item.source === 'auto' ? 'navigation' : 'edit-3'}
            size={16}
            color={isDark ? '#0A84FF' : '#007AFF'}
          />
          <Text fontSize="$3" fontWeight="600" color={isDark ? '#FFF' : '#000'}>
            {item.route_name || new Date(item.date).toLocaleDateString()}
          </Text>
        </XStack>
        {item.signed && (
          <Feather name="check-circle" size={16} color="#00E6C3" />
        )}
      </XStack>

      <XStack justifyContent="space-between" marginBottom="$1">
        <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
          {Math.floor(item.duration_minutes / 60)}h {item.duration_minutes % 60}min
        </Text>
        <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
          {item.distance_km} km
        </Text>
      </XStack>

      {item.supervisor_name && (
        <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
          {language === 'sv' ? 'Handledare' : 'Supervisor'}: {item.supervisor_name}
        </Text>
      )}

      {item.notes && (
        <Text fontSize="$2" color={isDark ? '#999' : '#777'} marginTop="$1">
          {item.notes}
        </Text>
      )}
    </YStack>
  );

  return (
    <>
      {/* Header with Back button */}
      <YStack
        paddingHorizontal="$4"
        paddingTop="$3"
        paddingBottom="$2"
        backgroundColor={isDark ? '#000' : '#FFF'}
        borderBottomWidth={1}
        borderBottomColor={isDark ? '#333' : '#E5E5E5'}
      >
        <XStack alignItems="center" gap="$3" marginBottom="$3">
          <TouchableOpacity onPress={onBack}>
            <Feather name="arrow-left" size={24} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
          <Text fontSize="$6" fontWeight="700" color={isDark ? '#FFF' : '#000'}>
            {language === 'sv' ? 'Körjournal' : 'Driving Log'}
          </Text>
        </XStack>

        {/* Progress Summary */}
        <XStack alignItems="center" justifyContent="space-between" paddingVertical="$3">
          <YStack gap="$1">
            <Text fontSize="$8" fontWeight="700" color={isDark ? '#FFF' : '#000'}>
              {Math.round(totalHours)}h
            </Text>
            <Text fontSize="$2" color={isDark ? '#AAA' : '#666'}>
              {language === 'sv' ? 'av' : 'of'} {RECOMMENDED_HOURS}h
            </Text>
          </YStack>
          <HoursProgressCircle hours={totalHours} target={RECOMMENDED_HOURS} size={80} />
        </XStack>
      </YStack>

      {/* Entries List */}
      <YStack flex={1} backgroundColor={isDark ? '#000' : '#FFF'}>
        {loading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" color={isDark ? '#FFF' : '#000'} />
          </YStack>
        ) : (
          <FlatList
            data={entries}
            renderItem={renderEntry}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 100,
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <YStack alignItems="center" justifyContent="center" paddingVertical="$6">
                <Feather name="book" size={48} color={isDark ? '#333' : '#CCC'} />
                <Text fontSize="$4" color={isDark ? '#666' : '#999'} marginTop="$3">
                  {language === 'sv' ? 'Inga körningar ännu' : 'No driving sessions yet'}
                </Text>
              </YStack>
            }
          />
        )}

        {/* Add Manual Entry Button */}
        <YStack
          position="absolute"
          bottom={20}
          right={20}
        >
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#0A84FF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Feather name="plus" size={24} color="#FFF" />
          </TouchableOpacity>
        </YStack>
      </YStack>

      {/* Add Manual Entry Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <YStack
          flex={1}
          backgroundColor="rgba(0,0,0,0.5)"
          justifyContent="flex-end"
        >
          <YStack
            backgroundColor={isDark ? '#1A1A1A' : '#FFF'}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding="$4"
            paddingBottom="$6"
          >
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize="$5" fontWeight="700" color={isDark ? '#FFF' : '#000'}>
                {language === 'sv' ? 'Lägg till körning' : 'Add Driving Session'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </XStack>

            <ScrollView>
              <YStack gap="$3">
                <YStack gap="$2">
                  <Text fontSize="$3" color={isDark ? '#AAA' : '#666'}>
                    {language === 'sv' ? 'Körtid (minuter)' : 'Duration (minutes)'}
                  </Text>
                  <TextInput
                    value={manualDuration}
                    onChangeText={setManualDuration}
                    keyboardType="numeric"
                    placeholder="60"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      borderRadius: 8,
                      padding: 12,
                      color: isDark ? '#FFF' : '#000',
                      fontSize: 16,
                    }}
                  />
                </YStack>

                <YStack gap="$2">
                  <Text fontSize="$3" color={isDark ? '#AAA' : '#666'}>
                    {language === 'sv' ? 'Sträcka (km)' : 'Distance (km)'}
                  </Text>
                  <TextInput
                    value={manualDistance}
                    onChangeText={setManualDistance}
                    keyboardType="numeric"
                    placeholder="10.5"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      borderRadius: 8,
                      padding: 12,
                      color: isDark ? '#FFF' : '#000',
                      fontSize: 16,
                    }}
                  />
                </YStack>

                <YStack gap="$2">
                  <Text fontSize="$3" color={isDark ? '#AAA' : '#666'}>
                    {language === 'sv' ? 'Handledare' : 'Supervisor'}
                  </Text>
                  <TextInput
                    value={manualSupervisor}
                    onChangeText={setManualSupervisor}
                    placeholder={language === 'sv' ? 'Namnet på handledaren' : 'Supervisor name'}
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      borderRadius: 8,
                      padding: 12,
                      color: isDark ? '#FFF' : '#000',
                      fontSize: 16,
                    }}
                  />
                </YStack>

                <YStack gap="$2">
                  <Text fontSize="$3" color={isDark ? '#AAA' : '#666'}>
                    {language === 'sv' ? 'Anteckningar' : 'Notes'}
                  </Text>
                  <TextInput
                    value={manualNotes}
                    onChangeText={setManualNotes}
                    placeholder={language === 'sv' ? 'Valfri kommentar' : 'Optional notes'}
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      borderRadius: 8,
                      padding: 12,
                      color: isDark ? '#FFF' : '#000',
                      fontSize: 16,
                      height: 80,
                      textAlignVertical: 'top',
                    }}
                  />
                </YStack>

                <Button
                  onPress={handleSaveManualEntry}
                  disabled={saving || !manualDuration || !manualDistance}
                  variant="primary"
                  size="lg"
                  marginTop="$3"
                >
                  {saving
                    ? (language === 'sv' ? 'Sparar...' : 'Saving...')
                    : (language === 'sv' ? 'Spara' : 'Save')}
                </Button>
              </YStack>
            </ScrollView>
          </YStack>
        </YStack>
      </Modal>
    </>
  );
}
