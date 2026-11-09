#!/bin/bash

# Tests for plugins/shokupan-podman/Model.js — the parsing of `podman ps -a
# --format json` and `podman stats --no-stream --format json` into panel rows,
# plus the per-state action rules. No framework, TAP out, same shape as
# test/notification-logic-test.sh. The fixtures in the .mjs are trimmed copies
# of what podman 6.1.4 printed on this machine.
#
# Run: test/podman-model-test.sh

set -uo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
MODEL="${MODEL:-$ROOT/plugins/shokupan-podman/Model.js}"

if [[ ! -f $MODEL ]]; then
  echo "podman-model-test: no model at $MODEL" >&2
  exit 1
fi
if ! command -v node &>/dev/null; then
  echo "# skip - node not installed, 0 of the model checks ran"
  echo "1..0"
  exit 0
fi

MODEL_PATH="$MODEL" node "$ROOT/test/podman-model-test.mjs"
