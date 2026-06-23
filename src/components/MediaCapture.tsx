import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraCapture } from "./CameraCapture";
import { AudioRecorder } from "./AudioRecorder";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { compressVideo, formatFileSize, getVideoSize } from "@/lib/videoCompression";
import {
  uploadEvidenceWithProgress,
  deleteUploadedEvidence,
  UploadedFile,
  UploadHandle,
} from "@/lib/storage";
import {
  EVIDENCE_LIMITS,
  validateSingleEvidence,
  validateEvidenceCollection,
} from "@/lib/evidenceValidation";
import { hashEvidence } from "@/lib/evidenceHash";
import {
  ArrowDown,
  ArrowUp,
  FileAudio,
  Loader2,
  RotateCcw,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
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

type EvidenceType = 'photo' | 'video' | 'audio';
type EvidenceStatus = 'pending' | 'uploading' | 'uploaded' | 'failed' | 'cancelled';

interface EvidenceItem {
  id: string;
  type: EvidenceType;
  data: string;
  size: number;
  hash: string;
  timestamp: Date;
  status: EvidenceStatus;
  progress: number;
  error?: string;
  attempts: number;
  uploaded?: UploadedFile;
}

const MAX_AUTO_RETRIES = 2;
const UNDO_WINDOW_MS = 5000;

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface MediaCaptureProps {
  userId: string;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onClearAll?: () => void;
}

export const MediaCapture = ({ userId, onFilesUploaded, onClearAll }: MediaCaptureProps) => {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const { toast } = useToast();
  const { triggerImpact } = useHapticFeedback();

  // Track in-flight upload handles so we can cancel.
  const handlesRef = useRef<Map<string, UploadHandle>>(new Map());
  // Pending hard-deletes scheduled after undo window.
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cancel any in-flight uploads and clear pending delete timers on unmount.
  useEffect(() => {
    return () => {
      handlesRef.current.forEach((h) => h.abort());
      pendingDeletesRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const captured = useMemo(
    () => items.filter((i) => i.status !== 'uploaded'),
    [items]
  );
  const uploaded = useMemo(
    () => items.filter((i) => i.status === 'uploaded'),
    [items]
  );

  const updateItem = useCallback((id: string, patch: Partial<EvidenceItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const isDuplicateHash = (hash: string) => items.some((m) => m.hash === hash);

  const addCaptured = useCallback(
    async (type: EvidenceType, data: string, sizeHint?: number) => {
      const size = sizeHint ?? getVideoSize(data);

      const single = validateSingleEvidence({ type, size, data });
      if (!single.valid) {
        toast({ title: 'File rejected', description: single.error, variant: 'destructive' });
        return;
      }

      const hash = await hashEvidence(data);
      if (isDuplicateHash(hash)) {
        toast({
          title: 'Duplicate file',
          description: 'This file is already in your evidence list.',
          variant: 'destructive',
        });
        return;
      }

      const next: EvidenceItem = {
        id: newId(),
        type,
        data,
        size,
        hash,
        timestamp: new Date(),
        status: 'pending',
        progress: 0,
        attempts: 0,
      };

      const collection = validateEvidenceCollection(
        [...items, next].map((i) => ({ type: i.type, size: i.size }))
      );
      if (!collection.valid) {
        toast({
          title: 'Upload limit reached',
          description: collection.error,
          variant: 'destructive',
        });
        return;
      }

      setItems((prev) => [...prev, next]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );

  const handleCameraCapture = async (imageData: string, type: 'photo' | 'video') => {
    let finalData = imageData;
    let size = getVideoSize(imageData);

    if (type === 'video') {
      toast({ title: 'Compressing video...', description: 'Please wait while we optimize your video' });
      finalData = await compressVideo(imageData);
      size = getVideoSize(finalData);
      toast({ title: 'Video ready', description: `Size: ${formatFileSize(size)}` });
    }

    await addCaptured(type, finalData, size);
  };

  const handleAudioCapture = async (audioData: string) => {
    await addCaptured('audio', audioData);
  };

  // Internal upload runner with auto-retry.
  const uploadOne = useCallback(
    async (item: EvidenceItem): Promise<UploadedFile | null> => {
      let lastError = 'Upload failed';
      for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
        const handle = uploadEvidenceWithProgress(userId, item.data, item.type, {
          onProgress: (p) => updateItem(item.id, { progress: p }),
          onError: (msg) => {
            lastError = msg;
          },
        });
        handlesRef.current.set(item.id, handle);
        updateItem(item.id, {
          status: 'uploading',
          progress: 0,
          error: undefined,
          attempts: attempt + 1,
        });

        const result = await handle.promise;
        handlesRef.current.delete(item.id);

        if (result) {
          updateItem(item.id, {
            status: 'uploaded',
            progress: 100,
            uploaded: result,
            error: undefined,
          });
          return result;
        }

        // If user cancelled, don't auto-retry.
        const current = items.find((i) => i.id === item.id);
        if (current?.status === 'cancelled') return null;

        if (attempt < MAX_AUTO_RETRIES) {
          // Exponential backoff: 500ms, 1500ms.
          await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt)));
        }
      }

      updateItem(item.id, { status: 'failed', error: lastError, progress: 0 });
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  const handleUploadAll = async () => {
    const toUpload = items.filter(
      (i) => i.status === 'pending' || i.status === 'failed' || i.status === 'cancelled'
    );
    if (toUpload.length === 0) return;

    // Re-validate the full collection before kicking off uploads.
    const collectionCheck = validateEvidenceCollection(
      items.map((i) => ({ type: i.type, size: i.size }))
    );
    if (!collectionCheck.valid) {
      toast({ title: 'Upload blocked', description: collectionCheck.error, variant: 'destructive' });
      return;
    }

    triggerImpact('heavy');
    setIsUploading(true);

    const uploadedResults: UploadedFile[] = [];
    for (const item of toUpload) {
      const result = await uploadOne(item);
      if (result) uploadedResults.push(result);
    }

    setIsUploading(false);

    if (uploadedResults.length > 0) {
      toast({
        title: 'Upload complete',
        description: `${uploadedResults.length} of ${toUpload.length} file(s) uploaded successfully`,
      });
      onFilesUploaded?.(uploadedResults);
    } else {
      toast({
        title: 'Upload failed',
        description: 'No files could be uploaded. Tap Retry on any failed item.',
        variant: 'destructive',
      });
    }
  };

  const handleRetryOne = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    triggerImpact('light');
    const result = await uploadOne({ ...item, attempts: 0 });
    if (result) onFilesUploaded?.([result]);
  };

  const handleCancelUpload = (id: string) => {
    const handle = handlesRef.current.get(id);
    handle?.abort();
    handlesRef.current.delete(id);
    updateItem(id, { status: 'cancelled', progress: 0, error: 'Cancelled' });
    triggerImpact('light');
  };

  // Remove with undo. Captured items are simply restored on undo; uploaded
  // items are scheduled for hard-delete from storage after the undo window.
  const handleRemoveItem = (id: string) => {
    triggerImpact('light');
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Cancel any in-flight upload for this item.
    const handle = handlesRef.current.get(id);
    handle?.abort();
    handlesRef.current.delete(id);

    setItems((prev) => prev.filter((i) => i.id !== id));

    // Schedule a permanent delete for uploaded items.
    if (item.status === 'uploaded' && item.uploaded) {
      const timer = setTimeout(() => {
        deleteUploadedEvidence(item.uploaded!).catch(() => {
          /* swallow */
        });
        pendingDeletesRef.current.delete(id);
      }, UNDO_WINDOW_MS);
      pendingDeletesRef.current.set(id, timer);
    }

    toast({
      title: 'Removed',
      description: `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} evidence removed.`,
      action: (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const t = pendingDeletesRef.current.get(id);
            if (t) {
              clearTimeout(t);
              pendingDeletesRef.current.delete(id);
            }
            setItems((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, item]));
          }}
        >
          <Undo2 className="w-3.5 h-3.5 mr-1" />
          Undo
        </Button>
      ),
      duration: UNDO_WINDOW_MS,
    });
  };

  const handleMove = (id: string, direction: -1 | 1) => {
    triggerImpact('light');
    setItems((prev) => {
      // Reorder within the same group (captured vs uploaded) so we don't
      // accidentally mix statuses.
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const group = item.status === 'uploaded' ? 'uploaded' : 'captured';
      const groupItems = prev.filter((i) =>
        group === 'uploaded' ? i.status === 'uploaded' : i.status !== 'uploaded'
      );
      const idx = groupItems.findIndex((i) => i.id === id);
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= groupItems.length) return prev;
      const reordered = [...groupItems];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      // Merge back into items array preserving overall order of the other group.
      const otherItems = prev.filter((i) =>
        group === 'uploaded' ? i.status !== 'uploaded' : i.status === 'uploaded'
      );
      return group === 'uploaded' ? [...otherItems, ...reordered] : [...reordered, ...otherItems];
    });
  };

  const handleClearAllRequest = () => {
    triggerImpact('heavy');
    setIsClearDialogOpen(true);
  };

  const confirmClearAll = () => {
    // Abort any in-flight uploads.
    handlesRef.current.forEach((h) => h.abort());
    handlesRef.current.clear();
    // Cancel any pending delete timers (we're nuking everything anyway).
    pendingDeletesRef.current.forEach((t) => clearTimeout(t));
    pendingDeletesRef.current.clear();

    // Best-effort: remove already-uploaded files from storage.
    items
      .filter((i) => i.status === 'uploaded' && i.uploaded)
      .forEach((i) => deleteUploadedEvidence(i.uploaded!).catch(() => undefined));

    setItems([]);
    setIsClearDialogOpen(false);
    onClearAll?.();
    toast({
      title: 'Evidence cleared',
      description: 'All captured and uploaded evidence has been removed.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
        Limits: up to {EVIDENCE_LIMITS.maxFiles} files,{' '}
        {EVIDENCE_LIMITS.maxFileSizeBytes / 1024 / 1024} MB each,{' '}
        {EVIDENCE_LIMITS.maxTotalSizeBytes / 1024 / 1024} MB total. Photos, videos, audio only.
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

      {captured.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Captured Media ({captured.length})</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllRequest}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all
              </Button>
              <Button onClick={handleUploadAll} disabled={isUploading} size="sm">
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
          <ul className="space-y-2">
            {captured.map((item, index) => (
              <EvidenceRow
                key={item.id}
                item={item}
                position={index}
                total={captured.length}
                onRemove={handleRemoveItem}
                onRetry={handleRetryOne}
                onCancel={handleCancelUpload}
                onMove={handleMove}
              />
            ))}
          </ul>
        </Card>
      )}

      {uploaded.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-green-600">
            Uploaded Evidence ({uploaded.length})
          </h3>
          <ul className="space-y-2">
            {uploaded.map((item, index) => (
              <EvidenceRow
                key={item.id}
                item={item}
                position={index}
                total={uploaded.length}
                onRemove={handleRemoveItem}
                onRetry={handleRetryOne}
                onCancel={handleCancelUpload}
                onMove={handleMove}
              />
            ))}
          </ul>
        </Card>
      )}

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all captured and uploaded evidence, cancel any uploads in
              progress, and delete already-uploaded files from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsClearDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface EvidenceRowProps {
  item: EvidenceItem;
  position: number;
  total: number;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

const EvidenceRow = ({ item, position, total, onRemove, onRetry, onCancel, onMove }: EvidenceRowProps) => {
  return (
    <li className="flex items-center gap-3 p-2 bg-secondary/10 rounded">
      <EvidenceThumbnail item={item} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.timestamp.toLocaleTimeString()}
          </span>
          {item.size > 0 && (
            <span className="text-xs text-muted-foreground">
              · {formatFileSize(item.size)}
            </span>
          )}
        </div>
        <StatusLine item={item} />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMove(item.id, -1)}
          disabled={position === 0}
          aria-label="Move up"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMove(item.id, 1)}
          disabled={position === total - 1}
          aria-label="Move down"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </Button>

        {item.status === 'uploading' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onCancel(item.id)}
            aria-label="Cancel upload"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {(item.status === 'failed' || item.status === 'cancelled') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRetry(item.id)}
            aria-label="Retry upload"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onRemove(item.id)}
          aria-label="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </li>
  );
};

