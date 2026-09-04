# DRIVE_MIRROR.md — Mirroring goldclaw outputs into the GS Cortex Drive workspace

## Purpose

`marzton/goldclaw` (this repo, via GitHub) remains the technical source of
truth: code review, git history, CI, and the canon files
(`FOUNDATIONS.md`, `CANON.md`, `LEXICON.md`, `REGISTRY.yaml`) all live
here. The GS Cortex Google Drive workspace — a folder tree the user
already maintains at `G:\My Drive\GS Cortex\` locally — is a
**human-facing, cross-surface mirror**, not a second source of truth. This
extends `FOUNDATIONS.md`'s STORAGE MODEL principle ("federate canonical
content: code in GitHub, documents/media in natural providers") into an
actual, repeatable procedure so any agent (Claude, Codex, Gemini) can
follow it without re-deriving the convention.

**Path note:** an agent runtime with only Google Drive API access (no
local filesystem access to the user's machine) writes to the same
underlying Drive folder via the `Google_Drive` MCP connector (or
equivalent). That syncs down to `G:\My Drive\GS Cortex\` automatically
once the user's Drive desktop client picks it up — functionally
equivalent, mechanically different. Don't assume literal local filesystem
access to that path exists in every runtime.

## Folder tree (as of 2026-09-03)

```
GS Cortex/                              (1YWSbdqTjLyaogr4QmGnFydHJsRHYusie)
├── Agent Bootstrap/                    (1t4m88cxljNEGb3PoAS1uCWyixe1P5HvU)
│   ├── Canonical Docs/                 (1t4w-_z3C9bqne_TpTF1SO1w_BUoDkuge)
│   ├── Prompts/                        (1kqFDREBNS3Xq81s82Tznbvq-V1hPgCxo)
│   │   └── Prompts by Agent/           (1bzVeNLAirMRdE9JwlAs_7kosWBwY0NJk)
│   ├── Imports/                        (1L07MU5yhj1ZcMEVyZwNYvXbAei8rs5lP)
│   └── Skills & Plugins/               (1Et4OkIHGVhZTqT64K_aGTWJu1sHjJqM2)
├── Architecture/                       (1-IxWtB880xX7lI2FIqYETjluaIqwypce)
├── Property Inventory/                 (1mYvrKrmgFAMPj_QURU4g17K71CuE6RAN)
│   └── Provider Evidence/              (1PNCb7BlZ7cjvs2TTaJvTWAc5_V8jIpvD)
├── Handoffs/                           (1iuiFMpqdur6Q1C2VM4zesmHT79M6q-5c)
│   └── Current/                        (1JJnRS40gOF1ZRCTRZ22Xsv5Y5ubneCk8)
├── Artifacts/                          (1-xZZoplm3ppnuH6eicYFVPmFWr9aN0bI)
│   └── Accepted/                       (12Z8npyuQvooUWPeCl0MVlML015SRFE8L)
└── Decisions/                          (1c1ZWC9qwhMQ_f7UAp--kDYbi2uKzfJuU)
```

Folder IDs are recorded here because Drive titles are not unique or
stable search keys — always confirm an ID with `search_files`/
`get_file_metadata` before writing, rather than assuming this table is
still accurate. If a folder listed here has moved or been renamed, that's
drift to record, not silently work around.

## Category → folder mapping

| Kind of output | Drive home |
|---|---|
| Tasks / handoff records | `Handoffs/` (use the `Current/` subfolder for in-flight work) |
| Agent capability manifests, role notes | `Agent Bootstrap/` |
| Skills, plugins, MCP servers worth remembering across sessions | `Agent Bootstrap/Skills & Plugins/` |
| Artifacts (`ART-GSC-UI-####` and similar) | `Artifacts/` — accepted versions go in `Artifacts/Accepted/` |
| Visual assets (rendered mockups, screenshots) belonging to an artifact | Same folder as that artifact, not a separate silo |
| Decisions (ADRs) | `Decisions/` |
| Locations / surfaces / properties / provider evidence | `Property Inventory/` (`Provider Evidence/` for raw audit output) |
| Architecture-level docs | `Architecture/` |

There is no generic "Files" catch-all folder — route to whichever
category above actually fits. A junk-drawer folder defeats the point of
having a taxonomy.

## What triggers a mirror-write

Mirror to Drive when this repo:

- Registers or updates an artifact under `docs/artifacts/*.md`
- Adds or updates an ADR under `docs/DECISIONS/*.md`
- Writes a meaningful handoff record (the `docs/HANDOFF.md` yaml block)
- Confirms a runtime capability, skill, or MCP server worth remembering
  across sessions (an update to `docs/CAPABILITIES.md`)
- Produces a rendered visual artifact (a published design URL, a mockup)

Routine `docs/open-work.md` status-line edits stay GitHub-only — the bar
is "durable, would-want-to-find-this-from-my-phone," not every commit.

## Format per item

For each mirrored item, in its mapped folder, create **both**:

1. **A native Google Doc** — title matches the item's title (e.g. "ADR-0002
   — goldclaw Cloudflare Worker naming and setting review"). Body is a
   short human-readable summary (what it is, status/decision, key
   findings) plus explicit links: the canonical GitHub file URL and, where
   one exists, a live Artifact URL or PR URL. Not a full copy of the
   markdown — a pointer with enough context to stand alone.
2. **A raw `.md` file** with the same content as the GitHub source,
   uploaded alongside the Doc (`disableConversionToGoogleType: true`) —
   the portable, agent-readable copy another runtime (Codex, Gemini) can
   ingest directly, matching the pattern already established under
   `Agent Bootstrap/Imports/`.

## Known limitation: this is not a substitute for a real Cortex state layer

While mirroring this session's outputs, two problems surfaced that a real
Cortex state layer (GSC-0003/GSC-0004) is meant to prevent, but that this
folder-based mirror only caught by accident:

1. Two independent Claude Code sessions each registered the same
   `ART-GSC-UI-0002` artifact from the same source mockup, in separate PRs
   (`#67` and `#68`), with no way to know about each other until one of
   them happened to read this Drive folder and noticed the other's
   evidence trail.
2. A parallel investigation's findings (recorded in `Property Inventory/
   Provider Evidence/`) directly disputed a claim made in `ADR-0002`,
   discovered the same way.

This folder tree is a useful stopgap and a genuinely better mirror than
nothing, but treat these as concrete evidence for why GSC-0004's
cross-agent continuation proof matters — a shared Drive folder that
agents *might* stumble into is not the same as a state layer they
*reliably* consult before acting.
