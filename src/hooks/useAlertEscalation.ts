import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ESCALATION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export const useAlertEscalation = () => {
  useEffect(() => {
    const checkEscalation = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          'check-alert-escalation'
        );

        if (error) {
          console.error('Error checking alert escalation:', error);
          return;
        }

        if (data?.escalated > 0) {
          console.log(`${data.escalated} alert(s) escalated`);
        }
      } catch (error) {
        console.error('Error in escalation check:', error);
      }
    };

    // Run initial check
    checkEscalation();

    // Set up interval for periodic checks
    const interval = setInterval(checkEscalation, ESCALATION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);
};
