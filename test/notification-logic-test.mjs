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
// Was "the summary is untouched" before the slot shift landed. The summary here
// is the literal "Ghostty" Ghostty hardcodes because OSC 9 gave it no title, so
// it is exactly the case the shift exists for and it does not survive.
is("ghostty: the hardcoded self-named summary gives way to the message",
  snap.summary, "claude finished: notifentry")
is("ghostty: and the body it came from is emptied rather than duplicated",
  snap.body, "")

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
// The slot shift: promoting the body when the summary is the app's own name
// ---------------------------------------------------------

// The rule is a pure function of three fields, so it is asserted directly as
// well as through snapshotOf. app_icon is passed because the promoted text is
// sanitized on its way into a slot that is drawn raw.
function promote(app, appIcon, summary, body) {
  return L.promoteBodyIntoSummary(app, appIcon, summary, body)
}

// The case this exists for, field for field from a stored record on this
// machine (history/1787607461116-4.json).
isDeep("shift: the Ghostty case fires and the message moves up one slot",
  promote("Ghostty", "com.mitchellh.ghostty", "Ghostty", "claude finished: gap-payments · 14"),
  { summary: "claude finished: gap-payments · 14", body: "" })

// A sender with something real to say in its summary is never touched — this is
// every correctly-behaved sender on the machine, and the whole risk the rule
// carries is that it might not be.
is("shift: a summary that is not the app's name does not fire",
  promote("Slack", "", "New message from Jan", "see you at four"), null)
is("shift: a summary that merely CONTAINS the app name does not fire",
  promote("Ghostty", "", "Ghostty crashed", "exit code 1"), null)
is("shift: the app name merely containing the summary does not fire",
  promote("Ghostty Terminal", "", "Ghostty", "body"), null)

// Promoting nothing would leave the row with no message at all, which is worse
// than the duplication the rule removes.
is("shift: an empty body does not fire, or the row would be blanked",
  promote("Ghostty", "", "Ghostty", ""), null)
is("shift: an absent body does not fire", promote("Ghostty", "", "Ghostty"), null)
is("shift: a whitespace-only body does not fire",
  promote("Ghostty", "", "Ghostty", "   \t  "), null)
is("shift: a body of nothing but blank lines does not fire",
  promote("Ghostty", "", "Ghostty", "\n  \n\n"), null)

// A multi-line body keeps its detail: first line up, the rest stays behind.
// That is app name / message / detail, which is the shape asked for. herdr
// itself cannot produce one — it flattens newlines to spaces before the OSC 9
// payload, measured 2026-08-24 — but Omarchy's own senders do
// (omarchy-notification-send is called with $'...\n...' in first-run/welcome.sh)
// so the branch is not hypothetical for every sender, only for this one.
isDeep("shift: a multi-line body promotes its first line and keeps the rest",
  promote("Ghostty", "", "Ghostty", "the message\nthe detail\nmore detail"),
  { summary: "the message", body: "the detail\nmore detail" })
isDeep("shift: CRLF is normalised before the split",
  promote("Ghostty", "", "Ghostty", "the message\r\nthe detail"),
  { summary: "the message", body: "the detail" })
// The assertion above passes with or without the CRLF normalisation, because
// trimming the promoted line takes the stray \r off anyway. This one does not:
// the blank-line strip on the REMAINDER matches "\n" and never "\r\n", so
// without the normalisation the body keeps a leading blank line.
isDeep("shift: a CRLF blank line under the first is dropped like an LF one",
  promote("Ghostty", "", "Ghostty", "the message\r\n\r\nthe detail"),
  { summary: "the message", body: "the detail" })
isDeep("shift: a blank line under the first is dropped, not drawn as a gap",
  promote("Ghostty", "", "Ghostty", "the message\n\nthe detail"),
  { summary: "the message", body: "the detail" })
isDeep("shift: leading blank lines are skipped rather than promoted",
  promote("Ghostty", "", "Ghostty", "\n\nthe message\nthe detail"),
  { summary: "the message", body: "the detail" })

// Trimmed, not case-folded. A real notify-send row on this machine carries six
// leading spaces in its summary, so padding happens; case, by contrast, is a
// sender's own choice and folding it would only widen what this mangles.
isDeep("shift: a padded summary still matches the app name",
  promote("Ghostty", "", "  Ghostty  ", "the message"),
  { summary: "the message", body: "" })
isDeep("shift: a padded app name still matches the summary",
  promote(" Ghostty ", "", "Ghostty", "the message"),
  { summary: "the message", body: "" })
is("shift: a differently-cased name is a different name",
  promote("Signal", "", "SIGNAL", "the message"), null)

// Nothing to compare means nothing to fire on. Two blank slots are not a match.
is("shift: an empty app name and an empty summary is not a match",
  promote("", "", "", "the message"), null)
is("shift: a blank app name does not match a blank summary through trimming",
  promote("  ", "", "  ", "the message"), null)

// Text moving into the summary slot is drawn raw, while the body slot is drawn
// through sanitizeBody(). Cleaning it on the way is what stops a Chromium-family
// sender's leading-URL prefix and its <img> tags surfacing as markup.
isDeep("shift: an <img> in the promoted line is stripped on the way up",
  promote("Helium", "", "Helium", "<img src=x>the message"),
  { summary: "the message", body: "" })
