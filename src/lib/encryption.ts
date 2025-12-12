// Client-side encryption utilities for sensitive data
// Uses Web Crypto API for AES-GCM encryption

const ENCRYPTION_KEY_NAME = 'emergency_app_encryption_key';

// Generate or retrieve encryption key from localStorage
const getEncryptionKey = async (): Promise<CryptoKey> => {
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (storedKey) {
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  // Generate new key if not exists
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));
  
  return key;
};

// Encrypt sensitive data
export const encryptData = async (data: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    return data; // Fallback to unencrypted if encryption fails
  }
};

// Decrypt sensitive data
export const decryptData = async (encryptedString: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedString).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedString; // Return as-is if decryption fails (might be unencrypted)
  }
};

// Check if a string is encrypted (base64 with specific length pattern)
export const isEncrypted = (data: string): boolean => {
  try {
    // Check if it's valid base64 and has the IV prefix pattern
    const decoded = atob(data);
    return decoded.length > 12; // IV is 12 bytes
  } catch {
    return false;
  }
};

// Encrypt sensitive fields in an object
export const encryptSensitiveFields = async <T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[]
): Promise<T> => {
  const encrypted = { ...data };
  
  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptData(encrypted[field] as string) as T[keyof T];
    }
  }
  
  return encrypted;
};

// Decrypt sensitive fields in an object
export const decryptSensitiveFields = async <T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[]
): Promise<T> => {
  const decrypted = { ...data };
  
  for (const field of sensitiveFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = await decryptData(decrypted[field] as string) as T[keyof T];
    }
  }
  
  return decrypted;
};

// Hash sensitive data for comparison (one-way)
export const hashData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Clear encryption key (for logout)
export const clearEncryptionKey = (): void => {
  localStorage.removeItem(ENCRYPTION_KEY_NAME);
};
