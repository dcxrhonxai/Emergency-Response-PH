import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Navigation, Phone, MapPin, ExternalLink } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useTranslation } from "react-i18next";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { RouteOptimization } from "./RouteOptimization";
import type { Database } from "@/integrations/supabase/types";

type EmergencyService = Database['public']['Tables']['emergency_services']['Row'] & {
  distance?: string;
};

interface EmergencyDirectionsProps {
  userLocation: { lat: number; lng: number };
  emergencyType: string;
}

export const EmergencyDirections = ({ userLocation, emergencyType }: EmergencyDirectionsProps) => {
  const [nearbyServices, setNearbyServices] = useState<EmergencyService[]>([]);
  const [selectedService, setSelectedService] = useState<EmergencyService | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchNearbyServices();
  }, [emergencyType, userLocation]);

  const fetchNearbyServices = async () => {
    const { data, error } = await supabase
      .from('emergency_services')
      .select('*');

    if (data) {
      // Calculate distances and sort by proximity
      const servicesWithDistance: EmergencyService[] = data.map(service => {
        const distanceKm = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          Number(service.latitude),
          Number(service.longitude)
        );
        return {
          ...service,
          distance: formatDistance(distanceKm)
        };
      }).sort((a, b) => {
        const distA = parseFloat(a.distance || '0');
        const distB = parseFloat(b.distance || '0');
        return distA - distB;
      });

      setNearbyServices(servicesWithDistance.slice(0, 5));
      if (servicesWithDistance.length > 0) {
        setSelectedService(servicesWithDistance[0]);
      }
    }
    
    if (error) {
      console.error('Error fetching services:', error);
    }
  };

  const openGoogleMaps = (service: EmergencyService) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${service.latitude},${service.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const callService = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <Tabs defaultValue="optimized" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="optimized">Optimized Routes</TabsTrigger>
        <TabsTrigger value="nearby">Nearby Services</TabsTrigger>
      </TabsList>

      <TabsContent value="optimized">
        <RouteOptimization 
          userLocation={userLocation} 
          emergencyType={emergencyType}
        />
      </TabsContent>

      <TabsContent value="nearby" className="space-y-4">
      {/* Map with Route */}
      {selectedService && (
        <Card className="overflow-hidden">
          <iframe
            title="Route Map"
            width="100%"
            height="300"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedService.latitude},${selectedService.longitude}&mode=driving`}
          ></iframe>
          
          <div className="p-4 border-t">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{selectedService.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedService.address}, {selectedService.city}</p>
                <Badge variant="secondary" className="mt-2">
                  ~{selectedService.distance} away
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => callService(selectedService.phone)}
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => openGoogleMaps(selectedService)}
                >
                  <Navigation className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Nearby Services List */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          {t('directions.nearbyServices')}
        </h3>
        <div className="space-y-3">
          {nearbyServices.map((service) => (
            <div
              key={service.id}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                selectedService?.id === service.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              onClick={() => setSelectedService(service)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold">{service.name}</h4>
                  <p className="text-sm text-muted-foreground">{service.type}</p>
                  <p className="text-xs text-muted-foreground mt-1">{service.distance}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      callService(service.phone);
                    }}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGoogleMaps(service);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Philippine Emergency Services Info */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
          🇵🇭 Philippine Emergency Hotlines
        </h3>
        <div className="space-y-1 text-sm">
          <p><strong>National Emergency Hotline:</strong> 911</p>
          <p><strong>NDRRMC:</strong> (02) 8911-1406</p>
          <p><strong>PNP Hotline:</strong> 117 or (02) 8722-0650</p>
          <p><strong>Red Cross:</strong> 143 or (02) 8790-2300</p>
        </div>
      </Card>
      </TabsContent>
    </Tabs>
  );
};
