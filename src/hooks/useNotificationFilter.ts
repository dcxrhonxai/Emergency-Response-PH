import { useState, useEffect, useCallback } from 'react';

export interface AlertPreferences {
  medical: boolean;
  fire: boolean;
  police: boolean;
  accident: boolean;
  natural_disaster: boolean;
}

export interface QuietHoursSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  allowCritical: boolean;
  digestEnabled: boolean;
  digestTime: string;
}

export interface DNDBypassContact {
  contactId: string;
  name: string;
}

const EMERGENCY_TYPE_MAP: Record<string, keyof AlertPreferences> = {
  medical: 'medical',
  health: 'medical',
  fire: 'fire',
  police: 'police',
  crime: 'police',
  accident: 'accident',
  vehicle: 'accident',
  natural_disaster: 'natural_disaster',
  earthquake: 'natural_disaster',
  flood: 'natural_disaster',
  typhoon: 'natural_disaster',
  disaster: 'natural_disaster',
};

const CRITICAL_ALERT_TYPES = ['medical', 'health', 'fire', 'natural_disaster', 'earthquake', 'typhoon'];

const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  medical: true,
  fire: true,
  police: true,
  accident: true,
  natural_disaster: true,
};

const DEFAULT_QUIET_HOURS: QuietHoursSettings = {
  enabled: false,
  startTime: '22:00',
  endTime: '07:00',
  allowCritical: true,
  digestEnabled: true,
  digestTime: '08:00',
};

export const useNotificationFilter = () => {
  const [alertPreferences, setAlertPreferences] = useState<AlertPreferences>(() => {
    const saved = localStorage.getItem('alertPreferences');
    return saved ? JSON.parse(saved) : DEFAULT_ALERT_PREFERENCES;
  });

  const [quietHours, setQuietHours] = useState<QuietHoursSettings>(() => {
    const saved = localStorage.getItem('quietHoursSettings');
    return saved ? JSON.parse(saved) : DEFAULT_QUIET_HOURS;
  });

  const [dndBypassContacts, setDndBypassContacts] = useState<DNDBypassContact[]>(() => {
    const saved = localStorage.getItem('dndBypassContacts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('alertPreferences', JSON.stringify(alertPreferences));
  }, [alertPreferences]);

  useEffect(() => {
    localStorage.setItem('quietHoursSettings', JSON.stringify(quietHours));
  }, [quietHours]);

  useEffect(() => {
    localStorage.setItem('dndBypassContacts', JSON.stringify(dndBypassContacts));
  }, [dndBypassContacts]);

  const updateAlertPreference = useCallback((type: keyof AlertPreferences, enabled: boolean) => {
    setAlertPreferences(prev => ({ ...prev, [type]: enabled }));
  }, []);

  const updateQuietHours = useCallback((settings: Partial<QuietHoursSettings>) => {
    setQuietHours(prev => ({ ...prev, ...settings }));
  }, []);

  const addDndBypassContact = useCallback((contactId: string, name: string) => {
    setDndBypassContacts(prev => {
      if (prev.some(c => c.contactId === contactId)) return prev;
      return [...prev, { contactId, name }];
    });
  }, []);

  const removeDndBypassContact = useCallback((contactId: string) => {
    setDndBypassContacts(prev => prev.filter(c => c.contactId !== contactId));
  }, []);

  const isContactDndBypassed = useCallback((contactId: string): boolean => {
    return dndBypassContacts.some(c => c.contactId === contactId);
  }, [dndBypassContacts]);

  const isWithinQuietHours = useCallback((): boolean => {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = quietHours.startTime.split(':').map(Number);
    const [endH, endM] = quietHours.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }, [quietHours.enabled, quietHours.startTime, quietHours.endTime]);

  const isCriticalAlert = useCallback((emergencyType: string): boolean => {
    const normalizedType = emergencyType.toLowerCase();
    return CRITICAL_ALERT_TYPES.some(type => normalizedType.includes(type));
  }, []);

  const shouldShowNotification = useCallback((emergencyType: string, contactId?: string): boolean => {
    const normalizedType = emergencyType.toLowerCase();
    
    let preferenceKey: keyof AlertPreferences | undefined;
    for (const [keyword, key] of Object.entries(EMERGENCY_TYPE_MAP)) {
      if (normalizedType.includes(keyword)) {
        preferenceKey = key;
        break;
      }
    }

    if (!preferenceKey) {
      return true;
    }

    if (!alertPreferences[preferenceKey]) {
      return false;
    }

    // Check quiet hours
    if (isWithinQuietHours()) {
      // Check if contact bypasses DND
      if (contactId && isContactDndBypassed(contactId)) {
        return true;
      }

      const isCritical = isCriticalAlert(emergencyType);
      
      if (isCritical && quietHours.allowCritical) {
        return true;
      }
      
      return false;
    }

    return true;
  }, [alertPreferences, isWithinQuietHours, isCriticalAlert, quietHours.allowCritical, isContactDndBypassed]);

  const getQuietHoursStatus = useCallback((): { active: boolean; message: string } => {
    const active = isWithinQuietHours();
    
    if (!quietHours.enabled) {
      return { active: false, message: 'Quiet hours disabled' };
    }

    if (active) {
      return {
        active: true,
        message: `Quiet hours active until ${quietHours.endTime}${quietHours.allowCritical ? ' (critical alerts allowed)' : ''}`,
      };
    }

    return {
      active: false,
      message: `Quiet hours scheduled ${quietHours.startTime} - ${quietHours.endTime}`,
    };
  }, [quietHours, isWithinQuietHours]);

  return {
    alertPreferences,
    quietHours,
    dndBypassContacts,
    updateAlertPreference,
    updateQuietHours,
    setAlertPreferences,
    setQuietHours,
    addDndBypassContact,
    removeDndBypassContact,
    isContactDndBypassed,
    shouldShowNotification,
    isWithinQuietHours,
    isCriticalAlert,
    getQuietHoursStatus,
  };
};
