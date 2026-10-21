// Window gaps, as an indicator in our forked cluster beside Ratio. Clicking runs
// upstream's own toggle (omarchy-hyprland-window-gaps-toggle, the same command
// SUPER+SHIFT+BACKSPACE and the Toggle Menu's "Window Gaps" row run), so every
// entry point converges on one flag file: window-no-gaps.lua in the toggles
// directory.
//
// Active means gaps are OFF: like the other indicators, it lights up when a
// non-default mode is on, and inactive it hover-reveals as the way to turn the
// mode on. The glyph is upstream's Window Gaps menu icon, U+E62A, written as an
// escape for the reason ratio-toggle's header gives.
//
// State is read from the flag file itself, watched like Ratio's: a FileView on
// the toggles directory re-probes on any change there.

import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarIndicator {
  id: root

  property bool noGaps: false

  readonly property string togglesDir: Quickshell.env("HOME") + "/.local/state/omarchy/toggles/hypr"
  readonly property string glyph: ""

  active: noGaps
  activeText: glyph
  inactiveText: glyph
  activeTooltipText: "Window gaps\n\nOff — windows sit edge to edge.\nClick to restore gaps."
  inactiveTooltipText: "Window gaps\n\nOn.\nClick to remove gaps."

  onPressed: function() {
    if (!root.bar) return
    root.bar.run("omarchy-hyprland-window-gaps-toggle")
    Qt.callLater(function() { statusProc.running = true })
  }

  Process {
    id: statusProc
    command: ["test", "-f", root.togglesDir + "/window-no-gaps.lua"]
    onExited: function(code) { root.noGaps = code === 0 }
  }

  FileView {
    path: root.togglesDir
    watchChanges: true
    printErrors: false
    onFileChanged: statusProc.running = true
  }

  Component.onCompleted: statusProc.running = true
}
