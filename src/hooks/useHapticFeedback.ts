import { useState, useEffect, useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const STORAGE_KEY = 'haptic-feedback-enabled';

export function useHapticFeedback() {
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === 'true' : true; // enabled by default
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isEnabled));
  }, [isEnabled]);

  const toggleHaptic = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const triggerImpact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isEnabled) return;
    try {
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
    } catch {
      // Not available (web)
    }
  }, [isEnabled]);

  const triggerNotification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isEnabled) return;
    try {
      const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
      await Haptics.notification({ type: map[type] });
    } catch {
      // Not available (web)
    }
  }, [isEnabled]);

  return { isEnabled, toggleHaptic, triggerImpact, triggerNotification };
}

/** Standalone check (for components that don't use the hook) */
export function isHapticEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}
