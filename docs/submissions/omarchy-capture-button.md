<!-- Ready to file, NOT filed. Austin files these himself:
     gh issue create --repo HANCORE-linux/omarchy-plugin-marketplace \
       --title "[Plugin]: Capture button" --body-file docs/submissions/omarchy-capture-button.md
     NOTE: submit-plugin.yml is a GitHub issue FORM. `--body-file` posts this
     as a free-form body and does NOT populate the form's fields, so either
     file through the form in the browser and paste the Description/notes from
     here, or accept a free-form issue. Category and Tags below use the form's
     exact dropdown values (Category one of Appearance/Desktop/Developer Tools/
     Hardware/Productivity/System/Widgets/Other; Tags one to three, capitalised
     as the form spells them). The checklist below mirrors the form's five
     required checkboxes verbatim. -->

**Plugin name:** Capture button

**Repository:** https://github.com/austin-karren/omarchy-capture-button

**Category:** Widgets

**Tags:** Bar, Quickshell, Media

## Description

Omarchy ships `omarchy-capture-screenshot` and `omarchy-capture-screenrecording` but no bar button for them. This adds one: left captures an area, middle toggles screen recording, right captures the full screen. It uses `BarIconButton`, so slot width and optical glyph centring are upstream's rather than hand-pinned.

Does the same job as the sibling plugin `omarchy-apexshot` against a different tool — install one or the other, not both.

Verified against Omarchy 4.0.0.r1744.

## Installation

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-capture-button.git --enable
```

## Removal

```bash
omarchy plugin remove shokupan.capture
```

## License

MIT, original work.

## External dependencies

None. Both capture commands are part of a standard Omarchy install.

## Checklist

- [x] The repository is public and contains installation and removal instructions.
- [x] I have documented the plugin license and any external dependencies.
- [x] I confirm that I own or have permission to submit this plugin and its preview assets.
- [x] The plugin does not overwrite user configuration without explicit consent.
- [x] I understand that approval is for listing and is not a security review.
