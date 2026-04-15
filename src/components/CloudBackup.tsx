import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Cloud, CloudUpload, CloudDownload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BACKUP_STORAGE_KEY = "last_cloud_backup";

interface BackupMeta {
  createdAt: string;
  counts: Record<string, number>;
}

export const CloudBackup = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupMeta | null>(() => {
    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const { data, error } = await supabase.functions.invoke("cloud-backup", {
        body: { action: "create" },
      });

      if (error) throw error;

      const backup = data.backup;

      // Save backup as downloadable JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `emergency-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Also save to localStorage as latest backup
      const meta: BackupMeta = {
        createdAt: backup.createdAt,
        counts: {
          contacts: backup.personalContacts?.length || 0,
          doctors: backup.doctorContacts?.length || 0,
          medications: backup.medications?.length || 0,
          medicalHistory: backup.medicalHistory?.length || 0,
          contactGroups: backup.contactGroups?.length || 0,
        },
      };
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(meta));
      localStorage.setItem("cloud_backup_data", JSON.stringify(backup));
      setLastBackup(meta);

      toast.success("Backup created and downloaded successfully");
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Failed to create backup");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      // Try localStorage first, then prompt file upload
      let backupData = null;
      const stored = localStorage.getItem("cloud_backup_data");
      if (stored) {
        backupData = JSON.parse(stored);
      } else {
        // Prompt file upload
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        backupData = await new Promise<any>((resolve, reject) => {
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return reject(new Error("No file selected"));
            const text = await file.text();
            resolve(JSON.parse(text));
          };
          input.click();
          setTimeout(() => reject(new Error("File selection timeout")), 30000);
        });
      }

      if (!backupData) {
        toast.error("No backup data found");
        return;
      }

      const { data, error } = await supabase.functions.invoke("cloud-backup", {
        body: { action: "restore", backupData },
      });

      if (error) throw error;

      toast.success("Data restored successfully! Refresh to see changes.");
    } catch (error: any) {
      if (error.message === "File selection timeout") {
        toast.info("Restore cancelled");
      } else {
        console.error("Restore error:", error);
        toast.error("Failed to restore backup");
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Cloud Backup
        </CardTitle>
        <CardDescription>
          Back up your contacts, medical records, and settings to the cloud
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastBackup && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Last backup:</span>
              <span className="text-muted-foreground">
                {new Date(lastBackup.createdAt).toLocaleDateString()} at{" "}
                {new Date(lastBackup.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(lastBackup.counts).map(([key, count]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {count} {key}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleBackup} disabled={isBackingUp} className="flex-1">
            {isBackingUp ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4 mr-2" />
            )}
            {isBackingUp ? "Backing up..." : "Create Backup"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isRestoring} className="flex-1">
                {isRestoring ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CloudDownload className="h-4 w-4 mr-2" />
                )}
                {isRestoring ? "Restoring..." : "Restore Backup"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Restore from Backup
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will restore your contacts, medical records, and settings from your last backup.
                  Existing data will be preserved — only missing items will be added.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-xs text-muted-foreground">
          Backups include: emergency profile, personal contacts, doctor contacts, medications, medical history, and contact groups.
        </p>
      </CardContent>
    </Card>
  );
};
