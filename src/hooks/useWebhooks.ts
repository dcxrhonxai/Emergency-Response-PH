import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebhookPayload {
  event_type: 'alert_created' | 'alert_resolved' | 'alert_escalated' | 'location_updated';
  alert_id?: string;
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface WebhookConfig {
  url: string;
  events: string[];
  enabled: boolean;
}

const WEBHOOK_CONFIG_KEY = 'emergency_webhook_config';

export const useWebhooks = () => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const getWebhookConfig = useCallback((): WebhookConfig | null => {
    try {
      const stored = localStorage.getItem(WEBHOOK_CONFIG_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const saveWebhookConfig = useCallback((config: WebhookConfig) => {
    localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(config));
  }, []);

  const sendWebhook = useCallback(async (
    eventType: WebhookPayload['event_type'],
    userId: string,
    data: Record<string, unknown>,
    alertId?: string
  ): Promise<boolean> => {
    const config = getWebhookConfig();
    
    if (!config?.enabled || !config.url) {
      console.log('Webhook not configured or disabled');
      return false;
    }

    if (!config.events.includes(eventType)) {
      console.log(`Webhook not configured for event: ${eventType}`);
      return false;
    }

    setIsSending(true);

    try {
      const payload: WebhookPayload = {
        event_type: eventType,
        alert_id: alertId,
        user_id: userId,
        data,
        timestamp: new Date().toISOString(),
      };

      const { data: response, error } = await supabase.functions.invoke('send-webhook', {
        body: {
          webhook_url: config.url,
          payload,
        },
      });

      if (error) {
        console.error('Webhook error:', error);
        return false;
      }

      console.log('Webhook sent:', response);
      return response?.success ?? false;
    } catch (error) {
      console.error('Failed to send webhook:', error);
      return false;
    } finally {
      setIsSending(false);
    }
  }, [getWebhookConfig]);

  const testWebhook = useCallback(async (url: string): Promise<boolean> => {
    setIsSending(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? 'test-user';

      const { data: response, error } = await supabase.functions.invoke('send-webhook', {
        body: {
          webhook_url: url,
          payload: {
            event_type: 'alert_created',
            user_id: userId,
            data: {
              test: true,
              message: 'This is a test webhook from Emergency Response PH',
            },
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) {
        toast({
          title: 'Webhook Test Failed',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      if (response?.success) {
        toast({
          title: 'Webhook Test Successful',
          description: 'Your webhook endpoint received the test payload.',
        });
        return true;
      } else {
        toast({
          title: 'Webhook Test Failed',
          description: `Endpoint returned status ${response?.status}`,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      toast({
        title: 'Webhook Test Failed',
        description: 'Failed to send test webhook',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSending(false);
    }
  }, [toast]);

  // Convenience methods for specific events
  const onAlertCreated = useCallback((userId: string, alertData: Record<string, unknown>, alertId: string) => {
    return sendWebhook('alert_created', userId, alertData, alertId);
  }, [sendWebhook]);

  const onAlertResolved = useCallback((userId: string, alertData: Record<string, unknown>, alertId: string) => {
    return sendWebhook('alert_resolved', userId, alertData, alertId);
  }, [sendWebhook]);

  const onAlertEscalated = useCallback((userId: string, alertData: Record<string, unknown>, alertId: string) => {
    return sendWebhook('alert_escalated', userId, alertData, alertId);
  }, [sendWebhook]);

  const onLocationUpdated = useCallback((userId: string, locationData: Record<string, unknown>) => {
    return sendWebhook('location_updated', userId, locationData);
  }, [sendWebhook]);

  return {
    isSending,
    getWebhookConfig,
    saveWebhookConfig,
    sendWebhook,
    testWebhook,
    onAlertCreated,
    onAlertResolved,
    onAlertEscalated,
    onLocationUpdated,
  };
};
