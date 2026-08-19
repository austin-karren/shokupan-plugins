<!-- Ready to file, NOT filed. Austin files these himself:
     gh issue create --repo HANCORE-linux/omarchy-plugin-marketplace \
       --title "[Plugin]: Omarchy Menu (power glyph)" --body-file docs/submissions/omarchy-menu-power-glyph.md
     NOTE: submit-plugin.yml is a GitHub issue FORM. `--body-file` posts this
     as a free-form body and does NOT populate the form's fields, so either
     file through the form in the browser and paste the Description/notes from
     here, or accept a free-form issue. Category and Tags below use the form's
     exact dropdown values (Category one of Appearance/Desktop/Developer Tools/
     Hardware/Productivity/System/Widgets/Other; Tags one to three, capitalised
     as the form spells them). The checklist below mirrors the form's five
     required checkboxes verbatim. -->

**Plugin name:** Omarchy Menu (power glyph)

**Repository:** https://github.com/austin-karren/omarchy-menu-power-glyph

**Category:** Widgets

**Tags:** Bar, Quickshell, Launcher

## Description

Omarchy's built-in menu button hardcodes its logo (U+E900 in the private "omarchy" icon font) and exposes no setting to change it. This is a drop-in bar widget, adapted from upstream's own menu widget, that draws the same button with the standard power glyph (U+F011) instead. Left click opens the Omarchy Menu, right click opens a terminal — both upstream's own actions, verbatim. See the License section: this is a derivative work, not original.

Verified against Omarchy 4.0.0.r1744.

## Installation

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-menu-power-glyph.git --enable
```

## Removal

```bash
omarchy plugin remove shokupan.omenu
```

## License

MIT. **This is a derivative work of Omarchy.** `BarWidget.qml` is adapted from Omarchy's own menu bar widget (`shell/plugins/menu/BarWidget.qml`), not written from scratch — it is a short file and most of it is upstream's: the `WidgetButton` structure, the `horizontalMargin` value, and both click handlers are carried over near-verbatim. What is new is the glyph, the tooltip, and the plain-`Item` root the third-party plugin loader injects into. Omarchy's original copyright notice (David Heinemeier Hansson) is retained in LICENSE as MIT requires, and the README credits the Omarchy project for the button.

## External dependencies

None. The glyph comes from the Nerd Font Omarchy already ships, and both click actions are Omarchy's own commands.

## Checklist

- [x] The repository is public and contains installation and removal instructions.
- [x] I have documented the plugin license and any external dependencies.
- [x] I confirm that I own or have permission to submit this plugin and its preview assets.
- [x] The plugin does not overwrite user configuration without explicit consent.
- [x] I understand that approval is for listing and is not a security review.
