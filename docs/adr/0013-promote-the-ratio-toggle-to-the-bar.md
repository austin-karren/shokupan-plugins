---
status: accepted
---

# Promote the Ratio toggle out of a menu and onto the bar

The Ratio toggle — constraining a lone window to 1:1 via Hyprland's
`single_window_aspect_ratio` — is used often enough that living three levels deep
in a menu is the wrong home for it. It is now `custom/ratio` on the right of the bar,
backed by [`ratio-toggle`](../../.local/bin/ratio-toggle).

## Correction to the original framing

Ratio is **not** in the System Palette. It is an entry in Omarchy's Toggle Menu
(`SUPER+CTRL+O`), which dispatches to
`omarchy-hyprland-window-single-square-aspect-toggle`. Worth stating because
"move it out of the quick menu" describes a move that cannot happen as written.

## Decided: it goes on the bar

The bar is the wanted surface, and the precedent is already set — `custom/apexshot`
and `custom/calendar` are both bespoke modules added to this bar for exactly this
reason. A UI toggle is no different in kind. The open questions below are about how,
not whether.

## Settled: always visible, with a state distinction

The module renders in both states rather than only when active — being able to
*point* at it is the reason it is going on the bar. Omarchy's own indicators
(`custom/idle-indicator` and friends) do the opposite, emitting empty text when
inactive, so this is a deliberate departure from that convention.

## How state is read — and a correction

An earlier draft of this ADR said the flag lives at
`~/.local/state/omarchy/toggles/single-window-aspect-ratio` and should be read with
`omarchy-toggle-enabled single-window-aspect-ratio`. **Both are wrong**, and wrong in
a way that fails silently.

`omarchy-hyprland-window-single-square-aspect-toggle` delegates to
`omarchy-hyprland-toggle`, not `omarchy-toggle`, and that variant writes into a
`hypr/` subdirectory with a `.conf` suffix:

```
~/.local/state/omarchy/toggles/hypr/single-window-aspect-ratio.conf
```

`omarchy-toggle-enabled` only ever tests `toggles/$1`, so it returns false while the
toggle is on. Verified by observation: with Ratio enabled, that command still reported
not-enabled. Following the original advice would have produced an icon permanently
stuck in the "off" state, with nothing to indicate why. The module tests the real path
directly.

The two toggle families exist because Hyprland flags have to be *sourced* as config —
`hyprland.conf` sources `toggles/hypr/*.conf` and the script runs `hyprctl reload` —
whereas ordinary toggles are just marker files.

## Two glyphs, chosen by looking at them

An earlier draft argued for one glyph plus a CSS class, on the grounds that picking a
"similar looking" partner glyph blind is how `custom/calendar` ended up needing a
comment recording that `F0479` is an SD card rather than a palette. That reasoning was
sound about the *risk* and wrong about the *remedy*: the fix for not knowing what a
glyph looks like is to render it and look, which takes one command.

Rendered candidates with `pango-view` and inspected them. The pair:

| State | Codepoint | Glyph |
|---|---|---|
| off | `U+F01A0` | `crop_landscape` — a wide rectangle |
| on | `U+F01A2` | `crop_square` — a square |

Same Material Design family, same stroke weight, same optical size, differing only in
aspect — so the bar does not appear to change weight when toggled, and the icon states
what a lone window will *do* rather than merely that something is on.

The CSS `.active` class is deliberately **not** styled. In this bar `.active` means
`#a55555` red and is reserved for warnings — recording, idle disabled, notifications
silenced. Ratio being on is a normal state, not a warning.

`U+F2D0`, which Omarchy uses in the toggle's own notifications, was not reused: it has
no off-state partner, which is the whole requirement here.

## Placement and spacing

`custom/ratio` sits between `custom/apexshot` and `custom/weather`. The right group
divides into actions then status — `apexshot` acts, everything from `weather` rightwards
reports — and a toggle belongs with the actions.

It takes **no bespoke margins**. `style.css` already solves this cluster with uniform
*pitch* rather than tuned gaps (`min-width: 18px; margin: 0 5.7px`), precisely because
status glyphs change width between states; adding `#custom-ratio` to that selector list
is the whole change. Both new glyphs measured narrower than the `cpu` glyph already in
that grid, so they fit the shared box.

Verified by measuring ink-blob centres from a screenshot in both states. Every
neighbouring icon is pixel-identical either way — centres `3452, 3506, 3605, 3652,
3704, 3756, 3804` unchanged — so toggling shifts nothing on the bar. Residual pitch
variation of a few physical pixels is glyph ink asymmetry inside fixed boxes, not
layout drift.

## Refresh

`omarchy-hyprland-toggle` reloads Hyprland but knows nothing about Waybar, so clicking
the module sends `SIGRTMIN+11` itself (signals 7–10 are taken by Omarchy's indicators).

A 3-second `interval` backs that up, because Ratio can still be flipped from the Toggle
Menu, which calls Omarchy's script directly and cannot signal the bar. Re-reading a flag
file every few seconds is free and keeps the icon honest whichever route is used.

## Resolved

`~/.config/hypr/looknfeel.conf` carries `single_window_aspect_ratio = 1 1` **commented
out**, so there is no competing source for the setting. Left as documentation.
