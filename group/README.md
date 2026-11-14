# Perspect groups — the backend

Everything a group does runs on the server, behind one **interaction contract** (`contract.json`). Pages float on it:
they send its commands and listen for its events, nothing else, so any page can be thrown away and rewritten without
touching the server.

```
pages (one HTML each) ──┐
other programs ─────────┼──  contract.json  ──  core.js  ──  store.js (SQLite: data/group.db)
the CLI ────────────────┘    (checked on       (permissions,
                              every call)       ranks, spar clock)
```

| Door | Where | |
|---|---|---|
| WebSocket | `ws(s)://<host>/group` | `{ id, cmd, args }` → `{ id, ok, result \| error }`; events as `{ event, data }` |
| HTTP | `POST /api/group/<cmd>` · `GET /api/group/contract` | `Authorization: Bearer <token>` after signing in |
| CLI | `node group/cli.js` | on the server, as the owner; every action audited as `cli` |
| Client | `/group/client.js` | what pages use: `PerspectGroup.connect(...)`, `call`, `on` |

## The handshake

Both sides prove they speak the same contract, and the member proves their key:

1. `auth.hello { pub, contract: { version, hash } }` → the server refuses another hash (`contract_mismatch`, with its own).
2. The server answers with **its** contract hash; the client refuses to go on if it differs.
3. The server seals a check value to the member's key; only the private key opens it → `auth.prove { proof }`.
4. → `{ me, group, token }`. An invite (or the setup code) is spent only now, after the proof.

A page carries its pin: `<meta name="perspect-contract" content="<version> <hash>">` (`node group/cli.js contract`).

## Admin and permissions

Builtin roles **owner** (1000) · **admin** (800) · **moderator** (500) · **member** (100), and any custom role. You act only on
people and roles ranked below you, and grant only what you hold. A channel can allow or deny `channel.view`,
`message.send`, `message.manage` and `voice.join` per role, which is how private channels work (no listing, no history, no events).
Every admin action is in the audit log (`audit.list`, `node group/cli.js audit`).

## What a group can do

Channels (text, voice, spar, events), messages with history and catch-up, edits, deletes, reactions, the group's own
emoji, ideas built on piece by piece and forked (each piece keeps its author), one-way messages (no replies for 10
minutes), sparring with the clock on the server (timed turns, rules both accept, speed mode), presence (here or away, a
mood, where you are, typing), appreciations, nudges, prompt decks, voice rooms (who is in, call setup passed between
them), invites, roles, removal.

## First run

```
node eravos-serve.js                 # the app, the relay and the group, one port
node group/cli.js setup-code         # a one-time code: the first person to join with it is the owner
node group/cli.js invite --uses 10   # then invite people
```

Tests: `node eravos/test/group.test.mjs` (also in `node eravos/test/run-all.mjs`).

## Not yet

- **Group end-to-end encryption.** The server stores message bodies exactly as sent and never reads them, so pages can
  encrypt before sending, but the group key exchange is not built: today a body is readable on the server.
- **Group voice beyond a few people.** Call setup passes person to person (a mesh); past ~4 people a forwarding server is needed.
- The pages: next, one HTML each, on this contract.
