# Prompt — 2026-11-18 · Twin project stale-bundle fix (q-day-wallet-vercel)

**Operator report:** "you didnt change the theme of the website just shifted the
website" — after the v3 ship (commit `8e33a3c`) the operator still saw the old theme.

## Diagnosis (read-only chain)

1. e2e screenshots of the DEPLOYED bundle (`check-v3.mjs` against the local dist of
   commit `8e33a3c`) showed the v3 theme fully rendered — serif hero, 5-stage rail,
   amber offline plate. The v3 bundle was live; the complaint had to come from a
   different surface.
2. Bundle-level probe of every public URL:
   - `q-day-wallet.vercel.app` → v3 (691,855 B; contains "Harvest now, decrypt later",
     "Materialized.", "Nothing was broadcast.")
   - `q-day-wallet-arudra.vercel.app` → v3
   - `aruck-commits.github.io/qday-wallet/` → v3
   - **`q-day-wallet-vercel.vercel.app` → old v2 (332,693 B)** ← the twin project
3. `vercel ls q-day-wallet-vercel`: every Git auto-deploy for the twin had been
   **Error for ~11 days** (its project settings build from the repo root, where
   `vite build` exits 127), so the twin served an 11-day-old v2 snapshot. The
   operator was almost certainly viewing the twin (or a cached page of it).

## Fix

Static uploads to the twin ALSO trigger its broken build (upload → `vite build` →
exit 127), so a plain `vercel deploy dist --prod` fails there. Land the build
output instead of the source:

1. Copy `app/dist-vercel` (root-path build of commit `8e33a3c`) to
   `app/q-day-wallet-vercel/`, delete any stray `.vercel/` inside the copy.
2. Restructure to the Build Output API format the CLI accepts with `--prebuilt`:
   move all files into `.vercel/output/static/` and write
   `.vercel/output/config.json` = `{"version":3}`.
3. `vercel deploy q-day-wallet-vercel --prod --yes --prebuilt --project q-day-wallet-vercel`
   → READY, aliased to `q-day-wallet-vercel.vercel.app`, and **no build step ran**.

## Verified outcome

- Twin bundle = 691,855 B with all three v3 copy markers (True / True / True).
- Live headless-Chrome screenshots (`shot-live.mjs`): main URL and twin both render
  the v3 home (serif hero present, old v2 markers absent).
- `app/q-day-wallet-vercel/` temp copy deleted; both deploy-temp dir names
  gitignored.

## Lessons recorded

- A project whose build command is broken at the repo root serves its LAST GOOD
  deployment indefinitely — a working URL is not proof the latest code is there.
  Probe bundle bytes + copy markers, not HTTP status codes, when comparing
  deployments.
- `vercel deploy --prebuilt` with a hand-made `.vercel/output/static/` bypasses a
  project's broken build command entirely (the escape hatch when project settings
  cannot be edited from the CLI).
- `--project <NAME_OR_ID>` on `deploy` beats the directory-basename auto-match.

No app code changed in this session; the fix is deployment/state only.
