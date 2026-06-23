import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface UploadedFile {
  path: string;
  url: string;
  type: 'photo' | 'video' | 'audio';
  size?: number;
}

const BUCKET_MAP = {
  photo: 'emergency-photos',
  video: 'emergency-videos',
  audio: 'emergency-audio',
} as const;

const EXTENSION_MAP = {
  photo: 'jpg',
  video: 'mp4',
  audio: 'webm',
} as const;

export interface UploadHandle {
  promise: Promise<UploadedFile | null>;
  abort: () => void;
}

export interface UploadCallbacks {
  onProgress?: (percent: number) => void;
  onError?: (message: string) => void;
}

/**
 * Upload evidence with progress reporting and abort support.
 * Uses XHR directly against Supabase Storage REST API so we can wire
 * progress events and cancellation that the supabase-js client does not expose.
 */
export const uploadEvidenceWithProgress = (
  userId: string,
  mediaData: string,
  type: 'photo' | 'video' | 'audio',
  callbacks: UploadCallbacks = {}
): UploadHandle => {
  let xhr: XMLHttpRequest | null = null;
  let aborted = false;

  const promise = (async (): Promise<UploadedFile | null> => {
    try {
      const base64Response = await fetch(mediaData);
      const blob = await base64Response.blob();

      const bucket = BUCKET_MAP[type];
      const extension = EXTENSION_MAP[type];
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        callbacks.onError?.('You must be signed in to upload evidence.');
        return null;
      }

      if (aborted) return null;

      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;

      const status = await new Promise<{ ok: boolean; code: number; message?: string }>((resolve) => {
        xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('apikey', SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.setRequestHeader('cache-control', '3600');
        if (blob.type) xhr.setRequestHeader('Content-Type', blob.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            callbacks.onProgress?.(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          const ok = xhr!.status >= 200 && xhr!.status < 300;
          resolve({ ok, code: xhr!.status, message: xhr!.responseText });
        };
        xhr.onerror = () => resolve({ ok: false, code: 0, message: 'Network error' });
        xhr.onabort = () => resolve({ ok: false, code: -1, message: 'Cancelled' });
        xhr.send(blob);
      });

      if (!status.ok) {
        if (status.code !== -1 && !aborted) {
          callbacks.onError?.(
            status.code === 0
              ? 'Network error — check your connection and retry.'
              : `Upload failed (${status.code}).`
          );
        }
        return null;
      }

      callbacks.onProgress?.(100);

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 3600);

      if (signedUrlError || !signedUrlData) {
        callbacks.onError?.('Could not generate a secure link for the uploaded file.');
        return null;
      }

      return {
        path: fileName,
        url: signedUrlData.signedUrl,
        type,
        size: blob.size,
      };
    } catch (error: any) {
      if (!aborted) callbacks.onError?.(error?.message || 'Unexpected upload error.');
      return null;
    }
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      try {
        xhr?.abort();
      } catch {
        /* ignore */
      }
    },
  };
};

/**
 * Backwards-compatible single-shot upload used by callers that don't need
 * progress or cancellation. Internally uses the progress-aware helper.
 */
export const uploadEvidence = async (
  userId: string,
  mediaData: string,
  type: 'photo' | 'video' | 'audio'
): Promise<UploadedFile | null> => {
  return uploadEvidenceWithProgress(userId, mediaData, type).promise;
};

export const deleteEvidence = async (bucket: string, path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error('Delete error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return false;
  }
};

export const deleteUploadedEvidence = async (file: UploadedFile): Promise<boolean> => {
  const bucket = BUCKET_MAP[file.type];
  return deleteEvidence(bucket, file.path);
};
