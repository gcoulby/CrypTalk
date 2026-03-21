# CLAUDE.md for CrypTalk

## Project Overview

A fully client-side peer-to-peer encrypted chat application built with Vite. No server component. Hosted on GitHub Pages.

Users create a room and receive a 128-bit key. Sharing that key lets another person join the same room. All communication is end-to-end encrypted in the browser. Features include text messaging and file sharing.

---

## Architecture

### Deployment

- Static site only. No backend, no API server.
- Hosted on GitHub Pages via `gh-pages` branch or GitHub Actions.
- All logic runs in the browser.
- Base URL must be configured in `vite.config.ts` to match the repo path (e.g. `/repo-name/`).

### P2P Transport

- **PeerJS** or **simple-peer** over WebRTC for peer connections.
- A public PeerJS signalling server (or self-hosted one) is used only for the initial handshake. No message content ever touches the signalling server.
- Once the WebRTC data channel is open, signalling is no longer involved.
- If the default PeerJS cloud server is unacceptable for security posture, document a fallback self-hosted option (PeerJS Server on a VPS).

### Room and Key System

- On room creation, generate a 128-bit key using `crypto.getRandomValues()`.
- Encode the key as a URL-safe base64 or hex string and append it to the share URL as a fragment (`#key=...`), never as a query string. Fragments are not sent to servers.
- The room ID (used for PeerJS signalling lookup) is derived from the key via a one-way hash (SHA-256 truncated), so the signalling server never sees the key itself.
- The joiner loads the URL, extracts the key from the fragment, derives the room ID, and connects via PeerJS.

### Encryption

- Use the **Web Crypto API** (`window.crypto.subtle`) exclusively. No third-party crypto libraries.
- Key import: `importKey` with `AES-GCM`, 128-bit, `encrypt` + `decrypt` usages.
- Every message and file chunk is encrypted with a unique 96-bit IV prepended to the ciphertext.
- Key is never serialised to `localStorage`, `sessionStorage`, or any persistent store. It lives only in memory for the session.
- On tab close or navigation, the key is gone. This is intentional.

### File Sharing

- Files are read via `FileReader` or the File API, chunked (e.g. 16 KB chunks), encrypted per-chunk, and sent over the WebRTC data channel.
- Receiver reassembles chunks, decrypts, and offers the result as a `Blob` download via `URL.createObjectURL`.
- Include a simple progress indicator per file transfer.
- Max file size should be documented and enforced with a user-facing warning (WebRTC data channels are not designed for very large transfers; a reasonable limit is 100 MB).

---

## Tech Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript |
| UI | React (or Preact for bundle size) |
| P2P | PeerJS |
| Crypto | Web Crypto API |
| Styling | Tailwind CSS v4 |
| Deployment | GitHub Pages |

---

## Project Structure

```
src/
  crypto/
    keys.ts          # Key generation, import/export helpers
    encrypt.ts       # AES-GCM encrypt/decrypt wrappers
  peer/
    room.ts          # Room creation, ID derivation, PeerJS setup
    connection.ts    # Data channel management, message routing
  transfer/
    send.ts          # File chunking and send pipeline
    receive.ts       # Chunk reassembly and download
  components/
    CreateRoom.tsx
    JoinRoom.tsx
    ChatWindow.tsx
    FileTransfer.tsx
  hooks/
    usePeer.ts
    useRoom.ts
  App.tsx
  main.tsx
```

---

## Key Constraints

- **No server-side code.** If something requires a server, it's out of scope.
- **No external analytics, tracking, or telemetry.** Not even a ping.
- **Crypto must use Web Crypto API only.** Do not pull in `crypto-js`, `forge`, or similar.
- **Keys never leave the fragment.** Do not log, store, or transmit the raw key material.
- **Signalling server sees only the hashed room ID.** The actual key is never derivable from what the signalling server observes.
- **HTTPS required.** Web Crypto and WebRTC both require a secure context. GitHub Pages provides this automatically.

---

## Security Model

| Threat | Mitigation |
|---|---|
| Signalling server compromise | Room ID is a hash of the key; key is not recoverable from it |
| URL interception | Key is in the fragment, which is not sent in HTTP requests |
| Message interception in transit | AES-GCM with unique IV per message |
| Key persistence/leakage | Key held in memory only; not stored anywhere |
| Replay attacks | Unique IVs prevent ciphertext reuse; WebRTC sessions are ephemeral |

This model assumes the two parties share the URL out-of-band (e.g. over Signal, in person). It does not protect against a compromised endpoint (device malware, malicious browser extension, etc.).

---

## Vite Config Notes

```ts
// vite.config.ts
export default defineConfig({
  base: '/your-repo-name/', // Required for GitHub Pages
  build: {
    target: 'esnext', // Web Crypto requires modern targets
  },
})
```

---

## GitHub Pages Deployment

- Use `vite build` + `gh-pages` CLI, or a GitHub Actions workflow that runs `vite build` and pushes `dist/` to `gh-pages`.
- SPA routing: add a `404.html` redirect hack if using client-side routing, or keep routing hash-based to avoid it.
- The key is already hash-based (`#key=...`), so hash-based routing is a natural fit.

---

## Non-Goals

- No user accounts or identity system.
- No message persistence. Reload = session lost.
- No group rooms with more than two peers (one-to-one only, unless explicitly extended).
- No mobile push notifications.
- No server-side key escrow or recovery.