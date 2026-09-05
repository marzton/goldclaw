# GSC-0003A — Cortex Worker deployment boundary

Status: implementation branch; not deployed  
Last verified: 2026-09-05

## Intended split

The Cloudflare Worker is the web and visibility surface. It must not attempt to
spawn Codex, Claude Code, Git, or local processes. Those capabilities remain in
the local CLAW gateway (`cortex/server.mjs`) on an authorized device.

On `cortex.goldshore.ai` and `preview.cortex.goldshore.ai`, the Worker serves
the Cortex static assets and sanitized status/configuration APIs. Dispatch is
disabled and fails closed until a separately authenticated CLAW device gateway
is designed and registered. On other hostnames, the existing Goldclaw
OAuth/MCP front-door behavior remains unchanged.

## Source environments

| Environment | Worker | Hostname | Source command | Mutation policy |
| --- | --- | --- | --- | --- |
| Preview | `goldclaw-preview` | `preview.cortex.goldshore.ai` | `npm run cortex:worker:upload:preview` | Preview-scoped only; route/domain provisioning still requires explicit action |
| Production | `goldclaw` | `cortex.goldshore.ai` | `npm run cortex:worker:upload:production` | Upload only; production deployment/traffic change requires explicit approval |

Both source bundles are validated without deployment by
`npm run cortex:worker:check`. Wrangler is pinned to `4.125.0`, and the
compatibility date is pinned to `2026-08-27`, the newest date supported by the
verified local runtime.

## Provider state observed before implementation

- Cloudflare account: Gold Shore Labs (`f77de112d2019e5456a3198a8bb50bd2`)
- Zone: `goldshore.ai` (`80e5c7c62d36a73f7a0e31bb3cd9223a`)
- Production custom domain: `cortex.goldshore.ai` attached to Worker `goldclaw`
- Production route: `*cortex.goldshore.ai/*` attached to Worker `goldclaw`
- Preview custom domain/DNS/route: absent
- Active production deployment: version 8,
  `6b49f7b4-121b-458b-91ca-a144c683d9a2`, deployed from the dashboard on
  2026-07-18
- Latest observed uploaded `main` version: version 84,
  `48ea681a-4d51-447d-9dc3-696cf3ef6fcf`; not receiving production traffic
- Live `https://cortex.goldshore.ai/`: 404 before this implementation
- Live `/health`: reported `gs-mcp`, proving the active deployment differs from
  current repository source
- Live `/mcp`: Worker error 1101

No provider resource was changed while collecting this evidence.

## Verification completed locally

- Local gateway configuration/run-list test passes.
- Worker routes Cortex hostnames to assets and cloud-safe APIs.
- Cortex cloud dispatch returns HTTP 503 with
  `ACTION_GATEWAY_UNAVAILABLE`.
- Non-Cortex hostnames retain the existing `goldclaw` OAuth/MCP behavior.
- Wrangler preview and production dry-runs both include the static assets and
  correct `CORTEX_ENVIRONMENT` value.
- Wrangler preview runtime smoke test returned:
  - `/` → 200 HTML
  - `/health` → 200 `gold-shore-cortex`, environment `preview`
  - `/api/config` → 200 cloud/read-only configuration
  - `POST /api/runs` → 503 fail-closed response

## Promotion gates

Before preview provisioning or upload:

1. Review the branch diff and CI result.
2. Reconcile competing Cortex documentation/artifact changes already merged
   from prior PRs.
3. Confirm the `goldclaw-preview` name and preview hostname against `NAMING.md`.
4. Define Cloudflare Access policy for the preview surface.
5. Confirm whether preview should use a custom domain, a version preview URL,
   or both.

Before production traffic changes:

1. Obtain explicit production deployment approval.
2. Capture the currently active deployment/version and rollback command.
3. Verify secrets/bindings by name and required scope without reading values.
4. Deploy a reviewed saved version; do not infer deployment from a successful
   version upload.
5. Validate root assets, health, OAuth/MCP compatibility, Access, and dispatch
   fail-closed behavior through the real hostname.

## Rollback

The pre-change production rollback target is deployment version
`6b49f7b4-121b-458b-91ca-a144c683d9a2`. Because that version currently
returns mismatched `gs-mcp` behavior and an MCP error, rollback restores the
known prior state—not a healthy Cortex service. Do not delete uploaded versions
or detach the production custom domain during rollout.
