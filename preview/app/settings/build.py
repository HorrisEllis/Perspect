from frame import page, tg
S = lambda t, sub='', ctl='': f'<div class="set"><div>{t}{f"<small>{sub}</small>" if sub else ""}</div>{ctl}</div>'
G = lambda t: f'<div class="grp">{t}</div>'
sel = lambda *o: '<select class="in">' + ''.join(f'<option>{x}</option>' for x in o) + '</select>'
BTN = lambda t, k='g': f'<button class="btn {k}">{t}</button>'

page('account', 'My account', '''<div class="card"><div style="height:90px;background:linear-gradient(135deg,#ff8a3d,#ff5c8a 60%,#16161b)"></div><div class="bd row" style="justify-content:space-between">
<div class="row"><div data-u="h" class="avslot"></div><div><b style="font-size:17px">Horris</b><div class="faint">Owner of Invention, Intention, Systems &amp; Outcasts</div></div></div>''' + BTN('Edit profile', 'p') + '''</div>
<div class="bd" style="background:var(--bg);margin:0 14px 14px;border-radius:8px">''' + S('Display name', 'Horris', BTN('Edit')) + S('Sign-in', 'A key on each device — no password to leak', BTN('Devices &amp; keys')) + S('Recovery', 'Link a second device so losing one is not losing you', BTN('Set up')) + '''</div></div>''' +
G('Groups') + S('Invention, Intention, Systems &amp; Outcasts', 'Owner · joined Nov 14', BTN('Leave', 'x')) + G('Account removal') + S('Remove me from every group', 'Your messages stay unless you delete them in Data &amp; export', BTN('Remove account', 'x')))

page('profile', 'Profile', G('Preview') + '''<div class="card"><div style="height:70px;background:linear-gradient(135deg,#ff8a3d,#16161b)"></div><div class="bd" style="padding-top:0">
<div class="moodwrap" style="margin-top:-30px"><div class="bubble">⚡ building all day</div><div data-u="h" class="avslot"></div></div>
<b style="font-size:17px;display:block;margin-top:4px">Horris</b><span class="faint">inventor · systems</span></div></div>''' +
G('Mood — shown as a bubble over your picture') + '''<div class="row"><input class="in" style="width:64px;text-align:center;font-size:20px" value="⚡"><input class="in" style="flex:1" maxlength="80" value="building all day"></div>
<div class="row" style="margin-top:8px">''' + ''.join(BTN(e) for e in ['😊', '⚡', '🌧', '🔥', '🧠', '😴', '🎧', '💭']) + '''</div>''' +
S('Clear the mood after', '', sel('24 hours', '4 hours', 'Tonight', 'Never')) + G('About you') +
S('A line about you', '', '<input class="in" style="width:300px" value="inventor · systems">') +
'<label class="lbl">About <span class="new">new</span></label><textarea class="in" rows="3">I build tools for thinking: ERAVOS, Emerge, Perspect. Ask me about sand.</textarea>' +
G('Colour and banner') + '<div class="row">' + ''.join(f'<span style="width:28px;height:28px;border-radius:50%;background:{c};{"outline:2px solid #fff;outline-offset:2px" if i == 0 else ""}"></span>' for i, c in enumerate(['#ff8a3d', '#7fd3ff', '#b79bff', '#ffd166', '#6ee7a8', '#ff8fb1', '#9ad0c2'])) + '</div>',
'''.moodwrap{position:relative;display:inline-block}.moodwrap .av{width:84px;height:84px;font-size:30px;border:5px solid var(--raise)}''')

page('privacy', 'Privacy & safety', G('What others see') + S('Show which channel I am in', '', tg(True)) + S('Show when I am typing', '', tg(True)) + S('Show my mood', '', tg(True)) +
G('Who can reach me') + S('Who can call me', '', sel('Friends', 'Anyone in the group', 'No one')) + S('Who can send friend requests', '', sel('Anyone in the group', 'Friends of friends', 'No one')) + S('Who can challenge me to a spar', '', sel('Anyone', 'Friends', 'No one')) + S('Nudges', 'A gentle "thinking of you"', sel('Friends', 'Anyone', 'No one')) +
G('Safety') + S('Muted for me', 'Theo · you can unmute any time', BTN('Manage')) + S('Blocked', 'They cannot message, call, spar or nudge you', BTN('Manage')) + S('My reports', '1 report · resolved', BTN('View')))

page('devices', 'Devices & keys', '<p class="muted">You sign in with a key made on each device. It never leaves it, so there is no password to steal.</p>' +
S('This browser', 'Key 7F3A · 91C2 · 0BE4 · 55D1 · made Nov 14', '<span class="pill" style="color:var(--green)">this device</span>') + S('Desktop app — Windows', 'Key 2D90 · A1F7 · … · added Nov 14 · last used today', BTN('Remove', 'x')) +
S('Link a new device <span class="new">new</span>', 'Show a code here, scan it there', BTN('Link a device', 'p')) + G('Group contract') + S('Contract', 'perspect.group 1.0.0 · a0cd9dd3…', '<span class="pill" style="color:var(--green)">matches the server</span>'))

