function isChromiumDerived(app, appIcon) {
  var source = (String(app || "") + "\n" + String(appIcon || "")).toLowerCase()
  return source.indexOf("chrom") >= 0 || source.indexOf("brave") >= 0 ||
         source.indexOf("vivaldi") >= 0 || source.indexOf("microsoft-edge") >= 0 ||
         source.indexOf("opera") >= 0
}

function sanitizeBody(body, app, appIcon) {
  var text = String(body || "").replace(/<img[^>]*>/gi, "")
  if (!isChromiumDerived(app, appIcon)) return text

  return text
    .replace(/^\s*<a\b[^>]*>\s*(?:https?:\/\/|www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^<\s]*)?\s*<\/a>\s*/i, "")
    .replace(/^\s*(?:https?:\/\/|www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/\S*)?\s+/i, "")
}

function summaryStartsWithGlyph(summary) {
  var text = String(summary || "").replace(/^\s+/, "")
  if (!text) return false

  var offset = 1
  var first = text.charCodeAt(0)
  if (first >= 0xd800 && first <= 0xdbff && text.length > 1) offset = 2

  var spaces = 0
  while (offset < text.length && text.charAt(offset) === " ") {
    spaces++
    offset++
  }

  return spaces >= 2
}

function shouldBypassDnd(notification, criticalUrgency) {
  var appName = String((notification && notification.appName) || "")
  if (appName === "omarchy-action") return true
  return appName === "notify-send" && notification && notification.urgency === criticalUrgency
}

function isEphemeralApp(appName) {
  var name = String(appName || "")
  return name === "notify-send" || name === "omarchy-action"
}

function stringHint(hints, name) {
  try {
    if (hints) {
      var value = hints[name]
      if (value !== undefined && value !== null) return String(value)
    }
  } catch (e) {
  }
  return ""
}

function glyphFromHints(hints) {
  return stringHint(hints, "omarchy-glyph")
}

// Shell command to run when the card is clicked, sent by
// omarchy-notification-send --exec. Carrying the action as data means it
// travels with the popup through the persistence files, so a toast restored
// after a shell restart clicks through exactly like a live one. A libnotify
// action can't: its sender is still waiting on an id from a server generation
// that no longer exists.
function execFromHints(hints) {
  return stringHint(hints, "omarchy-exec")
}

function shouldRenderCompactGlyph(glyph, iconSource, singleLineToast) {
  return String(glyph || "").length > 0 && String(iconSource || "").length === 0 && !!singleLineToast
}

// SHOKUPAN: the whole of this fork. Upstream stores `app: n.appName || ""`
// and never reads `desktopEntry`, so an app that sent no app_name has no
// recoverable identity by the time anything downstream reads the row.
//
// Two whole classes of sender leave app_name empty on the wire, and both get
// the `desktop-entry` hint right:
//
//   * GLib's freedesktop notification backend — every Ghostty notification.
//   * xdg-desktop-portal-gtk, which hardcodes "" as the app name and puts the
//     caller's portal app id in `desktop-entry`. That is every sandboxed
//     sender, Slack included.
//
// A .desktop file is where a display name and an icon both live, so both are
// recoverable from that one hint, and neither is recoverable without it.
//
// Quickshell already resolves the ICON from the same hint (notification.cpp:
// `if (appIcon.isEmpty() && !bDesktopEntry.isEmpty())` → `byId(...)`), so this
// is not the only place that looks. But it only tries byId(), which is why the
// snap case below still arrives with no icon at all — and it never resolves a
// name.
//
// `lookup` is the resolver Service.qml supplies over Quickshell's
// DesktopEntries. It takes an id and returns { name, icon } or null. Passing it
// in rather than importing DesktopEntries here is what keeps this file a pure
// function of the notification's fields, and therefore testable.
function desktopEntryOf(notification) {
  var n = notification || {}
  // The Quickshell property first; the raw hint is the same value and is kept
  // in `hints` (only image-data/image_data/icon_data are stripped), so it is a
  // free second source if the property is ever absent.
  return String(n.desktopEntry || "") || stringHint(n.hints, "desktop-entry")
}

// The ids worth asking the desktop database about, most specific first.
function desktopEntryCandidates(desktopEntry) {
  var entry = String(desktopEntry || "")
  if (!entry) return []
  var ids = [entry]
  // xdg-desktop-portal ids a snap as `snap.<instance>` — its own
  // `g_strconcat ("snap.", snap_name, NULL)` — while snapd names the desktop
  // file `<instance>_<app>.desktop`. The portal's id therefore never matches
  // the file it means: `snap.slack` vs `slack_slack.desktop`. Stripping the
  // prefix is what lets the lookup find it, and it is the only reason Slack
  // gets a name and an icon rather than a blank slot.
  if (entry.indexOf("snap.") === 0 && entry.length > "snap.".length)
    ids.push(entry.slice("snap.".length))
  return ids
}

