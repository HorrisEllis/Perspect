'use strict';
/* group/store.js — everything a group keeps, in one SQLite file (node:sqlite, no dependencies). The core is the only
 * caller; nothing here checks permissions — that is the core's job, done before any write. */
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BUILTIN_ROLES = [
  { id: 'owner', name: 'Owner', rank: 1000, perms: ['*'] },
  { id: 'admin', name: 'Admin', rank: 800, perms: ['channel.view', 'message.send', 'message.manage', 'voice.join', 'invite.create', 'member.manage', 'channel.manage', 'role.manage', 'group.manage', 'audit.view', 'emoji.manage'] },
  { id: 'moderator', name: 'Moderator', rank: 500, perms: ['channel.view', 'message.send', 'message.manage', 'voice.join', 'invite.create', 'audit.view', 'emoji.manage'] },
  { id: 'member', name: 'Member', rank: 100, perms: ['channel.view', 'message.send', 'voice.join'] },
];
const DEFAULT_CHANNELS = [
  ['start-here', 'text', 'Welcome', 'What this group is, and how it works'], ['introductions', 'text', 'Welcome', 'Who you are and what you are making'],
  ['ideas', 'text', 'Thinking', 'Half-formed is welcome'], ['inventions', 'text', 'Making', 'What you are building'],
  ['spar-arena', 'spar', 'Sparring', 'Timed turns. First thought, best thought.'], ['events', 'events', 'Meetups', 'Meetups, in person and online'],
  ['Workshop', 'voice', 'Voice', ''],
];
const newId = (p) => p + '_' + crypto.randomBytes(9).toString('base64url');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function open(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, rank INTEGER NOT NULL, perms TEXT NOT NULL, builtin INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, pub TEXT UNIQUE NOT NULL, name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', roleId TEXT NOT NULL REFERENCES roles(id), joinedAt INTEGER NOT NULL, removed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', topic TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0, overrides TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, channelId TEXT NOT NULL, authorId TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL, replyTo TEXT, createdAt INTEGER NOT NULL, editedAt INTEGER, deleted INTEGER NOT NULL DEFAULT 0, buildsOn TEXT, forkOf TEXT, repliesOpenAt INTEGER);
    CREATE TABLE IF NOT EXISTS spars (id TEXT PRIMARY KEY, channelId TEXT NOT NULL, status TEXT NOT NULL, state TEXT NOT NULL, updatedAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS emojis (name TEXT PRIMARY KEY, image TEXT NOT NULL, addedBy TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS appreciations (id TEXT PRIMARY KEY, fromId TEXT NOT NULL, toId TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS messages_channel ON messages(channelId, seq);
    CREATE TABLE IF NOT EXISTS reactions (messageId TEXT NOT NULL, emoji TEXT NOT NULL, memberId TEXT NOT NULL, PRIMARY KEY (messageId, emoji, memberId));
    CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, usesLeft INTEGER NOT NULL, expiresAt INTEGER NOT NULL, roleId TEXT NOT NULL, createdBy TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (tokenHash TEXT PRIMARY KEY, memberId TEXT NOT NULL, expiresAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, actorId TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '{}');`);
  const q = (sql) => db.prepare(sql);
  // builtin roles keep their current permissions on every open
  for (const r of BUILTIN_ROLES) q('UPDATE roles SET perms=? WHERE id=? AND builtin=1').run(JSON.stringify(r.perms), r.id);
  const meta = (k, v) => { if (v === undefined) { const r = q('SELECT v FROM meta WHERE k=?').get(k); return r ? r.v : null; } q('INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, v === null ? null : String(v)); };
  // first open: builtin roles, the group, its first channels
  for (const r of BUILTIN_ROLES) q('INSERT OR IGNORE INTO roles(id,name,rank,perms,builtin) VALUES(?,?,?,?,1)').run(r.id, r.name, r.rank, JSON.stringify(r.perms));
  if (!meta('createdAt')) {
    meta('createdAt', Date.now()); meta('name', 'New group'); meta('about', '');
    DEFAULT_CHANNELS.forEach(([n, k, c, t], i) => q('INSERT INTO channels(id,name,kind,category,topic,position) VALUES(?,?,?,?,?,?)').run(newId('ch'), n, k, c, t, i));
  }
  const role = (r) => r && { id: r.id, name: r.name, rank: r.rank, permissions: JSON.parse(r.perms), builtin: !!r.builtin };
  const member = (m) => m && { id: m.id, pub: m.pub, name: m.name, note: m.note, roleId: m.roleId, joinedAt: m.joinedAt, removed: !!m.removed };
  const channel = (c) => c && { id: c.id, name: c.name, kind: c.kind, category: c.category, topic: c.topic, position: c.position, overrides: JSON.parse(c.overrides) };
  const reactionsOf = (messageId) => { const out = {}; q('SELECT emoji, memberId FROM reactions WHERE messageId=? ORDER BY rowid').all(messageId).forEach(r => (out[r.emoji] = out[r.emoji] || []).push(r.memberId)); return out; };
  const message = (m) => m && { id: m.id, seq: m.seq, channelId: m.channelId, authorId: m.authorId, kind: m.kind, body: m.body, replyTo: m.replyTo || null, buildsOn: m.buildsOn || null, forkOf: m.forkOf || null, repliesOpenAt: m.repliesOpenAt || null, createdAt: m.createdAt, editedAt: m.editedAt || null, reactions: reactionsOf(m.id) };
  const S = {
    db, meta, newId, sha,
    group: () => ({ name: meta('name'), about: meta('about') || '', createdAt: +meta('createdAt'), ownerId: meta('ownerId') || null }),
    // roles
    roles: () => q('SELECT * FROM roles ORDER BY rank DESC, name').all().map(role),
    role: (id) => role(q('SELECT * FROM roles WHERE id=?').get(id)),
    roleCreate: (name, rank, perms) => { const id = newId('role'); q('INSERT INTO roles(id,name,rank,perms) VALUES(?,?,?,?)').run(id, name, rank, JSON.stringify(perms)); return S.role(id); },
    roleUpdate: (id, f) => { const r = S.role(id); q('UPDATE roles SET name=?, rank=?, perms=? WHERE id=?').run(f.name ?? r.name, f.rank ?? r.rank, JSON.stringify(f.permissions ?? r.permissions), id); return S.role(id); },
    roleDelete: (id) => { q("UPDATE members SET roleId='member' WHERE roleId=?").run(id); q('DELETE FROM roles WHERE id=? AND builtin=0').run(id); },
    // members
    members: () => q('SELECT * FROM members WHERE removed=0 ORDER BY joinedAt').all().map(member),
    member: (id) => member(q('SELECT * FROM members WHERE id=?').get(id)),
    memberByPub: (pub) => member(q('SELECT * FROM members WHERE pub=?').get(pub)),
    memberCreate: (pub, name, roleId) => { const id = newId('m'); q('INSERT INTO members(id,pub,name,roleId,joinedAt) VALUES(?,?,?,?,?)').run(id, pub, name, roleId, Date.now()); return S.member(id); },
    memberUpdate: (id, f) => { const m = S.member(id); q('UPDATE members SET name=?, note=?, roleId=? WHERE id=?').run(f.name ?? m.name, f.note ?? m.note, f.roleId ?? m.roleId, id); return S.member(id); },
    memberRemove: (id) => { q('UPDATE members SET removed=1 WHERE id=?').run(id); q('DELETE FROM sessions WHERE memberId=?').run(id); },
    // channels
    channels: () => q('SELECT * FROM channels ORDER BY position, name').all().map(channel),
    channel: (id) => channel(q('SELECT * FROM channels WHERE id=?').get(id)),
    channelCreate: (name, kind, category, topic) => { const id = newId('ch'), pos = (q('SELECT MAX(position) p FROM channels').get().p ?? -1) + 1; q('INSERT INTO channels(id,name,kind,category,topic,position) VALUES(?,?,?,?,?,?)').run(id, name, kind, category || '', topic || '', pos); return S.channel(id); },
    channelUpdate: (id, f) => { const c = S.channel(id); q('UPDATE channels SET name=?, category=?, topic=?, position=?, overrides=? WHERE id=?').run(f.name ?? c.name, f.category ?? c.category, f.topic ?? c.topic, f.position ?? c.position, JSON.stringify(f.overrides ?? c.overrides), id); return S.channel(id); },
    channelDelete: (id) => { q('DELETE FROM channels WHERE id=?').run(id); q('UPDATE messages SET deleted=1 WHERE channelId=?').run(id); },
    // messages
    message: (id) => message(q('SELECT * FROM messages WHERE id=? AND deleted=0').get(id)),
    messageCreate: (channelId, authorId, kind, body, replyTo, x) => { x = x || {}; const id = newId('msg'); q('INSERT INTO messages(id,channelId,authorId,kind,body,replyTo,createdAt,buildsOn,forkOf,repliesOpenAt) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, channelId, authorId, kind, body, replyTo || null, Date.now(), x.buildsOn || null, x.forkOf || null, x.repliesOpenAt || null); return S.message(id); },
    pieces: (ideaId) => q('SELECT * FROM messages WHERE buildsOn=? AND deleted=0 ORDER BY seq').all(ideaId).map(message),
    forks: (ideaId) => q('SELECT * FROM messages WHERE forkOf=? AND deleted=0 ORDER BY seq').all(ideaId).map(message),
    // spars: the whole state as JSON; the core owns the rules and the clock
    sparSave: (sp) => q('INSERT INTO spars(id,channelId,status,state,updatedAt) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, state=excluded.state, updatedAt=excluded.updatedAt').run(sp.id, sp.channelId, sp.status, JSON.stringify(sp), Date.now()),
    spar: (id) => { const r = q('SELECT state FROM spars WHERE id=?').get(id); return r ? JSON.parse(r.state) : null; },
    sparsIn: (channelId) => q("SELECT state FROM spars WHERE channelId=? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, updatedAt DESC LIMIT 50").all(channelId).map(r => JSON.parse(r.state)),
    sparsLive: () => q("SELECT state FROM spars WHERE status IN ('open','active')").all().map(r => JSON.parse(r.state)),
    // emoji and appreciations
    emojis: () => q('SELECT * FROM emojis ORDER BY name').all().map(r => ({ name: r.name, image: r.image, addedBy: r.addedBy, at: r.at })),
    emojiAdd: (name, image, by) => q('INSERT INTO emojis(name,image,addedBy,at) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET image=excluded.image, addedBy=excluded.addedBy, at=excluded.at').run(name, image, by, Date.now()),
    emojiRemove: (name) => q('DELETE FROM emojis WHERE name=?').run(name).changes,
    appreciate: (from, to, note) => { const a = { id: newId('ap'), from, to, note: note || '', at: Date.now() }; q('INSERT INTO appreciations(id,fromId,toId,note,at) VALUES(?,?,?,?,?)').run(a.id, from, to, a.note, a.at); return a; },
    appreciations: (to, limit) => (to ? q('SELECT * FROM appreciations WHERE toId=? ORDER BY at DESC LIMIT ?').all(to, limit) : q('SELECT * FROM appreciations ORDER BY at DESC LIMIT ?').all(limit)).map(r => ({ id: r.id, from: r.fromId, to: r.toId, note: r.note, at: r.at })),
    messageEdit: (id, body) => { q('UPDATE messages SET body=?, editedAt=? WHERE id=?').run(body, Date.now(), id); return S.message(id); },
    messageDelete: (id) => { q('UPDATE messages SET deleted=1, body=? WHERE id=?').run('', id); q('DELETE FROM reactions WHERE messageId=?').run(id); },
    history: (channelId, before, limit) => { const rows = q('SELECT * FROM messages WHERE channelId=? AND deleted=0 AND seq<? ORDER BY seq DESC LIMIT ?').all(channelId, before ?? Number.MAX_SAFE_INTEGER, limit + 1); return { messages: rows.slice(0, limit).reverse().map(message), more: rows.length > limit }; },
    since: (after, channelIds, limit) => { if (!channelIds.length) return { messages: [], more: false }; const rows = q(`SELECT * FROM messages WHERE seq>? AND deleted=0 AND channelId IN (${channelIds.map(() => '?').join(',')}) ORDER BY seq LIMIT ?`).all(after, ...channelIds, limit + 1); return { messages: rows.slice(0, limit).map(message), more: rows.length > limit }; },
    reactionToggle: (messageId, emoji, memberId) => { const r = q('DELETE FROM reactions WHERE messageId=? AND emoji=? AND memberId=?').run(messageId, emoji, memberId); if (!r.changes) q('INSERT INTO reactions(messageId,emoji,memberId) VALUES(?,?,?)').run(messageId, emoji, memberId); return reactionsOf(messageId); },
    // invites — the code is shown once; only codes are compared, never logged
    invites: () => q('SELECT * FROM invites WHERE usesLeft>0 AND expiresAt>? ORDER BY expiresAt').all(Date.now()).map(r => ({ code: r.code, usesLeft: r.usesLeft, expiresAt: r.expiresAt, roleId: r.roleId, createdBy: r.createdBy })),
    inviteCreate: (uses, hours, roleId, createdBy) => { const code = crypto.randomBytes(9).toString('base64url'); q('INSERT INTO invites(code,usesLeft,expiresAt,roleId,createdBy) VALUES(?,?,?,?,?)').run(code, uses, Date.now() + hours * 3600e3, roleId, createdBy); return { code, usesLeft: uses, expiresAt: Date.now() + hours * 3600e3, roleId }; },
    inviteGet: (code) => q('SELECT * FROM invites WHERE code=? AND usesLeft>0 AND expiresAt>?').get(code, Date.now()) || null,
    inviteUse: (code) => q('UPDATE invites SET usesLeft=usesLeft-1 WHERE code=?').run(code),
    inviteRevoke: (code) => q('DELETE FROM invites WHERE code=?').run(code).changes,
    // sessions — only the token's hash is kept
    sessionCreate: (memberId, hours) => { const token = crypto.randomBytes(24).toString('base64url'); q('INSERT INTO sessions(tokenHash,memberId,expiresAt) VALUES(?,?,?)').run(sha(token), memberId, Date.now() + hours * 3600e3); return token; },
    sessionGet: (token) => { const r = q('SELECT * FROM sessions WHERE tokenHash=? AND expiresAt>?').get(sha(token), Date.now()); return r ? r.memberId : null; },
    sessionEnd: (token) => q('DELETE FROM sessions WHERE tokenHash=?').run(sha(token)),
    // the setup code makes the first owner; only its hash is kept, and it is spent on use
    setupCode: () => { const code = crypto.randomBytes(9).toString('base64url'); meta('setupHash', sha(code)); return code; },
    setupMatches: (code) => !!code && meta('setupHash') === sha(code),
    setupSpend: () => meta('setupHash', null),
    // audit
    audit: (actorId, action, target, detail) => q('INSERT INTO audit(at,actorId,action,target,detail) VALUES(?,?,?,?,?)').run(Date.now(), actorId, action, target || '', JSON.stringify(detail || {})),
    auditList: (before, limit) => q('SELECT * FROM audit WHERE seq<? ORDER BY seq DESC LIMIT ?').all(before ?? Number.MAX_SAFE_INTEGER, limit).map(r => ({ seq: r.seq, at: r.at, actorId: r.actorId, action: r.action, target: r.target, detail: JSON.parse(r.detail) })),
    close: () => db.close(),
  };
  return S;
}
module.exports = { open, BUILTIN_ROLES };
