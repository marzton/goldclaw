# Canonical `gs-api` integration contract

This contract keeps Cortex and the canonical `goldshore-ai/apps/gs-api`
Worker on one explicit interface. It does not provision Cloudflare resources
or deploy either Worker.

## Bindings and routes

The `gs-api` preview and production environments must declare:

```toml
[[services]]
binding = "GEARSWIPE"
service = "gearswipe"

[[workflows.bindings]]
name = "GEARSWIPE_WORKFLOW"
class_name = "GearSwipeWorkflow"
```

The workflow is exposed by `gs-api` at `/workflows/gearswipe/*` and the
GearSwipe service at `/integrations/gearswipe/*`. Cortex reaches the existing
MCP and admin surfaces through its `GS_API` service binding:

- `GET /api/gs-api/mcp/*` and `GET /api/gs-api/admin/*` are read-throughs.
- `POST /api/gs-api/workflows/gearswipe` starts the owned workflow.
- Mutating requests on those paths require `X-Cortex-Approval` matching the
  `CORTEX_APPROVAL_TOKEN` secret. Missing configuration fails closed.

The binding is environment-local: Cortex preview targets `gs-api` preview and
production targets `gs-api` production. The external `gs-api` manifest remains
the owner of `GEARSWIPE` and `GEARSWIPE_WORKFLOW`; Cortex must not bind those
resources directly.
