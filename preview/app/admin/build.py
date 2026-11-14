# Admin: its own full window like Settings, each section its own HTML, each mapped to the powers the backend already has.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from frame import window, I, S, G, sel, BTN, tg, PILL
NAV = [('THE GROUP', [('overview', 'Overview', 'home', ''), ('invites', 'Invites', 'link', ''), ('channels', 'Channels', 'hash', ''), ('emoji', 'Emoji', 'smile', '')]),
       ('PEOPLE', [('members', 'Members', 'users', ''), ('roles', 'Roles & permissions', 'shield', ''), ('recovery', 'Recovery', 'key', '')]),
       ('SAFETY', [('reports', 'Reports', 'flag', '1'), ('moderation', 'Moderation & bans', 'ban', ''), ('audit', 'Audit log', 'list', '')])]
FOOT = f'<a href="../chat.html" style="color:var(--dim)">{I("back")}Back to the group</a><div>You are Owner · rank 1000</div>'
def page(key, title, body, lead='', note='Admin is its own full window; every section is its own page.'):
    window(key + '.html', key, title, body, NAV, 'Admin', 'Invention, Intention, Systems &amp; Outcasts', FOOT, note, lead)
P = lambda k, n, c: f'<span class="row" style="flex-wrap:nowrap"><span data-u="{k}" data-s="1" class="avslot"></span><b data-u="{k}" style="cursor:pointer;color:{c}">{n}</b></span>'
PEOPLE = [('h', 'Horris', '#ff8a3d', 'Owner', 'here', 0), ('m', 'Maya', '#7fd3ff', 'Admin', 'here', 0), ('t', 'Theo', '#b79bff', 'Moderator', 'here', 0), ('j', 'Jun', '#ff8fb1', 'Builder', 'yesterday', 0),
          ('a', 'Ava', '#ffd166', 'Member', 'away', 0), ('r', 'Rafe', '#6ee7a8', 'Member', 'yesterday', 1), ('s', 'Sol', '#9ad0c2', 'Member', '3 days ago', 0)]
table = lambda head, rows, cls='l': f'<div class="scrollx"><table class="mx {cls}"><tr>' + ''.join(f'<th>{h}</th>' for h in head) + '</tr>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</table></div>'

page('overview', 'Overview', '</section><section class="panel full bare"><div class="kpis" style="padding:0">' + ''.join(f'<a class="kpi" href="{h}.html" style="color:inherit"><b>{n}</b><span>{t}</span></a>' for n, t, h in [('7', 'members · 3 here', 'members'), ('1', 'report waiting', 'reports'), ('2', 'invites live', 'invites'), ('12', 'channels', 'channels'), ('0', 'banned · 1 timed out', 'moderation'), ('5', 'roles', 'roles')]) + '</div>' +
G('The group') + S('Name', 'Invention, Intention, Systems &amp; Outcasts', BTN('Edit')) + S('About', 'For people who build things and think about why.', BTN('Edit')) + S('Picture', 'Shown on the rail', BTN('Change')) +
G('Ownership') + S('Owner', 'Horris · since Nov 14', BTN('Transfer…', 'x')) + S('Group contract', 'perspect.group 1.0.0 · a0cd9dd3…', PILL('matches the server', 'var(--green)')) +
G('Needs you') + S('Ava reported a message in #philosophy', '20 min ago · “Felt dismissive of a newcomer.”', '<a class="btn p" href="reports.html">Review</a>') + S('Sol has not been welcomed', 'Joined 3 days ago, no replies yet', BTN('Say hello')),
'What is here, and what is waiting for you')

page('invites', 'Invites', G('Make an invite') + S('Uses', '', sel('10 uses', '1 use', '25 uses', 'No limit')) + S('Expires', '', sel('In 7 days', 'In 1 day', 'In 30 days', 'Never')) + S('Joins as', 'Only roles ranked below yours', sel('Member', 'Builder')) + '<div class="row" style="padding:10px 0">' + BTN(I('plus') + ' Create invite', 'p') + '</div>' +
G('Live invites', 'full') + table(['Code', 'Made by', 'Joins as', 'Used', 'Expires', ''], [
 ['<span style="font-family:var(--mono)">kq7Hd2_xP9w-</span>', 'cli', 'Member', '3 of 10', 'in 6 days', BTN('Copy link') + ' ' + BTN('Revoke', 'x')],
 ['<span style="font-family:var(--mono)">Zr41m-Yb8dQe</span>', 'Maya', 'Builder', '1 of 1', 'used up', BTN('Remove', 'x')]]),
'Who may come in, how many times, and as what')

