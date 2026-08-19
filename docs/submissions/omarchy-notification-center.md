<!-- Ready to file, NOT filed. Austin files these himself:
     gh issue create --repo HANCORE-linux/omarchy-plugin-marketplace \
       --title "[Plugin]: Notification center" --body-file docs/submissions/omarchy-notification-center.md
     NOTE: submit-plugin.yml is a GitHub issue FORM. `--body-file` posts this
     as a free-form body and does NOT populate the form's fields, so either
     file through the form in the browser and paste the Description/notes from
     here, or accept a free-form issue. Category and Tags below use the form's
     exact dropdown values (Category one of Appearance/Desktop/Developer Tools/
     Hardware/Productivity/System/Widgets/Other; Tags one to three, capitalised
     as the form spells them). The checklist below mirrors the form's five
     required checkboxes verbatim. -->

**Plugin name:** Notification center

**Repository:** https://github.com/austin-karren/omarchy-notification-center

**Category:** Widgets

**Tags:** Bar, Quickshell, System

## Description

Omarchy's commit `fc4caf3c` ("Extract notification center bar widget", 25 Jul 2026) deleted `shell/plugins/notifications/BarWidget.qml` and dropped `bar-widget` from the notifications manifest's `kinds`, but nothing in that commit or since added it back anywhere in the tree — so current Omarchy has no bell, no unread badge, and no way to browse notification history from the bar. This plugin restores it: left click opens the popup (pending tab when anything is unseen, otherwise past), right click toggles Do Not Disturb.

The notification service itself is untouched and still upstream's; history already lives on disk under the service's `historyDir`. This widget is a reader for it.

If Omarchy lands its own notification centre again, the README says to prefer upstream's and remove this.

Verified against Omarchy 4.0.0.r1744.

## Installation

```bash
omarchy plugin add https://github.com/austin-karren/omarchy-notification-center.git --enable
```

## Removal

```bash
omarchy plugin remove shokupan.notifications
```

## License

MIT. **This is a derivative work of Omarchy, not original work** — the QML began as Omarchy's own deleted `BarWidget.qml`, carried forward with null guards and small fixes, and `NotificationLogic.js` is likewise Omarchy's as it stood before that commit. Omarchy's original copyright notice (David Heinemeier Hansson) is retained in LICENSE as MIT requires, and the README credits the Omarchy project rather than presenting the widget as original work.

## External dependencies

None. It reads Omarchy's own first-party notification service.

## Checklist

- [x] The repository is public and contains installation and removal instructions.
- [x] I have documented the plugin license and any external dependencies.
- [x] I confirm that I own or have permission to submit this plugin and its preview assets.
- [x] The plugin does not overwrite user configuration without explicit consent.
- [x] I understand that approval is for listing and is not a security review.
