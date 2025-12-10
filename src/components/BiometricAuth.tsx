import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Fingerprint, Loader2 } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";

export const BiometricAuth = () => {
  const { 
    isSupported, 
    isEnrolled, 
    loading, 
    enrollBiometric, 
    removeBiometric 
  } = useBiometricAuth();

  const handleEnroll = async () => {
    await enrollBiometric();
  };

  const handleRemove = async () => {
    await removeBiometric();
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="p-4 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Biometric Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Not supported on this device
              </p>
            </div>
          </div>
          <Badge variant="secondary">Unavailable</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Fingerprint className={`w-8 h-8 ${isEnrolled ? 'text-green-500' : 'text-muted-foreground'}`} />
          <div>
            <h3 className="font-semibold">Biometric Authentication</h3>
            <p className="text-sm text-muted-foreground">
              {isEnrolled 
                ? 'Use fingerprint or Face ID to verify identity'
                : 'Enable quick access with biometrics'}
            </p>
          </div>
        </div>
        <Badge variant={isEnrolled ? "default" : "secondary"}>
          {isEnrolled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      <div className="mt-4">
        {isEnrolled ? (
          <Button
            variant="destructive"
            onClick={handleRemove}
            className="w-full"
          >
            Disable Biometrics
          </Button>
        ) : (
          <Button onClick={handleEnroll} className="w-full">
            <Fingerprint className="w-4 h-4 mr-2" />
            Enable Biometrics
          </Button>
        )}
      </div>
    </Card>
  );
};