page('channels', 'Channels', '</section><section class="panel full bare"><div class="row"><span class="muted" style="flex:1">Drag to reorder. A lock means some roles cannot see it.</span>' + BTN(I('plus') + ' New channel', 'p') + '</div>' +
''.join(G(cat) + ''.join(S(f'{I(ic)} {n}', sub, BTN('Edit') + BTN(I('more'))) for ic, n, sub in chs) for cat, chs in [
 ('Welcome', [('hash', 'start-here', 'Everyone can read · admins post'), ('hash', 'introductions', 'Everyone')]),
 ('Thinking', [('hash', 'ideas', 'Half-formed is welcome'), ('hash', 'systems', 'Everyone'), ('hash', 'philosophy', 'Everyone')]),
 ('Sparring & voice', [('swords', 'spar-arena', 'Timed turns'), ('volume', 'Workshop', 'Voice · 3 in the room'), ('volume', 'Lounge', 'Voice')]),
 ('Admin', [('lock', 'organizers', 'Override: Member ✕ see · Builder ✕ see')])]),
'Create, rename, reorder, and say who sees what')

page('emoji', 'Emoji', G('Group emoji') + ''.join(S(f'<span style="font-size:20px">{e}</span> &nbsp;<span style="font-family:var(--mono)">:{n}:</span>', f'added by {by}', BTN('Remove', 'x')) for e, n, by in [('✨', 'spark', 'Maya'), ('🏖', 'sand', 'Horris'), ('🛠', 'built', 'Theo')]) +
G('Add one') + S('Name', 'Letters, numbers and _', '<input class="in" style="width:200px" placeholder="name">') + S('Picture', 'A small square image', BTN('Choose a file')) + '<div class="row" style="padding:10px 0">' + BTN('Add emoji', 'p') + '</div>')

page('members', 'Members', '</section><section class="panel full bare"><div class="row"><input class="in" style="flex:1;min-width:180px;max-width:360px" placeholder="Find a member">' + sel('All roles', 'Admin', 'Moderator', 'Builder', 'Member') + '</div>' +
G('7 members', 'full') + table(['Member', 'Role', 'Last here', 'Warnings', ''], [
 [P(k, n, c), sel(role, *[r for r in ['Admin', 'Moderator', 'Builder', 'Member'] if r != role]) if role != 'Owner' else PILL('Owner', 'var(--fire)'), seen, str(w) if w else '<span class="faint">—</span>',
  ('<span class="faint">you</span>' if k == 'h' else BTN('Warn') + ' ' + BTN('Time out') + ' ' + BTN('Remove', 'x') + ' ' + BTN('Ban', 'x'))] for k, n, c, role, seen, w in PEOPLE]),
'You act only on people ranked below you')

page('roles', 'Roles & permissions', '</section><section class="panel full bare"><div class="row"><span class="muted" style="flex:1">You act only on roles ranked below yours, and grant only what you hold.</span>' + BTN(I('plus') + ' New role', 'p') + '</div>' +
G('Who can do what', 'full') + '<div class="scrollx"><table class="mx"><tr><th>Permission</th><th>Owner<br><small class="faint">1000</small></th><th>Admin<br><small class="faint">800</small></th><th>Moderator<br><small class="faint">500</small></th><th>Builder<br><small class="faint">300 · custom</small></th><th>Member<br><small class="faint">100</small></th></tr>' +
''.join(f'<tr><td>{p}</td>' + ''.join(f'<td class="{"y" if v == "1" else "n"}">{I("check") if v == "1" else "—"}</td>' for v in row) + '</tr>' for p, row in [
 ('See channels', '11111'), ('Post', '11111'), ('Delete others\' messages', '11100'), ('Join voice', '11111'), ('Invite people', '11110'), ('Manage members', '11000'), ('Warn and time out', '11100'), ('Ban and lift bans', '11000'),
 ('Recover accounts', '11000'), ('Manage channels', '11000'), ('Manage roles', '11000'), ('Group name & about', '11000'), ('Group emoji', '11100'), ('Read the audit log', '11100'), ('Handle reports', '11100')]) + '</table></div>',
'Ranks decide who can act on whom')

