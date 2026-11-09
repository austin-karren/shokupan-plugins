// Pure helpers for the Podman panel: parsing podman's JSON, deciding which
// actions a row offers, and turning podman's vocabulary into labels. Kept
// free of QML types so the panel stays a thin renderer.
//
// Derived from io.github.dicemans.docker-vms (MIT, Paolo Pellicori); the
// podman changes are marked SHOKUPAN:.

// Caps on what the shell process is willing to hold, whatever the helper
// hands it.
var MAX_INPUT = 1048576  // characters accepted from one helper run
var MAX_ROWS = 200       // rows kept
var MAX_FIELD = 512      // characters kept per field
var MAX_DIAG = 400       // characters of diagnostic text kept

function clip(value) {
  return String(value === undefined || value === null ? "" : value).slice(0, MAX_FIELD)
}

function clipDiag(value) {
  return String(value === undefined || value === null ? "" : value).trim().slice(0, MAX_DIAG)
}

// What docker's container states actually permit. Reducing this to a single
// `running` boolean was the source of a whole family of wrong offers: a paused
// container was handed Start (which cannot resume it) and Remove (which docker
// refuses), and a container in a crash loop was counted as stopped.
//
// `active` means the container occupies resources right now, which is what the
// bar counts — a restart loop is very much not "stopped".
var STATES = {
  running:    { start: false, stopRestart: true,  remove: false, active: true,  pause: true,  unpause: false, kill: true,  shell: true },
  paused:     { start: false, stopRestart: true,  remove: false, active: true,  pause: false, unpause: true,  kill: false, shell: false },
  restarting: { start: false, stopRestart: true,  remove: false, active: true,  pause: false, unpause: false, kill: true,  shell: false },
  created:    { start: true,  stopRestart: false, remove: true,  active: false, pause: false, unpause: false, kill: false, shell: false },
  exited:     { start: true,  stopRestart: false, remove: true,  active: false, pause: false, unpause: false, kill: false, shell: false },
  dead:       { start: false, stopRestart: false, remove: true,  active: false, pause: false, unpause: false, kill: false, shell: false },
  removing:   { start: false, stopRestart: false, remove: false, active: false, pause: false, unpause: false, kill: false, shell: false },
  // SHOKUPAN: podman's own states. `stopped` is podman's exited-without-
  // cleanup, `configured` is created-in-a-pod, `stopping` is mid-stop.
  stopped:    { start: true,  stopRestart: false, remove: true,  active: false, pause: false, unpause: false, kill: false, shell: false },
  configured: { start: true,  stopRestart: false, remove: true,  active: false, pause: false, unpause: false, kill: false, shell: false },
  stopping:   { start: false, stopRestart: false, remove: false, active: true,  pause: false, unpause: false, kill: true,  shell: false }
}

// An unknown state offers nothing rather than guessing. A new docker state
// should make the panel quiet, not make it propose actions that fail.
var UNKNOWN_STATE = { start: false, stopRestart: false, remove: false, active: false, pause: false, unpause: false, kill: false, shell: false }

function stateRules(state) {
  return STATES[String(state || "")] || UNKNOWN_STATE
}

var GLYPH = {
  podman: "\ue866",
  windows: "󰍲",
  macos: "󰀵",
  connect: "󰢹",
  viewer: "󰖟",
  start: "󰐊",
  stop: "󰓛",
  restart: "󰑓",
  remove: "󰩺",
  alert: "󰀦",
  logs: "󰦪",
  shell: "󰆍",
  pause: "󰏤",
  play: "󰐊",
  kill: "󰚌",
  web: "󰖟",
  copy: "󰆏"
}

// SHOKUPAN: podman port. The docker helper flattened docker's Go-template
// output into TSV; podman's `ps -a --format json` is structured already, so
// the helper hands it over raw and the parsing lives here, where node can
// test it (test/podman-model-test.mjs).

// Image name -> what kind of thing it is. dockur images are named for their
// guest; anything else is a plain container.
function kindFor(image) {
  var text = String(image || "").toLowerCase()
  if (text.indexOf("windows") !== -1) return "windows"
  if (text.indexOf("macos") !== -1) return "macos"
  return "container"
}

function kindRank(kind) {
  return kind === "windows" ? 0 : kind === "macos" ? 1 : 2
}

function parseJsonArray(raw) {
  var text = String(raw || "").slice(0, MAX_INPUT).trim()
  if (!text) return []
  try {
    var data = JSON.parse(text)
    return Array.isArray(data) ? data : null
  } catch (e) {
    return null
  }
}

