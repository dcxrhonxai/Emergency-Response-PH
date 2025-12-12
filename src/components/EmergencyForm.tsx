import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Flame, Activity, Car, Home, Users, Camera, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { emergencyFormSchema } from "@/lib/validation";
import { MediaCapture } from "./MediaCapture";
import { AutoEvidenceCapture } from "./AutoEvidenceCapture";
import { UploadedFile } from "@/lib/storage";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Badge } from "./ui/badge";

interface EmergencyFormProps {
  onEmergencyClick: (type: string, situation: string, evidenceFiles?: UploadedFile[]) => void;
  userId: string;
  isEmergencyActive?: boolean;
}

const EmergencyForm = ({ onEmergencyClick, userId, isEmergencyActive = false }: EmergencyFormProps) => {
  const [situation, setSituation] = useState("");
  const [emergencyType, setEmergencyType] = useState("");
  const [showMediaCapture, setShowMediaCapture] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedFile[]>([]);
  const { isOnline, pendingCount } = useOfflineSync();

  const emergencyTypes = [
    { value: "fire", label: "Fire Emergency", icon: Flame },
    { value: "medical", label: "Medical Emergency", icon: Activity },
    { value: "police", label: "Police / Crime", icon: AlertCircle },
    { value: "accident", label: "Road Accident", icon: Car },
    { value: "disaster", label: "Natural Disaster", icon: Home },
    { value: "other", label: "Other Emergency", icon: Users },
  ];

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setEvidenceFiles(prev => [...prev, ...files]);
  };

  const handleSubmit = () => {
    // Validate input using Zod schema
    const result = emergencyFormSchema.safeParse({
      situation,
      emergencyType,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    onEmergencyClick(emergencyType, situation.trim(), evidenceFiles);
  };

  return (
    <div className="space-y-3">
      {/* Status Banner */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-center bg-card rounded-lg p-2 shadow">
          <Badge variant="outline" className="text-xs">{pendingCount} pending sync</Badge>
        </div>
      )}

      {/* Warning Banner */}
      <div className="bg-primary/10 border border-primary rounded-lg p-3 text-center">
        <AlertCircle className="w-6 h-6 text-primary mx-auto mb-1" />
        <h2 className="text-base font-bold text-foreground mb-1">Emergency Response</h2>
        <p className="text-xs text-muted-foreground">
          Fill form to access emergency services
        </p>
      </div>

      {/* Form */}
      <div className="bg-card rounded-lg shadow-lg p-3 space-y-3">
        {/* Situation Description */}
        <div className="space-y-1">
          <label htmlFor="situation" className="text-xs font-semibold text-foreground block">
            Describe Your Situation *
          </label>
          <Textarea
            id="situation"
            placeholder="Describe what's happening..."
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="min-h-20 text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be specific to help responders
          </p>
        </div>

        {/* Emergency Type Selection */}
        <div className="space-y-1">
          <label htmlFor="emergency-type" className="text-xs font-semibold text-foreground block">
            Type of Emergency *
          </label>
          <Select value={emergencyType} onValueChange={setEmergencyType}>
            <SelectTrigger id="emergency-type" className="text-sm h-9">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {emergencyTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value} className="text-sm py-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3" />
                      {type.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Media Capture Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Evidence (Optional)
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMediaCapture(!showMediaCapture)}
              className="h-7 text-xs"
            >
              <Camera className="w-3 h-3 mr-1" />
              {showMediaCapture ? 'Hide' : 'Add'}
            </Button>
          </div>
          {showMediaCapture && (
            <MediaCapture userId={userId} onFilesUploaded={handleFilesUploaded} />
          )}
          {evidenceFiles.length > 0 && !showMediaCapture && (
            <p className="text-xs text-green-600">
              {evidenceFiles.length} file(s) attached
            </p>
          )}
        </div>

        {/* Auto Evidence Capture */}
        <AutoEvidenceCapture 
          userId={userId} 
          isEmergencyActive={isEmergencyActive}
          onFilesChange={(files) => setEvidenceFiles(files)}
        />

        {/* Emergency Button */}
        <Button
          onClick={handleSubmit}
          className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          NEED HELP NOW
        </Button>

        {/* Info Text */}
        <div className="text-center space-y-1 text-xs text-muted-foreground">
          <p>Location detected automatically</p>
          <p className="font-semibold text-foreground">
            Life-threatening? Call 911
          </p>
        </div>
      </div>
      <div className="bg-accent/10 rounded-lg p-2 space-y-1">
        <h3 className="text-xs font-semibold text-foreground">Tips:</h3>
        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>Stay calm, speak clearly</li>
          <li>Provide exact location</li>
          <li>Follow dispatcher instructions</li>
        </ul>
      </div>
      
      {/* AdMob Banner Space */}
      <div className="h-12 bg-muted/20 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30">
        <span className="text-xs text-muted-foreground">Ad Space</span>
      </div>
    </div>
  );
};

export default EmergencyForm;
