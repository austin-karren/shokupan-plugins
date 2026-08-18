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
docs are consistent already and I will stop looking; if it was not, I have a
small replacement running locally and can offer it.

## Notes for us (not part of the issue)

Our `shokupan.notifications` deliberately does **not** restore the deleted
widget. Its `pendingModel`/`pastModel` no longer exist, so the original renders
but throws on every load (observed). Ours is a thin button over `showHistory`
plus the DND toggle — the shape that survives upstream churn.
