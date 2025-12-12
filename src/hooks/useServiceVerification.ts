import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VerificationCriteria {
  phoneVerified: boolean;
  addressVerified: boolean;
  coordinatesValid: boolean;
  duplicateCheck: boolean;
  notes: string;
}

export interface ServiceWithVerification {
  id: string;
  name: string;
  type: string;
  phone: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  submitted_by: string;
  verification?: VerificationCriteria;
}

export const useServiceVerification = () => {
  const [verifying, setVerifying] = useState<string | null>(null);

  // Validate phone number format (Philippine format)
  const validatePhoneNumber = useCallback((phone: string): boolean => {
    const phoneRegex = /^(\+63|0)?9\d{9}$/;
    const landlineRegex = /^(\+63|0)?[2-9]\d{7,8}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, '')) || 
           landlineRegex.test(phone.replace(/\s|-/g, ''));
  }, []);

  // Validate coordinates are within Philippines bounds
  const validateCoordinates = useCallback((lat: number, lng: number): boolean => {
    const phBounds = {
      minLat: 4.5,
      maxLat: 21.5,
      minLng: 116.0,
      maxLng: 127.0
    };
    return lat >= phBounds.minLat && lat <= phBounds.maxLat &&
           lng >= phBounds.minLng && lng <= phBounds.maxLng;
  }, []);

  // Check for duplicate services
  const checkDuplicates = useCallback(async (
    name: string, 
    phone: string,
    latitude: number,
    longitude: number
  ): Promise<boolean> => {
    try {
      // Check by name similarity
      const { data: byName } = await supabase
        .from('emergency_services')
        .select('id')
        .ilike('name', `%${name}%`)
        .limit(1);

      if (byName && byName.length > 0) {
        return true;
      }

      // Check by phone
      const { data: byPhone } = await supabase
        .from('emergency_services')
        .select('id')
        .eq('phone', phone)
        .limit(1);

      if (byPhone && byPhone.length > 0) {
        return true;
      }

      // Check by proximity (within ~100 meters)
      const { data: byLocation } = await supabase
        .from('emergency_services')
        .select('id, latitude, longitude');

      if (byLocation) {
        const threshold = 0.001; // Approximately 100 meters
        const nearby = byLocation.find(s => 
          Math.abs(Number(s.latitude) - latitude) < threshold &&
          Math.abs(Number(s.longitude) - longitude) < threshold
        );
        if (nearby) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  }, []);

  // Run full verification
  const verifyService = useCallback(async (
    service: ServiceWithVerification
  ): Promise<VerificationCriteria> => {
    setVerifying(service.id);
    
    try {
      const phoneVerified = validatePhoneNumber(service.phone);
      const addressVerified = Boolean(service.address && service.address.length > 10);
      const coordinatesValid = validateCoordinates(service.latitude, service.longitude);
      const duplicateCheck = await checkDuplicates(
        service.name, 
        service.phone,
        service.latitude,
        service.longitude
      );

      const notes: string[] = [];
      
      if (!phoneVerified) notes.push('Invalid phone format');
      if (!addressVerified) notes.push('Address incomplete or missing');
      if (!coordinatesValid) notes.push('Coordinates outside Philippines');
      if (duplicateCheck) notes.push('Possible duplicate found');

      return {
        phoneVerified,
        addressVerified,
        coordinatesValid,
        duplicateCheck: !duplicateCheck, // true = no duplicates
        notes: notes.length > 0 ? notes.join('; ') : 'All checks passed'
      };
    } catch (error) {
      console.error('Verification error:', error);
      return {
        phoneVerified: false,
        addressVerified: false,
        coordinatesValid: false,
        duplicateCheck: false,
        notes: 'Verification failed'
      };
    } finally {
      setVerifying(null);
    }
  }, [validatePhoneNumber, validateCoordinates, checkDuplicates]);

  // Approve service with verification
  const approveWithVerification = useCallback(async (
    service: ServiceWithVerification,
    verification: VerificationCriteria
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return false;
      }

      // Check if all critical verifications pass
      const allPassed = verification.phoneVerified && 
                        verification.coordinatesValid && 
                        verification.duplicateCheck;

      if (!allPassed) {
        toast.warning('Service has verification warnings. Proceeding anyway.');
      }

      // Insert into emergency_services
      const { error: insertError } = await supabase
        .from('emergency_services')
        .insert({
          name: service.name,
          type: service.type,
          phone: service.phone,
          address: service.address,
          city: service.city,
          latitude: service.latitude,
          longitude: service.longitude,
          is_national: false
        });

      if (insertError) throw insertError;

      // Update pending service status
      const { error: updateError } = await supabase
        .from('pending_emergency_services')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', service.id);

      if (updateError) throw updateError;

      toast.success(`${service.name} verified and added to directory`);
      return true;
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve service');
      return false;
    }
  }, []);

  // Reject service with reason
  const rejectWithReason = useCallback(async (
    serviceId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return false;
      }

      const { error } = await supabase
        .from('pending_emergency_services')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) throw error;

      toast.success(`Service rejected: ${reason}`);
      return true;
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject service');
      return false;
    }
  }, []);

  return {
    verifying,
    verifyService,
    approveWithVerification,
    rejectWithReason,
    validatePhoneNumber,
    validateCoordinates
  };
};
