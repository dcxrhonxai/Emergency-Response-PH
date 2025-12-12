import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Shield,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  useServiceVerification, 
  ServiceWithVerification, 
  VerificationCriteria 
} from '@/hooks/useServiceVerification';
import { toast } from 'sonner';

export const ServiceVerificationPanel = () => {
  const [services, setServices] = useState<ServiceWithVerification[]>([]);
  const [verificationResults, setVerificationResults] = useState<Record<string, VerificationCriteria>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const { 
    verifying, 
    verifyService, 
    approveWithVerification, 
    rejectWithReason 
  } = useServiceVerification();

  useEffect(() => {
    loadPendingServices();
  }, []);

  const loadPendingServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pending_emergency_services')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load pending services');
    } else {
      setServices(data || []);
      // Auto-verify all loaded services
      for (const service of data || []) {
        const result = await verifyService(service);
        setVerificationResults(prev => ({ ...prev, [service.id]: result }));
      }
    }
    setLoading(false);
  };

  const handleVerify = async (service: ServiceWithVerification) => {
    const result = await verifyService(service);
    setVerificationResults(prev => ({ ...prev, [service.id]: result }));
  };

  const handleApprove = async (service: ServiceWithVerification) => {
    setProcessing(service.id);
    const verification = verificationResults[service.id];
    if (!verification) {
      toast.error('Please verify service first');
      setProcessing(null);
      return;
    }

    const success = await approveWithVerification(service, verification);
    if (success) {
      setServices(prev => prev.filter(s => s.id !== service.id));
    }
    setProcessing(null);
  };

  const handleReject = async (serviceId: string) => {
    setProcessing(serviceId);
    const reason = rejectionReasons[serviceId] || 'Does not meet verification criteria';
    const success = await rejectWithReason(serviceId, reason);
    if (success) {
      setServices(prev => prev.filter(s => s.id !== serviceId));
    }
    setProcessing(null);
  };

  const getServiceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      fire: 'Fire Station',
      medical: 'Medical / Hospital',
      police: 'Police Station',
      rescue: 'Rescue Services',
      disaster: 'Disaster Response',
    };
    return types[type] || type;
  };

  const getVerificationStatus = (verification: VerificationCriteria | undefined) => {
    if (!verification) return null;
    const passedCount = [
      verification.phoneVerified,
      verification.addressVerified,
      verification.coordinatesValid,
      verification.duplicateCheck
    ].filter(Boolean).length;
    
    return { passedCount, total: 4 };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Loading services for verification...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Service Verification
        </CardTitle>
        <CardDescription>
          Verify and validate emergency services before adding to directory
        </CardDescription>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending services to verify</p>
        ) : (
          <div className="space-y-6">
            {services.map((service) => {
              const verification = verificationResults[service.id];
              const status = getVerificationStatus(verification);
              
              return (
                <div
                  key={service.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <Badge variant="outline" className="mt-1">
                        {getServiceTypeLabel(service.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {status && (
                        <Badge 
                          variant={status.passedCount === status.total ? 'default' : 'secondary'}
                          className={status.passedCount === status.total ? 'bg-green-600' : ''}
                        >
                          {status.passedCount}/{status.total} Verified
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{service.phone}</span>
                      {verification && (
                        verification.phoneVerified ? 
                          <CheckCircle className="w-4 h-4 text-green-600" /> :
                          <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    {service.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p>{service.address}</p>
                          {service.city && <p className="text-muted-foreground">{service.city}</p>}
                        </div>
                        {verification && (
                          verification.addressVerified ? 
                            <CheckCircle className="w-4 h-4 text-green-600" /> :
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {service.latitude.toFixed(6)}, {service.longitude.toFixed(6)}
                      {verification && (
                        verification.coordinatesValid ? 
                          <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" /> :
                          <XCircle className="w-4 h-4 text-destructive inline ml-2" />
                      )}
                    </p>
                    {verification && !verification.duplicateCheck && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Possible duplicate detected</span>
                      </div>
                    )}
                  </div>

                  {verification && (
                    <div className={`p-3 rounded-md text-sm ${
                      status?.passedCount === status?.total 
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' 
                        : 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {verification.notes}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Textarea
                      placeholder="Rejection reason (if rejecting)..."
                      value={rejectionReasons[service.id] || ''}
                      onChange={(e) => setRejectionReasons(prev => ({ 
                        ...prev, 
                        [service.id]: e.target.value 
                      }))}
                      className="h-20"
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(service)}
                        disabled={verifying === service.id}
                      >
                        {verifying === service.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Shield className="w-4 h-4 mr-1" />
                        )}
                        Re-verify
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(service)}
                        disabled={processing === service.id || !verification}
                      >
                        {processing === service.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(service.id)}
                        disabled={processing === service.id}
                      >
                        {processing === service.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
