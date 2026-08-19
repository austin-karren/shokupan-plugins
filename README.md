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

## Upstream drift

Four files here are patched copies of Omarchy's own, and one hosts an upstream
widget. They carry a recorded SHA of the upstream file they were verified
against; after an Omarchy update, re-diff rather than assuming. `Panel.qml` and
`BarWidget.qml` in `austinkarren.clock` are **both** patched — refreshing them by
re-cloning silently deletes the behaviour they exist for.
