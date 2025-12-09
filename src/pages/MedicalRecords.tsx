import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pill, Stethoscope, FileText, AlertTriangle, CreditCard, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import MedicationTracker from "@/components/MedicationTracker";
import DoctorContacts from "@/components/DoctorContacts";
import MedicalHistory from "@/components/MedicalHistory";
import { EmergencyProfile } from "@/components/EmergencyProfile";
import { OfflineMedicalID } from "@/components/OfflineMedicalID";
import { useMedicationReminders } from "@/hooks/useMedicationReminders";
import { toast } from "sonner";

const MedicalRecords = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Enable medication reminders
  const { requestNotificationPermission } = useMedicationReminders(!!userId);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Request notification permission for reminders
    if (userId) {
      requestNotificationPermission().then(granted => {
        if (granted) {
          toast.success("Medication reminders enabled");
        }
      });
    }
  }, [userId, requestNotificationPermission]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);
    setLoading(false);
  };

  if (loading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">
              {t("medical.records", "Medical Records")}
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="profile" className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">{t("medical.profile", "Profile")}</span>
            </TabsTrigger>
            <TabsTrigger value="id-card" className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">ID Card</span>
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-1.5">
              <Pill className="h-4 w-4" />
              <span className="hidden sm:inline">{t("medical.meds", "Meds")}</span>
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">{t("medical.doctors", "Doctors")}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("medical.history", "History")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <EmergencyProfile userId={userId} />
          </TabsContent>

          <TabsContent value="id-card" className="space-y-4">
            <OfflineMedicalID />
          </TabsContent>

          <TabsContent value="medications" className="space-y-4">
            <MedicationTracker userId={userId} />
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <DoctorContacts userId={userId} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <MedicalHistory userId={userId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MedicalRecords;
