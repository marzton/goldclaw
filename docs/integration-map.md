# Goldshore Ecosystem Integration Map

> Verified against live Cloudflare state on **2026-07-08** (Gold Shore Labs account
> `f77de112d2019e5456a3198a8bb50bd2`) and against the wrangler configs of all 21
> repos in the `marzton` ecosystem. This is the single document that ties every
> subsystem together — Web, Gateway, Signals, Ops, Org, AI, API, MCP, Admin,
> Socials, Dash/Dashboard, Trading, Pages, Workers, Wrangler, agents (Codex,
> Claude, Gemini), OpenClaw, devices (HP laptop, LaCie, Termux), email, OAuth
> service accounts, tokens, configs, and bindings — and shows how information is
> shared across the `goldshore.ai` and `goldshore.org` environments.
>
> Companion docs: `cf-infrastructure.md` (raw CF resource tables),
> `secrets-map.md` (secret names by repo), `repo-index.md` (repo map),
> `open-work.md` (in-flight work).

---

## 1. Accounts, zones, and identity

| Item | Value |
|------|-------|
| Cloudflare account (primary) | Gold Shore Labs — `f77de112d2019e5456a3198a8bb50bd2` |
| Cloudflare account (personal) | Marstonr6@gmail.com's Account — `d86cd71f0d1c8b8e08928a32e0c95ae3` |
| CF Access team domain (primary) | `goldshore.cloudflareaccess.com` |
| CF Access team domain (legacy, still referenced) | `rmarston.cloudflareaccess.com` — used by `goldshore-org` Worker prod env in `marzton/goldshore` |
| Zones | `goldshore.ai`, `goldshore.org`, `armsway.com`, `banproof.me`, `rmarston.com`, `partnersinpools.com` |
| Owner email | `marstonr6@gmail.com` |

**CF Access application audiences (AUD tags) found in configs** (public values,
paired with a policy — not secrets):

| Audience tag | Where configured | Protects |
|--------------|------------------|----------|
| `8b6e1890f664c52ad265a240948a1f3315a757e19b4a0fa180ffe952b81a0daf` | `gs-web`, `gs-admin` (goldshore-ai) | goldshore.ai app/admin surfaces |
| `d303765cb1746f11a0fe37affad2d191deb18771a1d98beb29cb9c52b6cd731b` | `gs-api` (goldshore-ai) | api.goldshore.ai |
| `18f2fecc663c66d5de8fd7b6c08def28b0496216669af44abf51ac221b6b40e5` | `banproof-core` (banproof-me/gateway) | admin/api.banproof.me |
| `3d5916af31a595ca00d8b1ab0157361a953779d939d9df2f63b1802b87a0248e` | `goldshore-org` Worker (marzton/goldshore) | goldshore.org (rmarston team domain) |

Machine-to-machine auth through CF Access uses the shared Service Token pair
`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` (see `secrets-map.md`).

---

## 2. Subsystem-by-subsystem map

### Web (goldshore.ai + goldshore.org front end)

- **Canonical repo**: `marzton/goldshore-ai` → `apps/gs-web` (Astro, Worker + Assets).
- **Worker**: `gs-web-app` routes `goldshore.ai/*` **and** `goldshore.org/*` — the
  same build serves both product domains. `gs-web-prod` and `gs-web-preview`
  also exist live (deploy channels).
- **www redirects**: `gs-www-redirect-prod` (`www.goldshore.ai/*`, `www.goldshore.org/*`)
  plus legacy `gs-www-redirect-production`.
- **Shared state**: KV `GOLDSHORE-AI` (`5f13…`), D1 `gs_platform_db`, R2 `gs-assets`
  (`gs-assets-preview` in preview), KV `gs-web-app-session` for sessions.
- **Email out**: MailChannels sender `hello@goldshore.ai`; contact notifications
  → `marstonr6@gmail.com`.
- `marzton/goldshore-web` is **deprecated** (Pages stub only).

### Gateway

- **Canonical repo**: `marzton/goldshore-gateway` (root repo doubles as admin
  dashboard; `goldshore-gateway/` subdir is the Worker). Deploys Worker
  **`gs-platform`** — the platform front door.
- **Routes**: `gw.goldshore.ai/*`, `gateway.goldshore.ai/*` (ops/agent/api hostnames
  handled by gateway routing logic / dedicated workers).
