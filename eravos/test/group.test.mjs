// The group backend: the contract and the code agree; the handshake checks both sides; permissions and ranks hold;
// every feature works through the real doors (WebSocket, HTTP, CLI) on a real server and a real database.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const C = require(ROOT + '/group/contract.js');
const { createCore } = require(ROOT + '/group/core.js');
const { attachWs } = require(ROOT + '/group/ws.js');
const { httpHandler } = require(ROOT + '/group/http.js');
const client = require(ROOT + '/group/client.js');
const cli = require(ROOT + '/group/cli.js');
const R = require(ROOT + '/co-creation-relay/relay-identity.js');

let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok  - ' + name); } catch (e) { fail++; console.log('  FAIL- ' + name + '\n        ' + (e && e.stack || e).split('\n').slice(0, 3).join('\n        ')); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// a member's key, the way a real client holds it: the private half never leaves open()
function identity() {
  const priv = crypto.randomBytes(32), pub = R.toB64(R.x25519Base(priv));
  return { pub, async open(ch) {
    const key = R.hkdf(R.x25519(priv, R.fromB64(ch.ephPub)), R.fromB64(ch.nonce), 'perspect-group-auth-v1', 32);
    const ct = Buffer.from(ch.envelope.ct, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ch.envelope.iv, 'base64'));
    d.setAuthTag(ct.subarray(-16)); return Buffer.concat([d.update(ct.subarray(0, -16)), d.final()]).toString('base64');
  } };
}

