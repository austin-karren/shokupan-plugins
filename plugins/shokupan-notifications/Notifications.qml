// The notification bell Omarchy dropped from its bar.
//
// Upstream shipped a bar widget for this until r1046 and deleted it by r1744,
// along with the pendingModel/pastModel the old widget read. History did not
// disappear with it — it moved to disk (Service.qml's historyDir, newest
// `historyLimit` kept) and is replayed through the service's own `showHistory`
// IPC. So this is NOT the old 414-line widget resurrected: that version cannot
// work, because its data source is gone. It is a thin button over the IPC that
// upstream still supports, which is the shape that survives upgrades (the
// lesson ADR-0027 paid for twice).
//
//   left click   replay the recent notifications as toasts
//   right click  toggle Do Not Disturb — the Dnd indicator shows the state
//
// The file is deliberately not called BarWidget.qml: a file of that name
// shadows the BarWidget type it declares, and the widget then fails to load
// with "cannot assign to non-existent property moduleName".

import QtQuick
import qs.Ui

Item {
  id: root

  property var bar
  property string moduleName
  property var settings

  readonly property var service: bar && bar.shell && typeof bar.shell.firstPartyServiceFor === "function"
    ? bar.shell.firstPartyServiceFor("omarchy.notifications")
    : null
  readonly property bool dnd: service ? service.doNotDisturb === true : false

  implicitWidth: button.implicitWidth
  implicitHeight: bar ? bar.barSize : 26

  BarIconButton {
    id: button
    anchors.verticalCenter: parent.verticalCenter
    bar: root.bar
    // Bell, and bell-with-slash while notifications are silenced.
    text: root.dnd ? "" : ""
    active: root.dnd
    tooltipText: root.dnd
      ? "Notifications silenced\n\nLeft: replay recent\nRight: unsilence"
      : "Notifications\n\nLeft: replay recent\nRight: silence"
    onPressed: function(b) {
      if (!root.bar) return
      if (b === Qt.RightButton) {
        if (root.service) root.service.setDoNotDisturb(!root.dnd)
      } else {
        root.bar.run("omarchy-shell -q notifications showHistory")
      }
    }
  }
}
