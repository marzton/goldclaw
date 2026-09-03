# CAPABILITIES.md — Runtime Capability Manifest Format

"Claude has Cloudflare" or "GPT cannot access GitHub" are not useful
statements — capability is runtime-specific, not vendor-specific. This
document defines the manifest shape any agent session should be able to
fill in about itself, and records this session's own manifest as a worked
example.

A capability manifest reports **availability/auth state only — never
secret values.**

## Manifest schema

```yaml
runtime:
  type: <codex-cli | codex-app | claude-code-remote | claude-code-cli | ide | chatgpt-web | chatgpt-mobile | gemini-cli | ai-studio | unknown>
  host: <machine/session identity if known>
  filesystem: <available | unavailable | sandboxed>
  shell: <available | unavailable>
  git: <available | unavailable>
  github:
    connector: <available | unavailable | unknown>
    gh_cli: <authenticated | unauthenticated | unknown>
    scope: <list of repos/orgs in scope, if restricted>
  cloudflare:
    connector: <available | unavailable | unknown>
    wrangler: <authenticated | unauthenticated | unavailable>
    preview_write: <true | false | unknown>
    production_write: <true | false | unknown>
  google:
    drive: <available | unavailable | unknown>
    gmail: <available | unavailable | unknown>
    calendar: <available | unavailable | unknown>
  browser: <available | unavailable>
  skills: [<list of loaded/discoverable skills>]
  mcp_servers: [<list of connected MCP servers>]
  limitations: [<anything materially restricting this session>]
```

## Rules

- **Never assume a capability available to one runtime is available to
  another.** A capability available to "Claude" in one product surface
  (e.g. claude.ai web with a connector enabled) may not exist in "Claude
  Code" or vice versa. Always report per-session, not per-vendor.
- **If a named connector (e.g. `@Cloudflare`) doesn't exist in this
  runtime, check for the capability through another mechanism** before
  concluding it's unavailable: MCP server, CLI (`wrangler`, `gh`), SDK,
  filesystem, browser. Record which mechanism actually provides it.
- **Do not read credential values to inventory capabilities.** Presence/
  absence and auth state are enough.
- **Record gaps as gaps.** A manifest that says `unknown` for something not
  checked is more useful than one that omits the field.

## Worked example: this session (GSC-0001 bootstrap, 2026-09-03)

```yaml
runtime:
  type: claude-code-remote
  host: managed remote execution container (ephemeral; reclaimed after session)
  filesystem: available (repo checkout only, isolated container)
  shell: available (Bash tool)
  git: available
  github:
    connector: available (mcp__github__* tools)
    gh_cli: unavailable (explicitly not provided in this runtime; GitHub MCP tools used instead)
    scope: ["marzton/goldclaw"]   # widened via add_repo tool if needed; not exercised this pass
  cloudflare:
    connector: available (mcp__Cloudflare_Developer_Platform__*)
    wrangler: unknown (not invoked this pass; repo has wrangler.jsonc)
    preview_write: unknown
    production_write: not attempted (out of scope per issue #58 constraints)
  google:
    drive: available (mcp__Google_Drive__*)
    gmail: available (mcp__Gmail__*)
    calendar: available (mcp__Google_Calendar__*, limited to search_events)
  browser: not directly exercised this pass (no Playwright/browser tool call made)
  skills: ["session-start-hook", "design", "dataviz", "artifact-design", "code-review", "doc-coauthoring", "and other repo/user-scoped skills listed in this session's system reminder"]
  mcp_servers: ["github", "Cloudflare_Developer_Platform", "Google_Drive", "Gmail", "Google_Calendar", "Claude_Code_Remote", "Adobe_for_creativity", "Ahrefs", "Atlassian_Rovo", "Base44", "Canva", "Clerk", "Descript", "Eraser", "Figma", "HubSpot", "Hugging_Face", "HyperFrames_by_HeyGen", "Jam", "Lovable", "Microsoft_365", "Miro", "Netlify", "Notion", "Postman", "QuickNode", "Sanity", "Sentry", "Slack", "Splice", "Supabase", "Swagger", "Trimble_SketchUp", "Twilio", "Vercel", "Wix", "Zapier"]
  limitations:
    - "GitHub tool access explicitly scoped to marzton/goldclaw for this session; other repos referenced in this canon (goldshore-ai, gearswipe.com, risk-radar, rmarston-com, Marston-Portfolio) were NOT independently re-audited — see CANON.md verification scope."
    - "No production write actions attempted or authorized, per issue #58 constraints."
    - "Container is ephemeral; nothing persists beyond what is committed/pushed."
```

This is one data point, not a permanent fact about "Claude Code." A
different session, container, or connector configuration will produce a
different manifest — always regenerate rather than reuse across sessions.

## Follow-on: GSC-0002

A fuller capability inventory across ChatGPT (web/mobile), Codex (app/CLI),
Claude (web/app), Claude Code, Gemini, Gemini CLI, AI Studio, local PCs, and
Android/Termux is explicitly deferred to **GSC-0002** (see
`docs/open-work.md` for the drafted task definition). This document defines
the shape; GSC-0002 fills it in per runtime.
