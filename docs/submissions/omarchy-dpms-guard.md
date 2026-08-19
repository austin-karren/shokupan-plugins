<!-- Ready to file, NOT filed. Austin files these himself:
     gh issue create --repo HANCORE-linux/omarchy-plugin-marketplace \
       --title "[Plugin]: DPMS Guard" --body-file docs/submissions/omarchy-dpms-guard.md
     NOTE: submit-plugin.yml is a GitHub issue FORM. `--body-file` posts this
     as a free-form body and does NOT populate the form's fields, so either
     file through the form in the browser and paste the Description/notes from
     here, or accept a free-form issue. Category and Tags below use the form's
     exact dropdown values (Category one of Appearance/Desktop/Developer Tools/
     Hardware/Productivity/System/Widgets/Other; Tags one to three, capitalised
     as the form spells them). The checklist below mirrors the form's five
     required checkboxes verbatim. -->

**Plugin name:** DPMS Guard

**Repository:** https://github.com/austin-karren/omarchy-dpms-guard

**Category:** Hardware

**Tags:** Power management, Hyprland, Quickshell

## Description

A headless service plugin for one specific hardware fault: some monitors over USB-C (and some over DisplayPort) drop their DP link when they deep-sleep after a DPMS off. The kernel reports that as a connector hotplug, and Hyprland sometimes answers by re-enabling the output — leaving the lock screen lit for hours. Matches Hyprland discussions [13654](https://github.com/hyprwm/Hyprland/discussions/13654) and [11356](https://github.com/hyprwm/Hyprland/discussions/11356).

While the session is locked, the guard polls every 30s and re-asserts display-off if the user is still idle but an output is powered on. It has to poll: the self-wake happens inside aquamarine's DRM layer and emits no Hyprland event at all (verified with socat on socket2), so there is nothing to subscribe to. Two gates keep it safe — real input stands it down, and the timer does not run at all while unlocked.

**The README opens by telling readers how to tell whether they have this fault, and to skip the plugin if they do not.** It detects the symptom, not the monitor model, so it is a no-op on healthy hardware but still not something to install speculatively.

No preview image: there is no user interface to show.

Verified against Omarchy 4.0.0.r1744.

## Installation

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-dpms-guard.git --enable
```

## Removal

```bash
omarchy plugin remove shokupan.dpms-guard
```

## License

MIT, original work.

## External dependencies

None external. Uses `hyprctl`, `jq`, `omarchy-shell` and `omarchy-brightness-display`, all part of a standard Omarchy on Hyprland install. Hyprland-only — it reads `hyprctl monitors`.

## Checklist

- [x] The repository is public and contains installation and removal instructions.
- [x] I have documented the plugin license and any external dependencies.
- [x] I confirm that I own or have permission to submit this plugin and its preview assets.
- [x] The plugin does not overwrite user configuration without explicit consent.
- [x] I understand that approval is for listing and is not a security review.
