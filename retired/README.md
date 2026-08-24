# retired/

Plugins that were shipped and are not any more. Nothing here is linked into
`~/.config/omarchy/plugins/`, published to a standalone repo, or recorded in
`packages/plugins`.

This directory exists because of a constraint worth knowing before you add to
it: `loaf doctor` in shokupan asserts that **every** directory under `plugins/`
is symlinked into the desktop, and treats a shortfall as a half-installed set.
So a plugin cannot stay under `plugins/` once it is unlinked without making that
check lie. Retiring one means moving it here, not deleting it — the code and its
provenance survive, and `git log --follow` still reaches its whole history.

If you are reviving something from here, `git mv` it back under `plugins/`, add
its line to both `packages/plugins` indexes (this repo's and shokupan's), and
run `loaf plugins --offline`.

| Path | Retired | Why |
|---|---|---|
| `shokupan-notifications` | 2026-08-24 | Upstream's own notification bell, deleted in `fc4caf3c` and carried here, stopped displaying history. Replaced by the maintained `jankeesvw.notification-center` rather than fixed — see ADR-0044's 2026-08-24 addendum |
