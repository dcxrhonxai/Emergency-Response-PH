import { useState, useEffect } from "react";
import { Download, Trash2, MapPin, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOfflineMaps } from "@/hooks/useOfflineMaps";
import { formatDistanceToNow } from "date-fns";

export function OfflineMapsManager() {
  const {
    isOnline,
    hasCachedData,
    cachedLocations,
    lastCacheTime,
    isCaching,
    cacheEmergencyServices,
    clearCache,
  } = useOfflineMaps();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to Manila if location unavailable
          setUserLocation({ lat: 14.5995, lng: 120.9842 });
        }
      );
    }
  }, []);

  const handleCacheNow = async () => {
    if (userLocation) {
      await cacheEmergencyServices(userLocation.lat, userLocation.lng);
    }
  };

  const serviceTypeCounts = cachedLocations.reduce((acc, loc) => {
    acc[loc.type] = (acc[loc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Offline Maps
            </CardTitle>
            <CardDescription>
              Cache emergency service locations for offline navigation
            </CardDescription>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className="flex items-center gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Status */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cache Status</span>
            <Badge variant={hasCachedData ? "default" : "outline"}>
              {hasCachedData ? "Cached" : "Not Cached"}
            </Badge>
          </div>
          
          {hasCachedData && (
            <>
              <div className="text-sm text-muted-foreground">
                {cachedLocations.length} locations cached
                {lastCacheTime && (
                  <span className="ml-1">
                    • Updated {formatDistanceToNow(lastCacheTime, { addSuffix: true })}
                  </span>
                )}
              </div>
              
              {/* Service type breakdown */}
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(serviceTypeCounts).map(([type, count]) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Caching Progress */}
        {isCaching && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Caching emergency services...
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleCacheNow}
            disabled={isCaching || !isOnline || !userLocation}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {hasCachedData ? "Update Cache" : "Cache Now"}
          </Button>
          
          {hasCachedData && (
            <Button
              variant="outline"
              onClick={clearCache}
              disabled={isCaching}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Offline maps allow you to view emergency service locations and get basic navigation 
          even without internet. Cache is automatically used when you go offline.
        </p>

        {!isOnline && hasCachedData && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary">
              Using offline cache
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Showing {cachedLocations.length} cached emergency locations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
