import { useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

interface NavigationMetrics {
  loadTime: number;
  domContentLoaded: number;
  resourcesLoaded: number;
}

export const usePerformanceMonitor = () => {
  const metricsRef = useRef<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  });

  // Measure Core Web Vitals
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metricsRef.current.fcp = fcpEntry.startTime;
          console.log(`[Performance] FCP: ${fcpEntry.startTime.toFixed(2)}ms`);
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.log('FCP observer not supported');
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          metricsRef.current.lcp = lastEntry.startTime;
          console.log(`[Performance] LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.log('LCP observer not supported');
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEventTiming;
        if (firstEntry && firstEntry.processingStart) {
          const fid = firstEntry.processingStart - firstEntry.startTime;
          metricsRef.current.fid = fid;
          console.log(`[Performance] FID: ${fid.toFixed(2)}ms`);
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.log('FID observer not supported');
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
            clsValue += layoutShiftEntry.value;
            metricsRef.current.cls = clsValue;
          }
        }
        console.log(`[Performance] CLS: ${clsValue.toFixed(4)}`);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.log('CLS observer not supported');
    }

    // Time to First Byte
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        metricsRef.current.ttfb = navEntry.responseStart - navEntry.requestStart;
        console.log(`[Performance] TTFB: ${metricsRef.current.ttfb.toFixed(2)}ms`);
      }
    } catch (e) {
      console.log('Navigation timing not supported');
    }
  }, []);

  // Get navigation timing metrics
  const getNavigationMetrics = useCallback((): NavigationMetrics | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        return {
          loadTime: navEntry.loadEventEnd - navEntry.startTime,
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
          resourcesLoaded: navEntry.loadEventEnd - navEntry.domContentLoadedEventEnd
        };
      }
    } catch (e) {
      console.log('Navigation metrics not available');
    }
    return null;
  }, []);

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Measure custom operation timing
  const measureOperation = useCallback(<T>(
    name: string,
    operation: () => T
  ): T => {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }, []);

  // Measure async operation timing
  const measureAsyncOperation = useCallback(async <T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }, []);

  // Mark performance timeline
  const mark = useCallback((name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }, []);

  // Measure between marks
  const measureBetween = useCallback((startMark: string, endMark: string, name: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name);
        if (entries.length > 0) {
          console.log(`[Performance] ${name}: ${entries[0].duration.toFixed(2)}ms`);
        }
      } catch (e) {
        console.log(`Could not measure between ${startMark} and ${endMark}`);
      }
    }
  }, []);

  return {
    getMetrics,
    getNavigationMetrics,
    measureOperation,
    measureAsyncOperation,
    mark,
    measureBetween
  };
};
