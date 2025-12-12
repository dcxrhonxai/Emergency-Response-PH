import { useState, lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PageLoadingFallback } from "@/components/LazyLoadWrapper";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";

// Eagerly loaded routes (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy loaded routes (non-critical)
const Admin = lazy(() => import("./pages/Admin"));
const CommunityServices = lazy(() => import("./pages/CommunityServices"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const MedicalRecords = lazy(() => import("./pages/MedicalRecords"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));
  
  // Initialize performance monitoring
  const { mark } = usePerformanceMonitor();
  
  useEffect(() => {
    mark('app_mounted');
  }, [mark]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/community-services" element={<CommunityServices />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/medical-records" element={<MedicalRecords />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
