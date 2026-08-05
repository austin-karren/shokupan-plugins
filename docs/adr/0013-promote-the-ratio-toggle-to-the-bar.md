---
status: proposed
---

# Promote the Ratio toggle out of a menu and onto the bar

The Ratio toggle — constraining a lone window to 1:1 via Hyprland's
`single_window_aspect_ratio` — is used often enough that living three levels deep
in a menu is the wrong home for it. Proposal: a module on the right side of the
bar, alongside the other stateful indicators.

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

## Settled: how state is read

`omarchy-hyprland-window-single-square-aspect-toggle` delegates to
`omarchy-hyprland-toggle` with the flag name `single-window-aspect-ratio`. Toggle
state is therefore a flag file at
`~/.local/state/omarchy/toggles/single-window-aspect-ratio`, and the supported way
to read it is:

```bash
omarchy-toggle-enabled single-window-aspect-ratio
```

## Settled: distinguish by CSS class, not by a second glyph

A second glyph is available but is the weaker option. Material Design ships
filled/outline pairs of the same shape, which is what a "similar looking" partner
would mean — but picking one blind is exactly how `custom/calendar` ended up
needing the comment recording that `F0479` is an SD card, not a palette. Every
codepoint in that range is present in JetBrainsMono Nerd Font, so the font cannot
tell you which is which; only looking at it can.

Better: emit **one** glyph plus a `class` and let CSS carry the state, which is
already the established pattern in this bar — `~/.config/waybar/style.css` styles
`#custom-screenrecording-indicator.active` and
`#custom-idle-indicator.active` today, and uses `opacity` elsewhere for exactly this
kind of dimming. Identical shape, unmistakable difference, no glyph hunt.

For the glyph itself, Omarchy already chose one for this feature: **U+F2D0**, used
in both the enable and disable notifications of the toggle script. Reusing it keeps
the bar and the notification consistent.

## To settle at grill time

- **Exact position within `modules-right`.** The right group is the agreed side, but
  the order there is not arbitrary: `group/tray-expander` leads and `battery` ends
  it. Sitting next to `cpu` groups it with the other always-on modules; sitting near
  the indicators groups it with the other toggles.
- `~/.config/hypr/looknfeel.conf` already carries a commented-out
  `single_window_aspect_ratio = 1 1`. Whether that stays as documentation or goes
  should be decided at the same time, since a value set there and the toggle's
  config file are two sources for one setting.