// "Chromium-derived" is upstream's own isChromiumDerived() list, matched on the
// app name and icon: chrom / brave / vivaldi / microsoft-edge / opera. It does
// NOT match "Helium", the Chromium fork actually installed here — a gap in
// upstream's sanitizeBody() that predates this rule and is not this rule's to
// close, so the sender asserted here is one the list does recognise.
isDeep("shift: a chromium sender's leading URL is stripped on the way up",
  promote("Chromium", "chromium", "Chromium", "example.com the message"),
  { summary: "the message", body: "" })
is("shift: a sender outside that list keeps its leading URL, as in the body slot",
  promote("Helium", "helium-browser", "Helium", "example.com the message").summary,
  "example.com the message")
is("shift: a line that cleans away to nothing does not fire",
  promote("Helium", "", "Helium", "<img src=x>"), null)

// ---------------------------------------------------------
// The slot shift through snapshotOf, where it actually runs
// ---------------------------------------------------------

// The comparison is against the name that will be STORED, not the wire
// app_name. Ghostty sends app_name = "" and only has a name at all because the
// desktop-entry fallback recovered one — so a rule that compared the wire value
// would never fire on the one sender that needs it. This is the assertion that
// catches that mistake.
snap = L.snapshotOf({
  id: 100, appName: "", appIcon: "com.mitchellh.ghostty",
  desktopEntry: "com.mitchellh.ghostty",
  summary: "Ghostty", body: "claude finished: gap-payments · 14", urgency: 1,
}, 1, lookup)
is("shift/snapshot: fires against the RESOLVED name, not the empty wire one",
  snap.summary, "claude finished: gap-payments · 14")
is("shift/snapshot: the app slot still holds the resolved name", snap.app, "Ghostty")
is("shift/snapshot: the body is emptied, not duplicated", snap.body, "")

// The other half of the same decision: a name that came from the RAW hint
// because nothing resolved is still the name being drawn, so the summary
// duplicating it is still the duplication this removes.
snap = L.snapshotOf({
  id: 101, appName: "", appIcon: "", desktopEntry: "com.example.nope",
  summary: "com.example.nope", body: "the message",
}, 1, lookup)
is("shift/snapshot: fires on a name that fell back to the raw hint value",
  snap.summary, "the message")
is("shift/snapshot: the raw hint is still what the app slot holds",
  snap.app, "com.example.nope")

// A sender that named itself on the wire is compared against what it sent,
// because that is what gets drawn.
snap = L.snapshotOf({ id: 102, appName: "Ghostty", appIcon: "", summary: "Ghostty",
  body: "the message" }, 1, lookup)
is("shift/snapshot: fires on a name the sender set itself", snap.summary, "the message")

// Every sender that renders correctly today goes on rendering correctly.
snap = L.snapshotOf({ id: 103, appName: "omarchy-action", appIcon: "",
  summary: "Pending Omarchy Migrations", body: "Click to review them." }, 1, lookup)
is("shift/snapshot: omarchy's own toasts are untouched",
  snap.summary, "Pending Omarchy Migrations")
is("shift/snapshot: and keep their body", snap.body, "Click to review them.")

// The weather widget's right click sends a headline and no description at all.
snap = L.snapshotOf({ id: 104, appName: "omarchy-action", appIcon: "",
  summary: "Clear · 18°C", body: "" }, 1, lookup)
is("shift/snapshot: a headline-only sender keeps its headline", snap.summary, "Clear · 18°C")

// dismiss() in Service.qml takes a toast off the screen by summary substring,
// and the first-run notifications are its callers. They are omarchy-action
// senders with real summaries, so the shift never rewrites a summary that
// something else matches on — assert it rather than assume it.
snap = L.snapshotOf({ id: 105, appName: "omarchy-action", appIcon: "",
  summary: "Setup Wi-Fi", body: "Click to configure the wireless network." }, 1, lookup)
is("shift/snapshot: a summary dismiss() matches on is not rewritten",
  snap.summary, "Setup Wi-Fi")

// A replaces_id update rebuilds the row from scratch, so the shift has to reach
// that path too — otherwise a Ghostty toast would read correctly until its first
// edit and wrongly afterwards, which is worse than never shifting because it
// looks intermittent.
const shiftedReplacement = L.replacementSnapshot({
  id: 106, appName: "", appIcon: "com.mitchellh.ghostty",
  desktopEntry: "com.mitchellh.ghostty",
  summary: "Ghostty", body: "claude needs attention: shokupan · 4",
}, 901, 5, lookup)
is("shift/replacement: an in-place update is shifted too",
  shiftedReplacement.summary, "claude needs attention: shokupan · 4")
is("shift/replacement: and keeps the original popup identity",
  shiftedReplacement.originalId, 901)

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
// Both slots the shift rewrites are popup roles, so a shifted row reaches the
// live toast and not only the history file. The history row and jankeesvw's
// panel read the persisted file, which is written from this same object.
is("passthrough: summary is still a popup role", roles.indexOf("summary") >= 0, true)
is("passthrough: body is still a popup role", roles.indexOf("body") >= 0, true)

console.log(`\n1..${tests}`)
if (failures) {
  console.log(`\n${failures} of ${tests} failed.`)
  process.exit(1)
}
console.log(`\nAll ${tests} passed.`)
