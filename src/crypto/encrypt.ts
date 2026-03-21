/**
 * AES-GCM encrypt/decrypt wrappers using the Web Crypto API.
 * Each message/chunk uses a unique 96-bit IV prepended to the ciphertext.
 */

const IV_LENGTH = 12; // 96-bit IV for AES-GCM

/**
 * Encrypt plaintext bytes.
 * Returns: [12-byte IV | ciphertext]
 */
export async function encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<Uint8Array> {
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );

  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);
  return result;
}

/**
 * Decrypt data in the format [12-byte IV | ciphertext].
 * Returns the original plaintext bytes.
 */
export async function decrypt(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new Uint8Array(plaintext);
}

/** Encode Uint8Array to base64 string for transmission. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Decode base64 string back to Uint8Array. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
