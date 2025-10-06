import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Alert, Animated, Pressable, Dimensions, Modal, View } from 'react-native';
import { XStack, YStack, Text, Button, Input, useTheme } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useTranslation } from '../../contexts/TranslationContext';
import { LearningPathsSheet } from '../../components/LearningPathsSheet';
import { ExerciseListSheet } from '../../components/ExerciseListSheet';

interface DailyStatusData {
  id?: string;
  status: 'drove' | 'didnt_drive';
  how_it_went?: string;
  challenges?: string;
  notes?: string;
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
  const theme = useTheme();
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme || 'light';
  const insets = useSafeAreaInsets();
  
  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;
  
  const effectiveUserId = activeUserId || profile?.id;
  
  const [showSheet, setShowSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<DailyStatusData | null>(null);
  const [formData, setFormData] = useState<DailyStatusData>({
    status: 'drove',
    how_it_went: '',
    challenges: '',
    notes: ''
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
          notes: data.notes || ''
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
          notes: ''
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
          notes: formData.notes || null
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
  }, [effectiveUserId]);

  useEffect(() => {
    loadStatusForDate(selectedDate);
    
    // Only close learning sheets if switching to a future date
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isFuture = selectedDate > today;
    if (isFuture) {
      console.log('🎯 [DailyStatus] Future date selected - closing learning sheets');
      setShowLearningPathsSheet(false);
      setShowExerciseListSheet(false);
      setSelectedLearningPath(null);
    }
  }, [selectedDate, effectiveUserId]);

  // Note: DailyStatus doesn't need real-time subscriptions
  // It's a personal tracking component that only needs to refresh when user interacts with it

  // Animation effects
  useEffect(() => {
    if (showSheet) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showSheet, backdropOpacity, sheetTranslateY]);
  
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
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: sheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
                padding="$3"
                paddingBottom={insets.bottom || 16}
                borderTopLeftRadius="$3"
                borderTopRightRadius="$3"
                gap="$3"
                height={Dimensions.get('window').height * 0.7}
                maxHeight={Dimensions.get('window').height * 0.7}
              >
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
                
                {/* Content */}
                <YStack flex={1} gap="$3">
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
                  
                  {/* Save Button */}
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
            </Animated.View>
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
    </>
  );
}