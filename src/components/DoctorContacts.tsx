import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Stethoscope, Plus, Trash2, Phone, Mail, Building2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { usePhoneCaller } from "@/hooks/usePhoneCaller";

interface DoctorContact {
  id: string;
  name: string;
  specialty: string | null;
  phone: string;
  email: string | null;
  hospital: string | null;
  address: string | null;
  notes: string | null;
  is_primary: boolean;
}

interface DoctorContactsProps {
  userId: string;
}

const DoctorContacts = ({ userId }: DoctorContactsProps) => {
  const { t } = useTranslation();
  const { makeCall } = usePhoneCaller();
  const [doctors, setDoctors] = useState<DoctorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    phone: "",
    email: "",
    hospital: "",
    address: "",
    notes: "",
    is_primary: false
  });

  useEffect(() => {
    loadDoctors();
  }, [userId]);

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from("doctor_contacts")
        .select("*")
        .eq("user_id", userId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error("Error loading doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error(t("medical.fillRequired", "Please fill in required fields"));
      return;
    }

    try {
      // If setting as primary, unset others first
      if (formData.is_primary) {
        await supabase
          .from("doctor_contacts")
          .update({ is_primary: false })
          .eq("user_id", userId);
      }

      const { error } = await supabase.from("doctor_contacts").insert({
        user_id: userId,
        name: formData.name,
        specialty: formData.specialty || null,
        phone: formData.phone,
        email: formData.email || null,
        hospital: formData.hospital || null,
        address: formData.address || null,
        notes: formData.notes || null,
        is_primary: formData.is_primary
      });

      if (error) throw error;

      toast.success(t("medical.doctorAdded", "Doctor contact added"));
      setDialogOpen(false);
      setFormData({
        name: "",
        specialty: "",
        phone: "",
        email: "",
        hospital: "",
        address: "",
        notes: "",
        is_primary: false
      });
      loadDoctors();
    } catch (error) {
      console.error("Error adding doctor:", error);
      toast.error(t("medical.addError", "Failed to add doctor"));
    }
  };

  const deleteDoctor = async (id: string) => {
    try {
      const { error } = await supabase
        .from("doctor_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(t("medical.doctorDeleted", "Doctor contact deleted"));
      loadDoctors();
    } catch (error) {
      console.error("Error deleting doctor:", error);
    }
  };

  const setPrimaryDoctor = async (id: string) => {
    try {
      await supabase
        .from("doctor_contacts")
        .update({ is_primary: false })
        .eq("user_id", userId);

      await supabase
        .from("doctor_contacts")
        .update({ is_primary: true })
        .eq("id", id);

      toast.success(t("medical.primarySet", "Primary doctor updated"));
      loadDoctors();
    } catch (error) {
      console.error("Error setting primary:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            {t("medical.doctors", "Doctor Contacts")}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("medical.addDoctor", "Add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("medical.addDoctor", "Add Doctor Contact")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <Label>{t("medical.doctorName", "Doctor Name")} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. Juan Dela Cruz"
                  />
                </div>
                <div>
                  <Label>{t("medical.specialty", "Specialty")}</Label>
                  <Input
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="e.g., Cardiologist"
                  />
                </div>
                <div>
                  <Label>{t("medical.phone", "Phone")} *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
                <div>
                  <Label>{t("medical.email", "Email")}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                  />
                </div>
                <div>
                  <Label>{t("medical.hospital", "Hospital/Clinic")}</Label>
                  <Input
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    placeholder="Hospital name"
                  />
                </div>
                <div>
                  <Label>{t("medical.address", "Address")}</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Clinic address"
                  />
                </div>
                <div>
                  <Label>{t("medical.notes", "Notes")}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Office hours, special instructions..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_primary" className="cursor-pointer">
                    {t("medical.setPrimary", "Set as primary doctor")}
                  </Label>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {t("medical.save", "Save Doctor")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {doctors.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("medical.noDoctors", "No doctor contacts added yet")}
          </p>
        ) : (
          <div className="space-y-3">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{doc.name}</span>
                    {doc.is_primary && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                    {doc.specialty && (
                      <Badge variant="outline">{doc.specialty}</Badge>
                    )}
                  </div>
                  {doc.hospital && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {doc.hospital}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-1 text-primary"
                      onClick={() => makeCall(doc.phone, doc.name)}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      {doc.phone}
                    </Button>
                    {doc.email && (
                      <a
                        href={`mailto:${doc.email}`}
                        className="flex items-center gap-1 text-muted-foreground hover:text-primary"
                      >
                        <Mail className="h-3 w-3" />
                        {doc.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!doc.is_primary && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPrimaryDoctor(doc.id)}
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteDoctor(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorContacts;