- **Service bindings**: `AGENT` → `gs-api`, `SECURITY_CHECK` → `banproof-me`,
  `SIGNALS` → `gs-signals-prod`. Validates CF Access JWTs on `/api/*` then proxies
  internally (zero public hop).
- **Storage**: KV `GATEWAY_KV` (`1784…`, audit log), KV `GOLDSHORE-AI` (`5f13…`),
  D1 `goldshore` (`2b7c…` — ⚠ not present in live account, see §6), AI binding,
  `version_metadata`.
- The monorepo stub `goldshore-ai/apps/gs-gateway` exists only to satisfy
  workspace validation — **do not deploy it**. Live worker `gs-gateway-prod`
  also exists in the account.

### Signals

- **Worker**: `gs-signals-prod` (market signals pipeline).
- **Data**: D1 `gs_signals_db` (`76af…`), KV `gs-signals-cache` / `gs-signals-cache-preview`.
- **Consumers**: bound as `SIGNALS` service in the gateway; `gs-api` binds the
  `signals-evaluator` Workflow (`SignalsEvaluator`, script `gs-signals-prod`);
  `banproof-me` (monorepo config) reads `gs_signals_db` for ban context;
  `gs-core-worker` reads `gs_signals_db`.

### Ops / Control plane

- **Worker**: `gs-control` (monorepo `apps/gs-control`) → `ops.goldshore.ai/*`.
- **Storage**: KV `GS_CONFIG` (`68f5…`) + `GS_CONFIG_PREVIEW` (`dddc…`),
  KV `GS_CONTROL_LOGS` (`a52e…`) + preview, R2 `gs-control-state`.
- **Service bindings**: `API` → `gs-api`, `GATEWAY` → `gs-gateway`.
- gs-admin and banproof-me bind `GS_CONTROL` for CF API proxying (workers, DNS,
  Pages, KV) — the operator plane for the whole account.
- `marzton/goldshore-ops` repo is an **archive candidate** (KV to-do template,
  points at a KV id not in the live account).

### Org (goldshore.org arm)

- **Domain serving today**: `gs-web-app` owns `goldshore.org/*` (marketing mirror);
  `gs-www-redirect-prod` owns `www.goldshore.org/*`.
- **`marzton/goldshore`** — data-intelligence/research/trading repo; contains the
  `goldshore-org` router Worker (GPT proxy, Pages-backed assets at
  `goldshore-org.pages.dev`, Analytics Engine dataset `goldshore-org-events`)
  and `critique-worker` (PSI reports via Postmark, queue `critique-queue`,
  R2 `goldshore-reports`). Its prod env still uses the `rmarston`
  CF Access team domain and `goldshore-api` service bindings.
- **`marzton/goldshore-org`** — Remix Worker currently a placeholder redirect to
  goldshore.ai; binds D1 `gs_platform_db`; future KV `GOLDSHORE-ORG` (`a59a…`).
- **Trading dashboard**: `goldshore.org/dash` → `gs-trading-prod` (see Trading).
- ⚠ Route ownership of `goldshore.org/*` is claimed by both `gs-web` (monorepo)
  and the `goldshore-org` Worker (marzton/goldshore) — see §6.

### AI (agents, models, Workers AI)

- **Workers**: `gs-agent` / `gs-agent-prod` (agent runtime; KV `GS_AGENT_KV`
  `25a1…`, Secrets Store `b982…`, consumes queue `goldshore-jobs`),
  `goldshore-ai` (legacy stub, neutralized — no routes).
- **Workers AI binding** (`AI`): declared in `gs-api`, `gs-platform` (gateway),
  and `banproof-core`.
- **AI cache**: KV `GS_AI_CACHE` (`a028…`).
- **Models in use**: Gemini, OpenAI GPT-4/4o, Anthropic Claude via AI Gateway;
  worker vars reference `gpt-4o` / `gpt-4o-mini` defaults.
- **Agent conventions**: Claude Code is primary for `goldshore-ai` + `goldclaw`;
  Codex reviews PRs; Gemini (Antigravity) handles local IDE sessions on the
  HP laptop. Hand-offs are logged in `docs/open-work.md`.

### API

- **Canonical**: `goldshore-ai/apps/gs-api` → Worker `gs-api`, routes
  `api.goldshore.ai/*` **and** `api.goldshore.org/*` — the one API serves both
  domains (this is the primary cross-domain information-sharing point).
