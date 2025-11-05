import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MapPin, Clock, User, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Alert {
  id: string;
  user_id: string;
  emergency_type: string;
  situation: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  profiles?: {
    full_name: string | null;
    phone_number: string | null;
  } | null;
}

const AlertsMonitor = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    loadAlerts();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_alerts'
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const loadAlerts = async () => {
    setLoading(true);
    let query = supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false});

    if (filter === 'active') {
      query = query.eq('status', 'active');
    } else if (filter === 'resolved') {
      query = query.eq('status', 'resolved');
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load alerts');
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch profiles separately for each alert
    const alertsWithProfiles = await Promise.all(
      (data || []).map(async (alert) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone_number')
          .eq('id', alert.user_id)
          .maybeSingle();

        return {
          ...alert,
          profiles: profile,
        };
      })
    );

    setAlerts(alertsWithProfiles as Alert[]);
    setLoading(false);
  };

  const getEmergencyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      police: 'bg-blue-500/10 text-blue-500',
      fire: 'bg-red-500/10 text-red-500',
      medical: 'bg-green-500/10 text-green-500',
      other: 'bg-gray-500/10 text-gray-500',
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Emergency Alerts Monitor</h2>
          <p className="text-sm text-muted-foreground">Real-time monitoring of all emergency alerts</p>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All Alerts
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              onClick={() => setFilter('active')}
              size="sm"
            >
              Active
            </Button>
            <Button
              variant={filter === 'resolved' ? 'default' : 'outline'}
              onClick={() => setFilter('resolved')}
              size="sm"
            >
              Resolved
            </Button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts found</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getEmergencyTypeColor(alert.emergency_type)}>
                        {alert.emergency_type.toUpperCase()}
                      </Badge>
                      <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                        {alert.status === 'active' ? (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        ) : (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        {alert.status}
                      </Badge>
                    </div>

                    {/* User Info */}
                    {alert.profiles && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {alert.profiles.full_name || 'Unknown User'}
                        </span>
                        {alert.profiles.phone_number && (
                          <span className="text-muted-foreground">
                            • {alert.profiles.phone_number}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Situation */}
                    <p className="text-sm">{alert.situation}</p>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => {
                          window.open(
                            `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`,
                            '_blank'
                          );
                        }}
                      >
                        View on Map
                      </Button>
                    </div>

                    {/* Timestamps */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Created: {format(new Date(alert.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {alert.resolved_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Resolved: {format(new Date(alert.resolved_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default AlertsMonitor;
