import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Navigation, Clock, Car, PersonStanding, Loader2, Route, AlertTriangle } from "lucide-react";
import { calculateDistance, formatDistance } from "@/lib/distance";
import type { Database } from "@/integrations/supabase/types";

type EmergencyService = Database['public']['Tables']['emergency_services']['Row'];

interface RouteInfo {
  service: EmergencyService;
  distance: number;
  drivingTime?: number;
  walkingTime?: number;
  trafficLevel?: 'low' | 'moderate' | 'heavy';
}

interface RouteOptimizationProps {
  userLocation: { lat: number; lng: number };
  emergencyType?: string;
  onRouteSelected?: (service: EmergencyService) => void;
}

export const RouteOptimization = ({ 
  userLocation, 
  emergencyType,
  onRouteSelected 
}: RouteOptimizationProps) => {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const [travelMode, setTravelMode] = useState<'driving' | 'walking'>('driving');

  useEffect(() => {
    fetchOptimizedRoutes();
  }, [userLocation, emergencyType]);

  const fetchOptimizedRoutes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('emergency_services').select('*');
      
      // Filter by emergency type if provided
      if (emergencyType) {
        const typeMap: Record<string, string[]> = {
          '🔥 Fire': ['Fire Station', 'BFP'],
          '🏥 Medical': ['Hospital', 'Medical Center', 'Clinic'],
          '👮 Police': ['Police Station', 'PNP'],
          '🆘 Disaster': ['NDRRMC', 'MDRRMO', 'Rescue'],
        };
        const matchingTypes = typeMap[emergencyType];
        if (matchingTypes) {
          query = query.in('type', matchingTypes);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Calculate routes with estimated times
        const routesWithInfo: RouteInfo[] = data.map(service => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(service.latitude),
            Number(service.longitude)
          );

          // Estimate travel times (simplified calculation)
          // Average driving speed: 30 km/h in city with traffic
          // Average walking speed: 5 km/h
          const drivingTime = Math.ceil((distance / 30) * 60); // minutes
          const walkingTime = Math.ceil((distance / 5) * 60); // minutes

          // Simulate traffic levels based on time of day
          const hour = new Date().getHours();
          let trafficLevel: 'low' | 'moderate' | 'heavy' = 'low';
          if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            trafficLevel = 'heavy';
          } else if ((hour >= 10 && hour <= 16) || (hour >= 20 && hour <= 22)) {
            trafficLevel = 'moderate';
          }

          return {
            service,
            distance,
            drivingTime: trafficLevel === 'heavy' ? Math.ceil(drivingTime * 1.5) : 
                        trafficLevel === 'moderate' ? Math.ceil(drivingTime * 1.2) : drivingTime,
            walkingTime,
            trafficLevel,
          };
        }).sort((a, b) => {
          // Sort by travel time based on mode
          const timeA = travelMode === 'driving' ? a.drivingTime! : a.walkingTime!;
          const timeB = travelMode === 'driving' ? b.drivingTime! : b.walkingTime!;
          return timeA - timeB;
        });

        setRoutes(routesWithInfo.slice(0, 5)); // Top 5 routes
        if (routesWithInfo.length > 0 && !selectedRoute) {
          setSelectedRoute(routesWithInfo[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
    setLoading(false);
  };

  const openDirections = (route: RouteInfo) => {
    const mode = travelMode === 'driving' ? 'driving' : 'walking';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${route.service.latitude},${route.service.longitude}&travelmode=${mode}`;
    window.open(url, '_blank');
    onRouteSelected?.(route.service);
  };

  const getTrafficColor = (level?: 'low' | 'moderate' | 'heavy') => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'heavy': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getTrafficLabel = (level?: 'low' | 'moderate' | 'heavy') => {
    switch (level) {
      case 'low': return 'Light traffic';
      case 'moderate': return 'Moderate traffic';
      case 'heavy': return 'Heavy traffic';
      default: return '';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Finding best routes...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Optimized Routes</h3>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={travelMode === 'driving' ? 'default' : 'outline'}
              onClick={() => setTravelMode('driving')}
            >
              <Car className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={travelMode === 'walking' ? 'default' : 'outline'}
              onClick={() => setTravelMode('walking')}
            >
              <PersonStanding className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No services found nearby
          </div>
        ) : (
          <div className="space-y-2">
            {routes.map((route, index) => (
              <div
                key={route.service.id}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedRoute?.service.id === route.service.id
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
                onClick={() => setSelectedRoute(route)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">Fastest</Badge>
                      )}
                      <h4 className="font-semibold truncate">{route.service.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{route.service.type}</p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {travelMode === 'driving' ? route.drivingTime : route.walkingTime} min
                      </span>
                      <span>{formatDistance(route.distance)}</span>
                      {travelMode === 'driving' && route.trafficLevel && (
                        <span className={`flex items-center gap-1 ${getTrafficColor(route.trafficLevel)}`}>
                          {route.trafficLevel === 'heavy' && <AlertTriangle className="w-3 h-3" />}
                          {getTrafficLabel(route.trafficLevel)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDirections(route);
                    }}
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedRoute && (
        <Card className="overflow-hidden">
          <iframe
            title="Route Preview"
            width="100%"
            height="250"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedRoute.service.latitude},${selectedRoute.service.longitude}&mode=${travelMode}`}
          ></iframe>
          
          <div className="p-3 border-t bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{selectedRoute.service.name}</p>
                <p className="text-xs text-muted-foreground">
                  {travelMode === 'driving' ? selectedRoute.drivingTime : selectedRoute.walkingTime} min · {formatDistance(selectedRoute.distance)}
                </p>
              </div>
              <Button onClick={() => openDirections(selectedRoute)}>
                <Navigation className="w-4 h-4 mr-2" />
                Start Navigation
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
