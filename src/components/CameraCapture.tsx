import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraIcon, Video, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (imageData: string, type: 'photo' | 'video') => void;
}

export const CameraCapture = ({ onCapture }: CameraCaptureProps) => {
  const [capturedMedia, setCapturedMedia] = useState<{ data: string; type: 'photo' | 'video' } | null>(null);
  const { toast } = useToast();

  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        setCapturedMedia({ data: image.dataUrl, type: 'photo' });
        onCapture(image.dataUrl, 'photo');
        toast({
          title: "Photo captured",
          description: "Your photo has been captured successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to capture photo",
        variant: "destructive",
      });
      console.error("Error taking photo:", error);
    }
  };

  const recordVideo = async () => {
    try {
      toast({
        title: "Video Recording",
        description: "Video recording will use native camera app. Please record and select from gallery.",
      });

      const video = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos, // Use photo library to select video
      });

      if (video.dataUrl) {
        setCapturedMedia({ data: video.dataUrl, type: 'video' });
        onCapture(video.dataUrl, 'video');
        toast({
          title: "Video selected",
          description: "Your video has been selected successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to select video. Please ensure camera permissions are granted.",
        variant: "destructive",
      });
      console.error("Error selecting video:", error);
    }
  };

  const clearMedia = () => {
    setCapturedMedia(null);
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Camera & Video</h3>
      
      <div className="flex gap-2">
        <Button onClick={takePhoto} className="flex-1">
          <CameraIcon className="mr-2 h-4 w-4" />
          Take Photo
        </Button>
        <Button onClick={recordVideo} variant="secondary" className="flex-1">
          <Video className="mr-2 h-4 w-4" />
          Select Video
        </Button>
      </div>

      {capturedMedia && (
        <div className="relative">
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={clearMedia}
          >
            <X className="h-4 w-4" />
          </Button>
          {capturedMedia.type === 'photo' ? (
            <img
              src={capturedMedia.data}
              alt="Captured"
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <video
              src={capturedMedia.data}
              controls
              className="w-full h-auto rounded-lg"
            />
          )}
        </div>
      )}
    </Card>
  );
};
