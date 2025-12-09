import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "offline_medical_id";

interface OfflineMedicalData {
  profile: {
    full_name: string | null;
    phone_number: string | null;
    blood_type: string | null;
    allergies: string | null;
    medical_conditions: string | null;
    emergency_notes: string | null;
    profile_picture: string | null;
  } | null;
  primaryContact: {
    name: string;
    phone: string;
    relationship: string | null;
  } | null;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  lastUpdated: string;
}

export const useOfflineMedicalID = () => {
  const [offlineData, setOfflineData] = useState<OfflineMedicalData | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setOfflineData(JSON.parse(cached));
      } catch (e) {
        console.error("Error parsing cached medical data:", e);
      }
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync data from server
  const syncData = useCallback(async () => {
    if (!isOnline) return false;

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncing(false);
        return false;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone_number, blood_type, allergies, medical_conditions, emergency_notes, profile_picture")
        .eq("id", user.id)
        .single();

      // Fetch primary contact
      const { data: contactData } = await supabase
        .from("personal_contacts")
        .select("name, phone, relationship")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Fetch active medications
      const { data: medsData } = await supabase
        .from("medications")
        .select("name, dosage, frequency")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(10);

      const newData: OfflineMedicalData = {
        profile: profileData,
        primaryContact: contactData,
        medications: medsData || [],
        lastUpdated: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      setOfflineData(newData);

      console.log("Medical ID data synced for offline use");
      return true;
    } catch (error) {
      console.error("Error syncing medical data:", error);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [isOnline]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncData();
    }
  }, [isOnline, syncData]);

  // Clear cached data
  const clearCache = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setOfflineData(null);
  }, []);

  return {
    offlineData,
    isOnline,
    syncing,
    syncData,
    clearCache,
    hasOfflineData: !!offlineData
  };
};
