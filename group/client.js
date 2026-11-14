/* group/client.js — the one thing a page uses to reach a Perspect group (browser or Node). A page never builds frames
 * by hand: it calls client.call(cmd, args) and listens with client.on(event, fn). Everything it may say is in
 * group/contract.json.
 *
 *   const g = await PerspectGroup.connect({ url, contract: { version, hash }, identity, invite, name, WebSocket })
 *     contract  the version and hash THIS page was written against (pages carry it in
 *               <meta name="perspect-contract" content="<version> <hash>">). The server refuses a different hash,
 *               and this client refuses a server whose hash differs — both sides check.
 *     identity  { pub: base64 X25519 public key, open(challenge) → Promise<proof base64> } — the private key never
 *               leaves it. PerspectGroup.webIdentity() makes one in the browser (WebCrypto, kept in IndexedDB).
 *   g.me, g.group, g.token · await g.call(cmd, args) → result (throws { code, message, data }) · g.on(event, fn) → off()
 *   g.close() */
(function (root) {
  'use strict';
  const b64 = { enc: (u8) => (typeof Buffer !== 'undefined' ? Buffer.from(u8).toString('base64') : btoa(String.fromCharCode(...u8))),
    dec: (s) => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0))) };
  class GroupCallError extends Error { constructor(e) { super(e.message || e.code); this.code = e.code; this.data = e.data; } }

  function connect(opts) {
    const WS = opts.WebSocket || root.WebSocket;
    if (!opts.contract || !opts.contract.hash) return Promise.reject(new GroupCallError({ code: 'contract_mismatch', message: 'a page must say which contract it speaks' }));
    return new Promise((resolve, reject) => {
      const ws = new WS(opts.url), waiting = new Map(), listeners = new Map(); let nextId = 1, done = false;
      const raw = (cmd, args) => new Promise((res, rej) => { const id = nextId++; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, cmd, args: args || {} })); });
      const client = {
        me: null, group: null, token: null,
        call: (cmd, args) => raw(cmd, args),
        on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); return () => listeners.get(event).delete(fn); },
        close() { try { ws.close(); } catch (e) {} },
      };
      const fire = (event, data) => { (listeners.get(event) || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); (listeners.get('*') || []).forEach(fn => fn(event, data)); };
      ws.onmessage = (ev) => {
        let f; try { f = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); } catch (e) { return; }
        if (f.event) return fire(f.event, f.data);
        const w = waiting.get(f.id); if (!w) return; waiting.delete(f.id);
        f.ok ? w.res(f.result) : w.rej(new GroupCallError(f.error));
      };
      ws.onclose = (ev) => { waiting.forEach(w => w.rej(new GroupCallError({ code: 'closed', message: 'the connection closed' }))); waiting.clear(); fire('closed', { code: ev && ev.code, reason: ev && ev.reason }); if (!done) reject(new GroupCallError({ code: 'closed', message: 'closed before signing in' })); };
      ws.onopen = async () => {
        try {
          const hello = await raw('auth.hello', { pub: opts.identity.pub, contract: { version: opts.contract.version, hash: opts.contract.hash }, ...(opts.invite ? { invite: opts.invite } : {}), ...(opts.name ? { name: opts.name } : {}) });
          // the client's half of the handshake: the server must speak exactly this page's contract
          if (!hello.contract || hello.contract.hash !== opts.contract.hash) throw new GroupCallError({ code: 'contract_mismatch', message: 'the server speaks a different contract', data: hello.contract });
          const proof = await opts.identity.open(hello);
          const r = await raw('auth.prove', { proof, challengeId: hello.challengeId });
          client.me = r.me; client.group = r.group; client.token = r.token; done = true; resolve(client);
        } catch (e) { done = true; try { ws.close(); } catch (x) {} reject(e); }
      };
    });
  }

  // the browser identity: an X25519 key made by WebCrypto, kept (not extractable) in IndexedDB
  async function webIdentity(name) {
    const subtle = root.crypto.subtle, store = name || 'perspect-identity';
    const db = await new Promise((res, rej) => { const r = indexedDB.open(store, 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const get = (k) => new Promise((res) => { const t = db.transaction('keys').objectStore('keys').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(null); });
    const put = (k, v) => new Promise((res) => { const t = db.transaction('keys', 'readwrite').objectStore('keys').put(v, k); t.onsuccess = () => res(); });
    let kp = await get('x25519');
    if (!kp) { kp = await subtle.generateKey({ name: 'X25519' }, false, ['deriveBits']); await put('x25519', kp); }
    const pub = b64.enc(new Uint8Array(await subtle.exportKey('raw', kp.publicKey)));
    return { pub, async open(ch) {
      const ephPub = await subtle.importKey('raw', b64.dec(ch.ephPub), { name: 'X25519' }, false, []);
      const shared = await subtle.deriveBits({ name: 'X25519', public: ephPub }, kp.privateKey, 256);
      const hk = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
      const key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: b64.dec(ch.nonce), info: new TextEncoder().encode('perspect-group-auth-v1') }, hk, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const pt = await subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(ch.envelope.iv) }, key, b64.dec(ch.envelope.ct));
      return b64.enc(new Uint8Array(pt));
    } };
  }
  // the page's own contract pin, read from <meta name="perspect-contract" content="<version> <hash>">
  function pagePin(doc) { const m = (doc || root.document).querySelector('meta[name="perspect-contract"]'); if (!m) return null; const [version, hash] = m.content.trim().split(/\s+/); return { version, hash }; }

  const api = { connect, webIdentity, pagePin, GroupCallError };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PerspectGroup = api;
})(typeof window !== 'undefined' ? window : globalThis);
