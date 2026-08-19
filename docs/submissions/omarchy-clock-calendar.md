<!-- Ready to file, NOT filed. Austin files these himself:
     gh issue create --repo HANCORE-linux/omarchy-plugin-marketplace \
       --title "[Plugin]: Clock with calendar clicks" --body-file docs/submissions/omarchy-clock-calendar.md
     NOTE: submit-plugin.yml is a GitHub issue FORM. `--body-file` posts this
     as a free-form body and does NOT populate the form's fields, so either
     file through the form in the browser and paste the Description/notes from
     here, or accept a free-form issue. Category and Tags below use the form's
     exact dropdown values (Category one of Appearance/Desktop/Developer Tools/
     Hardware/Productivity/System/Widgets/Other; Tags one to three, capitalised
     as the form spells them). The checklist below mirrors the form's five
     required checkboxes verbatim. -->

**Plugin name:** Clock with calendar clicks

**Repository:** https://github.com/austin-karren/omarchy-clock-calendar

**Category:** Widgets

**Tags:** Bar, Quickshell, Hyprland

## Description

Omarchy's clock panel is a read-out — the month grid shows where today is and nothing in it is clickable. This makes the grid a picker: day cells and the hero date open GNOME Calendar on that date, and clicking the clock again while the calendar is up closes it instead of stacking the month panel on top.

The calendar is shown and hidden on a dedicated Hyprland special workspace rather than launched and quit each time, for two reasons: GNOME Calendar talks to evolution-data-server on startup so a cold launch is seconds while a warm toggle is instant, and hiding preserves the month you had scrolled to where quitting resets to today.

Declares `omarchy.clonedFrom: omarchy.clock`, Omarchy's own drop-in-replacement mechanism, so enabling it takes over upstream's clock slot and IPC route and removing it hands both back.

Verified against Omarchy 4.0.0.r1744.

## Installation

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-clock-calendar.git --enable
```

## Removal

```bash
omarchy plugin remove austinkarren.clock
```

## License

MIT. **This is a derivative work of Omarchy, not original work** — `BarWidget.qml` and `Panel.qml` are patched copies of Omarchy's own clock panel plugin and `Model.js` is a verbatim copy. Every divergence is marked `// SHOKUPAN:` in the source (about forty lines across two files). Omarchy's original copyright notice (David Heinemeier Hansson) is retained in LICENSE as MIT requires.

## External dependencies

The three scripts the widget drives **ship inside the plugin** in `bin/`, resolved relative to the plugin directory rather than looked up on PATH, so a fresh `omarchy plugin add` gets a working plugin.

Two things cannot be shipped and are documented instead:

- **`gnome-calendar`** — not part of Omarchy. Without it the bar clock and month panel work normally and day clicks do nothing.
- **A Hyprland window rule** mapping `org.gnome.Calendar` onto `special:calendar` silently. Without it the day click still opens GNOME Calendar, but as an ordinary window — you keep the date navigation and lose the popup behaviour. The README gives the rule in Omarchy 4's Lua form and in `.conf` form.

Optional: `bin/calendar-autohide` (needs `socat`) adds click-outside dismissal but is a long-running listener the plugin cannot start itself, so the README shows the autostart entry. Hyprland-only.

## Checklist

- [x] The repository is public and contains installation and removal instructions.
- [x] I have documented the plugin license and any external dependencies.
- [x] I confirm that I own or have permission to submit this plugin and its preview assets.
- [x] The plugin does not overwrite user configuration without explicit consent.
- [x] I understand that approval is for listing and is not a security review.
