import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, Clock, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEvidence } from "@/lib/storage";

interface EmergencyAlert {
  id: string;
  emergency_type: string;
  situation: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  evidence_files: any;
}

interface AlertHistoryProps {
  userId: string;
}

const AlertHistory = ({ userId }: AlertHistoryProps) => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [userId]);

  const loadAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('emergency_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      toast.error("Failed to load alert history");
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEmergencyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      fire: "Fire Emergency",
      medical: "Medical Emergency",
      police: "Police / Crime",
      accident: "Road Accident",
      disaster: "Natural Disaster",
      other: "Other Emergency",
    };
    return types[type] || type;
  };

  const handleDeleteAlert = async (alertId: string, evidenceFiles: any) => {
    setDeleting(alertId);
    try {
      // Delete evidence files from storage first
      if (evidenceFiles && Array.isArray(evidenceFiles)) {
        for (const file of evidenceFiles) {
          if (file.path) {
            const bucketMap: Record<string, string> = {
              photo: 'emergency-photos',
              video: 'emergency-videos',
              audio: 'emergency-audio'
            };
            const bucket = bucketMap[file.type];
            if (bucket) {
              await deleteEvidence(bucket, file.path);
            }
          }
        }
      }

      // Delete related messages
      await supabase
        .from('emergency_messages')
        .delete()
        .eq('alert_id', alertId);

      // Delete related notifications
      await supabase
        .from('alert_notifications')
        .delete()
        .eq('alert_id', alertId);

      // Delete the alert
      const { error } = await supabase
        .from('emergency_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success("Alert deleted successfully");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete alert");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAllAlerts = async () => {
    setDeleting("all");
    try {
      // Get all alerts with evidence
      const alertsWithEvidence = alerts.filter(a => a.evidence_files && Array.isArray(a.evidence_files));
      
      // Delete all evidence files
      for (const alert of alertsWithEvidence) {
        const evidenceFiles = alert.evidence_files as any[];
        for (const file of evidenceFiles) {
          if (file.path) {
            const bucketMap: Record<string, string> = {
              photo: 'emergency-photos',
              video: 'emergency-videos',
              audio: 'emergency-audio'
            };
            const bucket = bucketMap[file.type];
            if (bucket) {
              await deleteEvidence(bucket, file.path);
            }
          }
        }
      }

      // Delete all related messages
      await supabase
        .from('emergency_messages')
        .delete()
        .in('alert_id', alerts.map(a => a.id));

      // Delete all related notifications
      await supabase
        .from('alert_notifications')
        .delete()
        .in('alert_id', alerts.map(a => a.id));

      // Delete all alerts
      const { error } = await supabase
        .from('emergency_alerts')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setAlerts([]);
      toast.success("All alerts deleted successfully");
    } catch (error: any) {
      console.error("Delete all error:", error);
      toast.error("Failed to delete all alerts");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading history...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Emergency Alert History</h2>
          <p className="text-sm text-muted-foreground">
            Your past emergency alerts and their status
          </p>
        </div>
        {alerts.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting === "all"}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Alerts?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your emergency alert history and associated evidence files. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllAlerts} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No emergency alerts in your history
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {getEmergencyTypeLabel(alert.emergency_type)}
                      </h3>
                      <Badge 
                        variant={alert.status === 'active' ? 'destructive' : 'secondary'}
                      >
                        {alert.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {alert.situation}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        disabled={deleting === alert.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Alert?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this emergency alert and its evidence files. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteAlert(alert.id, alert.evidence_files)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(alert.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                    </span>
                  </div>
                  {alert.resolved_at && (
                    <div className="flex items-center gap-1 text-success">
                      <span>Resolved: {formatDate(alert.resolved_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Showing up to 20 most recent alerts
        </p>
      )}
    </div>
  );
};

export default AlertHistory;
