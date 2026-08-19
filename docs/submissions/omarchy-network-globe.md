<!-- Ready to file, NOT filed. Austin files these himself:
     gh issue create --repo HANCORE-linux/omarchy-plugin-marketplace \
       --title "[Plugin]: Network panel (wired globe)" --body-file docs/submissions/omarchy-network-globe.md
     NOTE: submit-plugin.yml is a GitHub issue FORM. `--body-file` posts this
     as a free-form body and does NOT populate the form's fields, so either
     file through the form in the browser and paste the Description/notes from
     here, or accept a free-form issue. Category and Tags below use the form's
     exact dropdown values (Category one of Appearance/Desktop/Developer Tools/
     Hardware/Productivity/System/Widgets/Other; Tags one to three, capitalised
     as the form spells them). The checklist below mirrors the form's five
     required checkboxes verbatim. -->

**Plugin name:** Network panel (wired globe)

**Repository:** https://github.com/austin-karren/omarchy-network-globe

**Category:** Widgets

**Tags:** Bar, Quickshell, System

## Description

One glyph. Omarchy's network widget draws an RJ45 port (U+F0200) on Ethernet; this draws a globe (U+F059F). The reasoning: a Wi-Fi indicator already answers "am I on the internet?", while an RJ45 socket answers "what is the physical connector?" — a question nobody asks the bar. Everything else in the panel is upstream's, untouched.

Declares `omarchy.clonedFrom: omarchy.network`, Omarchy's own drop-in-replacement mechanism, so enabling it takes over upstream's network slot and IPC route and removing it hands both back.

The README says outright that this one-line patch maintained as a whole-file copy is a poor trade and is not meant to last: the durable fix is a glyph setting in upstream's own widget, and readers are told to drop this plugin if Omarchy ships one.

Verified against Omarchy 4.0.0.r1744.

## Installation

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-network-globe.git --enable
```

## Removal

```bash
omarchy plugin remove austinkarren.network
```

## License

MIT. **This is a derivative work of Omarchy and is almost entirely upstream's code** — `Panel.qml` (1,958 lines) is a byte-for-byte copy of Omarchy's network panel, and `Model.js` is upstream's with a single changed line marked `// SHOKUPAN:`. Omarchy's original copyright notice (David Heinemeier Hansson) is retained in LICENSE as MIT requires, and the README states that credit for the panel belongs to the Omarchy project and the contribution here is one glyph.

## External dependencies

None. The globe is in the Nerd Font Omarchy already ships.

## Checklist

- [x] The repository is public and contains installation and removal instructions.
- [x] I have documented the plugin license and any external dependencies.
- [x] I confirm that I own or have permission to submit this plugin and its preview assets.
- [x] The plugin does not overwrite user configuration without explicit consent.
- [x] I understand that approval is for listing and is not a security review.
