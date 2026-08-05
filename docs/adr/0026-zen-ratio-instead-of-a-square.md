---
status: accepted
---

# The Zen ratio: a reading column, not a square

Renamed from **Ratio** to **Zen ratio**, and widened from `1 1` to `6 5`. The point of
the feature is holding a lone window to a comfortable reading width on a wide display; a
square was one setting of that, not the goal, and the old name described the setting.

Implemented in [`ratio-toggle`](../../.local/bin/ratio-toggle), which now owns the config
file — see below.

## Hyprland silently ignores gentle ratios

The requested value was 3:2. Two separate reasons it could not be used, and the second
is the one worth remembering.

**First, this display is already 3:2.** 3840×2560 is exactly 1.500, so a 3:2 constraint
leaves a lone window 2232px of the 2288px usable width — a 28px margin. Not a widening
of the square so much as switching the feature off.

**Second, and much less obvious: there is a hard ceiling at ~1.23 here, and exceeding it
fails silently.** Measured against a real window, available area 2284×1484:

| Ratio | Result | Applied? |
|---|---|---|
| 1:1 (1.000) | 1484px, 65% of full width | yes |
| 11:10 (1.100) | 1632px, 71% | yes |
| 6:5 (1.200) | 1782px, 78% | **yes — chosen** |
| 1.23 | 1826px, 79.9% | yes |
| 1.24 | ignored | no |
| 5:4 (1.250) | ignored | no |
| 4:3 (1.333) | ignored | no |
| 3:2 (1.500) | ignored | no |

The boundary is **0.8 × the available area's own aspect**: `0.8 × 1.5391 = 1.2313`, and
1.23 applies while 1.24 does not. So Hyprland appears to skip the constraint entirely
when it would shrink the window by less than 20% — a minimum-effect guard, with no
warning and no log line. A value above the ceiling looks exactly like the toggle being
broken.

**4:3 was chosen after seeing the width table and is unreachable. So is 5:4**, missing by
0.019. 6:5 is the widest clean ratio under the ceiling, and still takes a lone window
from 65% to 78% of the usable width.

The ceiling scales with the display, so **this is not portable**: on a 16:9 monitor the
limit would be ~1.42 and 4:3 would work fine. It is narrow here precisely because the
panel is 3:2.

## The toggle owns its own config file now

`omarchy-hyprland-window-single-square-aspect-toggle` copies a **fixed** file out of
Omarchy's read-only tree, and that file hardcodes `single_window_aspect_ratio = 1 1`.
Editing the copy is not durable — the next enable re-copies the original. Running any
ratio other than square therefore requires owning the file.

`ratio-toggle` writes `single-window-zen-aspect-ratio.conf` into
`~/.local/state/omarchy/toggles/hypr/` instead. Nothing clever is needed: `hyprland.conf`
sources `toggles/hypr/*.conf`, and that glob is the entire mechanism, so a
differently-named file in it works exactly as well as Omarchy's.

**Consequence: the Toggle Menu and the bar now disagree.** Omarchy's menu entry still
writes its own square flag, which this repo cannot change. Handled rather than ignored:

- "Active" means **either** file exists, so the bar never claims the constraint is off
  while a window is being squared by the menu.
- Turning it off removes **both**, so a square left behind by the menu cannot survive.
- Turning it on removes Omarchy's, so the two cannot both apply. The glob is
  alphabetical and `zen` would win anyway, but relying on filename ordering is not
  something to leave in place.

This is a deliberate divergence from ADR-0013, which listed "reachable from both the
Toggle Menu and the bar" as a property. The bar is now the correct control; the menu
entry is a legacy path that sets a different value.

## Verified

Toggled against a real lone tiled window:

    zen ON   1782x1484   251px margin each side
    zen OFF  2284x1484     0px
    zen ON   1782x1484   251px

`hyprctl getoption layout:single_window_aspect_ratio` reports `[6,5]`, and `hyprctl
configerrors` is clean.

Note that `hyprctl reload` alone does **not** re-lay-out existing windows — the earlier
measurements needed a float/tile round-trip to force it. Real use hides this because
opening or closing a window re-tiles anyway, but it makes a value change look inert if
you only reload and stare at the screen.

## Follow-up

The ceiling is worth re-measuring if the monitor ever changes, and `ASPECT` in
`ratio-toggle` is a single constant for that reason. Raising it past 6:5 on this display
will make the toggle appear to do nothing.
