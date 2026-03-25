import { useRef, useState, useCallback } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationItem, type NotificationLog } from './NotificationItem';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SwipeableNotificationItemProps {
  notification: NotificationLog;
  onRemove?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;
const DISMISS_THRESHOLD = 150;

export const SwipeableNotificationItem = ({
  notification,
  onRemove,
  onMarkRead,
}: SwipeableNotificationItemProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - startXRef.current;
    currentXRef.current = diff;
    setOffsetX(diff);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(async () => {
    setIsSwiping(false);
    const diff = currentXRef.current;

    // Swipe left beyond dismiss threshold → delete with undo
    if (diff < -DISMISS_THRESHOLD) {
      setDismissed(true);
      const undoTimeout = setTimeout(async () => {
        const { error } = await supabase
          .from('in_app_notifications')
          .delete()
          .eq('id', notification.id);
        if (error) {
          toast.error('Failed to delete notification');
          setDismissed(false);
          setOffsetX(0);
        } else {
          onRemove?.(notification.id);
        }
      }, 4000);

      toast('Notification dismissed', {
        action: {
          label: 'Undo',
          onClick: () => {
            clearTimeout(undoTimeout);
            setDismissed(false);
            setOffsetX(0);
          },
        },
        duration: 3500,
      });
      return;
    }

    // Swipe right beyond threshold → mark as read
    if (diff > SWIPE_THRESHOLD && !notification.read) {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ read: true })
        .eq('id', notification.id);
      if (error) {
        toast.error('Failed to mark as read');
      } else {
        toast.success('Marked as read');
        onMarkRead?.(notification.id);
      }
    }

    setOffsetX(0);
  }, [notification.id, notification.read, onRemove, onMarkRead]);

  if (dismissed) {
    return (
      <div className="h-0 overflow-hidden transition-all duration-200" />
    );
  }

  const showMarkRead = offsetX > SWIPE_THRESHOLD && !notification.read;
  const showDelete = offsetX < -SWIPE_THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-lg" ref={containerRef}>
      {/* Background actions revealed by swipe */}
      <div className="absolute inset-0 flex">
        {/* Left side - mark as read (swipe right) */}
        <div
          className={cn(
            'flex items-center justify-start px-4 transition-colors w-1/2',
            showMarkRead ? 'bg-green-500/20' : 'bg-muted/30'
          )}
        >
          {!notification.read && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="h-5 w-5" />
              <span className="text-xs font-medium">Read</span>
            </div>
          )}
        </div>
        {/* Right side - delete (swipe left) */}
        <div
          className={cn(
            'flex items-center justify-end px-4 transition-colors w-1/2',
            showDelete ? 'bg-destructive/20' : 'bg-muted/30'
          )}
        >
          <div className="flex items-center gap-2 text-destructive">
            <span className="text-xs font-medium">Delete</span>
            <Trash2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Foreground notification */}
      <div
        className="relative bg-background transition-transform touch-pan-y"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <NotificationItem notification={notification} />
      </div>
    </div>
  );
};
