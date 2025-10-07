import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TouchableOpacity, Alert, Animated, Pressable, Dimensions, Modal, View, ScrollView } from 'react-native';
import { XStack, YStack, Text, Button, Input, useTheme } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { LearningPathsSheet } from '../../components/LearningPathsSheet';
import { ExerciseListSheet } from '../../components/ExerciseListSheet';
import { RouteListSheet } from '../../components/RouteListSheet';
import { CreateRouteSheet } from '../../components/CreateRouteSheet';
import { RecordDrivingSheet } from '../../components/RecordDrivingSheet';
import { RouteDetailSheet } from '../../components/RouteDetailSheet';
import { ActionSheet } from '../../components/ActionSheet';

interface DailyStatusData {
  id?: string;
  status: 'drove' | 'didnt_drive';
  how_it_went?: string;
  challenges?: string;
  notes?: string;
  driving_time_minutes?: number;
  distance_km?: number;
  car_type?: string;
  rating?: number; // 1-5 scale
}

interface DailyStatusProps {
  activeUserId?: string;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function DailyStatus({ activeUserId, selectedDate: externalSelectedDate, onDateChange }: DailyStatusProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { t, language: lang } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme || 'light';
  const insets = useSafeAreaInsets();
  
  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  const effectiveUserId = activeUserId || profile?.id;
  
  const [showSheet, setShowSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<DailyStatusData | null>(null);
  const [formData, setFormData] = useState<DailyStatusData>({
    status: 'drove',
    how_it_went: '',
    challenges: '',
    notes: '',
    driving_time_minutes: 0,
    distance_km: 0,
    car_type: '',
    rating: 3
  });
  
  // Date navigation state - use external date if provided
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date());
  const selectedDate = externalSelectedDate || internalSelectedDate;
  const [pastStatuses, setPastStatuses] = useState<{[key: string]: DailyStatusData | null}>({});

  // Learning content sheet states
  const [showLearningPathsSheet, setShowLearningPathsSheet] = useState(false);
  const [showExerciseListSheet, setShowExerciseListSheet] = useState(false);
  const [selectedLearningPath, setSelectedLearningPath] = useState<any | null>(null);
  const [cameFromDailyStatus, setCameFromDailyStatus] = useState(false);

  // Route integration sheet states
  const [showRouteListSheet, setShowRouteListSheet] = useState(false);
  const [routeCameFromDailyStatus, setRouteCameFromDailyStatus] = useState(false);

  // Create route and record driving sheet states
  const [showCreateRouteSheet, setShowCreateRouteSheet] = useState(false);
  const [createRouteCameFromDailyStatus, setCreateRouteCameFromDailyStatus] = useState(false);
  const [showRecordDrivingSheet, setShowRecordDrivingSheet] = useState(false);
  const [recordDrivingCameFromDailyStatus, setRecordDrivingCameFromDailyStatus] = useState(false);

  // Route detail sheet state
  const [showRouteDetailSheet, setShowRouteDetailSheet] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Action sheet state
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Sheet snap points and gesture handling
  const { height: screenHeight } = Dimensions.get('window');
  const snapPoints = useMemo(() => ({
    large: screenHeight * 0.1,   // Show 90% of sheet
    medium: screenHeight * 0.4,  // Show 60% of sheet  
    small: screenHeight * 0.7,   // Show 30% of sheet
    dismissed: screenHeight,     // Completely hidden
  }), [screenHeight]);

  const sheetTranslateY = useSharedValue(screenHeight);
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);

  // Tab system for organizing content
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'routes'>('basic');
  
  // Vehicle types from database (like ProgressScreen)
  const [vehicleTypes, setVehicleTypes] = useState<Array<{value: string; label: {en: string; sv: string}}>>([]); 

