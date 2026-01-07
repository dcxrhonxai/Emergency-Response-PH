import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebhooks } from '@/hooks/useWebhooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Webhook, 
  Send, 
  Check, 
  X, 
  Clock, 
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookLog {
  id: string;
  timestamp: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending';
  response_code?: number;
  url: string;
}

const EVENT_TYPES = [
  { id: 'alert_created', label: 'Alert Created', description: 'When a new emergency alert is created' },
  { id: 'alert_resolved', label: 'Alert Resolved', description: 'When an emergency is resolved' },
  { id: 'alert_escalated', label: 'Alert Escalated', description: 'When an alert is escalated' },
  { id: 'location_updated', label: 'Location Updated', description: 'When user location is updated during emergency' },
];

export const WebhookManager = () => {
  const { t } = useTranslation();
  const { getWebhookConfig, saveWebhookConfig, testWebhook, isSending } = useWebhooks();
  
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // Load existing config
  useEffect(() => {
    const config = getWebhookConfig();
    if (config) {
      setUrl(config.url);
      setEnabled(config.enabled);
      setSelectedEvents(config.events);
    }
    
    // Load logs from localStorage
    const storedLogs = localStorage.getItem('webhook_logs');
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch {
        setLogs([]);
      }
    }
  }, [getWebhookConfig]);

  const handleSave = () => {
    if (enabled && !url) {
      toast.error('Please enter a webhook URL');
      return;
    }

    if (enabled && selectedEvents.length === 0) {
      toast.error('Please select at least one event type');
      return;
    }

    saveWebhookConfig({
      url,
      enabled,
      events: selectedEvents,
    });

    toast.success('Webhook configuration saved');
  };

  const handleTest = async () => {
    if (!url) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    setIsTesting(true);
    const success = await testWebhook(url);
    
    // Add to logs
    const newLog: WebhookLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      event_type: 'test',
      status: success ? 'success' : 'failed',
      response_code: success ? 200 : 500,
      url,
    };
    
    const updatedLogs = [newLog, ...logs].slice(0, 50); // Keep last 50 logs
    setLogs(updatedLogs);
    localStorage.setItem('webhook_logs', JSON.stringify(updatedLogs));
    
    setIsTesting(false);
  };

  const handleEventToggle = (eventId: string, checked: boolean) => {
    if (checked) {
      setSelectedEvents([...selectedEvents, eventId]);
    } else {
      setSelectedEvents(selectedEvents.filter(e => e !== eventId));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('webhook_logs');
    toast.success('Webhook logs cleared');
  };

  const getStatusBadge = (status: WebhookLog['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure webhooks to notify external systems about emergency events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="webhook-enabled">Enable Webhooks</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications to your endpoint when events occur
              </p>
            </div>
            <Switch
              id="webhook-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <Separator />

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-server.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || isSending || !url}
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">Test</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Your endpoint will receive POST requests with event data
            </p>
          </div>

          <Separator />

          {/* Event Types */}
          <div className="space-y-4">
            <Label>Event Types</Label>
            <div className="grid gap-3">
              {EVENT_TYPES.map((event) => (
                <div key={event.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={event.id}
                    checked={selectedEvents.includes(event.id)}
                    onCheckedChange={(checked) => handleEventToggle(event.id, checked as boolean)}
                  />
                  <div className="grid gap-1 leading-none">
                    <Label htmlFor={event.id} className="cursor-pointer">
                      {event.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              Webhook Payload Format
            </div>
            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "event_type": "alert_created",
  "alert_id": "uuid",
  "user_id": "uuid",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              All requests include an <code className="bg-background px-1 py-0.5 rounded">X-Emergency-Signature</code> header for verification
            </p>
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Delivery Logs
              </CardTitle>
              <CardDescription>
                Recent webhook delivery attempts
              </CardDescription>
            </div>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No webhook deliveries yet</p>
              <p className="text-sm">Test your webhook to see delivery logs here</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.event_type}</Badge>
                        {getStatusBadge(log.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {log.url}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        {log.response_code && `HTTP ${log.response_code}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
