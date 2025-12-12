import { useCallback } from 'react';
import { 
  encryptData, 
  decryptData, 
  encryptSensitiveFields, 
  decryptSensitiveFields 
} from '@/lib/encryption';

// Hook for managing encrypted data operations
export const useEncryptedStorage = () => {
  // Encrypt a single value
  const encrypt = useCallback(async (data: string): Promise<string> => {
    return await encryptData(data);
  }, []);

  // Decrypt a single value
  const decrypt = useCallback(async (encryptedData: string): Promise<string> => {
    return await decryptData(encryptedData);
  }, []);

  // Encrypt specific fields in an object before saving
  const encryptFields = useCallback(async <T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[]
  ): Promise<T> => {
    return await encryptSensitiveFields(data, fields);
  }, []);

  // Decrypt specific fields in an object after loading
  const decryptFields = useCallback(async <T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[]
  ): Promise<T> => {
    return await decryptSensitiveFields(data, fields);
  }, []);

  // Encrypt medical data specifically
  const encryptMedicalData = useCallback(async <T extends Record<string, unknown>>(
    data: T
  ): Promise<T> => {
    const medicalFields = [
      'allergies',
      'medical_conditions',
      'emergency_notes',
      'blood_type'
    ] as (keyof T)[];
    
    return await encryptSensitiveFields(data, medicalFields);
  }, []);

  // Decrypt medical data specifically
  const decryptMedicalData = useCallback(async <T extends Record<string, unknown>>(
    data: T
  ): Promise<T> => {
    const medicalFields = [
      'allergies',
      'medical_conditions',
      'emergency_notes',
      'blood_type'
    ] as (keyof T)[];
    
    return await decryptSensitiveFields(data, medicalFields);
  }, []);

  return {
    encrypt,
    decrypt,
    encryptFields,
    decryptFields,
    encryptMedicalData,
    decryptMedicalData
  };
};
