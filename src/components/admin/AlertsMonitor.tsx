import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, MapPin, Clock, User, CheckCircle, Trash2, CheckCheck } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
    
    const channel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_alerts' },
        () => { loadAlerts(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

  const loadAlerts = async () => {
    setLoading(true);
    let query = supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'active') query = query.eq('status', 'active');
    else if (filter === 'resolved') query = query.eq('status', 'resolved');

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load alerts');
      setLoading(false);
      return;
    }

    const alertsWithProfiles = await Promise.all(
      (data || []).map(async (alert) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone_number')
          .eq('id', alert.user_id)
          .maybeSingle();
        return { ...alert, profiles: profile };
      })
    );

    setAlerts(alertsWithProfiles as Alert[]);
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === alerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(alerts.map(a => a.id)));
    }
  };

  const handleBulkResolve = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);

    const { error } = await supabase
      .from('emergency_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      toast.error('Failed to resolve alerts');
    } else {
      toast.success(`${ids.length} alert(s) resolved`);
      setSelectedIds(new Set());
      loadAlerts();
    }
    setBulkLoading(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} alert(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);

    const { error } = await supabase
      .from('emergency_alerts')
      .delete()
      .in('id', ids);

    if (error) {
      toast.error('Failed to delete alerts');
    } else {
      toast.success(`${ids.length} alert(s) deleted`);
      setSelectedIds(new Set());
      loadAlerts();
    }
    setBulkLoading(false);
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

  const allSelected = alerts.length > 0 && selectedIds.size === alerts.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Emergency Alerts Monitor</h2>
          <p className="text-sm text-muted-foreground">Real-time monitoring of all emergency alerts</p>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            {(['all', 'active', 'resolved'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                size="sm"
              >
                {f === 'all' ? 'All Alerts' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all alerts"
            />
            <span className="text-sm text-muted-foreground">
              {someSelected ? `${selectedIds.size} selected` : 'Select all'}
            </span>
            {someSelected && (
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkResolve}
                  disabled={bulkLoading}
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Resolve ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts found</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <Card
                key={alert.id}
                className={`p-4 hover:shadow-md transition-shadow ${selectedIds.has(alert.id) ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(alert.id)}
                    onCheckedChange={() => toggleSelect(alert.id)}
                    className="mt-1"
                    aria-label={`Select alert ${alert.id}`}
                  />
                  <div className="flex-1 space-y-3">
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

                    <p className="text-sm">{alert.situation}</p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}</span>
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
