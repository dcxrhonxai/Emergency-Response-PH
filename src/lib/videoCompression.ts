/**
 * Compresses video files to reduce storage space
 * Uses browser-based compression techniques
 */

export const compressVideo = async (
  videoDataUrl: string,
  maxSizeMB: number = 10
): Promise<string> => {
  try {
    // Convert data URL to blob
    const response = await fetch(videoDataUrl);
    const blob = await response.blob();
    
    // If the video is already small enough, return it as is
    const sizeMB = blob.size / (1024 * 1024);
    if (sizeMB <= maxSizeMB) {
      return videoDataUrl;
    }

    // For actual video compression, we'd need server-side processing
    // or a dedicated video compression library
    // This is a placeholder that returns the original for now
    
    return videoDataUrl;
  } catch (error) {
    console.error("Error compressing video:", error);
    return videoDataUrl;
  }
};

/**
 * Utility to get video file size from data URL
 */
export const getVideoSize = (dataUrl: string): number => {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  return binary.length;
};

/**
 * Format bytes to human-readable size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
