# omarchy-notification-desktop-entry

Omarchy's notification service, plus two patches to how a notification's
identity is stored:

1. **The `desktop-entry` fallback.** When a sender leaves `app_name` empty,
   recover its name and icon from the `desktop-entry` hint.
2. **The slot shift.** When a sender's summary is nothing but the app's own
   name, promote the body into the summary slot so the message is not one row
   too low. This one is a **heuristic and provisional** — see
   [Retiring the slot shift](#retiring-the-slot-shift).

Plugin id: `austinkarren.notifications`

## What it does

Some apps send a desktop notification without saying who they are. On Omarchy
they land in the notification centre with an empty app-name slot, and — for some
of them — no icon either. Two whole classes of sender do this, and neither is a
misconfiguration you can fix on your machine:

- **Anything using GLib's freedesktop notification backend** sends
  `app_name = ""`. Ghostty is the one you will notice, because agent and shell
  tools route notifications through the terminal.
- **Anything sandboxed**, because `xdg-desktop-portal-gtk` relays portal
  notifications to the notification service with `""` hardcoded as the app name.
  Slack, as a snap, goes this way.

Both of them do send the `desktop-entry` hint, which names the app's `.desktop`
file — and a `.desktop` file is exactly where a display name and an icon live.
Upstream's service stores `app: n.appName || ""` and never reads the hint, so the
one recoverable piece of identity is discarded at storage time and nothing
downstream can get it back.

This clone reads it. When `app_name` is empty it looks the `desktop-entry` value
up in the desktop database and stores the `Name=` it finds — `Ghostty`, `Slack` —
falling back to the raw hint value (`com.mitchellh.ghostty`) if nothing resolves,
because an ugly name still beats a blank one. When `app_icon` is empty too it
stores the `Icon=` from the same entry.

**A sender that sets `app_name` is untouched.** The fallback only ever fires on a
field that was already empty, so nothing that renders correctly today changes.

## Why the icon needs this as well as the name

Quickshell already resolves an icon from `desktop-entry` on its own, so most
apps that send no `app_icon` still get one. It does that with an exact
`byId()` match, and there is one shape of id where an exact match cannot work:
`xdg-desktop-portal` identifies a snap as `snap.<instance>`, while snapd names
the desktop file `<instance>_<app>.desktop`. `snap.slack` never matches
`slack_slack.desktop`, so Slack arrives with no icon at all.

Stripping that prefix and asking the looser `heuristicLookup()` finds it. That is
the whole reason this plugin fixes Slack's icon and not just its name.

## The slot shift

Some senders put the app's own name in the summary, because the transport they
arrived over gave them no title to put there. The visible case is any
terminal-delivered notification: the OSC 9 escape carries a body and no title,
so Ghostty has nothing to pass on and hardcodes the literal string `"Ghostty"`
as the summary. Every notification an agent sends through the terminal then
lands as

```
Ghostty                              ← app name
Ghostty                              ← summary: the app's own name, again
claude finished: gap-payments · 14   ← body: the actual message, one slot low
```

The renderer is not at fault. A notification that arrives over OSC 777, which
does carry a title, renders in this same daemon with no duplication at all.
Only the input is wrong, and it cannot be fixed at the source: herdr 0.8.2 sends
over OSC 9 with no way to choose OSC 777 — no config key, no flag, no
environment variable.

So the service fixes it at storage time. **When a notification's summary is
exactly the app's own name and there is a body underneath it, the first line of
the body moves up into the summary slot and the rest stays behind.** The row
above becomes

```
Ghostty
claude finished: gap-payments · 14
```

Three details decide whether the rule fires on the right things:

- **It compares against the name that will be drawn**, whichever of the three
  sources it came from — a wire `app_name`, a `Name=` recovered by the fallback
  above, or the raw hint value. Ghostty sends no `app_name` at all, so a rule
  that compared the wire value would never fire on the one sender that needs it.
  Comparing against the drawn name is also the right test on its own terms: the
  duplication being removed is between two things the user can see.
- **The match is trimmed but not case-folded.** Padding around a title is never
  meaningful; a sender's choice of capitalisation is.
- **An empty body never fires it.** Promoting nothing would leave the row with
  no message at all, which is worse than the duplication.

### Retiring the slot shift

**This is a heuristic, and it is meant to be temporary.** An app that
legitimately titles a notification with its own name and puts something
meaningful underneath would have that body promoted too. Every sender on the
machine this was built for was checked against the rule first and none does
that — but "none today" is not "none ever".

Retire it when the transport stops losing titles. Concretely: **if herdr gains a
way to emit OSC 777** (or any other route that carries a real title), turn that
on and delete this rule — `promoteBodyIntoSummary` in `NotificationLogic.js`, its
call in `snapshotOf`, and the `shift:` blocks in
`test/notification-logic-test.mjs`. The `desktop-entry` fallback is independent
of it and stays.

Two nearer-term escapes exist and were deliberately not taken here, because both
change settings outside this plugin: herdr's `[ui.toast] delivery` can be set to
something other than `terminal`, and a terminal other than Ghostty may fill the
summary differently.

## Install

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-notification-desktop-entry.git --enable
```

This plugin declares `omarchy.clonedFrom: omarchy.notifications`, Omarchy's own
mechanism for a drop-in replacement: enabling it takes over the built-in
notification service and removing it hands it back. You do not need to disable
`omarchy.notifications` yourself.

It is a **service** plugin, not a bar widget — it is the notification daemon
itself, so enabling it swaps out the thing that is currently receiving your
notifications. Expect the live toasts to be re-created as it takes over. Popups
that were on screen are restored from upstream's own persistence files, which is
machinery this clone does not change.

## Remove

```bash
omarchy plugin remove austinkarren.notifications
```

Upstream's notification service returns automatically.

## Dependencies

None beyond Omarchy itself. The lookup goes through Quickshell's own
`DesktopEntries`, which Omarchy already ships.

## Upstream first

These are small patches maintained as a whole-file copy of a large service,
which is a poor trade and is not meant to last. The durable fix for the
`desktop-entry` fallback is the same fallback in upstream's own service, and
that has been drafted as a request to the Omarchy project. **If Omarchy takes
the fallback, use it and remove this plugin.**

The slot shift retires on a different trigger and is not an Omarchy bug at all —
it is a workaround for a transport that loses titles. It goes away when the
sender stops losing them; see [Retiring the slot shift](#retiring-the-slot-shift).
The two are independent, so upstream taking the fallback does not on its own
empty this plugin out.

The other two halves of the underlying problem are not Omarchy's and are not
fixed here: GLib sending an empty `app_name` at all, and `xdg-desktop-portal`
identifying a snap by a string that does not name its desktop file. Either being
fixed upstream would make part of this plugin dead code.

## Provenance and attribution

**This is a derivative work of the Omarchy project, and is almost entirely
upstream's code.**

- `components/NotificationCard.qml` (189 lines) is a byte-for-byte copy of
  Omarchy's.
- `Service.qml` is Omarchy's 1,062-line service plus four added lines and three
  changed ones, all marked `// SHOKUPAN:` — one object declaration and the three
  call sites that hand it to the logic.
- `NotificationLogic.js` is Omarchy's 368-line module with the `desktop-entry`
  fallback and the slot shift added, and the body of `snapshotOf` rewritten to
  route both through. Every divergence is marked `// SHOKUPAN:`.
- `DesktopEntryLookup.qml` (39 lines) is the only original file here.
- `manifest.json` is `omarchy plugin clone`'s own rewrite of upstream's, with the
  name, author, license and description edited.

Omarchy is MIT licensed. The original copyright notice is retained in
[LICENSE](LICENSE), as MIT requires. Credit for this service belongs to the
Omarchy project; the contribution here is one fallback.

Verified against **Omarchy 4.0.0.r1744**. Re-diff against upstream after an
Omarchy update rather than assuming these copies still match — a stale copy of a
1,062-line service loses every fix upstream has made since.

## Tests

Both patches are pure functions of a notification's fields — the fallback plus
an injected resolver, the slot shift plus nothing at all — and the resolver is a
component of its own, so every half is tested in the monorepo rather than only
by looking at the panel:

```bash
test/notification-logic-test.sh      # the logic, under node
test/desktop-entry-lookup-test.sh    # the resolver, against the real desktop database
```

## License

MIT — see [LICENSE](LICENSE), which carries both Omarchy's copyright and the
modifications'.