const EvidenceThumbnail = ({ item }: { item: EvidenceItem }) => {
  const baseClass =
    'w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0';

  if (item.type === 'photo') {
    return (
      <div className={baseClass}>
        <img
          src={item.uploaded?.url ?? item.data}
          alt="Photo evidence thumbnail"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  if (item.type === 'video') {
    return (
      <div className={baseClass}>
        <video
          src={item.uploaded?.url ?? item.data}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      </div>
    );
  }
  return (
    <div className={baseClass}>
      <FileAudio className="w-6 h-6 text-muted-foreground" />
    </div>
  );
};

const StatusLine = ({ item }: { item: EvidenceItem }) => {
  if (item.status === 'uploading') {
    return (
      <div className="mt-1 space-y-1">
        <Progress value={item.progress} className="h-1" />
        <p className="text-xs text-muted-foreground">
          Uploading… {item.progress}%
          {item.attempts > 1 ? ` (attempt ${item.attempts})` : ''}
        </p>
      </div>
    );
  }
  if (item.status === 'uploaded') {
    return <p className="text-xs text-green-600 mt-0.5">Stored securely</p>;
  }
  if (item.status === 'failed') {
    return (
      <p className="text-xs text-destructive mt-0.5 truncate">
        {item.error || 'Upload failed'} — tap retry
      </p>
    );
  }
  if (item.status === 'cancelled') {
    return <p className="text-xs text-muted-foreground mt-0.5">Cancelled — tap retry to resume</p>;
  }
  return <p className="text-xs text-muted-foreground mt-0.5">Ready to upload</p>;
};
