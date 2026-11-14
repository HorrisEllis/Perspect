# the settings window: full screen like Discord, each section its own HTML (preview only)
NAV = [('USER SETTINGS', [('account', 'My account'), ('profile', 'Profile'), ('privacy', 'Privacy & safety'), ('devices', 'Devices & keys'), ('friends', 'Friends')]),
       ('APP SETTINGS', [('audio', 'Voice & audio'), ('notifications', 'Notifications'), ('appearance', 'Appearance'), ('accessibility', 'Accessibility'), ('keybinds', 'Keybinds'), ('data', 'Data & export')])]
CSS = '''html,body{overflow:hidden}.sw{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,760px) minmax(80px,1fr);height:100vh;background:var(--main)}
.snav{background:var(--side);display:flex;justify-content:flex-end;overflow:auto;border-right:1px solid var(--line)}.snav .in2{width:232px;padding:60px 8px 24px}
.snav h5{margin:16px 10px 6px;color:var(--faint);font-size:11px;letter-spacing:.06em}.snav a{display:block;padding:7px 10px;border-radius:6px;color:var(--dim);margin:1px 0}.snav a:hover{background:var(--hover);color:var(--text)}.snav a.on{background:var(--raise);color:var(--text)}
.snav hr{border:0;border-top:1px solid var(--line);margin:10px}.snav .out{color:#ff8b8b}
.sbody{overflow:auto;padding:60px 40px 80px}.sbody h1{font-size:20px;margin:0 0 18px}.close{padding:60px 20px}.close a{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:2px solid var(--faint);color:var(--dim);font-size:16px}
.close a:hover{border-color:var(--text);color:var(--text)}.close small{display:block;text-align:center;width:38px;color:var(--faint);font-size:11px;margin-top:6px}
.set{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--line)}.set small{display:block;color:var(--faint);font-size:12.5px;margin-top:2px}
.tg{width:40px;height:24px;border-radius:12px;background:var(--hover);position:relative;flex:none}.tg::after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:var(--dim)}.tg.on{background:var(--green)}.tg.on::after{left:19px;background:#fff}
.grp{color:var(--faint);font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin:26px 0 4px}select.in{width:auto;min-width:180px}.new{font-size:10px;color:var(--amber);margin-left:6px}
@media (max-width:820px){.sw{grid-template-columns:1fr}.snav,.close{display:none}.sbody{padding:20px 16px}}'''
def tg(on): return f'<span class="tg {"on" if on else ""}"></span>'
def page(key, title, body, extra_css=''):
    nav = ''.join(f'<h5>{h}</h5>' + ''.join(f'<a href="{k}.html" class="{"on" if k == key else ""}">{n}</a>' for k, n in items) for h, items in NAV)
    html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perspect — {title} (preview)</title>
<link rel="stylesheet" href="../../../group/web/kit.css"><style>{CSS}{extra_css}</style></head><body>
<div class="sw"><nav class="snav"><div class="in2">{nav}<hr><a href="../join.html" class="out">Log out of this device</a><hr><div class="faint" style="font-size:11px;padding:0 10px">Perspect · contract 1.0.0</div></div></nav>
<main class="sbody"><h1>{title}</h1>{body}</main><div class="close"><a href="../chat.html" title="Close">✕</a><small>ESC</small></div></div>
<script src="../mock.js"></script><script>document.querySelectorAll('.avslot').forEach(e => e.outerHTML = MOCK.av(e.dataset.u)); addEventListener('keydown', e => {{ if (e.key === 'Escape') location.href = '../chat.html'; }});
document.body.insertAdjacentHTML('beforeend', MOCK.note('Settings is its own full window; every section is its own page.'));</script></body></html>'''
    open(key + '.html', 'w', encoding='utf8').write(html)