function resolveDesktopEntry(desktopEntry, lookup) {
  if (typeof lookup !== "function") return null
  var ids = desktopEntryCandidates(desktopEntry)
  for (var i = 0; i < ids.length; i++) {
    var found = null
    try {
      found = lookup(ids[i])
    } catch (e) {
      found = null
    }
    if (found && (String(found.name || "") !== "" || String(found.icon || "") !== ""))
      return found
  }
  return null
}

// The app name to store. A resolved `Name=` is what a user expects to read —
// "Ghostty", "Slack" — so it wins. The raw hint value is ugly
// ("com.mitchellh.ghostty", "snap.slack") but it still names the app, and the
// alternative is the blank slot this fork exists to remove, so it is the last
// resort rather than no resort. Only ever consulted when the sender supplied
// nothing: an app that sets app_name keeps exactly what it set.
function appNameOf(notification, resolved) {
  var n = notification || {}
  var name = String(n.appName || "")
  if (name !== "") return name
  if (resolved && String(resolved.name || "") !== "") return String(resolved.name)
  return desktopEntryOf(n)
}

// The app icon to store. Reached only where Quickshell's own byId() already
// failed, which in practice means the snap ids above. The value may be a bare
// icon name or an absolute path (snapd writes an absolute Icon=); both the
// popup card and the notification-centre row handle either, so it is stored as
// the desktop file gives it.
function appIconOf(notification, resolved) {
  var n = notification || {}
  var icon = String(n.appIcon || "")
  if (icon !== "") return icon
  if (resolved && String(resolved.icon || "") !== "") return String(resolved.icon)
  return ""
}

// SHOKUPAN: the slot shift.
//
// herdr delivers through the terminal using OSC 9, which carries one string and
// no title. Ghostty therefore has no title to pass on and hardcodes the literal
// "Ghostty" as its summary, so every agent notification on this machine arrives
// as
//
//   app "Ghostty" / summary "Ghostty" / body "claude finished: shokupan · 4"
//
// — the app's own name occupying the slot the message should be in, and the
// message sitting one slot lower than it belongs. herdr 0.8.2 has no way to
// emit OSC 777 (no config key, no flag, no env var), so this cannot be fixed at
// the source. It is the input that is wrong and not the renderer: the
// OSC777TITLE / OSC777BODY probe rows in this machine's own notification
// history render with no duplication at all, against the same terminal and the
// same daemon.
//
// The rule: when a notification's summary is exactly the app's own name and
// there is a body underneath it, the body moves up into the summary slot.
//
// WHICH NAME IT COMPARES AGAINST. The name that will be STORED — what
// appNameOf() resolved — and not the wire app_name. Ghostty sends
// app_name = "" and takes "Ghostty" from its desktop file's Name= through the
// fallback above, so a rule that compared the wire value would never once fire
// on the only sender that needs it. It is also the definitionally right test:
// the duplication being removed is between two things the user can SEE, the app
// slot and the summary slot, so the two strings compared are exactly the two
// strings drawn — whichever of the three sources the drawn name came from.
//
// HOW EXACTLY IT MATCHES. Trimmed, not case-folded. Whitespace around a title
// is never meaningful, and it does occur — a real notify-send row on this
// machine carries six leading spaces in its summary — so trimming costs nothing
// and catches a sender that pads. Case is meaningful: an app that styles its
// own name differently from its Name= ("SIGNAL" against "Signal") is making a
// choice, and folding case widens what this mangles while buying no sender that
// exists here.
//
// WHAT BECOMES OF THE BODY. Its first line becomes the summary and the rest
// stays behind as the body — app name / message / detail, which is the shape
// asked for. It degrades to an empty body in the single-line case, which is all
// herdr can actually produce: measured 2026-08-24, herdr joins its title and
// body as "<title>: <body>" and flattens newlines to spaces before the OSC 9
// payload, so a herdr toast is always exactly one line. Leaving the body alone
// would print the same text twice; emptying it unconditionally would throw away
// a multi-line sender's detail.
//
// WHEN IT MUST NOT FIRE. An empty body promotes nothing and leaves the row with
// no message at all, which is worse than the duplication it removes. A body
// that is empty, whitespace-only, or nothing but blank lines is therefore left
// exactly as it is.
//
// This is a heuristic and is meant to be provisional: an app that legitimately
// titles a notification with its own name has its body promoted too. Every
// sender on this machine was checked against it before it shipped. It should be
// retired the day herdr can emit OSC 777. See the plugin README.
function promoteBodyIntoSummary(app, appIcon, summary, body) {
  var head = String(summary || "").trim()
  if (head === "" || head !== String(app || "").trim()) return null

  // Blank leading lines carry no message; promoting one would blank the very
  // slot the promotion exists to fill.
  var text = String(body || "").replace(/\r\n/g, "\n").replace(/^(?:[ \t]*\n)+/, "")
  if (text.trim() === "") return null

  var cut = text.indexOf("\n")
  var first = cut < 0 ? text : text.slice(0, cut)
  var rest = cut < 0 ? "" : text.slice(cut + 1).replace(/^(?:[ \t]*\n)+/, "")

  // The summary slot is drawn raw; the body slot is drawn through
  // sanitizeBody(). Text moving up has to be cleaned on the way, or a
  // Chromium-family sender's leading-URL prefix and its <img> tags would
  // surface as markup in a slot that nothing cleans.
  var promoted = sanitizeBody(first, app, appIcon).trim()
  // Cleaning can leave nothing behind — a body that was only an <img>. A blank
  // summary is worse than the duplication, so that one stays as it was.
  if (promoted === "") return null

  return { summary: promoted, body: rest }
}

