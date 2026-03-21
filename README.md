# CrypTalk

> Ephemeral, end-to-end encrypted peer-to-peer chat. No server. No logs. No accounts.

---

## AI Declaration

This project is an agentic coding experiment. The architecture, specification, and code are being generated with AI assistance (Claude, Anthropic). It is exploratory by nature -- expect rough edges, evolving structure, and the occasional questionable decision made at speed.

---

## What It Is

CrypTalk lets two people have a private conversation without trusting any server with their messages. You create a room, get a link containing a 128-bit encryption key, share that link out-of-band (Signal, in person, wherever), and the other person joins. Everything is encrypted in the browser before it leaves your machine.

When you close the tab, the key is gone. There is nothing to delete because nothing was stored.

Supports text messages and file transfers.

---

## How It Works

1. **Create a room.** The browser generates a 128-bit key using `crypto.getRandomValues()`. A room ID is derived from that key via SHA-256 (truncated), so the key itself is never exposed to any server.

2. **Share the link.** The key lives in the URL fragment (`#key=...`). Fragments are not sent in HTTP requests, so GitHub Pages, CDNs, and any network infrastructure in between never see it.

3. **Connect.** PeerJS handles the WebRTC handshake using the hashed room ID. Once the data channel opens, the signalling server is out of the picture.

4. **Chat.** Every message and file chunk is encrypted with AES-GCM (128-bit) and a unique IV before it crosses the wire. The other side decrypts it. Nothing is stored anywhere.

---

## Security Model

| Concern | What CrypTalk does |
|---|---|
| Signalling server | Only ever sees a hash of the key, not the key itself |
| Network interception | AES-GCM with a unique IV per message |
| URL logging | Key is in the fragment, which is never sent in HTTP requests |
| Key persistence | Key is held in memory only and discarded on tab close |

**What this does not protect against:** a compromised device, malicious browser extensions, or someone with physical access to either screen. The security model assumes the share link travels over a separate trusted channel.

---

## Stack

- **Vite** + **TypeScript**
- **React** (UI)
- **PeerJS** (WebRTC signalling and data channels)
- **Web Crypto API** (all encryption, no third-party crypto libraries)
- **Tailwind CSS v4**
- Deployed as a static site on **GitHub Pages**

---

## Getting Started

```bash
pnpm install
pnpm dev
```

Build for GitHub Pages:

```bash
pnpm build
pnpm deploy
```

---

## Limitations

- One-to-one rooms only.
- No message history. Reload and the session is gone.
- File transfers are capped at 100 MB. WebRTC data channels are not designed for large payloads.
- Both peers must be online simultaneously. There is no store-and-forward.

---

## Project Status

Early-stage experiment. The core crypto and P2P wiring is the priority. UI is functional but not polished. Structure may change significantly as the build progresses.