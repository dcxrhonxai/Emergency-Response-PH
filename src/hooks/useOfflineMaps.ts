import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CachedLocation {
  lat: number;
  lng: number;
  name: string;
  address?: string;
  type: string;
  phone: string;
  cachedAt: number;
}

interface CachedMapData {
  centerLat: number;
  centerLng: number;
  zoomLevel: number;
  locations: CachedLocation[];
  cachedAt: number;
}

interface OfflineMapsState {
  isOnline: boolean;
  hasCachedData: boolean;
  cachedLocations: CachedLocation[];
  lastCacheTime: Date | null;
  isCaching: boolean;
}

const CACHE_KEY = 'emergency_offline_maps';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export function useOfflineMaps() {
  const [state, setState] = useState<OfflineMapsState>({
    isOnline: navigator.onLine,
    hasCachedData: false,
    cachedLocations: [],
    lastCacheTime: null,
    isCaching: false,
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast.success('Back online - live data available');
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast.warning('You are offline - using cached map data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedMapData = JSON.parse(cached);
        const isExpired = Date.now() - data.cachedAt > CACHE_EXPIRY;
        
        if (!isExpired && data.locations.length > 0) {
          setState(prev => ({
            ...prev,
            hasCachedData: true,
            cachedLocations: data.locations,
            lastCacheTime: new Date(data.cachedAt),
          }));
        } else if (isExpired) {
          // Clear expired cache
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading cached map data:', error);
    }
  }, []);

  const cacheEmergencyServices = useCallback(async (userLat: number, userLng: number) => {
    setState(prev => ({ ...prev, isCaching: true }));
    
    try {
      // Fetch emergency services from database
      const { data: services, error } = await supabase
        .from('emergency_services')
        .select('*');

      if (error) throw error;

      if (services && services.length > 0) {
        const locations: CachedLocation[] = services.map(service => ({
          lat: service.latitude,
          lng: service.longitude,
          name: service.name,
          address: service.address || undefined,
          type: service.type,
          phone: service.phone,
          cachedAt: Date.now(),
        }));

        const cacheData: CachedMapData = {
          centerLat: userLat,
          centerLng: userLng,
          zoomLevel: 12,
          locations,
          cachedAt: Date.now(),
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        
        setState(prev => ({
          ...prev,
          hasCachedData: true,
          cachedLocations: locations,
          lastCacheTime: new Date(),
          isCaching: false,
        }));

        // Cache static map images
        await cacheStaticMapImages(userLat, userLng, locations);
        
        toast.success(`Cached ${locations.length} emergency locations for offline use`);
      }
    } catch (error) {
      console.error('Error caching emergency services:', error);
      toast.error('Failed to cache map data');
      setState(prev => ({ ...prev, isCaching: false }));
    }
  }, []);

  const cacheStaticMapImages = async (
    centerLat: number, 
    centerLng: number, 
    locations: CachedLocation[]
  ) => {
    // Cache main overview map
    const mapUrls: string[] = [
      `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=12&size=600x400&maptype=roadmap&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`,
    ];

    // Cache individual location maps (limit to prevent too many requests)
    const topLocations = locations.slice(0, 10);
    topLocations.forEach(loc => {
      mapUrls.push(
        `https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=15&size=400x300&maptype=roadmap&markers=color:red%7C${loc.lat},${loc.lng}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`
      );
    });

    // Use Cache API if available
    if ('caches' in window) {
      try {
        const cache = await caches.open('offline-maps-v1');
        await Promise.all(
          mapUrls.map(async (url) => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch (e) {
              // Silently fail for individual map caching
            }
          })
        );
      } catch (error) {
        console.error('Cache API error:', error);
      }
    }
  };

  const getCachedMapUrl = useCallback((lat: number, lng: number, zoom: number = 15): string => {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=400x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`;
  }, []);

  const getNearestCachedServices = useCallback((
    userLat: number, 
    userLng: number, 
    type?: string,
    limit: number = 5
  ): CachedLocation[] => {
    let locations = state.cachedLocations;
    
    if (type) {
      locations = locations.filter(loc => loc.type.toLowerCase() === type.toLowerCase());
    }

    // Calculate distances and sort
    const withDistance = locations.map(loc => ({
      ...loc,
      distance: calculateDistance(userLat, userLng, loc.lat, loc.lng),
    }));

    withDistance.sort((a, b) => a.distance - b.distance);
    
    return withDistance.slice(0, limit);
  }, [state.cachedLocations]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    if ('caches' in window) {
      caches.delete('offline-maps-v1');
    }
    setState(prev => ({
      ...prev,
      hasCachedData: false,
      cachedLocations: [],
      lastCacheTime: null,
    }));
    toast.info('Offline map cache cleared');
  }, []);

  return {
    ...state,
    cacheEmergencyServices,
    getNearestCachedServices,
    getCachedMapUrl,
    clearCache,
    loadCachedData,
  };
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
