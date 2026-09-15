import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin, Clock, AlertTriangle, FolderOpen, Loader2 } from "lucide-react";
import { RealtimeAlert } from "@/hooks/useRealtimeAlerts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addAlertToCaseAsFinding } from "@/lib/caseLinking";

interface ActiveAlertsProps {
  alerts: RealtimeAlert[];
}

export const ActiveAlerts = ({ alerts }: ActiveAlertsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [linking, setLinking] = useState<string | null>(null);
  const activeAlerts = alerts.filter((alert) => alert.status === "active");

  const handleOpenCase = async (alert: RealtimeAlert) => {
    setLinking(alert.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { caseId, created, findingAdded } = await addAlertToCaseAsFinding(alert as any, user.id);
      toast({
        title: created ? "Case created" : "Case updated",
        description: findingAdded
          ? "This alert was added to the case as a finding."
          : "This alert is already recorded in the case.",
      });
      navigate(`/cases/${caseId}`);
    } catch (error) {
      console.error("Open case error:", error);
      toast({ title: "Error", description: "Could not open the case for this alert", variant: "destructive" });
    } finally {
      setLinking(null);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ 
        status: "resolved",
        resolved_at: new Date().toISOString()
      })
      .eq("id", alertId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Alert Resolved",
        description: "Your emergency alert has been marked as resolved",
      });
    }
  };

  const handleFalseAlarm = async (alertId: string) => {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ 
        status: "false_alarm",
        resolved_at: new Date().toISOString()
      })
      .eq("id", alertId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to cancel alert",
        variant: "destructive",
      });
    } else {
      toast({
        title: "False Alarm",
        description: "Alert has been marked as false alarm and cancelled",
      });
    }
  };

  if (activeAlerts.length === 0) {
    return null;
  }

  const getEmergencyColor = (type: string) => {
    const colors: Record<string, string> = {
      medical: "bg-red-500",
      fire: "bg-orange-500",
      police: "bg-blue-500",
      natural_disaster: "bg-purple-500",
      accident: "bg-yellow-500",
      other: "bg-gray-500",
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
        <h2 className="text-xl font-bold">Active Emergency Alerts</h2>
        <Badge variant="destructive" className="ml-auto">
          {activeAlerts.length}
        </Badge>
      </div>

      {activeAlerts.map((alert) => (
        <Card key={alert.id} className="p-4 border-l-4 border-l-destructive animate-in fade-in slide-in-from-top">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Badge className={getEmergencyColor(alert.emergency_type)}>
                  {alert.emergency_type.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="animate-pulse">
                  ACTIVE
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleFalseAlarm(alert.id)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  False Alarm
                </Button>
                <Button
                  onClick={() => handleResolveAlert(alert.id)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Resolved
                </Button>
              </div>
            </div>

            <p className="text-sm font-medium">{alert.situation}</p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>
                  {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            {alert.evidence_files && alert.evidence_files.length > 0 && (
              <div className="text-xs text-muted-foreground">
                📎 {alert.evidence_files.length} evidence file(s) attached
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
