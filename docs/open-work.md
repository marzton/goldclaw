# Open Work Log

Running log of in-flight PRs, blockers, and pending actions across goldshore repos.
Update when status changes. Most-recent entries at the top of each section.

---

## In-flight PRs

| PR | Repo | Branch | Status | Notes |
|----|------|--------|--------|-------|
| #5492 | `goldshore-ai` | `claude/risk-radar-fra-epo-2wk5mk` | 🟢 Green / mergeable | All required checks passed at commit `87ff349`; review required before merge |
| #213 | `goldshore-gateway` | `claude/risk-radar-fra-epo-2wk5mk` | 🔴 Blocked | Cloudflare guards fail with 401/403; renew or rescope `CLOUDFLARE_API_TOKEN` in gateway secrets |
| #1 | `goldclaw` | `claude/risk-radar-fra-epo-2wk5mk` | 🟢 Green / ready | Cross-repo ops hub docs; awaiting review/merge |

---

## Pending user actions (cannot be done by Claude)

| Action | Where | Priority |
|--------|-------|----------|
| Renew `CLOUDFLARE_API_TOKEN` and add to `goldshore-gateway` secrets | https://github.com/marzton/goldshore-gateway/settings/secrets/actions | 🔴 High — unblocks PR #213 |
| Create `GOOGLE_CHAT_WEBHOOK` and add to `goldshore-ai` + `goldshore-gateway` secrets | GitHub Actions secrets in both repos | 🟡 Medium — enables failure notifications |
| Create `CLOUDFLARE_API_TOKEN` (new token) and add to `goldshore-ai` secrets | https://github.com/marzton/goldshore-ai/settings/secrets/actions | 🟡 Medium |
| Create `CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN` and add to `goldshore-ai` secrets | https://github.com/marzton/goldshore-ai/settings/secrets/actions | 🟡 Medium |
| Revoke old GCP `github-storage-access` service account key | https://console.cloud.google.com/iam-admin/serviceaccounts | 🔴 High — old key was exposed in chat |
| Verify `GOOGLE_CLIENT_ID` exists in `goldshore-ai` secrets | https://github.com/marzton/goldshore-ai/settings/secrets/actions | 🟡 Medium |
| `GOOGLE_ADS_DEVELOPER_TOKEN` rotated | `goldshore-ai` secrets | ✅ Done (2026-07-04) |

---

## Recently completed

| Date | Item |
|------|------|
| 2026-07-04 | PR #5492 reached all-green CI: Required Merge Checks, CodeQL, GitGuardian, Repo Health, lockfile guard |
| 2026-07-04 | Codex review fixes on PR #5492: removed token material, `git fetch` vs pull, CLAUDE.md app scope |
| 2026-07-04 | CodeQL permissions fix on `notify-chat.yml` (`permissions: {}` at workflow level) |
| 2026-07-04 | `docs/secrets-reference.md` pushed to `goldshore-ai` for browser-based secret updates |
| 2026-07-04 | `GOOGLE_ADS_DEVELOPER_TOKEN` rotated |
| 2026-07-04 | goldclaw established as cross-repo ops hub (absorbs planned `claude-codex` role) |
| ~2026-07-03 | PR #5483 merged — homepage nav links, access modal, hamburger nav, contact form fix |
