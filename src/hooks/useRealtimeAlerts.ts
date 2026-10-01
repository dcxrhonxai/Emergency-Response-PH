import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RealtimeAlert {
  id: string;
  user_id: string;
  emergency_type: string;
  situation: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  evidence_files: any;
}

export const useRealtimeAlerts = (userId: string | undefined) => {
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Fetch initial alerts
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from("emergency_alerts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching alerts:", error);
        toast({
          title: "Error",
          description: "Failed to load alerts",
          variant: "destructive",
        });
      } else {
        setAlerts(data || []);
      }
      setIsLoading(false);
    };

    fetchAlerts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("emergency_alerts_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_alerts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new as RealtimeAlert, ...prev]);
          
          toast({
            title: "Emergency Alert Created",
            description: `${payload.new.emergency_type} alert is now active`,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_alerts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts((prev) =>
            prev.map((alert) =>
              alert.id === payload.new.id ? (payload.new as RealtimeAlert) : alert
            )
          );

          if (payload.new.status !== payload.old.status) {
            toast({
              title: "Alert Status Updated",
              description: `Alert is now ${payload.new.status}`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "emergency_alerts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts((prev) => prev.filter((alert) => alert.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  return { alerts, isLoading };
};