// a real server on a free port, with a fresh database
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perspect-group-')), dbPath = path.join(dir, 'group.db');
// the test talks faster than people do: this server allows more; the real limit is checked on its own below
const core = createCore({ dbPath, commandsPerSecond: 10000 });
const handle = httpHandler(core, '/api/group');
const server = http.createServer((req, res) => { if (!handle(req, res)) { res.writeHead(404); res.end(); } });
attachWs(core, server, '/group');
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, URL_WS = `ws://127.0.0.1:${port}/group`, PIN = { version: C.VERSION, hash: C.HASH };
const join = (opts) => client.connect({ url: URL_WS, contract: PIN, WebSocket, ...opts });
const post = async (cmd, args, token) => { const r = await fetch(`http://127.0.0.1:${port}/api/group/${cmd}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(args || {}) }); return { status: r.status, body: await r.json() }; };
const err = async (p) => { try { await p; } catch (e) { return e.code; } return 'no error'; };
const events = (g) => { const got = []; g.on('*', (e, d) => got.push([e, d])); return got; };

console.log('\nTHE CONTRACT AND THE CODE AGREE');
await t('every command in the contract has a handler, and every handler is in the contract', () => {
  assert.deepEqual(Object.keys(core.handlers).sort(), Object.keys(C.CONTRACT.commands).sort());
});
await t('every command names a known permission (or anyone / member / owner), and emits only events the contract has', () => {
  for (const [name, c] of Object.entries(C.CONTRACT.commands)) {
    assert.ok(['anyone', 'member', 'owner', ...C.PERMISSIONS].includes(c.perm), name + ': ' + c.perm);
    (c.emits || []).forEach(e => assert.ok(C.CONTRACT.events[e], name + ' emits an unknown event ' + e));
  }
});
await t('the builtin roles in the contract are the ones the server makes', () => {
  for (const [id, r] of Object.entries(C.CONTRACT.roles.builtin)) {
    const s = core.store.role(id); assert.equal(s.rank, r.rank, id);
    if (r.permissions !== 'all') assert.deepEqual([...s.permissions].sort(), [...r.permissions].sort(), id);
  }
});
await t('arguments are checked against the contract: unknown, missing, wrong type, out of range', () => {
  assert.equal(C.check('message.send', { channelId: 'x', body: 'hi', extra: 1 }).code, 'bad_args');
  assert.equal(C.check('message.send', { channelId: 'x' }).code, 'bad_args');
  assert.equal(C.check('message.history', { channelId: 'x', limit: 'ten' }).code, 'bad_args');
  assert.equal(C.check('message.history', { channelId: 'x', limit: 999 }).code, 'bad_args');
  assert.equal(C.check('no.such', {}).code, 'unknown_command');
  assert.equal(C.check('message.send', { channelId: 'x', body: 'hi' }).ok, true);
});

await t('every page carries the current contract pin (a page with a stale pin would be refused)', () => {
  const dir = ROOT + '/group/web', pages = fs.readdirSync(dir).filter(f => f.endsWith('.html')); assert.ok(pages.length, 'there are pages');
  for (const f of pages) { const m = /<meta name="perspect-contract" content="([^"]+)">/.exec(fs.readFileSync(dir + '/' + f, 'utf8')); assert.ok(m, f + ' has no pin'); assert.equal(m[1], C.VERSION + ' ' + C.HASH, f + ' pins an old contract'); }
});

console.log('\nTHE HANDSHAKE');
const ownerId = identity(), setup = core.store.setupCode();
let owner;
await t('a client with a different contract is refused, and told the server\'s version and hash', async () => {
  try { await client.connect({ url: URL_WS, contract: { version: '0.9.0', hash: 'f'.repeat(64) }, identity: ownerId, invite: setup, WebSocket }); assert.fail('connected'); }
  catch (e) { assert.equal(e.code, 'contract_mismatch'); assert.equal(e.data.hash, C.HASH); }
});
await t('the client refuses a server whose contract differs (its own half of the check)', async () => {
  const fake = class { constructor() { setTimeout(() => this.onopen(), 1); } send(s) { const f = JSON.parse(s); setTimeout(() => this.onmessage({ data: JSON.stringify({ id: f.id, ok: true, result: { contract: { version: '9', hash: '0'.repeat(64) }, challengeId: 'x', ephPub: '', nonce: '', envelope: {} } }) }), 1); } close() {} };
  assert.equal(await err(client.connect({ url: 'x', contract: PIN, identity: ownerId, WebSocket: fake })), 'contract_mismatch');
});
await t('a page must say which contract it speaks', async () => { assert.equal(await err(client.connect({ url: URL_WS, identity: ownerId, WebSocket })), 'contract_mismatch'); });
await t('a new key with no invite is refused', async () => { assert.equal(await err(join({ identity: identity() })), 'invite_invalid'); });
await t('a wrong proof is refused (the key must be held, not just named)', async () => {
  const id = identity(), liar = { pub: id.pub, open: async () => crypto.randomBytes(16).toString('base64') };
  assert.equal(await err(join({ identity: liar, invite: setup })), 'auth_failed');
  assert.ok(!core.store.meta('ownerId'), 'a failed proof does not spend the setup code');
});
await t('the setup code makes the first owner, once', async () => {
  owner = await join({ identity: ownerId, invite: setup, name: 'Horris' });
  assert.equal(owner.me.roleId, 'owner'); assert.ok(owner.token);
  assert.equal(await err(join({ identity: identity(), invite: setup })), 'invite_invalid');
});

console.log('\nPERMISSIONS AND RANKS');
let maya, theo, mayaId = identity(), theoId = identity(), G, chText, chSpar, chVoice;
await t('an invite brings people in with its role; everyone hears who joined', async () => {
  const { invite } = await owner.call('invite.create', { uses: 2 }); const seen = events(owner);
  maya = await join({ identity: mayaId, invite: invite.code, name: 'Maya' });
  theo = await join({ identity: theoId, invite: invite.code, name: 'Theo' });
  assert.equal(maya.me.roleId, 'member'); await sleep(30);
  assert.ok(seen.filter(([e]) => e === 'member.joined').length === 2);
  assert.equal(await err(join({ identity: identity(), invite: invite.code })), 'invite_invalid', 'used up');
  G = await owner.call('group.get'); chText = G.channels.find(c => c.name === 'ideas'); chSpar = G.channels.find(c => c.kind === 'spar'); chVoice = G.channels.find(c => c.kind === 'voice');
});
await t('a member cannot do an admin\'s job', async () => {
  assert.equal(await err(maya.call('channel.create', { name: 'mine', kind: 'text' })), 'not_allowed');
  assert.equal(await err(maya.call('invite.create', {})), 'not_allowed');
  assert.equal(await err(maya.call('member.remove', { memberId: theo.me.id })), 'not_allowed');
  assert.equal(await err(maya.call('audit.list', {})), 'not_allowed');
});
await t('ranks: an admin cannot touch the owner, grant admin, or make a role at their own rank', async () => {
  await owner.call('member.set_role', { memberId: maya.me.id, roleId: 'admin' });
  assert.equal(await err(maya.call('member.remove', { memberId: owner.me.id })), 'not_allowed');
  assert.equal(await err(maya.call('member.set_role', { memberId: theo.me.id, roleId: 'admin' })), 'not_allowed');
  assert.equal(await err(maya.call('role.create', { name: 'Equal', rank: 800, permissions: [] })), 'not_allowed');
  assert.equal(await err(maya.call('member.set_role', { memberId: theo.me.id, roleId: 'owner' })), 'not_allowed');
  const r = await maya.call('member.set_role', { memberId: theo.me.id, roleId: 'moderator' }); assert.equal(r.member.roleId, 'moderator');
});
await t('custom roles: only permissions you hold, below your rank; members of a deleted role fall back to member', async () => {
  await owner.call('member.set_role', { memberId: theo.me.id, roleId: 'member' });
  const { role } = await maya.call('role.create', { name: 'Builder', rank: 300, permissions: ['channel.view', 'message.send', 'voice.join', 'invite.create'] });
  await maya.call('member.set_role', { memberId: theo.me.id, roleId: role.id });
  assert.ok((await theo.call('invite.create', {})).invite.code, 'the role grants invite.create');
  await maya.call('role.delete', { roleId: role.id });
  assert.equal(core.store.member(theo.me.id).roleId, 'member');
});
await t('a channel override hides a channel from a role: no listing, no history, no events', async () => {
  const { channel } = await owner.call('channel.create', { name: 'organizers', kind: 'text', category: 'Admin' });
  await owner.call('channel.set_override', { channelId: channel.id, roleId: 'member', deny: ['channel.view'] });
  const seen = events(theo); await owner.call('message.send', { channelId: channel.id, body: 'private plans' }); await sleep(30);
  assert.ok(!(await theo.call('group.get')).channels.some(c => c.id === channel.id));
  assert.equal(await err(theo.call('message.history', { channelId: channel.id })), 'not_allowed');
  assert.ok(!seen.some(([e, d]) => e === 'message.new' && d.message.channelId === channel.id), 'no event leaked');
  assert.ok((await maya.call('message.history', { channelId: channel.id })).messages.length === 1, 'an admin still sees it');
});
await t('admin actions land in the audit log', async () => {
  const { entries } = await owner.call('audit.list', {}); const acts = entries.map(e => e.action);
  ['member.set_role', 'role.create', 'role.delete', 'channel.create', 'channel.set_override', 'invite.create'].forEach(a => assert.ok(acts.includes(a), a));
});

console.log('\nCONVERSATION, EMOJI, IDEAS');
await t('messages reach the people who can see the channel; history pages; catch-up after being away', async () => {
  const seen = events(theo); const { message } = await maya.call('message.send', { channelId: chText.id, body: 'hello 👋' }); await sleep(30);
  assert.ok(seen.some(([e, d]) => e === 'message.new' && d.message.id === message.id));
  for (let i = 0; i < 5; i++) await maya.call('message.send', { channelId: chText.id, body: 'n' + i });
  const h = await theo.call('message.history', { channelId: chText.id, limit: 3 }); assert.equal(h.messages.length, 3); assert.ok(h.more);
  assert.ok(h.messages[0].seq < h.messages[2].seq, 'oldest first');
  const s = await theo.call('message.since', { after: message.seq }); assert.equal(s.messages.length, 5);
});
await t('edit only your own; a moderator deletes anyone\'s; reactions toggle', async () => {
  const { message } = await theo.call('message.send', { channelId: chText.id, body: 'typo' });
  assert.equal(await err(maya.call('message.edit', { messageId: message.id, body: 'x' })), 'not_allowed');
  assert.equal((await theo.call('message.edit', { messageId: message.id, body: 'fixed' })).message.body, 'fixed');
  let r = await maya.call('reaction.toggle', { messageId: message.id, emoji: '🔥' }); assert.deepEqual(r.reactions['🔥'], [maya.me.id]);
  r = await maya.call('reaction.toggle', { messageId: message.id, emoji: '🔥' }); assert.equal(r.reactions['🔥'], undefined);
  await maya.call('message.delete', { messageId: message.id });
  assert.equal(await err(theo.call('message.edit', { messageId: message.id, body: 'x' })), 'not_found');
});
await t('custom emoji need emoji.manage; everyone sees the set change', async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==';
  assert.equal(await err(theo.call('emoji.add', { name: 'spark', image: png })), 'not_allowed');
  const seen = events(theo); await maya.call('emoji.add', { name: 'spark', image: png }); await sleep(30);
  assert.ok(seen.some(([e]) => e === 'emoji.changed')); assert.equal((await theo.call('emoji.list')).emojis[0].name, 'spark');
  assert.equal(await err(maya.call('emoji.add', { name: 'bad', image: 'data:text/html;base64,PHNjcmlwdD4=' })), 'bad_args');
});
await t('ideas: pieces built on, forks grown from, the chain with every author', async () => {
  const { message: idea } = await theo.call('message.send', { channelId: chText.id, kind: 'idea', body: 'a plotter that draws with sand' });
  await maya.call('message.send', { channelId: chText.id, kind: 'idea', body: 'map failures onto it', buildsOn: idea.id });
  await owner.call('message.send', { channelId: chText.id, kind: 'idea', body: 'sand music instead', forkOf: idea.id });
  const c = await theo.call('idea.chain', { messageId: idea.id });
  assert.equal(c.pieces[0].authorId, maya.me.id); assert.equal(c.forks[0].authorId, owner.me.id);
  assert.equal(await err(theo.call('message.send', { channelId: chText.id, body: 'x', buildsOn: c.pieces[0].replyTo || 'msg_nope' })), 'not_found');
});

console.log('\nCLOSENESS AND PRESENCE');
await t('a one-way message takes no replies for 10 minutes (its author may add to it)', async () => {
  const { message } = await maya.call('message.send', { channelId: chText.id, kind: 'oneway', body: 'I needed to say this without an answer' });
  assert.ok(message.repliesOpenAt - Date.now() > 9 * 60e3);
  const e = await theo.call('message.send', { channelId: chText.id, body: 'but', replyTo: message.id }).catch(x => x);
  assert.equal(e.code, 'wait_first'); assert.equal(e.data.repliesOpenAt, message.repliesOpenAt);
  assert.ok((await maya.call('message.send', { channelId: chText.id, body: 'and', replyTo: message.id })).message);
});
await t('presence carries status, a mood and where you are; going offline is heard', async () => {
  const seen = events(theo);
  await maya.call('presence.set', { status: 'away', mood: { emoji: '🌧', note: 'slow day' }, where: chText.id }); await sleep(30);
  const p = seen.filter(([e]) => e === 'presence').pop()[1];
  assert.deepEqual([p.status, p.mood.emoji, p.where], ['away', '🌧', chText.id]);
  assert.equal((await theo.call('group.get')).members.find(m => m.id === maya.me.id).mood.note, 'slow day');
});
await t('appreciations are seen by the group; nudges reach one person, once a minute', async () => {
  const seenT = events(theo), seenO = events(owner);
  await maya.call('appreciate', { memberId: theo.me.id, note: 'the sand plotter idea changed my week' }); await sleep(30);
  assert.ok(seenO.some(([e, d]) => e === 'appreciation' && d.appreciation.to === theo.me.id));
  assert.equal((await theo.call('appreciation.list', { memberId: theo.me.id })).appreciations[0].from, maya.me.id);
  await maya.call('nudge', { memberId: theo.me.id }); await sleep(30);
  assert.ok(seenT.some(([e, d]) => e === 'nudge' && d.from === maya.me.id)); assert.ok(!seenO.some(([e]) => e === 'nudge'));
  assert.equal(await err(maya.call('nudge', { memberId: theo.me.id })), 'rate_limited');
});
await t('prompt decks', async () => { const r = await theo.call('prompt.draw', { deck: 'connection' }); assert.ok(r.prompt.length > 10); });

console.log('\nSPARRING — THE SERVER HOLDS THE CLOCK');
let sparId;
await t('a challenge to one person; only they accept; turns alternate; out-of-turn is refused', async () => {
  const seen = events(owner);
  const { spar } = await maya.call('spar.challenge', { channelId: chSpar.id, topic: 'Systems thinking makes people worse at acting.', opponentId: theo.me.id, turnSeconds: 30, turns: 4 });
  sparId = spar.id; assert.equal(spar.status, 'open');
  assert.equal(await err(owner.call('spar.accept', { sparId })), 'not_allowed');
  let s = (await theo.call('spar.accept', { sparId })).spar; assert.equal(s.status, 'active'); assert.equal(s.current, theo.me.id);
  assert.equal(await err(maya.call('spar.turn', { sparId, text: 'me first' })), 'not_your_turn');
  s = (await theo.call('spar.turn', { sparId, text: 'Acting without a map is just motion.' })).spar; assert.equal(s.current, maya.me.id);
  await sleep(30); assert.ok(seen.filter(([e]) => e === 'spar.updated').length >= 3, 'everyone in the channel watches');
});
await t('a turn that runs out is posted empty and the other side goes', async () => {
  const sp = core.debug.live.get(sparId); sp.turnEndsAt = Date.now() - 1; core.debug.tick(sparId);
  const s = (await theo.call('spar.get', { sparId })).spar; const last = s.turns[s.turns.length - 1];
  assert.deepEqual([last.by, last.text, last.auto], [maya.me.id, '', true]); assert.equal(s.current, theo.me.id);
});
await t('rules: both must agree; the same rule cannot be asked twice', async () => {
  let s = (await theo.call('spar.rule_propose', { sparId, text: 'One sentence per turn' })).spar; const rule = s.rules[0];
  assert.equal(await err(theo.call('spar.rule_answer', { sparId, ruleId: rule.id, accept: true })), 'not_allowed');
  s = (await maya.call('spar.rule_answer', { sparId, ruleId: rule.id, accept: true })).spar; assert.equal(s.rules[0].status, 'accepted');
  assert.equal(await err(maya.call('spar.rule_propose', { sparId, text: 'one sentence per turn ' })), 'bad_args');
});
await t('it ends when every turn is taken', async () => {
  await theo.call('spar.turn', { sparId, text: 'third' }); const s = (await maya.call('spar.turn', { sparId, text: 'fourth' })).spar;
  assert.equal(s.status, 'ended'); assert.equal(s.turns.length, 4);
});
await t('speed mode: quiet for 5 seconds on your turn loses it', async () => {
  const { spar } = await maya.call('spar.challenge', { channelId: chSpar.id, topic: 'Every invention is mostly theft.', speed: true, turnSeconds: 60 });
  await theo.call('spar.accept', { sparId: spar.id });
  const sp = core.debug.live.get(spar.id); sp.lastKeepalive = Date.now() - 6000; core.debug.tick(spar.id);
  const s = (await maya.call('spar.get', { sparId: spar.id })).spar; assert.equal(s.turns[0].auto, true); assert.equal(s.current, maya.me.id);
  await maya.call('spar.end', { sparId: spar.id });
});

console.log('\nVOICE');
await t('voice rooms: who is in, and call setup passed only between people in the same room', async () => {
  await maya.call('voice.join', { channelId: chVoice.id }); const r = await theo.call('voice.join', { channelId: chVoice.id });
  assert.deepEqual(r.members, [maya.me.id]);
  const seen = events(maya); await theo.call('voice.signal', { to: maya.me.id, data: '{"sdp":"offer"}' }); await sleep(30);
  assert.ok(seen.some(([e, d]) => e === 'voice.signal' && d.from === theo.me.id));
  assert.equal(await err(owner.call('voice.signal', { to: maya.me.id, data: 'x' })), 'not_allowed');
  assert.equal(await err(theo.call('message.send', { channelId: chVoice.id, body: 'x' })), 'wrong_kind');
});

console.log('\nHTTP — THE SAME CORE');
await t('sign in over HTTP with the same handshake, then call with the token', async () => {
  const id = identity(), { invite } = await owner.call('invite.create', {});
  const h = await post('auth.hello', { pub: id.pub, contract: PIN, invite: invite.code, name: 'Ava' }); assert.equal(h.status, 200);
  const p = await post('auth.prove', { proof: await id.open(h.body.result), challengeId: h.body.result.challengeId }); assert.equal(p.status, 200);
  const g = await post('group.get', {}, p.body.result.token); assert.equal(g.body.result.me.name, 'Ava');
  assert.equal((await post('channel.create', { name: 'x', kind: 'text' }, p.body.result.token)).status, 403);
});
await t('HTTP: no token 401, wrong contract 409, unknown command 404, the contract is published', async () => {
  assert.equal((await post('group.get', {})).status, 401);
  assert.equal((await post('auth.hello', { pub: identity().pub, contract: { version: '1', hash: '0'.repeat(64) } })).status, 409);
  assert.equal((await post('no.such', {})).status, 404);
  const c = await (await fetch(`http://127.0.0.1:${port}/api/group/contract`)).json(); assert.equal(c.hash, C.HASH);
});

