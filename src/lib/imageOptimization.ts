import imageCompression from 'browser-image-compression';

export interface OptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  convertToWebP?: boolean;
}

/**
 * Optimizes an image file by compressing and optionally converting to WebP
 */
export const optimizeImage = async (
  file: File,
  options: OptimizationOptions = {}
): Promise<File> => {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    useWebWorker = true,
    convertToWebP = true,
  } = options;

  try {
    // Compress the image
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      fileType: convertToWebP ? 'image/webp' : undefined,
    });

    // Update filename if converted to WebP
    if (convertToWebP && !file.name.endsWith('.webp')) {
      const newName = file.name.replace(/\.[^/.]+$/, '.webp');
      return new File([compressedFile], newName, { type: 'image/webp' });
    }

    return compressedFile;
  } catch (error) {
    console.error('Image optimization failed:', error);
    return file; // Return original file if optimization fails
  }
};

/**
 * Optimizes multiple images in parallel
 */
export const optimizeImages = async (
  files: File[],
  options: OptimizationOptions = {}
): Promise<File[]> => {
  return Promise.all(files.map(file => optimizeImage(file, options)));
};

/**
 * Checks if an image needs optimization based on size
 */
export const needsOptimization = (file: File, maxSizeMB: number = 1): boolean => {
  return file.size > maxSizeMB * 1024 * 1024;
};

/**
 * Gets compression stats for a file
 */
export const getCompressionStats = (original: File, optimized: File) => {
  const originalSize = original.size;
  const optimizedSize = optimized.size;
  const savedBytes = originalSize - optimizedSize;
  const savedPercent = Math.round((savedBytes / originalSize) * 100);

  return {
    originalSize,
    optimizedSize,
    savedBytes,
    savedPercent,
    originalSizeFormatted: formatFileSize(originalSize),
    optimizedSizeFormatted: formatFileSize(optimizedSize),
  };
};

/**
 * Formats file size to human readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Creates an optimized thumbnail
 */
export const createThumbnail = async (
  file: File,
  maxDimension: number = 200
): Promise<File> => {
  return optimizeImage(file, {
    maxSizeMB: 0.1,
    maxWidthOrHeight: maxDimension,
    convertToWebP: true,
  });
};

/**
 * Validates if a file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Converts a blob to a File object
 */
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};