page('recovery', 'Recovery', G('Help someone back in') + '<p class="muted">They lost their device. Ask for their recovery phrase; if it matches, they get a one-time code for the new device.</p>' +
S('Member', '', sel('Rafe', 'Ava', 'Jun', 'Sol')) + S('Their recovery phrase', 'Checked on the server — you never see the stored one', '<input class="in" style="width:260px" placeholder="what they tell you">') + '<div class="row" style="padding:10px 0">' + BTN('Check and issue a code', 'p') + '</div>' +
G('When there is no phrase') + S('Change a member\'s email', 'Seen only by them and by those who can recover accounts', BTN('Change')) + S('Reset a member', 'Removes every device key; they rejoin with a code from you', BTN('Reset…', 'x')) +
G('Recent', 'full') + table(['When', 'Who', 'What', 'By'], [['Today 09:50', 'Rafe', 'Recovery code issued · used 09:52', 'Maya'], ['Nov 13', 'Jun', 'Phrase did not match · 1 try', 'Theo']]),
'Recovery by phrase — no passwords, nothing to leak')

page('reports', 'Reports', G('Waiting — 1', 'full') + '<div style="padding:10px 0"><b>Ava</b> reported a message in #philosophy · 20 min ago<div class="muted" style="margin:6px 0">“Felt dismissive of a newcomer.”</div>' +
'<div class="card" style="background:var(--main);margin:10px 0"><div class="bd"><b style="color:#6ee7a8">Rafe</b> <span class="faint">· 10:12 AM · #philosophy</span><br>If you have to ask that, you have not read enough yet.</div></div>' +
'<div class="row">' + BTN('Open in the channel') + BTN('Talk to Rafe') + BTN('Warn Rafe') + BTN('Delete the message', 'x') + BTN('Resolve', 'p') + '</div></div>' +
G('Resolved') + S('Jun reported Sol · spam link', 'Resolved by Theo · Nov 13 · message deleted', BTN('View')) + G('How reports work') + '<p class="muted">Only people who can handle reports ever see one, or hear that one was made. The reporter is told when it is resolved, not what was done.</p>',
'Seen only by those who handle reports', 'Reports reach only those with report.handle — an ordinary member never hears about them.')

page('moderation', 'Moderation & bans', G('Timed out now') + S(P('r', 'Rafe', '#6ee7a8'), 'Until 11:30 AM · “cool off after #philosophy” · by Theo', BTN('Lift')) +
G('Banned') + '<p class="muted">Nobody is banned.</p>' + S('Ban someone', 'For a while or for good; they are removed and cannot rejoin', BTN('Ban…', 'x')) +
G('History', 'full') + table(['When', 'Member', 'Action', 'Why', 'By'], [['Today 10:30', 'Rafe', 'Timed out · 1 hour', 'cool off after #philosophy', 'Theo'], ['Today 10:28', 'Rafe', 'Warned', 'dismissive of a newcomer', 'Theo'], ['Nov 12', 'Sol', 'Timed out · lifted', 'posted the same link 5 times', 'Maya']]),
'Warnings, time-outs and bans, on people ranked below you')

page('audit', 'Audit log', '</section><section class="panel full bare"><div class="row"><input class="in" style="flex:1;min-width:180px;max-width:360px" placeholder="Filter by person or action">' + sel('Everything', 'Members', 'Roles', 'Channels', 'Invites', 'Safety') + '</div>' +
G('Today', 'full') + '''<div class="log">10:41  Maya    member.set_role       Theo → Moderator
10:30  Theo    member.timeout        Rafe · 1 hour
10:30  Horris  channel.set_override  #organizers: Member ✕ see
10:28  Theo    member.warn           Rafe
10:02  cli     invite.create         10 uses · Member
09:50  Maya    recovery.issue        Rafe
09:15  Maya    emoji.add             :spark:</div>''', 'Every admin action, who did it, and when — nothing is deleted')
print('admin built')
