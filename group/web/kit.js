/* kit.js — what every Perspect page shares: signing in (the handshake, through /group/client.js and the page's own
 * contract pin), the live group state, the rail and the channel list, and small helpers. A page only fills <main>.
 *   PK.start('chat', async (ctx) => { ... })     ctx = { g, S, esc, av, nameOf, can, ago, toast, channelHref, refresh }
 *   S = { group, channels, members, roles, me, perms, voice }, kept current from events */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLORS = ['#ff8a3d', '#7fd3ff', '#b79bff', '#ffd166', '#6ee7a8', '#ff8fb1', '#9ad0c2', '#f4a261', '#a0c4ff', '#cdb4db'];
  const colorOf = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
  const S = { group: null, channels: [], members: [], roles: [], me: null, perms: [], voice: {} };
  const member = (id) => S.members.find(m => m.id === id);
  const nameOf = (id) => (member(id) || {}).name || 'someone';
  const av = (id, small) => { const m = member(id) || { name: '?', status: 'offline' }; return `<div class="av ${small ? 's' : ''}" style="background:${colorOf(id)}" title="${esc(m.name)}">${esc((m.name || '?')[0].toUpperCase())}<span class="st ${m.status}"></span></div>`; };
  const can = (p) => S.perms.includes(p);
  const ago = (t) => { const d = new Date(t), now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  const toast = (msg) => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); };
  const PAGE_OF = { text: 'chat', events: 'chat', spar: 'spar', voice: 'voice' };
  const channelHref = (ch) => `${PAGE_OF[ch.kind] || 'chat'}.html?c=${encodeURIComponent(ch.id)}`;
  const IC = { text: '#', events: '◷', spar: '⚔', voice: '🔊' };
  let page = '', current = null;

  function renderShell() {
    const rail = document.getElementById('rail'), side = document.getElementById('side'); if (!rail || !side) return;
    const ini = (S.group.name || 'G').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    rail.innerHTML = `<a class="gi on" href="chat.html" title="${esc(S.group.name)}">${esc(ini)}</a><hr><a class="gi" href="members.html" title="Members">☺</a>${can('invite.create') || can('member.manage') || can('channel.manage') || can('role.manage') || can('audit.view') ? '<a class="gi" href="admin.html" title="Admin">⚙</a>' : ''}`;
    const here = S.members.filter(m => m.status !== 'offline').length, cats = [];
    S.channels.forEach(c => { let k = cats.find(x => x[0] === c.category); if (!k) cats.push(k = [c.category, []]); k[1].push(c); });
    const me = S.me;
    side.innerHTML = `<div class="ghead"><div class="gname">${esc(S.group.name)}</div><div class="gsub">${S.members.length} members · <span class="live">● ${here} here</span></div></div>
      <div class="chs">${cats.map(([cat, list]) => `<div class="cat">${esc(cat || 'Channels')}</div>` + list.map(c => `<a class="ch ${c.id === current ? 'on' : ''}" href="${channelHref(c)}"><span class="ic">${IC[c.kind]}</span><span class="n">${esc(c.name)}</span></a>` +
        (c.kind === 'voice' && (S.voice[c.id] || []).length ? `<div class="vc">${S.voice[c.id].map(id => `<span>${av(id, 1)}${esc(nameOf(id))}</span>`).join('')}</div>` : '')).join('')).join('')}</div>
      <div class="links"><a href="members.html" class="${page === 'members' ? 'on' : ''}">☺ Members &amp; closeness</a>${can('audit.view') || can('invite.create') ? `<a href="admin.html" class="${page === 'admin' ? 'on' : ''}">⚙ Admin</a>` : ''}</div>
      <div class="me">${av(me.id)}<div class="who"><b>${esc(me.name)}</b><i>${me.mood ? esc(me.mood.emoji + ' ' + (me.mood.note || '')) : esc((S.roles.find(r => r.id === me.roleId) || {}).name || '')}</i></div>
        <button class="btn g" title="Here / away" id="pk-away">${me.status === 'away' ? '◐' : '●'}</button></div>`;
    document.getElementById('pk-away').onclick = () => ctx.g.call('presence.set', { status: S.me.status === 'away' ? 'here' : 'away' });
  }
  async function refresh() {
    const r = await ctx.g.call('group.get');
    Object.assign(S, { group: r.group, channels: r.channels, members: r.members, roles: r.roles, me: r.me, perms: r.myPermissions, voice: r.voice });
    renderShell();
  }
  const ctx = { g: null, S, esc, av, nameOf, member, can, ago, toast, channelHref, refresh, colorOf, IC, setChannel: (id) => { current = id; renderShell(); } };

  async function start(name, fn) {
    page = name; current = new URLSearchParams(location.search).get('c');
    const pin = PerspectGroup.pagePin(document);
    try {
      const identity = await PerspectGroup.webIdentity();
      const invite = sessionStorage.getItem('perspect.invite') || undefined, nm = sessionStorage.getItem('perspect.name') || undefined;
      ctx.g = await PerspectGroup.connect({ url: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/group', contract: pin, identity, invite, name: nm });
      sessionStorage.removeItem('perspect.invite');
    } catch (e) {
      if (name !== 'join' && (e.code === 'invite_invalid' || e.code === 'removed')) { location.href = 'join.html' + (e.code === 'removed' ? '?removed=1' : ''); return; }
      if (name === 'join') return fn(ctx, e);
      document.body.innerHTML = `<div class="pad"><h2>Could not connect</h2><p class="err">${esc(e.code)}: ${esc(e.message)}</p>${e.code === 'contract_mismatch' ? '<p class="muted">This page and the server speak different versions. Reload to get the current pages.</p>' : ''}</div>`; return;
    }
    await refresh();
    const upd = (m) => { const i = S.members.findIndex(x => x.id === m.id); if (i >= 0) S.members[i] = Object.assign(S.members[i], m); else S.members.push(m); if (m.id === S.me.id) Object.assign(S.me, m); };
    const g = ctx.g;
    g.on('member.joined', d => { upd(d.member); renderShell(); }); g.on('member.updated', d => { upd(d.member); refresh(); });
    g.on('member.left', d => { S.members = S.members.filter(m => m.id !== d.memberId); renderShell(); });
    g.on('presence', d => { upd({ id: d.memberId, status: d.status, mood: d.mood, where: d.where }); renderShell(); });
    ['channel.created', 'channel.updated', 'channel.deleted', 'role.changed', 'group.updated'].forEach(e => g.on(e, () => refresh()));
    g.on('voice.state', d => { for (const k of Object.keys(S.voice)) S.voice[k] = S.voice[k].filter(x => x !== d.memberId); if (d.joined) (S.voice[d.channelId] = S.voice[d.channelId] || []).push(d.memberId); renderShell(); });
    g.on('nudge', d => toast('💭 ' + nameOf(d.from) + ' is thinking of you'));
    g.on('appreciation', d => { if (d.appreciation.to === S.me.id) toast('✦ ' + nameOf(d.appreciation.from) + ' appreciated you' + (d.appreciation.note ? ': ' + d.appreciation.note : '')); });
    g.on('removed', () => { location.href = 'join.html?removed=1'; });
    g.on('closed', () => toast('Disconnected — reload to reconnect'));
    if (current) g.call('presence.set', { where: current }).catch(() => {});
    await fn(ctx);
  }
  window.PK = { start, esc, ctx };
})();
