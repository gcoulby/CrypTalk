/**
 * Main room state hook.
 * Orchestrates peer connections, encryption, messaging, and file transfers.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DataConnection } from 'peerjs';
import { createRoom, joinRoom } from '../peer/room';
import { importKey } from '../crypto/keys';
import { encrypt, decrypt, bytesToBase64, base64ToBytes } from '../crypto/encrypt';
import { attachConnectionHandlers, sendEnvelope } from '../peer/connection';
import { sendFile as sendFileTransfer } from '../transfer/send';
import { FileReceiver } from '../transfer/receive';
import type { FileTransferState } from '../transfer/receive';
import { usePeer } from './usePeer';

export type Phase = 'idle' | 'creating' | 'joining' | 'waiting' | 'connected' | 'error';

export interface ChatMessage {
  id: string;
  sender: 'self' | 'peer';
  content: string;
  timestamp: Date;
  type: 'text' | 'file-notification';
  fileName?: string;
}

export interface UseRoomResult {
  phase: Phase;
  cryptoKey: CryptoKey | null;
  roomId: string | null;
  peerId: string | null;
  encodedKey: string | null;
  messages: ChatMessage[];
  fileTransfers: Map<string, FileTransferState>;
  error: string | null;
  create: () => Promise<void>;
  join: (encodedKey: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  sendFile: (file: File) => Promise<void>;
}

const CHUNK_SIZE = 16 * 1024;

export function useRoom(): UseRoomResult {
  const [phase, setPhase] = useState<Phase>('idle');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [encodedKey, setEncodedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fileTransfers, setFileTransfers] = useState<Map<string, FileTransferState>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [activeConn, setActiveConn] = useState<DataConnection | null>(null);
  const [isJoiner, setIsJoiner] = useState(false);

  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  const fileReceiverRef = useRef<FileReceiver | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const activeConnRef = useRef<DataConnection | null>(null);

  const setupConnection = useCallback((conn: DataConnection) => {
    // Clean up previous connection handlers
    cleanupRef.current?.();

    const cleanup = attachConnectionHandlers(conn, {
      onMessage: async (payload) => {
        if (!cryptoKeyRef.current) return;
        try {
          const encrypted = base64ToBytes(payload);
          const decrypted = await decrypt(cryptoKeyRef.current, encrypted);
          const text = new TextDecoder().decode(decrypted);
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'peer',
            content: text,
            timestamp: new Date(),
            type: 'text',
          }]);
        } catch {
          // Ignore decryption failures
        }
      },

      onFileMeta: (meta) => {
        if (!fileReceiverRef.current) return;
        fileReceiverRef.current.onFileMeta(meta, (state) => {
          setFileTransfers(prev => new Map(prev).set(state.fileId, state));
          if (state.complete && state.downloadUrl) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              sender: 'peer',
              content: `File received: ${state.fileName}`,
              timestamp: new Date(),
              type: 'file-notification',
              fileName: state.fileName,
            }]);
          }
        });
      },

      onFileChunk: async (chunk) => {
        await fileReceiverRef.current?.onFileChunk(chunk);
      },

      onFileComplete: async (fileId) => {
        await fileReceiverRef.current?.onFileComplete(fileId);
      },

      onClose: () => {
        setPhase('error');
        setError('Connection closed by peer.');
      },

      onError: (err) => {
        setPhase('error');
        setError(`Connection error: ${err.message}`);
      },
    });

    cleanupRef.current = cleanup;
    activeConnRef.current = conn;
    setActiveConn(conn);

    // If the connection is already open, go to connected immediately
    if ((conn as unknown as { open: boolean }).open) {
      setPhase('connected');
    } else {
      conn.on('open', () => setPhase('connected'));
    }
  }, []);

  // Handle incoming connections (creator receives joiner)
  const handleIncomingConnection = useCallback((conn: DataConnection) => {
    setupConnection(conn);
  }, [setupConnection]);

  const { peer, peerId, status } = usePeer(roomId, handleIncomingConnection);

  // Joiner: once peer is open and we know the roomId, connect outbound
  useEffect(() => {
    if (isJoiner && status === 'open' && peer && roomId && !activeConnRef.current) {
      const conn = peer.connect(roomId, { reliable: true });
      setupConnection(conn);
    }
  }, [isJoiner, status, peer, roomId, setupConnection]);

  const create = useCallback(async () => {
    try {
      setPhase('creating');
      const roomInfo = await createRoom();
      const importedKey = await importKey(roomInfo.keyBytes);
      cryptoKeyRef.current = importedKey;
      fileReceiverRef.current = new FileReceiver(importedKey);

      setCryptoKey(importedKey);
      setRoomId(roomInfo.roomId);
      setEncodedKey(roomInfo.encodedKey);
      setIsJoiner(false);
      setPhase('waiting');
    } catch (err) {
      setPhase('error');
      setError(`Failed to create room: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const join = useCallback(async (key: string) => {
    try {
      setPhase('joining');
      const roomInfo = await joinRoom(key);
      const importedKey = await importKey(roomInfo.keyBytes);
      cryptoKeyRef.current = importedKey;
      fileReceiverRef.current = new FileReceiver(importedKey);

      setCryptoKey(importedKey);
      setRoomId(roomInfo.roomId);
      setEncodedKey(roomInfo.encodedKey);
      setIsJoiner(true);
      // Phase stays 'joining' until peer opens and connects
    } catch (err) {
      setPhase('error');
      setError(`Failed to join room: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeConnRef.current || !cryptoKeyRef.current) return;

    const plaintext = new TextEncoder().encode(text);
    const encrypted = await encrypt(cryptoKeyRef.current, plaintext);
    const payload = bytesToBase64(encrypted);

    sendEnvelope(activeConnRef.current, { type: 'message', payload });

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender: 'self',
      content: text,
      timestamp: new Date(),
      type: 'text',
    }]);
  }, []);

  const sendFile = useCallback(async (file: File) => {
    if (!activeConnRef.current || !cryptoKeyRef.current) return;

    const key = cryptoKeyRef.current;
    const conn = activeConnRef.current;

    try {
      await sendFileTransfer(conn, key, file, (fileId, progress) => {
        setFileTransfers(prev => {
          const next = new Map(prev);
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          next.set(fileId, {
            fileId,
            fileName: file.name,
            fileSize: file.size,
            totalChunks,
            mimeType: file.type || 'application/octet-stream',
            receivedChunks: Math.round(progress * totalChunks),
            progress,
            complete: progress >= 1,
          });
          return next;
        });
      });

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'self',
        content: `File sent: ${file.name}`,
        timestamp: new Date(),
        type: 'file-notification',
        fileName: file.name,
      }]);
    } catch (err) {
      setError(`Failed to send file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  // Suppress unused warning — cryptoKey is exposed in return value
  void cryptoKey;
  void activeConn;

  return {
    phase,
    cryptoKey,
    roomId,
    peerId,
    encodedKey,
    messages,
    fileTransfers,
    error,
    create,
    join,
    sendMessage,
    sendFile,
  };
}
