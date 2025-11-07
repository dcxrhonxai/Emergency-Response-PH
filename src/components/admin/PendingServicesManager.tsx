import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, MapPin, Phone } from "lucide-react";

interface PendingService {
  id: string;
  name: string;
  type: string;
  phone: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  submitted_by: string;
}

export const PendingServicesManager = () => {
  const [services, setServices] = useState<PendingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingServices();
  }, []);

  const loadPendingServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pending_emergency_services")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load pending services");
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (service: PendingService) => {
    setProcessing(service.id);
    try {
      // Get current user for reviewed_by
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert into emergency_services
      const { error: insertError } = await supabase
        .from("emergency_services")
        .insert({
          name: service.name,
          type: service.type,
          phone: service.phone,
          address: service.address,
          city: service.city,
          latitude: service.latitude,
          longitude: service.longitude,
          is_national: false,
        });

      if (insertError) throw insertError;

      // Update pending service status
      const { error: updateError } = await supabase
        .from("pending_emergency_services")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", service.id);

      if (updateError) throw updateError;

      toast.success(`${service.name} approved and added to emergency services`);
      loadPendingServices();
    } catch (error: any) {
      toast.error("Failed to approve service");
      console.error(error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (serviceId: string) => {
    setProcessing(serviceId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("pending_emergency_services")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", serviceId);

      if (error) throw error;

      toast.success("Service submission rejected");
      loadPendingServices();
    } catch (error: any) {
      toast.error("Failed to reject service");
      console.error(error);
    } finally {
      setProcessing(null);
    }
  };

  const getServiceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      fire: "Fire Station",
      medical: "Medical / Hospital",
      police: "Police Station",
      rescue: "Rescue Services",
      disaster: "Disaster Response",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading pending services...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pending Service Submissions
        </CardTitle>
        <CardDescription>
          Review and approve community-submitted emergency services
        </CardDescription>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending submissions</p>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    <Badge variant="outline" className="mt-1">
                      {getServiceTypeLabel(service.type)}
                    </Badge>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {service.phone}
                  </div>
                  {service.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>
                        <p>{service.address}</p>
                        {service.city && <p>{service.city}</p>}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {service.latitude.toFixed(6)}, {service.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted: {new Date(service.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(service)}
                    disabled={processing === service.id}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(service.id)}
                    disabled={processing === service.id}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
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