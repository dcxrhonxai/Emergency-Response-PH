import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { uploadEvidence, UploadedFile } from '@/lib/storage';
import { toast } from 'sonner';

interface UseAutoEvidenceCaptureProps {
  userId: string;
  isActive: boolean;
  captureInterval?: number; // in milliseconds
  maxCaptures?: number;
  onFileUploaded?: (file: UploadedFile) => void;
}

export const useAutoEvidenceCapture = ({
  userId,
  isActive,
  captureInterval = 30000, // 30 seconds default
  maxCaptures = 10,
  onFileUploaded,
}: UseAutoEvidenceCaptureProps) => {
  const [capturedFiles, setCapturedFiles] = useState<UploadedFile[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const capturePhoto = useCallback(async () => {
    if (!isActive || captureCount >= maxCaptures) return;

    try {
      setIsCapturing(true);
      setError(null);

      // Try Capacitor Camera first (for mobile)
      try {
        const photo = await Camera.getPhoto({
          quality: 70,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          saveToGallery: false,
        });

        if (photo.dataUrl) {
          const uploaded = await uploadEvidence(userId, photo.dataUrl, 'photo');
          if (uploaded) {
            setCapturedFiles(prev => [...prev, uploaded]);
            setCaptureCount(prev => prev + 1);
            onFileUploaded?.(uploaded);
          }
        }
      } catch {
        // Fallback to Web API for desktop
        await captureFromWebCamera();
      }
    } catch (err) {
      console.error('Auto capture error:', err);
      setError('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  }, [userId, isActive, captureCount, maxCaptures, onFileUploaded]);

  const captureFromWebCamera = async () => {
    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      }

      // Create video element if not exists
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Wait a moment for the video to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        const uploaded = await uploadEvidence(userId, dataUrl, 'photo');
        if (uploaded) {
          setCapturedFiles(prev => [...prev, uploaded]);
          setCaptureCount(prev => prev + 1);
          onFileUploaded?.(uploaded);
          toast.success('Evidence captured automatically');
        }
      }
    } catch (err) {
      console.error('Web camera capture error:', err);
      throw err;
    }
  };

  const startAutoCapture = useCallback(() => {
    if (intervalRef.current) return;

    // Capture immediately
    capturePhoto();

    // Set up interval for subsequent captures
    intervalRef.current = setInterval(() => {
      if (captureCount < maxCaptures) {
        capturePhoto();
      } else {
        stopAutoCapture();
      }
    }, captureInterval);

    toast.info('Auto evidence capture started');
  }, [capturePhoto, captureInterval, captureCount, maxCaptures]);

  const stopAutoCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clean up media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    toast.info('Auto evidence capture stopped');
  }, []);

  // Start/stop based on isActive
  useEffect(() => {
    if (isActive) {
      startAutoCapture();
    } else {
      stopAutoCapture();
    }

    return () => {
      stopAutoCapture();
    };
  }, [isActive, startAutoCapture, stopAutoCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoCapture();
    };
  }, [stopAutoCapture]);

  return {
    capturedFiles,
    isCapturing,
    captureCount,
    maxCaptures,
    error,
    capturePhoto, // Manual trigger
    startAutoCapture,
    stopAutoCapture,
  };
};
