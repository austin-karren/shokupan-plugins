// Body of test/notification-logic-test.sh. A module of its own rather than a
// `node -e` string: these assertions quote English with apostrophes in it, and
// escaping those through a shell single-quoted string is how a test file stops
// being readable.

import { createRequire } from "node:module"
const L = createRequire(import.meta.url)(process.env.LOGIC_PATH)

let tests = 0, failures = 0
function pass(name) { tests++; console.log(`ok ${tests} - ${name}`) }
function fail(name, ...detail) {
  tests++; failures++
  console.log(`not ok ${tests} - ${name}`)
  for (const d of detail) console.log(`  # ${d}`)
}
function is(name, actual, expected) {
  if (actual === expected) pass(name)
  else fail(name, `expected: ${JSON.stringify(expected)}`, `actual:   ${JSON.stringify(actual)}`)
}
function isDeep(name, actual, expected) {
  is(name, JSON.stringify(actual), JSON.stringify(expected))
}

// The resolver, as measured. These are not invented values: they are what
// Quickshell 0.3.0 (revision 28771c7c) actually returned on this machine for
// each id, captured with a standalone `quickshell -p` harness on 2026-08-24 —
// the same measurements test/desktop-entry-lookup-test.sh re-takes live.
//
//   byId("com.mitchellh.ghostty") -> Ghostty | com.mitchellh.ghostty
//   byId("snap.slack")            -> null
//   heuristicLookup("snap.slack") -> null
//   byId("slack")                 -> null
//   heuristicLookup("slack")      -> Slack   | /var/lib/snapd/snap/slack/current/usr/share/pixmaps/slack.png
//
// A stub that answered every id would be the "returns the same either way"
// trap: the point of the snap rows is that the portal id resolves to NOTHING
// and only the prefix-stripped one resolves, so a fallback that forgot to strip
// goes red here rather than passing on a stub that was too generous.
const GHOSTTY = { name: "Ghostty", icon: "com.mitchellh.ghostty" }
const SLACK = { name: "Slack", icon: "/var/lib/snapd/snap/slack/current/usr/share/pixmaps/slack.png" }
const DESKTOP_DB = { "com.mitchellh.ghostty": GHOSTTY, "slack": SLACK }
let lookupCalls = []
function lookup(id) { lookupCalls.push(id); return DESKTOP_DB[id] || null }

// ---------------------------------------------------------
// desktopEntryCandidates: which ids the database is asked about
// ---------------------------------------------------------

isDeep("candidates: a reverse-DNS id is asked about as-is",
  L.desktopEntryCandidates("com.mitchellh.ghostty"), ["com.mitchellh.ghostty"])
// The portal id and the stripped one, in that order: the exact id must still
// win if a `snap.x.desktop` ever does exist.
isDeep("candidates: a snap id adds the prefix-stripped instance name",
  L.desktopEntryCandidates("snap.slack"), ["snap.slack", "slack"])
isDeep("candidates: a bare snap. prefix adds no empty candidate",
  L.desktopEntryCandidates("snap."), ["snap."])
isDeep("candidates: no desktop-entry means nothing to ask",
  L.desktopEntryCandidates(""), [])
isDeep("candidates: an absent desktop-entry means nothing to ask",
  L.desktopEntryCandidates(undefined), [])
// Only a LEADING prefix is a portal snap id.
isDeep("candidates: snap. inside an id is not a prefix",
  L.desktopEntryCandidates("com.snap.thing"), ["com.snap.thing"])

// ---------------------------------------------------------
// desktopEntryOf: where the hint is read from
// ---------------------------------------------------------

is("entry: read from the Quickshell property",
  L.desktopEntryOf({ desktopEntry: "com.mitchellh.ghostty" }), "com.mitchellh.ghostty")
// Quickshell strips only image-data/image_data/icon_data from `hints`, so
// desktop-entry is still in there and is a free second source.
is("entry: read from the raw hint when the property is absent",
  L.desktopEntryOf({ hints: { "desktop-entry": "snap.slack" } }), "snap.slack")
is("entry: the property wins over the hint",
  L.desktopEntryOf({ desktopEntry: "a", hints: { "desktop-entry": "b" } }), "a")
is("entry: neither present is the empty string, not undefined",
  L.desktopEntryOf({}), "")

// ---------------------------------------------------------
// The two real senders, field for field from captured D-Bus traffic
// ---------------------------------------------------------

// Ghostty OSC 9, captured 2026-08-24. app_name = "" on the wire; Quickshell had
// already recovered appIcon itself via byId(), so only the name is missing.
const ghosttyNotification = {
  id: 244, appName: "", appIcon: "com.mitchellh.ghostty",
  desktopEntry: "com.mitchellh.ghostty",
  summary: "Ghostty", body: "claude finished: notifentry", urgency: 1,
}
let snap = L.snapshotOf(ghosttyNotification, 1787588763449, lookup)
is("ghostty: the blank app name becomes the desktop file's Name=", snap.app, "Ghostty")
is("ghostty: the icon Quickshell already resolved is left alone",
  snap.appIcon, "com.mitchellh.ghostty")
is("ghostty: the summary is untouched", snap.summary, "Ghostty")

// Slack through xdg-desktop-portal-gtk, captured as stored record 245. Both
// app_name and app_icon are empty: the portal hardcodes "" for the name, and
// Quickshell's byId("snap.slack") found nothing so the icon stayed empty too.
const slackNotification = {
  id: 245, appName: "", appIcon: "", desktopEntry: "snap.slack",
  summary: "New message", body: "...", urgency: 1,
}
snap = L.snapshotOf(slackNotification, 1787588843078, lookup)
is("slack: the blank app name becomes Slack", snap.app, "Slack")
is("slack: the missing icon is recovered from the snap desktop file",
  snap.appIcon, "/var/lib/snapd/snap/slack/current/usr/share/pixmaps/slack.png")

