# Cross-repo production audit — 2026-09-06

## Verified

- GearSwipe clean dependency install completed from `package-lock.json`.
- GearSwipe `npm test` passes: production build and rendered HTML tests (2/2).
- Cloudflare lists `gs-api`, `gearswipe`, `goldclaw`, and `gearswipe-revisit-tracker`; no `gs-gateway`, `gs-platform`, `gs-mail`, `gs-core-worker`, or `gs-signals-prod` Workers.
- `goldshore-jobs`, `gs-events`, and `gs-mail-jobs` are consumed by `gs-api`.
- Email Routing rules and catch-all target `gs-api`.
- `gs-signals-evaluator` exists on `gs-api`.
- Gold Shore `gs-api` has Turnstile and hashed newsletter email-code flows.
- `gs-api` production dry-run packages all three workflow bindings (`GS_SIGNALS`,
  `EDITORIAL_PRODUCTION`, and `GEARSWIPE_WORKFLOW`), plus `GEARSWIPE`, AI Search,
  queues, email, and D1 bindings. This proves source/config parity, not live
  deployment parity.
- GearSwipe now renders its existing Turnstile widget on signup/subscribe forms,
  verifies tokens server-side, and its subscription endpoint proxies to
  `gs-api` for the canonical email-code flow when the `GS_API` binding is
  deployed. Changes are covered by open GearSwipe PR #139; no production
  deploy has been performed.
- GearSwipe full-source ESLint passes with 0 errors (6 existing warnings); the
  lint script now excludes generated Wrangler output.
- Live deployment history still predates these additions; production deploy is
  not authorized by the current canon.

## Open production items

1. Migrate or remove the live `banproof-me-prod` producer of `goldshore-jobs`.
2. Deploy and verify `editorial-production` and `gearswipe-workflow`; they are present in source/config but absent from live workflow inventory.
3. Verify Worker routes, service bindings, cron triggers, and workflow instances with live Cloudflare API output.
4. Verify `gs-platform`/`gs-gateway` traffic cutover from route/request evidence before archiving the legacy gateway repository.
5. Reconcile and delete legacy checkout/contact queues only after producer and consumer counts are zero.
6. Deploy the GearSwipe PR and configure/verify its `GS_API` binding; the local
   implementation is ready, but live behavior remains unchanged until deploy.
7. Fix `gs-api` newsletter persistence: `/newsletter/submissions` currently
   stores every submission with `brand='goldshore'`, including
   `source='gearswipe-subscribe'`; derive the brand from the validated source
   before enabling the GearSwipe canonical flow.
8. Review the live `gearswipe-revisit-tracker` Worker and determine whether it is canonical or an unretired satellite.
9. Run live OAuth, signup, subscription, invitation, and admin smoke tests using non-production test identities.
10. Update stale `goldshore-ai` integration docs after isolating its conflicted worktree; legacy names may remain only in historical/audit sections.
11. Dependency audit is clean after targeted `fast-uri` and `fflate` overrides;
    retain the audit result in PR #139.

## Safety gates

- No Cloudflare Worker, queue, route, workflow, email-routing, or repository deletion has been performed.
- The `goldshore-ai` worktree contains unrelated staged and conflicted changes; cleanup there must be isolated before editing or pushing.
- Turnstile secret/widget changes require the Turnstile setup flow and explicit destination/domain confirmation.
- The live `gearswipe` Worker is currently in the Gold Shore Labs account while
  a separate dedicated GearSwipe account has no matching Worker deployment;
  confirm the canonical account before adding an account pin or deploying.
