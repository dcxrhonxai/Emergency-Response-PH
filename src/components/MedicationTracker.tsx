import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pill, Plus, Trash2, Clock, Calendar, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: string;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
}

interface MedicationTrackerProps {
  userId: string;
}

const frequencyOptions = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "four_times_daily", label: "Four times daily" },
  { value: "every_other_day", label: "Every other day" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
];

const timeOptions = [
  { value: "morning", label: "Morning" },
  { value: "noon", label: "Noon" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "bedtime", label: "Bedtime" },
];

const MedicationTracker = ({ userId }: MedicationTrackerProps) => {
  const { t } = useTranslation();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "once_daily",
    time_of_day: [] as string[],
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    notes: ""
  });

  useEffect(() => {
    loadMedications();
  }, [userId]);

  const loadMedications = async () => {
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error("Error loading medications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.dosage) {
      toast.error(t("medical.fillRequired", "Please fill in required fields"));
      return;
    }

    try {
      const { error } = await supabase.from("medications").insert({
        user_id: userId,
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        time_of_day: formData.time_of_day,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes || null
      });

      if (error) throw error;

      toast.success(t("medical.medicationAdded", "Medication added"));
      setDialogOpen(false);
      setFormData({
        name: "",
        dosage: "",
        frequency: "once_daily",
        time_of_day: [],
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
        notes: ""
      });
      loadMedications();
    } catch (error) {
      console.error("Error adding medication:", error);
      toast.error(t("medical.addError", "Failed to add medication"));
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(t("medical.medicationDeleted", "Medication deleted"));
      loadMedications();
    } catch (error) {
      console.error("Error deleting medication:", error);
    }
  };

  const toggleTimeOfDay = (time: string) => {
    setFormData(prev => ({
      ...prev,
      time_of_day: prev.time_of_day.includes(time)
        ? prev.time_of_day.filter(t => t !== time)
        : [...prev.time_of_day, time]
    }));
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
            <Pill className="h-5 w-5 text-primary" />
            {t("medical.medications", "Medications")}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("medical.addMedication", "Add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("medical.addMedication", "Add Medication")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("medical.medicationName", "Medication Name")} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Aspirin"
                  />
                </div>
                <div>
                  <Label>{t("medical.dosage", "Dosage")} *</Label>
                  <Input
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 100mg"
                  />
                </div>
                <div>
                  <Label>{t("medical.frequency", "Frequency")}</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("medical.timeOfDay", "Time of Day")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {timeOptions.map(opt => (
                      <Badge
                        key={opt.value}
                        variant={formData.time_of_day.includes(opt.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTimeOfDay(opt.value)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("medical.startDate", "Start Date")}</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("medical.endDate", "End Date")}</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("medical.notes", "Notes")}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Special instructions..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {t("medical.save", "Save Medication")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {medications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("medical.noMedications", "No medications added yet")}
          </p>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{med.name}</span>
                    <Badge variant="secondary">{med.dosage}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {frequencyOptions.find(f => f.value === med.frequency)?.label}
                    </span>
                    {med.time_of_day.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        {med.time_of_day.join(", ")}
                      </span>
                    )}
                  </div>
                  {med.notes && (
                    <p className="text-xs text-muted-foreground">{med.notes}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMedication(med.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicationTracker;
