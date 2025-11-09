import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseBackgroundLocationProps {
  alertId: string | null;
  isActive: boolean;
}

export const useBackgroundLocation = ({ alertId, isActive }: UseBackgroundLocationProps) => {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!alertId || !isActive) {
      // Clear watch if exists
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Start watching position
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          // Update location every 30 seconds to avoid excessive updates
          if (now - lastUpdateRef.current < 30000) {
            return;
          }
          lastUpdateRef.current = now;

          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          // Update alert location in database
          const { error } = await supabase
            .from('emergency_alerts')
            .update({
              latitude: location.latitude,
              longitude: location.longitude,
            })
            .eq('id', alertId);

          if (error) {
            console.error('Error updating location:', error);
          } else {
            console.log('Location updated:', location);
          }
        },
        (error) => {
          console.error('Background location error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            toast.error('Location access denied. Cannot track movement.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        }
      );
    }

    // Cleanup on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [alertId, isActive]);
};
