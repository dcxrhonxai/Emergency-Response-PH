import { Phone, WifiOff, Shield, Flame, Ambulance, Waves, Heart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Hotline {
  name: string;
  number: string;
  description: string;
  icon: typeof Phone;
  primary?: boolean;
}

// Built-in Philippine national hotlines — always available, no internet needed.
const NATIONAL_HOTLINES: Hotline[] = [
  {
    name: "National Emergency Hotline",
    number: "911",
    description: "All emergencies — police, fire, medical, rescue",
    icon: AlertTriangle,
    primary: true,
  },
  {
    name: "Philippine National Police",
    number: "117",
    description: "Crime and police assistance",
    icon: Shield,
  },
  {
    name: "Bureau of Fire Protection",
    number: "160",
    description: "Fire emergencies",
    icon: Flame,
  },
  {
    name: "Philippine Red Cross",
    number: "143",
    description: "Ambulance, disaster response, first aid",
    icon: Ambulance,
  },
  {
    name: "NDRRMC Disaster Hotline",
    number: "911",
    description: "Typhoons, earthquakes, floods",
    icon: Waves,
  },
  {
    name: "Mental Health Crisis Line",
    number: "1553",
    description: "DOH crisis support (toll-free via landline)",
    icon: Heart,
  },
];

interface OfflineEmergencyScreenProps {
  reason?: "offline" | "location_failed";
  onDismiss?: () => void;
}

export const OfflineEmergencyScreen = ({ reason = "offline", onDismiss }: OfflineEmergencyScreenProps) => {
  const call = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="bg-card rounded-lg shadow-lg border-2 border-destructive/40 overflow-hidden" role="alert">
      <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center gap-2">
        <WifiOff className="w-5 h-5 shrink-0" />
        <div>
          <h2 className="font-bold text-base leading-tight">Offline Emergency Mode</h2>
          <p className="text-xs opacity-90">
            {reason === "location_failed"
              ? "Location lookup failed — these national hotlines work anywhere in the Philippines."
              : "No internet connection — these national hotlines work anywhere in the Philippines."}
          </p>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {NATIONAL_HOTLINES.map((h) => (
          <button
            key={h.name}
            onClick={() => call(h.number)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
              h.primary
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted hover:bg-muted/70"
            }`}
          >
            <h.icon className="w-6 h-6 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{h.name}</div>
              <div className={`text-xs ${h.primary ? "opacity-90" : "text-muted-foreground"}`}>
                {h.description}
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-lg shrink-0">
              <Phone className="w-4 h-4" />
              {h.number}
            </div>
          </button>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-1">
          Calls use your phone's dialer and work without internet.
        </p>

        {onDismiss && (
          <Button variant="outline" size="sm" className="w-full" onClick={onDismiss}>
            Back to app
          </Button>
        )}
      </div>
    </div>
  );
};
