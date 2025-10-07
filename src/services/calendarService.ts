import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date?: string;
  repeat?: string;
  recurrence_rule?: any;
  recurrence_end_date?: string;
  recurrence_count?: number;
}

interface CalendarEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  isAllDay?: boolean;
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval?: number;
    until?: Date;
    count?: number;
    byDay?: string[];
  };
}

export class CalendarService {
  /**
   * Convert app event to calendar event format
   */
  static eventToCalendarEvent(event: Event): CalendarEvent {
    const startDate = event.event_date ? new Date(event.event_date) : new Date();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours duration

    // Parse location from complex JSON or use simple string
    let locationText = '';
    if (event.location) {
      try {
        const locationData = JSON.parse(event.location);
        if (locationData.waypoints && Array.isArray(locationData.waypoints)) {
          // Multiple waypoints - use first one with fallback to search query
          const firstWaypoint = locationData.waypoints[0];
          locationText = firstWaypoint?.title || locationData.searchQuery || 'Multiple locations';
        } else if (locationData.coordinates) {
          // Single coordinate - use address or coordinates
          locationText =
            locationData.address ||
            `${locationData.coordinates.latitude.toFixed(6)}, ${locationData.coordinates.longitude.toFixed(6)}`;
        } else {
          locationText = event.location;
        }
      } catch (e) {
        // Fallback to string location
        locationText = event.location;
      }
    }

    // Convert recurrence pattern
    let recurrence = undefined;
    if (event.repeat && event.repeat !== 'none') {
      recurrence = this.convertRecurrenceRule(
        event.repeat,
        event.recurrence_rule,
        event.recurrence_end_date,
        event.recurrence_count,
      );
    }

    return {
      uid: event.id,
      title: event.title,
      description: event.description,
      location: locationText,
      startDate,
      endDate,
      isAllDay: false,
      recurrence,
    };
  }

  /**
   * Convert app recurrence to iCal recurrence
   */
  private static convertRecurrenceRule(
    repeat: string,
    recurrenceRule: any,
    endDate?: string,
    count?: number,
  ) {
    let frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    let interval = 1;
    let byDay: string[] | undefined;

    switch (repeat) {
      case 'daily':
        frequency = 'DAILY';
        break;
      case 'weekly':
        frequency = 'WEEKLY';
        if (recurrenceRule?.daysOfWeek) {
          // Convert day numbers to iCal format
          const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          byDay = recurrenceRule.daysOfWeek.map((day: number) => dayMap[day]);
        }
        break;
      case 'biweekly':
        frequency = 'WEEKLY';
        interval = 2;
        break;
      case 'monthly':
        frequency = 'MONTHLY';
        break;
      case 'custom':
        frequency = 'WEEKLY';
        interval = recurrenceRule?.interval || 1;
        break;
      default:
        frequency = 'WEEKLY';
    }

    return {
      frequency,
      interval,
      until: endDate ? new Date(endDate) : undefined,
      count,
      byDay,
    };
  }

