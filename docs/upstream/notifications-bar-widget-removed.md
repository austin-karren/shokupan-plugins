# Draft issue: was removing the notifications bar widget intentional?

**Status: draft — not posted.** ADR-0044 rule 5: issues first, nothing posted
without an explicit go from Austin.

Upstream: basecamp/omarchy. Commit `fc4caf3c`, "Extract notification center bar
widget" (25 Jul 2026).

## Body (draft)

`fc4caf3c` removes `shell/plugins/notifications/BarWidget.qml` (412 lines),
drops `bar-widget` from the notifications manifest's `kinds`, deletes the
widget's row from `shell/plugins/README.md` and `shell/plugins/bar/README.md`,
and removes its test case from `test/shell.d/notifications-test.sh`.

The subject says *extract*, but nothing in that commit adds the widget anywhere
else, and I cannot find a destination for it in the tree since. As of r1744:

- `shell/plugins/notifications/` contains `Service.qml`, `NotificationLogic.js`,
  `manifest.json` and `components/NotificationCard.qml` — the toast card only.
- No notification-center UI exists anywhere under `shell/` (grep finds no
  reference).
- No plugin providing a notifications bar widget was added in the surrounding
  window — the plugins added around then were clock, tmux and nightlight.

So on current main there is no bell, no unread badge, and no way to browse
notification history from the bar. The README it deleted described what is now
missing: *"Bell with badge + popup with recent notifications, DND toggle — left
= popup · right = toggle DND."*

History itself clearly survived the change — it moved to disk under the
service's `historyDir`, capped at `historyLimit`, replayable through the
`showHistory` IPC — which is why this reads like half of a move rather than a
removal on purpose.

**The question:** was dropping the bar widget deliberate (with the keybindings
and `showHistory` intended as the whole interface), or is the other half of the
extraction still to land? Happy to help either way — if it was deliberate, the
docs are consistent already and I will stop looking; if it was not, the removed
file itself is what I am running.

For disclosure: because there is no supported bar entry point, I am carrying
your own deleted `BarWidget.qml` from `fc4caf3c^` as a third-party plugin,
near-verbatim — the module name plus four null guards on `pendingModel`/
`pastModel` so it survives the moment before the first-party service resolves.
It runs clean against current main. That is the whole of my "replacement": it is
your code, not mine, which is the reason for asking rather than just shipping.

## Notes for us (not part of the issue)

`shokupan.notifications` **is** upstream's deleted widget, restored. It is not
our design and we should not present it as one.

- `plugins/shokupan-notifications/Notifications.qml` (414 lines) is
  `shell/plugins/notifications/BarWidget.qml` (412 lines) as it stood at
  `fc4caf3c^`, with five lines changed: the `moduleName`, and four null guards.
- `plugins/shokupan-notifications/NotificationLogic.js` (244 lines) is the same
  revision's 242-line file with five lines changed.
- `pendingModel`/`pastModel` do exist on the service. The two "Cannot read
  property count of undefined" warnings fired once at startup, before
  `firstPartyServiceFor('omarchy.notifications')` resolved; guarding the two
  properties (`Notifications.qml:48-49`) cleared them. An earlier note here
  read those warnings as proof the widget could not work and described ours as
  "a thin button over `showHistory`" — that thin button was a regression,
  reverted in `8bd480a`, and this file's claim went stale with it.
- Provenance is recorded in `LICENSE` (per-path derivation) and the README
  attribution section; this draft, the LICENSE and the README must keep saying
  the same thing.
