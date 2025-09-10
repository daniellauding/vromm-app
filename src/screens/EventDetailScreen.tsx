import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, View, useColorScheme } from 'react-native';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import {
  ArrowLeft,
  MapPin,
  Users,
  Clock,
  Edit3,
  Check,
  X,
  UserPlus,
  BookOpen,
  Route as RouteIcon,
  ArrowRight,
  Repeat,
  Calendar,
  CalendarPlus,
  Share,
} from '@tamagui/lucide-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { NavigationProp } from '../types/navigation';
import { db, supabase } from '../lib/supabase';
import { RouteCard } from '../components/RouteCard';
import { Map as MapComponent } from '../components/Map';
import { CalendarService } from '../services/calendarService';
import { CommentsSection } from '../components/CommentsSection';
import { ReportDialog } from '../components/report/ReportDialog';
import { getTabContentPadding } from '../utils/layout';

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  visibility: 'public' | 'private' | 'invite-only';
  event_date?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurrence_rule?: any;
  recurrence_end_date?: string;
  recurrence_count?: number;
  is_recurring_instance?: boolean;
  parent_event_id?: string;
  created_by: string;
  created_at: string;
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  embeds?: {
    exercises?: any[];
    routes?: any[];
  };
  attendees?: Array<{
    id: string;
    user_id: string;
    status: 'invited' | 'accepted' | 'rejected';
    invited_at: string;
    responded_at?: string;
    user?: {
      id: string;
      full_name?: string;
      avatar_url?: string;
    };
  }>;
}

