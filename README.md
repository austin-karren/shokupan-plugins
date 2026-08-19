# shokupan-plugins

Quickshell plugins and a Tokyo Night bar override for [Omarchy](https://omarchy.org),
extracted from one heavily-used desktop. Everything here is meant to be usable on
any Omarchy machine — the personal half of that desktop lives in
[shokupan](https://github.com/austin-karren/shokupan), and the
CachyOS-specific install path in
[omarchy-desktop-on-cachyos](https://github.com/austin-karren/omarchy-desktop-on-cachyos).

Verified against **Omarchy 4.0.0.r1744** (quattro).

## What is here

| Path | What it is |
|---|---|
| `plugins/shokupan-omenu` | Menu button wearing the power glyph instead of the Omarchy logo |
| `plugins/shokupan-apexshot` | Screenshot button: left area, middle record, right full screen |
| `plugins/shokupan-capture` | The same three clicks on the native `omarchy-capture-*` tools. Marked DORMANT — kept as the drop-in swap when the native flow matures |
| `plugins/shokupan-dpms-guard` | Keeps the display off while locked, for monitors whose USB-C deep sleep hotplugs the connector and wakes the output |
| `plugins/shokupan-notifications` | Omarchy's own notification bell and history popup, which upstream removed in `fc4caf3c`, kept alive as a third-party widget |
| `plugins/austinkarren.clock` | Clone of upstream's clock panel where day cells and the hero date open GNOME Calendar on the clicked day, and a second click closes it |
| `plugins/austinkarren.network` | Clone of upstream's network panel showing a globe for wired instead of an RJ45 socket |
| `bar/` | The indicators fork, which adds a user indicator (the zen aspect-ratio toggle) to a cluster upstream loads only from its own directory |
| `themes/tokyo-night/shell.bar.toml` | Pins the bar near-black under Tokyo Night so it reads as system chrome. A `[bar]` section override, the same mechanism stock tokyo-night uses for `shell.lock.toml` |
| `bin/` | The scripts the plugins shell out to. They are not optional: `austinkarren.clock` calls `calendar-toggle` and `clock-click`, and the Ratio indicator calls `ratio-toggle` |
| `docs/adr/` | Why each of these exists. Numbers are the originals and have gaps — the decisions that stayed personal kept their numbers in the other repo |

## Installing

The clones (`austinkarren.*`) take their ids from `omarchy plugin clone`, which is
what routes upstream's bar entry and IPC to them — do not rename them.

```bash
git clone https://github.com/austin-karren/shokupan.git ~/.local/share/shokupan
# link plugins/, bar/, bin/ and hooks/ into ~/.config/omarchy and ~/.local/bin,
# and COPY themes/ (omarchy-theme-set stages themes with cp -r, which turns a
# symlink into a dangling one), then add the widget ids to shell.json.
```

`loaf plugins` in shokupan does exactly that and is the reference
implementation if you want the layout it produces.

## License and attribution

MIT — see [`LICENSE`](LICENSE), which names the derivation path by path. In
short:

**Upstream Omarchy's, carried verbatim** (byte-identical to the installed
package at 4.0.0.r1744):

- `plugins/austinkarren.network/Panel.qml` — 1,958 lines, unchanged
- `plugins/austinkarren.clock/Model.js` — 296 lines, unchanged

**Upstream Omarchy's, patched here.** The bulk of each is upstream's; the
edits are small and marked in-file:

- `plugins/austinkarren.clock/Panel.qml` — calendar-opening date cells (ADR-0006)
- `plugins/austinkarren.clock/BarWidget.qml` — one branch, the dialog-aware left click
- `plugins/austinkarren.network/Model.js` — one line, the wired globe glyph (ADR-0029)
- `plugins/shokupan-notifications/Notifications.qml` — upstream's own notification
  centre widget (`shell/plugins/notifications/BarWidget.qml`, 412 lines) as it
  stood before `fc4caf3c` removed it, plus four null guards
- `plugins/shokupan-notifications/NotificationLogic.js` — same revision, five lines changed
- `bar/modules/indicators.qml` — upstream's 471-line indicators cluster plus the
  ~14-line user-directory search path this fork exists for
- `plugins/shokupan-omenu/BarWidget.qml` — adapted from upstream's menu bar widget;
  the button structure and both click actions are upstream's, the glyph and root are not
- `themes/tokyo-night/shell.bar.toml` — the `[bar]` section shape, its non-colour
  defaults and two comments come from upstream's `shell.toml.tpl`; the colours are ours

**Original here**, written against Omarchy's documented plugin, widget and
indicator APIs rather than copied from its implementations:
`plugins/shokupan-apexshot`, `plugins/shokupan-capture`,
`plugins/shokupan-dpms-guard`, `bar/indicators/Ratio.qml`, `bin/`, `hooks/`,
`docs/`, `packages/plugins` and every `manifest.json`.

## Upstream drift

The patched copies above carry a recorded SHA of the upstream file they were
verified against; after an Omarchy update, re-diff rather than assuming.
`Panel.qml` and `BarWidget.qml` in `austinkarren.clock` are **both** patched —
refreshing them by re-cloning silently deletes the behaviour they exist for.
