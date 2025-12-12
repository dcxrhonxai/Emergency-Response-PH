import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

interface UsePushNotificationsProps {
  userId: string;
}

// Firebase config from environment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ''}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ''}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const usePushNotifications = ({ userId }: UsePushNotificationsProps) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

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
      
      console.log('FCM token saved successfully');
      return true;
    } catch (err) {
      console.error('Error saving FCM token:', err);
      return false;
    }
  }, [userId]);

  const initializeFirebaseMessaging = useCallback(async () => {
    try {
      // Check if Firebase config is available
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.log('Firebase config not available, skipping FCM initialization');
        return null;
      }

      // Initialize Firebase if not already initialized
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      
      // Check if messaging is supported
      if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return null;
      }

      const messagingInstance = getMessaging(app);
      setMessaging(messagingInstance);

      return messagingInstance;
    } catch (err) {
      console.error('Error initializing Firebase Messaging:', err);
      return null;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        toast.success('Push notifications enabled');
        
        // Get FCM token
        if (messaging) {
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          });
          
          if (token) {
            setFcmToken(token);
            await saveFCMToken(token);
            console.log('FCM Token:', token.substring(0, 20) + '...');
          }
        }
      } else if (permission === 'denied') {
        toast.error('Push notifications blocked');
      }

      return permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied' as NotificationPermission;
    }
  }, [messaging, saveFCMToken]);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(registration => {
          console.log('FCM Service Worker registered:', registration.scope);
        })
        .catch(error => {
          console.error('FCM Service Worker registration failed:', error);
        });
    }

    // Initialize Firebase Messaging
    initializeFirebaseMessaging().then(async (msg) => {
      if (!msg) return;

      // Check current permission status
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
        
        // If already granted, get the token
        if (Notification.permission === 'granted') {
          try {
            const token = await getToken(msg, {
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            });
            
            if (token) {
              setFcmToken(token);
              await saveFCMToken(token);
            }
          } catch (err) {
            console.error('Error getting FCM token:', err);
          }
        }
      }

      // Handle foreground messages
      onMessage(msg, (payload) => {
        console.log('Foreground message received:', payload);
        
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
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: 'emergency-notification',
            requireInteraction: true,
          });
        }
      });
    });
  }, [initializeFirebaseMessaging, saveFCMToken]);

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
      console.log('Push notification sent to user:', targetUserId);
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
      console.log('Push notification sent to tokens');
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  };

  return { 
    fcmToken,
    permissionStatus,
    requestPermission,
    sendPushNotification,
    sendPushToTokens,
  };
};