  // Update internal date when external date changes
  useEffect(() => {
    if (externalSelectedDate) {
      setInternalSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);
  
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  // Load status for selected date
  const loadStatusForDate = async (date: Date) => {
    if (!effectiveUserId) return;
    
    const dateString = date.toISOString().split('T')[0];
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_status')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('date', dateString)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading daily status:', error);
        return;
      }
      
      if (data) {
        setPastStatuses(prev => ({ ...prev, [dateString]: data }));
        if (dateString === todayString) {
          setTodayStatus(data);
        }
        setFormData({
          status: data.status as 'drove' | 'didnt_drive',
          how_it_went: data.how_it_went || '',
          challenges: data.challenges || '',
          notes: data.notes || '',
          driving_time_minutes: data.driving_time_minutes || 0,
          distance_km: data.distance_km || 0,
          car_type: data.car_type || '',
          rating: data.rating || 3
        });
      } else {
        setPastStatuses(prev => ({ ...prev, [dateString]: null }));
        if (dateString === todayString) {
          setTodayStatus(null);
        }
        setFormData({
          status: 'drove',
          how_it_went: '',
          challenges: '',
          notes: '',
          driving_time_minutes: 0,
          distance_km: 0,
          car_type: '',
          rating: 3
        });
      }
    } catch (error) {
      console.error('Error loading daily status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load today's status (alias for backward compatibility)
  const loadTodayStatus = () => loadStatusForDate(today);

  // Date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    if (!externalSelectedDate) {
      setInternalSelectedDate(newDate);
    }
    if (onDateChange) {
      onDateChange(newDate);
    }
    loadStatusForDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (!externalSelectedDate) {
      setInternalSelectedDate(newDate);
    }
    if (onDateChange) {
      onDateChange(newDate);
    }
    loadStatusForDate(newDate);
  };

  const goToToday = () => {
    if (!externalSelectedDate) {
      setInternalSelectedDate(today);
    }
    if (onDateChange) {
      onDateChange(today);
    }
    loadStatusForDate(today);
  };

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isFuture = selectedDate > today;
  
  // Route navigation helper functions
  const handleNavigateToMap = () => {
    console.log('🗺️ [DailyStatus] Navigating to MapScreen from DailyStatus modal');
    
    // Hide DailyStatus modal first
    setShowSheet(false);
    
    // Navigate to MapTab after smooth transition
    setTimeout(() => {
      (navigation as any).navigate('MainTabs', {
        screen: 'MapTab',
        params: {
          screen: 'MapScreen',
          params: {
            fromDailyStatus: true,
            selectedDate: selectedDate.toISOString(),
          },
        },
      });
    }, 200);
  };

  const handleOpenRouteList = () => {
    console.log('📋 [DailyStatus] Opening RouteListSheet from DailyStatus modal');
    
    // Hide DailyStatus modal first
    setShowSheet(false);
    
    // Set flag to remember we came from DailyStatus
    setRouteCameFromDailyStatus(true);
    
    // Show RouteListSheet after a brief delay for smooth transition
    setTimeout(() => {
      setShowRouteListSheet(true);
    }, 200);
  };

  const handleOpenActionSheet = () => {
    console.log('⚡ [DailyStatus] Opening ActionSheet from DailyStatus modal');
    
    // Hide DailyStatus modal first
    setShowSheet(false);
    
    // Show ActionSheet after a brief delay for smooth transition
    setTimeout(() => {
      setShowActionSheet(true);
    }, 200);
  };

  const handleRoutePress = (routeId: string) => {
    console.log('🗺️ [DailyStatus] Route pressed, opening RouteDetailSheet:', routeId);
    
    // Close RouteListSheet first
    setShowRouteListSheet(false);
    setRouteCameFromDailyStatus(false);
    
    // Set selected route and show RouteDetailSheet
    setSelectedRouteId(routeId);
    setTimeout(() => {
      setShowRouteDetailSheet(true);
    }, 200);
  };
  
