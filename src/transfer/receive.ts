/**
 * Chunk reassembly and download pipeline.
 * Accumulates encrypted chunks, decrypts each, reassembles the file, and triggers a download.
 */

import { decrypt, base64ToBytes } from '../crypto/encrypt';
import type { FileMetaPayload, FileChunkPayload } from '../peer/connection';

export interface FileTransferState {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  mimeType: string;
  receivedChunks: number;
  progress: number; // 0–1
  complete: boolean;
  downloadUrl?: string;
}

export type TransferUpdateCallback = (state: FileTransferState) => void;

interface PendingFile {
  meta: FileMetaPayload;
  chunks: Map<number, Uint8Array>; // chunkIndex → encrypted bytes
  onUpdate: TransferUpdateCallback;
}

/** Manages incoming file transfers, decrypts and reassembles them. */
export class FileReceiver {
  private pending = new Map<string, PendingFile>();
  private cryptoKey: CryptoKey;

  constructor(cryptoKey: CryptoKey) {
    this.cryptoKey = cryptoKey;
  }

  /** Call when a file-meta envelope arrives. */
  onFileMeta(meta: FileMetaPayload, onUpdate: TransferUpdateCallback): void {
    this.pending.set(meta.fileId, {
      meta,
      chunks: new Map(),
      onUpdate,
    });

    onUpdate({
      fileId: meta.fileId,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      totalChunks: meta.totalChunks,
      mimeType: meta.mimeType,
      receivedChunks: 0,
      progress: 0,
      complete: false,
    });
  }

  /** Call when a file-chunk envelope arrives. */
  async onFileChunk(chunk: FileChunkPayload & { data: string }): Promise<void> {
    const pending = this.pending.get(chunk.fileId);
    if (!pending) return;

    const encryptedBytes = base64ToBytes(chunk.data);
    const decryptedBytes = await decrypt(this.cryptoKey, encryptedBytes);
    pending.chunks.set(chunk.chunkIndex, decryptedBytes);

    const receivedChunks = pending.chunks.size;
    pending.onUpdate({
      fileId: chunk.fileId,
      fileName: pending.meta.fileName,
      fileSize: pending.meta.fileSize,
      totalChunks: pending.meta.totalChunks,
      mimeType: pending.meta.mimeType,
      receivedChunks,
      progress: receivedChunks / pending.meta.totalChunks,
      complete: false,
    });
  }

  /** Call when a file-complete signal arrives. Reassembles and triggers download. */
  async onFileComplete(fileId: string): Promise<void> {
    const pending = this.pending.get(fileId);
    if (!pending) return;

    const { meta, chunks } = pending;

    // Reassemble in order
    const parts: Uint8Array[] = [];
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunk = chunks.get(i);
      if (!chunk) {
        console.error(`Missing chunk ${i} for file ${fileId}`);
        return;
      }
      parts.push(chunk);
    }

    const blob = new Blob(parts, { type: meta.mimeType });
    const downloadUrl = URL.createObjectURL(blob);

    pending.onUpdate({
      fileId,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      totalChunks: meta.totalChunks,
      mimeType: meta.mimeType,
      receivedChunks: meta.totalChunks,
      progress: 1,
      complete: true,
      downloadUrl,
    });

    this.pending.delete(fileId);
  }

  /** Update the crypto key (e.g. after key refresh). */
  updateKey(key: CryptoKey): void {
    this.cryptoKey = key;
  }
}
