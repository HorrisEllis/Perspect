'use strict';
/* group/http.js — the HTTP door. POST /api/group/<cmd> with JSON args (Authorization: Bearer <token> once signed in)
 * → { ok, result } or { ok: false, error }. GET /api/group/contract → { contract, hash }. The sign-in is the same
 * handshake as the WebSocket: auth.hello returns a challengeId, auth.prove sends it back and gets the token.
 * handle(req, res) returns true when it answered, so the server can try its other routes otherwise. */
const { CONTRACT, HASH } = require('./contract');
const STATUS = { bad_frame: 400, bad_args: 400, unknown_command: 404, not_found: 404, contract_mismatch: 409, not_signed_in: 401, auth_failed: 401, invite_invalid: 403, not_allowed: 403, removed: 403, rate_limited: 429, wrong_kind: 400, wait_first: 425, not_your_turn: 409, server_error: 500 };

function httpHandler(core, prefix) {
  prefix = prefix || '/api/group';
  const httpConns = new Map();           // bearer token → a connection, so its rate limit carries across calls
  const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  return function handle(req, res) {
    const url = String(req.url || '').split('?')[0];
    if (!url.startsWith(prefix + '/')) return false;
    const cmd = decodeURIComponent(url.slice(prefix.length + 1));
    if (req.method === 'GET' && cmd === 'contract') { json(res, 200, { contract: CONTRACT, hash: HASH }); return true; }
    if (req.method !== 'POST') { json(res, 405, { ok: false, error: { code: 'bad_frame', message: 'POST a command, or GET contract' } }); return true; }
    let body = '', size = 0, over = false;
    req.on('data', (c) => { size += c.length; if (size > CONTRACT.transport.limits.frameBytes) { over = true; req.destroy(); } else body += c; });
    req.on('end', () => {
      if (over) return;
      let args; try { args = body ? JSON.parse(body) : {}; } catch (e) { return json(res, 400, { ok: false, error: { code: 'bad_frame', message: 'the body must be JSON' } }); }
      const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || ''), bearer = m ? m[1] : null;
      let conn = bearer && httpConns.get(bearer);
      if (!conn) { conn = { send() {}, memberId: null, bearer }; if (bearer) httpConns.set(bearer, conn); if (httpConns.size > 5000) httpConns.clear(); }
      const reply = core.call(conn, cmd, args);
      if (cmd === 'auth.hello' || cmd === 'auth.prove') conn.challengeId = null;   // HTTP carries challengeId itself
      json(res, reply.ok ? 200 : (STATUS[reply.error.code] || 400), reply);
    });
    return true;
  };
}
module.exports = { httpHandler, STATUS };
