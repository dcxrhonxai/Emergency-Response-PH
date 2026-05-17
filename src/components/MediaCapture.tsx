import { useState } from "react";
import { CameraCapture } from "./CameraCapture";
import { AudioRecorder } from "./AudioRecorder";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { compressVideo, formatFileSize, getVideoSize } from "@/lib/videoCompression";
import { uploadEvidence, UploadedFile } from "@/lib/storage";
import {
  EVIDENCE_LIMITS,
  validateSingleEvidence,
  validateEvidenceCollection,
} from "@/lib/evidenceValidation";
import { hashEvidence } from "@/lib/evidenceHash";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaCaptureProps {
  userId: string;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onClearAll?: () => void;
}

export const MediaCapture = ({ userId, onFilesUploaded, onClearAll }: MediaCaptureProps) => {
  const [capturedMedia, setCapturedMedia] = useState<Array<{
    type: 'photo' | 'video' | 'audio';
    data: string;
    timestamp: Date;
    size?: number;
    hash: string;
  }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadedHashes, setUploadedHashes] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const { toast } = useToast();
  const { triggerImpact, triggerNotification } = useHapticFeedback();

  const isDuplicateHash = (hash: string) =>
    capturedMedia.some((m) => m.hash === hash) || uploadedHashes.has(hash);

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

    const single = validateSingleEvidence({ type, size, data: finalData });
    if (!single.valid) {
      toast({ title: "File rejected", description: single.error, variant: "destructive" });
      return;
    }

    const hash = await hashEvidence(finalData);
    if (isDuplicateHash(hash)) {
      toast({ title: "Duplicate file", description: "This file is already in your evidence list.", variant: "destructive" });
      return;
    }

    const next = [...capturedMedia, { type, data: finalData, timestamp: new Date(), size, hash }];
    const collection = validateEvidenceCollection(
      [...next, ...uploadedFiles.map((f) => ({ type: f.type, size: f.size }))]
    );
    if (!collection.valid) {
      toast({ title: "Upload limit reached", description: collection.error, variant: "destructive" });
      return;
    }

    setCapturedMedia(next);
  };

  const handleAudioCapture = async (audioData: string) => {
    const size = getVideoSize(audioData);

    const single = validateSingleEvidence({ type: 'audio', size, data: audioData });
    if (!single.valid) {
      toast({ title: "Audio rejected", description: single.error, variant: "destructive" });
      return;
    }

    const hash = await hashEvidence(audioData);
    if (isDuplicateHash(hash)) {
      toast({ title: "Duplicate audio", description: "This recording is already in your evidence list.", variant: "destructive" });
      return;
    }

    const next = [...capturedMedia, { type: 'audio' as const, data: audioData, timestamp: new Date(), size, hash }];
    const collection = validateEvidenceCollection(
      [...next, ...uploadedFiles.map((f) => ({ type: f.type, size: f.size }))]
    );
    if (!collection.valid) {
      toast({ title: "Upload limit reached", description: collection.error, variant: "destructive" });
      return;
    }

    setCapturedMedia(next);
  };

  const handleUploadAll = async () => {
    if (capturedMedia.length === 0) return;

    // Hard block: re-validate every item and the full collection before uploading
    for (const media of capturedMedia) {
      const single = validateSingleEvidence({ type: media.type, size: media.size, data: media.data });
      if (!single.valid) {
        toast({ title: "Upload blocked", description: single.error, variant: "destructive" });
        return;
      }
    }
    const collectionCheck = validateEvidenceCollection([
      ...capturedMedia.map((m) => ({ type: m.type, size: m.size })),
      ...uploadedFiles.map((f) => ({ type: f.type, size: f.size })),
    ]);
    if (!collectionCheck.valid) {
      toast({ title: "Upload blocked", description: collectionCheck.error, variant: "destructive" });
      return;
    }

    // Final dedupe pass against already-uploaded hashes
    const seen = new Set(uploadedHashes);
    const toUpload = capturedMedia.filter((m) => {
      if (seen.has(m.hash)) return false;
      seen.add(m.hash);
      return true;
    });
    if (toUpload.length < capturedMedia.length) {
      toast({
        title: "Duplicates skipped",
        description: `${capturedMedia.length - toUpload.length} duplicate file(s) were not uploaded.`,
      });
    }
    if (toUpload.length === 0) {
      return;
    }

    triggerImpact('heavy');
    setIsUploading(true);
    const uploaded: UploadedFile[] = [];
    const newHashes: string[] = [];

    for (const media of toUpload) {
      const result = await uploadEvidence(userId, media.data, media.type);
      if (result) {
        uploaded.push(result);
        newHashes.push(media.hash);
      }
    }

    if (uploaded.length > 0) {
      setUploadedFiles((prev) => [...prev, ...uploaded]);
      setUploadedHashes((prev) => {
        const updated = new Set(prev);
        newHashes.forEach((h) => updated.add(h));
        return updated;
      });
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

  const handleClearAll = () => {
    triggerImpact('heavy');
    setIsClearDialogOpen(true);
  };

  const confirmClearAll = () => {
    setCapturedMedia([]);
    setUploadedFiles([]);
    setUploadedHashes(new Set());
    setIsClearDialogOpen(false);
    onClearAll?.();
    toast({
      title: "Evidence cleared",
      description: "All captured and uploaded evidence has been removed.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
        Limits: up to {EVIDENCE_LIMITS.maxFiles} files, {EVIDENCE_LIMITS.maxFileSizeBytes / 1024 / 1024} MB each, {EVIDENCE_LIMITS.maxTotalSizeBytes / 1024 / 1024} MB total. Photos, videos, audio only.
      </div>
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all
              </Button>
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
