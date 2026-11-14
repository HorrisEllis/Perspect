/* PREVIEW ONLY — made-up people and messages, so every page can be seen before it is built. Same frame as the real
 * pages (group/web/kit.css); nothing here talks to a server. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const M = {
    h: { name: 'Horris', c: '#ff8a3d', st: 'here', role: 'Owner', mood: ['⚡', 'building all day'], note: 'inventor · systems' },
    m: { name: 'Maya', c: '#7fd3ff', st: 'here', role: 'Admin', where: 'ideas', note: 'systems · psychology' },
    t: { name: 'Theo', c: '#b79bff', st: 'here', role: 'Moderator', where: 'spar-arena', note: 'hardware tinkerer' },
    a: { name: 'Ava', c: '#ffd166', st: 'away', role: 'Member', mood: ['🌧', 'slow day'], note: 'philosophy' },
    r: { name: 'Rafe', c: '#6ee7a8', st: 'offline', role: 'Member', note: 'AI · software' },
    j: { name: 'Jun', c: '#ff8fb1', st: 'offline', role: 'Builder', note: 'music · sound' },
    s: { name: 'Sol', c: '#9ad0c2', st: 'offline', role: 'Member', note: 'new here' },
  };
  const CH = [
    ['Welcome', [['#', 'start-here', 'chat'], ['#', 'introductions', 'chat', 2]]],
    ['Thinking', [['#', 'ideas', 'chat', 1], ['#', 'systems', 'chat'], ['#', 'philosophy', 'chat']]],
    ['Making', [['#', 'inventions', 'chat'], ['#', 'show-and-tell', 'chat']]],
    ['Sparring', [['⚔', 'spar-arena', 'spar', 1]]],
    ['Meetups', [['◷', 'events', 'chat']]],
    ['Voice', [['🔊', 'Workshop', 'voice', 0, ['h', 'm', 't']], ['🔊', 'Lounge', 'voice']]],
    ['Admin', [['🔒', 'organizers', 'chat']]],
  ];
  const av = (k, s) => `<div data-u="${k}" class="av ${s ? 's' : ''}" style="background:${M[k].c}">${M[k].name[0]}<span class="st ${M[k].st}"></span></div>`;
  function shell(page, current) {
    document.getElementById('rail').innerHTML = `<a class="gi on" href="chat.html" title="Invention, Intention, Systems &amp; Outcasts">II</a><hr><a class="gi" href="members.html" title="Members">☺</a><a class="gi" href="admin.html" title="Admin">⚙</a><a class="gi" href="settings/account.html" title="Settings" style="margin-top:auto">⚙︎</a>`;
    document.getElementById('side').innerHTML = `<div class="ghead"><div class="gname">Invention, Intention,<br>Systems &amp; Outcasts</div><div class="gsub">7 members · <span class="live">● 3 here</span></div></div>
      <div class="chs">${CH.map(([cat, list]) => `<div class="cat">${cat}</div>` + list.map(([ic, n, pg, badge, inv]) => `<a class="ch ${n === current ? 'on' : ''}" href="${pg}.html?c=${n}"><span class="ic">${ic}</span><span class="n">${n}</span>${badge ? `<span class="pill" style="background:var(--rose);color:#fff;border:0">${badge}</span>` : ''}</a>` +
        (inv ? `<div class="vc">${inv.map(k => `<span>${av(k, 1)}${M[k].name}</span>`).join('')}</div>` : '')).join('')).join('')}</div>
      <div class="links"><a href="members.html" class="${page === 'members' ? 'on' : ''}">☺ Members &amp; closeness</a><a href="admin.html" class="${page === 'admin' ? 'on' : ''}">⚙ Admin</a></div>
      <div class="me"><a href="profile.html">${av('h')}</a><a class="who" href="profile.html" style="color:inherit"><b>Horris</b><i>⚡ building all day</i></a><a class="btn g" href="settings/account.html" title="Settings">⚙</a></div>`;
  }
  const note = (text) => `<div style="position:fixed;right:12px;bottom:12px;z-index:30;background:#1d1405;border:1px solid #4a3410;color:var(--amber);font-size:11.5px;padding:6px 10px;border-radius:6px;max-width:320px">PREVIEW · ${text}</div>`;
  // ── a person, anywhere: right-click (or click their name) for their card and what you can do together ──
  const css = document.createElement('style');
  css.textContent = `.umenu{position:fixed;z-index:40;min-width:230px;background:#121217;border:1px solid var(--line);border-radius:10px;padding:6px;box-shadow:0 12px 40px #000c}
    .umenu .hd{display:flex;gap:10px;align-items:center;padding:8px 8px 10px;border-bottom:1px solid var(--line);margin-bottom:4px}.umenu .hd small{display:block;color:var(--faint);font-size:11.5px}
    .umenu button,.umenu a{display:flex;width:100%;gap:10px;align-items:center;padding:7px 10px;border-radius:6px;color:var(--text);font-size:13.5px;text-align:left}.umenu button:hover,.umenu a:hover{background:var(--hover)}
    .umenu .i{width:18px;text-align:center;color:var(--dim)}.umenu hr{border:0;border-top:1px solid var(--line);margin:4px 0}.umenu .vol{padding:6px 10px 8px}.umenu .vol label{display:flex;justify-content:space-between;font-size:12px;color:var(--dim)}
    .umenu input[type=range]{width:100%;accent-color:var(--fire)}.umenu .danger{color:#ff8b8b}.umenu .new{margin-left:auto;font-size:10px;color:var(--amber)}
    .pcard{position:fixed;z-index:39;width:300px;background:#121217;border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:0 12px 40px #000c}
    .pcard .banner{height:64px}.pcard .bd{padding:0 16px 14px}.pcard .bd .av{width:64px;height:64px;font-size:24px;border:5px solid #121217}
    .pcard h3{margin:6px 0 0;font-size:17px}.pcard .row{margin-top:10px}.pcard .sec{font-size:11px;color:var(--faint);letter-spacing:.06em;text-transform:uppercase;margin:12px 0 4px}`;
  css.textContent += `
    .moodwrap{position:relative;display:inline-block;padding-top:30px}.bubble{position:absolute;top:0;left:6px;background:#2a2a33;color:var(--text);border-radius:16px;padding:6px 12px;font-size:12.5px;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 4px 14px #0009;z-index:1}
    .bubble::after{content:"";position:absolute;left:22px;bottom:-7px;width:9px;height:9px;border-radius:50%;background:#2a2a33}.bubble::before{content:"";position:absolute;left:16px;bottom:-13px;width:5px;height:5px;border-radius:50%;background:#2a2a33}
    .bubble.s{font-size:11px;padding:3px 8px;top:2px}.moodwrap.s{padding-top:22px}
    .toasts{position:fixed;top:14px;right:14px;z-index:50;display:flex;flex-direction:column;gap:8px;width:340px}
    .toast2{display:flex;gap:10px;align-items:flex-start;background:#15151b;border:1px solid var(--line);border-left:3px solid var(--c,var(--cyan));border-radius:10px;padding:10px 12px;box-shadow:0 10px 30px #000b;animation:tin .25s ease}
    .toast2 b{display:block;font-size:13px}.toast2 span{color:var(--dim);font-size:12.5px}.toast2 .x{margin-left:auto;color:var(--faint)}.toast2 .acts{margin-top:8px;display:flex;gap:6px}
    @keyframes tin{from{transform:translateX(20px);opacity:0}}`;
  document.head.appendChild(css);
  const close = () => document.querySelectorAll('.umenu,.pcard').forEach(x => x.remove());
  function menu(k, x, y) {
    close(); const u = M[k], el = document.createElement('div'); el.className = 'umenu';
    el.innerHTML = `<div class="hd">${av(k)}<div><b>${u.name}</b><small>${u.role} · ${u.st === 'offline' ? 'offline' : u.st}</small></div></div>
      <a href="profile.html?u=${k}"><span class="i">☺</span>View profile</a>
      <button><span class="i">＋</span>Add friend<span class="new">new</span></button>
      <hr>
      <button><span class="i">✦</span>Co-create with ${u.name}</button>
      <a href="spar.html?vs=${k}"><span class="i">⚔</span>Challenge to a spar</a>
      <button><span class="i">✉</span>Send a one-way message</button>
      <button><span class="i">✧</span>Appreciate</button>
      <button><span class="i">💭</span>Nudge</button>
      <hr>
      <button><span class="i">📞</span>Call ${u.name}<span class="new">new</span></button>
      <div class="vol"><label><span>🔊 Volume (just for you)</span><span id="uv">100%</span></label><input type="range" min="0" max="200" value="100" oninput="document.getElementById('uv').textContent=this.value+'%'"></div>
      <button><span class="i">🔇</span>Mute for me</button>
      <hr>
      <button class="danger"><span class="i">⚑</span>Report ${u.name}<span class="new">new</span></button>`;
    document.body.appendChild(el); const r = el.getBoundingClientRect();
    el.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; el.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  }
  function cardFor(k, x, y) {
    close(); const u = M[k], el = document.createElement('div'); el.className = 'pcard';
    el.innerHTML = `<div class="banner" style="background:linear-gradient(135deg,${u.c},#16161b)"></div><div class="bd"><div style="margin-top:-44px">${moodAv(k)}</div>
      <h3>${u.name}</h3><div class="muted" style="font-size:12.5px">${u.role} · ${u.note}</div>
${u.where ? `<div class="faint" style="font-size:12px;margin-top:4px">in #${u.where}</div>` : ''}
      <div class="sec">Together</div><div class="muted" style="font-size:12.5px">2 spars · 3 ideas built on · appreciated you twice</div>
      <div class="row"><button class="btn p" style="flex:1">✦ Co-create</button><button class="btn g">⚔</button><button class="btn g">📞</button><button class="btn g" title="More" data-more="${k}">⋯</button></div></div>`;
    document.body.appendChild(el); const r = el.getBoundingClientRect();
    el.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; el.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
    el.querySelector('[data-more]').onclick = (e) => { e.stopPropagation(); menu(k, e.clientX, e.clientY); };
  }
  document.addEventListener('contextmenu', (e) => { const t = e.target.closest('[data-u]'); if (!t) return; e.preventDefault(); menu(t.dataset.u, e.clientX, e.clientY); });
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-u]'); if (t && !e.target.closest('.umenu,.pcard')) { e.preventDefault(); e.stopPropagation(); cardFor(t.dataset.u, e.clientX + 8, e.clientY - 20); return; } if (!e.target.closest('.umenu,.pcard')) close(); }, true);
  // the mood bubble over a person's picture
  const moodAv = (k, small) => M[k].mood ? `<div class="moodwrap ${small ? 's' : ''}"><div class="bubble ${small ? 's' : ''}">${M[k].mood[0]} ${M[k].mood[1]}</div>${av(k, small)}</div>` : av(k, small);
  function toasts(list) {
    let box = document.querySelector('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    list.forEach(([c, ic, title, body, acts]) => box.insertAdjacentHTML('beforeend', `<div class="toast2" style="--c:${c}"><span style="font-size:18px">${ic}</span><div><b>${title}</b><span>${body}</span>${acts ? `<div class="acts">${acts}</div>` : ''}</div><button class="x" onclick="this.parentElement.remove()">✕</button></div>`));
  }
  window.MOCK = { M, CH, av, esc, shell, note, menu, cardFor, moodAv, toasts };
})();
