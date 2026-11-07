import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { useNotificationFilter } from './useNotificationFilter';
import { useNotificationSounds } from './useNotificationSounds';

interface UsePushNotificationsProps {
  userId: string;
}

export type PushRegistrationStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'not-configured'
  | 'unsupported'
  | 'open-in-new-tab'
  | 'denied'
  | 'native-setup-required'
  | 'error';

// Firebase's web app settings are public client configuration, supplied by the connection.
const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID || '';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY || '',
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID || '',
  appId,
  messagingSenderId: appId.split(':')[1] || '',
};
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY || '';

const hasFirebaseWebConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  firebaseConfig.messagingSenderId &&
  vapidKey
);

export const usePushNotifications = ({ userId }: UsePushNotificationsProps) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [registrationStatus, setRegistrationStatus] = useState<PushRegistrationStatus>('idle');
  const { shouldShowNotification, isWithinQuietHours, getQuietHoursStatus } = useNotificationFilter();
  const { playEmergencySound } = useNotificationSounds();

  const saveFCMToken = useCallback(async (token: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', userId);

      if (error) {
        console.error('Error saving FCM token:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error saving FCM token:', err);
      return false;
    }
  }, [userId]);

  const initializeFirebaseMessaging = useCallback(async () => {
    try {
      if (!hasFirebaseWebConfig || !(await isSupported())) {
        return null;
      }

      const app = getApps().find((existing) => existing.name === '[DEFAULT]') || initializeApp(firebaseConfig);
      const messagingInstance = getMessaging(app);
      setMessaging(messagingInstance);

      return messagingInstance;
    } catch (err) {
      console.error('Error initializing Firebase Messaging:', err);
      return null;
    }
  }, []);

  const registerWebDevice = useCallback(async (requestPermission: boolean): Promise<PushRegistrationStatus> => {
    try {
      if (Capacitor.isNativePlatform()) {
        setRegistrationStatus('native-setup-required');
        return 'native-setup-required';
      }

      if (!userId) return 'error';
      if (!hasFirebaseWebConfig) {
        setRegistrationStatus('not-configured');
        return 'not-configured';
      }
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
        setRegistrationStatus('unsupported');
        return 'unsupported';
      }
      if (window.top !== window.self) {
        setRegistrationStatus('open-in-new-tab');
        return 'open-in-new-tab';
      }

      setRegistrationStatus('registering');
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : requestPermission
          ? await Notification.requestPermission()
          : Notification.permission;
      setPermissionStatus(permission);

      if (permission !== 'granted') {
        const status = permission === 'denied' ? 'denied' : 'idle';
        setRegistrationStatus(status);
        return status;
      }

      const messagingInstance = messaging || await initializeFirebaseMessaging();
      if (!messagingInstance) {
        setRegistrationStatus('unsupported');
        return 'unsupported';
      }

      const workerConfig = new URLSearchParams(firebaseConfig).toString();
      const serviceWorkerRegistration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${workerConfig}`
      );
      const token = await getToken(messagingInstance, { vapidKey, serviceWorkerRegistration });
      if (!token) {
        setRegistrationStatus('error');
        return 'error';
      }

      const saved = await saveFCMToken(token);
      if (!saved) {
        setRegistrationStatus('error');
        return 'error';
      }

      setFcmToken(token);
      setRegistrationStatus('registered');
      return 'registered';
    } catch (err) {
      console.error('Error registering push notifications:', err);
      setRegistrationStatus('error');
      return 'error';
    }
  }, [userId, messaging, initializeFirebaseMessaging, saveFCMToken]);

  const requestPermission = useCallback(async () => {
    return registerWebDevice(true);
  }, [registerWebDevice]);

  useEffect(() => {
    if (!userId) return;
    if (Capacitor.isNativePlatform()) {
      setRegistrationStatus('native-setup-required');
      return;
    }
    if (!hasFirebaseWebConfig) {
      setRegistrationStatus('not-configured');
      return;
    }
    if (!('Notification' in window) || !(Notification.permission === 'granted')) {
      if ('Notification' in window) setPermissionStatus(Notification.permission);
      return;
    }
    if (window.top !== window.self) {
      setRegistrationStatus('open-in-new-tab');
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let active = true;
    initializeFirebaseMessaging().then(async (msg) => {
      if (!msg) return;
      if (!active) return;
      setPermissionStatus(Notification.permission);
      await registerWebDevice(false);

      // Handle foreground messages with notification filtering
      unsubscribe = onMessage(msg, (payload) => {
        // Check if notification should be shown based on user preferences and quiet hours
        const emergencyType = payload.data?.emergency_type || payload.notification?.title || '';
        if (!shouldShowNotification(emergencyType)) {
          // Log filtered notification for history
          try {
            const existing = JSON.parse(localStorage.getItem('dndFilteredNotifications') || '[]');
            existing.unshift({
              type: emergencyType,
              time: new Date().toLocaleString(),
              reason: isWithinQuietHours() ? 'Quiet hours active' : 'Alert type disabled',
            });
            localStorage.setItem('dndFilteredNotifications', JSON.stringify(existing.slice(0, 100)));
          } catch (e) {}
          return;
        }

        // Play custom sound for the emergency type
        playEmergencySound(emergencyType);

        // Show toast notification for foreground messages
        toast(payload.notification?.title || 'New Notification', {
          description: payload.notification?.body,
          duration: 10000,
          action: payload.data?.url ? {
            label: 'View',
            onClick: () => window.location.href = payload.data?.url || '/',
          } : undefined,
        });

        // Also show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'Emergency Alert', {
            body: payload.notification?.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'emergency-notification',
            requireInteraction: true,
          });
        }
      });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [userId, initializeFirebaseMessaging, registerWebDevice, shouldShowNotification, isWithinQuietHours, playEmergencySound]);

  const sendPushNotification = async (
    targetUserId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: targetUserId,
          title,
          body,
          data,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  };

  const sendPushToTokens = async (
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title,
          body,
          data,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  };

  return { 
    fcmToken,
    permissionStatus,
    registrationStatus,
    requestPermission,
    sendPushNotification,
    sendPushToTokens,
  };
};
