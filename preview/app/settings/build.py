# Settings: its own full window, each section its own HTML. Profile and mood are NOT here — they live on the profile page.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from frame import window, I, S, G, sel, BTN, tg, PILL
NAV = [('USER SETTINGS', [('account', 'My account', 'user', ''), ('privacy', 'Privacy & safety', 'shield', ''), ('devices', 'Devices & keys', 'key', ''), ('friends', 'Friends', 'users', '1')]),
       ('APP SETTINGS', [('audio', 'Voice & audio', 'mic', ''), ('notifications', 'Notifications', 'bell', ''), ('appearance', 'Appearance', 'sun', ''), ('accessibility', 'Accessibility', 'eye', ''), ('keybinds', 'Keybinds', 'keyboard', ''), ('data', 'Data & export', 'download', '')])]
FOOT = f'<a href="../join.html">{I("logout")}Log out of this device</a><div>Perspect · contract 1.0.0</div>'
def page(key, title, body, lead=''):
    window(key + '.html', key, title, body, NAV, 'Settings', 'Horris · this device', FOOT, 'Settings is its own full window; every section is its own page. Profile and mood are on the profile page.', lead)

page('account', 'My account', '''</section><section class="panel bare"><div class="card"><div style="height:90px;background:linear-gradient(135deg,#ff8a3d,#ff5c8a 60%,#16161b)"></div><div class="bd row" style="justify-content:space-between">
<div class="row"><div data-u="h" class="avslot"></div><div><b style="font-size:17px">Horris</b><div class="faint">Owner of Invention, Intention, Systems &amp; Outcasts</div></div></div><a class="btn p" href="../profile.html">View profile</a></div></div>''' +
G('Account') + S('Display name', 'Horris', BTN('Edit')) + S('Sign-in', 'A key on each device — no password to leak', '<a class="btn g" href="devices.html">Devices &amp; keys</a>') + S('Recovery', 'Link a second device so losing one is not losing you', BTN('Set up')) +
G('Groups') + S('Invention, Intention, Systems &amp; Outcasts', 'Owner · joined Nov 14', BTN('Leave', 'x')) + G('Account removal') + S('Remove me from every group', 'Your messages stay unless you delete them in Data &amp; export', BTN('Remove account', 'x')),
'Who you are on this device')

page('privacy', 'Privacy & safety', G('What others see') + S('Show which channel I am in', '', tg(True)) + S('Show when I am typing', '', tg(True)) + S('Show my mood', '', tg(True)) +
G('Who can reach me') + S('Who can call me', '', sel('Friends', 'Anyone in the group', 'No one')) + S('Who can send friend requests', '', sel('Anyone in the group', 'Friends of friends', 'No one')) + S('Who can challenge me to a spar', '', sel('Anyone', 'Friends', 'No one')) + S('Nudges', 'A gentle "thinking of you"', sel('Friends', 'Anyone', 'No one')) +
G('Safety') + S('Muted for me', 'Theo · you can unmute any time', BTN('Manage')) + S('Blocked', 'They cannot message, call, spar or nudge you', BTN('Manage')) + S('My reports', '1 report · resolved', BTN('View')))

page('devices', 'Devices & keys', G('Your devices') + S('This browser', 'Key 7F3A · 91C2 · 0BE4 · 55D1 · made Nov 14', PILL('this device', 'var(--green)')) + S('Desktop app — Windows', 'Key 2D90 · A1F7 · … · added Nov 14 · last used today', BTN('Remove', 'x')) +
S('Link a new device <span class="new">new</span>', 'Show a code here, scan it there', BTN('Link a device', 'p')) + G('Group contract') + S('Contract', 'perspect.group 1.0.0 · a0cd9dd3…', PILL('matches the server', 'var(--green)')),
'You sign in with a key made on each device. It never leaves it, so there is no password to steal.')

page('friends', 'Friends', '</section><section class="panel full bare"><div class="row">' + BTN('All · 6', 'p') + BTN('Online · 2') + BTN('Requests · 1') + '<span style="flex:1"></span><input class="in" style="width:240px" placeholder="Add a friend by name"></div>' + G('Friends') +
''.join(f'<div class="set"><div class="row" style="flex-wrap:nowrap"><div data-u="{k}" class="avslot"></div><div>{n}<small>{s}</small></div></div><div class="row">{BTN(I("bulb"))}{BTN(I("swords"))}{BTN(I("phone"))}{BTN(I("more"))}</div></div>' for k, n, s in [('m', 'Maya', 'in #ideas'), ('t', 'Theo', 'sparring'), ('a', 'Ava', '🌧 slow day')]) +
G('Requests') + '<div class="set"><div class="row" style="flex-wrap:nowrap"><div data-u="s" class="avslot"></div><div>Sol<small>joined this week</small></div></div><div class="row">' + BTN('Accept', 'p') + BTN('Ignore') + '</div></div>')

