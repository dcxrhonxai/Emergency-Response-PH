import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { formatFileSize } from "@/lib/videoCompression";
import { logEvent } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AlertCircle, Flame, Activity, Car, Home, Users, Camera, MapPin, Phone, X, FileImage, FileAudio, FileVideo, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { emergencyFormSchema } from "@/lib/validation";
import { MediaCapture } from "./MediaCapture";
import { AutoEvidenceCapture } from "./AutoEvidenceCapture";
import { UploadedFile } from "@/lib/storage";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Badge } from "./ui/badge";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { validateEvidenceCollection, EVIDENCE_LIMITS } from "@/lib/evidenceValidation";

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [previewContacts, setPreviewContacts] = useState<Array<{ id: string; name: string; type: string; phone: string; distance: string }>>([]);
  const [nationalContacts, setNationalContacts] = useState<Array<{ id: string; name: string; type: string; phone: string }>>([]);
  const [showNationalFallback, setShowNationalFallback] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const { isOnline, pendingCount } = useOfflineSync();
  const { triggerImpact } = useHapticFeedback();

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

  const handleClearAllEvidence = () => {
    setShowClearDialog(true);
  };

  const confirmClearAllEvidence = () => {
    setEvidenceFiles([]);
    setShowClearDialog(false);
    toast.info("All evidence cleared");
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    triggerImpact('heavy');

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

    // Show confirmation modal instead of immediately triggering
    setShowConfirmModal(true);
  };

  const handleConfirmEmergency = () => {
    setShowConfirmModal(false);
    onEmergencyClick(emergencyType, situation.trim(), evidenceFiles);
  };

  const loadNationalContacts = async () => {
    const { data, error } = await supabase
      .from('emergency_services')
      .select('*')
      .eq('is_national', true);

    if (error) {
      console.error(error);
      return [];
    }

    const filtered = (data || []).filter((s: any) =>
      !emergencyType || emergencyType === 'other' || s.type === emergencyType || s.type === 'all'
    );

    const mapped = filtered.map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      phone: s.phone,
    }));

    setNationalContacts(mapped);
    setShowNationalFallback(true);
    return mapped;
  };

  const handleUseMyLocation = async () => {
    triggerImpact('light');
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      const nat = await loadNationalContacts();
      logEvent('national_fallback_shown', { reason: 'unsupported', contacts: nat.length });
      return;
    }

    setLoadingLocation(true);
    try {
      // Permission check + explanation
      if (navigator.permissions) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          logEvent('use_my_location_permission', { state: status.state });
          if (status.state === 'prompt') {
            toast.info("We need your location to preview the nearest emergency contacts.");
          } else if (status.state === 'denied') {
            toast.warning("Location is blocked. Showing national emergency contacts instead.");
            const nat = await loadNationalContacts();
            logEvent('national_fallback_shown', { reason: 'permission_denied', contacts: nat.length });
            setLoadingLocation(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setPreviewLocation(loc);

      const { data, error } = await supabase
        .from('emergency_services')
        .select('*')
        .eq('is_national', false);

      if (error) throw error;

      const filtered = (data || []).filter((s: any) =>
        !emergencyType || emergencyType === 'other' || s.type === emergencyType || s.type === 'all'
      );

      const withDistance = filtered
        .map((s: any) => {
          const distKm = calculateDistance(loc.lat, loc.lng, parseFloat(s.latitude), parseFloat(s.longitude));
          return {
            id: s.id,
            name: s.name,
            type: s.type,
            phone: s.phone,
            distanceKm: distKm,
            distance: formatDistance(distKm),
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3);

      setPreviewContacts(withDistance);
      logEvent('use_my_location_preview', {
        emergency_type: emergencyType || 'unspecified',
        contacts_found: withDistance.length,
      });

      if (withDistance.length === 0) {
        toast.info("No nearby services found. Showing national emergency contacts.");
        const nat = await loadNationalContacts();
        logEvent('national_fallback_shown', { reason: 'empty_preview', contacts: nat.length });
      } else {
        setShowNationalFallback(false);
        toast.success(`Found ${withDistance.length} nearby contact(s).`);
      }
    } catch (err: any) {
      console.error(err);
      logEvent('use_my_location_error', { code: err?.code, message: err?.message });
      // Permission denied error code is 1
      const reason = err?.code === 1 ? 'permission_denied' : 'location_error';
      toast.error((err?.message || "Could not detect your location") + ". Showing national contacts.");
      const nat = await loadNationalContacts();
      logEvent('national_fallback_shown', { reason, contacts: nat.length });
    } finally {
      setLoadingLocation(false);
    }
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
          <Select value={emergencyType} onValueChange={(val) => { triggerImpact('light'); setEmergencyType(val); }}>
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
            <MediaCapture userId={userId} onFilesUploaded={handleFilesUploaded} onClearAll={handleClearAllEvidence} />
          )}
          {evidenceFiles.length > 0 && !showMediaCapture && (
            <div className="space-y-1.5">
              {evidenceFiles.map((file, index) => {
                const FileIcon = file.type === 'photo' ? FileImage : file.type === 'video' ? FileVideo : FileAudio;
                return (
                  <div key={`${file.path}-${index}`} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate capitalize">{file.type}</span>
                      {file.size && (
                        <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                      )}
                    </div>
              <button
                type="button"
                onClick={() => handleRemoveEvidence(index)}
                className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                aria-label={`Remove ${file.type} evidence`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleClearAllEvidence}
          className="flex items-center justify-center gap-1.5 w-full text-xs text-destructive hover:text-destructive/80 py-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear all evidence
        </button>
      </div>
          )}
        </div>

        {/* Auto Evidence Capture */}
        <AutoEvidenceCapture 
          userId={userId} 
          isEmergencyActive={isEmergencyActive}
          onFilesChange={(files) => setEvidenceFiles(files)}
        />

        {/* Use My Location - Preview */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleUseMyLocation}
            disabled={loadingLocation}
            className="w-full h-10 text-sm"
          >
            {loadingLocation ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4 mr-2" />
            )}
            {loadingLocation ? "Detecting location..." : "Use my location"}
          </Button>

          {previewLocation && (
            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>
                  Detected: {previewLocation.lat.toFixed(4)}, {previewLocation.lng.toFixed(4)}
                </span>
              </div>
              {previewContacts.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Nearest contacts:</p>
                  <ul className="space-y-1">
                    {previewContacts.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between text-xs bg-card rounded px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-muted-foreground truncate">{c.phone}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                          {c.distance}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No nearby services in our directory. National contacts will still be shown.
                </p>
              )}
            </div>
          )}

          {showNationalFallback && nationalContacts.length > 0 && (
            <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">
                  National Emergency Contacts
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {previewLocation
                  ? "No nearby services found — use these instead."
                  : "Location unavailable — these national hotlines work anywhere."}
              </p>
              <ul className="space-y-1">
                {nationalContacts.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-xs bg-card rounded px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-muted-foreground truncate">{c.phone}</p>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="text-primary font-semibold shrink-0 ml-2"
                    >
                      Call
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Emergency Button */}
        {(() => {
          const evidenceCheck = validateEvidenceCollection(evidenceFiles.map((f) => ({ type: f.type, size: f.size })));
          const totalSize = evidenceFiles.reduce((sum, f) => sum + (f.size || 0), 0);
          const remainingFiles = Math.max(0, EVIDENCE_LIMITS.maxFiles - evidenceFiles.length);
          const remainingBytes = Math.max(0, EVIDENCE_LIMITS.maxTotalSizeBytes - totalSize);
          const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(0);
          const formValid = situation.trim().length > 0 && !!emergencyType && evidenceCheck.valid;
          return (
            <>
              {!evidenceCheck.valid && (
                <p className="text-xs text-destructive text-center">{evidenceCheck.error}</p>
              )}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span>Remaining capacity: {remainingFiles} files • {remainingMB} MB</span>
                <span>{evidenceFiles.length}/{EVIDENCE_LIMITS.maxFiles}</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!formValid}
                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg disabled:opacity-50"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                NEED HELP NOW
              </Button>
            </>
          );
        })()}

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

      {/* Location Permission Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Location Access Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                To find the nearest emergency contacts and services for you, we need access to your location.
              </p>
              <p className="text-sm text-muted-foreground">
                Your location will only be used to identify nearby emergency services and will be shared with responders when you send an alert.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmModal(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEmergency}>
              Allow & Send Alert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Evidence Confirmation Modal */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all evidence files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAllEvidence} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmergencyForm;