- **Bindings (prod)**: KV `GS_API_KV` (`e0b8…`) + `GS_CONTROL_LOGS`; R2 `gs-assets`
  + `gs-telemetry-storage`; D1 `gs_platform_db`, `gs_audit_db`, `gs_signals_db`,
  `gs_jobs_db`; AI; Durable Object `AUTH_SESSION`; services → `gs-agent`,
  `gs-mail`, `gs-web-prod`, `goldshore-ai`; queue producers `goldshore-jobs`,
  `gs-events`, `gs-mail-jobs`, `gs-mail-dead-letter`; Workflow `signals-evaluator`;
  Secrets Store `b982…`.
- **Hosts the GoldClaw operator API** (`/goldclaw/*` routes incl. Google OAuth).
- Standalone `marzton/goldshore-api` is a rename-target/parity candidate slated
  for archive; it points at resources not in the live account (§6).

### MCP

- **Worker**: `gs-mcp` → `mcp.goldshore.ai`, CF Access **Service Token only**
  (agents authenticate with `CF-Access-Client-Id/Secret` headers).
- **Repo-side MCP config**: `goldshore-ai/.mcp.json` registers the **Supabase MCP
  server** (project `fywysjzqktlgrqkjusfp`, http transport) for agent sessions;
  `.vscode/mcp.json` mirrors it for IDE use.
- Claude Code remote sessions additionally get the Cloudflare Developer
  Platform MCP scoped to both CF accounts.

### Admin

- **Live surface**: `admin.goldshore.ai` — CF Pages project `gs-admin`
  (monorepo `apps/gs-admin`): KV `GOLDSHORE-ADMIN` (`d02c…`) + `KV_SESSIONS`
  (`d0b8…`), D1 platform+audit, R2 `gs-assets`, services → `gs-trading-prod`,
  `gs-control`, `gs-api`.
- **Standalone `marzton/goldshore-admin`** Worker also declares route
  `admin.goldshore.ai/*` (⚠ conflict, see §6) and binds service → `goldshore-api`.
- **`admin.goldshore.org`** is documented against `gs-core-worker-prod` in the
  Access table (`cf-infrastructure.md`).
- The `goldshore-gateway` repo root is itself an admin dashboard app
  (React Router 7 + Hono).

### Socials (GoldClaw operator surface)

- **Rule**: no satellite workers for Google/Meta/X/email/social tasks — all social
  and marketing integration routes through `gs-api` (`apps/gs-api/src/routes/goldclaw.ts`)
  with UI at `goldshore.ai/admin/goldclaw` (`apps/gs-web`).
- **Providers wired**: Google (OAuth + Ads + Analytics), Meta (app, Business
  Manager, pixel, Instagram business account), X (OAuth + ads), sandbox compute
  (`GOLDCLAW_SANDBOX_*`).
- **Safety model**: draft-first; reads allowed, mutations require human approval;
  OAuth tokens stored in KV only after AES-GCM encryption with
  `OAUTH_TOKEN_ENCRYPTION_KEY`.
- Full var/secret table: `goldshore-ai/docs/GOLDCLAW_INTEGRATIONS.md`.

### Dash / Dashboard

- `goldshore.ai/app/` — platform dashboard (Pages/`gs-web-app`, Access-protected).
- `dashboard.goldshore.ai` — reserved custom domain (auto-provisioned DNS, per
  monorepo gateway notes).
- `goldshore.org/dash` — trading dashboard served by `gs-trading-prod`.
- The `goldshore-gateway` repo root deploys the Goldshore admin dashboard
  (React Router 7 + Hono 4 + React 19 + Tailwind 4).

### Trading

- **Worker**: `gs-trading` / `gs-trading-prod` → `trading.goldshore.ai/*` and
  `goldshore.org/dash`.
- **State**: KV `GS_TRADING_KV` (`9b33…`, holds agent state, OAuth tokens,
  signals, feature flags) + preview KV; D1 `goldshore-paper-trading` (`af94…`).
- **Broker OAuth**: Schwab/ThinkorSwim (`SCHWAB_CLIENT_ID/SECRET/ACCOUNT_HASH/REFRESH_TOKEN`,
  redirect `https://trading.goldshore.ai/oauth/schwab/callback`), Robinhood
  (`ROBINHOOD_TOKEN/ACCOUNT_ID`); Fidelity/TOS integrations live in `marzton/goldshore`.
