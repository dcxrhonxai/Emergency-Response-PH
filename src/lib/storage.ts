import { supabase } from "@/integrations/supabase/client";

export interface UploadedFile {
  path: string;
  url: string;
  type: 'photo' | 'video' | 'audio';
}

export const uploadEvidence = async (
  userId: string,
  mediaData: string,
  type: 'photo' | 'video' | 'audio'
): Promise<UploadedFile | null> => {
  try {
    // Convert base64 to blob
    const base64Response = await fetch(mediaData);
    const blob = await base64Response.blob();

    // Determine bucket and file extension
    const bucketMap = {
      photo: 'emergency-photos',
      video: 'emergency-videos',
      audio: 'emergency-audio'
    };

    const extensionMap = {
      photo: 'jpg',
      video: 'mp4',
      audio: 'webm'
    };

    const bucket = bucketMap[type];
    const extension = extensionMap[type];
    const fileName = `${userId}/${Date.now()}.${extension}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: blob.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 3600);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return null;
    }

    return {
      path: data.path,
      url: signedUrlData.signedUrl,
      type
    };
  } catch (error) {
    console.error('Error uploading evidence:', error);
    return null;
  }
};

export const deleteEvidence = async (bucket: string, path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

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
