# Perspect

Calls and messages between two people, built so you actually understand each other: replay the last 15 seconds,
clarity for a muffled mic or a strong accent, captions, and conversations that take turns instead of racing.
Runs on your own server. Taken from the messaging half of `HorrisEllis/Eravos` (folder `eravos/`, 2026-10-30).

## What is in it

| Part | Where |
|---|---|
| Chat — messages, receipts, typing, attachments as references, offline outbox | `eravos/shared/eravos-chat.js`, `eravos/tabs/chat/` |
| Calls — invite / accept / decline, mute, camera, screen share, couch party, fullscreen | `eravos/tabs/call/` |
| Call audio — replay the last 15 s, live captions (local), `intimate` mic profile, Opus + FEC | `eravos/shared/eravos-callaudio.js` |
| Clarity settings — gate, presence EQ, gain, limiter, rewind; an accent-boost profile | `eravos/shared/clarity-config/` |
| Voice — prosody (pitch, rhythm) | `eravos/tabs/voice/` |
| Sparring — timed turns, live rules, speed mode | `eravos/tabs/sparring/` |
| Co-create, one-way messages, presence, pairing (code / QR), safety | `eravos/tabs/cocreate/`, `eravos/shared/` |
| Vault (attachments and co-create point into it) | `eravos/tabs/vault/` |
| The relay — your own server: key-proof login, E2E payloads, stored catch-up | `co-creation-relay/` |
| Self-hosting — DDNS, ACME certificates, SMTP | `server-modules/` |
| Instagram / Threads bridge — one named contact, both sides consent | `userscript/` |
| Whisper on Android (prepared, never built — see its own note) | `android-app/` |
| Desktop app | `electron/`, `electron-main.js` |

Run it: `node eravos-serve.js` (app + relay on one port) or `npm start` (Electron). Tests: `node eravos/test/run-all.mjs`.

## What was taken out

The relationship tabs: oracle, feelings, relational, rupture, growth, triggers, commitments, struggles, ideas, poetry, rituals,
codex, mythos, mutator, music, canvas, needs, planner, lattice, meaning, roadmap, grammar, hardtalk, goals, desires. Their nav
buttons are gone and any jump to one lands on Chat (`window.ERAVOS_KEEP_TABS` in `index.html`, checked in `switchTab`).
The kernel (`shared/eravos-kernel.js`) is still the whole 12,000-line file — the tabs are gone, their code underneath is not.
Also left out: `clear-glass-lite/`, the Nexus tunnel fallback, and the sibling projects (emergence, warp, wire, eravos-db, the docs).

## Changed

1. **The relay pins a key only after its owner proves it** (`co-creation-relay/relay-server.js`). It pinned on `hello`, so anyone
   could take a fresh slot with a key nobody holds and lock the real device out. `node co-creation-relay/relay-pin.check.mjs <app folder> <temp folder>`
   shows it: the original answers the real owner `identity_mismatch`; this one `auth_ok`.
2. **Sparring escapes the partner's words** (`tabs/sparring/sparring.js`): turn and rule text went into the page as HTML.
3. `test/choice-lint.mjs` notes, instead of failing on, the dropdowns whose tabs were stripped.

4. **No account is built in.** Eravos seeded two accounts with their password hashes in the source (unsalted SHA-256, so a weak
   password can be cracked offline). Gone: a fresh install opens registration and its first account is the admin; a partner joins by
   invite or QR. `test/registration.test.mjs` guards both.
5. **Named Perspect** on screen, in notifications, invites and the desktop app (`package.json`: `perspect-desktop`,
   `world.rheon.perspect`). File and code names still say `eravos-*` — renaming them is a separate, mechanical step.

Tests: 528 passed, 0 failed, lints clean. Boots in a browser and opens on Chat.

## Still open

- **The Clarity engine's code is missing.** `MAP.md` says `shared/clarity-engine.js` is loaded and wired into the call; it is not in
  the repo and nothing loads it. The settings are here. Rebuild from them, or drop the file back in if you have it.
- **Whisper is not running.** Captions today are the browser's own speech recognition. The Android whisper.cpp bridge is unbuilt;
  no region / language or starting prompt is configured.
- **Calls still go through PeerJS's public servers** (`unpkg.com/peerjs`); only data goes through your relay.
- Plain (unencrypted) messages are still accepted after the key is set; the partner's key is not shown to compare (no safety number);
  X25519 is hand-written (use the built-in one); the private key sits unencrypted in local storage.
- The server-side accounts (`/api/account/*`) came from the sibling `eravos-db`, which is not here: sign-up and login fall back to
  local-only, as they were built to.
- Comments and tests still mention James / Raven as history; nothing on screen does.
