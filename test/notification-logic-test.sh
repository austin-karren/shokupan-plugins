#!/bin/bash

# Tests for the desktop-entry fallback in
# plugins/austinkarren.notifications/NotificationLogic.js — the only patched
# logic in that clone. No framework, TAP out, following the shape of shokupan's
# own test/loaf-test.sh.
#
# The file is loadable under node because upstream guards its exports with
# `if (typeof module !== "undefined")`, which is what makes the fallback
# testable at all: it is a pure function of the notification's fields plus an
# injected resolver. The resolver's own half lives in DesktopEntryLookup.qml and
# is tested against the real desktop database by
# test/desktop-entry-lookup-test.sh — running only this file leaves that half
# unproven.
#
# Run: test/notification-logic-test.sh

set -uo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
LOGIC="${LOGIC:-$ROOT/plugins/austinkarren.notifications/NotificationLogic.js}"

if [[ ! -f $LOGIC ]]; then
  echo "notification-logic-test: no logic file at $LOGIC" >&2
  exit 1
fi
if ! command -v node &>/dev/null; then
  # Not a silent skip: an absent runtime should be visible in the output.
  echo "# skip - node not installed, 0 of the logic checks ran"
  echo "1..0"
  exit 0
fi

LOGIC_PATH="$LOGIC" node "$ROOT/test/notification-logic-test.mjs"
