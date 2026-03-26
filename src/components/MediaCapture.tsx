import { useState } from "react";
import { CameraCapture } from "./CameraCapture";
import { AudioRecorder } from "./AudioRecorder";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { compressVideo, formatFileSize, getVideoSize } from "@/lib/videoCompression";
import { uploadEvidence, UploadedFile } from "@/lib/storage";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface MediaCaptureProps {
  userId: string;
  onFilesUploaded?: (files: UploadedFile[]) => void;
}

export const MediaCapture = ({ userId, onFilesUploaded }: MediaCaptureProps) => {
  const [capturedMedia, setCapturedMedia] = useState<Array<{
    type: 'photo' | 'video' | 'audio';
    data: string;
    timestamp: Date;
    size?: number;
  }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { triggerImpact, triggerNotification } = useHapticFeedback();

  const handleCameraCapture = async (imageData: string, type: 'photo' | 'video') => {
    let finalData = imageData;
    let size = getVideoSize(imageData);

    if (type === 'video') {
      toast({
        title: "Compressing video...",
        description: "Please wait while we optimize your video",
      });

      finalData = await compressVideo(imageData);
      size = getVideoSize(finalData);

      toast({
        title: "Video ready",
        description: `Size: ${formatFileSize(size)}`,
      });
    }

    setCapturedMedia((prev) => [
      ...prev,
      {
        type,
        data: finalData,
        timestamp: new Date(),
        size,
      },
    ]);
  };

  const handleAudioCapture = (audioData: string) => {
    const size = getVideoSize(audioData);
    setCapturedMedia((prev) => [
      ...prev,
      {
        type: 'audio',
        data: audioData,
        timestamp: new Date(),
        size,
      },
    ]);
  };

  const handleUploadAll = async () => {
    if (capturedMedia.length === 0) return;
    triggerImpact('heavy');

    setIsUploading(true);
    const uploaded: UploadedFile[] = [];

    for (const media of capturedMedia) {
      const result = await uploadEvidence(userId, media.data, media.type);
      if (result) {
        uploaded.push(result);
      }
    }

    if (uploaded.length > 0) {
      setUploadedFiles((prev) => [...prev, ...uploaded]);
      setCapturedMedia([]);
      toast({
        title: "Upload complete",
        description: `${uploaded.length} file(s) uploaded successfully`,
      });
      onFilesUploaded?.(uploaded);
    } else {
      toast({
        title: "Upload failed",
        description: "Could not upload files. Please try again.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
  };

  const handleDeleteCaptured = (index: number) => {
    triggerImpact('light');
    setCapturedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="camera" className="w-full" onValueChange={() => triggerImpact('light')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="camera">Camera</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
        </TabsList>
        
        <TabsContent value="camera">
          <CameraCapture onCapture={handleCameraCapture} />
        </TabsContent>
        
        <TabsContent value="audio">
          <AudioRecorder onRecordingComplete={handleAudioCapture} />
        </TabsContent>
      </Tabs>

      {capturedMedia.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Captured Media ({capturedMedia.length})</h3>
            <Button 
              onClick={handleUploadAll} 
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload All
                </>
              )}
            </Button>
          </div>
          <div className="space-y-2">
            {capturedMedia.map((media, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-secondary/10 rounded">
                <div className="flex-1">
                  <span className="text-sm">
                    {media.type.charAt(0).toUpperCase() + media.type.slice(1)} - {media.timestamp.toLocaleTimeString()}
                  </span>
                  {media.size && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatFileSize(media.size)}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteCaptured(index)}
                  className="h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {uploadedFiles.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-green-600">Uploaded Evidence ({uploadedFiles.length})</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <span className="text-sm">
                  {file.type.charAt(0).toUpperCase() + file.type.slice(1)} - Stored securely
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
