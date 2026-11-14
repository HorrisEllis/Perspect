# builds the preview pages: one HTML each, the same frame and mock data (preview only)
HEAD = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Perspect — {title} (preview)</title><link rel="stylesheet" href="../../group/web/kit.css"><style>{css}</style></head><body>
<div class="app {wide}" id="app"><nav class="rail" id="rail"></nav><aside class="side" id="side"></aside>
<main class="main" style="position:relative"><header class="top"><div class="t"><span class="ic">{ic}</span><span>{name}</span></div><div class="d">{desc}</div>{tools}</header>
{main}</main>{right}</div>
<script src="mock.js"></script><script>const {{ M, av, esc }} = MOCK; MOCK.shell('{page}', '{cur}'); {js}
document.body.insertAdjacentHTML('beforeend', MOCK.note({note!r}));</script></body></html>'''
U = lambda k: f'<b data-u="{k}" style="cursor:pointer;color:var(--c-{k})">NAME_{k}</b>'
COMMON_CSS = '''.feed{flex:1;overflow:auto;padding:10px 0}.msg{display:flex;gap:12px;padding:5px 16px;position:relative}.msg:hover{background:#13131a}.msg .body{flex:1;min-width:0}
.msg .h{display:flex;gap:8px;align-items:baseline}.msg .h time{color:var(--faint);font-size:11.5px}.msg p{margin:2px 0 0;color:#d9d6d0}.role{font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(255,106,0,.15);color:var(--fire)}
.reacts{display:flex;gap:6px;margin-top:6px}.reacts span{font-size:12px;padding:2px 8px;border-radius:12px;border:1px solid var(--line);background:var(--raise);color:var(--dim)}.reacts span.mine{border-color:var(--cyan);color:var(--cyan)}
.kcard{margin-top:6px;max-width:560px}.sec{font-size:11px;color:var(--faint);letter-spacing:.06em;text-transform:uppercase;margin:18px 0 8px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);padding:0 16px;flex:none;overflow:auto}
.tab{padding:10px 12px;color:var(--dim);border-bottom:2px solid transparent;white-space:nowrap}.tab.on{color:var(--text);border-color:var(--fire)}
.set{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--line)}.set:last-child{border:0}.set small{display:block;color:var(--faint);font-size:12px}
.tg{width:38px;height:22px;border-radius:11px;background:var(--hover);position:relative;flex:none}.tg::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:var(--dim)}
.tg.on{background:var(--fire)}.tg.on::after{left:19px;background:#fff}select.in{width:auto}.new{font-size:10px;color:var(--amber);margin-left:6px}'''
def names(s):
    for k,n,c in [('h','Horris','#ff8a3d'),('m','Maya','#7fd3ff'),('t','Theo','#b79bff'),('a','Ava','#ffd166'),('r','Rafe','#6ee7a8'),('j','Jun','#ff8fb1'),('s','Sol','#9ad0c2')]:
        s = s.replace(f'NAME_{k}', n).replace(f'var(--c-{k})', c)
    return s
def msg(k, t, body, extra='', role=''):
    return f'<div class="msg"><div data-u="{k}" class="avslot"></div><div class="body"><div class="h">{U(k)}{role}<time>{t}</time></div>{body}{extra}</div></div>'
def page(fn, **kw):
    d = dict(title='', css='', wide='', ic='', name='', desc='', tools='', main='', right='', page='', cur='', js='', note='')
    d.update(kw); d['css'] = COMMON_CSS + d['css']
    d['js'] = "document.querySelectorAll('.avslot').forEach(e => e.outerHTML = av(e.dataset.u)); document.querySelectorAll('.moodslot').forEach(e => e.outerHTML = MOCK.moodAv(e.dataset.u, 1));" + d['js']
    open(fn, 'w', encoding='utf8').write(names(HEAD.format(**d)))

ROLE = '<span class="role">{}</span>'
members_panel = '''<aside class="mem"><h4>Owner — 1</h4><div class="mrow"><div data-u="h" class="moodslot"></div><div>Horris<small>Owner</small></div></div>
<h4>Admin — 1</h4><div class="mrow"><div data-u="m" class="avslot"></div><div>Maya<small>in #ideas</small></div></div>
<h4>Moderator — 1</h4><div class="mrow"><div data-u="t" class="avslot"></div><div>Theo<small>in #spar-arena</small></div></div>
<h4>Members — 4</h4><div class="mrow"><div data-u="a" class="moodslot"></div><div>Ava<small>away</small></div></div>
<div class="mrow off"><div data-u="r" class="avslot"></div><div>Rafe<small>AI · software</small></div></div><div class="mrow off"><div data-u="j" class="avslot"></div><div>Jun<small>music · sound</small></div></div>
<div class="mrow off"><div data-u="s" class="avslot"></div><div>Sol<small>new here</small></div></div></aside>'''
compose = '''<div style="height:18px;padding:0 16px;color:var(--faint);font-size:12px">Theo is typing…</div><div style="padding:0 16px 16px;flex:none">
<div class="row" style="gap:4px;margin-bottom:6px"><button class="btn g" style="height:26px;font-size:12px">Message</button><button class="btn" style="height:26px;font-size:12px;color:var(--dim)">One-way</button><button class="btn" style="height:26px;font-size:12px;color:var(--dim)">✦ Idea</button><button class="btn" style="height:26px;font-size:12px;color:var(--dim)">❖ Prompt</button></div>
<div class="row" style="background:var(--raise);border:1px solid var(--line);border-radius:10px;padding:6px 8px;flex-wrap:nowrap"><span class="faint" style="padding:0 6px">＋</span><input class="in" style="border:0;background:none" placeholder="Message #ideas"><span class="faint">☺</span><span class="faint" style="padding:0 6px">➤</span></div></div>'''

page('chat.html', title='Chat', wide='wide', ic='#', name='ideas', desc='Half-formed is welcome', page='chat', cur='ideas',
  note='Right-click any person (or click their name) for their card and menu. Toasts top right; reports reach whoever handles reports.',
  js="""MOCK.toasts([['#ff5c8a','⚑','Report from Ava','A message in #philosophy · moderators only','<a class=\\'btn p\\' style=\\'height:26px;font-size:12px\\' href=\\'admin.html\\'>Review</a><button class=\\'btn g\\' style=\\'height:26px;font-size:12px\\'>Later</button>'],
  ['#ffb347','⚔','Theo challenged you','“Every invention is mostly theft.” · 10 turns','<a class=\\'btn p\\' style=\\'height:26px;font-size:12px\\' href=\\'spar.html\\'>Accept</a><button class=\\'btn g\\' style=\\'height:26px;font-size:12px\\'>Decline</button>'],
  ['#a77bff','✧','Maya appreciated you','“For saying the quiet thing out loud.”'], ['#7fd3ff','💭','Jun is thinking of you','a nudge']]);""",
  main='<div class="feed">'
   + '<div style="display:flex;align-items:center;gap:10px;color:var(--faint);font-size:11.5px;margin:6px 16px">Today</div>'
   + msg('m', '9:15 AM', '<p>Has anyone tried mapping how a habit fails, the way you would map a system outage?</p>', '<div class="reacts"><span class="mine">💡 3</span><span>🔥 2</span></div>', ROLE.format('ADMIN'))
   + msg('t', '9:31 AM', '<div class="card kcard"><div class="hd" style="color:var(--green)">✦ Idea · open to build on</div><div class="bd"><p style="margin:0 0 10px">A plotter that draws with sand, driven by whatever the group is talking about.</p><div class="row"><button class="btn p">Add the next piece</button><button class="btn g">Fork it</button><a class="btn g" href="idea.html">See the chain · 3 pieces</a></div></div></div>', '<div class="reacts"><span>✨ 4</span></div>', ROLE.format('MODERATOR'))
   + msg('a', '10:02 AM', '<div class="card kcard"><div class="hd" style="color:var(--violet)">✉ One-way</div><div class="bd" style="font-style:italic;font-size:15px">I have been quiet because I am scared my ideas are not good enough yet. Just wanted that said.<div class="faint" style="font-style:normal;font-size:12px;margin-top:8px">For receiving, not reacting · replies open 10:12 AM</div></div></div>', '<div class="reacts"><span>🙏 5</span></div>')
   + msg('h', '10:20 AM', '<div class="reply faint" style="font-size:12px">↳ <b class="muted">Ava</b> I have been quiet because…</div><p>That took guts. Half-built is exactly what this place is for.</p>', '', ROLE.format('OWNER'))
   + msg('j', '10:40 AM', '<div class="card kcard"><div class="hd" style="color:var(--amber)">❖ Prompt · creativity</div><div class="bd" style="font-size:15px">Combine two things in this room into one invention.</div></div>')
   + '</div>' + compose, right=members_panel)

spar_css = '.turn{padding:10px 14px;border-radius:10px;background:var(--raise);border:1px solid var(--line);max-width:80%;margin:6px 0}.turn.r{margin-left:auto;border-color:#3a2a10}.turn small{color:var(--faint);display:block;font-size:11.5px;margin-bottom:2px}.timer{font-family:var(--mono);font-size:30px;font-weight:700;color:var(--amber)}'
page('spar.html', title='Spar', wide='wide', ic='⚔', name='spar-arena', desc='Timed turns. First thought, best thought.', page='spar', cur='spar-arena', css=spar_css,
  note='The server holds the clock: turns, rules and speed mode are enforced there.',
  main='''<div class="scroll"><div class="pad grid2" style="align-items:start">
  <div class="card"><div class="hd" style="color:var(--amber)">⚔ Live · Maya vs Theo</div><div class="bd">
   <div style="font-size:16px;font-weight:600;margin-bottom:8px">“Systems thinking makes people worse at acting.”</div>
   <div class="row" style="justify-content:space-between"><span class="muted">Turn 4 of 10 · <b style="color:#b79bff">Theo</b>'s turn · speed mode</span><span class="timer">0:21</span></div>
   <div class="row" style="margin:8px 0"><span class="pill">📜 One sentence per turn ✓</span><span class="pill">📜 No examples from work ✓</span><span class="pill" style="border-color:var(--amber);color:var(--amber)">📜 No questions — Theo is deciding (24 s)</span></div>
   <div class="turn"><small>Maya · 1</small>Acting without a map is just motion.</div>
   <div class="turn r"><small>Theo · 2</small>Maps become the excuse not to move.</div>
   <div class="turn"><small>Maya · 3</small>Then draw smaller maps, faster.</div>
   <div class="turn r" style="opacity:.6"><small>Theo · 4 · typing…</small>…</div>
   <div class="row" style="margin-top:10px"><button class="btn g">👀 12 watching</button><button class="btn g">Propose a rule</button><button class="btn x">End</button></div></div></div>
  <div><div class="card"><div class="hd">⚔ Challenge someone</div><div class="bd">
   <label class="lbl">Topic</label><input class="in" value="Every invention is mostly theft."><div class="row" style="margin-top:6px"><button class="btn g" style="height:26px;font-size:12px">❖ Draw a spar topic</button></div>
   <label class="lbl">Against</label><select class="in" style="width:100%"><option>Anyone (open challenge)</option><option>Ava</option><option>Rafe</option></select>
   <div class="row"><div style="flex:1"><label class="lbl">Turns</label><input class="in" value="10"></div><div style="flex:1"><label class="lbl">Seconds a turn</label><input class="in" value="60"></div></div>
   <label class="row" style="margin-top:10px"><span class="tg on"></span>Speed mode — quiet for 5 s and you lose the turn</label>
   <div class="row" style="margin-top:12px"><button class="btn p">Challenge</button></div></div></div>
   <div class="sec">Open challenges</div><div class="card"><div class="bd row" style="justify-content:space-between"><span><b>Ava</b> · “Outsiders see more because they understand less.” · 6 turns</span><button class="btn p">Accept</button></div></div>
   <div class="sec">Earlier</div><div class="card"><div class="bd muted">Horris vs Jun · “Tools shape thinking more than thinking shapes tools.” · 10 turns · 3 rules</div></div></div>
  </div></div>''', right=members_panel)

voice_css = '''.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:16px}.tile{aspect-ratio:16/10;border-radius:12px;background:#0c0c10;border:2px solid var(--line);display:grid;place-items:center;position:relative}
.tile.talk{border-color:var(--green);box-shadow:0 0 0 3px #3ddc8433}.tile .av{width:72px;height:72px;font-size:26px}.tile .nm{position:absolute;left:10px;bottom:8px;font-size:13px;background:#000a;padding:2px 8px;border-radius:6px}
.tile .ic{position:absolute;right:10px;bottom:8px;font-size:13px}.tile .opt{position:absolute;right:8px;top:8px}.bar{display:flex;justify-content:center;gap:8px;padding:12px;border-top:1px solid var(--line);flex:none;flex-wrap:wrap}
.cc{margin:0 16px 8px;padding:10px 14px;border-radius:10px;background:#0b0b0e;border:1px solid var(--line);font-size:15px}.cc small{color:var(--faint)}
.umenu.fixed{position:absolute!important}'''
page('voice.html', title='Voice', ic='🔊', name='Workshop', desc='3 in the room · end to end between you', page='voice', cur='Workshop', css=voice_css,
  note='Click ⋯ on a tile (or right-click anyone) for volume, mute for me, report, call. Shown open on Maya.',
  main='''<div class="scroll"><div class="tiles">
  <div class="tile"><div data-u="h" class="avslot"></div><span class="nm">Horris (you)</span><span class="ic">🎙</span></div>
  <div class="tile talk"><div data-u="m" class="avslot"></div><span class="nm">Maya</span><span class="ic">🔊 120%</span><button class="btn g opt" data-open="m">⋯</button></div>
  <div class="tile"><div data-u="t" class="avslot"></div><span class="nm">Theo</span><span class="ic">🔇 muted for you</span><button class="btn g opt">⋯</button></div>
  </div>
  <div class="cc"><small>Captions · on this device only</small><br><b style="color:#7fd3ff">Maya:</b> …so the plotter only moves when somebody in the group is speaking, and the sand keeps the shape of the conversation.</div></div>
  <div class="bar"><button class="btn g">🎙 Mute</button><button class="btn g">🎧 Deafen</button><button class="btn g">⟲ Replay 15 s</button><button class="btn g" style="color:var(--green)">◎ Clarity on</button><button class="btn g" style="color:var(--green)">CC Captions on</button><button class="btn g">🖥 Share screen</button><button class="btn g">⚙ Audio</button><button class="btn x">Leave</button></div>''',
  js="setTimeout(() => { const b = document.querySelector('[data-open]').getBoundingClientRect(); MOCK.menu('m', b.left - 200, b.bottom + 6); }, 50); document.querySelectorAll('.opt').forEach((b, i) => b.onclick = (e) => { e.stopPropagation(); const r = b.getBoundingClientRect(); MOCK.menu(['m','t'][i], r.left - 200, r.bottom + 6); });")

page('idea.html', title='Idea', ic='✦', name='An idea and everything built on it', desc='Each piece keeps its author', page='idea', cur='ideas',
  css='.chain{border-left:2px solid #1f3a2c;margin-left:18px;padding-left:22px}.piece{position:relative;margin:12px 0}.piece::before{content:"";position:absolute;left:-29px;top:14px;width:12px;height:12px;border-radius:50%;background:var(--green)}',
  note='Ideas, pieces and forks are built (idea.chain).',
  main='''<div class="scroll"><div class="pad" style="max-width:820px">
  <div class="card"><div class="hd" style="color:var(--green)">✦ The idea · <span data-u="t" style="cursor:pointer;color:#b79bff">Theo</span> · Nov 14</div><div class="bd" style="font-size:16px">A plotter that draws with sand, driven by whatever the group is talking about.</div></div>
  <div class="sec">Built on — 3 pieces</div><div class="chain">
   <div class="piece card"><div class="bd"><b data-u="m" style="cursor:pointer;color:#7fd3ff">Maya</b> <span class="faint">· 9:40</span><br>Map the arguments onto it: where people disagree, the sand piles up.</div></div>
   <div class="piece card"><div class="bd"><b data-u="j" style="cursor:pointer;color:#ff8fb1">Jun</b> <span class="faint">· 10:05</span><br>The motor's hum could be tuned to the room's key, so it is also an instrument.</div></div>
   <div class="piece card"><div class="bd"><b data-u="h" style="cursor:pointer;color:#ff8a3d">Horris</b> <span class="faint">· 10:30</span><br>Wire it into the canvas in ERAVOS: the plot becomes a pattern.</div></div>
  </div>
  <div class="row" style="margin:12px 0 0 40px"><button class="btn p">Add the next piece</button><button class="btn g">Fork it</button></div>
  <div class="sec">Forks — 1</div><div class="card"><div class="bd"><b style="color:#ff8a3d">Horris</b> · Sand music instead: the drawing is the score. <a href="#">2 pieces →</a></div></div></div></div>''')

page('members.html', title='Members', ic='☺', name='Members & closeness', desc='Who is here, how they are, what you have made together', page='members', cur='',
  css='.mcard{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--raise)}.mcard .x{flex:1;min-width:0}.mcard small{display:block;color:var(--faint)}',
  note='Appreciations, nudges, moods and presence are built; friends are new (backend addition).',
  main='''<div class="scroll"><div class="pad"><div class="grid2">
  <div><div class="sec" style="margin-top:0">Here now — 3</div>
   <div class="mcard"><div data-u="m" class="avslot"></div><div class="x"><b>Maya</b> <span class="pill">Admin</span><small>in #ideas</small></div><button class="btn g">✧</button><button class="btn g">💭</button></div><div style="height:8px"></div>
   <div class="mcard"><div data-u="t" class="avslot"></div><div class="x"><b>Theo</b> <span class="pill">Moderator</span><small>sparring in #spar-arena</small></div><button class="btn g">✧</button><button class="btn g">💭</button></div><div style="height:8px"></div>
   <div class="mcard"><div data-u="a" class="avslot"></div><div class="x"><b>Ava</b> <span class="pill">Member</span><small>🌧 slow day · away</small></div><button class="btn g">✧</button><button class="btn g">💭</button></div>
   <div class="sec">Away — 3</div>
   <div class="mcard" style="opacity:.6"><div data-u="r" class="avslot"></div><div class="x"><b>Rafe</b><small>AI · software · last here yesterday</small></div><button class="btn g">✧</button></div><div style="height:8px"></div>
   <div class="mcard" style="opacity:.6"><div data-u="j" class="avslot"></div><div class="x"><b>Jun</b> <span class="pill">Builder</span><small>music · sound</small></div><button class="btn g">✧</button></div><div style="height:8px"></div>
   <div class="mcard" style="opacity:.6"><div data-u="s" class="avslot"></div><div class="x"><b>Sol</b><small>joined this week · say hello</small></div><button class="btn p">Welcome</button></div></div>
  <div><div class="card"><div class="hd" style="color:var(--violet)">✧ Appreciate someone</div><div class="bd"><select class="in" style="width:100%"><option>Theo</option></select><label class="lbl">What they did</label><textarea class="in" rows="2">The sand plotter idea changed my week.</textarea><div class="row" style="margin-top:10px"><button class="btn p">Send — the group sees it</button></div></div></div>
   <div class="sec">Appreciations</div>
   <div class="card"><div class="bd"><b style="color:#7fd3ff">Maya</b> → <b style="color:#b79bff">Theo</b> <span class="faint">· 2h</span><br>The sand plotter idea changed my week.</div></div><div style="height:8px"></div>
   <div class="card"><div class="bd"><b style="color:#ff8a3d">Horris</b> → <b style="color:#ffd166">Ava</b> <span class="faint">· today</span><br>For saying the quiet thing out loud.</div></div>
   <div class="sec">My friends <span class="new">new</span></div><div class="card"><div class="bd muted">Maya · Theo · 1 request from Sol <button class="btn g" style="height:24px;font-size:12px">Accept</button></div></div></div>
  </div></div></div>''')

page('profile.html', title='Profile', ic='☺', name='Horris', desc='Profile', page='profile', cur='',
  css='.hero{border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--raise)}.hero .banner{height:130px;background:linear-gradient(135deg,#ff8a3d,#ff5c8a 60%,#16161b)}.hero .bd{padding:0 22px 20px}.hero .moodwrap{margin-top:-80px}.hero .av{width:110px;height:110px;font-size:40px;border:6px solid var(--raise)}.hero .bubble{font-size:14px;padding:8px 14px;max-width:260px}.stat{flex:1;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--raise)}.stat b{font-size:20px;display:block}',
  note='The mood sits over the picture as a bubble. Editing is in Settings › Profile.',
  main='''<div class="scroll"><div class="pad" style="max-width:900px">
  <div class="hero"><div class="banner"></div><div class="bd"><div data-u="h" class="bigmood"></div>
   <div class="row" style="justify-content:space-between;margin-top:6px"><div><h2 style="margin:0">Horris</h2><div class="muted">Owner · inventor · systems</div></div>
   <div class="row"><a class="btn g" href="settings/profile.html">Edit profile</a></div></div>
   <p style="margin:14px 0 0;max-width:620px">I build tools for thinking: ERAVOS, Emerge, Perspect. Ask me about sand.</p></div></div>
  <div class="sec">Together</div><div class="row"><div class="stat"><b>14</b><span class="muted">spars</span></div><div class="stat"><b>9</b><span class="muted">ideas built on</span></div><div class="stat"><b>23</b><span class="muted">appreciations</span></div><div class="stat"><b>6</b><span class="muted">friends</span></div></div>
  <div class="sec">Recent appreciations</div><div class="card"><div class="bd"><b style="color:#7fd3ff">Maya</b> <span class="faint">· 2h</span><br>For running the first meetup.</div></div>
  <div class="sec">Ideas started</div><div class="card"><div class="bd">Wire the sand plotter into the ERAVOS canvas · <a href="idea.html">3 pieces</a></div></div>
  </div></div>''', js="document.querySelectorAll('.bigmood').forEach(e => e.outerHTML = MOCK.moodAv(e.dataset.u));")

def tg(on): return f'<span class="tg {"on" if on else ""}"></span>'
page('admin.html', title='Admin', ic='⚙', name='Admin', desc='Roles, invites, channels, reports and the audit log', page='admin', cur='',
  css='.mx{width:100%;border-collapse:collapse;font-size:13px}.mx th,.mx td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:center}.mx th:first-child,.mx td:first-child{text-align:left}.mx td.y{color:var(--green)}.mx td.n{color:var(--faint)}',
  note='Roles, ranks, overrides, invites, emoji and the audit log are built. Reports are new (backend addition).',
  main='''<div class="tabs"><a class="tab">Group</a><a class="tab">Invites</a><a class="tab on">Roles &amp; permissions</a><a class="tab">Members</a><a class="tab">Channels</a><a class="tab">Emoji</a><a class="tab">Reports <span class="pill" style="background:var(--rose);color:#fff;border:0">1</span></a><a class="tab">Audit log</a></div>
  <div class="scroll"><div class="pad">
  <div class="row" style="justify-content:space-between"><div class="muted">You act only on roles ranked below yours, and grant only what you hold.</div><button class="btn p">＋ New role</button></div>
  <div class="card" style="margin-top:12px;overflow:auto"><table class="mx"><tr><th>Permission</th><th>Owner<br><small class="faint">1000</small></th><th>Admin<br><small class="faint">800</small></th><th>Moderator<br><small class="faint">500</small></th><th>Builder<br><small class="faint">300 · custom</small></th><th>Member<br><small class="faint">100</small></th></tr>''' +
  ''.join(f'<tr><td>{p}</td>' + ''.join(f'<td class="{"y" if v=="1" else "n"}">{"✓" if v=="1" else "—"}</td>' for v in row) + '</tr>' for p,row in [
   ('See channels','11111'),('Post','11111'),('Delete others\' messages','11100'),('Join voice','11111'),('Invite people','11110'),('Manage members','11000'),('Manage channels','11000'),('Manage roles','11000'),('Group name & about','11000'),('Group emoji','11100'),('Read the audit log','11100'),('Handle reports','11100')]) +
  '''</table></div>
  <div class="grid2" style="margin-top:14px">
   <div class="card"><div class="hd">⚑ Report waiting <span class="new">new</span></div><div class="bd"><b>Ava</b> reported a message in #philosophy · 20 min ago<div class="muted" style="margin:6px 0">“Felt dismissive of a newcomer.” — the message is attached, visible to moderators only.</div><div class="row"><button class="btn g">Open the message</button><button class="btn g">Talk to them</button><button class="btn g">Resolve</button></div></div></div>
   <div class="card"><div class="hd">Audit log</div><div class="bd" style="font-family:var(--mono);font-size:12px;line-height:1.8">10:41 Maya&nbsp;&nbsp;member.set_role Theo → Moderator<br>10:30 Horris channel.set_override #organizers: Member ✕ see<br>10:02 cli&nbsp;&nbsp;&nbsp;&nbsp;invite.create 10 uses · Member<br>09:15 Maya&nbsp;&nbsp;emoji.add :spark:</div></div>
  </div></div></div>''')

open('join.html','w',encoding='utf8').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perspect — Join (preview)</title><link rel="stylesheet" href="../../group/web/kit.css">
<style>.wrap{min-height:100vh;display:grid;place-items:center;padding:16px}.box{width:100%;max-width:440px}.brand{font-size:26px;font-weight:800}.brand b{background:linear-gradient(135deg,var(--fire),var(--rose));-webkit-background-clip:text;color:transparent}</style></head><body>
<div class="wrap"><div class="box"><div class="brand"><b>Perspect</b></div><p class="muted">You were invited to <b style="color:var(--text)">Invention, Intention, Systems &amp; Outcasts</b> · 7 members, 3 here now</p>
<div class="card"><div class="bd"><label class="lbl">Invite code</label><input class="in" value="kq7Hd2_xP9w-"><label class="lbl">Your name</label><input class="in" placeholder="what the group calls you" value="Sol">
<label class="lbl">A line about you (optional)</label><input class="in" placeholder="what you make, what you think about">
<div class="row" style="margin-top:14px"><button class="btn p">Join the group</button><span class="faint" style="font-size:12px">Your key is made on this device and never leaves it.</span></div></div></div>
<p class="faint" style="font-size:12px">Already a member here? <a href="chat.html">Open the group</a></p></div></div></body></html>''')
print('built')
