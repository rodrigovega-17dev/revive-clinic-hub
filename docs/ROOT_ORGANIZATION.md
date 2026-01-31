# Root-Level File Organization

Recommendations for organizing first-level files: what **must stay at root** (tooling) and what can be **grouped into folders**. Update links (e.g. in README) if you move files.

**Status:** The doc and SQL moves below have been applied. `docs/` and `sql/` exist; links in README, deploy.sh, and scripts have been updated. `deploy.sh` was left at root as requested.

---

## 1. Must Stay at Root

These are required at project root by tools or convention. **Do not move.**

| File | Reason |
|------|--------|
| `package.json` | npm/yarn/pnpm expect it at root. |
| `package-lock.json` | Lockfile next to package.json. |
| `index.html` | Vite entry; default is project root. |
| `vite.config.ts` | Vite looks at root. |
| `tsconfig.json` | TypeScript root config; others extend it. |
| `tsconfig.app.json` | Referenced by main tsconfig. |
| `tsconfig.node.json` | Referenced by main tsconfig. |
| `tailwind.config.ts` | Tailwind/Tooling expect at root. |
| `postcss.config.js` | PostCSS/Tailwind. |
| `eslint.config.js` | ESLint. |
| `components.json` | shadcn/ui config. |
| `netlify.toml` | Netlify build/deploy config; must be at root. |
| `.env.example` | Convention at root for env template. |
| `.gitignore` | Git convention at root. |
| `README.md` | Convention: first thing people see; keep at root. |

---

## 2. Can Be Grouped — Proposed Folders

### 2.1 `docs/` — Documentation (except README) ✅ Done

These files are now in `docs/`:

| File | Location |
|------|----------|
| `PLATFORM_FEATURES_REPORT.md` | `docs/PLATFORM_FEATURES_REPORT.md` |
| `FEATURES_DOCS_COMPARISON.md` | `docs/FEATURES_DOCS_COMPARISON.md` |
| `GOOGLE_CALENDAR_SETUP.md` | `docs/GOOGLE_CALENDAR_SETUP.md` |
| `NETLIFY_DEPLOYMENT.md` | `docs/NETLIFY_DEPLOYMENT.md` |
| `STRIPE_SETUP.md` | `docs/STRIPE_SETUP.md` |

Links updated: README → `./docs/GOOGLE_CALENDAR_SETUP.md`; deploy.sh → `docs/NETLIFY_DEPLOYMENT.md`; PLATFORM_FEATURES_REPORT footer → `../README.md` and `NETLIFY_DEPLOYMENT.md`; FEATURES_DOCS_COMPARISON suggested links → `./docs/PLATFORM_FEATURES_REPORT.md` and `./PLATFORM_FEATURES_REPORT.md` where relevant.

---

### 2.2 `sql/` — Ad-hoc SQL at root ✅ Done

These files are now in `sql/`:

| File | Location |
|------|----------|
| `check_database_state.sql`, `current_schema_after_push.sql`, `current_schema.sql`, `debug_rls_issues.sql`, `final_schema.sql`, `fix_payments_table.sql`, `fix_rls_policies.sql`, `fix_signup_issue.sql`, `latest_schema.sql`, `mock_data.sql`, `schema_dump.sql`, `setup_stripe_prices.sql`, `update_stripe_prices.sql` | `sql/<filename>.sql` |

Scripts updated: `scripts/compare-schema.js` reads `sql/current_schema.sql`; `scripts/create-stripe-products.js` message references `sql/setup_stripe_prices.sql`. Supabase CLI still uses `supabase/migrations/` only.

---

### 2.3 `deploy.sh` — Scripts

**Left at root** as requested (not moved). It references `docs/NETLIFY_DEPLOYMENT.md` for instructions.

---

## 3. Stray / Cleanup ✅ Done

| Item | Action |
|------|--------|
| `vite.config.ts.timestamp-*.mjs` | Added to `.gitignore` as `vite.config.ts.timestamp-*.mjs`. Delete from repo if it was committed. |

---

## 4. What Stays at Root (Summary)

After moving docs and SQL (and optionally deploy):

**Root will still have:**

- **Tooling / config:** `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `components.json`, `netlify.toml`, `.env.example`, `.gitignore`
- **Main doc:** `README.md`
- **Optional:** `deploy.sh` if you keep it at root

**Directories (unchanged):**

- `src/` — app source
- `public/` — static assets
- `scripts/` — JS/shell scripts (and optionally `deploy.sh`)
- `netlify/` — Netlify functions
- `supabase/` — Supabase config and migrations
- `.kiro/` — specs
- **New:** `docs/` (if you move the .md files), `sql/` (if you move the .sql files)

---

## 5. Quick Reference

| Category | Action |
|----------|--------|
| **Keep at root** | package.json, package-lock.json, index.html, vite.config.ts, tsconfig*.json, tailwind.config.ts, postcss.config.js, eslint.config.js, components.json, netlify.toml, .env.example, .gitignore, README.md |
| **Move to `docs/`** | PLATFORM_FEATURES_REPORT.md, FEATURES_DOCS_COMPARISON.md, GOOGLE_CALENDAR_SETUP.md, NETLIFY_DEPLOYMENT.md, STRIPE_SETUP.md |
| **Move to `sql/`** | All root-level `.sql` files (check_database_state, current_schema*, debug_rls_issues, final_schema, fix_*, latest_schema, mock_data, schema_dump, setup_stripe_prices, update_stripe_prices) |
| **Move to `scripts/`** (optional) | deploy.sh |
| **Ignore/delete** | vite.config.ts.timestamp-*.mjs |
| **Update after moves** | Links in README.md, PLATFORM_FEATURES_REPORT.md, FEATURES_DOCS_COMPARISON.md; CI/docs that call deploy.sh |

If you want, the next step can be applying these moves and link updates in the repo.
