import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Settings as SettingsIcon, 
  ArrowLeft, 
  Globe, 
  Webhook, 
  Crown, 
  Shield, 
  Bell,
  Moon,
  Sun,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Heart,
  Flame,
  ShieldAlert,
  Car,
  AlertTriangle,
  Clock,
  BellOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { WebhookManager } from '@/components/WebhookManager';
import { PremiumSubscription } from '@/components/PremiumSubscription';
import { GDPRSettings } from '@/components/GDPRSettings';
import { useGooglePlayBilling } from '@/hooks/useGooglePlayBilling';
import { useHighContrastMode } from '@/hooks/useHighContrastMode';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationFilter } from '@/hooks/useNotificationFilter';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ceb', name: 'Cebuano', flag: '🇵🇭' },
  { code: 'ilo', name: 'Ilocano', flag: '🇵🇭' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isPremium } = useGooglePlayBilling();
  const { isHighContrast, toggleHighContrast } = useHighContrastMode();
  const [activeTab, setActiveTab] = useState('general');
  const [userId, setUserId] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Use the notification filter hook
  const {
    alertPreferences,
    quietHours,
    updateAlertPreference,
    updateQuietHours,
    getQuietHoursStatus,
  } = useNotificationFilter();

  const toggleAlertPreference = (type: string) => {
    updateAlertPreference(type as keyof typeof alertPreferences, !alertPreferences[type as keyof typeof alertPreferences]);
  };

  // Get the current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Initialize push notifications hook with userId
  const { 
    fcmToken, 
    permissionStatus, 
    requestPermission,
    sendPushNotification 
  } = usePushNotifications({ userId: userId || '' });

  const handleSendTestNotification = async () => {
    if (!userId) {
      toast.error('Please log in to send a test notification');
      return;
    }

    setIsSendingTest(true);
    try {
      // Send using the browser's native notification API for immediate feedback
      if (Notification.permission === 'granted') {
        new Notification('🔔 Test Notification', {
          body: 'Push notifications are working correctly!',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'test-notification',
        });
        toast.success('Test notification sent!');
      } else {
        toast.error('Push notifications not enabled');
      }

      // Also try to send via FCM for server-side verification
      if (fcmToken) {
        await sendPushNotification(
          userId,
          '🔔 Test Notification',
          'Your push notification setup is working correctly!',
          { type: 'test', timestamp: new Date().toISOString() }
        );
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      // Still show success if browser notification worked
      if (Notification.permission === 'granted') {
        toast.success('Local notification sent (FCM may need configuration)');
      } else {
        toast.error('Failed to send test notification');
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const getPermissionStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return { 
          icon: <CheckCircle className="h-4 w-4 text-green-500" />, 
          text: 'Enabled', 
          color: 'text-green-500',
          badgeVariant: 'default' as const
        };
      case 'denied':
        return { 
          icon: <XCircle className="h-4 w-4 text-destructive" />, 
          text: 'Blocked', 
          color: 'text-destructive',
          badgeVariant: 'destructive' as const
        };
      default:
        return { 
          icon: <Bell className="h-4 w-4 text-muted-foreground" />, 
          text: 'Not set', 
          color: 'text-muted-foreground',
          badgeVariant: 'secondary' as const
        };
    }
  };

  const permissionInfo = getPermissionStatusInfo();

  const currentLanguage = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <SettingsIcon className="h-5 w-5" />
            <h1 className="text-lg font-bold">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="general" className="flex flex-col items-center gap-1 py-3">
              <SettingsIcon className="h-4 w-4" />
              <span className="text-xs">General</span>
            </TabsTrigger>
            <TabsTrigger value="premium" className="flex flex-col items-center gap-1 py-3">
              <Crown className="h-4 w-4" />
              <span className="text-xs">Premium</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex flex-col items-center gap-1 py-3">
              <Webhook className="h-4 w-4" />
              <span className="text-xs">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex flex-col items-center gap-1 py-3">
              <Shield className="h-4 w-4" />
              <span className="text-xs">Privacy</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            {/* Language Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Language
                </CardTitle>
                <CardDescription>
                  Choose your preferred language for the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        i18n.language === lang.code
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </div>
                      {i18n.language === lang.code && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isHighContrast ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize how the app looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="high-contrast">High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch
                    id="high-contrast"
                    checked={isHighContrast}
                    onCheckedChange={toggleHighContrast}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Push Notification Permission */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label>Push Notifications</Label>
                        <Badge variant={permissionInfo.badgeVariant} className="text-xs">
                          {permissionInfo.icon}
                          <span className="ml-1">{permissionInfo.text}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Receive emergency alerts on your device
                      </p>
                    </div>
                  </div>
                  
                  {permissionStatus !== 'granted' && (
                    <div className="flex flex-col gap-2">
                      {permissionStatus === 'denied' ? (
                        <div className="p-3 bg-destructive/10 rounded-lg">
                          <p className="text-sm text-destructive">
                            Push notifications are blocked. Please enable them in your browser settings to receive emergency alerts.
                          </p>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleRequestPermission}
                          disabled={isRequestingPermission || !userId}
                          className="w-full"
                        >
                          {isRequestingPermission ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Requesting Permission...
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4 mr-2" />
                              Enable Push Notifications
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {permissionStatus === 'granted' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Push notifications are active</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Device registered for emergency alerts
                        </p>
                      </div>
                      
                      {/* Test Notification Button */}
                      <Button
                        variant="outline"
                        onClick={handleSendTestNotification}
                        disabled={isSendingTest}
                        className="w-full"
                      >
                        {isSendingTest ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Test Notification
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Alert Type Preferences */}
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <Label className="text-base">Alert Types</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose which emergency types you want to receive notifications for
                    </p>
                  </div>
                  
                  <div className="grid gap-3">
                    {/* Medical Emergencies */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-100 text-red-600">
                          <Heart className="h-4 w-4" />
                        </div>
                        <div>
                          <Label htmlFor="alert-medical" className="font-medium">Medical</Label>
                          <p className="text-xs text-muted-foreground">Heart attacks, injuries, health emergencies</p>
                        </div>
                      </div>
                      <Switch
                        id="alert-medical"
                        checked={alertPreferences.medical}
                        onCheckedChange={() => toggleAlertPreference('medical')}
                      />
                    </div>

                    {/* Fire Emergencies */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                          <Flame className="h-4 w-4" />
                        </div>
                        <div>
                          <Label htmlFor="alert-fire" className="font-medium">Fire</Label>
                          <p className="text-xs text-muted-foreground">Building fires, wildfires, gas leaks</p>
                        </div>
                      </div>
                      <Switch
                        id="alert-fire"
                        checked={alertPreferences.fire}
                        onCheckedChange={() => toggleAlertPreference('fire')}
                      />
                    </div>

                    {/* Police/Crime */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <Label htmlFor="alert-police" className="font-medium">Police/Crime</Label>
                          <p className="text-xs text-muted-foreground">Crimes, suspicious activity, threats</p>
                        </div>
                      </div>
                      <Switch
                        id="alert-police"
                        checked={alertPreferences.police}
                        onCheckedChange={() => toggleAlertPreference('police')}
                      />
                    </div>

                    {/* Accidents */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                          <Car className="h-4 w-4" />
                        </div>
                        <div>
                          <Label htmlFor="alert-accident" className="font-medium">Accidents</Label>
                          <p className="text-xs text-muted-foreground">Vehicle crashes, workplace accidents</p>
                        </div>
                      </div>
                      <Switch
                        id="alert-accident"
                        checked={alertPreferences.accident}
                        onCheckedChange={() => toggleAlertPreference('accident')}
                      />
                    </div>

                    {/* Natural Disasters */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <Label htmlFor="alert-disaster" className="font-medium">Natural Disasters</Label>
                          <p className="text-xs text-muted-foreground">Earthquakes, floods, typhoons</p>
                        </div>
                      </div>
                      <Switch
                        id="alert-disaster"
                        checked={alertPreferences.natural_disaster}
                        onCheckedChange={() => toggleAlertPreference('natural_disaster')}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quiet Hours Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-base">Quiet Hours</Label>
                        {quietHours.enabled && (
                          <Badge variant={getQuietHoursStatus().active ? "default" : "secondary"} className="text-xs">
                            {getQuietHoursStatus().active ? (
                              <>
                                <BellOff className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Scheduled
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mute non-critical notifications during specified hours
                      </p>
                    </div>
                    <Switch
                      id="quiet-hours"
                      checked={quietHours.enabled}
                      onCheckedChange={(checked) => updateQuietHours({ enabled: checked })}
                    />
                  </div>

                  {quietHours.enabled && (
                    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="quiet-start" className="text-sm">Start Time</Label>
                          <Input
                            id="quiet-start"
                            type="time"
                            value={quietHours.startTime}
                            onChange={(e) => updateQuietHours({ startTime: e.target.value })}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quiet-end" className="text-sm">End Time</Label>
                          <Input
                            id="quiet-end"
                            type="time"
                            value={quietHours.endTime}
                            onChange={(e) => updateQuietHours({ endTime: e.target.value })}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="allow-critical" className="text-sm font-medium">Allow Critical Alerts</Label>
                          <p className="text-xs text-muted-foreground">
                            Medical, fire, and natural disaster alerts will still come through
                          </p>
                        </div>
                        <Switch
                          id="allow-critical"
                          checked={quietHours.allowCritical}
                          onCheckedChange={(checked) => updateQuietHours({ allowCritical: checked })}
                        />
                      </div>

                      <div className="pt-2 text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {getQuietHoursStatus().message}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emergency alerts via email
                    </p>
                  </div>
                  <Switch id="email-notifications" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound-alerts">Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound for emergency notifications
                    </p>
                  </div>
                  <Switch id="sound-alerts" defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => navigate('/roadmap')}
                  className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <span>View Roadmap</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <Separator />
                <button
                  onClick={() => navigate('/integrations')}
                  className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <span>Integrations</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <Separator />
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <span>Admin Dashboard</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium Settings */}
          <TabsContent value="premium">
            <PremiumSubscription />
          </TabsContent>

          {/* Webhook Settings */}
          <TabsContent value="webhooks">
            <WebhookManager />
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <GDPRSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
