# Prompt — 2026-11-16 · Vercel production outage diagnosis + fix

**Operator:** "why its not hosted on vercel" → "still not found" → "bhai kuch toh ek deploy karkade de".

## Symptoms

- `https://q-day-wallet.vercel.app` returned Vercel-edge `404 NOT_FOUND`
  ("The page could not be found", bom1:: request ids) from BOTH the operator's machine
  (Mumbai edge) AND a different egress network — while GitHub Pages kept serving 200.
- Operator had made ~6 production redeploys over 3 hours (all `● Ready`) — none restored
  the domain. 21 total Ready production deployments existed on `arudra/q-day-wallet`.

## Diagnosis chain (all read-only until the fix)

1. Deployment URLs served the real app (200, correct index + 668 kB JS bundle) while the
   bare domain 404'd → content was never the problem.
2. Other projects on the same team (`aruck.vercel.app`, `krypta-india.vercel.app`,
   `q-day-wallet-vercel.vercel.app`) served fine; vercel-status.com: All Systems
   Operational → not account-wide, not a platform incident.
3. `vercel project protection q-day-wallet` revealed
   `"ssoProtection": { "deploymentType": "all_except_custom_domains" }` — **SSO login
   protection was enabled on the project**, so even reachable URLs 302'd visitors to
   Vercel's login page (confirmed: 302 → `vercel.com/sso-api?...`; page title "Login -
   Vercel"). Project-level only — the twin project `q-day-wallet-vercel` and all other
   projects were public.
4. The bare domain additionally had a detached routing record: `vercel domains inspect
   q-day-wallet.vercel.app` → "You don't have access to the domain under arudra", while
   the control plane simultaneously answered `domain_already_assigned` — an inconsistent
   zombie record. `vercel alias set` reported success but the router kept 404ing.

## Fixes applied

1. `vercel project protection disable q-day-wallet --sso` → `"ssoProtection": false`.
2. One fresh production deploy of the committed v2 state
   (`npx vite build --base / --outDir dist-vercel` + `vercel deploy dist-vercel --prod
   --yes`) → `▲ Aliased https://q-day-wallet.vercel.app` → the bare domain's routing
   came alive with the fresh alias event.

## Verified outcome

- `q-day-wallet.vercel.app`, `q-day-wallet-arudra.vercel.app`,
  `q-day-wallet-vercel.vercel.app` — all 200 with the real app title, 3 consecutive
  probes stable, JS bundle 200 (668,756 bytes).
- `.gitignore` gained `app/dist-vercel/` (deploy output dir).

## Lessons recorded

- Redeploys do NOT fix dashboard-level gates: paused traffic / SSO protection /
  password protection are settings, not build state. Each failed "fix" deploy still
  built Ready — the gate stayed closed.
- Deployment inspection can show an alias as "assigned" while the edge router has no
  route for it; a fresh `--prod` deploy re-stamps the alias and restores routing.
- App must never enable SSO/password protection on this project again — the demo URL
  is judged by public visitors.

No app code changed in this session; the fix is infrastructure/settings only.
