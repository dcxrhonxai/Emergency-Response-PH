import { Camera, CameraOff, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAutoEvidenceCapture } from "@/hooks/useAutoEvidenceCapture";
import { useState } from "react";
import { UploadedFile } from "@/lib/storage";

interface AutoEvidenceCaptureProps {
  userId: string;
  isEmergencyActive: boolean;
  onFilesChange?: (files: UploadedFile[]) => void;
}

export const AutoEvidenceCapture = ({
  userId,
  isEmergencyActive,
  onFilesChange,
}: AutoEvidenceCaptureProps) => {
  const [autoEnabled, setAutoEnabled] = useState(false);

  const {
    capturedFiles,
    isCapturing,
    captureCount,
    maxCaptures,
    error,
    capturePhoto,
  } = useAutoEvidenceCapture({
    userId,
    isActive: isEmergencyActive && autoEnabled,
    captureInterval: 30000, // 30 seconds
    maxCaptures: 10,
    onFileUploaded: (file) => {
      onFilesChange?.([...capturedFiles, file]);
    },
  });

  const progressPercent = (captureCount / maxCaptures) * 100;

  return (
    <Card role="region" aria-label="Automatic evidence capture">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Camera className="w-4 h-4" aria-hidden="true" />
            Auto Evidence Capture
          </span>
          <Badge 
            variant={autoEnabled && isEmergencyActive ? "default" : "secondary"}
            className="text-xs"
          >
            {autoEnabled && isEmergencyActive ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label 
            htmlFor="auto-capture-toggle" 
            className="text-sm text-muted-foreground"
          >
            Auto-capture every 30s during emergency
          </Label>
          <Switch
            id="auto-capture-toggle"
            checked={autoEnabled}
            onCheckedChange={setAutoEnabled}
            aria-describedby="auto-capture-description"
          />
        </div>
        <p id="auto-capture-description" className="sr-only">
          When enabled, photos will be automatically captured and uploaded every 30 seconds during an active emergency
        </p>

        {autoEnabled && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Captures: {captureCount}/{maxCaptures}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-2"
                aria-label={`Evidence capture progress: ${captureCount} of ${maxCaptures}`}
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={capturePhoto}
                disabled={isCapturing || captureCount >= maxCaptures}
                className="flex-1"
                aria-busy={isCapturing}
              >
                {isCapturing ? (
                  <>
                    <Camera className="w-4 h-4 mr-2 animate-pulse" aria-hidden="true" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" aria-hidden="true" />
                    Capture Now
                  </>
                )}
              </Button>
            </div>

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            {capturedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Captured Evidence:</p>
                <div className="flex flex-wrap gap-2">
                  {capturedFiles.map((file, index) => (
                    <div
                      key={file.path}
                      className="relative w-12 h-12 rounded-md overflow-hidden border border-border"
                    >
                      <img
                        src={file.url}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Badge 
                        className="absolute bottom-0 right-0 text-[8px] px-1"
                        variant="secondary"
                      >
                        {index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!autoEnabled && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <CameraOff className="w-3 h-3" aria-hidden="true" />
            Enable to automatically capture evidence during emergencies
          </p>
        )}
      </CardContent>
    </Card>
  );
};
