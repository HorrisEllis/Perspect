#!/usr/bin/env node
'use strict';
/* group/cli.js — run a Perspect group from the server's own terminal. It opens the group's database directly and acts
 * as the owner (logged as "cli" in the audit). Every action goes through the same core and contract as the WebSocket
 * and HTTP doors. Changes made here are seen by connected people the next time they load (live events come from the
 * running server). */
const path = require('path');
const { createCore } = require('./core');
const C = require('./contract');

const HELP = `perspect group — the CLI

  node group/cli.js <command> [options]        options: --db <file> (default data/group.db), --json

  status                     the group, how many members, channels, invites, whether it has an owner
  setup-code                 a one-time code that makes the first person to use it the owner
  contract                   the contract's version and hash (pages must match it)
  members | roles | channels | invites
  audit [n]                  the last n admin actions (default 20)
  invite [--uses n] [--hours n] [--role id]
  set-role <memberId> <roleId>
  remove <memberId>
  transfer <memberId>        make someone the owner
  rename <name>              the group's name
  call <command> '<json>'    any command in the contract, as the owner`;

function parse(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); o[k] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true; } else o._.push(a); } return o; }
function main(argv, out) {
  out = out || ((s) => process.stdout.write(s + '\n'));
  const o = parse(argv), [cmd, ...rest] = o._;
  if (!cmd || cmd === 'help' || o.help) { out(HELP); return 0; }
  if (cmd === 'contract') { out(o.json ? JSON.stringify({ version: C.VERSION, hash: C.HASH }) : C.CONTRACT.name + ' ' + C.VERSION + '\n' + C.HASH); return 0; }
  const core = createCore({ dbPath: path.resolve(o.db || path.join(__dirname, '..', 'data', 'group.db')) }), S = core.store, me = core.cli();
  const run = (c, args) => { const r = core.call(me, c, args); if (!r.ok) throw Object.assign(new Error(r.error.code + ': ' + r.error.message), { reply: r }); return r.result; };
  const show = (v, text) => out(o.json ? JSON.stringify(v, null, 2) : text);
  try {
    const n = (v) => (v === undefined ? undefined : parseInt(v, 10));
    switch (cmd) {
      case 'status': { const g = S.group(), st = { group: g, members: S.members().length, channels: S.channels().length, invites: S.invites().length, owner: g.ownerId ? S.member(g.ownerId).name : null };
        show(st, `${g.name}\n  members ${st.members} · channels ${st.channels} · open invites ${st.invites}\n  owner: ${st.owner || 'none yet — run: node group/cli.js setup-code'}`); break; }
      case 'setup-code': { if (S.meta('ownerId')) { out('this group has an owner; use invite instead'); return 1; } const code = S.setupCode(); S.audit('cli', 'setup-code', '', {});
        show({ code }, `setup code (one use, the first owner): ${code}\nopen Perspect and join with it; the code is spent once used`); break; }
      case 'members': { const ms = S.members(); show(ms.map(({ pub, ...m }) => m), ms.map(m => `${m.id}  ${m.roleId.padEnd(10)} ${m.name}`).join('\n') || '(none)'); break; }
      case 'roles': { const rs = S.roles(); show(rs, rs.map(r => `${r.id.padEnd(14)} rank ${String(r.rank).padStart(4)}  ${r.name}: ${r.permissions.join(', ')}`).join('\n')); break; }
      case 'channels': { const cs = S.channels(); show(cs, cs.map(c => `${c.id}  ${c.kind.padEnd(6)} ${c.category} / ${c.name}`).join('\n')); break; }
      case 'invites': { const is = S.invites(); show(is, is.map(i => `${i.code}  ${i.usesLeft} left · ${i.roleId} · until ${new Date(i.expiresAt).toISOString()}`).join('\n') || '(none)'); break; }
      case 'audit': { const es = S.auditList(undefined, n(rest[0]) || 20); show(es, es.map(e => `${new Date(e.at).toISOString()}  ${e.actorId.padEnd(16)} ${e.action} ${e.target}`).join('\n') || '(empty)'); break; }
      case 'invite': { const r = run('invite.create', JSON.parse(JSON.stringify({ uses: n(o.uses), hours: n(o.hours), roleId: o.role }))); show(r, `invite: ${r.invite.code}  (${r.invite.usesLeft} use${r.invite.usesLeft > 1 ? 's' : ''}, ${r.invite.roleId}, until ${new Date(r.invite.expiresAt).toISOString()})`); break; }
      case 'set-role': { const r = run('member.set_role', { memberId: rest[0], roleId: rest[1] }); show(r, `${r.member.name} is now ${r.member.roleId}`); break; }
      case 'remove': { run('member.remove', { memberId: rest[0] }); show({}, 'removed'); break; }
      case 'transfer': { run('group.transfer_owner', { memberId: rest[0] }); show({}, 'ownership moved'); break; }
      case 'rename': { const r = run('group.update', { name: rest.join(' ') }); show(r, 'the group is now: ' + r.group.name); break; }
      case 'call': { const r = run(rest[0], rest[1] ? JSON.parse(rest[1]) : {}); out(JSON.stringify(r, null, 2)); break; }
      default: out('unknown command: ' + cmd + '\n\n' + HELP); return 1;
    }
    return 0;
  } catch (e) { out('error: ' + e.message); return 1; } finally { core.close(); }
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
