import { useState, useEffect } from "react";
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
import { Shield, LogOut, User, History, Users, Heart, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { useEmergencyNotifications } from "@/hooks/useEmergencyNotifications";
import { useAlertEscalation } from "@/hooks/useAlertEscalation";
import type { Session } from "@supabase/supabase-js";

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
  const [session, setSession] = useState<Session | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [emergencyType, setEmergencyType] = useState("");
  const [situation, setSituation] = useState("");
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("emergency");
  const [showMedicalID, setShowMedicalID] = useState(false);
  const { alerts, isLoading: alertsLoading } = useRealtimeAlerts(session?.user?.id);
  const { sendNotifications } = useEmergencyNotifications();
  
  // Enable alert escalation checking
  useAlertEscalation();

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleQuickSOS = async () => {
    const quickType = "🚨 EMERGENCY - SOS";
    const quickSituation = "Quick SOS activated - Immediate help needed";
    handleEmergencyClick(quickType, quickSituation);
  };

  const handleEmergencyClick = async (type: string, description: string, evidenceFiles?: any[]) => {
    setEmergencyType(type);
    setSituation(description);
    setShowEmergency(true);
    
    // Get user's location with high accuracy
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          
          console.log('Location accuracy:', position.coords.accuracy, 'meters');
          if (position.coords.accuracy > 50) {
            toast.warning(`Location accuracy: ±${Math.round(position.coords.accuracy)}m`);
          }

          // Save alert to database
          if (session?.user) {
            const { data, error } = await supabase
              .from('emergency_alerts')
              .insert({
                user_id: session.user.id,
                emergency_type: type,
                situation: description,
                latitude: location.lat,
                longitude: location.lng,
                evidence_files: evidenceFiles || [],
              })
              .select()
              .single();

            if (data) {
              setCurrentAlertId(data.id);

              // Get user's emergency contacts
              const { data: contacts } = await supabase
                .from("personal_contacts")
                .select("name, phone")
                .eq("user_id", session.user.id);

              if (contacts && contacts.length > 0) {
                // Get profile for email if available
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", session.user.id)
                  .single();

                // Format contacts with email if they provided it
                const formattedContacts = contacts.map(c => ({
                  name: c.name,
                  phone: c.phone,
                  email: session.user.email ? session.user.email : undefined,
                }));

                // Send email notifications
                await sendNotifications(
                  data.id,
                  formattedContacts,
                  type,
                  description,
                  location,
                  evidenceFiles?.map(f => ({ url: f.url, type: f.type }))
                );
              }
            }
            if (error) {
              console.error("Error saving alert:", error);
            }
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Manila coordinates if location access denied
          const defaultLocation = { lat: 14.5995, lng: 120.9842 };
          setUserLocation(defaultLocation);
          toast.warning("Could not access your location. Using default location.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Default to Manila coordinates if geolocation not supported
      setUserLocation({ lat: 14.5995, lng: 120.9842 });
      toast.warning("Geolocation not supported. Using default location.");
    }
  };

  const handleBack = async () => {
    // Mark alert as resolved
    if (currentAlertId) {
      await supabase
        .from('emergency_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', currentAlertId);
    }
    
    setShowEmergency(false);
    setUserLocation(null);
    setCurrentAlertId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

  if (!session) {
    return null; // Will redirect to auth
  }

  // Find if there's an escalated alert
  const escalatedAlert = alerts?.find((alert: any) => alert.status === 'escalated');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">{t('app.name')}</h1>
              <p className="text-sm opacity-90">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMedicalID(true)}
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <IdCard className="w-4 h-4 mr-2" />
              Medical ID
            </Button>
            <LanguageSwitcher />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {!showEmergency ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="emergency" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('tabs.emergency')}
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('tabs.contacts')}
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                {t('tabs.profile')}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                {t('tabs.history')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emergency">
              {!alertsLoading && alerts.length > 0 && (
                <div className="mb-6">
                  <ActiveAlerts alerts={alerts} />
                  {escalatedAlert && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border-2 border-yellow-500 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-yellow-500 text-black">
                          {t('emergency.escalated')}
                        </Badge>
                        <span className="font-semibold">Alert #{escalatedAlert.id.slice(0, 8)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('emergency.escalatedMessage')}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Quick SOS Button */}
              <div className="mb-6">
                <Button
                  onClick={handleQuickSOS}
                  className="w-full h-32 text-3xl font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg animate-pulse"
                  size="lg"
                >
                  🚨 {t('emergency.quickSOS')}
                </Button>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Tap for instant emergency alert
                </p>
              </div>

              <EmergencyForm onEmergencyClick={handleEmergencyClick} userId={session.user.id} />
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
