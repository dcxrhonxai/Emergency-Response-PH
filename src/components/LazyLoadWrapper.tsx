import { Suspense, ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoadWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Default loading fallback
const DefaultFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Full page loading fallback
export const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Wrapper component for lazy loaded content
export const LazyLoadWrapper = ({ 
  children, 
  fallback = <DefaultFallback /> 
}: LazyLoadWrapperProps) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Higher-order component to wrap lazy components
export function withLazyLoading<P extends object>(
  LazyComponent: ComponentType<P>,
  fallback?: ReactNode
) {
  return function LazyWrappedComponent(props: P) {
    return (
      <Suspense fallback={fallback || <DefaultFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
