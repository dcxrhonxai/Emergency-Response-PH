import { useState, useMemo } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NotificationItem, type NotificationLog } from './NotificationItem';
import { SwipeableNotificationItem } from './SwipeableNotificationItem';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface NotificationGroup {
  key: string;
  title: string;
  type: string;
  items: NotificationLog[];
  latestAt: string;
  unreadCount: number;
}

function groupNotifications(notifications: NotificationLog[]): (NotificationLog | NotificationGroup)[] {
  const grouped = new Map<string, NotificationLog[]>();
  const singles: NotificationLog[] = [];

  // Group by title + type combination
  for (const n of notifications) {
    const key = `${n.title}::${n.type}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(n);
  }

  const result: (NotificationLog | NotificationGroup)[] = [];

  // Sort groups by latest notification time
  const entries = Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    items,
    latestAt: items[0].created_at, // already sorted desc
  }));

  entries.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());

  for (const { key, items } of entries) {
    if (items.length === 1) {
      result.push(items[0]);
    } else {
      result.push({
        key,
        title: items[0].title,
        type: items[0].type,
        items,
        latestAt: items[0].created_at,
        unreadCount: items.filter(n => !n.read).length,
      });
    }
  }

  return result;
}

function isGroup(item: NotificationLog | NotificationGroup): item is NotificationGroup {
  return 'items' in item && Array.isArray(item.items);
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'error': return 'destructive';
    case 'warning': return 'secondary';
    case 'success': return 'default';
    default: return 'outline';
  }
};

export const GroupedNotificationList = ({
  notifications,
  groupingEnabled,
}: {
  notifications: NotificationLog[];
  groupingEnabled: boolean;
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const displayItems = useMemo(() => {
    if (!groupingEnabled) return notifications;
    return groupNotifications(notifications);
  }, [notifications, groupingEnabled]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {displayItems.map((item) => {
        if (!isGroup(item)) {
          return <NotificationItem key={item.id} notification={item} />;
        }

        const group = item;
        const isOpen = expandedGroups.has(group.key);

        return (
          <Collapsible
            key={group.key}
            open={isOpen}
            onOpenChange={() => toggleGroup(group.key)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={`w-full p-3 rounded-lg transition-colors text-left ${
                  group.unreadCount > 0
                    ? 'bg-primary/5 border border-primary/10'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm truncate">{group.title}</span>
                    <Badge variant={getTypeColor(group.type) as any} className="text-[10px] px-1.5 py-0">
                      {group.type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {group.items.length}
                    </Badge>
                    {group.unreadCount > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                        {group.unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(group.latestAt), { addSuffix: true })}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 border-l-2 border-muted pl-2 mt-1 space-y-1">
                {group.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};
