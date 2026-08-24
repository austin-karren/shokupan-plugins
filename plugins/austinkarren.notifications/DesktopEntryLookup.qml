// SHOKUPAN: ours, not upstream's. The desktop-database half of the
// desktop-entry fallback in NotificationLogic.js.
//
// It is a file of its own for two reasons. It keeps the fork of upstream's
// Service.qml down to one object declaration and three arguments, which is what
// makes re-diffing after an Omarchy update cheap. And it is the only half that
// needs a QML engine, so isolating it behind a plain
// (id) -> { name, icon } | null seam leaves the logic testable under node and
// leaves this testable under a standalone Quickshell — see
// test/desktop-entry-lookup-test.sh.

import QtQuick
import Quickshell

QtObject {
  // DesktopEntries populates asynchronously on first access and reads empty
  // until it has. Nothing in the notification service touches it otherwise, so
  // without this the first notification after a shell start would resolve
  // against an empty database and store the blank the fallback exists to
  // remove.
  Component.onCompleted: DesktopEntries.applications

  // byId() is an exact desktop-file-id match, and is the same call Quickshell's
  // own appIcon fallback makes (notification.cpp). heuristicLookup() is the
  // looser one, and it is the only thing that finds a snap:
  // heuristicLookup("slack") resolves slack_slack.desktop, where
  // byId("snap.slack") and heuristicLookup("snap.slack") both return null.
  //
  // Returns a plain object rather than the DesktopEntry itself: the entry is
  // owned by Quickshell and outliving it is not this code's business, and a
  // plain object is what the pure logic can be handed in a test.
  function lookup(id) {
    if (!id) return null
    var entry = DesktopEntries.byId(id)
    if (!entry) entry = DesktopEntries.heuristicLookup(id)
    if (!entry) return null
    return { name: String(entry.name || ""), icon: String(entry.icon || "") }
  }
}
