import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Button, Input } from 'tamagui';
import { TouchableOpacity, View, Modal, Alert, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useTranslation } from '../../contexts/TranslationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DayProgress {
  day: string;
  date: string;
  completed: boolean;
  progress: number;
  exercises: number;
}

interface WeeklyGoalProps {
  activeUserId?: string | null;
}

interface GoalSettings {
  dailyGoal: number;
  goalType: 'weekly' | 'monthly';
  weeklyTarget: number;
  monthlyTarget: number;
}

// ProgressCircle component for individual days
const DayProgressCircle = ({ 
  progress, 
  size = 32, 
  color = '#00E6C3', 
  bg = '#E5E5E5',
  completed = false 
}: {
  progress: number;
  size?: number;
  color?: string;
  bg?: string;
  completed?: boolean;
}) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = Math.max(0, Math.min(progress, 1));
  
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bg}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={completed ? '#4CAF50' : color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progressValue)}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
};

export function WeeklyGoal({ activeUserId }: WeeklyGoalProps) {
  const { user, profile } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  
  const [weeklyProgress, setWeeklyProgress] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(5); // Default goal: 5 exercises per week
  
  // Goal settings modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({
    dailyGoal: 5,
    goalType: 'weekly',
    weeklyTarget: 35, // 5 exercises × 7 days
    monthlyTarget: 150 // 5 exercises × 30 days
  });
  const [tempGoalSettings, setTempGoalSettings] = useState<GoalSettings>(goalSettings);
  
  // Use effective user ID (activeUserId prop, activeStudentId from context, or current user)
  const effectiveUserId = activeUserId || activeStudentId || user?.id || null;
  
  // Get current week's dates (Monday to Sunday)
  const getCurrentWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Handle Sunday as start of week
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    
    return weekDates;
  };
  
  // Load weekly progress data
  const loadWeeklyProgress = async () => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const weekDates = getCurrentWeekDates();
      
      // Get user's exercise completions for this week
      const startOfWeek = weekDates[0];
      const endOfWeek = weekDates[6];
      endOfWeek.setHours(23, 59, 59, 999); // End of Sunday
      
      const { data: completions, error } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id, created_at')
        .eq('user_id', effectiveUserId)
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString());
      
      if (error) {
        console.error('Error loading weekly progress:', error);
        setLoading(false);
        return;
      }
      
      // Group completions by date
      const completionsByDate: Record<string, number> = {};
      completions?.forEach(completion => {
        const date = new Date(completion.created_at).toDateString();
        completionsByDate[date] = (completionsByDate[date] || 0) + 1;
      });
      
      // Create day progress data
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const progressData: DayProgress[] = weekDates.map((date, index) => {
        const dateString = date.toDateString();
        const exercises = completionsByDate[dateString] || 0;
        const completed = exercises >= weeklyGoal;
        const progress = Math.min(exercises / weeklyGoal, 1);
        
        return {
          day: dayNames[index],
          date: date.toISOString().split('T')[0],
          completed,
          progress,
          exercises
        };
      });
      
      setWeeklyProgress(progressData);
      console.log('🔍 [WeeklyGoal] Loaded weekly progress:', progressData);
    } catch (error) {
      console.error('Error loading weekly progress:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load progress when user changes
  useEffect(() => {
    loadWeeklyProgress();
  }, [effectiveUserId, weeklyGoal]);
  
  // Load goal settings from AsyncStorage
  const loadGoalSettings = async () => {
    if (!effectiveUserId) return;
    
    try {
      const settingsKey = `weekly_goal_settings_${effectiveUserId}`;
      const saved = await AsyncStorage.getItem(settingsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setGoalSettings(parsed);
        setTempGoalSettings(parsed);
        setWeeklyGoal(parsed.dailyGoal);
        console.log('🔍 [WeeklyGoal] Loaded goal settings:', parsed);
      }
    } catch (error) {
      console.error('Error loading goal settings:', error);
    }
  };
  
  // Save goal settings to AsyncStorage
  const saveGoalSettings = async (settings: GoalSettings) => {
    if (!effectiveUserId) return;
    
    try {
      const settingsKey = `weekly_goal_settings_${effectiveUserId}`;
      await AsyncStorage.setItem(settingsKey, JSON.stringify(settings));
      setGoalSettings(settings);
      setWeeklyGoal(settings.dailyGoal);
      console.log('🔍 [WeeklyGoal] Saved goal settings:', settings);
    } catch (error) {
      console.error('Error saving goal settings:', error);
    }
  };
  
  // Load settings on mount
  useEffect(() => {
    loadGoalSettings();
  }, [effectiveUserId]);
  
  // Handle goal settings modal
  const openGoalModal = () => {
    setTempGoalSettings(goalSettings);
    setShowGoalModal(true);
  };
  
  const closeGoalModal = () => {
    setShowGoalModal(false);
    setTempGoalSettings(goalSettings);
  };
  
  const saveGoalSettingsAndClose = () => {
    if (tempGoalSettings.dailyGoal < 1 || tempGoalSettings.dailyGoal > 50) {
      Alert.alert('Invalid Goal', 'Daily goal must be between 1 and 50 exercises.');
      return;
    }
    
    const newSettings = {
      ...tempGoalSettings,
      weeklyTarget: tempGoalSettings.dailyGoal * 7,
      monthlyTarget: tempGoalSettings.dailyGoal * 30
    };
    
    saveGoalSettings(newSettings);
    setShowGoalModal(false);
  };
  
  // Calculate weekly stats
  const completedDays = weeklyProgress.filter(day => day.completed).length;
  const totalExercises = weeklyProgress.reduce((sum, day) => sum + day.exercises, 0);
  const weeklyProgressPercent = (completedDays / 7) * 100;
  
  if (loading) {
    return null;
  }
  
  return (
    <YStack 
      backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#F8F8F8'}
      marginHorizontal="$4"
      marginBottom="$4"
      padding="$4"
      borderRadius="$4"
      borderWidth={1}
      borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
    >
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <YStack>
          <Text fontSize="$5" fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
            Weekly Goal
          </Text>
          <Text fontSize="$3" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
            {completedDays}/7 days • {totalExercises} exercises
          </Text>
        </YStack>
        
        {/* Settings button */}
        <TouchableOpacity
          onPress={openGoalModal}
          style={{
            padding: 8,
            borderRadius: 20,
            backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
          }}
        >
          <Feather name="settings" size={16} color={colorScheme === 'dark' ? '#CCC' : '#666'} />
        </TouchableOpacity>
        
        {/* Weekly progress indicator */}
        <View style={{ position: 'relative' }}>
          <DayProgressCircle 
            progress={weeklyProgressPercent / 100} 
            size={40}
            color="#00E6C3"
            bg={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
          />
          <Text 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 40,
              height: 40,
              textAlign: 'center',
              textAlignVertical: 'center',
              lineHeight: 40,
              fontSize: 10,
              fontWeight: 'bold',
              color: colorScheme === 'dark' ? '#FFF' : '#000'
            }}
          >
            {Math.round(weeklyProgressPercent)}%
          </Text>
        </View>
      </XStack>
      
      {/* Days of the week */}
      <XStack justifyContent="space-between" alignItems="center">
        {weeklyProgress.map((day, index) => (
          <YStack key={day.date} alignItems="center" gap="$1" flex={1}>
            {/* Day circle */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ alignItems: 'center' }}
            >
              <DayProgressCircle
                progress={day.progress}
                size={32}
                color={day.completed ? '#4CAF50' : '#00E6C3'}
                bg={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                completed={day.completed}
              />
              {day.exercises > 0 && (
                <Text 
                  fontSize={8} 
                  fontWeight="bold" 
                  color={day.completed ? '#4CAF50' : '#00E6C3'}
                  style={{ position: 'absolute', top: 8 }}
                >
                  {day.exercises}
                </Text>
              )}
            </TouchableOpacity>
            
            {/* Day name */}
            <Text 
              fontSize="$2" 
              color={colorScheme === 'dark' ? '#CCC' : '#666'}
              fontWeight={day.completed ? 'bold' : 'normal'}
            >
              {day.day}
            </Text>
            
            {/* Date */}
            <Text 
              fontSize="$1" 
              color={colorScheme === 'dark' ? '#999' : '#999'}
            >
              {new Date(day.date).getDate()}
            </Text>
          </YStack>
        ))}
      </XStack>
      
      {/* Goal info */}
      <XStack 
        justifyContent="center" 
        alignItems="center" 
        marginTop="$3"
        padding="$2"
        backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0'}
        borderRadius="$2"
      >
        <Feather 
          name="target" 
          size={14} 
          color={colorScheme === 'dark' ? '#CCC' : '#666'} 
        />
        <Text 
          fontSize="$2" 
          color={colorScheme === 'dark' ? '#CCC' : '#666'}
          marginLeft="$2"
        >
          Goal: {weeklyGoal} exercises per day
        </Text>
      </XStack>
      
      {/* Goal Settings Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="fade"
        onRequestClose={closeGoalModal}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={closeGoalModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
            }}
          >
            {/* Modal Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize="$6" fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                Goal Settings
              </Text>
              <TouchableOpacity onPress={closeGoalModal}>
                <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
              </TouchableOpacity>
            </XStack>
            
            {/* Daily Goal Input */}
            <YStack gap="$3" marginBottom="$4">
              <Text fontSize="$4" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                Daily Exercise Goal
              </Text>
              <Input
                value={tempGoalSettings.dailyGoal.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  setTempGoalSettings(prev => ({
                    ...prev,
                    dailyGoal: num,
                    weeklyTarget: num * 7,
                    monthlyTarget: num * 30
                  }));
                }}
                keyboardType="numeric"
                placeholder="Enter daily goal"
                backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                borderColor={colorScheme === 'dark' ? '#444' : '#E5E5E5'}
                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                fontSize="$4"
                padding="$3"
              />
              <Text fontSize="$2" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                Target: {tempGoalSettings.dailyGoal * 7} exercises per week, {tempGoalSettings.dailyGoal * 30} per month
              </Text>
            </YStack>
            
            {/* Goal Type Selection */}
            <YStack gap="$3" marginBottom="$4">
              <Text fontSize="$4" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                Goal Type
              </Text>
              <XStack gap="$2">
                <TouchableOpacity
                  onPress={() => setTempGoalSettings(prev => ({ ...prev, goalType: 'weekly' }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: tempGoalSettings.goalType === 'weekly' 
                      ? '#00E6C3' 
                      : colorScheme === 'dark' ? '#333' : '#F5F5F5',
                    alignItems: 'center',
                  }}
                >
                  <Text 
                    color={tempGoalSettings.goalType === 'weekly' ? '#000' : (colorScheme === 'dark' ? '#FFF' : '#000')}
                    fontWeight={tempGoalSettings.goalType === 'weekly' ? 'bold' : 'normal'}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTempGoalSettings(prev => ({ ...prev, goalType: 'monthly' }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: tempGoalSettings.goalType === 'monthly' 
                      ? '#00E6C3' 
                      : colorScheme === 'dark' ? '#333' : '#F5F5F5',
                    alignItems: 'center',
                  }}
                >
                  <Text 
                    color={tempGoalSettings.goalType === 'monthly' ? '#000' : (colorScheme === 'dark' ? '#FFF' : '#000')}
                    fontWeight={tempGoalSettings.goalType === 'monthly' ? 'bold' : 'normal'}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
              </XStack>
            </YStack>
            
            {/* Action Buttons */}
            <XStack gap="$3" justifyContent="center">
              <TouchableOpacity
                onPress={closeGoalModal}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                  alignItems: 'center',
                }}
              >
                <Text color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveGoalSettingsAndClose}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#00E6C3',
                  alignItems: 'center',
                }}
              >
                <Text color="#000" fontWeight="bold">
                  Save Goals
                </Text>
              </TouchableOpacity>
            </XStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </YStack>
  );
}
