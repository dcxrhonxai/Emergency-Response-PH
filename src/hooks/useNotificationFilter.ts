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
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  allowCritical: boolean; // Allow critical alerts during quiet hours
}

// Map emergency types to preference keys
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

// Critical alert types that should bypass quiet hours
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

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('alertPreferences', JSON.stringify(alertPreferences));
  }, [alertPreferences]);

  useEffect(() => {
    localStorage.setItem('quietHoursSettings', JSON.stringify(quietHours));
  }, [quietHours]);

  const updateAlertPreference = useCallback((type: keyof AlertPreferences, enabled: boolean) => {
    setAlertPreferences(prev => ({ ...prev, [type]: enabled }));
  }, []);

  const updateQuietHours = useCallback((settings: Partial<QuietHoursSettings>) => {
    setQuietHours(prev => ({ ...prev, ...settings }));
  }, []);

  const isWithinQuietHours = useCallback((): boolean => {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = quietHours.startTime.split(':').map(Number);
    const [endH, endM] = quietHours.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    // Same day quiet hours (e.g., 13:00 - 15:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }, [quietHours.enabled, quietHours.startTime, quietHours.endTime]);

  const isCriticalAlert = useCallback((emergencyType: string): boolean => {
    const normalizedType = emergencyType.toLowerCase();
    return CRITICAL_ALERT_TYPES.some(type => normalizedType.includes(type));
  }, []);

  const shouldShowNotification = useCallback((emergencyType: string): boolean => {
    const normalizedType = emergencyType.toLowerCase();
    
    // Find matching preference key
    let preferenceKey: keyof AlertPreferences | undefined;
    for (const [keyword, key] of Object.entries(EMERGENCY_TYPE_MAP)) {
      if (normalizedType.includes(keyword)) {
        preferenceKey = key;
        break;
      }
    }

    // If no matching type found, default to showing
    if (!preferenceKey) {
      console.log(`Unknown emergency type: ${emergencyType}, defaulting to show`);
      return true;
    }

    // Check if this alert type is enabled
    if (!alertPreferences[preferenceKey]) {
      console.log(`Alert type ${preferenceKey} is disabled by user preference`);
      return false;
    }

    // Check quiet hours
    if (isWithinQuietHours()) {
      const isCritical = isCriticalAlert(emergencyType);
      
      if (isCritical && quietHours.allowCritical) {
        console.log(`Critical alert ${emergencyType} allowed during quiet hours`);
        return true;
      }
      
      console.log(`Alert ${emergencyType} blocked during quiet hours`);
      return false;
    }

    return true;
  }, [alertPreferences, isWithinQuietHours, isCriticalAlert, quietHours.allowCritical]);

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
    updateAlertPreference,
    updateQuietHours,
    setAlertPreferences,
    setQuietHours,
    shouldShowNotification,
    isWithinQuietHours,
    isCriticalAlert,
    getQuietHoursStatus,
  };
};
