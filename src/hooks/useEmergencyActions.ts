import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useEmergencyNotifications } from "@/hooks/useEmergencyNotifications";
import { logEvent } from "@/lib/firebase";

interface EmergencyLocation {
  lat: number;
  lng: number;
}

interface UseEmergencyActionsProps {
  userId?: string;
  userEmail?: string;
  onAlertCreated: (alertId: string, location: EmergencyLocation) => void;
  onLocationSet: (location: EmergencyLocation) => void;
}

export const useEmergencyActions = ({
  userId,
  userEmail,
  onAlertCreated,
  onLocationSet,
}: UseEmergencyActionsProps) => {
  const { triggerImpact, triggerNotification } = useHapticFeedback();
  const { sendNotifications } = useEmergencyNotifications();

  const requestLocationPermission = useCallback(async (): Promise<PermissionState | 'unsupported'> => {
    if (!navigator.permissions || !navigator.permissions.query) {
      logEvent('location_permission_result', { result: 'unsupported', reason: 'permissions_api_missing' });
      return 'unsupported';
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

      if (status.state === 'prompt') {
        toast.info('Location access needed', {
          description: 'We use your location to send responders to you and find the nearest emergency services. Please allow location access on the next prompt.',
          duration: 5000,
        });
      } else if (status.state === 'denied') {
        toast.warning('Location is blocked', {
          description: 'Enable location in your browser settings so responders can find you. Using default location for now.',
          duration: 6000,
        });
      }

      logEvent('location_permission_result', { result: status.state });
      return status.state;
    } catch (err) {
      logEvent('location_permission_result', { result: 'error', reason: (err as Error).message });
      return 'unsupported';
    }
  }, []);

  const getLocation = useCallback(async (): Promise<EmergencyLocation> => {
    const permission = await requestLocationPermission();

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const fallback = { lat: 14.5995, lng: 120.9842 };
        toast.warning("Geolocation not supported. Using default location.");
        logEvent('location_detection_result', { result: 'unsupported', permission });
        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          if (position.coords.accuracy > 50) {
            toast.warning(`Location accuracy: ±${Math.round(position.coords.accuracy)}m`);
          }
          logEvent('location_detection_result', {
            result: 'success',
            permission,
            accuracy: Math.round(position.coords.accuracy),
          });
          resolve(location);
        },
        (err) => {
          const fallback = { lat: 14.5995, lng: 120.9842 };
          toast.warning("Could not access your location. Using default location.");
          logEvent('location_detection_result', {
            result: 'error',
            permission,
            error_code: err.code,
            error_message: err.message,
          });
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [requestLocationPermission]);

  const notifyContacts = useCallback(async (
    alertId: string,
    location: EmergencyLocation,
    type: string,
    description: string,
    evidenceFiles?: any[]
  ) => {
    if (!userId) return;

    const { data: contacts } = await supabase
      .from("personal_contacts")
      .select("name, phone")
      .eq("user_id", userId);

    if (contacts && contacts.length > 0) {
      const formattedContacts = contacts.map(c => ({
        name: c.name,
        phone: c.phone,
        email: userEmail || undefined,
      }));

      await sendNotifications(
        alertId,
        formattedContacts,
        type,
        description,
        location,
        evidenceFiles?.map(f => ({ url: f.url, type: f.type }))
      );
    }
  }, [userId, userEmail, sendNotifications]);

  const createAlert = useCallback(async (
    type: string,
    description: string,
    evidenceFiles?: any[]
  ) => {
    if (!userId) return;

    try {
      const location = await getLocation();
      onLocationSet(location);

      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: userId,
          emergency_type: type,
          situation: description,
          latitude: location.lat,
          longitude: location.lng,
          evidence_files: evidenceFiles || [],
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to create alert. Please try again.");
        console.error("Error saving alert:", error);
        return;
      }

      if (data) {
        onAlertCreated(data.id, location);
        await notifyContacts(data.id, location, type, description, evidenceFiles);
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
      console.error("Emergency action error:", err);
    }
  }, [userId, getLocation, onLocationSet, onAlertCreated, notifyContacts]);

  const handleQuickSOS = useCallback(async () => {
    await triggerImpact('heavy');
    await createAlert("🚨 EMERGENCY - SOS", "Quick SOS activated - Immediate help needed");
    await triggerNotification('warning');
  }, [triggerImpact, triggerNotification, createAlert]);

  const handleSilentPanic = useCallback(async () => {
    await triggerImpact('heavy');
    await createAlert("🔇 Silent Panic", "Silent panic alert activated - Send help discreetly");
    await triggerNotification('warning');
  }, [triggerImpact, triggerNotification, createAlert]);

  const resolveAlert = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from('emergency_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', alertId);

    if (error) {
      toast.error("Failed to resolve alert");
      console.error("Error resolving alert:", error);
    }
  }, []);

  return {
    createAlert,
    handleQuickSOS,
    handleSilentPanic,
    resolveAlert,
    triggerImpact,
  };
};
