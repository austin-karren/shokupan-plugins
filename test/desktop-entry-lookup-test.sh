#!/bin/bash

# Tests for plugins/austinkarren.notifications/DesktopEntryLookup.qml — the QML
# half of the desktop-entry fallback, and the half node cannot reach.
#
# It runs the real component in a standalone `quickshell -p` instance against
# this machine's real desktop database. That is the point: the whole reason the
# fallback needs a heuristicLookup() and a `snap.` strip is what the database
# does and does not resolve, and a stub asserting the same thing would be
# asserting my own assumption. The recorded expectations in
# test/notification-logic-test.mjs are these same measurements, so if this file
# goes red that stub has gone stale and the logic test is passing for the wrong
# reason.
#
# The instance creates no windows and quits itself. It does not touch the
# running Omarchy shell: a second quickshell with its own config is a separate
# instance, and nothing here declares a NotificationServer or claims a bus name.
#
# Machine-dependent on purpose, and skipped rather than failed where the two
# senders it measures are not installed.
#
# Run: test/desktop-entry-lookup-test.sh

set -uo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
COMPONENT="$ROOT/plugins/austinkarren.notifications/DesktopEntryLookup.qml"

GHOSTTY_DESKTOP=/usr/share/applications/com.mitchellh.ghostty.desktop
SLACK_DESKTOP=/var/lib/snapd/desktop/applications/slack_slack.desktop

tests=0
failures=0
pass() { tests=$((tests + 1)); printf 'ok %d - %s\n' "$tests" "$1"; }
fail() {
  tests=$((tests + 1))
  failures=$((failures + 1))
  printf 'not ok %d - %s\n' "$tests" "$1"
  local d
  for d in "${@:2}"; do printf '  # %s\n' "$d"; done
}
assert_equals() {
  if [[ $2 == "$3" ]]; then pass "$1"; else fail "$1" "expected: $3" "actual:   $2"; fi
}

skip() {
  printf '# skip - %s\n' "$1"
  printf '1..0\n'
  exit 0
}

[[ -f $COMPONENT ]] || { echo "desktop-entry-lookup-test: no component at $COMPONENT" >&2; exit 1; }
command -v quickshell &>/dev/null || skip "quickshell not installed, 0 checks ran"
[[ -n ${WAYLAND_DISPLAY:-}${DISPLAY:-} ]] || skip "no display, quickshell cannot start, 0 checks ran"
[[ -f $GHOSTTY_DESKTOP ]] || skip "no $GHOSTTY_DESKTOP on this machine, 0 checks ran"
[[ -f $SLACK_DESKTOP ]] || skip "no $SLACK_DESKTOP on this machine, 0 checks ran"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp "$COMPONENT" "$work/DesktopEntryLookup.qml"

# The harness. DesktopEntries populates asynchronously after first access — the
# component's own Component.onCompleted is what starts it — so the assertions
# wait rather than reading an empty database and calling it a null.
cat >"$work/shell.qml" <<'QMLEOF'
import QtQuick
import Quickshell

ShellRoot {
  DesktopEntryLookup { id: lookup }

  function report(label, id) {
    var r = lookup.lookup(id)
    console.log("RESULT\t" + label + "\t" + (r === null ? "NULL" : r.name + "\t" + r.icon))
  }

  Timer {
    interval: 8000
    running: true
    onTriggered: {
      report("ghostty", "com.mitchellh.ghostty")
      report("snap-portal-id", "snap.slack")
      report("snap-stripped", "slack")
      report("nonexistent", "com.example.definitely-not-installed")
      Qt.quit()
    }
  }
}
QMLEOF

out=$(cd "$work" && timeout 40 quickshell -p shell.qml --no-color 2>&1)
status=$?
if ((status != 0)); then
  fail "harness: the standalone quickshell instance ran and quit" \
    "exit status $status" "output: ${out:-<empty>}"
  printf '\n1..%d\n\n%d of %d failed.\n' "$tests" "$failures" "$tests"
  exit 1
fi
pass "harness: the standalone quickshell instance ran and quit"

result_for() {
  printf '%s' "$out" | sed -n "s/.*RESULT\t$1\t//p" | head -1
}

# Ghostty's own id resolves exactly. This is the id Quickshell's built-in
# appIcon fallback already resolves too, which is why Ghostty has an icon today
# and only its name is missing.
assert_equals "ghostty: the reverse-DNS id resolves to a name and an icon" \
  "$(result_for ghostty)" "$(printf 'Ghostty\tcom.mitchellh.ghostty')"

# The load-bearing negative. xdg-desktop-portal sends `snap.<instance>` and
# snapd names the file `<instance>_<app>.desktop`, so the id the portal sends
# resolves to nothing at all. If this ever starts resolving, the `snap.` strip
# in NotificationLogic.js has become dead code and should go.
assert_equals "snap: the id xdg-desktop-portal actually sends resolves to nothing" \
  "$(result_for snap-portal-id)" "NULL"

# ...and the stripped one resolves to both halves of what the fallback needs.
# The icon is an absolute path, which is why the popup card and the
# notification-centre row both matter here: each handles a leading `/`.
assert_equals "snap: the prefix-stripped instance name resolves to a name and an icon" \
  "$(result_for snap-stripped)" \
  "$(printf 'Slack\t/var/lib/snapd/snap/slack/current/usr/share/pixmaps/slack.png')"

# An id nothing on the machine claims must come back null rather than a
# best-effort guess: a wrong app name is worse than a blank one.
assert_equals "unknown: an id nothing claims resolves to nothing" \
  "$(result_for nonexistent)" "NULL"

printf '\n1..%d\n' "$tests"
if ((failures)); then
  printf '\n%d of %d failed.\n' "$failures" "$tests"
  exit 1
fi
printf '\nAll %d passed.\n' "$tests"
