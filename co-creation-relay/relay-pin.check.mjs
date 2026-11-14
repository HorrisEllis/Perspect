// checks the relay pins a key only after proof of possession
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { createRequire } from 'node:module';
const APP = process.argv[2], ids = process.argv[3] + '/ids.json', db = process.argv[3] + '/r.db'; try { fs.unlinkSync(ids); } catch {}
const R = createRequire(import.meta.url)(APP + '/co-creation-relay/relay-identity.js');
const srv = spawn('node', [APP + '/co-creation-relay/relay-server.js', '--port=8799', '--identities=' + ids, '--db=' + db], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const open = () => new Promise((res, rej) => { const w = new WebSocket('ws://127.0.0.1:8799', { headers: { origin: 'http://test.local' } }); w.onopen = () => res(w); w.onerror = rej; });
const next = (w) => new Promise(r => { w.onmessage = (e) => r(JSON.parse(e.data)); w.onclose = (e) => r({ closed: e.reason }); });
// 1. a squatter: hello with a key nobody holds, never answers
const fakePub = R.toB64(crypto.randomBytes(32)); let w = await open(); w.send(JSON.stringify({ type: 'hello', peerId: 'eravos-a', pub: fakePub }));
const c1 = await next(w); w.close(); await new Promise(r => setTimeout(r, 200));
const pinnedAfterSquat = fs.existsSync(ids) ? JSON.parse(fs.readFileSync(ids, 'utf8')) : {};
// 2. the real owner: proves the key, gets in, is pinned
const priv = crypto.randomBytes(32), pub = R.toB64(R.x25519Base(priv)); w = await open(); w.send(JSON.stringify({ type: 'hello', peerId: 'eravos-a', pub }));
const ch = await next(w); if (!ch.ephPub) { console.log("got", JSON.stringify(ch)); } const key = R.hkdf(R.x25519(priv, R.fromB64(ch.ephPub)), R.fromB64(ch.nonce), 'relay-auth-v1', 32);
const ct = Buffer.from(ch.envelope.ct, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ch.envelope.iv, 'base64')); d.setAuthTag(ct.subarray(-16));
const proof = Buffer.concat([d.update(ct.subarray(0, -16)), d.final()]).toString('base64'); w.send(JSON.stringify({ type: 'challenge_response', proof }));
const ok = await next(w); w.close(); await new Promise(r => setTimeout(r, 200));
const pinned = JSON.parse(fs.readFileSync(ids, 'utf8')); srv.kill();
const pass = c1.type === 'challenge' && !pinnedAfterSquat['eravos-a'] && ok.type === 'auth_ok' && pinned['eravos-a'] === pub;
console.log(JSON.stringify({ squatterGotChallenge: c1.type, squatterPinned: !!pinnedAfterSquat['eravos-a'], ownerAuth: ok.type, ownerPinned: pinned['eravos-a'] === pub }), pass ? 'PASS' : 'FAIL'); process.exit(pass ? 0 : 1);