console.log('\nREMOVAL');
await t('a removed member is told, disconnected, and their key cannot sign in again', async () => {
  const seen = events(theo); await maya.call('member.remove', { memberId: theo.me.id }); await sleep(50);
  assert.ok(seen.some(([e]) => e === 'removed'));
  assert.equal(await err(join({ identity: theoId })), 'removed');
});

await t('the CLI acts as the owner through the same core: status, invite, roles, audit', async () => {
  const out = []; const run = (...a) => cli.main(['--db', dbPath, ...a], (s) => out.push(s));
  assert.equal(run('status'), 0); assert.ok(/members/.test(out.pop()));
  assert.equal(run('setup-code'), 1, 'no second owner by setup code');
  assert.equal(run('invite', '--uses', '3'), 0); assert.ok(/invite: \S+/.test(out.pop()));
  assert.equal(run('set-role', maya.me.id, 'moderator'), 0);
  assert.equal(run('audit', '50'), 0); assert.ok(/cli\s+member.set_role/.test(out.pop()));
  assert.equal(run('call', 'nope'), 1);
});

console.log('\nADMINISTRATION');
let rafe, jun; const rafeId = identity(), junId = identity();
await t('setup: two more members', async () => {
  const { invite } = await owner.call('invite.create', { uses: 2 });
  rafe = await join({ identity: rafeId, invite: invite.code, name: 'Rafe' }); jun = await join({ identity: junId, invite: invite.code, name: 'Jun' });
  await owner.call('member.set_role', { memberId: maya.me.id, roleId: 'admin' });
});
await t('a warning is logged and the member is told; a member cannot warn', async () => {
  const seen = events(rafe); const { entry } = await maya.call('member.warn', { memberId: rafe.me.id, reason: 'keep it kind' }); await sleep(30);
  assert.equal(entry.kind, 'warn'); assert.ok(seen.some(([e, d]) => e === 'moderation' && d.entry.reason === 'keep it kind'));
  assert.equal(await err(jun.call('member.warn', { memberId: rafe.me.id, reason: 'x' })), 'not_allowed');
  assert.equal((await maya.call('member.get', { memberId: rafe.me.id })).member.warnings, 1);
});
await t('a timeout: they can read but not post, react, type or join voice; 0 lifts it', async () => {
  await maya.call('member.timeout', { memberId: rafe.me.id, minutes: 10, reason: 'cool off' });
  const e = await rafe.call('message.send', { channelId: chText.id, body: 'x' }).catch(x => x); assert.equal(e.code, 'timed_out'); assert.ok(e.data.until > Date.now());
  assert.equal(await err(rafe.call('voice.join', { channelId: chVoice.id })), 'timed_out');
  assert.ok((await rafe.call('message.history', { channelId: chText.id })).messages.length, 'reading still works');
  await maya.call('member.timeout', { memberId: rafe.me.id, minutes: 0 });
  assert.ok((await rafe.call('message.send', { channelId: chText.id, body: 'back' })).message);
});
await t('ranks hold for moderation too: an admin cannot ban the owner or another admin', async () => {
  assert.equal(await err(maya.call('member.ban', { memberId: owner.me.id, reason: 'x' })), 'not_allowed');
  await owner.call('member.set_role', { memberId: jun.me.id, roleId: 'admin' });
  assert.equal(await err(maya.call('member.timeout', { memberId: jun.me.id, minutes: 5 })), 'not_allowed');
  await owner.call('member.set_role', { memberId: jun.me.id, roleId: 'member' });
});
await t('a temporary ban closes them out and refuses their key until it ends; unban lets them back', async () => {
  const seen = events(rafe); await maya.call('member.ban', { memberId: rafe.me.id, hours: 24, reason: 'spam' }); await sleep(50);
  assert.ok(seen.some(([e, d]) => e === 'removed' && d.banned));
  const e = await join({ identity: rafeId }).catch(x => x); assert.equal(e.code, 'banned'); assert.equal(e.data.reason, 'spam');
  assert.ok((await maya.call('ban.list')).bans.some(b => b.id === rafe.me.id));
  await maya.call('member.unban', { memberId: rafe.me.id }); rafe = await join({ identity: rafeId }); assert.equal(rafe.me.name, 'Rafe');
});
await t('a permanent ban (no hours)', async () => {
  const { entry } = await maya.call('member.ban', { memberId: rafe.me.id, reason: 'threats' }); assert.ok(entry.until > Date.now() + 1e12);
  assert.equal(await err(join({ identity: rafeId })), 'banned'); await maya.call('member.unban', { memberId: rafe.me.id }); rafe = await join({ identity: rafeId });
});
await t('reset: the profile is cleared and every device signed out', async () => {
  await rafe.call('member.update_me', { name: 'R4fe!!', about: 'spam spam', color: '#ff0000' });
  const seen = events(rafe); const r = await maya.call('member.reset', { memberId: rafe.me.id, what: ['profile', 'sessions'], reason: 'offensive name' }); await sleep(50);
  assert.equal(r.member.name, 'Member'); assert.equal(r.member.about, ''); assert.ok(seen.some(([e]) => e === 'removed'));
  rafe = await join({ identity: rafeId }); assert.equal(rafe.me.name, 'Member', 'they sign in again with their own key');
});
await t('email: a member sets theirs; only admins see it; an admin can change it; the owner\'s only by the owner', async () => {
  await jun.call('member.update_me', { email: 'jun@example.com' });
  assert.equal((await rafe.call('group.get')).members.find(m => m.id === jun.me.id).email, undefined, 'members do not see emails');
  assert.equal((await maya.call('member.get', { memberId: jun.me.id })).member.email, 'jun@example.com');
  assert.equal((await maya.call('member.set_email', { memberId: jun.me.id, email: 'jun@new.example' })).member.email, 'jun@new.example');
  assert.equal(await err(maya.call('member.set_email', { memberId: owner.me.id, email: 'x@y.zz' })), 'not_allowed');
  assert.equal(await err(jun.call('member.update_me', { email: 'not an email' })), 'bad_args');
});
await t('recovery: the phrase is checked, wrong ones are counted, the code moves the account to a new device', async () => {
  await jun.call('member.set_recovery_phrase', { phrase: 'Purple  sand plotter at midnight' });
  assert.equal((await maya.call('member.get', { memberId: jun.me.id })).member.hasRecoveryPhrase, true);
  const bad = await maya.call('recovery.issue', { memberId: jun.me.id, phrase: 'red sand plotter at noon' }).catch(x => x); assert.equal(bad.code, 'auth_failed'); assert.equal(bad.data.triesLeft, 4);
  const { code } = await maya.call('recovery.issue', { memberId: jun.me.id, phrase: 'purple sand plotter at MIDNIGHT' });   // spacing and case do not matter
  const { message } = await jun.call('message.send', { channelId: chText.id, body: 'before the phone died' });
  const newDevice = identity(), seenOld = events(jun);
  const back = await join({ identity: newDevice, invite: code }); await sleep(50);
  assert.equal(back.me.id, jun.me.id, 'the same account'); assert.ok(seenOld.some(([e]) => e === 'removed'), 'the old device is signed out');
  assert.equal(await err(join({ identity: junId })), 'invite_invalid', 'the old key no longer works');
  assert.ok((await back.call('message.history', { channelId: chText.id })).messages.some(m => m.id === message.id && m.authorId === jun.me.id), 'history stays theirs');
  assert.equal(await err(join({ identity: identity(), invite: code })), 'invite_invalid', 'the code is spent');
  jun = back;
});
await t('recovery: 5 wrong phrases lock it; only the owner may override, with a reason', async () => {
  await rafe.call('member.set_recovery_phrase', { phrase: 'a long enough phrase here' });
  for (let i = 0; i < 5; i++) await maya.call('recovery.issue', { memberId: rafe.me.id, phrase: 'wrong wrong wrong ' + i }).catch(() => {});
  assert.equal(await err(maya.call('recovery.issue', { memberId: rafe.me.id, phrase: 'a long enough phrase here' })), 'locked');
  assert.equal(await err(maya.call('recovery.issue', { memberId: rafe.me.id, override: true, reason: 'x' })), 'not_allowed');
  assert.equal(await err(owner.call('recovery.issue', { memberId: rafe.me.id, override: true })), 'bad_args');
  assert.ok((await owner.call('recovery.issue', { memberId: rafe.me.id, override: true, reason: 'verified in person at the meetup' })).code);
  const kinds = (await owner.call('moderation.list', { memberId: rafe.me.id })).entries.map(e => e.kind);
  assert.ok(kinds.includes('recovery_failed') && kinds.includes('recovery_issued'));
});
await t('reports reach whoever handles them, with the message; the reporter hears it was resolved', async () => {
  const { message } = await jun.call('message.send', { channelId: chText.id, body: 'something unkind' });
  const seenAdmin = events(maya), seenMember = events(rafe);
  const { report } = await rafe.call('report.create', { messageId: message.id, reason: 'felt dismissive' }); await sleep(30);
  assert.ok(seenAdmin.some(([e, d]) => e === 'report.new' && d.report.message.id === message.id));
  assert.ok(!seenMember.some(([e]) => e === 'report.new'), 'an ordinary member is not told about reports');
  assert.equal(await err(rafe.call('report.list', {})), 'not_allowed');
  assert.equal((await maya.call('report.list', {})).reports[0].memberId, jun.me.id);
  await maya.call('report.resolve', { reportId: report.id, note: 'talked with them' }); await sleep(30);
  assert.ok(seenMember.some(([e, d]) => e === 'report.resolved' && d.report.note === 'talked with them'));
});

await t('the real rate limit: the 21st command in a second is refused', async () => {
  const c2 = createCore({ dbPath: path.join(dir, 'limit.db') }), conn = { send() {}, memberId: null }; let last;
  for (let i = 0; i < 21; i++) last = c2.call(conn, 'auth.logout', {});
  assert.equal(last.error.code, 'rate_limited'); c2.close();
});
owner.close(); maya.close(); server.close(); core.close();
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
