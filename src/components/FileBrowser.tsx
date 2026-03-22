/**
 * FileBrowser — session file panel.
 * Lists all files shared in this session with search, download, and delete.
 */

import { useState, useRef } from 'react';
import type { SessionFile } from '../hooks/useRoom';
import { MAX_FILE_SIZE } from '../transfer/send';

interface FileBrowserProps {
  files: SessionFile[];
  onSendFile: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  if (isImage) return (
    <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  if (isVideo) return (
    <svg className="w-4 h-4 text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  );
  if (isAudio) return (
    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
  return (
    <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function handleDownload(file: SessionFile) {
  if (file.downloadUrl) {
    const a = document.createElement('a');
    a.href = file.downloadUrl;
    a.download = file.fileName;
    a.click();
  } else if (file.fileRef) {
    const url = URL.createObjectURL(file.fileRef);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function FileBrowser({ files, onSendFile, onDelete, onClose }: FileBrowserProps) {
  const [query, setQuery] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? files.filter(f => f.fileName.toLowerCase().includes(query.toLowerCase()))
    : files;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`Max file size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }
    try {
      await onSendFile(file);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to send file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col w-72 bg-gray-900 border-l border-white/5 h-screen flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-white/5">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="font-semibold text-sm flex-1">Session Files</span>
        {files.length > 0 && (
          <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">
            {files.length}
          </span>
        )}
        {/* Add file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Add file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => void handleFileChange(e)} />
        {/* Close */}
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1.5">
          <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search files…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-500 hover:text-gray-300">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {fileError && (
        <div className="px-3 py-2 text-xs text-red-400 bg-red-900/20 border-b border-red-800/30">
          {fileError}
        </div>
      )}

      {/* Column headers */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
          <span className="flex-1 text-xs text-gray-500 font-medium uppercase tracking-wide">Name</span>
          <span className="w-14 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Size</span>
          <span className="w-10 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Time</span>
          <span className="w-12" />
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-gray-600 text-xs">
              {query ? 'No files match your search.' : 'No files shared yet.'}
            </p>
            {!query && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
              >
                Add a file
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map(file => (
              <li
                key={file.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors group"
              >
                <FileIcon mimeType={file.mimeType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs px-1 rounded ${
                      file.direction === 'received'
                        ? 'text-green-400 bg-green-900/30'
                        : 'text-blue-400 bg-blue-900/30'
                    }`}>
                      {file.direction === 'received' ? '↓' : '↑'}
                    </span>
                  </div>
                </div>
                <span className="w-14 text-xs text-gray-500 text-right flex-shrink-0">
                  {formatSize(file.fileSize)}
                </span>
                <span className="w-10 text-xs text-gray-600 text-right flex-shrink-0">
                  {formatDate(file.timestamp)}
                </span>
                {/* Actions — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-12 justify-end flex-shrink-0">
                  {(file.downloadUrl || file.fileRef) && (
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      title="Download"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(file.id)}
                    className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    title="Remove from list"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
