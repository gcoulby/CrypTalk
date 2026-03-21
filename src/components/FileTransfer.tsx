/**
 * Progress bar component for in-flight (and completed) file transfers.
 */

import type { FileTransferState } from '../transfer/receive';

interface FileTransferProps {
  transfer: FileTransferState;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileTransfer({ transfer }: FileTransferProps) {
  const pct = Math.round(transfer.progress * 100);

  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/10 min-w-48">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 flex-shrink-0 text-blue-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="text-sm font-medium truncate text-white/90 max-w-40">
          {transfer.fileName}
        </span>
      </div>

      <div className="text-xs text-white/50">{formatBytes(transfer.fileSize)}</div>

      {!transfer.complete ? (
        <>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="bg-blue-400 h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs text-white/50">{pct}%</div>
        </>
      ) : (
        <div className="flex items-center gap-1">
          {transfer.downloadUrl ? (
            <a
              href={transfer.downloadUrl}
              download={transfer.fileName}
              className="text-xs text-blue-300 hover:text-blue-200 underline"
            >
              Download
            </a>
          ) : (
            <span className="text-xs text-green-400">Sent</span>
          )}
        </div>
      )}
    </div>
  );
}
