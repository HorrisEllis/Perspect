'use strict';
/* group/core.js — the one place a Perspect group's commands run. WebSocket (group/ws.js), HTTP (group/http.js) and the
 * CLI (group/cli.js) are doors onto it and behave the same, because every call goes through call():
 *   1. the contract checks the command and its arguments (group/contract.js)   2. the caller is signed in (or the
 *   command is open to anyone)   3. the caller holds the permission, in the channel if it is channel scoped, and
 *   outranks whoever they act on   4. the handler runs   5. events go to the connections allowed to see them.
 * A connection is { send(event, data), memberId, token, cli }; the CLI's connection acts as the owner, logged as "cli". */
const crypto = require('crypto');
const C = require('./contract');
const Store = require('./store');
const R = require('../co-creation-relay/relay-identity');

class GroupError extends Error { constructor(code, message, data) { super(message || code); this.code = code; this.data = data; } }
const fail = (code, message, data) => { throw new GroupError(code, message, data); };
const CHANNEL_PERMS = ['channel.view', 'message.send', 'message.manage', 'voice.join'];
const LIMITS = C.CONTRACT.transport.limits;

function createCore(opts) {
  const S = Store.open(opts.dbPath);
  const conns = new Set();                 // live connections (WebSocket); HTTP calls are one-shot
  const pending = new Map();               // challengeId → { pub, invite, name, check, at }
  const status = new Map();                // memberId → 'here' | 'away'
  const voice = new Map();                 // memberId → channelId
  const mood = new Map();                  // memberId → { emoji, note }
  const where = new Map();                 // memberId → channelId
  const nudged = new Map();                // 'from>to' → ms
  const PROMPTS = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'prompts.json'), 'utf8'));
  const ONEWAY_MS = 10 * 60e3, RULE_MS = 30e3, SPEED_QUIET_MS = 5e3;
  const log = opts.log || (() => {});

  // ── permissions ────────────────────────────────────────────────────────────────────────
  const roleOf = (m) => S.role(m.roleId) || S.role('member');
  const isOwner = (conn, m) => conn.cli || (m && m.roleId === 'owner');
  const rankOf = (conn, m) => conn.cli ? Infinity : roleOf(m).rank;
  function permsOf(conn, m, channel) {
    if (isOwner(conn, m)) return new Set(C.PERMISSIONS);
    const role = roleOf(m), set = new Set(role.permissions.includes('*') ? C.PERMISSIONS : role.permissions);
    const ov = channel && channel.overrides && channel.overrides[role.id];
    if (ov) { (ov.deny || []).forEach(p => set.delete(p)); (ov.allow || []).forEach(p => CHANNEL_PERMS.includes(p) && set.add(p)); }
    return set;
  }
  const can = (conn, m, perm, channel) => permsOf(conn, m, channel).has(perm);
  const need = (conn, m, perm, channel) => { if (!can(conn, m, perm, channel)) fail('not_allowed', 'you need ' + perm + (channel ? ' in #' + channel.name : '')); };
  const outrank = (conn, me, target) => { if (target.id === (me && me.id)) fail('not_allowed', 'not on yourself'); if (target.roleId === 'owner' || rankOf(conn, me) <= roleOf(target).rank) fail('not_allowed', 'they rank at or above you'); };
  const grantable = (conn, me, rank, perms) => {
    if (rank >= rankOf(conn, me)) fail('not_allowed', 'a role must rank below your own');
    const mine = permsOf(conn, me); const extra = perms.filter(p => !mine.has(p)); if (extra.length) fail('not_allowed', 'you cannot grant what you do not hold: ' + extra.join(', '));
  };
  function modAct(conn, me, t, kind, reason, until, quiet) {
    const e = S.modlogAdd(t.id, kind, conn.cli ? 'cli' : me.id, reason, until); S.audit(conn.cli ? 'cli' : me.id, 'member.' + kind, t.id, { reason: reason || '', until: until || null });
    if (!quiet) emitWhere('moderation', { entry: e }, (c, m) => m.id === t.id || can(c, m, 'member.moderate'));
    return e;
  }
  const channelOr404 = (id) => S.channel(id) || fail('not_found', 'no such channel');
  const memberOr404 = (id) => { const m = S.member(id); if (!m || m.removed) fail('not_found', 'no such member'); return m; };

  // ── what the outside sees ───────────────────────────────────────────────────────────────
  const pubMember = (m) => ({ id: m.id, name: m.name, note: m.note, about: m.about || '', color: m.color || null, roleId: m.roleId, status: status.get(m.id) || (online(m.id) ? 'here' : 'offline'), mood: mood.get(m.id) || null, where: where.get(m.id) || null, joinedAt: m.joinedAt });
  const presenceOf = (id) => ({ memberId: id, status: status.get(id) || (online(id) ? 'here' : 'offline'), mood: mood.get(id) || null, where: where.get(id) || null });
  const online = (id) => [...conns].some(c => c.memberId === id);
  const activeUntil = (until) => (until && until > Date.now() ? until : null);
  const adminMember = (m) => Object.assign(pubMember(m), { email: m.email || null, timeoutUntil: activeUntil(m.timeoutUntil), timeoutReason: activeUntil(m.timeoutUntil) ? m.timeoutReason : null,
    bannedUntil: activeUntil(m.bannedUntil), banReason: activeUntil(m.bannedUntil) ? m.banReason : null, warnings: S.warnings(m.id), hasRecoveryPhrase: !!m.recoveryHash });
  // to every live connection whose member passes a test (holds a permission, or is the one it is about)
  function emitWhere(event, data, test) { for (const c of conns) { if (!c.memberId) continue; const m = S.member(c.memberId); if (m && test(c, m)) try { c.send(event, data); } catch (e) {} } }
  const kick = (memberId, event, data) => { for (const c of [...conns]) if (c.memberId === memberId) { try { c.send(event, data); } catch (e) {} c.memberId = null; conns.delete(c); if (c.close) c.close(); } };
  const PHRASE = (p) => String(p || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const phraseHash = (phrase, salt) => crypto.scryptSync(PHRASE(phrase), salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
  const attempts = new Map();              // memberId → [ms] of wrong phrases
  const TIMED_OUT_BLOCKS = new Set(['message.send', 'message.edit', 'reaction.toggle', 'typing', 'voice.join', 'voice.signal', 'appreciate', 'nudge', 'spar.challenge', 'spar.accept', 'spar.turn', 'spar.rule_propose']);
  const viewable = (conn, m) => S.channels().filter(ch => can(conn, m, 'channel.view', ch));
  function emit(event, data, channel, except) {
    for (const c of conns) {
      if (!c.memberId || c === except) continue;
      if (channel) { const m = S.member(c.memberId); if (!m || !can(c, m, 'channel.view', channel)) continue; }
      try { c.send(event, data); } catch (e) { /* a dead socket closes on its own */ }
    }
  }
  const emitTo = (memberId, event, data) => { for (const c of conns) if (c.memberId === memberId) try { c.send(event, data); } catch (e) {} };
  const audit = (conn, me, action, target, detail) => S.audit(conn.cli ? 'cli' : me.id, action, target, detail);

  // ── the spar engine: one timer per live spar; state saved on every change ──────────────────────
  const live = new Map();                  // sparId → spar (open and active)
  const timers = new Map();                // sparId → timeout
  const pubSpar = (sp) => { const { ruleTexts, lastKeepalive, ...rest } = sp; return rest; };
  function sparSave(sp) {
    S.sparSave(sp); if (sp.status === 'ended') { live.delete(sp.id); clearTimeout(timers.get(sp.id)); timers.delete(sp.id); } else live.set(sp.id, sp);
    const out = pubSpar(sp); emit('spar.updated', { spar: out }, S.channel(sp.channelId)); return out;
  }
  function sparOr404(id, conn, me) {
    const sp = live.get(id) || S.spar(id); if (!sp) fail('not_found', 'no such spar');
    const ch = S.channel(sp.channelId); if (!ch) fail('not_found', 'its channel is gone'); need(conn, me, 'channel.view', ch); return sp;
  }
  function startTurn(sp) { sp.turnEndsAt = Date.now() + sp.turnSeconds * 1000; sp.lastKeepalive = Date.now(); arm(sp); }
  function takeTurn(sp, by, text, auto) {
    sp.turns.push({ n: sp.turns.length + 1, by, text, at: Date.now(), auto });
    if (sp.turns.length >= sp.turnsTotal) return endSpar(sp, 'all turns taken');
    sp.current = by === sp.by ? sp.opponentId : sp.by; startTurn(sp); return sparSave(sp);
  }
  function endSpar(sp, reason) { sp.status = 'ended'; sp.current = null; sp.turnEndsAt = null; sp.endedReason = reason; return sparSave(sp); }
  // the next thing that can happen: a turn running out, speed-mode quiet, or a rule's 30 seconds
  function arm(sp) {
    clearTimeout(timers.get(sp.id)); if (sp.status === 'ended') return;
    const now = Date.now(), at = [];
    if (sp.status === 'active') { at.push(sp.turnEndsAt); if (sp.speed) at.push((sp.lastKeepalive || now) + SPEED_QUIET_MS); }
    sp.rules.filter(r => r.status === 'pending').forEach(r => at.push(r.expiresAt));
    if (!at.length) return;
    const t = setTimeout(() => tick(sp.id), Math.max(10, Math.min(...at) - now + 5)); if (t.unref) t.unref(); timers.set(sp.id, t);
  }
  function tick(id) {
    const sp = live.get(id); if (!sp) return; const now = Date.now(); let changed = false;
    sp.rules.forEach(r => { if (r.status === 'pending' && now >= r.expiresAt) { r.status = 'declined'; changed = true; } });
    if (sp.status === 'active' && (now >= sp.turnEndsAt || (sp.speed && now - (sp.lastKeepalive || now) >= SPEED_QUIET_MS))) return takeTurn(sp, sp.current, '', true);
    if (changed) sparSave(sp); arm(sp);
  }
  // spars that were live when the server stopped carry on from where their clocks are
  for (const sp of S.sparsLive()) { live.set(sp.id, sp); if (sp.status === 'active' && sp.speed) sp.lastKeepalive = Date.now(); arm(sp); }

  // ── the commands: each gets (args, conn, me) and returns its result ─────────────────────────
  const H = {
    'auth.hello'(a, conn) {
      if (a.contract.hash !== C.HASH) fail('contract_mismatch', 'this server speaks ' + C.CONTRACT.name + ' ' + C.VERSION, { version: C.VERSION, hash: C.HASH });
      let pubBytes; try { pubBytes = R.fromB64(a.pub); } catch (e) { pubBytes = []; } if (pubBytes.length !== 32) fail('bad_args', 'pub must be a 32-byte X25519 key, base64');
      const known = S.memberByPub(a.pub);
      if (known && known.removed) fail('removed', 'this key was removed from the group');
      if (known && activeUntil(known.bannedUntil)) fail('banned', 'this key is banned', { until: known.bannedUntil, reason: known.banReason });
      if (!known) {
        const ownerless = !S.meta('ownerId');
        if (!(ownerless && S.setupMatches(a.invite)) && !(a.invite && (S.inviteGet(a.invite) || S.recoveryCodeGet(a.invite)))) fail('invite_invalid', 'a new key needs a valid invite');
      }
      const eph = R.generateEphemeral(), nonce = crypto.randomBytes(16), check = crypto.randomBytes(16);
      const key = R.hkdf(R.x25519(eph.priv, pubBytes), nonce, 'perspect-group-auth-v1', 32);
      const challengeId = crypto.randomBytes(12).toString('base64url');
      for (const [k, v] of pending) if (Date.now() - v.at > LIMITS.authSeconds * 1000) pending.delete(k);
      pending.set(challengeId, { pub: a.pub, invite: a.invite || null, name: a.name || null, check, at: Date.now() });
      conn.challengeId = challengeId;
      return { contract: { version: C.VERSION, hash: C.HASH }, challengeId, ephPub: R.toB64(eph.pub), nonce: R.toB64(nonce), envelope: R.encryptRaw(key, check) };
    },
    'auth.prove'(a, conn) {
      const id = a.challengeId || conn.challengeId, p = id && pending.get(id); pending.delete(id); conn.challengeId = null;
      if (!p || Date.now() - p.at > LIMITS.authSeconds * 1000) fail('auth_failed', 'no challenge waiting (or it expired); start with auth.hello');
      const proof = Buffer.from(a.proof, 'base64');
      if (proof.length !== p.check.length || !crypto.timingSafeEqual(proof, p.check)) fail('auth_failed', 'the proof did not match');
      let me = S.memberByPub(p.pub), joined = false;
      if (me && me.removed) fail('removed', 'this key was removed from the group');
      const recovering = !me && S.recoveryCodeGet(p.invite);
      if (recovering) {   // the account moves to this device: the new key replaces the old, everything else stays
        const owner = S.member(recovering); if (!owner || owner.removed) fail('invite_invalid', 'that account is gone');
        if (activeUntil(owner.bannedUntil)) fail('banned', 'this account is banned', { until: owner.bannedUntil, reason: owner.banReason });
        kick(owner.id, 'removed', { reason: 'signed in on a new device' }); S.memberSet(owner.id, 'pub', p.pub); S.sessionsEnd(owner.id); S.recoveryCodeSpend(p.invite);
        S.modlogAdd(owner.id, 'recovered', owner.id, 'moved to a new device'); S.audit(owner.id, 'recovery.used', owner.id, {}); me = S.member(owner.id);
      }
      if (!me) {   // spend the invite only now, after the key is proven
        const name = (p.name || 'New member').slice(0, 40);
        if (!S.meta('ownerId') && S.setupMatches(p.invite)) { me = S.memberCreate(p.pub, name, 'owner'); S.meta('ownerId', me.id); S.setupSpend(); }
        else { const inv = p.invite && S.inviteGet(p.invite); if (!inv) fail('invite_invalid', 'the invite is unknown, used up or expired'); S.inviteUse(inv.code); me = S.memberCreate(p.pub, name, S.role(inv.roleId) ? inv.roleId : 'member'); }
        joined = true; S.audit(me.id, 'member.join', me.id, { name: me.name, roleId: me.roleId });
      }
      conn.memberId = me.id; conn.token = S.sessionCreate(me.id, LIMITS.tokenHours);
      if (joined) emit('member.joined', { member: pubMember(me) }, null, conn);
      if (conn.live) { conns.add(conn); status.set(me.id, 'here'); emit('presence', presenceOf(me.id), null, conn); }
      return { me: pubMember(me), group: S.group(), token: conn.token };
    },
    'auth.logout'(a, conn) { if (conn.token) S.sessionEnd(conn.token); conn.token = null; return {}; },
    'group.get'(a, conn, me) {
      const v = {}; for (const [mid, ch] of voice) (v[ch] = v[ch] || []).push(mid);
      return { group: S.group(), channels: viewable(conn, me), members: S.members().map(pubMember), roles: S.roles(), me: me ? pubMember(me) : null, myPermissions: [...permsOf(conn, me)], voice: v };
    },
    'group.update'(a, conn, me) { if (a.name != null) S.meta('name', a.name); if (a.about != null) S.meta('about', a.about); audit(conn, me, 'group.update', '', a); emit('group.updated', { group: S.group() }); return { group: S.group() }; },
    'group.transfer_owner'(a, conn, me) {
      const t = memberOr404(a.memberId); if (me && t.id === me.id) fail('bad_args', 'you already own it');
      const old = S.meta('ownerId'); S.memberUpdate(t.id, { roleId: 'owner' }); S.meta('ownerId', t.id);
      if (old && old !== t.id && S.member(old)) { S.memberUpdate(old, { roleId: 'admin' }); emit('member.updated', { member: pubMember(S.member(old)) }); }
      audit(conn, me, 'group.transfer_owner', t.id, {}); emit('member.updated', { member: pubMember(S.member(t.id)) }); emit('group.updated', { group: S.group() });
      return { group: S.group() };
    },
    'invite.create'(a, conn, me) {
      const roleId = a.roleId || 'member', role = S.role(roleId) || fail('not_found', 'no such role');
      if (roleId === 'owner' || role.rank >= rankOf(conn, me)) fail('not_allowed', 'an invite can only give a role ranked below your own');
      const inv = S.inviteCreate(a.uses || 1, a.hours || 72, roleId, conn.cli ? 'cli' : me.id); audit(conn, me, 'invite.create', '', { roleId, uses: inv.usesLeft });
      return { invite: inv };
    },
    'invite.list'() { return { invites: S.invites() }; },
    'invite.revoke'(a, conn, me) { if (!S.inviteRevoke(a.code)) fail('not_found', 'no such invite'); audit(conn, me, 'invite.revoke', '', {}); return {}; },
    'member.update_me'(a, conn, me) { if (!me) fail('not_allowed', 'the CLI is not a member'); const m = S.memberUpdate(me.id, { name: a.name, note: a.note, about: a.about, color: a.color, email: a.email }); emit('member.updated', { member: pubMember(m) }); return { me: Object.assign(pubMember(m), { email: m.email }) }; },
    'member.set_recovery_phrase'(a, conn, me) {
      if (!me) fail('not_allowed', 'the CLI is not a member'); if (PHRASE(a.phrase).length < 12) fail('bad_args', 'at least 12 characters');
      const salt = crypto.randomBytes(16).toString('hex'); S.memberSet(me.id, 'recoverySalt', salt); S.memberSet(me.id, 'recoveryHash', phraseHash(a.phrase, salt)); S.audit(me.id, 'member.set_recovery_phrase', me.id, {}); return {};
    },
    // ── administration: every action below someone's rank, every action logged ──
    'member.get'(a, conn, me) { const t = memberOr404(a.memberId); return { member: adminMember(t), modlog: S.modlog(t.id, 100) }; },
    'member.warn'(a, conn, me) { const t = memberOr404(a.memberId); outrank(conn, me, t); return { entry: modAct(conn, me, t, 'warn', a.reason) }; },
    'member.timeout'(a, conn, me) {
      const t = memberOr404(a.memberId); outrank(conn, me, t); const until = a.minutes ? Date.now() + a.minutes * 60e3 : null;
      S.memberSet(t.id, 'timeoutUntil', until); S.memberSet(t.id, 'timeoutReason', a.reason || '');
      if (until && voice.has(t.id)) { voice.delete(t.id); emit('voice.state', { channelId: null, memberId: t.id, joined: false }); }
      const e = modAct(conn, me, t, until ? 'timeout' : 'untimeout', a.reason, until); emit('member.updated', { member: pubMember(S.member(t.id)) }); return { entry: e };
    },
    'member.ban'(a, conn, me) {
      const t = memberOr404(a.memberId); outrank(conn, me, t); const until = a.hours ? Date.now() + a.hours * 3600e3 : 8.64e15;
      S.memberSet(t.id, 'bannedUntil', until); S.memberSet(t.id, 'banReason', a.reason); S.sessionsEnd(t.id); voice.delete(t.id); status.delete(t.id);
      const e = modAct(conn, me, t, 'ban', a.reason, until); kick(t.id, 'removed', { banned: true, until, reason: a.reason }); emit('member.left', { memberId: t.id }); return { entry: e };
    },
    'member.unban'(a, conn, me) { const t = S.member(a.memberId) || fail('not_found', 'no such member'); S.memberSet(t.id, 'bannedUntil', null); S.memberSet(t.id, 'banReason', null); return { entry: modAct(conn, me, t, 'unban', a.reason) }; },
    'ban.list'() { return { bans: S.banned().map(adminMember) }; },
    'member.reset'(a, conn, me) {
      const t = memberOr404(a.memberId); outrank(conn, me, t);
      if (a.what.includes('profile')) { S.memberUpdate(t.id, { name: 'Member', note: '', about: '', color: null }); mood.delete(t.id); }
      if (a.what.includes('sessions')) { S.sessionsEnd(t.id); kick(t.id, 'removed', { reason: 'signed out by an admin; sign in again' }); }
      modAct(conn, me, t, 'reset', (a.reason || '') + ' [' + a.what.join(', ') + ']'); const m = S.member(t.id);
      emit('member.updated', { member: pubMember(m) }); return { member: adminMember(m) };
    },
    'member.set_email'(a, conn, me) { const t = memberOr404(a.memberId); if (t.roleId === 'owner' && !isOwner(conn, me)) fail('not_allowed', 'only the owner changes their own email'); S.memberUpdate(t.id, { email: a.email || null }); modAct(conn, me, t, 'email', 'changed', null, true); return { member: adminMember(S.member(t.id)) }; },
    'recovery.issue'(a, conn, me) {
      const t = memberOr404(a.memberId); if (t.roleId === 'owner' && !isOwner(conn, me)) fail('not_allowed', 'only the owner recovers the owner');
      if (a.override) { if (!isOwner(conn, me)) fail('not_allowed', 'only the owner may issue without the phrase'); if (!a.reason) fail('bad_args', 'an override needs a reason'); }
      else {
        if (!t.recoveryHash) fail('not_found', 'they have not set a recovery phrase');
        const now = Date.now(), tries = (attempts.get(t.id) || []).filter(x => now - x < 3600e3); attempts.set(t.id, tries);
        if (tries.length >= 5) fail('locked', 'too many wrong phrases for this account', { until: tries[0] + 3600e3 });
        const ok = crypto.timingSafeEqual(Buffer.from(phraseHash(a.phrase, t.recoverySalt), 'hex'), Buffer.from(t.recoveryHash, 'hex'));
        if (!ok) { tries.push(now); modAct(conn, me, t, 'recovery_failed', 'wrong phrase (' + tries.length + ' of 5 this hour)', null, true); fail('auth_failed', 'the phrase does not match', { triesLeft: 5 - tries.length }); }
        attempts.delete(t.id);
      }
      const code = S.recoveryCodeAdd(t.id); modAct(conn, me, t, 'recovery_issued', a.override ? 'override: ' + a.reason : 'phrase matched', code.expiresAt, true);
      return code;
    },
    'moderation.list'(a) { return { entries: S.modlog(a.memberId || null, a.limit || 50) }; },
    'report.create'(a, conn, me) {
      if (!me) fail('not_allowed', 'the CLI is not a member'); if (!a.memberId && !a.messageId) fail('bad_args', 'report a member or a message');
      let msg = null; if (a.messageId) { msg = S.message(a.messageId) || fail('not_found', 'no such message'); need(conn, me, 'channel.view', S.channel(msg.channelId)); }
      if (a.memberId) memberOr404(a.memberId);
      const r = S.reportAdd({ by: me.id, memberId: a.memberId || (msg && msg.authorId), messageId: a.messageId, channelId: msg && msg.channelId, reason: a.reason });
      emitWhere('report.new', { report: Object.assign({}, r, { message: msg }) }, (c, m) => can(c, m, 'report.handle')); return { report: r };
    },
    'report.list'(a) { return { reports: S.reports(a.status || 'open', a.limit || 50).map(r => Object.assign(r, { message: r.messageId ? S.message(r.messageId) : null })) }; },
    'report.resolve'(a, conn, me) {
      const r = S.report(a.reportId) || fail('not_found', 'no such report'); const n = S.reportResolve(r.id, conn.cli ? 'cli' : me.id, a.note); audit(conn, me, 'report.resolve', r.id, { note: a.note || '' });
      emitWhere('report.resolved', { report: n }, (c, m) => m.id === r.by || can(c, m, 'report.handle')); return { report: n };
    },
    'member.set_role'(a, conn, me) {
      const t = memberOr404(a.memberId); outrank(conn, me, t);
      const role = S.role(a.roleId) || fail('not_found', 'no such role'); if (role.id === 'owner') fail('not_allowed', 'ownership moves only with group.transfer_owner');
      if (role.rank >= rankOf(conn, me)) fail('not_allowed', 'you can only give roles ranked below your own');
      const m = S.memberUpdate(t.id, { roleId: role.id }); audit(conn, me, 'member.set_role', t.id, { from: t.roleId, to: role.id });
      emit('member.updated', { member: pubMember(m) }); return { member: pubMember(m) };
    },
    'member.remove'(a, conn, me) {
      const t = memberOr404(a.memberId); outrank(conn, me, t); S.memberRemove(t.id); voice.delete(t.id); status.delete(t.id);
      audit(conn, me, 'member.remove', t.id, { name: t.name });
      for (const c of [...conns]) if (c.memberId === t.id) { try { c.send('removed', {}); } catch (e) {} c.memberId = null; conns.delete(c); if (c.close) c.close(); }
      emit('member.left', { memberId: t.id }); return {};
    },
    'role.list'() { return { roles: S.roles() }; },
    'role.create'(a, conn, me) { grantable(conn, me, a.rank, a.permissions); const r = S.roleCreate(a.name, a.rank, [...new Set(a.permissions)]); audit(conn, me, 'role.create', r.id, a); emit('role.changed', { roles: S.roles() }); return { role: r }; },
    'role.update'(a, conn, me) {
      const r = S.role(a.roleId) || fail('not_found', 'no such role'); if (r.id === 'owner') fail('not_allowed', 'the owner role does not change');
      if (r.rank >= rankOf(conn, me)) fail('not_allowed', 'that role ranks at or above you');
      grantable(conn, me, a.rank ?? r.rank, a.permissions ?? r.permissions);
      const n = S.roleUpdate(r.id, { name: a.name, rank: a.rank, permissions: a.permissions && [...new Set(a.permissions)] }); audit(conn, me, 'role.update', r.id, a);
      emit('role.changed', { roles: S.roles() }); return { role: n };
    },
    'role.delete'(a, conn, me) {
      const r = S.role(a.roleId) || fail('not_found', 'no such role'); if (r.builtin) fail('not_allowed', 'builtin roles stay');
      if (r.rank >= rankOf(conn, me)) fail('not_allowed', 'that role ranks at or above you');
      S.roleDelete(r.id); audit(conn, me, 'role.delete', r.id, { name: r.name }); emit('role.changed', { roles: S.roles() }); return {};
    },
    'presence.set'(a, conn, me) {
      if (!me) fail('not_allowed', 'the CLI is not a member');
      if (a.status) status.set(me.id, a.status);
      if (a.clearMood) mood.delete(me.id); else if (a.mood) mood.set(me.id, { emoji: a.mood.emoji, note: a.mood.note || '' });
      if (a.where !== undefined) { const ch = a.where && S.channel(a.where); if (ch && can(conn, me, 'channel.view', ch)) where.set(me.id, ch.id); else where.delete(me.id); }
      emit('presence', presenceOf(me.id)); return {};
    },
    'channel.create'(a, conn, me) { const ch = S.channelCreate(a.name, a.kind, a.category, a.topic); audit(conn, me, 'channel.create', ch.id, a); emit('channel.created', { channel: ch }, ch); return { channel: ch }; },
    'channel.update'(a, conn, me) { channelOr404(a.channelId); const ch = S.channelUpdate(a.channelId, a); audit(conn, me, 'channel.update', ch.id, a); emit('channel.updated', { channel: ch }, ch); return { channel: ch }; },
    'channel.set_override'(a, conn, me) {
      const ch = channelOr404(a.channelId), role = S.role(a.roleId) || fail('not_found', 'no such role');
      if (role.id === 'owner') fail('bad_args', 'the owner is not limited by channels');
      if (role.rank >= rankOf(conn, me)) fail('not_allowed', 'that role ranks at or above you');
      const ov = Object.assign({}, ch.overrides); const allow = [...new Set(a.allow || [])], deny = [...new Set(a.deny || [])];
      if (allow.length || deny.length) ov[role.id] = { allow, deny }; else delete ov[role.id];
      const n = S.channelUpdate(ch.id, { overrides: ov }); audit(conn, me, 'channel.set_override', ch.id, { roleId: role.id, allow, deny });
      emit('channel.updated', { channel: n }); return { channel: n };
    },
    'channel.delete'(a, conn, me) { const ch = channelOr404(a.channelId); S.channelDelete(ch.id); for (const [m, c] of voice) if (c === ch.id) voice.delete(m); audit(conn, me, 'channel.delete', ch.id, { name: ch.name }); emit('channel.deleted', { channelId: ch.id }); return {}; },
    'message.send'(a, conn, me, ch) {
      if (!me) fail('not_allowed', 'the CLI is not a member');
      if (ch.kind === 'voice') fail('wrong_kind', 'a voice room has no messages');
      if (a.replyTo) {
        const r = S.message(a.replyTo); if (!r || r.channelId !== ch.id) fail('not_found', 'no such message to reply to');
        if (r.repliesOpenAt && Date.now() < r.repliesOpenAt && r.authorId !== me.id) fail('wait_first', 'a one-way message is for receiving first', { repliesOpenAt: r.repliesOpenAt });
      }
      const kind = a.kind || 'msg';
      if (a.buildsOn || a.forkOf) { const src = S.message(a.buildsOn || a.forkOf); if (!src || src.kind !== 'idea') fail('not_found', 'no such idea'); if (!can(conn, me, 'channel.view', S.channel(src.channelId))) fail('not_allowed', 'you cannot see that idea'); if (kind !== 'idea') fail('bad_args', 'a piece or a fork is kind idea'); }
      const msg = S.messageCreate(ch.id, me.id, kind, a.body, a.replyTo, { buildsOn: a.buildsOn, forkOf: a.forkOf, repliesOpenAt: kind === 'oneway' ? Date.now() + ONEWAY_MS : null });
      emit('message.new', { message: msg }, ch); return { message: msg };
    },
    'message.edit'(a, conn, me) { const m = S.message(a.messageId) || fail('not_found', 'no such message'); if (!me || m.authorId !== me.id) fail('not_allowed', 'only your own messages'); const n = S.messageEdit(m.id, a.body); emit('message.edited', { message: n }, S.channel(m.channelId)); return { message: n }; },
    'message.delete'(a, conn, me) {
      const m = S.message(a.messageId) || fail('not_found', 'no such message'), ch = S.channel(m.channelId);
      if (!(me && m.authorId === me.id)) { need(conn, me, 'message.manage', ch); audit(conn, me, 'message.delete', m.id, { authorId: m.authorId, channelId: m.channelId }); }
      S.messageDelete(m.id); emit('message.deleted', { messageId: m.id, channelId: m.channelId }, ch); return {};
    },
    'message.history'(a, conn, me, ch) { return S.history(ch.id, a.before, a.limit || 50); },
    'message.since'(a, conn, me) { return S.since(a.after, viewable(conn, me).map(c => c.id), a.limit || 500); },
    'reaction.toggle'(a, conn, me) {
      const m = S.message(a.messageId) || fail('not_found', 'no such message'), ch = S.channel(m.channelId); need(conn, me, 'channel.view', ch);
      if (!me) fail('not_allowed', 'the CLI is not a member');
      const reactions = S.reactionToggle(m.id, a.emoji, me.id); emit('reaction', { messageId: m.id, channelId: ch.id, reactions }, ch); return { messageId: m.id, reactions };
    },
    'typing'(a, conn, me, ch) { if (me) emit('typing', { channelId: ch.id, memberId: me.id }, ch, conn); return {}; },
    'voice.join'(a, conn, me, ch) {
      if (!me) fail('not_allowed', 'the CLI is not a member'); if (ch.kind !== 'voice') fail('wrong_kind', 'not a voice room');
      const before = [...voice].filter(([, c]) => c === ch.id).map(([m]) => m).filter(m => m !== me.id);
      voice.set(me.id, ch.id); emit('voice.state', { channelId: ch.id, memberId: me.id, joined: true }); return { channelId: ch.id, members: before };
    },
    'voice.leave'(a, conn, me) { if (me && voice.has(me.id)) { voice.delete(me.id); emit('voice.state', { channelId: null, memberId: me.id, joined: false }); } return {}; },
    'voice.signal'(a, conn, me) {
      const room = me && voice.get(me.id); if (!room || voice.get(a.to) !== room) fail('not_allowed', 'you are not in a voice room with them');
      emitTo(a.to, 'voice.signal', { from: me.id, data: a.data }); return {};
    },
    'audit.list'(a) { return { entries: S.auditList(a.before, a.limit || 50) }; },
    'idea.chain'(a, conn, me) {
      const idea = S.message(a.messageId); if (!idea || idea.kind !== 'idea') fail('not_found', 'no such idea'); need(conn, me, 'channel.view', S.channel(idea.channelId));
      return { idea, pieces: S.pieces(idea.id), forks: S.forks(idea.id) };
    },
    // ── sparring: the server holds the clock ──
    'spar.challenge'(a, conn, me, ch) {
      if (!me) fail('not_allowed', 'the CLI is not a member'); if (ch.kind !== 'spar') fail('wrong_kind', 'spars happen in a spar channel');
      if (a.opponentId) { const o = memberOr404(a.opponentId); if (o.id === me.id) fail('bad_args', 'not against yourself'); }
      const sp = { id: S.newId('spar'), channelId: ch.id, topic: a.topic, by: me.id, opponentId: a.opponentId || null, status: 'open', turnSeconds: a.turnSeconds || 60, turnsTotal: a.turns || 10, speed: !!a.speed, current: null, turnEndsAt: null, turns: [], rules: [], ruleTexts: [], endedReason: null, createdAt: Date.now() };
      return { spar: sparSave(sp) };
    },
    'spar.accept'(a, conn, me) {
      const sp = sparOr404(a.sparId, conn, me); if (sp.status !== 'open') fail('not_your_turn', 'this spar is not open');
      if (sp.by === me.id || (sp.opponentId && sp.opponentId !== me.id)) fail('not_allowed', 'this challenge is for someone else');
      sp.opponentId = me.id; sp.status = 'active'; sp.current = sp.opponentId; startTurn(sp); return { spar: sparSave(sp) };
    },
    'spar.decline'(a, conn, me) {
      const sp = sparOr404(a.sparId, conn, me); if (sp.status !== 'open') fail('not_your_turn', 'this spar is not open');
      if (sp.opponentId !== me.id && sp.by !== me.id) fail('not_allowed', 'only the one challenged, or the challenger');
      return { spar: endSpar(sp, sp.by === me.id ? 'withdrawn' : 'declined') };
    },
    'spar.turn'(a, conn, me) {
      const sp = sparOr404(a.sparId, conn, me); if (sp.status !== 'active' || sp.current !== me.id) fail('not_your_turn', 'not your turn');
      return { spar: takeTurn(sp, me.id, a.text || '', false) };
    },
    'spar.keepalive'(a, conn, me) { const sp = live.get(a.sparId); if (sp && sp.status === 'active' && sp.current === me.id) sp.lastKeepalive = Date.now(); return {}; },
    'spar.rule_propose'(a, conn, me) {
      const sp = sparOr404(a.sparId, conn, me); if (sp.status === 'ended') fail('not_your_turn', 'this spar has ended'); if (![sp.by, sp.opponentId].includes(me.id)) fail('not_allowed', 'only the two sparring');
      const norm = a.text.trim().toLowerCase(); if (sp.ruleTexts.includes(norm)) fail('bad_args', 'that rule was already asked in this spar');
      const rule = { id: S.newId('rule'), text: a.text.trim(), by: me.id, status: 'pending', expiresAt: Date.now() + RULE_MS };
      sp.rules.push(rule); sp.ruleTexts.push(norm); arm(sp); return { spar: sparSave(sp) };
    },
    'spar.rule_answer'(a, conn, me) {
      const sp = sparOr404(a.sparId, conn, me), rule = sp.rules.find(r => r.id === a.ruleId) || fail('not_found', 'no such rule');
      if (rule.status !== 'pending' || Date.now() > rule.expiresAt) fail('bad_args', 'that rule is no longer waiting');
      if (rule.by === me.id || ![sp.by, sp.opponentId].includes(me.id)) fail('not_allowed', 'the other side answers');
      rule.status = a.accept ? 'accepted' : 'declined'; return { spar: sparSave(sp) };
    },
    'spar.end'(a, conn, me) {
      const sp = sparOr404(a.sparId, conn, me); if (sp.status === 'ended') return { spar: sp };
      if (!(me && [sp.by, sp.opponentId].includes(me.id))) need(conn, me, 'message.manage', S.channel(sp.channelId));
      return { spar: endSpar(sp, 'ended by ' + (me ? me.name : 'the server')) };
    },
    'spar.get'(a, conn, me) { return { spar: sparOr404(a.sparId, conn, me) }; },
    'spar.list'(a, conn, me, ch) { return { spars: S.sparsIn(ch.id).map(sp => live.get(sp.id) || sp).map(pubSpar) }; },
    // ── emoji ──
    'emoji.list'() { return { emojis: S.emojis() }; },
    'emoji.add'(a, conn, me) { S.emojiAdd(a.name, a.image, conn.cli ? 'cli' : me.id); audit(conn, me, 'emoji.add', a.name, {}); emit('emoji.changed', { emojis: S.emojis() }); return { emoji: S.emojis().find(e => e.name === a.name) }; },
    'emoji.remove'(a, conn, me) { if (!S.emojiRemove(a.name)) fail('not_found', 'no such emoji'); audit(conn, me, 'emoji.remove', a.name, {}); emit('emoji.changed', { emojis: S.emojis() }); return {}; },
    // ── closeness ──
    'appreciate'(a, conn, me) {
      if (!me) fail('not_allowed', 'the CLI is not a member'); const t = memberOr404(a.memberId); if (t.id === me.id) fail('bad_args', 'appreciate someone else');
      const ap = S.appreciate(me.id, t.id, a.note); emit('appreciation', { appreciation: ap }); return { appreciation: ap };
    },
    'appreciation.list'(a) { return { appreciations: S.appreciations(a.memberId || null, a.limit || 50) }; },
    'nudge'(a, conn, me) {
      if (!me) fail('not_allowed', 'the CLI is not a member'); const t = memberOr404(a.memberId); if (t.id === me.id) fail('bad_args', 'nudge someone else');
      const k = me.id + '>' + t.id; if (Date.now() - (nudged.get(k) || 0) < 60e3) fail('rate_limited', 'once a minute per person'); nudged.set(k, Date.now());
      emitTo(t.id, 'nudge', { from: me.id }); return {};
    },
    'prompt.draw'(a) { const deck = PROMPTS[a.deck]; return { deck: a.deck, prompt: deck[crypto.randomInt(deck.length)] }; },
  };

  // ── the one entrance ────────────────────────────────────────────────────────────────────
  function call(conn, cmd, args) {
    try {
      const chk = C.check(cmd, args); if (!chk.ok) fail(chk.code, chk.message);
      const perm = chk.spec.perm, h = H[cmd]; if (!h) fail('unknown_command', 'the contract has it, the server does not: ' + cmd);
      // rate limit: commandsPerSecond per connection
      const now = Date.now(); conn.hits = (conn.hits || []).filter(t => now - t < 1000); if (!conn.cli && conn.hits.length >= (opts.commandsPerSecond || LIMITS.commandsPerSecond)) fail('rate_limited', 'slow down'); conn.hits.push(now);
      let me = null;
      if (perm !== 'anyone') {
        if (!conn.cli) {
          if (!conn.memberId && conn.bearer) conn.memberId = S.sessionGet(conn.bearer), conn.token = conn.bearer;
          if (!conn.memberId) fail('not_signed_in', 'sign in first');
          me = S.member(conn.memberId); if (!me || me.removed) { conn.memberId = null; fail('removed', 'this key was removed from the group'); }
          if (activeUntil(me.bannedUntil)) { conn.memberId = null; conns.delete(conn); fail('banned', 'this key is banned', { until: me.bannedUntil, reason: me.banReason }); }
          if (activeUntil(me.timeoutUntil) && TIMED_OUT_BLOCKS.has(cmd)) fail('timed_out', 'you are timed out', { until: me.timeoutUntil, reason: me.timeoutReason });
        }
        if (perm === 'owner' && !isOwner(conn, me)) fail('not_allowed', 'only the owner');
      }
      let ch = null;
      if (C.PERMISSIONS.includes(perm)) {
        if (CHANNEL_PERMS.includes(perm) && args && args.channelId) { ch = channelOr404(args.channelId); need(conn, me, perm, ch); }
        else need(conn, me, perm);
      }
      return { ok: true, result: h(chk.args, conn, me, ch) };
    } catch (e) {
      if (e instanceof GroupError) return { ok: false, error: { code: e.code, message: e.message, ...(e.data ? { data: e.data } : {}) } };
      log('[group] ' + cmd + ' failed: ' + (e && e.stack || e));
      return { ok: false, error: { code: 'server_error', message: 'something went wrong on the server' } };
    }
  }
  function connect(send, close) { const conn = { send, close, live: true, memberId: null }; return conn; }
  function disconnect(conn) {
    if (!conns.delete(conn) || !conn.memberId) return;
    const id = conn.memberId; if (online(id)) return;
    status.delete(id); where.delete(id); if (voice.has(id)) { voice.delete(id); emit('voice.state', { channelId: null, memberId: id, joined: false }); }
    emit('presence', presenceOf(id));
  }
  const cli = () => ({ cli: true, send() {}, memberId: null });
  // tests reach the spar clock here instead of waiting for it
  const debug = { live, tick };
  return { call, connect, disconnect, cli, store: S, handlers: H, debug, close: () => { for (const t of timers.values()) clearTimeout(t); S.close(); } };
}
module.exports = { createCore, GroupError };
