import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import EmergencyForm from "@/components/EmergencyForm";
import LocationMap from "@/components/LocationMap";
import ContactList from "@/components/ContactList";
import ShareLocation from "@/components/ShareLocation";
import PersonalContacts from "@/components/PersonalContacts";
import AlertHistory from "@/components/AlertHistory";
import { ActiveAlerts } from "@/components/ActiveAlerts";
import { EmergencyProfile } from "@/components/EmergencyProfile";
import { MedicalIDCard } from "@/components/MedicalIDCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { EmergencyChat } from "@/components/EmergencyChat";
import { EmergencyDirections } from "@/components/EmergencyDirections";
import { InAppNotifications } from "@/components/InAppNotifications";
import { NearbyServicesSearch } from "@/components/NearbyServicesSearch";
import { Shield, LogOut, User, History, Users, Heart, IdCard, Plus, Menu, Wifi, WifiOff, FileText, MapPin, Eye, Settings, BellOff, Bell } from "lucide-react";
import { HighContrastToggle } from "@/components/HighContrastToggle";
import { Button } from "@/components/ui/button";
import { useNotificationFilter } from "@/hooks/useNotificationFilter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { useAlertEscalation } from "@/hooks/useAlertEscalation";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useBackgroundLocation } from "@/hooks/useBackgroundLocation";
import { useAuth } from "@/hooks/useAuth";
import { useEmergencyActions } from "@/hooks/useEmergencyActions";
import { useEvidenceAutoCleanup } from "@/hooks/useEvidenceAutoCleanup";
import { LoadingSpinner } from "@/components/ui/loading-states";

