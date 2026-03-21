/**
 * CreateRoom component.
 * Shows a button to create a new encrypted room, then displays the share URL.
 */

import { useState } from 'react';
import { buildShareUrl } from '../peer/room';

interface CreateRoomProps {
  phase: 'idle' | 'creating' | 'waiting';
  encodedKey: string | null;
  onCreate: () => void;
}

export function CreateRoom({ phase, encodedKey, onCreate }: CreateRoomProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = encodedKey ? buildShareUrl(encodedKey) : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Title */}
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
          <p className="text-gray-400 text-sm">
            End-to-end encrypted peer-to-peer chat.
            <br />
            No servers. No logs. No accounts.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-white/5 space-y-4">
          {phase === 'idle' && (
            <>
              <h2 className="text-lg font-semibold text-white/90">Start a new room</h2>
              <p className="text-sm text-gray-400">
                A 128-bit AES-GCM key will be generated in your browser.
                Share the link with someone to start chatting securely.
              </p>
              <button
                onClick={onCreate}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl font-semibold transition-colors"
              >
                Create Encrypted Room
              </button>
            </>
          )}

          {phase === 'creating' && (
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">Generating key and setting up room…</span>
            </div>
          )}

          {phase === 'waiting' && shareUrl && (
            <>
              <h2 className="text-lg font-semibold text-white/90">Room created!</h2>
              <p className="text-sm text-gray-400">
                Share this link with the person you want to chat with.
                The encryption key is embedded in the URL fragment and never leaves your browser.
              </p>

              <div className="bg-gray-800 rounded-xl p-3 break-all text-xs text-blue-300 font-mono border border-white/5">
                {shareUrl}
              </div>

              <button
                onClick={handleCopy}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-white/90 border border-white/10'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>

              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-sm text-gray-400">Waiting for peer to connect…</span>
              </div>
            </>
          )}
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-gray-600">
          All messages are encrypted with AES-GCM before leaving your browser.
          The signalling server only sees a hash of your room ID, never the key.
        </p>
      </div>
    </div>
  );
}
