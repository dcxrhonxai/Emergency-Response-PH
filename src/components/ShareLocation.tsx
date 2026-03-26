import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface PersonalContact {
  id: string;
  name: string;
  phone: string;
}

interface ShareLocationProps {
  userId: string;
  location: { lat: number; lng: number };
  situation: string;
}

const ShareLocation = ({ userId, location, situation }: ShareLocationProps) => {
  const [contacts, setContacts] = useState<PersonalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { triggerImpact } = useHapticFeedback();

  useEffect(() => {
    loadContacts();
  }, [userId]);

  const loadContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('personal_contacts')
      .select('id, name, phone')
      .eq('user_id', userId);

    if (error) {
      toast.error("Failed to load contacts");
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const shareLocation = (contact: PersonalContact) => {
    const googleMapsUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    const message = `EMERGENCY ALERT: ${situation}. My location: ${googleMapsUrl}`;
    
    // Open SMS with pre-filled message
    window.location.href = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
    toast.success(`Sharing location with ${contact.name}...`);
  };

  const shareWithAll = () => {
    if (contacts.length === 0) {
      toast.error("No contacts to share with");
      return;
    }

    const googleMapsUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    const message = `EMERGENCY ALERT: ${situation}. My location: ${googleMapsUrl}`;
    
    // For multiple contacts, we can't pre-fill the message on all platforms
    // So we'll just open the SMS app
    const phoneNumbers = contacts.map(c => c.phone).join(',');
    window.location.href = `sms:${phoneNumbers}?body=${encodeURIComponent(message)}`;
    toast.success("Opening SMS to share with all contacts...");
  };

  if (loading) {
    return null;
  }

  if (contacts.length === 0) {
    return (
      <Card className="p-6 bg-accent/10">
        <div className="flex items-start gap-3">
          <Share2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Share Your Location</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Add personal contacts in the Contacts tab to quickly share your emergency location with them.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-accent/10">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Share2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Share Your Location</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Send your emergency location to your contacts via SMS
            </p>

            {/* Share with All Button */}
            <Button 
              onClick={shareWithAll}
              className="w-full mb-3"
              variant="secondary"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Share with All Contacts
            </Button>

            {/* Individual Contacts */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Or share individually:</p>
              {contacts.map((contact) => (
                <Button
                  key={contact.id}
                  onClick={() => shareLocation(contact)}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Share2 className="w-3 h-3 mr-2" />
                  Share with {contact.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ShareLocation;
