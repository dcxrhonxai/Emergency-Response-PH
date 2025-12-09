import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time_of_day: string[];
  is_active: boolean;
}

// Map time_of_day values to hours
const timeToHourMap: Record<string, number[]> = {
  morning: [7, 8, 9],
  noon: [11, 12, 13],
  afternoon: [14, 15, 16],
  evening: [18, 19, 20],
  bedtime: [21, 22, 23]
};

export const useMedicationReminders = (enabled: boolean = true) => {
  const checkReminders = useCallback(async () => {
    if (!enabled) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentHour = new Date().getHours();

      // Find matching time periods
      const matchingTimes: string[] = [];
      for (const [timeKey, hours] of Object.entries(timeToHourMap)) {
        if (hours.includes(currentHour)) {
          matchingTimes.push(timeKey);
        }
      }

      if (matchingTimes.length === 0) return;

      // Fetch user's active medications
      const { data: medications, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error || !medications) return;

      // Check which medications need reminders
      const dueReminders = medications.filter((med: Medication) => {
        if (!med.time_of_day || med.time_of_day.length === 0) return false;
        return med.time_of_day.some(time => matchingTimes.includes(time));
      });

      // Show local notifications
      for (const med of dueReminders) {
        // Check if we already showed this reminder recently (using localStorage)
        const reminderKey = `med_reminder_${med.id}_${currentHour}`;
        const lastShown = localStorage.getItem(reminderKey);
        const now = Date.now();

        if (lastShown && now - parseInt(lastShown) < 3600000) {
          // Already shown within the last hour
          continue;
        }

        // Mark as shown
        localStorage.setItem(reminderKey, String(now));

        // Show toast notification
        toast.info(`💊 Time to take ${med.name}`, {
          description: `Dosage: ${med.dosage}`,
          duration: 10000,
          action: {
            label: "View",
            onClick: () => window.location.href = "/medical-records"
          }
        });

        // Try to show browser notification if permitted
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Medication Reminder", {
            body: `Time to take ${med.name} (${med.dosage})`,
            icon: "/favicon.ico",
            tag: `med-${med.id}`
          });
        }
      }
    } catch (error) {
      console.error("Error checking medication reminders:", error);
    }
  }, [enabled]);

  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Check immediately on mount
    checkReminders();

    // Then check every 15 minutes
    const interval = setInterval(checkReminders, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, checkReminders]);

  return { checkReminders, requestNotificationPermission };
};
