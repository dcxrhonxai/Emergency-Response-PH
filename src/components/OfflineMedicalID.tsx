import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Heart, AlertTriangle, FileText, User, Wifi, WifiOff, RefreshCw, Pill } from "lucide-react";
import { useOfflineMedicalID } from "@/hooks/useOfflineMedicalID";
import { format } from "date-fns";

export const OfflineMedicalID = () => {
  const { t } = useTranslation();
  const { offlineData, isOnline, syncing, syncData, hasOfflineData } = useOfflineMedicalID();

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (!hasOfflineData) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="p-8 text-center">
            <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Offline Data Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect to the internet to sync your medical ID for offline access.
            </p>
            {isOnline && (
              <Button onClick={syncData} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                Sync Now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, primaryContact, medications, lastUpdated } = offlineData;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Status Banner */}
      <div className={`flex items-center justify-between p-2 rounded-lg ${isOnline ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-700 dark:text-green-300">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-700 dark:text-yellow-300">Offline Mode</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated: {format(new Date(lastUpdated), "MMM d, h:mm a")}
          </span>
          {isOnline && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={syncData} disabled={syncing}>
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Medical ID Card */}
      <Card className="border-2 border-destructive shadow-lg">
        <CardHeader className="bg-destructive text-destructive-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-6 w-6" />
              {t("medicalID.title", "Medical ID")}
            </CardTitle>
            <Badge variant="secondary" className="bg-white text-destructive">
              EMERGENCY
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Profile Picture */}
          <div className="flex justify-center">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-3xl bg-muted">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Personal Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" />
              {profile?.full_name || t("medicalID.noInfo", "Not specified")}
            </div>
            {profile?.phone_number && (
              <p className="text-sm text-muted-foreground pl-6">{profile.phone_number}</p>
            )}
          </div>

          <Separator />

          {/* Blood Type */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t("medicalID.bloodType", "Blood Type")}
            </p>
            <p className="text-2xl font-bold text-destructive">
              {profile?.blood_type || t("medicalID.noInfo", "Not specified")}
            </p>
          </div>

          <Separator />

          {/* Allergies */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold">{t("medicalID.allergies", "Allergies")}</p>
            </div>
            <p className="text-sm pl-6">
              {profile?.allergies || t("medicalID.noInfo", "None reported")}
            </p>
          </div>

          {/* Medical Conditions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold">{t("medicalID.medicalConditions", "Medical Conditions")}</p>
            </div>
            <p className="text-sm pl-6">
              {profile?.medical_conditions || t("medicalID.noInfo", "None reported")}
            </p>
          </div>

          {/* Current Medications */}
          {medications.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold">Current Medications</p>
              </div>
              <div className="pl-6 space-y-1">
                {medications.map((med, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{med.name}</span>
                    <span className="text-muted-foreground"> - {med.dosage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Notes */}
          {profile?.emergency_notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold">{t("medicalID.notes", "Emergency Notes")}</p>
              </div>
              <p className="text-sm pl-6">{profile.emergency_notes}</p>
            </div>
          )}

          <Separator />

          {/* Emergency Contact */}
          {primaryContact && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("medicalID.emergencyContact", "Emergency Contact")}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{primaryContact.name}</p>
                  {primaryContact.relationship && (
                    <p className="text-xs text-muted-foreground">{primaryContact.relationship}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCall(primaryContact.phone)}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {t("medicalID.call", "Call")}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Instructions */}
          <p className="text-xs text-center text-muted-foreground italic">
            {t("medicalID.instructions", "Show this card to emergency responders")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
