# the full window that Settings and Admin share: nav on the left, one section per HTML page, filling the screen (preview only)
I = lambda n: f'<i data-i="{n}"></i>'
S = lambda t, sub='', ctl='': f'<div class="set"><div>{t}{f"<small>{sub}</small>" if sub else ""}</div>{ctl}</div>'
G = lambda t, cls='': f'</section><section class="panel {cls}"><h3>{t}</h3>'      # start the next panel
sel = lambda *o: '<select class="in">' + ''.join(f'<option>{x}</option>' for x in o) + '</select>'
BTN = lambda t, k='g': f'<button class="btn {k}">{t}</button>'
tg = lambda on: f'<span class="tg {"on" if on else ""}"></span>'
PILL = lambda t, c='': f'<span class="pill" style="{f"color:{c};border-color:{c}55" if c else ""}">{t}</span>'

badge = lambda b: f'<span class="pill badge">{b}</span>' if b else ''

def window(fn, key, title, body, nav, brand, sub, foot, note, lead='', css=''):
    """nav = [(heading, [(key, label, icon, badge)])]; body is panels opened with G()."""
    links = ''.join(f'<h5>{h}</h5>' + ''.join(f'<a href="{k}.html" class="{"on" if k == key else ""}">{I(ic)}{n}{badge(b)}</a>' for k, n, ic, b in items) for h, items in nav)
    body = ('<section class="panel">' + body + '</section>').replace('<section class="panel"></section>', '')
    html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perspect — {title} (preview)</title>
<link rel="stylesheet" href="../../../group/web/kit.css"><link rel="stylesheet" href="../shell.css"><style>{css}</style></head><body>
<div class="sw"><nav class="snav"><div class="sbrand"><a href="../chat.html" title="Back to the group">{I('back')}</a><div>{brand}<small>{sub}</small></div></div>
<div class="slist">{links}</div><div class="sfoot">{foot}</div></nav>
<main class="sbody"><header class="shead"><h1>{title}</h1><span class="sub">{lead}</span><a class="sclose" href="../chat.html" title="Close"><span>{I('x')}</span><small>ESC</small></a></header>
<div class="scontent"><div class="cols">{body}</div></div></main></div>
<script src="../mock.js"></script><script>document.querySelectorAll('.avslot').forEach(e => e.outerHTML = MOCK.av(e.dataset.u, e.dataset.s)); MOCK.icons();
addEventListener('keydown', e => {{ if (e.key === 'Escape' && !document.querySelector('.umenu,.pcard')) location.href = '../chat.html'; }});
const on = document.querySelector('.slist a.on'); if (on) on.scrollIntoView({{ block: 'nearest', inline: 'center' }});
document.body.insertAdjacentHTML('beforeend', MOCK.note({note!r}));</script></body></html>'''
    open(fn, 'w', encoding='utf8').write(html)
