/**
 * Wraps the PeerJS Peer lifecycle.
 * Creates a peer with a given ID (or random), waits for it to open,
 * and listens for incoming connections.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export type PeerStatus = 'idle' | 'connecting' | 'open' | 'error' | 'closed';

export interface UsePeerResult {
  peer: Peer | null;
  peerId: string | null;
  status: PeerStatus;
  destroyPeer: () => void;
}

/**
 * Create a PeerJS peer. If preferredId is provided, attempt to use it.
 * onIncomingConnection fires when a remote peer connects to us.
 */
export function usePeer(
  preferredId: string | null,
  onIncomingConnection?: (conn: DataConnection) => void,
): UsePeerResult {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<PeerStatus>('idle');
  const peerRef = useRef<Peer | null>(null);
  const onConnectionRef = useRef(onIncomingConnection);

  // Keep the callback ref up to date without recreating the effect
  useEffect(() => {
    onConnectionRef.current = onIncomingConnection;
  }, [onIncomingConnection]);

  const destroyPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setPeer(null);
    setPeerId(null);
    setStatus('closed');
  }, []);

  useEffect(() => {
    if (!preferredId) return;

    setStatus('connecting');

    const initPeer = (id?: string) => {
      const newPeer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
      peerRef.current = newPeer;
      setPeer(newPeer);

      newPeer.on('open', (openId) => {
        setPeerId(openId);
        setStatus('open');
      });

      newPeer.on('connection', (conn) => {
        onConnectionRef.current?.(conn);
      });

      newPeer.on('error', (err) => {
        if (err.type === 'unavailable-id' && id) {
          // ID taken — fall back to random ID
          newPeer.destroy();
          initPeer(); // no preferred ID
        } else {
          setStatus('error');
        }
      });

      newPeer.on('disconnected', () => {
        setStatus('closed');
      });
    };

    initPeer(preferredId);

    return () => {
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, [preferredId]);

  return { peer, peerId, status, destroyPeer };
}
