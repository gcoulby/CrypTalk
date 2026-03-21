/**
 * JoinRoom component.
 * Auto-joins on load using the key from the URL fragment, shows connecting state.
 */

import { useEffect } from 'react';

interface JoinRoomProps {
  phase: 'idle' | 'joining' | 'connected' | 'error';
  encodedKey: string;
  error: string | null;
  onJoin: (key: string) => void;
}

export function JoinRoom({ phase, encodedKey, error, onJoin }: JoinRoomProps) {
  // Auto-join on mount
  useEffect(() => {
    if (phase === 'idle') {
      onJoin(encodedKey);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">CrypTalk</h1>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-white/5">
          {error ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">Connection failed</span>
              </div>
              <p className="text-sm text-gray-400">{error}</p>
              <button
                onClick={() => onJoin(encodedKey)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white/90">
                    {phase === 'joining' ? 'Connecting to room…' : 'Establishing encrypted channel…'}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Deriving room ID from key and connecting via WebRTC
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-3 space-y-1 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Key extracted from URL fragment
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className={`w-1.5 h-1.5 rounded-full ${phase !== 'idle' ? 'bg-green-400' : 'bg-gray-600'}`} />
                  Room ID derived via SHA-256
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className={`w-1.5 h-1.5 rounded-full ${phase === 'connected' ? 'bg-green-400' : 'bg-gray-600 animate-pulse'}`} />
                  Connecting to peer…
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