interface EventDetailScreenProps {
  route?: {
    params: {
      eventId: string;
    };
  };
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({ route }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<'invited' | 'accepted' | 'rejected' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const routeFromHook = useRoute();
  
  // Use route prop if provided, otherwise use hook (for navigation compatibility)
  const finalRoute = route || routeFromHook;
  const { eventId } = finalRoute.params as { eventId: string };
  const colorScheme = useColorScheme();
  const [commentCount, setCommentCount] = useState<number>(0);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadEvent();
    getCurrentUser();
    const loadCommentsCount = async () => {
      try {
        const { data } = await supabase
          .from('comment_counts')
          .select('count')
          .eq('target_type', 'event')
          .eq('target_id', eventId)
          .single();
        setCommentCount(data?.count || 0);
      } catch {
        setCommentCount(0);
      }
    };
    loadCommentsCount();
  }, [eventId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadEvent = async () => {
    try {
      setLoading(true);
      const event = await db.events.getById(eventId);
      setEvent(event);
      
      // Check if current user is in attendees list
      const { data: { user } } = await supabase.auth.getUser();
      if (user && event.attendees) {
        const currentUserAttendance = event.attendees.find((a: any) => a.user_id === user.id);
        setUserStatus(currentUserAttendance?.status || null);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEdit = () => {
    navigation.navigate('CreateEvent', { eventId });
  };

  const handleJoin = async () => {
    try {
      if (!currentUserId) return;
      
      if (userStatus === null) {
        // Add user to event
        await db.events.addAttendee(eventId, currentUserId);
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'accepted');
      } else {
        // Update existing attendance status
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'accepted');
      }
      
      setUserStatus('accepted');
      loadEvent(); // Refresh the event data
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const handleLeave = async () => {
    try {
      if (!currentUserId) return;
      
      if (userStatus === 'invited') {
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'rejected');
        setUserStatus('rejected');
      } else {
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'rejected');
        setUserStatus(null);
      }
      
      loadEvent(); // Refresh the event data
    } catch (error) {
      console.error('Error leaving event:', error);
    }
  };

  const handleInviteUsers = () => {
    if (!event) return;
    
    // Only event creators can invite users
    if (event.created_by !== currentUserId) {
      Alert.alert('Permission Denied', 'Only the event creator can invite users');
      return;
    }

    // Navigate to InviteUsersScreen
    (navigation as any).navigate('InviteUsers', {
      eventId: eventId,
      eventTitle: event.title,
      onInvitesSent: (invitedUserIds: string[]) => {
        // Refresh the event data to show new attendees
        loadEvent();
        Alert.alert('Success', `Invited ${invitedUserIds.length} user${invitedUserIds.length === 1 ? '' : 's'}`);
      },
    });
  };

  const handleRemoveInvitation = async (attendeeId: string, userName: string) => {
    if (!event || event.created_by !== currentUserId) return;

    Alert.alert(
      'Remove Invitation',
      `Remove invitation for ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('event_attendees')
                .delete()
                .eq('id', attendeeId);
              
              loadEvent(); // Refresh the event data
              Alert.alert('Success', `Removed invitation for ${userName}`);
            } catch (error) {
              console.error('Error removing invitation:', error);
              Alert.alert('Error', 'Failed to remove invitation');
            }
          },
        },
      ]
    );
  };

  const handleExportToCalendar = () => {
    if (!event) return;

    Alert.alert(
      'Export to Calendar',
      'Choose how to export this event to your calendar',
      [
        {
          text: 'Download .ics File',
          onPress: async () => {
            try {
              await CalendarService.exportEvent(event);
            } catch (error) {
              console.error('Calendar export error:', error);
              Alert.alert('Export Failed', 'Could not export event to calendar');
            }
          },
        },
        {
          text: 'Open in Google Calendar',
          onPress: () => {
            const url = CalendarService.generateCalendarUrl(event, 'google');
            Alert.alert(
              'Google Calendar',
              'This will open Google Calendar in your browser. Copy this URL if needed:',
              [
                { text: 'Copy URL', onPress: () => {
                  // Note: You might want to add Clipboard API here
                  console.log('Calendar URL:', url);
                }},
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return '#00FFBC';
      case 'private':
        return '#EF4444';
      case 'invite-only':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getRecurrenceDescription = (event: Event): string | null => {
    if (!event.repeat || event.repeat === 'none') return null;

    const rule = event.recurrence_rule;
    let description = '';

    switch (event.repeat) {
      case 'daily':
        description = 'Every day';
        break;
      case 'weekly':
        if (rule?.daysOfWeek && rule.daysOfWeek.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const selectedDays = rule.daysOfWeek.map((d: number) => dayNames[d]).join(', ');
          description = `Every week on ${selectedDays}`;
        } else {
          description = 'Every week';
        }
        break;
      case 'biweekly':
        description = 'Every 2 weeks';
        if (rule?.daysOfWeek && rule.daysOfWeek.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const selectedDays = rule.daysOfWeek.map((d: number) => dayNames[d]).join(', ');
          description += ` on ${selectedDays}`;
        }
        break;
      case 'monthly':
        if (rule?.dayOfMonth) {
          const suffix = getOrdinalSuffix(rule.dayOfMonth);
          description = `Monthly on the ${rule.dayOfMonth}${suffix}`;
        } else {
          description = 'Every month';
        }
        break;
      case 'custom':
        if (rule?.interval) {
          description = `Every ${rule.interval} week${rule.interval > 1 ? 's' : ''}`;
        } else {
          description = 'Custom pattern';
        }
        break;
      default:
        description = 'Recurring event';
    }

    // Add end information
    if (event.recurrence_end_date) {
      const endDate = new Date(event.recurrence_end_date);
      description += ` until ${endDate.toLocaleDateString()}`;
    } else if (event.recurrence_count) {
      description += ` for ${event.recurrence_count} occurrences`;
    }

    return description;
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const getStatusCounts = () => {
    if (!event?.attendees) return { accepted: 0, invited: 0, rejected: 0 };
    
    return event.attendees.reduce(
      (acc, attendee) => {
        acc[attendee.status]++;
        return acc;
      },
      { accepted: 0, invited: 0, rejected: 0 }
    );
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>
          Loading event...
        </Text>
      </YStack>
    );
  }

  if (!event) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Text fontSize={18} color="$color">
          Event not found
        </Text>
      </YStack>
    );
  }

  const statusCounts = getStatusCounts();
  const canEdit = currentUserId && event.created_by === currentUserId;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        padding={16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.1)"
        justifyContent="space-between"
        alignItems="center"
      >
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <XStack alignItems="center" gap={8}>
          <Text fontSize={20} fontWeight="bold" color="$color" textAlign="center">
            Event Details
          </Text>
          {commentCount > 0 && (
            <XStack alignItems="center" gap={4} backgroundColor="#1f2937" paddingHorizontal={8} paddingVertical={2} borderRadius={10}>
              <Users size={12} color="#00FFBC" />
              <Text fontSize={12} color="#00FFBC">{commentCount}</Text>
            </XStack>
          )}
        </XStack>

        {canEdit && (
          <TouchableOpacity onPress={handleEdit}>
            <Edit3 size={20} color="#00FFBC" />
          </TouchableOpacity>
        )}
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: getTabContentPadding() }}>
        <YStack padding={16} gap={24}>
          {/* Event Info */}
          <YStack gap={16}>
            <TouchableOpacity onPress={() => setShowReport(true)} style={{ alignSelf: 'flex-end' }}>
              <Text color="#EF4444">Report Event</Text>
            </TouchableOpacity>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <Text fontSize={24} fontWeight="bold" color="$color" flex={1}>
                {event.title}
              </Text>
              <YStack
                paddingHorizontal={12}
                paddingVertical={6}
                backgroundColor={getVisibilityColor(event.visibility)}
                borderRadius={8}
              >
                <Text fontSize={12} fontWeight="600" color="#000">
                  {event.visibility}
                </Text>
              </YStack>
            </XStack>

            {event.description && (
              <Text fontSize={16} color="$gray11" lineHeight={22}>
                {event.description}
              </Text>
            )}
          </YStack>

          {/* Event Details */}
          <YStack gap={16}>
            {event.location && (
              <YStack gap={12}>
                <XStack alignItems="flex-start" gap={12}>
                  <MapPin size={20} color="#00FFBC" />
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="600" color="$color">
                      Location
                    </Text>
                    {(() => {
                      // Try to parse enhanced location data
                      try {
                        const locationData = JSON.parse(event.location);
                        
                        if (locationData.waypoints && Array.isArray(locationData.waypoints)) {
                          // Enhanced location with waypoints
                          return (
                            <YStack gap={8}>
                              <Text fontSize={14} color="$gray11">
                                {locationData.searchQuery || 'Multiple locations'}
                              </Text>
                              <YStack gap={4}>
                                {locationData.waypoints.slice(0, 3).map((waypoint: any, index: number) => (
                                  <Text key={index} fontSize={12} color="$gray9">
                                    📍 {waypoint.title || `${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)}`}
                                  </Text>
                                ))}
                                {locationData.waypoints.length > 3 && (
                                  <Text fontSize={12} color="$gray9">
                                    +{locationData.waypoints.length - 3} more locations
                                  </Text>
                                )}
                              </YStack>
                            </YStack>
                          );
                        } else if (locationData.coordinates) {
                          // Simple coordinate format
                          return (
                            <Text fontSize={14} color="$gray11">
                              {locationData.address || `${locationData.coordinates.latitude.toFixed(6)}, ${locationData.coordinates.longitude.toFixed(6)}`}
                            </Text>
                          );
                        }
                      } catch (e) {
                        // Fallback for simple string location
                      }
                      
                      // Simple string location
                      return (
                        <Text fontSize={14} color="$gray11">
                          {event.location}
                        </Text>
                      );
                    })()}
                  </YStack>
                </XStack>

                {/* Enhanced Location Map Display */}
                {(() => {
                  try {
                    const locationData = JSON.parse(event.location);
                    
                    if (locationData.waypoints && Array.isArray(locationData.waypoints)) {
                      // Calculate region for waypoints
                      const waypoints = locationData.waypoints;
                      const lats = waypoints.map((w: any) => w.latitude);
                      const lngs = waypoints.map((w: any) => w.longitude);
                      
                      const region = {
                        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
                        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
                        latitudeDelta: Math.max(...lats) - Math.min(...lats) + 0.02,
                        longitudeDelta: Math.max(...lngs) - Math.min(...lngs) + 0.02,
                      };

                      return (
                        <View style={{ height: 200, borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                          <MapComponent
                            waypoints={waypoints}
                            region={region}
                            style={{ flex: 1 }}
                            drawingMode={locationData.drawingMode || 'pin'}
                          />
                        </View>
                      );
                    } else if (locationData.coordinates) {
                      // Single location with coordinates
                      const waypoints = [{
                        latitude: locationData.coordinates.latitude,
                        longitude: locationData.coordinates.longitude,
                        title: 'Event Location',
                        description: locationData.address || 'Event location',
                      }];
                      
                      const region = {
                        latitude: locationData.coordinates.latitude,
                        longitude: locationData.coordinates.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      };

                      return (
                        <View style={{ height: 200, borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                          <MapComponent
                            waypoints={waypoints}
                            region={region}
                            style={{ flex: 1 }}
                            drawingMode="pin"
                          />
                        </View>
                      );
                    }
                  } catch (e) {
                    // No enhanced location data, no map
                  }
                  
                  return null;
                })()}
              </YStack>
            )}

            {event.event_date && (
              <XStack alignItems="flex-start" gap={12}>
                <Clock size={20} color="#00FFBC" />
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$color">
                    When
                  </Text>
                  <Text fontSize={14} color="$gray11">
                    {formatDistanceToNow(new Date(event.event_date), { addSuffix: true })}
                  </Text>
                </YStack>
              </XStack>
            )}

            {/* Recurrence Information */}
            {getRecurrenceDescription(event) && (
              <XStack alignItems="flex-start" gap={12}>
                <Repeat size={20} color="#8B5CF6" />
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$color">
                    Repeats
                  </Text>
                  <Text fontSize={14} color="$gray11">
                    {getRecurrenceDescription(event)}
                  </Text>
                  {event.is_recurring_instance && (
                    <Text fontSize={12} color="#8B5CF6" marginTop={4}>
                      📅 This is a recurring event instance
                    </Text>
                  )}
                </YStack>
              </XStack>
            )}

            <XStack alignItems="flex-start" gap={12}>
              <Users size={20} color="#00FFBC" />
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="600" color="$color">
                  Attendees
                </Text>
                <Text fontSize={14} color="$gray11">
                  {statusCounts.accepted} accepted • {statusCounts.invited} invited
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Practice Exercises */}
          {event.embeds?.exercises && Array.isArray(event.embeds.exercises) && event.embeds.exercises.length > 0 && (
            <YStack gap={16}>
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap={12}>
                  <BookOpen size={20} color="#8B5CF6" />
                  <Text fontSize={18} fontWeight="bold" color="$color">
                    Practice Exercises ({event.embeds.exercises.length})
                  </Text>
                </XStack>
              </XStack>
              
              <Text fontSize={14} color="$gray11">
                Complete these exercises to prepare for the event
              </Text>

              <YStack gap={12}>
                {event.embeds.exercises.map((exercise: any, index: number) => (
                  <TouchableOpacity
                    key={exercise.id || index}
                    onPress={() => {
                                             // Navigate to RouteExerciseScreen with this single exercise
                       (navigation as any).navigate('RouteExercise', {
                         routeId: null, // No route ID for event exercises
                         exercises: [exercise],
                         routeName: `${event.title} - Exercise`,
                         startIndex: 0,
                       });
                    }}
                    style={{
                      backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F9FAFB',
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB',
                    }}
                  >
                    <XStack alignItems="center" gap={12}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: '#8B5CF6',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text fontSize={18} color="white" fontWeight="600">
                          {index + 1}
                        </Text>
                      </View>
                      
                      <YStack flex={1}>
                        <Text fontSize={16} fontWeight="600" color="$color">
                          {typeof exercise.title === 'string' ? exercise.title : exercise.title?.en || 'Exercise'}
                        </Text>
                        {exercise.description && (
                          <Text fontSize={14} color="$gray11" numberOfLines={2}>
                            {typeof exercise.description === 'string' ? exercise.description : exercise.description?.en || ''}
                          </Text>
                        )}
                        {exercise.duration && (
                          <Text fontSize={12} color="#8B5CF6" marginTop={4}>
                            📝 Duration: {exercise.duration}
                          </Text>
                        )}
                      </YStack>
                      
                      <ArrowRight size={20} color="$gray9" />
                    </XStack>
                  </TouchableOpacity>
                ))}
              </YStack>
            </YStack>
          )}

          {/* Recommended Routes */}
          {event.embeds?.routes && Array.isArray(event.embeds.routes) && event.embeds.routes.length > 0 && (
            <YStack gap={16}>
              <XStack alignItems="center" gap={12}>
                <RouteIcon size={20} color="#10B981" />
                <Text fontSize={18} fontWeight="bold" color="$color">
                  Recommended Routes ({event.embeds.routes.length})
                </Text>
              </XStack>
              
              <Text fontSize={14} color="$gray11">
                These routes are recommended for this event
              </Text>

              <YStack gap={16}>
                {event.embeds.routes.map((route: any) => (
                  <View key={route.id}>
                    <RouteCard route={route} />
                  </View>
                ))}
              </YStack>
            </YStack>
          )}

          {/* Action Buttons */}
          <YStack gap={12}>
            {userStatus === null && event.visibility === 'public' && (
              <Button
                size="lg"
                backgroundColor="#00FFBC"
                color="#000"
                fontWeight="600"
                onPress={handleJoin}
                icon={<Check size={20} color="#000" />}
              >
                Join Event
              </Button>
            )}

            {userStatus === 'accepted' && (
              <Button
                size="lg"
                backgroundColor="rgba(239, 68, 68, 0.2)"
                borderColor="#EF4444"
                borderWidth={1}
                color="#EF4444"
                fontWeight="600"
                onPress={handleLeave}
                icon={<X size={20} color="#EF4444" />}
              >
                Leave Event
              </Button>
            )}

            {userStatus === 'invited' && (
              <XStack gap={12}>
                <Button
                  flex={1}
                  size="lg"
                  backgroundColor="#00FFBC"
                  color="#000"
                  fontWeight="600"
                  onPress={handleJoin}
                  icon={<Check size={20} color="#000" />}
                >
                  Accept
                </Button>
                <Button
                  flex={1}
                  size="lg"
                  backgroundColor="rgba(239, 68, 68, 0.2)"
                  borderColor="#EF4444"
                  borderWidth={1}
                  color="#EF4444"
                  fontWeight="600"
                  onPress={handleLeave}
                  icon={<X size={20} color="#EF4444" />}
                >
                  Decline
                </Button>
              </XStack>
            )}

            {canEdit && (
              <Button
                size="lg"
                backgroundColor="rgba(255, 255, 255, 0.1)"
                borderColor="rgba(255, 255, 255, 0.2)"
                borderWidth={1}
                color="$color"
                fontWeight="600"
                onPress={handleInviteUsers}
                icon={<UserPlus size={20} color="$color" />}
              >
                Invite Users
              </Button>
            )}

            {/* Calendar Export Button */}
            <Button
              size="lg"
              backgroundColor="rgba(139, 92, 246, 0.1)"
              borderColor="#8B5CF6"
              borderWidth={1}
              color="#8B5CF6"
              fontWeight="600"
              onPress={handleExportToCalendar}
              icon={<CalendarPlus size={20} color="#8B5CF6" />}
            >
              Export to Calendar
            </Button>
          </YStack>

          {/* Attendees List */}
          {event.attendees && event.attendees.length > 0 && (
            <YStack gap={16}>
              <Text fontSize={18} fontWeight="bold" color="$color">
                Attendees ({event.attendees.length})
              </Text>
              
              {event.attendees.map((attendee) => (
                <XStack
                  key={attendee.id}
                  alignItems="center"
                  gap={12}
                  padding={12}
                  backgroundColor="rgba(255, 255, 255, 0.05)"
                  borderRadius={8}
                >
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="600" color="$color">
                      {attendee.user?.full_name || 'Unknown User'}
                    </Text>
                  </YStack>
                  
                  <YStack
                    paddingHorizontal={8}
                    paddingVertical={4}
                    backgroundColor={
                      attendee.status === 'accepted' 
                        ? '#00FFBC' 
                        : attendee.status === 'rejected'
                        ? '#EF4444'
                        : '#F59E0B'
                    }
                    borderRadius={6}
                  >
                    <Text fontSize={11} fontWeight="600" color="#000">
                      {attendee.status}
                    </Text>
                  </YStack>

                  {/* Remove invitation button (only for event creators) */}
                  {event.created_by === currentUserId && (
                    <TouchableOpacity
                      onPress={() => handleRemoveInvitation(attendee.id, attendee.user?.full_name || 'Unknown User')}
                      style={{
                        padding: 6,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        borderRadius: 6,
                      }}
                    >
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </XStack>
              ))}
            </YStack>
          )}

          {/* Creator Info */}
          <YStack 
            padding={16} 
            backgroundColor="rgba(255, 255, 255, 0.05)" 
            borderRadius={12}
            gap={8}
          >
            <Text fontSize={14} fontWeight="600" color="$color">
              Event Creator
            </Text>
            <Text fontSize={14} color="$gray11">
              {event.creator?.full_name || 'Unknown'}
            </Text>
            <Text fontSize={12} color="$gray11">
              Created {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </Text>
          </YStack>

          {/* Comments for this Event */}
          <YStack gap={12}>
            <Text fontSize={18} fontWeight="bold" color="$color">
              Comments
            </Text>
            <CommentsSection targetType="event" targetId={event.id} />
          </YStack>
        </YStack>
      </ScrollView>

      {showReport && (
        <ReportDialog reportableId={event.id} reportableType="event" onClose={() => setShowReport(false)} />
      )}
    </YStack>
  );
};