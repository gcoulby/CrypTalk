/**
 * Chat window — message list, text input, file attach.
 * Messages right-aligned for "You", left-aligned for "Peer".
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../hooks/useRoom';
import type { FileTransferState } from '../transfer/receive';
import { FileTransfer } from './FileTransfer';
import { MAX_FILE_SIZE } from '../transfer/send';

interface ChatWindowProps {
  messages: ChatMessage[];
  fileTransfers: Map<string, FileTransferState>;
  onSendMessage: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  error: string | null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatWindow({
  messages,
  fileTransfers,
  onSendMessage,
  onSendFile,
  error,
}: ChatWindowProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');
    try {
      await onSendMessage(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, sending, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }

    try {
      await onSendFile(file);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to send file');
    } finally {
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Get active file transfers (sender side) that are in progress
  const activeTransfers = Array.from(fileTransfers.values()).filter(t => !t.complete);
  const completedTransfers = Array.from(fileTransfers.values()).filter(t => t.complete && t.downloadUrl);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-white/5">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="font-semibold">Encrypted Session</span>
        <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          AES-GCM 128-bit
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="text-4xl">🔒</div>
              <p className="text-gray-500 text-sm">
                Connected! Messages are end-to-end encrypted.
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'self' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${msg.sender === 'self' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`px-3 py-2 rounded-2xl text-sm ${
                  msg.type === 'file-notification'
                    ? 'bg-gray-800 border border-white/10'
                    : msg.sender === 'self'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-white/90 rounded-bl-sm'
                }`}
              >
                {msg.type === 'file-notification' ? (
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{msg.content}</span>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                )}
              </div>
              <span className="text-xs text-gray-600 px-1">
                {msg.sender === 'self' ? 'You' : 'Peer'} · {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Active file transfer progress */}
        {activeTransfers.length > 0 && (
          <div className="space-y-2">
            {activeTransfers.map(t => (
              <div key={t.fileId} className="flex justify-end">
                <FileTransfer transfer={t} />
              </div>
            ))}
          </div>
        )}

        {/* Completed incoming transfers with download links */}
        {completedTransfers.map(t => (
          <div key={`done-${t.fileId}`} className="flex justify-start">
            <FileTransfer transfer={t} />
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {(error || fileError) && (
        <div className="px-4 py-2 bg-red-900/50 border-t border-red-800 text-red-300 text-sm">
          {error || fileError}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 bg-gray-900 border-t border-white/5">
        <div className="flex items-end gap-2">
          {/* File attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0"
            title="Attach file (max 100MB)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />

          {/* Text input */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm resize-none border border-white/5 focus:outline-none focus:border-blue-500/50 transition-colors min-h-[38px] max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />

          {/* Send button */}
          <button
            onClick={() => void handleSend()}
            disabled={!text.trim() || sending}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