page('audio', 'Voice & audio', G('Microphone') + S('Input device', '', sel('USB microphone', 'Laptop microphone')) + S('Mic profile', 'Intimate keeps breath and quiet endings; Meeting suppresses noise', sel('Intimate', 'Balanced', 'Meeting')) +
S('Input level', '', '<input type="range" style="accent-color:var(--fire);width:220px;max-width:100%">') + S('Push to talk', 'Hold Space', tg(False)) +
G('Hearing others') + S('Output device', '', sel('Headphones', 'Speakers')) + S('Clarity', 'Gate, presence and gain for a muffled mic', sel('Accent boost', 'Default', 'Off')) +
S('Replay buffer', 'Hear the last seconds again; kept in memory, gone when the call ends', sel('15 s', '30 s')) + S('Replay speed', '', sel('0.7×', '1×')) +
G('Captions') + S('Live captions', 'Made on this device, never sent', tg(True)) + S('Language &amp; accent', 'Helps with a strong accent', sel('English — Indian', 'English — US', 'English — UK', 'Auto')) +
G('Per person') + S('Volumes and mutes you set', 'Maya 120% · Theo muted', BTN('Reset all')))

page('notifications', 'Notifications', G('Pop-ups (toasts)') + S('Show toasts', 'In the corner, for a few seconds', tg(True)) + S('Toast position', '', sel('Top right', 'Bottom right', 'Top centre')) + S('Sound', '', tg(True)) +
G('Tell me about') + S('Mentions and replies', '', tg(True)) + S('One-way messages', '', tg(True)) + S('Spar challenges and turns', '', tg(True)) + S('Nudges and appreciations', '', tg(True)) +
S('Someone joins', '', tg(False)) + S('Reports <span class="new">new</span>', 'Only if you can handle reports — a toast and the Admin badge', tg(True)) +
G('Quiet') + S('Quiet hours', '10 PM – 8 AM · only reports and calls from friends come through', tg(True)) + S('Do not disturb', 'Nothing until you turn it off', tg(False)))

page('appearance', 'Appearance', G('Theme — a new choice; today\'s stays the default', 'full') + '<div class="row" style="padding:10px 0">' + ''.join(f'<div class="card" style="flex:1;min-width:130px;max-width:260px"><div style="height:80px;background:{bg}"></div><div class="bd" style="padding:8px 10px">{n}</div></div>' for n, bg in [('Black (default)', '#060607'), ('Ember', 'linear-gradient(135deg,#1a0a04,#060607)'), ('Deep blue', 'linear-gradient(135deg,#06101e,#060607)')]) + '</div>' +
G('Text') + S('Text size', '', sel('Normal', 'Large', 'Larger')) + S('Compact messages', '', tg(False)) + S('Show avatars', '', tg(True)) + G('Motion') + S('Reduce motion', 'Also stills the animated pictures', tg(False)))

page('accessibility', 'Accessibility', G('Hearing') + S('Captions in every call', '', tg(True)) + S('Replay button always visible', '', tg(True)) + S('Read messages aloud', 'On this device', tg(False)) + G('Seeing and pace') + S('High contrast', '', tg(False)) + S('Reduce motion', '', tg(False)) + S('Longer spar turns for me', 'Asks the other side to agree', tg(False)))

page('keybinds', 'Keybinds', G('Shortcuts') + ''.join(S(a, '', f'<span class="pill" style="font-family:var(--mono)">{k}</span>') for a, k in [('Push to talk', 'Space'), ('Mute', 'Ctrl+Shift+M'), ('Replay 15 s', 'Ctrl+R'), ('Settings', 'Ctrl+,'), ('Search', 'Ctrl+K'), ('Next channel', 'Alt+↓')]))

page('data', 'Data & export', G('Your writing') + S('Export everything I wrote', 'Messages, ideas, spars, appreciations — one file', BTN('Export', 'p')) + S('Delete my messages', 'In every channel; others keep their replies', BTN('Delete…', 'x')) + G('On this device') + S('Clear this device', 'Removes the key here; you will need another device or an invite', BTN('Clear', 'x')))
print('settings built')
