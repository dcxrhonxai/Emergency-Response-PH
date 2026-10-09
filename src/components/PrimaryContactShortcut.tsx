import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, MessageSquare, Star, UserPlus, MapPin, Loader2 } from "lucide-react";
import { usePhoneCaller } from "@/hooks/usePhoneCaller";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface PrimaryContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_primary: boolean;
}

interface PrimaryContactShortcutProps {
  userId: string;
  onOpenContacts: () => void;
}

const PrimaryContactShortcut = ({ userId, onOpenContacts }: PrimaryContactShortcutProps) => {
  const [contact, setContact] = useState<PrimaryContact | null>(null);
  const [hasContacts, setHasContacts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [situation, setSituation] = useState("");
  const [preview, setPreview] = useState<{ message: string; hasLocation: boolean } | null>(false as never);
  const [locating, setLocating] = useState(false);
  const { makeCall, sendSMS } = usePhoneCaller();
  const { triggerImpact } = useHapticFeedback();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('personal_contacts')
        .select('id, name, phone, relationship, is_primary')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        setHasContacts(false);
        setContact(null);
      } else {
        const all = data || [];
        setHasContacts(all.length > 0);
        setContact(all.find((c: PrimaryContact) => c.is_primary) || null);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const getLocationLink = (): Promise<string | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(`https://maps.google.com/?q=${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });

  const handleCall = () => {
    if (!contact) return;
    triggerImpact('medium');
    makeCall(contact.phone, contact.name);
  };

  const handleText = async () => {
    if (!contact) return;
    triggerImpact('light');
    const text = situation.trim().slice(0, 300) || "I need help.";
    const loc = await getLocationLink();
    const message = `Hi ${contact.name}, this is an urgent message. ${text}${
      loc ? `\nMy location: ${loc}` : "\n(My location is unavailable right now.)"
    }`;
    sendSMS(contact.phone, message);
  };

  if (loading) return null;

  if (!contact) {
    return (
      <Card className="p-3 bg-accent/10">
        <div className="flex items-center gap-3">
          <Star className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {hasContacts ? "No primary contact set yet" : "Add a trusted contact for one-tap help"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {hasContacts
                ? "Pick one in the Contacts tab to call or text them from here in a tap."
                : "Your primary contact gets call and text shortcuts right here on the Emergency screen."}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={onOpenContacts}>
            <UserPlus className="w-3 h-3 mr-1" aria-hidden="true" />
            {hasContacts ? "Choose" : "Add"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 bg-accent/10">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Star className="w-4 h-4 text-accent fill-current flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
            <p className="text-[10px] text-muted-foreground">
              Primary contact{contact.relationship ? ` · ${contact.relationship}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={handleCall}
            aria-label={`Call ${contact.name}`}
          >
            <Phone className="w-3 h-3 mr-1" aria-hidden="true" />
            Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={handleText}
            aria-label={`Text ${contact.name}`}
          >
            <MessageSquare className="w-3 h-3 mr-1" aria-hidden="true" />
            Text
          </Button>
        </div>
      </div>
      <Input
        placeholder="Describe your situation (added to texts)"
        value={situation}
        maxLength={300}
        onChange={(e) => setSituation(e.target.value)}
        className="h-8 text-xs"
        aria-label="Situation to include in the message"
      />
      <p className="text-[10px] text-muted-foreground mt-1">
        Texts include your current location when available.
      </p>
    </Card>
  );
};

export default PrimaryContactShortcut;
