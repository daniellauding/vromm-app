import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const RECORDING_TAG = 'recording_status_v1';
export const CAT_ACTIVE = 'recording_active'; // Stop | Pause
export const CAT_PAUSED = 'recording_paused'; // Stop | Resume
export const ANDROID_CHANNEL = 'recording_channel';

async function clearAnyRecordingBanners() {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((n) => (n.request.content.data as any)?.tag === RECORDING_TAG)
      .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
  );

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as any)?.tag === RECORDING_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function postRecordingBanner(categoryIdentifier: string, body: string) {
  // Ensure only one exists
  await clearAnyRecordingBanners();

  console.log('postRecordingBanner', categoryIdentifier, body);

  // Show immediately, on Android route through the silent channel
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recording',
      body,
      categoryIdentifier,
      data: { tag: RECORDING_TAG },
      sound: null, // iOS local → silent; Android → channel decides
    },
    trigger:
      Platform.OS === 'android'
        ? {
            channelId: ANDROID_CHANNEL,
            seconds: 1,
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          } // immediate, channel-aware trigger
        : { seconds: 1, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL }, // immediate on iOS
  });
}

export async function showActiveBanner() {
  // Buttons: Stop | Pause
  return postRecordingBanner(CAT_ACTIVE, 'Recording… Tap an action below.');
}

export async function showPausedBanner() {
  // Buttons: Stop | Resume
  return postRecordingBanner(CAT_PAUSED, 'Paused. Tap to resume or stop.');
}

export async function hideRecordingBanner() {
  await clearAnyRecordingBanners();
}

export async function setupRecordingNotifications() {
  // Register action categories (iOS & Android supported)
  await Notifications.setNotificationCategoryAsync(CAT_ACTIVE, [
    {
      identifier: 'vromm_stop',
      buttonTitle: 'Stop Recording',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'vromm_pause',
      buttonTitle: 'Pause Recording',
      options: { opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(CAT_PAUSED, [
    {
      identifier: 'vromm_stop',
      buttonTitle: 'Stop Recording',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'vromm_resume',
      buttonTitle: 'Resume Recording',
      options: { opensAppToForeground: false },
    },
  ]);

  // Android: silent channel (channel controls sound)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Recording',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [],
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
    });
  }

  hideRecordingBanner();
}
