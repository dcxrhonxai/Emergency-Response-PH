import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Shield, ShieldCheck, ShieldOff, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";

export const TwoFactorAuth = () => {
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    qrCode: string;
    secret: string;
    factorId: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const verifiedFactors = data?.totp?.filter(f => f.status === 'verified') || [];
      setIsEnrolled(verifiedFactors.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
    setLoading(false);
  };

  const startEnrollment = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Emergency Response PH',
      });

      if (error) throw error;

      if (data) {
        setEnrollmentData({
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
          factorId: data.id,
        });
        setShowEnrollDialog(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start 2FA enrollment');
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollmentData || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      toast.success('Two-factor authentication enabled successfully!');
      setIsEnrolled(true);
      setShowEnrollDialog(false);
      setEnrollmentData(null);
      setVerificationCode("");
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    }
    setVerifying(false);
  };

  const disableMFA = async () => {
    if (disableCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors?.totp?.find(f => f.status === 'verified');

      if (!verifiedFactor) {
        throw new Error('No verified factor found');
      }

      // Challenge and verify before unenrolling
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code: disableCode,
      });

      if (verifyError) throw verifyError;

      // Unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (unenrollError) throw unenrollError;

      toast.success('Two-factor authentication disabled');
      setIsEnrolled(false);
      setShowDisableDialog(false);
      setDisableCode("");
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
    }
    setVerifying(false);
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      toast.success('Secret copied to clipboard');
    }
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

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEnrolled ? (
              <ShieldCheck className="w-8 h-8 text-green-500" />
            ) : (
              <ShieldOff className="w-8 h-8 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-semibold">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground">
                {isEnrolled
                  ? 'Your account is protected with 2FA'
                  : 'Add an extra layer of security'}
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
              onClick={() => setShowDisableDialog(true)}
              className="w-full"
            >
              Disable 2FA
            </Button>
          ) : (
            <Button onClick={startEnrollment} className="w-full">
              <Shield className="w-4 h-4 mr-2" />
              Enable 2FA
            </Button>
          )}
        </div>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>

          {enrollmentData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={enrollmentData.qrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48 border rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Can't scan? Enter this code manually:
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={enrollmentData.secret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Enter the 6-digit code from your app</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
              Cancel
            </Button>
            <Button onClick={verifyEnrollment} disabled={verifying || verificationCode.length !== 6}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current 2FA code to disable two-factor authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Enter the 6-digit code from your app</Label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={disableMFA}
              disabled={verifying || disableCode.length !== 6}
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
