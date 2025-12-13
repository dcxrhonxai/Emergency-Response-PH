import { useState, useCallback } from 'react';
import { 
  optimizeImage, 
  getCompressionStats,
  needsOptimization,
  isImageFile,
  OptimizationOptions,
} from '@/lib/imageOptimization';
import { useToast } from '@/hooks/use-toast';

interface OptimizationResult {
  original: File;
  optimized: File;
  savedPercent: number;
}

export const useImageOptimization = (options?: OptimizationOptions) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const optimizeSingleImage = useCallback(async (file: File): Promise<File> => {
    if (!isImageFile(file)) {
      return file;
    }

    setIsOptimizing(true);
    try {
      const optimized = await optimizeImage(file, options);
      const stats = getCompressionStats(file, optimized);
      
      if (stats.savedPercent > 5) {
        toast({
          title: 'Image Optimized',
          description: `Reduced by ${stats.savedPercent}% (${stats.originalSizeFormatted} → ${stats.optimizedSizeFormatted})`,
        });
      }
      
      return optimized;
    } catch (error) {
      console.error('Optimization error:', error);
      return file;
    } finally {
      setIsOptimizing(false);
    }
  }, [options, toast]);

  const optimizeMultipleImages = useCallback(async (
    files: File[]
  ): Promise<OptimizationResult[]> => {
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) return [];

    setIsOptimizing(true);
    setProgress(0);

    const results: OptimizationResult[] = [];
    
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const optimized = await optimizeImage(file, options);
        const stats = getCompressionStats(file, optimized);
        
        results.push({
          original: file,
          optimized,
          savedPercent: stats.savedPercent,
        });
        
        setProgress(Math.round(((i + 1) / imageFiles.length) * 100));
      }

      const totalSaved = results.reduce((sum, r) => sum + r.savedPercent, 0);
      const avgSaved = Math.round(totalSaved / results.length);
      
      if (avgSaved > 5) {
        toast({
          title: 'Images Optimized',
          description: `${results.length} images optimized, avg ${avgSaved}% reduction`,
        });
      }

      return results;
    } catch (error) {
      console.error('Batch optimization error:', error);
      toast({
        title: 'Optimization Failed',
        description: 'Some images could not be optimized',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsOptimizing(false);
      setProgress(0);
    }
  }, [options, toast]);

  const shouldOptimize = useCallback((file: File, maxSizeMB?: number): boolean => {
    return isImageFile(file) && needsOptimization(file, maxSizeMB);
  }, []);

  return {
    optimizeSingleImage,
    optimizeMultipleImages,
    shouldOptimize,
    isOptimizing,
    progress,
  };
};

// Re-export utilities
export { formatFileSize, isImageFile, type OptimizationOptions } from '@/lib/imageOptimization';
