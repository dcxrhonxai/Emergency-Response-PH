import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Bell, BellOff, Filter, Trash2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface NotificationLog {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  filtered_by_dnd?: boolean;
}

const NotificationHistory = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        navigate('/auth');
      }
    };
    getUser();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    loadNotifications();
  }, [userId, filter]);

  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);

    let query = supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'unread') {
      query = query.eq('read', false);
    } else if (filter === 'read') {
      query = query.eq('read', true);
    } else if (filter !== 'all') {
      query = query.eq('type', filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notification history');
    }
    setNotifications((data as NotificationLog[]) || []);
    setLoading(false);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      toast.error('Failed to mark all as read');
    } else {
      toast.success('All notifications marked as read');
      loadNotifications();
    }
  };

  const deleteAllRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('in_app_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('read', true);

    if (error) {
      toast.error('Failed to delete read notifications');
    } else {
      toast.success('Read notifications deleted');
      loadNotifications();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error':
      case 'warning':
        return <BellOff className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Also load local DND-filtered log
  const [dndFilteredLog, setDndFilteredLog] = useState<Array<{ type: string; time: string; reason: string }>>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('dndFilteredNotifications');
    if (saved) {
      setDndFilteredLog(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h1 className="text-lg font-bold">Notification History</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
            <Button variant="outline" size="sm" onClick={deleteAllRead}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Read
            </Button>
          </div>
        </div>

        {/* Notification List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Notifications ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg transition-colors ${
                        notification.read
                          ? 'bg-background'
                          : 'bg-primary/5 border border-primary/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {getTypeIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {notification.title}
                              </span>
                              <Badge variant={getTypeColor(notification.type) as any} className="text-[10px] px-1.5 py-0">
                                {notification.type}
                              </Badge>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')} · {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* DND Filtered Notifications Log */}
        {dndFilteredLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BellOff className="h-4 w-4" />
                Filtered by Do Not Disturb ({dndFilteredLog.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {dndFilteredLog.slice(0, 50).map((log, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                      <BellOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground flex-1">
                        <span className="font-medium">{log.type}</span> — {log.reason}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  localStorage.removeItem('dndFilteredNotifications');
                  setDndFilteredLog([]);
                  toast.success('DND filter log cleared');
                }}
              >
                Clear DND Log
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default NotificationHistory;