function snapshotOf(notification, timestamp, lookup) {
  var n = notification || {}
  var id = n.id || 0
  var expireTimeout = Number(n.expireTimeout || 0)
  if (!isFinite(expireTimeout) || expireTimeout < 0) expireTimeout = 0
  // SHOKUPAN: resolved once and shared by both fallbacks below — one desktop
  // database lookup per notification, not two.
  var resolved = resolveDesktopEntry(desktopEntryOf(n), lookup)
  var app = appNameOf(n, resolved)        // SHOKUPAN: was inline n.appName || ""
  var appIcon = appIconOf(n, resolved)    // SHOKUPAN: was inline n.appIcon || ""
  var summary = String(n.summary || "")
  var body = n.body || ""
  // SHOKUPAN: the slot shift, applied here because this is the one place both
  // the live popup card and the persisted row are built from — popupModel takes
  // this object and the history file is written from it, so the promotion
  // reaches the toast, the notification centre and jankeesvw's history row
  // without any of them knowing about it.
  var promoted = promoteBodyIntoSummary(app, appIcon, summary, body)
  if (promoted) {
    summary = promoted.summary
    body = promoted.body
  }
  return {
    id: id,
    originalId: id,
    app: app,
    appIcon: appIcon,
    summary: summary,
    body: body,
    image: n.image || "",
    glyph: glyphFromHints(n.hints),
    exec: execFromHints(n.hints),
    urgency: n.urgency,
    expireTimeout: expireTimeout,
    timestamp: timestamp === undefined ? Date.now() : timestamp
  }
}

// Everything the popup card draws, and therefore everything an in-place
// update has to write through to the row and its file.
var POPUP_ROLES = ["app", "appIcon", "summary", "body", "image", "glyph", "exec", "urgency", "expireTimeout"]

function popupRoles() {
  return POPUP_ROLES
}

// Whether a refresh has anything to write. Each property a client updates
// emits its own signal, and the catch-up refresh after a row is inserted
// usually finds the object exactly as it was snapshotted — without this,
// one update would rewrite the file several times over.
function popupRowChanged(row, updated) {
  var current = row || {}
  var next = updated || {}
  for (var i = 0; i < POPUP_ROLES.length; i++) {
    var role = POPUP_ROLES[i]
    if (current[role] !== next[role]) return true
  }
  return false
}

// A client updating a notification through replaces_id keeps the identity of
// the popup it took over: the file name is the timestamp and id the popup was
// first persisted under, and the restore, replace and archive paths all key
// off that name. Only what the card draws comes from the updated object.
function replacementSnapshot(notification, originalId, timestamp, lookup) {
  // SHOKUPAN: `lookup` threaded through — a replaces_id update rebuilds the row
  // from scratch, so without it an in-place update would blank a name the
  // original had recovered.
  var updated = snapshotOf(notification, timestamp, lookup)
  updated.id = originalId
  updated.originalId = originalId
  return updated
}

