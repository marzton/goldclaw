# FOUNDATIONS.md — Why Gold Shore Cortex Exists

Read this first. It does not change. `CANON.md` changes as facts change;
this file explains why the whole effort exists.

## The problem

Work on the Gold Shore / GearSwipe ecosystem happens across many disconnected
surfaces: ChatGPT web/mobile, Codex app/CLI, Claude web/app, Claude Code,
Gemini, Gemini CLI, AI Studio, GitHub, Cloudflare, Google services, browsers,
a Windows laptop, a Linux workstation, Android/Termux, local files, cloud
files, and various APIs. Each surface has a different context window,
different connectors, different filesystem access, different authentication,
and a different model.

The failure pattern this produces:

```
progress 6 steps
    ↓
agent/context changes
    ↓
unclear local vs preview vs production state
    ↓
another agent reconstructs stale assumptions
    ↓
4 steps backwards
    ↓
duplicated work / drift / frustration
```

The core problem is not "multiple agents." It is **handoff state**: nothing
durable survives the switch from one agent/runtime to the next.

## The rule

> **AGENTS MAY FORGET. CORTEX MAY NOT.**

Gold Shore Cortex (GSC, "Cortex") is the persistent state and continuity
layer that makes agent handoff deterministic. It is not a smarter model. It
is a shared source of truth that any agent — regardless of vendor or
runtime — can read to resume work without the previous agent's conversation
transcript.

## Working principles

- **Agents are replaceable. State is not.**
- **Models may change. Stable IDs should not.**
- **Plugins differ by runtime. Capabilities must be discovered, not
  assumed.**
- **Conversation is useful context. It is not infrastructure truth.**
- **Historical projects retain lineage. They must not silently
  contaminate current canonical state.**
- **Preview autonomy should be broad. Production authority should be
  narrow.**
- **Design artifacts must be registered. Accepted versions must be
  explicit.**

## The human workflow this must support

Work here is often nonlinear and associative — a "toroidal" style:

```
idea → tangent → historical connection → research → prototype →
architecture → another project → implementation → evaluation →
return to original problem
```

This is not noise to be suppressed. Cortex must allow divergent exploration
while preserving the original objective, decisions made, branches of thought
considered and rejected, unfinished work, and the next action — so the
thread is never lost, no matter how many agents or sessions it passes
through.

## Every session

**LOOP**
- **L**ocate state
- **O**rient context
- **O**perate safely
- **P**ersist outcome

## Every consequential action

**Governed execution doctrine**
- **O**bserve
- **A**ssimilate
- **F**orecast
- **A**uthorize
- **A**ct
- **V**erify
- **A**ttribute
- **A**dapt / stop

## Read order for any agent arriving cold

1. `FOUNDATIONS.md` (this file) — why Cortex exists
2. `CANON.md` — what is true now
3. `LEXICON.md` — what names/terms mean
4. `REGISTRY.yaml` — machine-readable systems/resources/lineage
5. `AGENTS.md` — general agent behavior in this repo
6. the current task (GitHub issue / handoff doc)
7. `docs/HANDOFF.md` — how to resume or hand off work in progress

Model-specific adapters (`CLAUDE.md`, `CODEX.md`, `GEMINI.md`) are thin by
design. They point here instead of duplicating doctrine. If one of them ever
disagrees with this file or `CANON.md`, this file and `CANON.md` win.
