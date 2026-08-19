<!-- Ready to file, NOT filed. Austin files these himself:
     gh issue create --repo HANCORE-linux/omarchy-plugin-marketplace \
       --title "[Plugin]: ApexShot button" --body-file docs/submissions/omarchy-apexshot.md
     NOTE: submit-plugin.yml is a GitHub issue FORM. `--body-file` posts this
     as a free-form body and does NOT populate the form's fields, so either
     file through the form in the browser and paste the Description/notes from
     here, or accept a free-form issue. Category and Tags below use the form's
     exact dropdown values (Category one of Appearance/Desktop/Developer Tools/
     Hardware/Productivity/System/Widgets/Other; Tags one to three, capitalised
     as the form spells them). The checklist below mirrors the form's five
     required checkboxes verbatim. -->

**Plugin name:** ApexShot button

**Repository:** https://github.com/austin-karren/omarchy-apexshot

**Category:** Widgets

**Tags:** Bar, Quickshell, Media

## Description

One camera button in the bar driving ApexShot's three most-used actions: left captures an area, middle records the screen, right captures the full screen. It adopts the same fixed slot width every native right-cluster panel widget uses (`Style.space(27)`), so it sits on Omarchy's own pitch without hand-tuned margins or spacer shims.

Verified against Omarchy 4.0.0.r1744 and ApexShot 0.2.34.

## Installation

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-apexshot.git --enable
```

## Removal

```bash
omarchy plugin remove shokupan.apexshot
```

## License

MIT, original work.

## External dependencies

**Requires the `apexshot` binary**, which is not part of Omarchy and is not bundled here — without it the button draws normally and every click is a silent no-op. ApexShot (https://github.com/apex-shot/apexshot) is GPL-3.0-or-later; this plugin invokes it as a shell command and includes none of its code, so the licenses do not interact. The README states the dependency prominently and points readers at the sibling plugin `omarchy-capture-button` if they would rather not install it.

## Checklist

- [x] The repository is public and contains installation and removal instructions.
- [x] I have documented the plugin license and any external dependencies.
- [x] I confirm that I own or have permission to submit this plugin and its preview assets.
- [x] The plugin does not overwrite user configuration without explicit consent.
- [x] I understand that approval is for listing and is not a security review.