function historyEntry(value, normalUrgency) {
  var e = value || {}
  return {
    id: e.id || 0,
    originalId: e.originalId || e.id || 0,
    app: e.app || "",
    appIcon: e.appIcon || "",
    summary: e.summary || "",
    body: e.body || "",
    image: e.image || "",
    glyph: e.glyph || "",
    exec: e.exec || "",
    urgency: typeof e.urgency === "number" ? e.urgency : normalUrgency,
    expireTimeout: 0,
    timestamp: e.timestamp || 0
  }
}

// notifications.json holds nothing but the last-set DND preference now that
// history is a directory of files. Older versions kept `pending`/`past`
// (and, older still, `entries`) arrays in there; their presence is reported
// so the service can rewrite the file without the dead payload.
function parseSettings(raw) {
  var text = String(raw || "").trim()
  if (!text) return { error: false, dnd: null, legacy: false }

  try {
    var parsed = JSON.parse(text)
    return {
      error: false,
      dnd: parsed && typeof parsed.dnd === "boolean" ? parsed.dnd : null,
      legacy: !!(parsed && (parsed.pending || parsed.past || parsed.entries))
    }
  } catch (e) {
    return { error: true, errorMessage: String(e), dnd: null, legacy: false }
  }
}

// ---------------------------------------------------- popup persistence
//
// Each on-screen popup is mirrored to its own file under
// ~/.local/state/omarchy/notifications/ so toasts survive shell restarts
// (e.g. the restart `omarchy-update` performs). The file exists exactly as
// long as the popup is on screen: it is written when the toast appears and
// moved into the history/ subdirectory when the toast expires, is dismissed,
// or its action is invoked. History is those moved files, newest last-10.

function popupEntry(value, normalUrgency) {
  var entry = historyEntry(value, normalUrgency)
  var expire = Number((value || {}).expireTimeout || 0)
  if (!isFinite(expire) || expire < 0) expire = 0
  entry.expireTimeout = expire
  // Absolute expiry deadline, set only when a restore resets a surviving
  // popup's display lifetime. Kept out of the entry entirely when unset so
  // restored rows match the roles of freshly received ones.
  var deadline = Number((value || {}).deadline || 0)
  if (isFinite(deadline) && deadline > 0) entry.deadline = deadline
  return entry
}

function popupFileName(entry) {
  return imageStem(entry) + ".json"
}

// ---------------------------------------------------- persisted images
//
// A notification's images only exist while it is live: Chromium-family
// senders (all Omarchy web apps) delete their scoped /tmp files on close,
// and image-data hints surface as in-process image:// URLs that die with
// the server object. Persisted entries therefore reference their own
// copies, named by the entry's file stem so cleanup can find them from
// the JSON file name alone.

var PERSISTED_IMAGE_ROLES = ["appIcon", "image"]

function imageStem(entry) {
  var e = entry || {}
  return String(e.timestamp || 0) + "-" + String(e.originalId || 0)
}

// The filesystem path behind a file-backed image value, or "" for anything
// a copy can't capture: themed icon names, in-process image:// URLs, empty.
function localImageFile(value) {
  var s = String(value || "")
  if (s.indexOf("file://") === 0) {
    s = s.slice(7)
    try { s = decodeURIComponent(s) } catch (e) {}
  }
  return s.charAt(0) === "/" ? s : ""
}

// The entry as it should hit the disk, plus the copies that make it true.
// File-backed images redirect to their copy under imagesDir; dead image://
// URLs drop to "" (the card falls back to the app icon). Already-redirected
// values map onto themselves and produce no copy, keeping restores no-ops.
function persistablePopup(entry, imagesDir) {
  var e = entry || {}
  var out = {}
  for (var key in e) out[key] = e[key]
  var copies = []
  for (var i = 0; i < PERSISTED_IMAGE_ROLES.length; i++) {
    var role = PERSISTED_IMAGE_ROLES[i]
    var value = String(out[role] || "")
    if (!value) continue
    var source = localImageFile(value)
    if (source) {
      var copy = String(imagesDir || "") + imageStem(e) + "-" + role
      if (source !== copy) copies.push({ from: source, to: copy })
      out[role] = "file://" + copy
    } else if (value.indexOf("image://") === 0) {
      out[role] = ""
    }
  }
  return { entry: out, copies: copies }
}

function serializePopup(entry, normalUrgency) {
  // Compact (single-line) on purpose: restore cats every file together and
  // parses line by line, which only works when each file is one line.
  return JSON.stringify(popupEntry(entry, normalUrgency))
}

