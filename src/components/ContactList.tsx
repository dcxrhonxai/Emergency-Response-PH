import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmergencyContact } from "@/pages/Index";
import ContactCard from "./ContactCard";
import { Phone } from "lucide-react";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { toast } from "sonner";

interface ContactListProps {
  emergencyType: string;
  userLocation: { lat: number; lng: number } | null;
}

const ContactList = ({ emergencyType, userLocation }: ContactListProps) => {
  const [emergencyServices, setEmergencyServices] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmergencyServices();
  }, []);

  const loadEmergencyServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('emergency_services')
      .select('*');

    if (error) {
      toast.error("Failed to load emergency services");
      console.error(error);
      setLoading(false);
      return;
    }

    // Convert database format to component format and calculate distances
    const services: EmergencyContact[] = (data || []).map((service: any) => {
      let distance: string | undefined;
      
      if (userLocation && !service.is_national) {
        const distanceKm = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          parseFloat(service.latitude),
          parseFloat(service.longitude)
        );
        distance = formatDistance(distanceKm);
      }

      return {
        id: service.id,
        name: service.name,
        type: service.type,
        phone: service.phone,
        distance,
        isNational: service.is_national,
      };
    });

    setEmergencyServices(services);
    setLoading(false);
  };

  // Filter and sort contacts
  const filterAndSortContacts = (services: EmergencyContact[]) => {
    let filtered = services;
    
    // Filter by emergency type
    if (emergencyType !== "other") {
      filtered = services.filter(
        (service) => service.type === emergencyType || service.type === "all"
      );
    }

    // Separate national and local
    const national = filtered.filter((s) => s.isNational);
    const local = filtered
      .filter((s) => !s.isNational)
      .sort((a, b) => {
        // Sort by distance if available
        if (a.distance && b.distance) {
          const distA = parseFloat(a.distance);
          const distB = parseFloat(b.distance);
          return distA - distB;
        }
        return 0;
      });

    return { national, local };
  };

  const { national: filteredNational, local: filteredLocal } = filterAndSortContacts(emergencyServices);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading emergency services...
      </div>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Emergency Services Directory">
      {/* National Contacts */}
      <section className="bg-card rounded-lg shadow-lg p-6" aria-labelledby="national-contacts-heading">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 id="national-contacts-heading" className="text-xl font-bold text-foreground">National Emergency Contacts</h2>
        </div>
        <ul className="space-y-3" role="list" aria-label="National emergency contacts list">
          {filteredNational.map((contact) => (
            <li key={contact.id}>
              <ContactCard contact={contact} />
            </li>
          ))}
        </ul>
      </section>

      {/* Local Contacts */}
      {userLocation && filteredLocal.length > 0 && (
        <section className="bg-card rounded-lg shadow-lg p-6" aria-labelledby="nearby-services-heading">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-accent" aria-hidden="true" />
            <h2 id="nearby-services-heading" className="text-xl font-bold text-foreground">Nearby Emergency Services</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Services near your current location
          </p>
          <ul className="space-y-3" role="list" aria-label="Nearby emergency services list">
            {filteredLocal.map((contact) => (
              <li key={contact.id}>
                <ContactCard contact={contact} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* No Contacts Message */}
      {filteredNational.length === 0 && filteredLocal.length === 0 && (
        <div className="bg-muted rounded-lg p-8 text-center" role="status">
          <p className="text-muted-foreground">
            No specific contacts found for this emergency type. Please call 911 for immediate
            assistance.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactList;
