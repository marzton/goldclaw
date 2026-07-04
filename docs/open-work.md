# Open Work Log

Running log of in-flight PRs, blockers, and pending actions across goldshore repos.
Update when status changes. Most-recent entries at the top of each section.

---

## In-flight PRs

| PR | Repo | Branch | Status | Notes |
|----|------|--------|--------|-------|
| #5492 | `goldshore-ai` | `claude/risk-radar-fra-epo-2wk5mk` | 🟡 CI running | Codex review fixes pushed (commit `77ef040`); awaiting CI green |
| #213 | `goldshore-gateway` | — | 🔴 Blocked | `CLOUDFLARE_API_TOKEN` expired — renew token → add to gateway secrets |

---

## Pending user actions (cannot be done by Claude)

| Action | Where | Priority |
|--------|-------|----------|
| Renew `CLOUDFLARE_API_TOKEN` and add to `goldshore-gateway` secrets | https://github.com/marzton/goldshore-gateway/settings/secrets/actions | 🔴 High — unblocks PR #213 |
| Create `CLOUDFLARE_API_TOKEN` (new token) and add to `goldshore-ai` secrets | https://github.com/marzton/goldshore-ai/settings/secrets/actions | 🟡 Medium |
| Create `CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN` and add to `goldshore-ai` secrets | https://github.com/marzton/goldshore-ai/settings/secrets/actions | 🟡 Medium |
| Revoke old GCP `github-storage-access` service account key | https://console.cloud.google.com/iam-admin/serviceaccounts | 🔴 High — old key was exposed in chat |
| Verify `GOOGLE_CLIENT_ID` exists in `goldshore-ai` secrets | https://github.com/marzton/goldshore-ai/settings/secrets/actions | 🟡 Medium |
| `GOOGLE_ADS_DEVELOPER_TOKEN` rotated | `goldshore-ai` secrets | ✅ Done (2026-07-04) |

---

## Recently completed

| Date | Item |
|------|------|
| 2026-07-04 | Codex review fixes on PR #5492: removed token material, `git fetch` vs pull, CLAUDE.md app scope |
| 2026-07-04 | CodeQL permissions fix on `notify-chat.yml` (`permissions: {}` at workflow level) |
| 2026-07-04 | `docs/secrets-reference.md` pushed to `goldshore-ai` for browser-based secret updates |
| 2026-07-04 | `GOOGLE_ADS_DEVELOPER_TOKEN` rotated |
| 2026-07-04 | goldclaw established as cross-repo ops hub (absorbs planned `claude-codex` role) |
| ~2026-07-03 | PR #5483 merged — homepage nav links, access modal, hamburger nav, contact form fix |
