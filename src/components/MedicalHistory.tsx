import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Calendar, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface MedicalEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  doctor_id: string | null;
  user_id: string;
  attachments: unknown;
  created_at: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
}

interface MedicalHistoryProps {
  userId: string;
}

const eventTypes = [
  { value: "diagnosis", label: "Diagnosis", color: "bg-red-500" },
  { value: "surgery", label: "Surgery", color: "bg-purple-500" },
  { value: "hospitalization", label: "Hospitalization", color: "bg-orange-500" },
  { value: "vaccination", label: "Vaccination", color: "bg-green-500" },
  { value: "checkup", label: "Check-up", color: "bg-blue-500" },
  { value: "test", label: "Lab Test", color: "bg-cyan-500" },
  { value: "procedure", label: "Procedure", color: "bg-indigo-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

const MedicalHistory = ({ userId }: MedicalHistoryProps) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<MedicalEvent[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    event_type: "checkup",
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    doctor_id: ""
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [eventsRes, doctorsRes] = await Promise.all([
        supabase
          .from("medical_history")
          .select("*")
          .eq("user_id", userId)
          .order("event_date", { ascending: false }),
        supabase
          .from("doctor_contacts")
          .select("id, name, specialty")
          .eq("user_id", userId)
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (doctorsRes.error) throw doctorsRes.error;

      setEvents(eventsRes.data || []);
      setDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.event_date) {
      toast.error(t("medical.fillRequired", "Please fill in required fields"));
      return;
    }

    try {
      const { error } = await supabase.from("medical_history").insert({
        user_id: userId,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        doctor_id: formData.doctor_id || null
      });

      if (error) throw error;

      toast.success(t("medical.eventAdded", "Medical event added"));
      setDialogOpen(false);
      setFormData({
        event_type: "checkup",
        title: "",
        description: "",
        event_date: format(new Date(), "yyyy-MM-dd"),
        doctor_id: ""
      });
      loadData();
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error(t("medical.addError", "Failed to add event"));
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from("medical_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(t("medical.eventDeleted", "Medical event deleted"));
      loadData();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const getEventType = (type: string) => 
    eventTypes.find(e => e.value === type) || eventTypes[eventTypes.length - 1];

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return null;
    return doctors.find(d => d.id === doctorId)?.name;
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
            <FileText className="h-5 w-5 text-primary" />
            {t("medical.history", "Medical History")}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("medical.addEvent", "Add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("medical.addEvent", "Add Medical Event")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("medical.eventType", "Event Type")}</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("medical.title", "Title")} *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Annual Physical Exam"
                  />
                </div>
                <div>
                  <Label>{t("medical.eventDate", "Date")} *</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
                {doctors.length > 0 && (
                  <div>
                    <Label>{t("medical.doctor", "Doctor")}</Label>
                    <Select
                      value={formData.doctor_id}
                      onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name} {doc.specialty && `(${doc.specialty})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>{t("medical.description", "Description")}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Details about the event..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {t("medical.save", "Save Event")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("medical.noHistory", "No medical history recorded yet")}
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
              
              {events.map((event) => {
                const eventType = getEventType(event.event_type);
                const doctorName = getDoctorName(event.doctor_id);
                
                return (
                  <div key={event.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div className={`absolute left-1.5 top-2 w-3 h-3 rounded-full ${eventType.color}`} />
                    
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {eventType.label}
                            </Badge>
                            <span className="font-medium">{event.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.event_date), "MMM d, yyyy")}
                            </span>
                            {doctorName && (
                              <span className="flex items-center gap-1">
                                <Stethoscope className="h-3 w-3" />
                                {doctorName}
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteEvent(event.id)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicalHistory;
