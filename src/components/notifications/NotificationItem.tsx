import { Bell, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

export interface NotificationLog {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  filtered_by_dnd?: boolean;
}

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

export const NotificationItem = ({ notification }: { notification: NotificationLog }) => (
  <div
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
);
