import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { cn } from "@/lib/utils";

interface VoiceCommandsOverlayProps {
  onEmergencyTrigger: (type: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function VoiceCommandsOverlay({ 
  onEmergencyTrigger, 
  onCancel,
  className 
}: VoiceCommandsOverlayProps) {
  const { 
    isListening, 
    isSupported, 
    transcript, 
    confidence,
    toggleListening 
  } = useVoiceCommands({
    onEmergencyTrigger,
    onCancel,
    enabled: true,
  });

  if (!isSupported) {
    return null;
  }

  return (
    <div className={cn("fixed bottom-20 right-4 z-50", className)}>
      <Card className={cn(
        "transition-all duration-300 shadow-lg",
        isListening ? "ring-2 ring-primary animate-pulse" : ""
      )}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Button
              variant={isListening ? "default" : "outline"}
              size="icon"
              onClick={toggleListening}
              className={cn(
                "h-12 w-12 rounded-full transition-all",
                isListening && "bg-primary animate-pulse"
              )}
            >
              {isListening ? (
                <Volume2 className="h-6 w-6 animate-pulse" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            
            <div className="flex flex-col min-w-[120px]">
              <span className="text-sm font-medium">
                {isListening ? "Listening..." : "Voice Commands"}
              </span>
              {isListening && transcript && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  "{transcript}"
                </span>
              )}
              {isListening && confidence > 0 && (
                <Badge variant="secondary" className="w-fit mt-1 text-xs">
                  {Math.round(confidence * 100)}% confident
                </Badge>
              )}
            </div>
          </div>

          {isListening && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
              <p className="font-medium mb-1">Say:</p>
              <ul className="space-y-0.5">
                <li>• "Help" or "SOS" - General emergency</li>
                <li>• "Police" - Police emergency</li>
                <li>• "Medical" or "Ambulance"</li>
                <li>• "Fire" - Fire emergency</li>
                <li>• "Cancel" - Cancel alert</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
