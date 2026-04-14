import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useEmergencyNotifications } from "@/hooks/useEmergencyNotifications";

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

  const getLocation = useCallback((): Promise<EmergencyLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const fallback = { lat: 14.5995, lng: 120.9842 };
        toast.warning("Geolocation not supported. Using default location.");
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
          resolve(location);
        },
        () => {
          const fallback = { lat: 14.5995, lng: 120.9842 };
          toast.warning("Could not access your location. Using default location.");
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

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
