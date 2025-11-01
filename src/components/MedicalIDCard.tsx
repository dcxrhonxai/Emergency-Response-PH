import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, Heart, AlertTriangle, FileText, User } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  full_name: string | null;
  phone_number: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  emergency_notes: string | null;
}

interface PersonalContact {
  name: string;
  phone: string;
  relationship: string | null;
}

export const MedicalIDCard = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [primaryContact, setPrimaryContact] = useState<PersonalContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load primary contact (first one)
      const { data: contactData, error: contactError } = await supabase
        .from('personal_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!contactError && contactData) {
        setPrimaryContact(contactData);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <Card className="border-2 border-destructive shadow-lg">
        <CardHeader className="bg-destructive text-destructive-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-6 w-6" />
              {t('medicalID.title')}
            </CardTitle>
            <Badge variant="secondary" className="bg-white text-destructive">
              EMERGENCY
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Personal Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" />
              {profile?.full_name || t('medicalID.noInfo')}
            </div>
            {profile?.phone_number && (
              <p className="text-sm text-muted-foreground pl-6">{profile.phone_number}</p>
            )}
          </div>

          <Separator />

          {/* Blood Type */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t('medicalID.bloodType')}
            </p>
            <p className="text-2xl font-bold text-destructive">
              {profile?.blood_type || t('medicalID.noInfo')}
            </p>
          </div>

          <Separator />

          {/* Allergies */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold">{t('medicalID.allergies')}</p>
            </div>
            <p className="text-sm pl-6">
              {profile?.allergies || t('medicalID.noInfo')}
            </p>
          </div>

          {/* Medical Conditions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold">{t('medicalID.medicalConditions')}</p>
            </div>
            <p className="text-sm pl-6">
              {profile?.medical_conditions || t('medicalID.noInfo')}
            </p>
          </div>

          {/* Emergency Notes */}
          {profile?.emergency_notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold">{t('medicalID.notes')}</p>
              </div>
              <p className="text-sm pl-6">{profile.emergency_notes}</p>
            </div>
          )}

          <Separator />

          {/* Emergency Contact */}
          {primaryContact && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t('medicalID.emergencyContact')}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{primaryContact.name}</p>
                  {primaryContact.relationship && (
                    <p className="text-xs text-muted-foreground">{primaryContact.relationship}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCall(primaryContact.phone)}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {t('medicalID.call')}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Instructions */}
          <p className="text-xs text-center text-muted-foreground italic">
            {t('medicalID.instructions')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
