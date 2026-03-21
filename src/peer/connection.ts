/**
 * Data channel management and message routing.
 * All data sent/received is encrypted; this module handles the envelope format.
 */

import type { DataConnection } from 'peerjs';

export type MessageType = 'message' | 'file-chunk' | 'file-meta' | 'file-complete';

export interface Envelope {
  type: MessageType;
  payload: string; // base64-encoded encrypted bytes
}

export interface FileMetaPayload {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  mimeType: string;
}

export interface FileChunkPayload {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
}

export type MessageHandler = (payload: string) => void;
export type FileMetaHandler = (payload: FileMetaPayload) => void;
export type FileChunkHandler = (payload: FileChunkPayload & { data: string }) => void;
export type FileCompleteHandler = (fileId: string) => void;

export interface ConnectionHandlers {
  onMessage?: MessageHandler;
  onFileMeta?: FileMetaHandler;
  onFileChunk?: FileChunkHandler;
  onFileComplete?: FileCompleteHandler;
  onClose?: () => void;
  onError?: (err: Error) => void;
}

/** Send an envelope over a data connection. */
export function sendEnvelope(conn: DataConnection, envelope: Envelope): void {
  conn.send(JSON.stringify(envelope));
}

/** Attach event handlers to a DataConnection and route incoming envelopes. */
export function attachConnectionHandlers(
  conn: DataConnection,
  handlers: ConnectionHandlers,
): () => void {
  const onData = (raw: unknown) => {
    try {
      const envelope = JSON.parse(raw as string) as Envelope;
      switch (envelope.type) {
        case 'message':
          handlers.onMessage?.(envelope.payload);
          break;
        case 'file-meta': {
          const meta = JSON.parse(atob(envelope.payload)) as FileMetaPayload;
          handlers.onFileMeta?.(meta);
          break;
        }
        case 'file-chunk': {
          const chunk = JSON.parse(atob(envelope.payload)) as FileChunkPayload & { data: string };
          handlers.onFileChunk?.(chunk);
          break;
        }
        case 'file-complete': {
          const fileId = atob(envelope.payload);
          handlers.onFileComplete?.(fileId);
          break;
        }
      }
    } catch {
      // Ignore malformed packets
    }
  };

  const onClose = () => handlers.onClose?.();
  const onError = (err: Error) => handlers.onError?.(err);

  conn.on('data', onData);
  conn.on('close', onClose);
  conn.on('error', onError);

  // Return cleanup function
  return () => {
    conn.off('data', onData);
    conn.off('close', onClose);
    conn.off('error', onError);
  };
}
