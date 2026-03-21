/**
 * File chunking and send pipeline.
 * Files are chunked into 16KB pieces, each encrypted individually.
 */

import type { DataConnection } from 'peerjs';
import { encrypt, bytesToBase64 } from '../crypto/encrypt';
import { sendEnvelope } from '../peer/connection';

const CHUNK_SIZE = 16 * 1024; // 16KB
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export type ProgressCallback = (fileId: string, progress: number) => void;

/**
 * Send a file over a WebRTC data connection.
 * Chunks the file, encrypts each chunk, and sends with metadata.
 */
export async function sendFile(
  conn: DataConnection,
  key: CryptoKey,
  file: File,
  onProgress?: ProgressCallback,
): Promise<void> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
  }

  const fileId = crypto.randomUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // Send file metadata first (unencrypted envelope, but content is base64 JSON)
  sendEnvelope(conn, {
    type: 'file-meta',
    payload: btoa(
      JSON.stringify({
        fileId,
        fileName: file.name,
        fileSize: file.size,
        totalChunks,
        mimeType: file.type || 'application/octet-stream',
      }),
    ),
  });

  // Read and send chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const slice = file.slice(start, end);

    const arrayBuffer = await slice.arrayBuffer();
    const plaintext = new Uint8Array(arrayBuffer);
    const encrypted = await encrypt(key, plaintext);
    const encryptedB64 = bytesToBase64(encrypted);

    sendEnvelope(conn, {
      type: 'file-chunk',
      payload: btoa(
        JSON.stringify({
          fileId,
          chunkIndex: i,
          totalChunks,
          data: encryptedB64,
        }),
      ),
    });

    onProgress?.(fileId, (i + 1) / totalChunks);

    // Yield to avoid blocking the event loop on large files
    if (i % 10 === 9) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Signal completion
  sendEnvelope(conn, {
    type: 'file-complete',
    payload: btoa(fileId),
  });
}