  // Save daily status
  const saveDailyStatus = async () => {
    if (!effectiveUserId) return;
    
    // Don't allow saving for future dates
    if (isFuture) {
      showToast({
        title: 'Cannot Save',
        message: 'Come back on this day to share your status!',
        type: 'info'
      });
      return;
    }
    
    try {
      setLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_status')
        .upsert({
          user_id: effectiveUserId,
          date: dateString,
          status: formData.status,
          how_it_went: formData.how_it_went || null,
          challenges: formData.challenges || null,
          notes: formData.notes || null,
          driving_time_minutes: formData.driving_time_minutes || null,
          distance_km: formData.distance_km || null,
          car_type: formData.car_type || null,
          rating: formData.rating || null
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving daily status:', error);
        Alert.alert('Error', 'Failed to save your status. Please try again.');
        return;
      }
      
      // Update the status in our state
      setPastStatuses(prev => ({ ...prev, [dateString]: data }));
      if (isToday) {
        setTodayStatus(data);
      }
      setShowSheet(false);
      showToast({
        title: 'Success',
        message: 'Your daily status has been saved!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving daily status:', error);
      Alert.alert('Error', 'Failed to save your status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadTodayStatus();
    loadVehicleTypes();
  }, [effectiveUserId]);

  // Load vehicle types from database (like ProgressScreen)
  const loadVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_path_categories')
        .select('value, label, order_index')
        .eq('category', 'vehicle_type')
        .order('order_index', { ascending: true });

      if (!error && data) {
        setVehicleTypes(data);
        console.log('🚗 [DailyStatus] Loaded vehicle types:', data.length);
      }
    } catch (error) {
      console.error('Error loading vehicle types:', error);
      // Fallback vehicle types
      setVehicleTypes([
        { value: 'övningsbil', label: { en: 'Training Car', sv: 'Övningsbil' } },
        { value: 'privat_bil', label: { en: 'Private Car', sv: 'Privat bil' } },
        { value: 'förarens_bil', label: { en: 'Instructor Car', sv: 'Förarens bil' } },
        { value: 'annan', label: { en: 'Other', sv: 'Annan' } },
      ]);
    }
  };

  useEffect(() => {
    loadStatusForDate(selectedDate);
    
    // Only close all sheets if switching to a future date
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isFuture = selectedDate > today;
    if (isFuture) {
      console.log('🎯 [DailyStatus] Future date selected - closing all sheets');
      setShowLearningPathsSheet(false);
      setShowExerciseListSheet(false);
      setSelectedLearningPath(null);
      setShowRouteListSheet(false);
      setRouteCameFromDailyStatus(false);
      setShowRouteDetailSheet(false);
      setSelectedRouteId(null);
      setShowActionSheet(false);
    }
  }, [selectedDate, effectiveUserId]);

  // Note: DailyStatus doesn't need real-time subscriptions
  // It's a personal tracking component that only needs to refresh when user interacts with it

  // Pan gesture for drag-to-resize
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const { translationY } = event;
      const newPosition = currentSnapPoint + translationY;
      
      // Constrain to snap points range
      const minPosition = snapPoints.large;
      const maxPosition = snapPoints.small + 100;
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);
      
      sheetTranslateY.value = boundedPosition;
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const currentPosition = currentSnapPoint + translationY;
      
      // Dismiss if dragged down far enough
      if (currentPosition > snapPoints.small + 30 && velocityY > 200) {
        runOnJS(() => setShowSheet(false))();
        return;
      }
      
