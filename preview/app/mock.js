/* PREVIEW ONLY — made-up people and messages, so every page can be seen before it is built. Same frame as the real
 * pages (group/web/kit.css + shell.css); nothing here talks to a server. */
(function () {
  const B = document.currentScript.src.replace(/[^/]*$/, '');   // preview/app/, so links work from settings/ and admin/ too
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // ── icons: Lucide-style strokes (24 grid, 2 px, round caps), drawn inline so a page needs no icon font ──
  const P = {
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>',
    sparkles: '<path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
    nudge: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
    headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    replay: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    rule: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    keyboard: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
    pencil: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    devices: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    captions: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    fork: '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9M12 12v3"/>',
  };
  const I = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  const icons = (root) => (root || document).querySelectorAll('i[data-i]').forEach(e => e.outerHTML = I(e.dataset.i));

  const M = {
    h: { name: 'Horris', c: '#ff8a3d', st: 'here', role: 'Owner', mood: ['⚡', 'building all day'], note: 'inventor · systems', preset: 'ember', about: 'I build tools for thinking: ERAVOS, Emerge, Perspect. Ask me about sand.' },
    m: { name: 'Maya', c: '#7fd3ff', st: 'here', role: 'Admin', where: 'ideas', note: 'systems · psychology', about: 'I map how things fail — habits, teams, software.' },
    t: { name: 'Theo', c: '#b79bff', st: 'here', role: 'Moderator', where: 'spar-arena', note: 'hardware tinkerer', preset: 'orbit', about: 'If it has a motor I have taken it apart.' },
    a: { name: 'Ava', c: '#ffd166', st: 'away', role: 'Member', mood: ['🌧', 'slow day'], note: 'philosophy', about: 'Reading more than I am saying, for now.' },
    r: { name: 'Rafe', c: '#6ee7a8', st: 'offline', role: 'Member', note: 'AI · software', about: '' },
    j: { name: 'Jun', c: '#ff8fb1', st: 'offline', role: 'Builder', note: 'music · sound', preset: 'tide', about: 'Everything hums in some key.' },
    s: { name: 'Sol', c: '#9ad0c2', st: 'offline', role: 'Member', note: 'new here', about: '' },
  };
  const ME = 'h';
  const PRESETS = [['', 'Letter'], ['ember', 'Ember'], ['tide', 'Tide'], ['orbit', 'Orbit'], ['pulse', 'Pulse'], ['prism', 'Prism']];
  const CH = [
    ['Welcome', [['hash', 'start-here', 'chat'], ['hash', 'introductions', 'chat', 2]]],
    ['Thinking', [['hash', 'ideas', 'chat', 1], ['hash', 'systems', 'chat'], ['hash', 'philosophy', 'chat']]],
    ['Making', [['hash', 'inventions', 'chat'], ['hash', 'show-and-tell', 'chat']]],
    ['Sparring', [['swords', 'spar-arena', 'spar', 1]]],
    ['Meetups', [['clock', 'events', 'chat']]],
    ['Voice', [['volume', 'Workshop', 'voice', 0, ['h', 'm', 't']], ['volume', 'Lounge', 'voice']]],
    ['Admin', [['lock', 'organizers', 'chat']]],
  ];
  // a picture: the first letter on the person's colour, or one of the animated presets
  const av = (k, s, preset) => { const p = preset === undefined ? M[k].preset : preset;
    return `<div data-u="${k}" class="av ${s ? 's' : ''} ${p ? 'pa pa-' + p : ''}" style="background:${M[k].c};--c:${M[k].c}">${p ? '' : M[k].name[0]}<span class="st ${M[k].st}"></span></div>`; };
  const moodText = (k) => M[k].mood ? `${M[k].mood[0]} ${esc(M[k].mood[1])}` : '';
  // the mood bubble over a person's picture; on your own it is also the editor
  const moodAv = (k, small, edit) => (M[k].mood || edit)
    ? `<div class="moodwrap ${small ? 's' : ''}"><div class="bubble ${small ? 's' : ''} ${edit ? 'edit' : ''}" data-b="${k}" ${edit ? 'data-moodedit title="Change your mood"' : ''}>${moodText(k) || '＋ Set a mood'}</div>${av(k, small)}</div>` : av(k, small);

  function shell(page, current) {
    const app = document.getElementById('app');
    document.getElementById('rail').innerHTML = `<a class="gi on" href="${B}chat.html" title="Invention, Intention, Systems &amp; Outcasts">II</a><hr><a class="gi" href="${B}members.html" title="Members">${I('users')}</a><a class="gi" href="${B}admin/overview.html" title="Admin">${I('shield')}</a><a class="gi" href="${B}settings/account.html" title="Settings" style="margin-top:auto">${I('settings')}</a>`;
    document.getElementById('side').innerHTML = `<div class="ghead"><div class="gname">Invention, Intention,<br>Systems &amp; Outcasts</div><div class="gsub">7 members · <span class="live">● 3 here</span></div></div>
      <div class="chs">${CH.map(([cat, list]) => `<div class="cat">${cat}</div>` + list.map(([ic, n, pg, badge, inv]) => `<a class="ch ${n === current ? 'on' : ''}" href="${B}${pg}.html?c=${n}"><span class="ic">${I(ic)}</span><span class="n">${n}</span>${badge ? `<span class="pill badge">${badge}</span>` : ''}</a>` +
        (inv ? `<div class="vc">${inv.map(k => `<span>${av(k, 1)}${M[k].name}</span>`).join('')}</div>` : '')).join('')).join('')}</div>
      <div class="links"><a href="${B}members.html" class="${page === 'members' ? 'on' : ''}">${I('users')} Members &amp; closeness</a><a href="${B}admin/overview.html">${I('shield')} Admin <span class="pill badge" style="margin-left:auto">1</span></a></div>
      <div class="me"><div class="mebtn" data-u="${ME}" title="You">${av(ME)}<div class="who"><b>${M[ME].name}</b><i data-b="${ME}">${moodText(ME) || M[ME].role}</i></div></div><a class="btn g" href="${B}settings/account.html" title="Settings">${I('settings')}</a></div>`;
    const top = document.querySelector('.top');
    if (top) { top.insertAdjacentHTML('afterbegin', `<button class="btn g menu" title="Channels">${I('menu')}</button>`); top.querySelector('.menu').onclick = () => app.classList.toggle('nav'); }
    app.insertAdjacentHTML('beforeend', '<div class="scrim"></div>'); app.querySelector('.scrim').onclick = () => app.classList.remove('nav');
  }
  const note = (text) => `<div class="pnote" onclick="this.remove()" title="Click to hide">PREVIEW · ${text}</div>`;

  // ── a person, anywhere: click for their card, right-click for the menu. Your own picture opens your own menu. ──
  const close = () => document.querySelectorAll('.umenu,.pcard').forEach(x => x.remove());
  function place(el, x, y) {
    document.body.appendChild(el); icons(el); const r = el.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px'; el.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  }
  function menu(k, x, y) {
    if (k === ME) return selfMenu(x, y);
    close(); const u = M[k], el = document.createElement('div'); el.className = 'umenu';
    el.innerHTML = `<div class="hd">${av(k)}<div><b>${u.name}</b><small>${u.role} · ${u.st}</small></div></div>
      <a href="${B}profile.html?u=${k}"><span class="i-w">${I('user')}</span>View profile</a>
      <button><span class="i-w">${I('userplus')}</span>Add friend<span class="new">new</span></button>
      <hr>
      <button><span class="i-w">${I('bulb')}</span>Co-create with ${u.name}</button>
      <a href="${B}spar.html?vs=${k}"><span class="i-w">${I('swords')}</span>Challenge to a spar</a>
      <button><span class="i-w">${I('mail')}</span>Send a one-way message</button>
      <button><span class="i-w">${I('heart')}</span>Appreciate</button>
      <button><span class="i-w">${I('nudge')}</span>Nudge</button>
      <hr>
      <button><span class="i-w">${I('phone')}</span>Call ${u.name}<span class="new">new</span></button>
      <div class="vol"><label><span>${I('volume')} Volume (just for you)</span><span id="uv">100%</span></label><input type="range" min="0" max="200" value="100" oninput="document.getElementById('uv').textContent=this.value+'%'"></div>
      <button><span class="i-w">${I('mute')}</span>Mute for me</button>
      <hr>
      <button class="danger"><span class="i-w">${I('flag')}</span>Report ${u.name}<span class="new">new</span></button>`;
    place(el, x, y);
  }
  function selfMenu(x, y) {
    close(); const u = M[ME], el = document.createElement('div'); el.className = 'umenu';
    el.innerHTML = `<div class="hd">${av(ME)}<div><b>${u.name}</b><small>${u.role} · ${moodText(ME) || 'no mood set'}</small></div></div>
      <a href="${B}profile.html"><span class="i-w">${I('user')}</span>View profile</a>
      <button data-act="mood"><span class="i-w">${I('smile')}</span>${u.mood ? 'Change mood' : 'Set a mood'}</button>
      <a href="${B}profile.html?edit=1"><span class="i-w">${I('pencil')}</span>Edit profile</a>
      <hr>
      <button><span class="i-w"><span class="dot here"></span></span>Here<span class="new" style="color:var(--green)">${I('check')}</span></button>
      <button><span class="i-w"><span class="dot away"></span></span>Away</button>
      <button><span class="i-w">${I('moon')}</span>Do not disturb</button>
      <hr>
      <a href="${B}settings/account.html"><span class="i-w">${I('settings')}</span>Settings</a>
      <a href="${B}join.html" class="danger"><span class="i-w">${I('logout')}</span>Log out of this device</a>`;
    place(el, x, y);
    el.querySelector('[data-act=mood]').onclick = (e) => { e.stopPropagation(); const r = el.getBoundingClientRect(); moodEdit(r.left, r.top); };
  }
  function cardFor(k, x, y) {
    close(); const u = M[k], el = document.createElement('div'); el.className = 'pcard';
    el.innerHTML = `<div class="banner" style="background:linear-gradient(135deg,${u.c},#16161b)"></div><div class="bd"><div style="margin-top:-44px">${moodAv(k)}</div>
      <h3>${u.name}</h3><div class="muted" style="font-size:12.5px">${u.role} · ${u.note}</div>
${u.where ? `<div class="faint" style="font-size:12px;margin-top:4px">in #${u.where}</div>` : ''}
      <div class="sec">Together</div><div class="muted" style="font-size:12.5px">2 spars · 3 ideas built on · appreciated you twice</div>
      <div class="row"><a class="btn p" style="flex:1;justify-content:center" href="${B}profile.html?u=${k}">${I('user')} View profile</a><button class="btn g" title="Co-create">${I('bulb')}</button><button class="btn g" title="Spar">${I('swords')}</button><button class="btn g" title="Call">${I('phone')}</button><button class="btn g" title="More" data-more="${k}">${I('more')}</button></div></div>`;
    place(el, x, y);
    el.querySelector('[data-more]').onclick = (e) => { e.stopPropagation(); menu(k, e.clientX, e.clientY); };
  }
  // the mood editor: opened from the bubble over your own picture, or from your menu
  function moodEdit(x, y) {
    close(); const cur = M[ME].mood || ['😊', ''], el = document.createElement('div'); el.className = 'pcard medit';
    el.innerHTML = `<div class="bd"><div class="sec" style="margin-top:12px">Your mood — a bubble over your picture</div>
      <div class="row" style="flex-wrap:nowrap"><span class="emo" id="me-e">${cur[0]}</span><input class="in" id="me-t" maxlength="80" placeholder="how are you, in a few words" value="${esc(cur[1])}"></div>
      <div class="emos">${['😊', '⚡', '🌧', '🔥', '🧠', '😴', '🎧', '💭', '🌱', '🛠'].map(e => `<button>${e}</button>`).join('')}</div>
      <div class="set" style="border:0;padding:10px 0 0"><span class="muted">Clear after</span><select class="in"><option>24 hours</option><option>4 hours</option><option>Tonight</option><option>Never</option></select></div>
      <div class="row" style="margin-top:12px"><button class="btn p" id="me-s">Save</button><button class="btn g" id="me-c">Clear mood</button></div></div>`;
    place(el, x, y);
    el.querySelectorAll('.emos button').forEach(b => b.onclick = () => el.querySelector('#me-e').textContent = b.textContent);
    const done = (m) => { M[ME].mood = m; document.querySelectorAll(`[data-b="${ME}"]`).forEach(b => b.innerHTML = moodText(ME) || (b.classList.contains('bubble') ? '＋ Set a mood' : M[ME].role)); close(); };
    el.querySelector('#me-s').onclick = () => done([el.querySelector('#me-e').textContent, el.querySelector('#me-t').value.trim()]);
    el.querySelector('#me-c').onclick = () => done(null);
    el.querySelector('#me-t').focus();
  }
  document.addEventListener('contextmenu', (e) => { const t = e.target.closest('[data-u]'); if (!t) return; e.preventDefault(); menu(t.dataset.u, e.clientX, e.clientY); });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.umenu,.pcard')) return;
    const b = e.target.closest('[data-moodedit]'); if (b) { e.preventDefault(); e.stopPropagation(); const r = b.getBoundingClientRect(); moodEdit(r.left, r.bottom + 10); return; }
    const t = e.target.closest('[data-u]');
    if (t) { e.preventDefault(); e.stopPropagation(); t.dataset.u === ME ? selfMenu(e.clientX + 8, e.clientY - 20) : cardFor(t.dataset.u, e.clientX + 8, e.clientY - 20); return; }
    close();
  }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  function toasts(list) {
    let box = document.querySelector('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    list.forEach(([c, ic, title, body, acts]) => box.insertAdjacentHTML('beforeend', `<div class="toast2" style="--c:${c}"><span class="tic">${ic}</span><div><b>${title}</b><span>${body}</span>${acts ? `<div class="acts">${acts}</div>` : ''}</div><button class="x" onclick="this.parentElement.remove()">${I('x')}</button></div>`));
    icons(box);
  }
  window.MOCK = { B, M, ME, CH, PRESETS, I, icons, av, esc, shell, note, menu, selfMenu, cardFor, moodAv, moodEdit, moodText, toasts };
})();
