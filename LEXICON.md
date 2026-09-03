# LEXICON.md — Terms, Acronyms, and Their Lifecycle

Every reserved identifier below has a lifecycle state:

`CANONICAL` — actively used with this meaning, no ambiguity permitted
`ALIAS` — an accepted alternate name for a canonical thing
`LEGACY` — was canonical, still may appear in old artifacts, do not use for new work
`DEPRECATED` — should be actively phased out
`RESERVED` — name is claimed for future use, not yet implemented
`EXPERIMENTAL` — in active exploration, meaning may still shift

Rule of thumb: **an acronym never silently means two different things.** If
a conflict is found, it is recorded here explicitly rather than picked
between quietly.

---

## Top-level identifiers

| Term | Meaning | Class | Lifecycle |
|---|---|---|---|
| **GS** | Gold Shore | organization/brand | CANONICAL |
| **GSC** | Gold Shore Cortex | platform (planned) | RESERVED |
| **CORTEX** | Continuity, Orchestration, Registry, Tasking, Execution, eXchange — the persistent state/continuity layer described in `FOUNDATIONS.md` | platform (planned) | RESERVED |
| **TNG / TANGENT** | Task & Agent Network for Governed Execution, Navigation & Telemetry — agent/task routing, capability resolution, execution scheduling, event flow, telemetry, continuation selection | platform (planned) | RESERVED |
| **CLAW** | Cortex Local Action Worker — a local/device execution node (laptop, workstation, Android/Termux, future server/NAS/VM) that exposes shell, filesystem, git, `gh`, Wrangler, agent CLIs, browser, device telemetry | executor concept | RESERVED |
| **GSW** | GearSwipe | product/platform | CANONICAL |
| **BK** | Bridgekeeper — GearSwipe's historical-to-modern interpretation/discovery layer (object → provenance → evidence → identity → historical context → modern relationships → editorial → community → commerce → archive → rediscovery). **Not** the general Cortex router. | product feature (GearSwipe) | CANONICAL (scope-limited) |
| **RR** | Risk Radar | product/experiment | ACTIVE (per repo-index; not independently re-audited this pass) |
| **SFNY** | SoleFoodNY / SoleFood NY — historical resale/editorial venture; intellectual predecessor to parts of GearSwipe | historical venture | HISTORICAL |
| **FF** | Fortune Fund — legacy AI/financial-signal/risk experiment; possible precursor to Gold Shore financial/signal work and Risk Radar | historical experiment | HISTORICAL |
| **PER** | Personal / Robert Marston scope | scope | CANONICAL |
| **RM** | Robert Marston identity surface (e.g. `rmarston.com`) — belongs to `PER`, not Gold Shore | identity | CANONICAL |

## Explicit disambiguation rules

- **`GS` never means GearSwipe.** GearSwipe's acronym is `GSW`.
- **`GSC` never means GearSwipe** either, despite the shared first letters.
  `GSC` is exclusively Gold Shore Cortex.
- **Bridgekeeper (`BK`) is not TANGENT.** Bridgekeeper is a GearSwipe-scoped
  interpretation/discovery layer; TANGENT is the ecosystem-wide routing
  fabric. They do not overlap in scope even though both involve
  "connecting things."
- **CLAW (the acronym/concept) is not `goldclaw` (the repo).** `goldclaw`
  is the historical/predecessor lineage — the repo that CLAW as a concept
  grew out of — not a synonym for it. See `docs/DECISIONS/ADR-0001-system-taxonomy.md`.
- **Cortex is not a model.** It is the state/continuity layer that any
  model or agent reads and writes. Do not use "Cortex" to refer to a
  specific LLM.

## Repositories referenced in this canon

| Name | Meaning | Lifecycle |
|---|---|---|
| `marzton/goldclaw` | Temporary pre-Cortex coordination repo; historical/predecessor lineage for CLAW | ACTIVE (temporary role) |
| `marzton/goldshore-ai` | Canonical `goldshore.ai` production monorepo (`gs-web` + `gs-api`) | CANONICAL |
| `marzton/goldshore` | Canonical `goldshore.org` domain repo | CANONICAL |
| `marzton/gearswipe.com` | Canonical GearSwipe repo | CANONICAL (per issue constraint; `verify`) |
| `marzton/risk-radar` | Risk Radar repo | `verify` (not independently audited this pass) |
| `marzton/rmarston-com` | Personal site repo for `rmarston.com` | `verify` |
| `marzton/Marston-Portfolio` | Personal portfolio repo | `verify` |
| `marzton/goldshore-gateway` | Legacy gateway Worker (`gs-platform`); routing consolidated into `gs-api` | LEGACY, migration in progress |
| `marzton/goldshore-core` | Legacy `banproof-me` Worker; migration target is `gs-api` | LEGACY, migration in progress |
| `marzton/goldshore-admin` | Legacy standalone admin (`admin.goldshore.org`); superseded by `gs-web`/`gs-api` admin routes | LEGACY, not yet archived |
| `marzton/goldshore-api` | Legacy standalone API duplicate | SUPERSEDED, archive candidate |
| `marzton/goldshore-ops` | Legacy KV template stub, never built | SUPERSEDED, archive candidate |
| `marzton/goldshore-web` | Legacy deprecated Pages project | SUPERSEDED, archive candidate |
| `marzton/goldshore-org` | `.org` site repo, status unclear | `verify` |

## Domains referenced in this canon

| Domain | Associated with | Lifecycle |
|---|---|---|
| `goldshore.ai` | Gold Shore commercial AI product | CANONICAL |
| `goldshore.org` | Gold Shore data intelligence / research / trading arm | CANONICAL |
| `gearswipe.com` | GearSwipe | CANONICAL |
| `tangentmachine.com` | Reserved candidate public identity for TANGENT. **Not repointed yet.** | RESERVED |
| `rmarston.com` | Robert Marston personal identity surface (`PER`/`RM` scope, not Gold Shore) | CANONICAL |
| `solefoodny.com` | SoleFoodNY | HISTORICAL |
| `fortune-fund.com` | Fortune Fund | HISTORICAL, `verify` (domain existence/ownership not confirmed this pass) |
| `armsway.com`, `banproof.me` | Referenced in `docs/cf-infrastructure.md` as live Cloudflare-hosted domains under the Gold Shore Labs CF account | `verify` scope/ownership relationship to Gold Shore vs. external client work |

## Lifecycle states used across this canon (for projects/resources, not just terms)

`ACTIVE | TRANSITIONING | INCUBATING | EXPERIMENTAL | DORMANT | LEGACY |
SUPERSEDED | ARCHIVED | HISTORICAL | RESERVED`

Definitions (do not use "archived" as a casual synonym for "old"):

- **LEGACY** — old, but possibly still useful or in use
- **SUPERSEDED** — a known successor already exists
- **ARCHIVED** — intentionally frozen (GitHub archive state or equivalent)
- **HISTORICAL** — preserved primarily for lineage/evidence, not for reuse
