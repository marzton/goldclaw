# ADR-0001 — System Taxonomy for Gold Shore Cortex

- Status: Accepted (canon phase — GSC-0001)
- Date: 2026-09-03
- Task: GSC-0001, `marzton/goldclaw#58`

## Context

The Gold Shore ecosystem has accumulated overlapping names and concepts
(Cortex, TANGENT, CLAW, Goldclaw, GearSwipe, Bridgekeeper, Risk Radar, SFNY,
Fortune Fund) with no single document establishing what each one is
responsible for. Without an explicit taxonomy, agents and humans will keep
picking inconsistent meanings, and future implementation work will
re-derive (and likely contradict) boundaries that should be decided once.

## Decision

Establish four top-level system roles, each with one owner concept, and
keep historical/legacy projects as explicitly lineage-tracked rather than
merging them into current systems.

### Cortex is the persistent state / continuity layer

Cortex (GSC) owns: tasks, decisions, dependencies, artifacts, approvals,
resource registry, agent registry, environment ledger, event history, and
handoff records. It is the thing that must survive an agent, model, or
runtime being swapped out. It does not do routing or execution itself.

Why: the founding problem (`FOUNDATIONS.md`) is fragmented handoff state,
not a lack of a smart router or a lack of execution capacity. A state layer
that nothing else depends on for correctness is the minimum viable fix.

### TANGENT is the routing / telemetry fabric

TANGENT owns: agent/task routing, capability resolution (matching a task to
a runtime that can do it), execution scheduling, event flow, and
telemetry. It reads and writes Cortex state but is not itself the source of
truth — if TANGENT's process dies, the state in Cortex is still correct.

Why: routing/scheduling logic changes far more often than canonical state
does (new agents, new capabilities, new scheduling heuristics). Coupling it
to the state layer would force every routing experiment to risk state
integrity.

### CLAW is the local/device executor

CLAW is not a service — it is the class of thing a local or device node
becomes when it exposes shell/filesystem/git/`gh`/Wrangler/agent-CLI/browser
access to TANGENT for execution. `goldclaw` (this repo) is CLAW's
predecessor/historical lineage: the place where "an agent with a shell
does ops work across repos" was first done in an ad hoc way, before CLAW
existed as a defined role.

Why: execution needs to happen somewhere with real device/filesystem
access, and that "somewhere" varies (a laptop today, a server tomorrow).
Treating it as a role rather than a single service means new nodes can join
without a rewrite.

### Bridgekeeper remains a GearSwipe-scoped interpretation layer, not the router

Bridgekeeper's job — turning an object into provenance, evidence, identity,
historical and modern relationships, editorial, community, commerce,
archive, rediscovery — is specific to GearSwipe's domain problem
(authenticating and contextualizing physical objects). It is not a
general-purpose agent/task router, even though both "connect things."
Collapsing Bridgekeeper into TANGENT would either bloat TANGENT with
domain-specific GearSwipe logic, or dilute Bridgekeeper into something too
generic to do its actual job well.

### Historical projects (SFNY, Fortune Fund, legacy Gold Shore repos) keep stable identifiers and explicit lineage instead of being silently merged

SFNY influenced GearSwipe; it did not become GearSwipe. Fortune Fund is a
possible precursor to Risk Radar and Gold Shore signal work; it is not
asserted as a hard successor chain absent evidence. Legacy Gold Shore repos
(`goldshore-ops`, `goldshore-web`, `goldshore-api`, etc.) are marked
`LEGACY`/`SUPERSEDED` with an explicit `successor` field rather than
deleted from the record, per `REGISTRY.yaml`.

Why: collapsing lineage destroys the ability to answer "why does this
current thing look the way it does" and "what did we already try and
reject." That history is cheap to keep and expensive to reconstruct later.

## Consequences

- Any future Cortex/TANGENT/CLAW implementation should keep these three
  concerns (state / routing / local execution) in separable components,
  even if co-deployed initially, per the "keep Cortex consolidated until
  actual service boundaries require independent lifecycle" guidance in the
  bootstrap doctrine.
- `LEXICON.md`'s disambiguation rules (`GS` ≠ GearSwipe, Bridgekeeper ≠
  TANGENT, CLAW ≠ `goldclaw`) are downstream of this decision and should be
  kept in sync with it.
- `REGISTRY.yaml` entries for historical ventures use `influences`/
  `influenced_by` and `predecessor`/`successor` fields rather than
  collapsing entries together.

## Alternatives considered

- **Single "Cortex" service doing state + routing + execution.** Rejected:
  couples fast-changing routing logic to the durability guarantee that
  matters most (state), and conflates "am I forgotten" with "am I broken."
- **Treat Bridgekeeper as the general router since it already does
  cross-referencing.** Rejected: it is tuned for GearSwipe's object/
  provenance domain model, not for arbitrary agent/task capability
  matching; forcing it to generalize would weaken both jobs.
- **Merge legacy Gold Shore repos' history into their successors
  immediately.** Rejected: bootstrap doctrine explicitly requires
  `LEGACY`/`SUPERSEDED`/`ARCHIVED`/`HISTORICAL` to remain distinguishable
  states, not a single "old" bucket.