      // Find closest snap point
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.small;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }
      
      sheetTranslateY.value = withSpring(targetSnapPoint, {
        damping: 25,
        stiffness: 300,
        overshootClamping: true, // Prevents bouncing/overshoot
      });
      runOnJS(setCurrentSnapPoint)(targetSnapPoint);
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Animation effects - NO BOUNCING, smooth spring animations
  useEffect(() => {
    if (showSheet) {
      sheetTranslateY.value = withSpring(snapPoints.large, {
        damping: 25,
        stiffness: 300,
        overshootClamping: true, // Prevents bouncing/overshoot
      });
      setCurrentSnapPoint(snapPoints.large);
      
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      sheetTranslateY.value = withSpring(snapPoints.dismissed, {
        damping: 25,
        stiffness: 300,
        overshootClamping: true, // Prevents bouncing/overshoot
      });
      
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showSheet, backdropOpacity, snapPoints]);
  
  const getStatusIcon = () => {
    if (!todayStatus) return 'help-circle';
    return todayStatus.status === 'drove' ? 'check-circle' : 'x-circle';
  };
  
  const getStatusColor = () => {
    if (!todayStatus) return colorScheme === 'dark' ? '#666' : '#999';
    return todayStatus.status === 'drove' ? '#4CAF50' : '#F44336';
  };
  
  const getStatusText = () => {
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    const status = pastStatuses[selectedDateString];
    
    if (!status) {
      if (isToday) return 'Har du kört idag?';
      if (isFuture) return 'Framtida datum';
      return `Har du kört ${selectedDate.toLocaleDateString('sv-SE')}?`;
    }
    
    const dateText = isToday ? 'idag' : selectedDate.toLocaleDateString('sv-SE');
    return status.status === 'drove' ? `Ja, jag körde ${dateText}!` : `Nej, jag körde inte ${dateText}`;
  };

  const getStatusForSelectedDate = () => {
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    return pastStatuses[selectedDateString] || null;
  };
  
  return (
    <>
      {/* Daily Status Input-like Box */}
      <View
        style={{
          backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F8F8F8',
          borderRadius: 16,
          padding: 12,
          marginBottom: 12,
          borderWidth: 1,
          marginHorizontal: 16,
          borderColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
        }}
      >

        {/* Status Content - Flat Input Style */}
        <TouchableOpacity
          onPress={() => setShowSheet(true)}
          disabled={isFuture}
        >
          <XStack alignItems="center" gap="$2">
              <YStack flex={1}>
                <Text 
                fontSize="$3" 
                fontWeight="400" 
                color={
                  getStatusForSelectedDate() 
                    ? (colorScheme === 'dark' ? '#FFF' : '#000')
                    : (colorScheme === 'dark' ? '#666' : '#999')
                }
                numberOfLines={1}
              >
                {getStatusForSelectedDate() 
                  ? getStatusText()
                  : 'Did you drive today? Share your thoughts!'
                }
                </Text>
              
                {getStatusForSelectedDate()?.how_it_went && (
                  <Text 
                    fontSize="$2" 
                  color={colorScheme === 'dark' ? '#999' : '#666'}
                    numberOfLines={1}
                  marginTop="$0.5"
                  >
                    {getStatusForSelectedDate()?.how_it_went}
                  </Text>
                )}
              </YStack>
            {/* Only show icon if no status is shared */}
            {/* {!getStatusForSelectedDate() && ( */}
                <Feather 
                name="message-circle" 
                size={20} 
                color={colorScheme === 'dark' ? '#666' : '#999'} 
              />
            {/* )} */}
          </XStack>
        </TouchableOpacity>
      </View>
      
      
      {/* Status Sheet */}
      {showSheet && (
        <Modal
          visible={showSheet}
          transparent
          animationType="none"
          onRequestClose={() => setShowSheet(false)}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: backdropOpacity,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setShowSheet(false)} />
            <GestureDetector gesture={panGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                position: 'absolute',
                    top: 0,
                left: 0,
                right: 0,
                    height: screenHeight,
                    backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                  },
                  animatedSheetStyle,
                ]}
            >
              <YStack
                padding="$3"
                paddingBottom={insets.bottom || 16}
                gap="$3"
                  flex={1}
                >
                  {/* Drag Handle */}
                  <View style={{
                    width: 40,
                    height: 4,
                    backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                    borderRadius: 2,
                    alignSelf: 'center',
                    marginVertical: 8,
                  }} />
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack>
                    <Text fontSize="$5" fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                      {isToday ? 'Har du kört idag?' : `Har du kört ${selectedDate.toLocaleDateString('sv-SE')}?`}
                    </Text>
                    {!isToday && (
                      <Text fontSize="$2" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                        {isFuture ? 'Framtida datum - kan inte spara' : 'Redigera tidigare status'}
                      </Text>
                    )}
                  </YStack>
                  <TouchableOpacity onPress={() => setShowSheet(false)}>
                    <Feather name="x" size={20} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
                  </TouchableOpacity>
                </XStack>
                
                {/* Tab Navigation */}
                <XStack gap="$2" padding="$2" backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'} borderRadius="$3">
                  {[
                    { key: 'basic', label: 'Basic', icon: 'edit-3' },
                    { key: 'details', label: 'Details', icon: 'bar-chart-2' },
                    { key: 'routes', label: 'Routes', icon: 'map' },
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setActiveTab(tab.key as any)}
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: activeTab === tab.key 
                          ? '#00E6C3' 
                          : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <XStack alignItems="center" gap="$1">
                        <Feather 
                          name={tab.icon as any} 
                          size={16} 
                          color={activeTab === tab.key ? '#000' : (colorScheme === 'dark' ? '#FFF' : '#666')} 
                        />
                        <Text 
                          fontSize="$2" 
                          fontWeight={activeTab === tab.key ? 'bold' : 'normal'}
                          color={activeTab === tab.key ? '#000' : (colorScheme === 'dark' ? '#FFF' : '#666')}
                        >
                          {tab.label}
                        </Text>
                      </XStack>
                    </TouchableOpacity>
                  ))}
                </XStack>
                
                {/* Scrollable Content */}
                <ScrollView 
                  style={{ flex: 1 }} 
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <YStack gap="$3">
                    {/* Basic Tab */}
                    {activeTab === 'basic' && (
                      <YStack gap="$3">
                  {/* Status Selection */}
                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                      Status
                    </Text>
                    
                    <XStack gap="$2">
                      <TouchableOpacity
                        onPress={() => setFormData(prev => ({ ...prev, status: 'drove' }))}
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 6,
                          backgroundColor: formData.status === 'drove' 
                            ? '#4CAF50' 
                            : (colorScheme === 'dark' ? '#333' : '#E5E5E5'),
                          borderWidth: 1,
                          borderColor: formData.status === 'drove' 
                            ? '#4CAF50' 
                            : (colorScheme === 'dark' ? '#555' : '#CCC'),
                        }}
                      >
                        <XStack alignItems="center" justifyContent="center" gap="$1.5">
                          <Feather 
                            name="check-circle" 
                            size={14} 
                            color={formData.status === 'drove' ? '#FFF' : (colorScheme === 'dark' ? '#CCC' : '#666')} 
                          />
                          <Text 
                            fontSize="$2" 
                            fontWeight="600"
                            color={formData.status === 'drove' ? '#FFF' : (colorScheme === 'dark' ? '#CCC' : '#666')}
                          >
                            Ja, jag körde
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => setFormData(prev => ({ ...prev, status: 'didnt_drive' }))}
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 6,
                          backgroundColor: formData.status === 'didnt_drive' 
                            ? '#F44336' 
                            : (colorScheme === 'dark' ? '#333' : '#E5E5E5'),
                          borderWidth: 1,
                          borderColor: formData.status === 'didnt_drive' 
                            ? '#F44336' 
                            : (colorScheme === 'dark' ? '#555' : '#CCC'),
                        }}
                      >
                        <XStack alignItems="center" justifyContent="center" gap="$1.5">
                          <Feather 
                            name="x-circle" 
                            size={14} 
                            color={formData.status === 'didnt_drive' ? '#FFF' : (colorScheme === 'dark' ? '#CCC' : '#666')} 
                          />
                          <Text 
                            fontSize="$2" 
                            fontWeight="600"
                            color={formData.status === 'didnt_drive' ? '#FFF' : (colorScheme === 'dark' ? '#CCC' : '#666')}
                          >
                            Nej, körde inte
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                    </XStack>
                  </YStack>
                  
                  {/* How it went */}
                  <YStack gap="$1.5">
                    <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                      Hur gick det?
                    </Text>
                    <Input
                      placeholder="Berätta hur det gick..."
                      value={formData.how_it_went}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, how_it_went: text }))}
                      multiline
                      numberOfLines={2}
                      backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
                      borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                      color={colorScheme === 'dark' ? '#FFF' : '#000'}
                      padding="$2"
                    />
                  </YStack>
                  
                  {/* Challenges */}
                  <YStack gap="$1.5">
                    <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                      Utmaningar?
                    </Text>
                    <Input
                      placeholder="Vad var utmanande?"
                      value={formData.challenges}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, challenges: text }))}
                      multiline
                      numberOfLines={2}
                      backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
                      borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                      color={colorScheme === 'dark' ? '#FFF' : '#000'}
                      padding="$2"
                    />
                  </YStack>
                  
                  {/* Notes */}
                  <YStack gap="$1.5">
                    <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                      Anteckningar
                    </Text>
                    <Input
                      placeholder="Ytterligare anteckningar..."
                      value={formData.notes}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                      multiline
                      numberOfLines={2}
                      backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
                      borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                      color={colorScheme === 'dark' ? '#FFF' : '#000'}
                      padding="$2"
                    />
                  </YStack>
                  
                        {/* Exercise Learning Button - Show for today and past dates */}
                        {!isFuture && (
                          <TouchableOpacity
                            onPress={() => {
                              console.log('🎯 [DailyStatus] Opening learning paths from modal - hiding DailyStatus modal');
                              
                              // Hide DailyStatus modal first
                              setShowSheet(false);
                              
                              // Set flag to remember we came from DailyStatus
                              setCameFromDailyStatus(true);
                              
                              // Show learning paths sheet after a brief delay for smooth transition
                              setTimeout(() => {
                                setShowLearningPathsSheet(true);
                              }, 200);
                            }}
                            style={{
                              backgroundColor: colorScheme === 'dark' ? '#1A4A4A' : '#E6F7FF',
                              borderRadius: 12,
                              padding: 12,
                              marginBottom: 12,
                              borderWidth: 1,
                              borderColor: colorScheme === 'dark' ? '#2A6A6A' : '#B3E5FC',
                            }}
                          >
                            <XStack alignItems="center" justifyContent="center" gap="$2">
                              <Feather 
                                name="book-open" 
                                size={18} 
                                color="#00E6C3" 
                              />
                              <Text 
                                fontSize="$3" 
                                fontWeight="500"
                                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                              >
                                {isToday 
                                  ? 'Did you do any exercises today?' 
                                  : `Did you do any exercises on ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}?`
                                }
                              </Text>
                            </XStack>
                          </TouchableOpacity>
                        )}
                      </YStack>
                    )}

                    {/* Details Tab */}
                    {activeTab === 'details' && formData.status === 'drove' && (
                      <YStack gap="$3">
                        {/* Driving Time & Distance */}
                        <XStack gap="$2">
                          <YStack gap="$1.5" flex={1}>
                            <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                              Tid (minuter)
                            </Text>
                            <Input
                              placeholder="0"
                              value={formData.driving_time_minutes?.toString() || ''}
                              onChangeText={(text) => setFormData(prev => ({ 
                                ...prev, 
                                driving_time_minutes: text ? parseInt(text) || 0 : 0 
                              }))}
                              keyboardType="number-pad"
                              backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
                              borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                              color={colorScheme === 'dark' ? '#FFF' : '#000'}
                            />
                          </YStack>
                          
                          <YStack gap="$1.5" flex={1}>
                            <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                              Distans (km)
                            </Text>
                            <Input
                              placeholder="0"
                              value={formData.distance_km?.toString() || ''}
                              onChangeText={(text) => setFormData(prev => ({ 
                                ...prev, 
                                distance_km: text ? parseFloat(text) || 0 : 0 
                              }))}
                              keyboardType="decimal-pad"
                              backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
                              borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                              color={colorScheme === 'dark' ? '#FFF' : '#000'}
                            />
                          </YStack>
                        </XStack>
                        
                        {/* Car Type - Using database values */}
                        <YStack gap="$1.5">
                          <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                            Biltyp
                          </Text>
                          <XStack gap="$2" flexWrap="wrap">
                            {vehicleTypes.map((type) => (
                              <TouchableOpacity
                                key={type.value}
                                onPress={() => setFormData(prev => ({ ...prev, car_type: type.value }))}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  backgroundColor: formData.car_type === type.value 
                                    ? '#00E6C3' 
                                    : (colorScheme === 'dark' ? '#333' : '#F0F0F0'),
                                  borderWidth: 1,
                                  borderColor: formData.car_type === type.value 
                                    ? '#00E6C3' 
                                    : (colorScheme === 'dark' ? '#555' : '#DDD'),
                                }}
                              >
                                <Text 
                                  fontSize="$2" 
                                  color={formData.car_type === type.value ? '#000' : (colorScheme === 'dark' ? '#FFF' : '#000')}
                                  fontWeight={formData.car_type === type.value ? 'bold' : 'normal'}
                                >
                                  {type.label[lang] || type.label.en}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </XStack>
                        </YStack>
                        
                        {/* Rating */}
                        <YStack gap="$1.5">
                          <Text fontSize="$3" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                            Betyg (1-5 stjärnor)
                          </Text>
                          <XStack gap="$2" alignItems="center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <TouchableOpacity
                                key={star}
                                onPress={() => setFormData(prev => ({ ...prev, rating: star }))}
                                style={{ padding: 4 }}
                              >
                                <Feather 
                                  name="star" 
                                  size={24} 
                                  color={star <= (formData.rating || 0) ? '#FFD700' : (colorScheme === 'dark' ? '#666' : '#CCC')}
                                />
                              </TouchableOpacity>
                            ))}
                            <Text fontSize="$2" color={colorScheme === 'dark' ? '#CCC' : '#666'} marginLeft="$2">
                              {formData.rating || 0}/5
                            </Text>
                          </XStack>
                        </YStack>
                      </YStack>
                    )}

                    {/* Routes Tab */}
                    {activeTab === 'routes' && (
                      <YStack gap="$3">
                        {/* Exercise Learning Button - Show for today and past dates */}
                        {!isFuture && (
                          <TouchableOpacity
                            onPress={() => {
                              console.log('🎯 [DailyStatus] Opening learning paths from modal - hiding DailyStatus modal');
                              
                              // Hide DailyStatus modal first
                              setShowSheet(false);
                              
                              // Set flag to remember we came from DailyStatus
                              setCameFromDailyStatus(true);
                              
                              // Show learning paths sheet after a brief delay for smooth transition
                              setTimeout(() => {
                                setShowLearningPathsSheet(true);
                              }, 200);
                            }}
                            style={{
                              backgroundColor: colorScheme === 'dark' ? '#1A4A4A' : '#E6F7FF',
                              borderRadius: 12,
                              padding: 12,
                              marginBottom: 12,
                              borderWidth: 1,
                              borderColor: colorScheme === 'dark' ? '#2A6A6A' : '#B3E5FC',
                            }}
                          >
                            <XStack alignItems="center" justifyContent="center" gap="$2">
                              <Feather 
                                name="book-open" 
                                size={18} 
                                color="#00E6C3" 
                              />
                              <Text 
                                fontSize="$3" 
                                fontWeight="500"
                                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                              >
                                {isToday 
                                  ? 'Did you do any exercises today?' 
                                  : `Did you do any exercises on ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}?`
                                }
                              </Text>
                            </XStack>
                          </TouchableOpacity>
                        )}

                        {/* Route Integration Buttons */}
                        <XStack gap="$2">
                          {/* Find Routes Button */}
                          <TouchableOpacity
                            onPress={handleNavigateToMap}
                            style={{
                              flex: 1,
                              backgroundColor: colorScheme === 'dark' ? '#2A2A4A' : '#F0F4FF',
                              borderRadius: 12,
                              padding: 12,
                              borderWidth: 1,
                              borderColor: colorScheme === 'dark' ? '#4A4A6A' : '#C4D3FF',
                            }}
                          >
                            <XStack alignItems="center" justifyContent="center" gap="$2">
                              <Feather 
                                name="map-pin" 
                                size={18} 
                                color="#4A90E2" 
                              />
                              <Text 
                                fontSize="$3" 
                                fontWeight="500"
                                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                                textAlign="center"
                              >
                                Find Routes
                              </Text>
                            </XStack>
                          </TouchableOpacity>

                          {/* My Routes Button */}
                          <TouchableOpacity
                            onPress={handleOpenRouteList}
                            style={{
                              flex: 1,
                              backgroundColor: colorScheme === 'dark' ? '#4A2A2A' : '#FFF0F4',
                              borderRadius: 12,
                              padding: 12,
                              borderWidth: 1,
                              borderColor: colorScheme === 'dark' ? '#6A4A4A' : '#FFD3C4',
                            }}
                          >
                            <XStack alignItems="center" justifyContent="center" gap="$2">
                              <Feather 
                                name="list" 
                                size={18} 
                                color="#E24A90" 
                              />
                              <Text 
                                fontSize="$3" 
                                fontWeight="500"
                                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                                textAlign="center"
                              >
                                My Routes
                              </Text>
                            </XStack>
                          </TouchableOpacity>
                        </XStack>

                        {/* Route Actions Button */}
                        <TouchableOpacity
                          onPress={handleOpenActionSheet}
                          style={{
                            backgroundColor: colorScheme === 'dark' ? '#2A3A2A' : '#F0FFF0',
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: colorScheme === 'dark' ? '#4A6A4A' : '#C4DFC4',
                          }}
                        >
                          <XStack alignItems="center" justifyContent="center" gap="$2">
                            <Feather 
                              name="plus" 
                              size={18} 
                              color="#10B981" 
                            />
                            <Text 
                              fontSize="$3" 
                              fontWeight="500"
                              color={colorScheme === 'dark' ? '#FFF' : '#000'}
                            >
                              Create or Record Route
                            </Text>
                          </XStack>
                        </TouchableOpacity>
                      </YStack>
                    )}
                  </YStack>
                </ScrollView>
                  
                {/* Save Button - Fixed at bottom */}
                <YStack 
                  padding="$3" 
                  borderTopWidth={1} 
                  borderTopColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                  backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
                >
                  <Button
                    onPress={saveDailyStatus}
                    disabled={loading}
                    backgroundColor={isFuture ? (colorScheme === 'dark' ? '#444' : '#F0F0F0') : "#00E6C3"}
                    color={isFuture ? (colorScheme === 'dark' ? '#888' : '#666') : "#000"}
                    fontWeight="bold"
                    padding="$3"
                    borderRadius="$3"
                  >
                    {loading ? 'Sparar...' : isFuture ? 'Come back on this day' : 'Spara status'}
                  </Button>
                </YStack>
              </YStack>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </Animated.View>
        </Modal>
      )}

      {/* Learning Paths Sheet Modal (Level 0) - Show for today and past dates */}
      <LearningPathsSheet
        visible={showLearningPathsSheet}
        onClose={() => {
          console.log('🎯 [DailyStatus] LearningPathsSheet closed via X button');
          setShowLearningPathsSheet(false);
          setCameFromDailyStatus(false);
        }}
        onBack={cameFromDailyStatus ? () => {
          console.log('🎯 [DailyStatus] Back arrow pressed - returning to DailyStatus modal');
          setShowLearningPathsSheet(false);
          setCameFromDailyStatus(false);
          setTimeout(() => {
            setShowSheet(true);
          }, 100);
        } : undefined}
        onPathSelected={(path) => {
          console.log('🎯 [DailyStatus] Learning path selected:', path.title[lang] || path.title.en);
          setSelectedLearningPath(path);
          setShowLearningPathsSheet(false);
          setShowExerciseListSheet(true);
        }}
        title={isToday 
          ? "Learning for today" 
          : `Learning for ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
        }
        initialSnapPoint="large"
      />

      {/* Exercise List Sheet Modal (Level 1) - Show for today and past dates */}
      <ExerciseListSheet
        visible={showExerciseListSheet}
        onClose={() => {
          console.log('🎯 [DailyStatus] ExerciseListSheet closed - checking if came from DailyStatus');
          setShowExerciseListSheet(false);
          setSelectedLearningPath(null);
          
          // If came from DailyStatus, return to DailyStatus modal
          if (cameFromDailyStatus) {
            console.log('🎯 [DailyStatus] Returning to DailyStatus modal from ExerciseListSheet');
            setCameFromDailyStatus(false);
            setTimeout(() => {
              setShowSheet(true);
            }, 100);
          }
        }}
        onBackToAllPaths={() => {
          console.log('🎯 [DailyStatus] Back to all paths from ExerciseListSheet');
          setShowExerciseListSheet(false);
          setSelectedLearningPath(null);
          
          // Always go back to LearningPathsSheet when coming from DailyStatus
          setShowLearningPathsSheet(true);
        }}
        title={selectedLearningPath ? (selectedLearningPath.title[lang] || selectedLearningPath.title.en) : 'Exercises'}
        learningPathId={selectedLearningPath?.id || undefined}
        showAllPaths={false}
      />

      {/* Route List Sheet Modal */}
      <RouteListSheet
        visible={showRouteListSheet}
        onClose={() => {
          console.log('📋 [DailyStatus] RouteListSheet closed via X button');
          setShowRouteListSheet(false);
          setRouteCameFromDailyStatus(false);
        }}
        onBack={routeCameFromDailyStatus ? () => {
          console.log('📋 [DailyStatus] Back arrow pressed - returning to DailyStatus modal from RouteListSheet');
          setShowRouteListSheet(false);
          setRouteCameFromDailyStatus(false);
          setTimeout(() => {
            setShowSheet(true);
          }, 100);
        } : undefined}
        onRoutePress={handleRoutePress}
        title={isToday 
          ? "My Routes for Today" 
          : `My Routes for ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
        }
        type="saved"
      />

      {/* Action Sheet */}
      <ActionSheet
        isVisible={showActionSheet}
        onClose={() => {
          console.log('⚡ [DailyStatus] ActionSheet closed');
          setShowActionSheet(false);
        }}
        onCreateRoute={(routeData) => {
          console.log('⚡ [DailyStatus] Route created from ActionSheet:', routeData ? 'with data' : 'without data');
          setShowActionSheet(false);
          
          // Show success message
          showToast({
            title: routeData ? 'Route Recorded' : 'Route Created',
            message: routeData ? 'Your driving session has been recorded!' : 'Your route has been created successfully!',
            type: 'success'
          });
          
          // Return to DailyStatus modal
          setTimeout(() => {
            setShowSheet(true);
          }, 100);
        }}
        onNavigateToMap={(routeId) => {
          console.log('⚡ [DailyStatus] Navigating to map from ActionSheet:', routeId);
          setShowActionSheet(false);
          
          // Navigate to map
          (navigation as any).navigate('MainTabs', {
            screen: 'MapTab',
            params: {
              screen: 'MapScreen',
              params: { routeId },
            },
          });
        }}
      />

      {/* Route Detail Sheet Modal */}
      {(() => {
        console.log('🗺️ [DailyStatus] RouteDetailSheet render check:', {
          visible: showRouteDetailSheet,
          selectedRouteId,
          hasRouteId: !!selectedRouteId
        });
        
        return (
          <RouteDetailSheet
            visible={showRouteDetailSheet}
            onClose={() => {
              console.log('🗺️ [DailyStatus] RouteDetailSheet closed');
              setShowRouteDetailSheet(false);
              setSelectedRouteId(null);
              
              // Return to DailyStatus if it was opened from there
              setTimeout(() => {
                setShowSheet(true);
              }, 100);
            }}
            routeId={selectedRouteId}
            onStartRoute={(routeId) => {
              console.log('🗺️ [DailyStatus] Starting route from RouteDetailSheet:', routeId);
              setShowRouteDetailSheet(false);
              
              // Navigate to map with route
              (navigation as any).navigate('MainTabs', {
                screen: 'MapTab',
                params: {
                  screen: 'MapScreen',
                  params: { routeId },
                },
              });
            }}
            onNavigateToProfile={(userId) => {
              console.log('👤 [DailyStatus] Navigating to profile:', userId);
              setShowRouteDetailSheet(false);
              
              // Navigate to profile
              (navigation as any).navigate('PublicProfile', { userId });
            }}
            onReopen={() => {
              console.log('🗺️ [DailyStatus] Reopening RouteDetailSheet - selectedRouteId:', selectedRouteId);
              if (selectedRouteId) {
                setTimeout(() => {
                  setShowRouteDetailSheet(true);
                }, 100);
              } else {
                // Return to DailyStatus if no route selected
                console.log('🗺️ [DailyStatus] No route selected, returning to DailyStatus');
                setTimeout(() => {
                  setShowSheet(true);
                }, 100);
              }
            }}
          />
        );
      })()}
    </>
  );
}