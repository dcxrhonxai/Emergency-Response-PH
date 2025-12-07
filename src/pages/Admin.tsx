import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, LogOut, AlertTriangle, Building2, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmergencyServicesManager from '@/components/admin/EmergencyServicesManager';
import AlertsMonitor from '@/components/admin/AlertsMonitor';
import UserRolesManager from '@/components/admin/UserRolesManager';
import { PendingServicesManager } from '@/components/admin/PendingServicesManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Emergency Response Management</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-4xl">
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="services">
              <Building2 className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="pending">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="services">
            <EmergencyServicesManager />
          </TabsContent>

          <TabsContent value="pending">
            <PendingServicesManager />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsMonitor />
          </TabsContent>

          <TabsContent value="users">
            <UserRolesManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
