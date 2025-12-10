import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { MapPin, Phone, Navigation, Search, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { calculateDistance, formatDistance } from "@/lib/distance";
import type { Database } from "@/integrations/supabase/types";

type EmergencyService = Database['public']['Tables']['emergency_services']['Row'] & {
  distance?: number;
  formattedDistance?: string;
};

export const NearbyServicesSearch = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [filteredServices, setFilteredServices] = useState<EmergencyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState<string>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchServices();
    }
  }, [userLocation]);

  useEffect(() => {
    filterServices();
  }, [services, searchQuery, typeFilter, maxDistance]);

  const getCurrentLocation = () => {
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError("Could not get your location. Using default location.");
          // Default to Manila
          setUserLocation({ lat: 14.5995, lng: 120.9842 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported");
      setUserLocation({ lat: 14.5995, lng: 120.9842 });
    }
  };

  const fetchServices = async () => {
    if (!userLocation) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('emergency_services')
      .select('*');

    if (data) {
      const servicesWithDistance = data.map(service => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          Number(service.latitude),
          Number(service.longitude)
        );
        return {
          ...service,
          distance,
          formattedDistance: formatDistance(distance),
        };
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setServices(servicesWithDistance);
    }
    setLoading(false);
  };

  const filterServices = () => {
    let filtered = [...services];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.address?.toLowerCase().includes(query) ||
        s.city?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(s => s.type === typeFilter);
    }

    // Distance filter
    if (maxDistance !== "all") {
      const maxKm = parseFloat(maxDistance);
      filtered = filtered.filter(s => (s.distance || 0) <= maxKm);
    }

    setFilteredServices(filtered);
  };

  const openDirections = (service: EmergencyService) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${service.latitude},${service.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const callService = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const serviceTypes = [...new Set(services.map(s => s.type))];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Find Nearby Services</h2>
        </div>

        {locationError && (
          <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500 rounded text-sm text-yellow-600 dark:text-yellow-400">
            {locationError}
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, address, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {serviceTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={maxDistance} onValueChange={setMaxDistance}>
              <SelectTrigger>
                <SelectValue placeholder="Max Distance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Distance</SelectItem>
                <SelectItem value="5">Within 5 km</SelectItem>
                <SelectItem value="10">Within 10 km</SelectItem>
                <SelectItem value="25">Within 25 km</SelectItem>
                <SelectItem value="50">Within 50 km</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              getCurrentLocation();
            }}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Location
          </Button>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filteredServices.length} services found</span>
          {userLocation && (
            <span className="text-xs">
              📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </span>
          )}
        </div>

        {loading ? (
          <Card className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </Card>
        ) : filteredServices.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No services found matching your criteria
          </Card>
        ) : (
          filteredServices.map((service) => (
            <Card key={service.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{service.name}</h3>
                    {service.is_national && (
                      <Badge variant="secondary" className="text-xs">National</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{service.type}</p>
                  {service.address && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.address}, {service.city}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {service.formattedDistance}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{service.phone}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => callService(service.phone)}
                    className="h-8 w-8"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => openDirections(service)}
                    className="h-8 w-8"
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
