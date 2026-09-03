# NAMING.md — Naming Conventions

## Human / company names

- Company: **Gold Shore**
- Acronyms in use: `GS`, `GSC`, `GSW`, `RR`, `BK`, `TNG`/`TANGENT`, `CLAW`,
  `SFNY`, `FF`, `PER`, `RM` — see `LEXICON.md` for meanings and
  disambiguation rules.

## Repositories

Lowercase kebab-case. Examples already in use: `goldshore-ai`, `goldclaw`,
`risk-radar`. A future Cortex repo, if and when created, would be
`goldshore-cortex` — **not created as part of GSC-0001.**

## Apps / services

Lowercase kebab-case, short prefix + role. Examples (existing or planned,
none of the `gsc-*`/`tng-*`/`claw-*` ones exist yet):

- `gs-web`, `gs-api` — existing, in `goldshore-ai`
- `gsc-web`, `gsc-api`, `gsc-mcp` — planned Cortex surfaces
- `tng-router` — planned TANGENT routing service
- `claw-gateway` — planned CLAW-facing gateway

## Cloudflare / runtime resources

Lowercase kebab-case, matching the app/service name plus environment
suffix where needed. Example: `gsc-core-preview` (D1 database, preview
environment, not yet created).

## SQL objects

`snake_case`. Examples: `task_runs`, `artifact_versions`.

## Bindings (Worker environment bindings)

`UPPER_SNAKE_CASE`. Examples: `CORTEX_DB`, `AUDIT_DB`, `ARTIFACTS_R2`,
`TASK_QUEUE`.

**Rule:** bindings keep the **same symbolic name across environments** —
the underlying resource changes per environment, the binding name does not.
Do not create `CORTEX_DB_PROD` / `CORTEX_DB_PREVIEW` unless a concrete
runtime constraint forces it (none is known today).

## Environments

`local`, `preview`, `staging`, `prod`.

- Production resources are generally **unsuffixed**.
- Preview resources may use a `-preview` suffix (e.g. `gsc-core-preview`).
- Per `docs/architecture-sop.md` Phase 0 (already executed for the current
  goldshore.ai stack), preview/staging Worker environment blocks were
  deliberately stripped in favor of prod-only deployment for that stack.
  Any future Cortex preview infrastructure (GSC-0004) should treat that
  precedent as the default and only add a preview environment where there
  is a concrete need — not by default.

## Task IDs

`<PREFIX>-####`, zero-padded to at least 4 digits, monotonically increasing
per prefix. Prefixes map to scope:

- `GSC-####` — Cortex program tasks (this issue is `GSC-0001`)
- `GSW-####` — GearSwipe
- `GS-####` — Gold Shore general
- `RR-####` — Risk Radar
- `BK-####` — Bridgekeeper
- `SFNY-####` — SoleFoodNY
- `PER-####` — Personal/Robert Marston scope

## Artifact IDs

`ART-<TASK-PREFIX>-####`, e.g. `ART-GSC-0021`. Versions append `-v<N>`:
`ART-GSC-0021-v1`, `-v2`, `-v3`. At most one version per artifact ID may
carry `status: accepted` at a time.

## Decision IDs

`DEC-<PREFIX>-####` or `ADR-####` for architecture decision records under
`docs/DECISIONS/`. Example in this repo: `docs/DECISIONS/ADR-0001-system-taxonomy.md`.

## Branches

This repo's existing convention (visible in git history) is
`<agent>/<slug>`, e.g. `claude/gsc-bootstrap-foundation-8uji3d`,
`codex/fix-mcp-oauth-worker`. Continue that pattern: agent name, then a
short descriptive slug, optionally with a random suffix for uniqueness.

## Environment identities

`ENV-<PREFIX>-<ENVIRONMENT>[-<NODE>]`, e.g.:

- `ENV-GSC-LOCAL-<NODE>` (a specific machine/CLAW node)
- `ENV-GSC-PREVIEW`
- `ENV-GSC-STAGING`
- `ENV-GSC-PROD`

## General principle

Names may evolve. Stable IDs (task IDs, artifact IDs, decision IDs,
`resource_id` in the future Universal Resource Registry) should not. When a
name changes, the stable ID it points to does not.