  /**
   * Generate iCal content from calendar event
   */
  static generateICalContent(calendarEvent: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const escapeText = (text: string): string => {
      return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
    };

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//VROMM//Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${calendarEvent.uid}@vromm.app`,
      `DTSTART${calendarEvent.isAllDay ? ';VALUE=DATE' : ''}:${calendarEvent.isAllDay ? formatLocalDate(calendarEvent.startDate) : formatDate(calendarEvent.startDate)}`,
      `DTEND${calendarEvent.isAllDay ? ';VALUE=DATE' : ''}:${calendarEvent.isAllDay ? formatLocalDate(calendarEvent.endDate) : formatDate(calendarEvent.endDate)}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `SUMMARY:${escapeText(calendarEvent.title)}`,
    ];

    if (calendarEvent.description) {
      icalContent.push(`DESCRIPTION:${escapeText(calendarEvent.description)}`);
    }

    if (calendarEvent.location) {
      icalContent.push(`LOCATION:${escapeText(calendarEvent.location)}`);
    }

    // Add recurrence rule
    if (calendarEvent.recurrence) {
      const recur = calendarEvent.recurrence;
      let rrule = `FREQ=${recur.frequency}`;

      if (recur.interval && recur.interval > 1) {
        rrule += `;INTERVAL=${recur.interval}`;
      }

      if (recur.until) {
        rrule += `;UNTIL=${formatDate(recur.until)}`;
      } else if (recur.count) {
        rrule += `;COUNT=${recur.count}`;
      }

      if (recur.byDay && recur.byDay.length > 0) {
        rrule += `;BYDAY=${recur.byDay.join(',')}`;
      }

      icalContent.push(`RRULE:${rrule}`);
    }

    icalContent.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT', 'END:VCALENDAR');

    return icalContent.join('\r\n');
  }

  /**
   * Export single event to calendar
   */
  static async exportEvent(event: Event): Promise<void> {
    try {
      const calendarEvent = this.eventToCalendarEvent(event);
      const icalContent = this.generateICalContent(calendarEvent);

      // Create filename
      const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write iCal file
      await FileSystem.writeAsStringAsync(fileUri, icalContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Export Event to Calendar',
          UTI: 'com.apple.ical.ics',
        });
      } else {
        Alert.alert(
          'Calendar Export',
          `Event exported to: ${filename}\n\nYou can import this file into your calendar app.`,
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Error exporting event:', error);
      Alert.alert('Export Error', 'Failed to export event to calendar. Please try again.');
    }
  }

  /**
   * Export multiple events to calendar
   */
  static async exportMultipleEvents(events: Event[]): Promise<void> {
    try {
      const icalHeader = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//VROMM//Events//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
      ];

      const icalFooter = ['END:VCALENDAR'];

      let icalContent = icalHeader.join('\r\n') + '\r\n';

      // Add each event
      for (const event of events) {
        const calendarEvent = this.eventToCalendarEvent(event);
        const eventContent = this.generateICalContent(calendarEvent);

        // Extract just the VEVENT part
        const lines = eventContent.split('\r\n');
        const eventStart = lines.findIndex((line) => line === 'BEGIN:VEVENT');
        const eventEnd = lines.findIndex((line) => line === 'END:VEVENT');

        if (eventStart !== -1 && eventEnd !== -1) {
          const eventLines = lines.slice(eventStart, eventEnd + 1);
          icalContent += eventLines.join('\r\n') + '\r\n';
        }
      }

      icalContent += icalFooter.join('\r\n');

      // Create filename
      const filename = `VROMM_Events_${new Date().toISOString().split('T')[0]}.ics`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write iCal file
      await FileSystem.writeAsStringAsync(fileUri, icalContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Export Events to Calendar',
          UTI: 'com.apple.ical.ics',
        });
      } else {
        Alert.alert(
          'Calendar Export',
          `${events.length} events exported to: ${filename}\n\nYou can import this file into your calendar app.`,
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Error exporting events:', error);
      Alert.alert('Export Error', 'Failed to export events to calendar. Please try again.');
    }
  }

  /**
   * Generate quick add to calendar URL (for web fallback)
   */
  static generateCalendarUrl(
    event: Event,
    provider: 'google' | 'outlook' | 'apple' = 'google',
  ): string {
    const calendarEvent = this.eventToCalendarEvent(event);

    const formatDateForUrl = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const encodeParam = (text: string): string => {
      return encodeURIComponent(text);
    };

    const startDate = formatDateForUrl(calendarEvent.startDate);
    const endDate = formatDateForUrl(calendarEvent.endDate);

    switch (provider) {
      case 'google':
        const googleParams = new URLSearchParams({
          action: 'TEMPLATE',
          text: calendarEvent.title,
          dates: `${startDate}/${endDate}`,
          details: calendarEvent.description || '',
          location: calendarEvent.location || '',
        });
        return `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

      case 'outlook':
        const outlookParams = new URLSearchParams({
          subject: calendarEvent.title,
          startdt: startDate,
          enddt: endDate,
          body: calendarEvent.description || '',
          location: calendarEvent.location || '',
        });
        return `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

      case 'apple':
        // Apple Calendar uses webcal:// protocol or .ics files
        // For now, return a data URL that can be downloaded
        const icalContent = this.generateICalContent(calendarEvent);
        return `data:text/calendar;charset=utf8,${encodeParam(icalContent)}`;

      default:
        return '';
    }
  }
}