export interface EmergencyContact {
  id: string;
  name: string;
  type: string;
  phone: string;
  distance?: string;
  isNational?: boolean;
}

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { session, loading: authLoading, handleLogout } = useAuth();

  const [showEmergency, setShowEmergency] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [emergencyType, setEmergencyType] = useState("");
  const [situation, setSituation] = useState("");
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("emergency");
  const [showMedicalID, setShowMedicalID] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const { alerts, isLoading: alertsLoading } = useRealtimeAlerts(session?.user?.id);
  const { isOnline } = useOfflineSync();
  const { quietHours, updateQuietHours, getQuietHoursStatus } = useNotificationFilter();
  const quietStatus = getQuietHoursStatus();

  useAlertEscalation();

  const hasActiveAlert = useMemo(
    () => alerts.some((alert: any) => alert.status === 'active'),
    [alerts]
  );

  useBackgroundLocation({
    alertId: currentAlertId,
    isActive: hasActiveAlert && showEmergency,
  });

  const {
    createAlert,
    handleQuickSOS,
    handleSilentPanic,
    resolveAlert,
    triggerImpact,
  } = useEmergencyActions({
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    onAlertCreated: useCallback((alertId: string) => {
      setCurrentAlertId(alertId);
      setShowEmergency(true);
    }, []),
    onLocationSet: useCallback((location: { lat: number; lng: number }) => {
      setUserLocation(location);
    }, []),
  });

  const handleEmergencyClick = useCallback(async (type: string, description: string, evidenceFiles?: any[]) => {
    setEmergencyType(type);
    setSituation(description);
    await createAlert(type, description, evidenceFiles);
  }, [createAlert]);

  const handleBack = useCallback(async () => {
    if (currentAlertId) {
      await resolveAlert(currentAlertId);
    }
    setShowEmergency(false);
    setUserLocation(null);
    setCurrentAlertId(null);
  }, [currentAlertId, resolveAlert]);

  // Pull to refresh
  useEffect(() => {
    let startY = 0;
    const threshold = 80;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY > 0) {
        const distance = e.touches[0].clientY - startY;
        if (distance > 0 && distance < 150) {
          setPullDistance(distance);
          setIsPulling(true);
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > threshold) window.location.reload();
      setPullDistance(0);
      setIsPulling(false);
      startY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance]);

  const escalatedAlert = useMemo(
    () => alerts?.find((alert: any) => alert.status === 'escalated'),
    [alerts]
  );

  const handleTabChange = useCallback((val: string) => {
    triggerImpact('light');
    setActiveTab(val);
  }, [triggerImpact]);

  const toggleDnd = useCallback(() => {
    updateQuietHours({ enabled: !quietHours.enabled });
    toast(quietHours.enabled ? 'Do Not Disturb disabled' : 'Do Not Disturb enabled', {
      description: quietHours.enabled
        ? 'You will receive all notifications'
        : `Non-critical notifications muted ${quietHours.startTime} - ${quietHours.endTime}`,
    });
  }, [quietHours, updateQuietHours]);

  if (authLoading || !session) {
    return <LoadingSpinner message="Checking authentication..." size="lg" className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div
          className="fixed top-0 left-0 right-0 flex justify-center pt-2 z-50 transition-opacity"
          style={{ opacity: pullDistance / 80 }}
        >
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs">
            Pull to refresh...
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        {/* Online Status Bar */}
        <div className="border-b border-primary-foreground/20">
          <div className="container mx-auto px-3 py-1 flex items-center justify-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-400">Offline</span>
              </>
            )}
          </div>
        </div>

        <div className="container mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold">{t('app.name')}</h1>
              <p className="text-xs opacity-90">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${quietHours.enabled ? 'text-orange-400 hover:bg-orange-400/20' : 'text-primary-foreground hover:bg-primary-foreground/10'}`}
              onClick={toggleDnd}
              title={quietStatus.message}
            >
              {quietHours.enabled ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </Button>
            <HighContrastToggle />
            <InAppNotifications userId={session.user.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowMedicalID(true)}>
                  <IdCard className="w-4 h-4 mr-2" />
                  Medical ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/medical-records")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Medical Records
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/community-services")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* DND Banner */}
      {quietHours.enabled && (
        <div className="bg-orange-500/15 border-b border-orange-500/30">
          <div className="container mx-auto px-3 py-1.5 flex items-center justify-between max-w-2xl">
            <div className="flex items-center gap-2">
              <BellOff className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                Do Not Disturb is on · {quietHours.startTime} – {quietHours.endTime}
                {quietHours.allowCritical && ' · Critical alerts allowed'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 px-2"
              onClick={() => {
                updateQuietHours({ enabled: false });
                toast('Do Not Disturb disabled');
              }}
            >
              Turn off
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-3 py-3 max-w-2xl pb-20">
        {!showEmergency ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="emergency" className="flex flex-col items-center gap-1 py-2 text-xs">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">{t('tabs.emergency')}</span>
              </TabsTrigger>
              <TabsTrigger value="nearby" className="flex flex-col items-center gap-1 py-2 text-xs">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Nearby</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex flex-col items-center gap-1 py-2 text-xs">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t('tabs.contacts')}</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col items-center gap-1 py-2 text-xs">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">{t('tabs.profile')}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex flex-col items-center gap-1 py-2 text-xs">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{t('tabs.history')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emergency" className="space-y-3">
              {!alertsLoading && alerts.length > 0 && (
                <div className="mb-3">
                  <ActiveAlerts alerts={alerts} />
                  {escalatedAlert && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-yellow-500 text-black text-xs">
                          {t('emergency.escalated')}
                        </Badge>
                        <span className="text-xs font-semibold">Alert #{escalatedAlert.id.slice(0, 8)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('emergency.escalatedMessage')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick SOS Button */}
              <div className="mb-3">
                <Button
                  onClick={handleQuickSOS}
                  className="w-full h-16 text-xl font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg animate-pulse"
                >
                  🚨 {t('emergency.quickSOS')}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-1">
                  Tap for instant emergency alert
                </p>
              </div>

              {/* Silent Panic Button */}
              <div className="mb-3">
                <Button
                  onClick={handleSilentPanic}
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-2 border-muted-foreground hover:bg-muted"
                >
                  🔇 Silent Panic
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-1">
                  Discreet alert without sound or notification
                </p>
              </div>

              <EmergencyForm onEmergencyClick={handleEmergencyClick} userId={session.user.id} />
            </TabsContent>

            <TabsContent value="nearby">
              <NearbyServicesSearch />
            </TabsContent>

            <TabsContent value="contacts">
              <PersonalContacts userId={session.user.id} />
            </TabsContent>

            <TabsContent value="profile">
              <EmergencyProfile userId={session.user.id} />
            </TabsContent>

            <TabsContent value="history">
              <AlertHistory userId={session.user.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            {/* Emergency Alert */}
            <div className="bg-primary text-primary-foreground p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-2">{t('emergency.activeAlert')}</h2>
              <p className="mb-2">
                <strong>{t('emergency.selectType')}:</strong> {emergencyType}
              </p>
              <p className="mb-4">
                <strong>{t('emergency.describeSituation')}:</strong> {situation}
              </p>
              <button
                onClick={handleBack}
                className="bg-primary-foreground text-primary px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
              >
                {t('emergency.imSafe')}
              </button>
            </div>

            {/* Location Map */}
            {userLocation && (
              <div className="bg-card rounded-lg shadow-lg overflow-hidden">
                <LocationMap location={userLocation} />
              </div>
            )}

            {/* Emergency Directions & Routing */}
            {userLocation && (
              <EmergencyDirections
                userLocation={userLocation}
                emergencyType={emergencyType}
              />
            )}

            {/* Emergency Contacts */}
            <ContactList emergencyType={emergencyType} userLocation={userLocation} />

            {/* Emergency Chat */}
            {currentAlertId && session?.user && (
              <EmergencyChat
                alertId={currentAlertId}
                userId={session.user.id}
                userName={session.user.email || 'User'}
                isGroupChat={true}
              />
            )}

            {/* Share Location */}
            {session?.user && userLocation && (
              <ShareLocation
                userId={session.user.id}
                location={userLocation}
                situation={situation}
              />
            )}
          </div>
        )}
      </main>

      {/* Medical ID Dialog */}
      <Dialog open={showMedicalID} onOpenChange={setShowMedicalID}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('medicalID.title')}</DialogTitle>
          </DialogHeader>
          <MedicalIDCard />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
