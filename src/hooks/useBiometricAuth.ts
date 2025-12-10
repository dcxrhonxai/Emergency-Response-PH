import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BiometricCredential {
  credentialId: string;
  publicKey: string;
  userId: string;
  createdAt: string;
}

const STORAGE_KEY = 'biometric_credentials';

export const useBiometricAuth = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    try {
      // Check if WebAuthn is available
      const supported = 
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function';
      
      setIsSupported(supported);
      
      if (supported) {
        // Check if user has enrolled credentials
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const credentials: BiometricCredential[] = JSON.parse(stored);
          const { data: { user } } = await supabase.auth.getUser();
          if (user && credentials.some(c => c.userId === user.id)) {
            setIsEnrolled(true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
    }
    setLoading(false);
  };

  const enrollBiometric = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Biometric authentication not supported on this device');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return false;
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Emergency Response PH',
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from(user.id, c => c.charCodeAt(0)),
          name: user.email || 'User',
          displayName: user.email || 'User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Store credential info
      const credentialData: BiometricCredential = {
        credentialId: arrayBufferToBase64(credential.rawId),
        publicKey: arrayBufferToBase64((credential.response as AuthenticatorAttestationResponse).getPublicKey() || new ArrayBuffer(0)),
        userId: user.id,
        createdAt: new Date().toISOString(),
      };

      // Get existing credentials and add new one
      const stored = localStorage.getItem(STORAGE_KEY);
      const credentials: BiometricCredential[] = stored ? JSON.parse(stored) : [];
      
      // Remove any existing credential for this user
      const filtered = credentials.filter(c => c.userId !== user.id);
      filtered.push(credentialData);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setIsEnrolled(true);
      
      toast.success('Biometric authentication enabled!');
      return true;
    } catch (error: any) {
      console.error('Biometric enrollment error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled');
      } else if (error.name === 'NotSupportedError') {
        toast.error('This device does not support biometric authentication');
      } else {
        toast.error('Failed to enable biometric authentication');
      }
      return false;
    }
  }, [isSupported]);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isEnrolled) {
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get stored credentials
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const credentials: BiometricCredential[] = JSON.parse(stored);
      const userCredential = credentials.find(c => c.userId === user.id);
      
      if (!userCredential) return false;

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Get credential options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: base64ToArrayBuffer(userCredential.credentialId),
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      };

      // Get credential
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (!assertion) {
        throw new Error('Authentication failed');
      }

      toast.success('Biometric authentication successful!');
      return true;
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled');
      } else {
        toast.error('Biometric authentication failed');
      }
      return false;
    }
  }, [isSupported, isEnrolled]);

  const removeBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return true;

      const credentials: BiometricCredential[] = JSON.parse(stored);
      const filtered = credentials.filter(c => c.userId !== user.id);
      
      if (filtered.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
      
      setIsEnrolled(false);
      toast.success('Biometric authentication disabled');
      return true;
    } catch (error) {
      console.error('Error removing biometric:', error);
      toast.error('Failed to disable biometric authentication');
      return false;
    }
  }, []);

  return {
    isSupported,
    isEnrolled,
    loading,
    enrollBiometric,
    authenticateWithBiometric,
    removeBiometric,
  };
};

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
