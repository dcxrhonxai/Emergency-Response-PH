import { useState } from 'react';
import { toast } from 'sonner';

export const usePhoneCaller = () => {
  const [isCalling, setIsCalling] = useState(false);

  const makeCall = async (phoneNumber: string, contactName?: string) => {
    setIsCalling(true);
    
    try {
      // Remove all non-numeric characters except + for international format
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      if (!cleanNumber) {
        toast.error('Invalid phone number');
        setIsCalling(false);
        return;
      }

      // Use tel: URL scheme - works on both web and native
      window.location.href = `tel:${cleanNumber}`;
      
      const displayName = contactName ? ` ${contactName}` : '';
      toast.success(`Calling${displayName}...`, {
        description: phoneNumber,
      });
    } catch (error) {
      console.error('Error making call:', error);
      toast.error('Failed to initiate call');
    } finally {
      // Reset after a short delay
      setTimeout(() => setIsCalling(false), 1000);
    }
  };

  const sendSMS = async (phoneNumber: string, message?: string) => {
    try {
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      if (!cleanNumber) {
        toast.error('Invalid phone number');
        return;
      }

      // Use sms: URL scheme with optional message body
      const smsUrl = message 
        ? `sms:${cleanNumber}?body=${encodeURIComponent(message)}`
        : `sms:${cleanNumber}`;
      
      window.location.href = smsUrl;
      toast.success('Opening SMS app...');
    } catch (error) {
      console.error('Error opening SMS:', error);
      toast.error('Failed to open SMS app');
    }
  };

  return {
    makeCall,
    sendSMS,
    isCalling,
  };
};
