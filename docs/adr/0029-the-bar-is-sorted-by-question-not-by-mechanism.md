---
status: accepted
---

# The bar is sorted by the question each module answers

Three changes made together, because they are one decision applied three times:

| Change | Before | After |
|---|---|---|
| Weather moves to the centre | right cluster, after `custom/ratio` | centre, right of the clock |
| Calendar moves left of the clock | right of the clock | left of the clock |
| The `cpu` module is deleted | static chip glyph, click opens btop | gone; btop on `SUPER CTRL + T` |
| Ethernet gets a globe | `󰈀` RJ45 port (U+F0200) | `󰖟` web (U+F059F) |

The rule they share: **a module earns its place by the question it answers, not by
the subsystem it reads from.**

## The centre answers "what day is it, and what is it like out there"

The centre now reads calendar, date, weather — the two things you click to ask about
a day, flanking the day itself. Weather had been filed on the right because it comes
from a network fetch, which is a fact about its plumbing and not about what it tells
you. It is about *now*, exactly as the clock is; the right cluster is about this
*machine*. Grouping by provenance put a "what's it like outside" reading next to a
volume icon.

Calendar moves to the left of the clock rather than staying on its right, so the two
icons bracket the date symmetrically instead of stacking two icons on one side.

## The right cluster is state, so a button did not belong in it

Everything from `bluetooth` rightwards *reports*: connected or not, which network,
what volume, how much battery. `cpu` did not. Its glyph was the static string `󰍛` —
it never showed load, never changed, and existed only to give btop a click target. A
button wearing a status icon's clothes, in a row where every other glyph means
something by changing.

So it is deleted rather than fixed. Making it report load was the other option and
is worse: this is a desktop that is idle most of the time, so the module would spend
its life displaying a number nobody asked for, and Waybar's centre and right groups
are already the crowded ones.

btop moves to `SUPER CTRL + T`, which is Omarchy's own chord for it
(`default/hypr/bindings/utilities.conf`, "Activity") — so nothing has to be learned,
and the keybind list gains an entry that was already there. It is rebound only to
swap `omarchy-launch-tui` for `window-toggle`, giving it the close-on-second-press
behaviour the bar icon had and that `bluetooth` and `network` already use. That
settles the `cpu` half of ADR-0011 by deleting its subject; the `pulseaudio` half
still stands.

`custom/apexshot` and `custom/ratio` remain on the right and remain actions, which
is the one exception, and a deliberate one — ADR-0013 placed them there as the
cluster's action prefix, before the status run begins.

## Wired shows a globe, not a port

`format-ethernet` was `󰈀`, a picture of the RJ45 socket. The socket names the
*cable*. The question the icon actually answers — the same one the wifi bars answer
directly above it in the config — is whether this machine is on the internet, and a
globe says that without asking you to know what a physical layer is.

## Spacing

The right cluster's *boxes* needed no work: it is built on uniform pitch rather than
tuned gaps (ADR-0013), so removing two modules from the selector list leaves the
survivors on the same grid. Confirmed by painting each module a flat colour and
measuring the painted spans directly, rather than inferring boxes from glyph ink:
every box is 29 physical px wide, pitch is exactly 50.0, inter-box gaps exactly 21.

But uniform boxes are not the same as even spacing, and the shortened cluster made
that visible. See below.

### The bluetooth glyph, and what "uniform box" was actually for

With weather and cpu gone, the gap to the left of the network globe read as a hole.
It was not layout — the boxes are provably identical and every glyph is centred
within its own advance (measured across the font: all offsets ±0.5px). It was glyph
*shape*: the bluetooth rune is 11 physical px of ink where its neighbours are 16..18,
at the same 16px ink height. Narrow, not small. Centred in an 18px box it carries ~9px
of air per side against its neighbours' ~5, and the surplus pools next to the globe.

Two things changed. First the glyph: `format` was `U+F294`, Font Awesome's
`bluetooth_b`, while the *same module's* other three states were already Material
Design. It is now `U+F00AF`, so all four states are one family — which is what
ADR-0006's calendar note said the bar prefers, and which widens the ink from 9 to 11px
on the way.

Then the box: `#bluetooth` gets `min-width: 15px` instead of the shared 18px. This
looks like the per-module tuning the `style.css` comment forbids, and it is worth
being precise about why it is not. That rule exists because status glyphs change
width *between states*, so any gap tuned for one state is wrong in another. The
constant it protects is "the box must exceed the widest state the module can show" —
not the number 18. Bluetooth's four states measure 11, 13 and 15 physical px, so a
15px logical box (25 physical) still clears the widest of them and the module cannot
clip or reflow when a device connects. 18px was never a law; it was one family's
measurement, silently applied to a narrower family.

Measured ink gaps across the status run, physical px at 1.67x:

| | gaps | spread |
|---|---|---|
| before | 31, 32, **38**, 33 | 7 |
| after | 31, 31, **35**, 33 | 4 |

The residual 35 is `custom/ratio`'s ink sitting ~2px right of its own box centre, a
subpixel rounding artifact that moves when ratio toggles glyph. Correcting for it
would mean tuning one module against a *neighbour's* state, which is the thing the
rule genuinely forbids. Left alone.

The wider gap before the tray chevron is a different thing and is left alone too:
`#custom-expand-icon` sits inside `group/tray-expander`, whose layout governs it —
setting `min-width` there changes nothing, verified by sweeping it — and the gap
reads as the boundary between the drawer and the status run.

The centre trio needed new rules. Every centre module now carries a **left margin
only**, so each gap is written in exactly one place and two adjacent margins can
never sum into a double gap. Both icons get `min-width: 18px` — equal, so the trio
stays symmetrical about the date, and fixed, so the weather glyph's 15..27px swing
between sun, moon and cloud cannot slide the clock sideways underneath it.

The margin is 5.5px, tighter than the 7.5px used by the modules that follow
(`custom/update`, `custom/voxtype`): the trio is one thing, and should bind more
tightly to itself than to the indicators beside it. Measured ink gaps land at 18px
calendar-to-date and 21px date-to-weather — the 18px being exactly what the
date/calendar pair sat at before weather joined them.

The 3px asymmetry between those two gaps is the clock's own right side bearing, the
`M` ending "PM". No margin can fix it, because it changes with the format string:
`format-alt` ends in a digit. Left alone deliberately.

## Consequences

`#custom-weather.unavailable` still collapses the module to zero width, which now
matters more than it did — an 18px hole would open between the date and the
indicators rather than at the end of a row of icons.

Nothing checks any of this. `loaf doctor` verifies that the config files are the
repo's, not what they contain, so a future upstream Waybar default that reintroduces
`cpu` would be caught as a displaced symlink but a hand-edit would not.
