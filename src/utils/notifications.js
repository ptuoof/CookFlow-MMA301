// System notifications for step timers, so a timer still rings when the app is in background
// or closed. While the app is open the in-app alert + voice already fire, so the banner is hidden.
import { Platform } from 'react-native';

const CHANNEL_ID = 'cookflow-timers';
let module = null;
let initialized = false;

const load = () => {
  if (Platform.OS === 'web') return null;
  if (!module) {
    try {
      module = require('expo-notifications');
    } catch {
      module = null;
    }
  }
  return module;
};

/** Sets the foreground behavior and the Android channel; clears schedules left by an earlier run. */
export const initTimerNotifications = async () => {
  const N = load();
  if (!N || initialized) return;
  initialized = true;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false })
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Hẹn giờ nấu ăn',
        importance: N.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 500, 300, 500]
      });
    }
    // Only timers schedule notifications: anything still pending belongs to a previous app run
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    // Notifications are a best-effort extra on top of the in-app alert
  }
};

const ensurePermission = async N => {
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;
  return (await N.requestPermissionsAsync()).granted;
};

/** Schedules the "time is up" notification of a running timer; returns its id or null. */
export const scheduleTimerNotification = async timer => {
  const N = load();
  if (!N || timer?.status !== 'running' || !(timer.endAt > Date.now())) return null;
  try {
    if (!(await ensurePermission(N))) return null;
    return await N.scheduleNotificationAsync({
      content: {
        title: '⏰ Hết giờ!',
        body: `${timer.recipeTitle} — Bước ${timer.stepIndex + 1}: ${timer.stepTitle}`,
        sound: 'default',
        data: { timerId: timer.id }
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(timer.endAt), channelId: CHANNEL_ID }
    });
  } catch {
    return null;
  }
};

export const cancelTimerNotification = async notificationId => {
  const N = load();
  if (!N || !notificationId) return;
  try {
    await N.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already delivered or never scheduled
  }
};
