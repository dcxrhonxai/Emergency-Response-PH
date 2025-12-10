// Firebase Analytics and Error Tracking

let analyticsInitialized = false;

export const initializeFirebase = (): boolean => {
  // Firebase will be initialized lazily when needed
  analyticsInitialized = true;
  console.log('Firebase tracking ready');
  return true;
};

export const logEvent = (eventName: string, eventParams?: Record<string, any>) => {
  // Log to console for now, Firebase Analytics can be added when config is ready
  if (analyticsInitialized && import.meta.env.DEV) {
    console.log('[Analytics]', eventName, eventParams);
  }
  
  // Send to backend for tracking if needed
  try {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, eventParams);
    }
  } catch (error) {
    console.error('Failed to log event:', error);
  }
};

export const setAnalyticsUserId = (userId: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('set', { user_id: userId });
  }
};

export const setAnalyticsUserProperties = (properties: Record<string, string>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('set', 'user_properties', properties);
  }
};

// Predefined event types for emergency app
export const AnalyticsEvents = {
  EMERGENCY_ALERT_CREATED: 'emergency_alert_created',
  EMERGENCY_ALERT_RESOLVED: 'emergency_alert_resolved',
  SOS_ACTIVATED: 'sos_activated',
  SILENT_PANIC_ACTIVATED: 'silent_panic_activated',
  CONTACT_CALLED: 'contact_called',
  DIRECTIONS_OPENED: 'directions_opened',
  MEDICAL_ID_VIEWED: 'medical_id_viewed',
  PROFILE_UPDATED: 'profile_updated',
  SERVICE_SEARCHED: 'service_searched',
  TWO_FA_ENABLED: 'two_fa_enabled',
  TWO_FA_DISABLED: 'two_fa_disabled',
  BIOMETRIC_ENROLLED: 'biometric_enrolled',
  APP_ERROR: 'app_error',
  PAGE_VIEW: 'page_view',
} as const;

// Error tracking for Crashlytics-like functionality
export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('App Error:', error, context);
  logEvent(AnalyticsEvents.APP_ERROR, {
    error_message: error.message,
    error_stack: error.stack?.substring(0, 500),
    ...context,
  });
};

// Global error handler
export const setupErrorTracking = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    logError(error || new Error(String(message)), {
      source,
      lineno,
      colno,
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    logError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { type: 'unhandledrejection' }
    );
  };
};