// podman ps Ports: [{host_port, container_port, protocol, range}]. A range
// entry (`-p 8000-8002:8000-8002`) is one object with range > 1; only its
// first port is listed, which is what docker's helper showed too.
function hostPortFor(ports, containerPort) {
  for (var i = 0; i < ports.length; i++)
    if (ports[i].container === containerPort) return ports[i].host
  return 0
}

function portsOf(list) {
  var out = []
  var seen = {}
  if (!Array.isArray(list)) return out
  for (var i = 0; i < list.length && out.length < 24; i++) {
    var p = list[i] || {}
    if (String(p.protocol || "tcp") !== "tcp") continue
    var host = parseInt(p.host_port, 10) || 0
    var container = parseInt(p.container_port, 10) || 0
    if (host <= 0 || host > 65535 || seen[host]) continue
    seen[host] = true
    out.push({ host: host, container: container, proto: "tcp" })
  }
  return out
}

// `podman ps -a --format json` -> rows, VMs first then by name, so the
// keyboard cursor does not jump between refreshes. Returns null when the
// input is not a JSON array: a broken listing must read as an error, not as
// "No containers". Pod infra containers are podman plumbing and are skipped.
function parseList(raw, nameFilter) {
  var data = parseJsonArray(raw)
  if (data === null) return null
  var filter = String(nameFilter || "")
  var rows = []
  for (var i = 0; i < data.length && rows.length < MAX_ROWS; i++) {
    var c = data[i]
    if (!c || typeof c !== "object" || c.IsInfra) continue
    var name = clip(Array.isArray(c.Names) ? c.Names[0] : c.Names)
    var image = clip(c.Image)
    var state = clip(c.State)
    if (!name || !state) continue
    if (filter && name.indexOf(filter) === -1) continue
    var status = clip(c.Status)
    var kind = kindFor(image)
    var ports = portsOf(c.Ports)
    var rdpPort = hostPortFor(ports, 3389)
    var labels = c.Labels && typeof c.Labels === "object" ? c.Labels : {}
    rows.push({
      name: name,
      image: image,
      state: state,
      status: status,
      kind: kind,
      rdpPort: rdpPort,
      webPort: hostPortFor(ports, 8006),
      project: clip(labels["com.docker.compose.project"] || c.PodName || ""),
      // podman puts the healthcheck verdict in the status string only.
      health: healthOf(status),
      restarts: parseInt(c.Restarts, 10) || 0,
      ports: ports,
      running: state === "running",
      active: stateRules(state).active,
      // A published RDP port is the honest VM signal; the image name a hint.
      isVm: kind === "windows" || kind === "macos" || rdpPort > 0
    })
  }
  rows.sort(function (a, b) {
    var k = kindRank(a.kind) - kindRank(b.kind)
    return k !== 0 ? k : (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  })
  return rows
}

// docker already reports the healthcheck verdict inside its status string —
// "Up 3 minutes (healthy)". The panel was printing that text and throwing the
// meaning away, so an unhealthy container looked exactly like a sound one.
function healthOf(status) {
  var text = String(status || "")
  if (text.indexOf("(unhealthy)") !== -1) return "unhealthy"
  if (text.indexOf("(health: starting)") !== -1) return "starting"
  if (text.indexOf("(healthy)") !== -1) return "healthy"
  return ""
}

// A row the user should look at: failing its healthcheck, stuck in a restart
// loop, or dead. Drives both the row colour and the bar's urgent state.
function needsAttention(row) {
  if (!row) return false
  if (row.state === "restarting" || row.state === "dead") return true
  // Health only means something while the container is up. docker keeps
  // reporting the last verdict after a stop, and painting a deliberately
  // stopped container red because its final probe failed is noise, not news.
  return row.active && row.health === "unhealthy"
}

// Green means "running and sound", not merely "the process exists".
function isWell(row) {
  return !!row && row.state === "running" && row.health !== "unhealthy"
}

// CPU and memory from `podman stats --no-stream --format json`, keyed by
// container name. Only running containers appear.
function parseStats(raw) {
  var byName = {}
  var data = parseJsonArray(raw) || []
  for (var i = 0; i < data.length && i < MAX_ROWS; i++) {
    var s = data[i]
    if (!s || typeof s !== "object" || !s.name) continue
    // "671.7kB / 66.65GB" -> the used half is the only interesting one here.
    var used = clip(s.mem_usage).split("/")[0].trim()
    byName[clip(s.name)] = { cpu: clip(s.cpu_percent), mem: used, memPerc: clip(s.mem_percent) }
  }
  return byName
}

function filterRows(rows, vmsOnly) {
  if (!vmsOnly) return rows
  return rows.filter(function (r) { return r.isVm })
}

function rowIcon(row) {
  if (!row) return GLYPH.podman
  if (row.kind === "windows") return GLYPH.windows
  if (row.kind === "macos") return GLYPH.macos
  return GLYPH.podman
}

// The actions a row offers, in the order they are drawn. This list is also
// what the keyboard cursor walks with left/right, so the two can never drift
// apart the way a hand-mirrored key handler would.
//
// A VM's session button is offered whenever the container has an RDP port
// bound, running or not: starting the VM is part of connecting to it, exactly
// as `omarchy-windows-vm launch -k` does.
function rowActions(row) {
  if (!row) return []
  var rules = stateRules(row.state)
  var actions = []

  // Offered on the port, not on the image name: whatever publishes 3389 can
  // be connected to, and nothing else can.
  if (row.rdpPort > 0)
    actions.push({ id: "connect", icon: GLYPH.connect, tooltip: "Open desktop session (RDP) — 127.0.0.1:" + row.rdpPort, urgent: false })
  if (row.webPort > 0)
    actions.push({ id: "viewer", icon: GLYPH.viewer, tooltip: "Open web viewer — 127.0.0.1:" + row.webPort, urgent: false })

  if (rules.stopRestart) {
    actions.push({ id: "restart", icon: GLYPH.restart, tooltip: "Restart", urgent: false })
    actions.push({ id: "stop", icon: GLYPH.stop, tooltip: "Stop", urgent: true })
  }
  if (rules.start)
    actions.push({ id: "start", icon: GLYPH.start, tooltip: "Start", urgent: false })
  // Removal follows docker's own rule — a running, paused or restarting
  // container cannot be removed — so no click here can destroy a container
  // that is still doing something.
  if (rules.remove)
    actions.push({ id: "remove", icon: GLYPH.remove, tooltip: "Remove container…", urgent: true })

  return actions
}

// The right-click menu: everything that does not earn a permanent button.
// Each entry carries its own argument, so the panel dispatches without
// re-deriving anything — the menu and the command cannot disagree.
function rowMenuActions(row) {
  if (!row) return []
  var rules = stateRules(row.state)
  var items = []

  items.push({ id: "logs", icon: GLYPH.logs, label: "View logs" })
  // Offered on VMs too. There the shell lands in the container that runs
  // QEMU, not inside the guest — which is exactly where you look when a VM
  // will not boot, so the label says which side you are getting rather than
  // hiding the entry.
  if (rules.shell)
    items.push({
      id: "shell",
      icon: GLYPH.shell,
      label: row.isVm ? "Open a shell (container)" : "Open a shell"
    })

  if (rules.pause) items.push({ id: "pause", icon: GLYPH.pause, label: "Pause" })
  if (rules.unpause) items.push({ id: "unpause", icon: GLYPH.play, label: "Resume" })
  if (rules.kill) items.push({ id: "kill", icon: GLYPH.kill, label: "Kill now", urgent: true })

  // One entry per published port — but only while something is listening on
  // them. A published port survives a stop, so offering to open it on a
  // stopped container handed the user a browser tab pointing at nothing.
  // "Copy port" stays available either way: that is configuration, not a
  // live endpoint.
  //
  // The test is "running", not "active": a paused container still holds its
  // port bound while its processes are frozen, so the tab would hang on a
  // socket nobody is going to answer. This matches the helper, which refuses
  // anything but a running container.
  var reachable = row.state === "running"
  for (var i = 0; reachable && i < row.ports.length && i < 6; i++) {
    var p = row.ports[i]
    if (p.host === row.rdpPort) continue
    items.push({ id: "open", icon: GLYPH.web, label: "Open 127.0.0.1:" + p.host, arg: String(p.host) })
  }

  items.push({ id: "copyName", icon: GLYPH.copy, label: "Copy name", arg: row.name })
  if (row.ports.length > 0)
    items.push({ id: "copyPort", icon: GLYPH.copy, label: "Copy port " + row.ports[0].host, arg: String(row.ports[0].host) })

  return items
}

function clampIndex(index, length) {
  if (length <= 0) return 0
  return Math.max(0, Math.min(length - 1, index))
}

function busyLabel(action) {
  if (action === "start") return "Starting…"
  if (action === "stop") return "Stopping…"
  if (action === "restart") return "Restarting…"
  if (action === "remove") return "Removing…"
  if (action === "connect") return "Connecting…"
  if (action === "viewer") return "Opening viewer…"
  return "Working…"
}

// docker's own status string is already the best description of a running
// container ("Up 13 minutes"); only the empty and created cases need help.
function statusText(row) {
  if (!row) return ""
  if (row.status) return row.status
  if (row.state === "created") return "Created"
  return row.state
}

function countBy(rows, predicate) {
  var n = 0
  for (var i = 0; i < rows.length; i++) if (predicate(rows[i])) n++
  return n
}

function activeCount(rows) {
  return countBy(rows, function (r) { return r.active })
}

function attentionCount(rows) {
  return countBy(rows, needsAttention)
}

// The bar's number. A restart loop counts as active: telling the user "0
// running" while a container thrashes was the opposite of informative.
function runningCount(rows) {
  return activeCount(rows)
}

// The second line under a container's name: how it is behaving, not what it
// is. The image is the longest field and the least urgent, so it moved to the
// menu header where there is room to read it without eliding.
function detailLine(row, stat) {
  if (!row) return ""
  var parts = []
  if (row.active && row.health && row.health !== "healthy") parts.push(row.health)
  if (stat && stat.cpu) parts.push("cpu " + stat.cpu)
  if (stat && stat.mem) parts.push(stat.mem)
  if (row.project) parts.push(row.project)
  if (row.restarts > 0) parts.push(row.restarts + (row.restarts === 1 ? " restart" : " restarts"))
  if (row.ports.length === 1) parts.push("port " + row.ports[0].host)
  else if (row.ports.length > 1) parts.push(row.ports.length + " ports")
  return parts.join(" · ")
}

function summary(rows) {
  if (rows.length === 0) return "No containers"
  var parts = []
  var running = countBy(rows, function (r) { return r.state === "running" })
  var restarting = countBy(rows, function (r) { return r.state === "restarting" })
  var paused = countBy(rows, function (r) { return r.state === "paused" })
  var stopped = rows.length - running - restarting - paused
  if (running > 0) parts.push(running + " running")
  if (restarting > 0) parts.push(restarting + " restarting")
  if (paused > 0) parts.push(paused + " paused")
  if (stopped > 0) parts.push(stopped + " stopped")
  return parts.join(" · ")
}

// The helper speaks in short codes so the panel owns the wording.
function errorText(code) {
  switch (String(code || "").trim()) {
    case "": return ""
    case "podman-missing": return "Podman is not installed"
    case "podman-failed": return "podman did not answer"
    case "bad-port": return "Not a valid port"
    case "no-terminal-launcher": return "omarchy-launch-terminal is not available"
    case "pause-failed": return "Could not pause the container"
    case "unpause-failed": return "Could not resume the container"
    case "kill-failed": return "Could not kill the container"
    case "list-unreadable": return "Could not read podman's container list"
    case "no-container": return "No container given"
    case "no-such-container": return "Container no longer exists"
    case "no-rdp-port": return "No RDP port published"
    case "no-web-port": return "No web viewer port published"
    case "container-not-running": return "Start the container first"
    case "xfreerdp3-missing": return "xfreerdp3 is not installed"
    case "rdp-timeout": return "The VM did not answer on RDP"
    case "start-failed": return "Could not start the container"
    case "stop-failed": return "Could not stop the container"
    case "restart-failed": return "Could not restart the container"
    case "remove-failed": return "Could not remove the container"
    case "container-running": return "Stop the container before removing it"
    case "list-too-large": return "podman's container list is too large to show"
    default:
      var text = String(code).trim()
      // The helper forwards docker's own first line for anything it cannot
      // name, plus `not-removable:<state>` for a state docker will not let go.
      if (text.indexOf("not-removable:") === 0) {
        var state = text.slice("not-removable:".length)
        if (state === "paused") return "Unpause the container before removing it"
        if (state === "restarting") return "The container is restarting — stop it first"
        if (state === "running") return "Stop the container before removing it"
        return "Podman will not remove a container in state \"" + state + "\""
      }
      return text
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    MAX_INPUT: MAX_INPUT,
    MAX_ROWS: MAX_ROWS,
    MAX_FIELD: MAX_FIELD,
    MAX_DIAG: MAX_DIAG,
    clip: clip,
    clipDiag: clipDiag,
    stateRules: stateRules,
    healthOf: healthOf,
    needsAttention: needsAttention,
    isWell: isWell,
    attentionCount: attentionCount,
    activeCount: activeCount,
    GLYPH: GLYPH,
    parseList: parseList,
    parseStats: parseStats,
    kindFor: kindFor,
    rowMenuActions: rowMenuActions,
    detailLine: detailLine,
    filterRows: filterRows,
    rowIcon: rowIcon,
    rowActions: rowActions,
    clampIndex: clampIndex,
    busyLabel: busyLabel,
    statusText: statusText,
    summary: summary,
    runningCount: runningCount,
    errorText: errorText
  }
}