// Parse the concatenation of every persisted popup file into entries,
// newest-first. Deliberately NO dedupe by originalId: ids restart from 1
// with every server process, so two files sharing an id are usually
// different generations — dropping the older one would silently discard a
// restored critical alert the moment a fresh notification reuses its id.
// The one case that leaves a genuine duplicate (a crash between a
// replacement's write and the replaced file's delete) merely re-shows a
// superseded toast, which expires or is dismissed and cleans itself up.
function parsePopupFiles(raw, normalUrgency) {
  var lines = String(raw || "").split("\n")
  var entries = []
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (!line) continue
    try {
      var value = JSON.parse(line)
      if (value && typeof value === "object") entries.push(popupEntry(value, normalUrgency))
    } catch (e) {
      // A torn write from a crash mid-save — skip the line, keep the rest.
    }
  }
  entries.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0) })
  return entries
}

// A persisted popup whose lifetime already ran out would have expired on
// screen had the shell kept running, so it is not restored. duration 0 means
// the popup never expires (critical urgency) and always survives restarts.
// A restore-reset deadline outranks the original timestamp: without it, a
// second restart would judge a re-shown toast by a clock that no longer
// governs its display and drop it while it is still on screen.
function popupExpired(entry, duration, now) {
  var deadline = Number((entry || {}).deadline || 0)
  if (isFinite(deadline) && deadline > 0) return Number(now) >= deadline
  var lifetime = Number(duration || 0)
  if (!isFinite(lifetime) || lifetime <= 0) return false
  return (Number(now) - Number((entry || {}).timestamp || 0)) >= lifetime
}

function popupPlacement(barPosition, barClearance, gapsOut) {
  var position = String(barPosition || "top")
  var clearance = Number(barClearance)
  var gap = Number(gapsOut)
  if (!isFinite(clearance)) clearance = 0
  if (!isFinite(gap)) gap = 0

  return {
    anchors: { top: true, bottom: false, left: false, right: true },
    margins: {
      top: position === "top" ? clearance : gap,
      bottom: gap,
      left: gap,
      right: position === "right" ? clearance : gap
    }
  }
}

// The archived files are the history. They are read back exactly like the
// live popup files, then normalized into history rows: replaying a toast
// must not inherit the original's expire timeout or restore deadline, so it
// gets the standard on-screen lifetime for its urgency instead.
//
// liveRows are the toasts still on screen when the replay was asked for.
// They belong in it — they're the newest notifications there are — but the
// directory read races their archival, so they're carried across by hand and
// keyed by file name (timestamp + id) to drop the copy the read already saw.
function historyRows(raw, liveRows, normalUrgency, limit) {
  var max = limit === undefined || limit === null ? 10 : Number(limit)
  if (isNaN(max)) max = 10
  max = Math.max(0, max)

  var out = []
  var seen = {}
  function collect(rows) {
    for (var i = 0; i < rows.length; i++) {
      var entry = rows[i]
      if (!entry) continue
      var key = popupFileName(entry)
      if (seen[key]) continue
      seen[key] = true
      out.push(historyEntry(entry, normalUrgency))
    }
  }

  collect(Array.isArray(liveRows) ? liveRows : [])
  collect(parsePopupFiles(raw, normalUrgency))
  out.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0) })
  return out.slice(0, max)
}

if (typeof module !== "undefined") {
  module.exports = {
    isChromiumDerived: isChromiumDerived,
    sanitizeBody: sanitizeBody,
    summaryStartsWithGlyph: summaryStartsWithGlyph,
    shouldBypassDnd: shouldBypassDnd,
    isEphemeralApp: isEphemeralApp,
    stringHint: stringHint,
    glyphFromHints: glyphFromHints,
    execFromHints: execFromHints,
    shouldRenderCompactGlyph: shouldRenderCompactGlyph,
    desktopEntryOf: desktopEntryOf,
    desktopEntryCandidates: desktopEntryCandidates,
    resolveDesktopEntry: resolveDesktopEntry,
    appNameOf: appNameOf,
    appIconOf: appIconOf,
    promoteBodyIntoSummary: promoteBodyIntoSummary,
    snapshotOf: snapshotOf,
    popupRoles: popupRoles,
    popupRowChanged: popupRowChanged,
    replacementSnapshot: replacementSnapshot,
    historyEntry: historyEntry,
    parseSettings: parseSettings,
    historyRows: historyRows,
    popupEntry: popupEntry,
    popupFileName: popupFileName,
    imageStem: imageStem,
    localImageFile: localImageFile,
    persistablePopup: persistablePopup,
    serializePopup: serializePopup,
    parsePopupFiles: parsePopupFiles,
    popupExpired: popupExpired,
    popupPlacement: popupPlacement
  }
}