- Notification hooks: `NOTIFY_EMAIL_WEBHOOK`, `NOTIFY_WEBHOOK_URL`, `NOTIFY_SMS_WEBHOOK`.

### Pages (Cloudflare Pages)

| Project | Domain | Source |
|---------|--------|--------|
| `gs-admin` | `admin.goldshore.ai` | `goldshore-ai/apps/gs-admin` |
| `gs-web` | referenced as `gs-web.pages.dev` (historical; domain now on Worker routes) | `goldshore-ai/apps/gs-web` |
| `goldshore-org` | `goldshore-org.pages.dev` (+preview/dev) — asset origin for the org router Worker | `marzton/goldshore` |
| `goldshore-api` (orphaned Pages project) | — | kept buildable by root `wrangler.toml` in `marzton/goldshore-api` |
| `gs-status` | `status.goldshore.ai` (reserved) | planned |

### Workers / Wrangler

Full worker inventory and storage tables: `cf-infrastructure.md` (live-verified
2026-07-08: **24 Workers, 28 KV namespaces, 6 D1 databases, 7 R2 buckets**).
Wrangler config source-of-truth by worker:

| Worker | Config file |
|--------|-------------|
| `gs-web-app`, `gs-api`, `gs-agent`, `gs-control`, `gs-mail`, `gs-platform` (svc-binding shell), `gs-trading(-prod)`, `gs-www-redirect(-prod)`, `gs-core-worker`, `banproof-me`, `armsway-com`, `gs-admin` (Pages) | `goldshore-ai/apps/<app>/wrangler.toml` |
| `gs-platform` (deployed gateway) | `goldshore-gateway/wrangler.jsonc` (+ legacy `goldshore-gateway/goldshore-gateway/wrangler.toml`) |
| `banproof-core` | `banproof-me/gateway/wrangler.toml` |
| `goldshore-org` router / `goldshore-critique` | `marzton/goldshore` `wrangler.toml` / `critique-worker/wrangler.toml` |
| `rmarston-com` | `rmarston-com/wrangler.toml`/`.jsonc` |
| `partners-in-pools` | `partners-in-pools/wrangler.json` |
| `gs-dynamic-worker` | `gs-dynamic-worker/wrangler.jsonc` (worker_loaders experiment) |

Wrangler 4.10x is standard. **Never run `npm install` on Termux/Android** in
`goldshore-gateway` — it corrupts `package-lock.json` (`@tailwindcss/oxide`
locks to `"os": ["android"]`, Linux CI fails `EBADPLATFORM`).

### Codex

- PR review agent — comments arrive as GitHub review events on `marzton/*` PRs.
- Budget/usage tracked via `CODEX_USAGE_USD` / `CODEX_BUDGET_USD` Actions
  secrets; `CODEX_JWT_HS256_KEY` for authenticated Codex calls.
- Planning artifacts: `goldshore-ai/codex_plan.md`,
  `goldshore-ai/docs/infra/CODEX_PHASE_4_EXECUTION.md`.
- Built `marzton/goldshore-core` (`banproof-me` Worker) together with Antigravity.

### OpenClaw

- Separate business line (WhatsApp + Stripe order management) — **not** the same
  thing as GoldClaw (the gs-api operator surface).
- Scaling plan lives here in goldclaw: `docs/openclawscaling-playbook.md`
  (Phase 1 LaCie portable hub / SQLite → Phase 2 HostGator / MySQL → Phase 3
  multi-region / PostgreSQL), with `docs/migration-quick-reference.md` and
  `docs/implementation-templates.md`.
- Phase-1 secrets live in `~/.env` on the LaCie device (Stripe keys, Google
  OAuth credentials, WhatsApp Business API token, JWT/session secrets) — never
  in git.

### SSH / devices (HP laptop, LaCie, Termux)

| Device | Role |
|--------|------|
| **HP laptop** | Gemini (Antigravity) local IDE sessions; local wrangler dev |
| **LaCie portable hub** | OpenClaw Phase-1 host (SQLite at `~/openclaw/data/openclaw.db`, secrets at `~/.env` mode 600, USB backup rotation) |
| **HostGator** (Phase 2) | SSH target `user@yourdomain.com` for OpenClaw migration; MySQL host |
| **Android / Termux** | ad-hoc sessions — ⚠ never `npm install` in repos with native optional deps (lockfile corruption) |
| **Claude Code remote containers** | ephemeral cloud sessions; GitHub via MCP; outbound HTTPS through agent proxy |

