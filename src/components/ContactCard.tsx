import { EmergencyContact } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, MapPin } from "lucide-react";
import { usePhoneCaller } from "@/hooks/usePhoneCaller";

interface ContactCardProps {
  contact: EmergencyContact;
}

const ContactCard = ({ contact }: ContactCardProps) => {
  const { makeCall, sendSMS, isCalling } = usePhoneCaller();

  const handleCall = () => {
    makeCall(contact.phone, contact.name);
  };

  const handleMessage = () => {
    sendSMS(contact.phone);
  };

  return (
    <article 
      className="bg-background border-2 border-border rounded-lg p-4 hover:shadow-md transition-shadow"
      aria-label={`Emergency contact: ${contact.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1 truncate">{contact.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Phone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="font-mono" aria-label={`Phone number: ${contact.phone}`}>{contact.phone}</span>
          </div>
          {contact.distance && (
            <div className="flex items-center gap-1 text-xs text-accent">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              <span aria-label={`Distance: ${contact.distance}`}>{contact.distance} away</span>
            </div>
          )}
          {contact.isNational && (
            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded" role="status">
              National Hotline
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0" role="group" aria-label={`Actions for ${contact.name}`}>
          <Button
            onClick={handleCall}
            disabled={isCalling}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-w-24"
            aria-label={isCalling ? `Calling ${contact.name}` : `Call ${contact.name} at ${contact.phone}`}
          >
            <Phone className="w-4 h-4 mr-1" aria-hidden="true" />
            {isCalling ? 'Calling...' : 'Call'}
          </Button>
          <Button
            onClick={handleMessage}
            size="sm"
            variant="outline"
            className="min-w-24"
            aria-label={`Send text message to ${contact.name}`}
          >
            <MessageSquare className="w-4 h-4 mr-1" aria-hidden="true" />
            Text
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ContactCard;
