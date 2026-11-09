// Body of test/podman-model-test.sh.

import { createRequire } from "node:module"
const M = createRequire(import.meta.url)(process.env.MODEL_PATH)

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

// Trimmed from `podman ps -a --format json` (podman 6.1.4, 2026-11-09). The
// field names and shapes are podman's, including Names as an array, Ports as
// objects with snake_case keys, Labels as null when there are none.
const PS = [
  {
    Image: "docker.io/library/alpine:latest", IsInfra: false, Labels: null,
    Names: ["fleet-test"], PodName: "",
    Ports: [{ host_ip: "", container_port: 80, host_port: 18080, range: 1, protocol: "tcp" }],
    Restarts: 0, State: "running", Status: "Up 3 seconds"
  },
  {
    Image: "docker.io/tailscale/tailscale:latest", IsInfra: false,
    Labels: { "com.docker.compose.project": "funnel" },
    Names: ["serve-admin"], PodName: "", Ports: null,
    Restarts: 2, State: "running", Status: "Up 4 days (unhealthy)"
  },
  {
    Image: "ghcr.io/dockur/windows:latest", IsInfra: false, Labels: null,
    Names: ["win11"], PodName: "",
    Ports: [
      { host_ip: "", container_port: 8006, host_port: 8006, range: 1, protocol: "tcp" },
      { host_ip: "", container_port: 3389, host_port: 3389, range: 1, protocol: "tcp" },
      { host_ip: "", container_port: 3389, host_port: 3389, range: 1, protocol: "udp" }
    ],
    Restarts: 0, State: "exited", Status: "Exited (0) 2 hours ago"
  },
  {
    Image: "localhost/podman-pause:6.1.4", IsInfra: true, Labels: null,
    Names: ["abcd-infra"], PodName: "mypod", Ports: null,
    Restarts: 0, State: "running", Status: "Up 1 hour"
  },
  {
    Image: "docker.io/library/postgres:17", IsInfra: false, Labels: null,
    Names: ["db"], PodName: "mypod", Ports: null,
    Restarts: 0, State: "paused", Status: "Paused"
  }
]

const rows = M.parseList(JSON.stringify(PS))

is("infra container is skipped", rows.length, 4)
isDeep("VMs sort first, then by name", rows.map(r => r.name), ["win11", "db", "fleet-test", "serve-admin"])

const win = rows[0]
is("windows kind from image", win.kind, "windows")
is("rdp port from Ports", win.rdpPort, 3389)
is("web port from Ports", win.webPort, 8006)
is("udp duplicate of a tcp port is dropped", win.ports.length, 2)
is("exited VM is a VM", win.isVm, true)
is("exited is not active", win.active, false)

const test = rows.find(r => r.name === "fleet-test")
isDeep("ports parse host and container", test.ports, [{ host: 18080, container: 80, proto: "tcp" }])
is("Labels null gives empty project", test.project, "")
is("running is active", test.active, true)
is("plain container is not a VM", test.isVm, false)

const admin = rows.find(r => r.name === "serve-admin")
is("compose project from labels", admin.project, "funnel")
is("health from status string", admin.health, "unhealthy")
is("restarts read", admin.restarts, 2)
is("unhealthy running needs attention", M.needsAttention(admin), true)
is("Ports null gives no ports", admin.ports.length, 0)

const db = rows.find(r => r.name === "db")
is("pod name stands in for project", db.project, "mypod")
is("paused counts as active", db.active, true)
is("bar count covers running and paused", M.runningCount(rows), 3)

// Name filter is applied in the model now, not by the helper.
isDeep("name filter", M.parseList(JSON.stringify(PS), "serve").map(r => r.name), ["serve-admin"])

// Error shapes: empty output is "no containers"; anything else unparseable
// must come back as null so the panel shows an error instead of an empty list.
isDeep("empty output is no rows", M.parseList(""), [])
isDeep("podman's empty array is no rows", M.parseList("[]\n"), [])
is("truncated JSON is null", M.parseList(JSON.stringify(PS).slice(0, 200)), null)
is("non-array JSON is null", M.parseList("{}"), null)
is("row without a name is dropped", M.parseList(JSON.stringify([{ State: "running" }])).length, 0)

// podman-only states offer the right actions.
is("stopped can start", M.stateRules("stopped").start, true)
is("stopped can be removed", M.stateRules("stopped").remove, true)
is("configured can start", M.stateRules("configured").start, true)
is("stopping is active", M.stateRules("stopping").active, true)
is("unknown state offers nothing", M.stateRules("weird").start, false)

const menu = M.rowMenuActions(test).map(i => i.id)
is("no folder entry after the port", menu.indexOf("folder"), -1)
is("open entry for the published port", menu.indexOf("open") !== -1, true)

// Trimmed from `podman stats --no-stream --format json`.
const STATS = [{
  id: "263861427a3e", name: "fleet-test", cpu_percent: "0.06%",
  mem_usage: "671.7kB / 66.65GB", mem_percent: "0.00%"
}]
isDeep("stats keyed by name, used half of mem",
  M.parseStats(JSON.stringify(STATS)),
  { "fleet-test": { cpu: "0.06%", mem: "671.7kB", memPerc: "0.00%" } })
isDeep("bad stats JSON is empty", M.parseStats("not json"), {})
is("detail line shows stats", M.detailLine(test, M.parseStats(JSON.stringify(STATS))["fleet-test"]),
  "cpu 0.06% · 671.7kB · port 18080")

console.log(`1..${tests}`)
if (failures > 0) {
  console.log(`# ${failures} of ${tests} failed`)
  process.exit(1)
}