### Emails

- **Inbound routing**: Cloudflare Email Routing → `gs-mail` Worker (processes
  inbound events; secrets `MAIL_FORWARD_TO`, `BLOCKED_SENDERS`); `banproof-email-router`
  for banproof.me.
- **Queue-driven mail**: `gs-mail` consumes `gs-platform-checkout-events-{prod,preview,dev}`
  and `gs-platform-contact-events-*`; `gs-api` produces `gs-mail-jobs` +
  `gs-mail-dead-letter`.
- **send_email bindings**: `armsway-com` (→ `rob@armsway.com`), `rmarston-com`
  (→ `marstonr6@gmail.com` / `rob@rmarston.com`), `banproof-core`.
- **Senders**: MailChannels `hello@goldshore.ai` (gs-web), Postmark
  `reports@goldshore.org` (critique-worker: `POSTMARK_SERVER_TOKEN`, `POSTMARK_INBOUND_TOKEN`).
- **Admin address**: `admin@goldshore.org` (goldshore-org vars).

### OAuth / service accounts / tokens

| Integration | Identity | Where |
|-------------|----------|-------|
| Google OAuth (GoldClaw) | public client id `1054833139648-gt5o3k9uqhltt08nne0sigh8l3vodji7.apps.googleusercontent.com`; redirect `https://api.goldshore.ai/goldclaw/oauth/google/callback` | `gs-api` vars; secret `GOOGLE_OAUTH_CLIENT_SECRET` + `OAUTH_TOKEN_ENCRYPTION_KEY` |
| Google Ads | `GOOGLE_ADS_DEVELOPER_TOKEN` (rotated 2026-07-04) | `gs-api` secret + `goldshore-ai` Actions |
| GCP service account | `github-storage-access` — old key was exposed in chat; **revoke pending** (see open-work) | GCP IAM |
| Meta / Instagram | `META_APP_ID/SECRET`, `META_BUSINESS_ID`, `META_AD_ACCOUNT_ID`, `META_PIXEL_ID`, `INSTAGRAM_BUSINESS_ACCOUNT_ID` | `gs-api` |
| X | `X_CLIENT_ID/SECRET`, `X_AD_ACCOUNT_ID` | `gs-api` |
| Schwab / Robinhood | see Trading | `gs-trading` secrets + `GS_TRADING_KV` rotation |
| CF Access service token | `CF_ACCESS_CLIENT_ID/SECRET` — cross-repo m2m auth | every repo doing m2m calls |
| Cloudflare API tokens | `CLOUDFLARE_API_TOKEN` (general ops), `CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN` (zone-scoped deploy), `CLOUDFLARE_BUILD_API_TOKEN`, `CLOUDFLARE_API_TOKEN_GS_CONTROL`, `CLOUDFLARE_MOTHER_BUILD_TOKEN`, `CF_WORKERS_BUILDS` | Actions secrets (names inventoried in `secrets-map.md`) |
| GitHub | `GH_PAT` (repo+workflow), GitHub App (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`), `GITHUB_CLIENT_ID/SECRET`, `GITHUB_WEBHOOK_SECRET`, `GS_DISPATCH_TOKEN` | Actions secrets |
| Worker Secrets Store | store `b9824d3280c54573a24137c7e7143b33` bound as `SECRETS` in `gs-api` + `gs-agent` | Cloudflare Secrets Store |
| Notifications | `GOOGLE_CHAT_WEBHOOK` (CI), `MOBILE_WEBHOOK_URL`, `AGENT_WEBHOOK_URL` | Actions secrets |

---

## 3. Shared-resource matrix (who reads/writes what)

The information-sharing backbone: these resources are bound by multiple workers
across both domains, so data written by one subsystem is visible to the others.

| Shared resource | ID | Bound by |
|-----------------|----|----------|
| KV `GOLDSHORE-AI` (`5f13…`) — platform config / feature flags | `5f13370575784c9dacff522121104cb3` | gs-web, gs-platform (both variants), gateway, gs-mail, banproof-me, goldshore-admin, goldshore-api |
| KV `GS_CONFIG` (`68f5…`) — control-plane config | `68f52b467dc0413991b2195ef9081cae` | gs-control, goldshore-control-worker |
| D1 `gs_platform_db` | `9703574e-adb7-481e-8d98-96f8ce5f8a90` | gs-api, gs-web, gs-platform, gs-admin, banproof-me, goldshore-admin, goldshore-org, goldshore-api |
| D1 `gs_audit_db` — audit/compliance spine | `1ae71d76-188f-481b-91d9-db2d39013f68` | gs-api, gs-admin, banproof-me, armsway-com, rmarston-com, goldshore-admin, goldshore-api |
| D1 `gs_signals_db` | `76af4653-7f44-417b-b46e-250143d906fd` | gs-api, gs-core-worker, banproof-me |
| D1 `gs_jobs_db` | `750c469c-788d-49e8-9254-77231cffd70f` | gs-api |
| R2 `gs-assets` | — | gs-api, gs-web, gs-admin, gs-platform, banproof-me, goldshore-admin, goldshore-api |
| R2 `gs-telemetry-storage` | — | gs-api, banproof-me, armsway-com |
| Queue `goldshore-jobs` | — | producers: gs-api, banproof-me, banproof-core; consumer: gs-agent |
| Queue `gs-events` | — | producer: gs-api / goldshore-api |
| Queues `gs-mail-jobs`, `gs-mail-dead-letter`, `gs-platform-{checkout,contact}-events-*` | — | gs-api / gateway → gs-mail |
| Secrets Store `b982…` | `b9824d3280c54573a24137c7e7143b33` | gs-api, gs-agent |
| Service `gs-api` | — | bound by gateway (`AGENT`), gs-admin, gs-control, banproof-me, goldshore-control-worker |
| Service `banproof-me` (SECURITY) | — | bound by gateway + gs-platform — ban-check on every request |
| Service `gs-signals-prod` (SIGNALS) | — | bound by gateway |

**Cross-domain flow in one paragraph**: a request to either domain hits
`gs-platform` (gateway) or a domain worker → ban-checked via `banproof-me` →
`/api/*` proxied over the `AGENT` service binding to `gs-api` (which serves
`api.goldshore.ai` **and** `api.goldshore.org`) → gs-api reads/writes the shared
D1 set (`gs_platform_db`/`gs_audit_db`/`gs_signals_db`/`gs_jobs_db`), KV, and R2,
enqueues async work to `goldshore-jobs` (consumed by `gs-agent`) and mail queues
(consumed by `gs-mail`), and invokes the `signals-evaluator` workflow on
`gs-signals-prod`. Trading (`gs-trading-prod`) and admin (`gs-admin` Pages)
attach to the same spine via service bindings, so `.ai` and `.org` share one
information infrastructure.

---

## 4. CI / GitHub Actions integration

- Deploys run from GitHub Actions with `CLOUDFLARE_*` tokens (see §2 tokens table;
  names-only inventory in `secrets-map.md`).
- Codex reviews PRs; Google Chat webhook notifies failures; Lighthouse, CodeQL,
  GitGuardian, lockfile guards run on `goldshore-ai`.
- Repo-to-repo dispatch uses `GS_DISPATCH_TOKEN`.
- Cross-repo agent branches: current integration branch is
  `claude/goldshore-infrastructure-integration-ywmxlt` (this PR set);
  previous cross-repo branch `claude/risk-radar-fra-epo-2wk5mk` (PRs #5492/#213/#1).

---

## 5. Repo → subsystem quick reference

| Repo | Subsystem(s) | Status |
|------|--------------|--------|
| `goldshore-ai` | Web, API, Agent/AI, Admin (Pages), Mail, Trading, Control/Ops, Socials (GoldClaw), monorepo CI | ✅ Primary |
| `goldshore-gateway` | Gateway (`gs-platform`) + admin dashboard app | ✅ Active (CF token renewal pending) |
| `goldshore` | Org router, critique worker, broker integrations, trading research | ✅ Active (.org arm) |
| `goldclaw` | This hub: docs, ops, OpenClaw playbooks | ✅ Active |
| `goldshore-core` | banproof-me security worker (migration → gs-api planned) | Active |
| `banproof-me` | banproof.me site + `banproof-core` gateway | Active |
| `goldshore-admin` | standalone admin worker | ⚠ route conflict with gs-admin Pages |
| `goldshore-api` | standalone API (parity check → archive) | Wind-down |
| `goldshore-org` | .org placeholder worker | TBD |
| `goldshore-ops`, `goldshore-web`, `goldshore-labs` | stubs/templates | Archive candidates |
| `gs-dynamic-worker` | worker_loaders experiment | Lab |
| `risk-radar` | docs only; live resources `risk-radar-db` D1, `risk-radar-raw` R2, `RR_CACHE` KV | Feature |
| `armsway-com`, `rmarston-com`, `partners-in-pools`, `sundown-golf`, `wayward-traveler`, `veritasmatch`, `nickburzo` | satellite sites (armsway + rmarston share the goldshore audit spine) | Satellite |

---

## 6. Known drift & config issues (found 2026-07-08)

Live account state vs. checked-in configs. Ordered by risk.

1. **`admin.goldshore.ai` claimed twice** — `gs-admin` Pages custom domain and the
   standalone `goldshore-admin` Worker route. Worker routes beat Pages domains;
   deploying goldshore-admin would shadow the Pages admin.
2. **`api.goldshore.org` / `goldshore.org/*` claimed by multiple configs** —
   `gs-api` (monorepo) vs. standalone `goldshore-api`; `gs-web` (monorepo) vs.
   `goldshore-org` router in `marzton/goldshore`. Pick one owner per host
   (route-ownership doc in `goldshore-ai/docs/ROUTE_OWNERSHIP.md`).
3. **Gateway D1 missing**: `goldshore-gateway` binds D1 `goldshore`
   (`2b7cb4cd-f9b3-4107-9f03-ae76e99f0c14`) — no such database in the live
   account (6 D1s exist; see `cf-infrastructure.md`). Deploy would fail or bind dead.
4. **Account ID pasted where a resource ID belongs**:
   `armsway-com/wrangler.jsonc` KV `CACHE_KV.id` and
   `banproof-me/gateway/wrangler.toml` R2 `STORAGE.bucket_name` are both set to
   `f77de112d2019e5456a3198a8bb50bd2` (the account id). Both invalid.
5. **`goldshore-api/wrangler.jsonc` has duplicate JSON keys** (`kv_namespaces`,
   `d1_databases`, `r2_buckets`, `queues`, `routes` each appear twice — JSON
   last-one-wins silently drops the first block), and references KV
   `578fc335…`, D1 `goldshore_db` (`33b71eca…`), R2 `goldshore-reports` — none
   present in the Gold Shore Labs account.
6. **`gs-api/wrangler.toml` defects**: D1 binding `DB` has placeholder id
   `gs_db_001`; service binding name `"GS_WEB PROD"` contains a space (invalid
   binding name); `[env.production.vars]` and `[env.preview]` blocks are
   duplicated verbatim.
7. **`GS_CONFIG` naming trap**: real `GS_CONFIG` KV is `68f52b46…`, but
   `banproof-me/wrangler.jsonc` and `gs-mail` bind the name `GS_CONFIG` to
   `5f1337…` (which is actually the `GOLDSHORE-AI` namespace). Reads/writes go
   to a different store than the name implies.
8. **Secrets Store id doubles as a KV id**: `b9824d32…` is bound as Secrets
   Store in `gs-api`/`gs-agent` and as KV `INFRA_SECRETS` in `banproof-core`.
   One of the two is wrong.
9. **Two Access team domains in production**: `goldshore.cloudflareaccess.com`
   everywhere except `goldshore-org` prod (`rmarston.cloudflareaccess.com`) —
   JWT validation will diverge across .org surfaces.
10. **Docs drift (fixed in this PR)**: live account has **24 Workers** (doc said
    23; `gs-web-prod` was undocumented) and **28 KV namespaces** (doc listed 20;
    missing: `GS_API_KV`, `GS_API_KV_PREVIEW`, `GS_CONFIG_PREVIEW`, `KV_SESSIONS`,
    `gs-web-app-session`, `banproof-waitlist`, `goldshore-production-GOLDSHORE_KV`,
    `gs-signals-cache`).
11. **Standing security actions** (from `open-work.md`): renew expired
    `CLOUDFLARE_API_TOKEN` in `goldshore-gateway`; revoke old GCP
    `github-storage-access` key (exposed in chat).
