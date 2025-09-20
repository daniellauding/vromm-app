import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Alert, Animated, Pressable, Dimensions, Modal, View } from 'react-native';
import { XStack, YStack, Text, Button, Input, useTheme } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

interface DailyStatusData {
  id?: string;
  status: 'drove' | 'didnt_drive';
  how_it_went?: string;
  challenges?: string;
  notes?: string;
}

interface DailyStatusProps {
  activeUserId?: string;
}

export function DailyStatus({ activeUserId }: DailyStatusProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
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
  
  // Date navigation state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pastStatuses, setPastStatuses] = useState<{[key: string]: DailyStatusData}>({});
  
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
    setSelectedDate(newDate);
    loadStatusForDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    loadStatusForDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(today);
    loadStatusForDate(today);
  };

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isFuture = selectedDate > today;
  
  // Save daily status
  const saveDailyStatus = async () => {
    if (!effectiveUserId) return;
    
    // Don't allow saving for future dates
    if (isFuture) {
      Alert.alert('Cannot Save', 'You cannot save status for future dates.');
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
  }, [selectedDate, effectiveUserId]);

  // Real-time subscription for daily status updates
  useEffect(() => {
    if (!effectiveUserId) return;

    console.log('📅 [DailyStatus] Setting up real-time subscription for user:', effectiveUserId);
    
    const channelName = `daily-status-${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_status',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          console.log('📅 [DailyStatus] Real-time update received:', payload.eventType);
          // Reload status for current selected date
          loadStatusForDate(selectedDate);
          // Also reload today's status if it's different
          if (selectedDate.toDateString() !== today.toDateString()) {
            loadTodayStatus();
          }
        },
      )
      .subscribe((status) => {
        console.log(`📅 [DailyStatus] Subscription status: ${status}`);
      });

    return () => {
      console.log('📅 [DailyStatus] Cleaning up real-time subscription');
      supabase.removeChannel(subscription);
    };
  }, [effectiveUserId, selectedDate]);

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
      {/* Daily Status Card */}
      <View
        style={{
          backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
          marginBottom: 12,
          shadowColor: colorScheme === 'dark' ? '#000' : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Discrete Date Navigation */}
        <XStack alignItems="center" justifyContent="space-between" marginBottom="$1">
          <TouchableOpacity
            onPress={goToPreviousDay}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather 
              name="chevron-left" 
              size={12} 
              color={colorScheme === 'dark' ? '#666' : '#999'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={goToToday}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: isToday ? '#00E6C3' : 'transparent',
            }}
          >
            <Text 
              fontSize="$1" 
              fontWeight="500"
              color={isToday ? '#000' : (colorScheme === 'dark' ? '#999' : '#999')}
            >
              {isToday ? 'Idag' : selectedDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={goToNextDay}
            disabled={isFuture}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather 
              name="chevron-right" 
              size={12} 
              color={isFuture 
                ? (colorScheme === 'dark' ? '#444' : '#CCC')
                : (colorScheme === 'dark' ? '#666' : '#999')} 
            />
          </TouchableOpacity>
        </XStack>

        {/* Status Content */}
        <TouchableOpacity
          onPress={() => setShowSheet(true)}
          style={{ opacity: isFuture ? 0.5 : 1 }}
          disabled={isFuture}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$3">
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: getStatusColor() + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather 
                  name={getStatusIcon()} 
                  size={18} 
                  color={getStatusColor()} 
                />
              </View>
              <YStack flex={1}>
                <Text 
                  fontSize="$4" 
                  fontWeight="600" 
                  color={colorScheme === 'dark' ? '#FFF' : '#000'}
                  marginBottom="$0.5"
                >
                  {getStatusText()}
                </Text>
                {getStatusForSelectedDate()?.how_it_went && (
                  <Text 
                    fontSize="$2" 
                    color={colorScheme === 'dark' ? '#CCC' : '#666'}
                    numberOfLines={1}
                    lineHeight={16}
                  >
                    {getStatusForSelectedDate()?.how_it_went}
                  </Text>
                )}
                {!getStatusForSelectedDate() && !isFuture && (
                  <Text 
                    fontSize="$2" 
                    color={colorScheme === 'dark' ? '#999' : '#999'}
                  >
                    {isToday ? 'Berätta om din körning idag' : 'Ingen status sparad för denna dag'}
                  </Text>
                )}
                {isFuture && (
                  <Text 
                    fontSize="$2" 
                    color={colorScheme === 'dark' ? '#666' : '#999'}
                  >
                    Kan inte spara status för framtida datum
                  </Text>
                )}
              </YStack>
            </XStack>
            
            {!isFuture && (
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colorScheme === 'dark' ? '#333' : '#F0F0F0',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather 
                  name="chevron-right" 
                  size={14} 
                  color={colorScheme === 'dark' ? '#CCC' : '#666'} 
                />
              </View>
            )}
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
                  
                  {/* Save Button */}
                  <Button
                    onPress={saveDailyStatus}
                    disabled={loading || isFuture}
                    backgroundColor={isFuture ? (colorScheme === 'dark' ? '#333' : '#E5E5E5') : "#00E6C3"}
                    color={isFuture ? (colorScheme === 'dark' ? '#666' : '#999') : "#000"}
                    fontWeight="bold"
                    padding="$3"
                    borderRadius="$3"
                  >
                    {loading ? 'Sparar...' : isFuture ? 'Kan inte spara för framtida datum' : 'Spara status'}
                  </Button>
                </YStack>
              </YStack>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}