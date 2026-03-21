/**
 * Key generation, import/export helpers.
 * Keys are 128-bit AES-GCM and never leave memory (no localStorage, no logging).
 */

/** Generate a random 128-bit key as raw bytes. */
export function generateKey(): Uint8Array {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** URL-safe base64 encode (no padding issues in URL fragments). */
export function encodeKey(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** URL-safe base64 decode → Uint8Array. */
export function decodeKey(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const paddedFull = padded + '=='.slice(0, (4 - (padded.length % 4)) % 4);
  const binary = atob(paddedFull);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Import raw key bytes as a CryptoKey for AES-GCM. */
export async function importKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Derive a room ID from key bytes via SHA-256.
 * Returns first 32 hex chars (128 bits of the hash).
 * The signalling server only ever sees this — never the key itself.
 */
export async function deriveRoomId(keyBytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 32);
}
