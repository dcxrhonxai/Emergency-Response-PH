import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePushNotificationsProps {
  userId: string;
}

export const usePushNotifications = ({ userId }: UsePushNotificationsProps) => {
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('Push notifications enabled');
        }
      });
    }

    // Register service worker for FCM (if not already registered)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Save FCM token to profile when available
    // This would integrate with Firebase Cloud Messaging
    const saveFCMToken = async (token: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', userId);

      if (error) {
        console.error('Error saving FCM token:', error);
      }
    };

    // Placeholder for actual FCM token retrieval
    // In production, this would use Firebase SDK
    // saveFCMToken('example-fcm-token');

  }, [userId]);

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

  return { sendPushNotification };
};
