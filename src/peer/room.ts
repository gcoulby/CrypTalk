/**
 * Room creation, ID derivation, and URL helpers.
 */

import { generateKey, encodeKey, decodeKey, deriveRoomId } from '../crypto/keys';

export interface RoomInfo {
  keyBytes: Uint8Array;
  encodedKey: string;
  roomId: string;
}

/** Create a new room: generate key, derive room ID. */
export async function createRoom(): Promise<RoomInfo> {
  const keyBytes = generateKey();
  const encodedKey = encodeKey(keyBytes);
  const roomId = await deriveRoomId(keyBytes);
  return { keyBytes, encodedKey, roomId };
}

/** Join an existing room from an encoded key string. */
export async function joinRoom(encodedKey: string): Promise<RoomInfo> {
  const keyBytes = decodeKey(encodedKey);
  const roomId = await deriveRoomId(keyBytes);
  return { keyBytes, encodedKey, roomId };
}

/** Build the shareable URL with the key in the fragment. */
export function buildShareUrl(encodedKey: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#key=${encodedKey}`;
}

/** Extract the encoded key from the current URL fragment. Returns null if not present. */
export function extractKeyFromUrl(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;

  // Remove the leading '#'
  const params = new URLSearchParams(hash.slice(1));
  return params.get('key');
}
