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
  Loader2
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

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
    requestPermission 
  } = usePushNotifications({ userId: userId || '' });

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

                  {permissionStatus === 'granted' && fcmToken && (
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Push notifications are active</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Device registered for emergency alerts
                      </p>
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