page('friends', 'Friends', '<div class="row" style="margin-bottom:12px">' + BTN('All · 6', 'p') + BTN('Online · 2') + BTN('Requests · 1') + '<span style="flex:1"></span><input class="in" style="width:240px" placeholder="Add a friend by name"></div>' +
''.join(f'<div class="set"><div class="row"><div data-u="{k}" class="avslot"></div><div>{n}<small>{s}</small></div></div><div class="row">{BTN("✦")}{BTN("⚔")}{BTN("📞")}{BTN("⋯")}</div></div>' for k, n, s in [('m', 'Maya', 'in #ideas'), ('t', 'Theo', 'sparring'), ('a', 'Ava', '🌧 slow day')]) +
G('Requests') + '<div class="set"><div class="row"><div data-u="s" class="avslot"></div><div>Sol<small>joined this week</small></div></div><div class="row">' + BTN('Accept', 'p') + BTN('Ignore') + '</div></div>')

page('audio', 'Voice & audio', G('Microphone') + S('Input device', '', sel('USB microphone', 'Laptop microphone')) + S('Mic profile', 'Intimate keeps breath and quiet endings; Meeting suppresses noise', sel('Intimate', 'Balanced', 'Meeting')) +
S('Input level', '', '<input type="range" style="accent-color:var(--fire);width:220px">') + S('Push to talk', 'Hold Space', tg(False)) +
G('Hearing others') + S('Output device', '', sel('Headphones', 'Speakers')) + S('Clarity', 'Gate, presence and gain for a muffled mic', sel('Accent boost', 'Default', 'Off')) +
S('Replay buffer', 'Hear the last seconds again; kept in memory, gone when the call ends', sel('15 s', '30 s')) + S('Replay speed', '', sel('0.7×', '1×')) +
G('Captions') + S('Live captions', 'Made on this device, never sent', tg(True)) + S('Language &amp; accent', 'Helps with a strong accent', sel('English — Indian', 'English — US', 'English — UK', 'Auto')) +
G('Per person') + S('Volumes and mutes you set', 'Maya 120% · Theo muted', BTN('Reset all')))

page('notifications', 'Notifications', G('Pop-ups (toasts)') + S('Show toasts', 'In the corner, for a few seconds', tg(True)) + S('Toast position', '', sel('Top right', 'Bottom right', 'Top centre')) + S('Sound', '', tg(True)) +
G('Tell me about') + S('Mentions and replies', '', tg(True)) + S('One-way messages', '', tg(True)) + S('Spar challenges and turns', '', tg(True)) + S('Nudges and appreciations', '', tg(True)) +
S('Someone joins', '', tg(False)) + S('Reports <span class="new">new</span>', 'Only if you can handle reports — a toast and the Admin badge', tg(True)) +
G('Quiet') + S('Quiet hours', '10 PM – 8 AM · only reports and calls from friends come through', tg(True)) + S('Do not disturb', 'Nothing until you turn it off', tg(False)))

page('appearance', 'Appearance', G('Theme — a new choice; today\'s stays the default') + '<div class="row">' + ''.join(f'<div class="card" style="width:150px"><div style="height:70px;background:{bg}"></div><div class="bd" style="padding:8px 10px">{n}</div></div>' for n, bg in [('Black (default)', '#060607'), ('Ember', 'linear-gradient(135deg,#1a0a04,#060607)'), ('Deep blue', 'linear-gradient(135deg,#06101e,#060607)')]) + '</div>' +
G('Text') + S('Text size', '', sel('Normal', 'Large', 'Larger')) + S('Compact messages', '', tg(False)) + S('Show avatars', '', tg(True)) + G('Motion') + S('Reduce motion', '', tg(False)))

page('accessibility', 'Accessibility', S('Captions in every call', '', tg(True)) + S('Replay button always visible', '', tg(True)) + S('High contrast', '', tg(False)) + S('Reduce motion', '', tg(False)) + S('Read messages aloud', 'On this device', tg(False)) + S('Longer spar turns for me', 'Asks the other side to agree', tg(False)))

page('keybinds', 'Keybinds', ''.join(S(a, '', f'<span class="pill" style="font-family:var(--mono)">{k}</span>') for a, k in [('Push to talk', 'Space'), ('Mute', 'Ctrl+Shift+M'), ('Replay 15 s', 'Ctrl+R'), ('Settings', 'Ctrl+,'), ('Search', 'Ctrl+K'), ('Next channel', 'Alt+↓')]))

page('data', 'Data & export', S('Export everything I wrote', 'Messages, ideas, spars, appreciations — one file', BTN('Export', 'p')) + S('Delete my messages', 'In every channel; others keep their replies', BTN('Delete…', 'x')) + G('On this device') + S('Clear this device', 'Removes the key here; you will need another device or an invite', BTN('Clear', 'x')))
print('settings built')
