/**
 * App — hash-based routing.
 * If #key= is in the URL → show JoinRoom, else show CreateRoom.
 * Once connected, show ChatWindow.
 */

import { extractKeyFromUrl } from './peer/room';
import { useRoom } from './hooks/useRoom';
import { CreateRoom } from './components/CreateRoom';
import { JoinRoom } from './components/JoinRoom';
import { ChatWindow } from './components/ChatWindow';

const incomingKey = extractKeyFromUrl();

export default function App() {
  const {
    phase,
    encodedKey,
    messages,
    fileTransfers,
    sessionFiles,
    error,
    create,
    join,
    sendMessage,
    sendFile,
    deleteSessionFile,
  } = useRoom();

  // Connected → show chat
  if (phase === 'connected') {
    return (
      <ChatWindow
        messages={messages}
        fileTransfers={fileTransfers}
        sessionFiles={sessionFiles}
        onSendMessage={sendMessage}
        onSendFile={sendFile}
        onDeleteSessionFile={deleteSessionFile}
        error={error}
      />
    );
  }

  // Error state
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-red-800/50 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold">Connection Error</h2>
          </div>
          <p className="text-gray-400 text-sm">{error ?? 'An unexpected error occurred.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors border border-white/10"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Joining flow — URL has a key
  if (incomingKey) {
    return (
      <JoinRoom
        phase={phase as 'idle' | 'joining' | 'connected' | 'error'}
        encodedKey={incomingKey}
        error={error}
        onJoin={join}
      />
    );
  }

  // Creating flow — no key in URL
  return (
    <CreateRoom
      phase={phase as 'idle' | 'creating' | 'waiting'}
      encodedKey={encodedKey}
      onCreate={() => void create()}
    />
  );
}
