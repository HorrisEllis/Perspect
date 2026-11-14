'use strict';
/* group/ws.js — the WebSocket door: ws(s)://<host>/group. Frames are { id, cmd, args } → { id, ok, result | error };
 * events arrive as { event, data }. Sign-in must finish within the contract's authSeconds or the socket closes. */
const { WebSocketServer } = require('../co-creation-relay/nano-ws');
const { CONTRACT } = require('./contract');
const L = CONTRACT.transport.limits;

function attachWs(core, server, path) {
  const wss = new WebSocketServer({ server, path: path || '/group' });
  wss.on('connection', (ws) => {
    const send = (obj) => { try { ws.send(JSON.stringify(obj)); } catch (e) {} };
    const conn = core.connect((event, data) => send({ event, data }), () => { try { ws.close(1000, 'removed'); } catch (e) {} });
    const authTimer = setTimeout(() => { if (!conn.memberId) try { ws.close(1008, 'auth_timeout'); } catch (e) {} }, L.authSeconds * 1000);
    ws.on('message', (raw) => {
      if (raw.length > L.frameBytes) { try { ws.close(1009, 'frame_too_large'); } catch (e) {} return; }
      let f; try { f = JSON.parse(raw.toString('utf8')); } catch (e) { f = null; }
      if (!f || typeof f.cmd !== 'string') return send({ id: f && f.id, ok: false, error: { code: 'bad_frame', message: 'expected { id, cmd, args }' } });
      const reply = core.call(conn, f.cmd, f.args);
      if (conn.memberId) clearTimeout(authTimer);
      send(Object.assign({ id: f.id }, reply));
    });
    ws.on('close', () => { clearTimeout(authTimer); core.disconnect(conn); });
    ws.on('error', () => {});
  });
  return wss;
}
module.exports = { attachWs };