// ---------------------------------------------------------
// Nothing that works today changes
// ---------------------------------------------------------

// notify-send, captured 2026-08-24: a real app_name and no desktop-entry hint.
lookupCalls = []
snap = L.snapshotOf({ id: 241, appName: "notify-send", appIcon: "", summary: "x" }, 1, lookup)
is("unchanged: a sender that set app_name keeps it", snap.app, "notify-send")
is("unchanged: a sender that set no icon still has none", snap.appIcon, "")
// isEphemeralApp and shouldBypassDnd both key off the literal "notify-send", so
// silently rewriting a name that was already set would change DND behaviour.
isDeep("unchanged: the database is not consulted when app_name is set", lookupCalls, [])

snap = L.snapshotOf({ id: 1, appName: "Slack", appIcon: "", desktopEntry: "snap.slack" }, 1, lookup)
is("unchanged: a set app_name wins over a resolvable desktop-entry", snap.app, "Slack")
is("unchanged: but an empty icon beside it is still recovered",
  snap.appIcon, "/var/lib/snapd/snap/slack/current/usr/share/pixmaps/slack.png")

// Upstream behaviour for a sender that supplies neither: still blank. There is
// nothing to recover from, and inventing something would be worse than blank.
snap = L.snapshotOf({ id: 2, appName: "", appIcon: "" }, 1, lookup)
is("unchanged: no app_name and no desktop-entry is still blank", snap.app, "")
is("unchanged: no icon and no desktop-entry is still blank", snap.appIcon, "")

// ---------------------------------------------------------
// When the database cannot help
// ---------------------------------------------------------

// The raw-value-versus-Name= decision, asserted: an unresolvable hint still
// names the app, so it beats the blank slot.
snap = L.snapshotOf({ id: 3, appName: "", appIcon: "", desktopEntry: "com.example.nope" }, 1, lookup)
is("unresolved: the raw desktop-entry value is the last resort for the name",
  snap.app, "com.example.nope")
is("unresolved: no icon is invented from a name nothing resolved", snap.appIcon, "")

// A resolver that is absent must degrade to the raw value, not throw.
snap = L.snapshotOf({ id: 4, appName: "", appIcon: "", desktopEntry: "snap.slack" }, 1)
is("no resolver: falls back to the raw value rather than throwing", snap.app, "snap.slack")
is("no resolver: leaves the icon alone", snap.appIcon, "")

// A resolver that throws must not take the notification down with it: a
// notification that fails to store is worse than one with a blank name.
snap = L.snapshotOf({ id: 5, appName: "", appIcon: "", desktopEntry: "snap.slack" },
  1, () => { throw new Error("database went away") })
is("throwing resolver: the notification still stores", snap.app, "snap.slack")
is("throwing resolver: with its id intact", snap.id, 5)

// Each field falls back independently of the other.
snap = L.snapshotOf({ id: 6, appName: "", appIcon: "", desktopEntry: "x" },
  1, () => ({ name: "Ex", icon: "" }))
is("partial resolve: a name with no icon still fixes the name", snap.app, "Ex")
is("partial resolve: and leaves the icon empty", snap.appIcon, "")
snap = L.snapshotOf({ id: 7, appName: "", appIcon: "", desktopEntry: "x" },
  1, () => ({ name: "", icon: "/i.png" }))
is("partial resolve: an icon with no name falls back to the raw value", snap.app, "x")
is("partial resolve: and still fixes the icon", snap.appIcon, "/i.png")

// ---------------------------------------------------------
// The replaces_id path
// ---------------------------------------------------------

// An in-place update rebuilds the row from the notification object, so the
// resolver has to reach this path too — otherwise Slack would show its name
// until its first edit and blank afterwards, which is worse than never showing
// it because it looks intermittent.
const replaced = L.replacementSnapshot(slackNotification, 900, 1787588843078, lookup)
is("replacement: keeps the recovered name", replaced.app, "Slack")
is("replacement: keeps the recovered icon",
  replaced.appIcon, "/var/lib/snapd/snap/slack/current/usr/share/pixmaps/slack.png")
is("replacement: keeps the original popup identity", replaced.id, 900)
is("replacement: and its originalId", replaced.originalId, 900)

const replacedNoLookup = L.replacementSnapshot(slackNotification, 900, 1, undefined)
is("replacement: degrades to the raw value with no resolver", replacedNoLookup.app, "snap.slack")

// ---------------------------------------------------------
// Everything else snapshotOf carries is unchanged
// ---------------------------------------------------------

snap = L.snapshotOf({
  id: 8, appName: "A", appIcon: "i", summary: "s", body: "b", image: "im",
  urgency: 2, expireTimeout: 5000,
  hints: { "omarchy-glyph": "G", "omarchy-exec": "E" },
}, 4242, lookup)
isDeep("passthrough: every other role survives the change", snap, {
  id: 8, originalId: 8, app: "A", appIcon: "i", summary: "s", body: "b",
  image: "im", glyph: "G", exec: "E", urgency: 2, expireTimeout: 5000,
  timestamp: 4242,
})
// The popup card draws exactly POPUP_ROLES, and app/appIcon are both in it — so
// a recovered name reaches the live toast and not only the history row.
const roles = L.popupRoles()
is("passthrough: app is still a popup role", roles.indexOf("app") >= 0, true)
is("passthrough: appIcon is still a popup role", roles.indexOf("appIcon") >= 0, true)

console.log(`\n1..${tests}`)
if (failures) {
  console.log(`\n${failures} of ${tests} failed.`)
  process.exit(1)
}
console.log(`\nAll ${tests} passed.`)
