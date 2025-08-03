import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, Input, Button, Separator } from 'tamagui';
import { Calendar, Repeat, Clock, X } from '@tamagui/lucide-icons';

export interface RecurrenceRule {
  pattern: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interval?: number; // Every N days/weeks/months
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number; // For monthly events
  endType: 'never' | 'date' | 'count';
  endDate?: string; // ISO date string
  count?: number; // Number of occurrences
  customDates?: string[]; // For custom pattern
}

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  eventDate?: string; // To determine starting context
}

const DAYS_OF_WEEK = [
  { value: 0, short: 'Sun', long: 'Sunday' },
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
];

const RECURRENCE_PATTERNS = [
  { value: 'none', label: 'No Repeat', description: 'One-time event' },
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Every month' },
  { value: 'custom', label: 'Custom', description: 'Custom pattern' },
] as const;

export function RecurrencePicker({ value, onChange, eventDate }: RecurrencePickerProps) {
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(
    value || {
      pattern: 'none',
      interval: 1,
      daysOfWeek: [],
      endType: 'never',
    }
  );

  useEffect(() => {
    if (value) {
      setRecurrence(value);
    }
  }, [value]);

  const updateRecurrence = (updates: Partial<RecurrenceRule>) => {
    const newRecurrence = { ...recurrence, ...updates };
    setRecurrence(newRecurrence);
    onChange(newRecurrence.pattern === 'none' ? null : newRecurrence);
  };

  const toggleDayOfWeek = (day: number) => {
    const daysOfWeek = recurrence.daysOfWeek || [];
    const newDaysOfWeek = daysOfWeek.includes(day)
      ? daysOfWeek.filter(d => d !== day)
      : [...daysOfWeek, day].sort();
    
    updateRecurrence({ daysOfWeek: newDaysOfWeek });
  };

  const getRecurrenceDescription = () => {
    if (recurrence.pattern === 'none') return 'No repeat';
    
    let description = '';
    
    switch (recurrence.pattern) {
      case 'daily':
        description = recurrence.interval === 1 ? 'Every day' : `Every ${recurrence.interval} days`;
        break;
      case 'weekly':
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          const dayNames = recurrence.daysOfWeek.map(d => DAYS_OF_WEEK[d].short).join(', ');
          description = `Every week on ${dayNames}`;
        } else {
          description = 'Every week';
        }
        break;
      case 'biweekly':
        description = 'Every 2 weeks';
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          const dayNames = recurrence.daysOfWeek.map(d => DAYS_OF_WEEK[d].short).join(', ');
          description += ` on ${dayNames}`;
        }
        break;
      case 'monthly':
        if (recurrence.dayOfMonth) {
          description = `Monthly on the ${recurrence.dayOfMonth}${getOrdinalSuffix(recurrence.dayOfMonth)}`;
        } else {
          description = 'Every month';
        }
        break;
      case 'custom':
        description = 'Custom pattern';
        break;
    }

    // Add end information
    if (recurrence.endType === 'date' && recurrence.endDate) {
      description += ` until ${new Date(recurrence.endDate).toLocaleDateString()}`;
    } else if (recurrence.endType === 'count' && recurrence.count) {
      description += ` for ${recurrence.count} occurrences`;
    }

    return description;
  };

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <YStack gap={16}>
      {/* Pattern Selection */}
      <YStack gap={12}>
        <Text fontSize={16} fontWeight="600" color="$color">
          Repeat Pattern
        </Text>
        
        <YStack gap={8}>
          {RECURRENCE_PATTERNS.map((pattern) => (
            <TouchableOpacity
              key={pattern.value}
              onPress={() => updateRecurrence({ pattern: pattern.value as any })}
              style={{
                backgroundColor: recurrence.pattern === pattern.value ? 'rgba(0, 255, 188, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                borderWidth: 1,
                borderColor: recurrence.pattern === pattern.value ? '#00FFBC' : 'rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600" color="$color">
                    {pattern.label}
                  </Text>
                  <Text fontSize={14} color="$gray11">
                    {pattern.description}
                  </Text>
                </YStack>
                {recurrence.pattern === pattern.value && (
                  <XStack alignItems="center" gap={8}>
                    <Repeat size={16} color="#00FFBC" />
                  </XStack>
                )}
              </XStack>
            </TouchableOpacity>
          ))}
        </YStack>
      </YStack>

      {/* Pattern-specific options */}
      {recurrence.pattern !== 'none' && (
        <YStack gap={16}>
          <Separator />

          {/* Days of Week Selection for Weekly/Biweekly */}
          {(recurrence.pattern === 'weekly' || recurrence.pattern === 'biweekly') && (
            <YStack gap={12}>
              <Text fontSize={16} fontWeight="600" color="$color">
                Days of Week
              </Text>
              <XStack gap={8} flexWrap="wrap">
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    onPress={() => toggleDayOfWeek(day.value)}
                    style={{
                      backgroundColor: recurrence.daysOfWeek?.includes(day.value) ? '#00FFBC' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      minWidth: 50,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      fontSize={14}
                      fontWeight="600"
                      color={recurrence.daysOfWeek?.includes(day.value) ? '#000' : '$color'}
                    >
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </XStack>
              <Text fontSize={12} color="$gray9">
                Leave empty to use the event date's day of week
              </Text>
            </YStack>
          )}

          {/* Monthly Day Selection */}
          {recurrence.pattern === 'monthly' && (
            <YStack gap={12}>
              <Text fontSize={16} fontWeight="600" color="$color">
                Day of Month
              </Text>
              <Input
                value={recurrence.dayOfMonth?.toString() || ''}
                onChangeText={(text) => {
                  const day = parseInt(text) || undefined;
                  if (day && day >= 1 && day <= 31) {
                    updateRecurrence({ dayOfMonth: day });
                  } else if (!text) {
                    updateRecurrence({ dayOfMonth: undefined });
                  }
                }}
                placeholder="Day (1-31)"
                keyboardType="numeric"
                backgroundColor="rgba(255, 255, 255, 0.1)"
                borderColor="rgba(255, 255, 255, 0.2)"
                color="$color"
                placeholderTextColor="$gray9"
                width={120}
              />
              <Text fontSize={12} color="$gray9">
                Leave empty to use the event date's day
              </Text>
            </YStack>
          )}

          {/* Interval Selection for Custom */}
          {recurrence.pattern === 'custom' && (
            <YStack gap={12}>
              <Text fontSize={16} fontWeight="600" color="$color">
                Custom Interval
              </Text>
              <XStack gap={12} alignItems="center">
                <Text fontSize={14} color="$color">Every</Text>
                <Input
                  value={recurrence.interval?.toString() || '1'}
                  onChangeText={(text) => {
                    const interval = parseInt(text) || 1;
                    updateRecurrence({ interval: Math.max(1, interval) });
                  }}
                  keyboardType="numeric"
                  backgroundColor="rgba(255, 255, 255, 0.1)"
                  borderColor="rgba(255, 255, 255, 0.2)"
                  color="$color"
                  width={80}
                  textAlign="center"
                />
                <Text fontSize={14} color="$color">weeks</Text>
              </XStack>
            </YStack>
          )}

          {/* End Options */}
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="600" color="$color">
              End Repeat
            </Text>
            
            <YStack gap={8}>
              {/* Never */}
              <TouchableOpacity
                onPress={() => updateRecurrence({ endType: 'never' })}
                style={{
                  backgroundColor: recurrence.endType === 'never' ? 'rgba(0, 255, 188, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: recurrence.endType === 'never' ? '#00FFBC' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Text fontSize={14} fontWeight="600" color="$color">
                  Never
                </Text>
              </TouchableOpacity>

              {/* On Date */}
              <TouchableOpacity
                onPress={() => updateRecurrence({ endType: 'date' })}
                style={{
                  backgroundColor: recurrence.endType === 'date' ? 'rgba(0, 255, 188, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: recurrence.endType === 'date' ? '#00FFBC' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={14} fontWeight="600" color="$color">
                    On Date
                  </Text>
                  {recurrence.endType === 'date' && (
                    <Calendar size={16} color="#00FFBC" />
                  )}
                </XStack>
                {recurrence.endType === 'date' && (
                  <Input
                    value={recurrence.endDate || ''}
                    onChangeText={(text) => updateRecurrence({ endDate: text })}
                    placeholder="YYYY-MM-DD"
                    backgroundColor="rgba(255, 255, 255, 0.1)"
                    borderColor="rgba(255, 255, 255, 0.2)"
                    color="$color"
                    placeholderTextColor="$gray9"
                    marginTop={8}
                  />
                )}
              </TouchableOpacity>

              {/* After Count */}
              <TouchableOpacity
                onPress={() => updateRecurrence({ endType: 'count' })}
                style={{
                  backgroundColor: recurrence.endType === 'count' ? 'rgba(0, 255, 188, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: recurrence.endType === 'count' ? '#00FFBC' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={14} fontWeight="600" color="$color">
                    After Occurrences
                  </Text>
                  {recurrence.endType === 'count' && (
                    <Clock size={16} color="#00FFBC" />
                  )}
                </XStack>
                {recurrence.endType === 'count' && (
                  <XStack gap={8} alignItems="center" marginTop={8}>
                    <Input
                      value={recurrence.count?.toString() || ''}
                      onChangeText={(text) => {
                        const count = parseInt(text) || undefined;
                        updateRecurrence({ count });
                      }}
                      placeholder="10"
                      keyboardType="numeric"
                      backgroundColor="rgba(255, 255, 255, 0.1)"
                      borderColor="rgba(255, 255, 255, 0.2)"
                      color="$color"
                      placeholderTextColor="$gray9"
                      width={80}
                      textAlign="center"
                    />
                    <Text fontSize={14} color="$color">occurrences</Text>
                  </XStack>
                )}
              </TouchableOpacity>
            </YStack>
          </YStack>

          {/* Description Preview */}
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="600" color="$color">
              Summary
            </Text>
            <Text
              fontSize={14}
              color="#00FFBC"
              backgroundColor="rgba(0, 255, 188, 0.1)"
              padding={12}
              borderRadius={8}
            >
              {getRecurrenceDescription()}
            </Text>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
} 