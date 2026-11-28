# v1359 — Gap closure for v1353, v1354, v1355 and v1356 — Audit and implementation plan

**Covers:** `projectplan/v1353_project_billing_and_revenue_plan.md`,
`projectplan/v1354_resource_levelling_and_portfolio_optimisation_plan.md`,
`projectplan/v1355_quantitative_risk_analysis_plan.md`, `projectplan/v1356_public_api_and_scim_plan.md`.
**No new PRD:** every gap below is inside the scope the owner already approved in the v1353–v1356 PRDs; this plan
only finishes and corrects that work. **Status:** COMPLETE 2026-11-28 — all slices done, all SQL run, owner browser checks passed; v1353–v1356 closed.

## 1. How the audit was done

Each plan's ticked items were checked against the code, not the plan's own review text:
- the plan's files (SQL, engines, screens, routes, handlers, guides) and their commit state;
- the repository checks CI runs: `generate-planner-table-allowlist.mjs --check`, `check-field-help.mjs`,
  `find-unreachable-app-files.mjs --fail` (Platform, Simulator, Planner), `check-native-date-inputs.mjs`,
  `check-background-jobs.mjs`;
- the plan's tests (`packages/planning`: engine, billing, levelling, QRA — 81 passed, 1 skipped; edge functions 153
  passed);
- the CLAUDE.md rules each plan promised (routed pages 65, Audit tab 63.1, field help 76, success modal 16, bulk
  upload 26 / 71, lists 40 / 41 / 44, regional settings 68, no hard-coding 25.1, menus 70 / 75, approvals 53).

Not checked (no database access from here): which SQL the owner has run, and live data. Those are listed in §3 as
owner confirmations.

## 2. Summary

| Plan | Code | Committed | SQL run (per plan text) | Browser-checked | Verdict |
|---|---|---|---|---|---|
| v1353 Billing | Built | Yes (b4d35e9c); Admin v259 **not** committed | v1577–v1584 + Admin v259 run | Platform only | **~85%** — Planner wall gap, rule gaps, Simulator / Planner unchecked |
| v1354 Levelling & portfolio | Built | Yes (b4d35e9c); Admin v258 **not** committed | Run 2026-11-27 (v1572–v1576, Admin v258) | No | **~75%** — no optimiser / scoring tests, menu placements and docs missing, unsafe Apply |
| v1355 QRA | Built | Yes (b4d35e9c); Admin v257 **not** committed | Run 2026-11-27 (v1566–v1571, Admin v257) | No | **~80%** — SQL and browser checks outstanding, performance test not run |
| v1356 API, SCIM, SSO | Built | **No** — all files uncommitted (another session); Admin v260–v261 uncommitted | Run 2026-11-27 (v1585–v1590, Admin v260–v261) | No | **~70%** — fails two CI checks, rule gaps, nothing deployed |

The plans' own reviews overstate completion: v1356 says "100%", v1354 says "not committed" (it was), and v1353's
roadmap line lists SQL only up to v1581.

## 3. Gaps found

Severity: **B** = blocks release or breaks CI / a live feature; **R** = CLAUDE.md rule not met; **V** = verification
still owed; **D** = documentation.

### Across all four plans

| # | Sev | Gap | Evidence |
|---|---|---|---|
| X1 | B | Admin ID-generation seeds are not committed: `v257` (QRA runs), `v258` (levelling runs, scenarios), `v259` (billing), `v260`–`v261` (API) | `git status` in `E:\project-nidus-admin` |
| X2 | B | Planner table allow-list is stale: `client_credit_notes`, `client_payments` (v1353, already live) and the v1356 tables are missing — Planner credit notes and payments are blocked by the wall; CI `app-planner.yml` fails | `generate-planner-table-allowlist.mjs --check` |
| X3 | V | **Done 2026-11-27 — owner ran all of them.** Owner to confirm which SQL is applied: v1566–v1576 and Admin v257–v258 (plans say not run); v1585–v1590 and Admin v260–v261 | plan review sections |

### v1353 — Billing

| # | Sev | Gap | Evidence |
|---|---|---|---|
| B1 | R | Currency is hard-coded and typed as free text: `'USD'` defaults on the client form, client upload and every rate card; exchange-rate form defaults GBP→USD; Simulator always uses USD. Should default from Regional & Format Settings and pick from `currencies` (rules 25.1, 68, 69) | `BillingScreens.jsx` 82, 129, 184, 301, 743, 778–780; `billingData.js` 147, 353–355; `engine/billing.js` 112 |
| B2 | R | Rate-card scope dates: every card saves `effective_from = today`, no effective-to; D3 resolves "by effective date" but users cannot set it | `BillingScreens.jsx` 301 |
| B3 | R | Rate-card line "Person" is a free-text user id, not a people picker (rules 62, 69) | `BillingScreens.jsx` 338 |
| B4 | R | Client bulk upload has no preview, row validation, confirmation or result summary, and a comma-split parser that breaks on quoted addresses (rules 26, 16); errors are not caught | `BillingScreens.jsx` 73–84 |
| B5 | B? | Billing menu placement matches every `menu_code LIKE '%_fin_%'`, which can re-section finance items that existed before billing. Confirm with a read-only query; narrow to the billing codes if it did | `SQL/v1577` 406–411 |
| B6 | R | No hold / draft queue on the client form (rule 37); remove-draft-line uses `window.confirm` | `BillingScreens.jsx` 601 |
| B7 | V | Simulator and Planner billing not checked in the browser | v1353 review |
| B8 | D | ROADMAP R6 line lists SQL v1577–v1581 only (v1582–v1584 also exist) | ROADMAP 357 |
| B9 | B | **Found in Slice 2:** invoice drafts ignored rate-card dates, read only the first card of each scope, and never matched role lines (the role was always blank) — wrong charge-out rates | `billingData.js` cardsFor / draftInvoice |
| B10 | R | **Found in Slice 2:** Revenue and margin cards show raw numbers (no regional money format, rule 68) and the count cards are not clickable (rule 64) | `BillingScreens.jsx` RevenueScreen |
| B11 | B | **Found in Slice 2:** `timeData.test.js` still expected timesheet saves without `is_billable` (v1353) — the planning suite was red | `services/__tests__/timeData.test.js` |

### v1354 — Levelling & portfolio optimisation

| # | Sev | Gap | Evidence |
|---|---|---|---|
| L1 | R | No tests for `portfolioScoring.js` or `portfolioOptimiser.js` (plan: vectors + brute-force check on small sets); no screen tests for scoring / scenarios | `packages/planning/src/engine/__tests__` |
| L2 | R | Levelling has no shared vectors used by both JS and SQL re-check tests (plan "Engine") | no `engine/__vectors__` |
| L3 | R | Portfolio Scoring / Scenarios / Level resources menus have role grants but **no placement rows** (rule 75), and Scoring / Scenarios are missing from the taxonomy and placement documents (rule 70) | `SQL/v1575` (0 placements); both docs |
| L4 | B | Scenario **Apply** (changes project statuses, priority order, start dates) and **Submit** run on one click: no confirmation, no error handling, no success modal (rule 16) | `PortfolioScenarioScreen.jsx` 278–280 |
| L5 | V | SQL v1572–v1576 + Admin v258 not run; no browser check of Level resources, cross-project proposal, inbox, scoring, scenarios | v1354 review |
| L7 | B | **Found in Slice 3:** the optimiser checked "requires" rules as projects were added in score order, so a high-scoring project that requires a lower-scoring one could never be chosen (exact search and brute-force check both) — scenarios with such a rule could pick a worse set | `engine/portfolioOptimiser.js` |
| L6 | D | Plan review says "Not committed" — wrong; ROADMAP lines list partial SQL | v1354 review, ROADMAP 356 / 382 |

### v1355 — Quantitative risk analysis

| # | Sev | Gap | Evidence |
|---|---|---|---|
| Q1 | V | SQL v1566–v1571 + Admin v257 not run; screens never loaded live data | v1355 review |
| Q2 | V | Performance test (5,000 iterations × 500 tasks) not executed (plan risk mitigation) | v1355 review |
| Q3 | R | Cost-line delete and group delete use `window.confirm`, no error handling | `QraInputsScreen.jsx` 157, 301 |
| Q5 | B | **Found in Slice 3 (Q2 run):** 5,000 iterations over 500 tasks took 434.7 s (over 7 minutes) — the schedule engine walked the calendar day by day with date text for every task in every iteration | `engine/schedule.js`, `qra/runAnalysis.js` |
| Q4 | V | Statistics cross-check: zero-range iteration equals the deterministic engine, and seed repeatability are in `qra.test.js` — keep; add the SQL re-check of saved runs against vectors only if Q1 shows drift | — |

### v1356 — Public API, SCIM, SSO

| # | Sev | Gap | Evidence |
|---|---|---|---|
| A1 | B | Nothing is committed (gateway, `_shared/api`, `webhooks.deliver`, UI, SQL v1585–v1590, guide, CLAUDE.md / ROADMAP / taxonomy edits; Admin v260–v261, `ApiUsagePage`) | `git status` both repos |
| A2 | B | CI unreachable-code guard fails: `apps/platform/src/services/organisationApiService.js` (re-export nothing imports) and `apps/platform/src/services/ssoService.js` (retired) — delete (rule 78) | `find-unreachable-app-files.mjs platform --fail` |
| A3 | R | Field help: 4 raw `<label>`s on the SCIM settings switches (rule 76) | `check-field-help.mjs` |
| A4 | B | API key **Revoke** (and Rotate) runs on one click with no confirmation and no error handling — a mis-click breaks a customer integration | `IntegrationsPanels.jsx` 155–156 |
| A5 | R | No Audit tab on API keys / webhook endpoints / SCIM / SSO (plan slice 1 promised it; rule 63.1) | `IntegrationsPanels.jsx` |
| A6 | R | Key, endpoint and mapping lists are plain tables: no sortable headers, `#` column, search, card / table toggle, export (rules 38, 40, 41, 44) | `IntegrationsPanels.jsx` |
| A7 | V | SQL v1585–v1590 + Admin v260–v261 not run; `api-gateway` not deployed (`--no-verify-jwt`); no HTTP smoke test; SCIM / SSO not tried with a test IdP | v1356 review |
| A8 | D | Plan review says "Implementation complete (100%)" | v1356 review |
| A9 | B | **Found in Slice 1:** `webhooks.deliver` read and wrote tables through `ctx.admin`, which the worker adapter does not have — every delivery failed. No check stopped a webhook being sent to a private or local address | `handlers/webhooks.deliver.js`; `adapter.ts` |
| A10 | B | **Found in Slice 1 (security, live SQL):** webhook signing secrets are stored in plain text and readable by every member of the organisation (policy only checked account access) | `SQL/v1586` webhook_endpoints policy |
| A11 | B | **Found in Slice 1 (security, live SQL):** any member could change webhook endpoints, SCIM settings / group mappings and SSO connections (e.g. turn on "SSO required", change the break-glass user, map an IdP group to a role) | `SQL/v1586`–`v1588` `FOR ALL` policies |
| A13 | B | **Found in Slice 2:** integrations pages picked the organisation from the first project the database returned — a PMO Admin of two organisations could configure the wrong one | `IntegrationsPanels.jsx` useAccountId |
| A14 | B | **Found in Slice 2 (security, live SQL):** SSO domains were never checked against DNS — the browser marked them verified on save. Any organisation admin could claim another customer's email domain, require SSO and so block password sign-in platform-wide for that domain and route those sign-ins to their identity provider | `SQL/v1588`, SSO panel |
| B12 | B | **Found in Slice 3:** `scheduleScreens.test.jsx` still expected 15 schedule views in 4 menus and a non-UUID Simulator project key — v1353–v1355 added 7 views, a Billing menu and project-code lookup, so the planning suite was red | `screens/schedule/__tests__/scheduleScreens.test.jsx` |
| A12 | B | **Found in Slice 1:** Planner sign-in page called a React hook after an early return (`AuthPages.jsx`), so a signed-in visitor to the login page crashed it | `apps/planner/src/pages/public/AuthPages.jsx` |

## 4. Owner decisions needed (asked one at a time)

| # | Question | Recommendation |
|---|---|---|
| G1 | v1356 is another session's uncommitted work. Take it over in this plan (fix A2–A6, commit), or leave it to that session? | **Decided 2026-11-27: take it over** (A1–A8 are in scope) |
| G2 | Currency defaults (B1): organisation currency from Regional & Format Settings for new clients and rate cards, picked from the active `currencies` list; Simulator uses the practice organisation's settings | **Decided 2026-11-27: yes** (issued invoices unchanged) |
| G3 | Rate-card dates (B2): add Effective from / Effective to on the rate-card page (default today / open-ended) | **Decided 2026-11-27: yes** |
| G4 | Order of work | **Decided 2026-11-27:** Slice 1 (CI blockers + uncommitted Admin seeds) → owner runs outstanding SQL → Slice 2 (safety + rules) → Slice 3 (tests, docs, checks) |

## 5. Implementation — vertical slices

Each slice: tests first where code changes, one suite at a time, commit and push, owner runs any SQL and checks in the
browser before the next slice. SQL numbers from `ls SQL` right before each file (rule 18.0).

### Slice 1 — Unblock CI and commit what is live

- [x] X1: Admin v257–v261 and the v1356 Admin pages committed (Admin f21f322); v1356 monorepo work committed with Slice 1 (ece42930).
- [x] X2: `generate-planner-table-allowlist.mjs --write` (10 tables added); owner re-runs `SQL/v1251_planner_table_wall.sql`.
- [x] A2: deleted `apps/platform/src/services/organisationApiService.js` and `ssoService.js` (unreachable check passes).
- [x] A9: `webhooks.deliver` rewritten on `webhook_delivery_context` / `webhook_delivery_result` (SQL v1609); refuses
      local / private targets, 10-second timeout, no redirects; tests `v1356WebhooksDeliver.test.js`.
- [x] A10 / A11: `SQL/v1609_integrations_admin_only_and_webhook_worker.sql` — webhook endpoints / deliveries / outbox,
      SCIM settings / mappings / identities and SSO connections limited to the Account Owner or a PMO Admin
      (`auth_user_is_account_admin`, same rule as API keys). Members keep sign-in, invitations and the profile lock
      (SECURITY DEFINER functions).
- [x] A12: Planner sign-in hook order fixed.
- [x] B5: read-only check `SQL/v1608` (owner ran 2026-11-27: v1577 had placed FIN register pages `fin_reg_fin_*` in Money & Resources and re-activated the retired FIN Environments placement). Fix `SQL/v1610_fix_billing_finance_placement_overreach.sql` deletes the placements v1577 created for non-billing pages and restores what it overwrote; `SQL/v1577` narrowed to the ten billing codes.
- [x] X3: owner ran v1566–v1576, v1585–v1590 and Admin v257–v261 (2026-11-27).

### Slice 2 — Safety and rule gaps (Platform + Simulator + Planner, shared screens)

- [x] L4: scenario Apply / Submit — confirmation stating what changes, error message, success modal (shared `useConfirmDialog`, `@nidus/ui`).
- [x] A4: API key Revoke / Rotate — confirmation, error handling, success modal.
- [x] Q3, B6: `window.confirm` replaced by the shared confirm dialog in QRA inputs and invoice draft lines; error
      handling on delete.
- [x] B1 (G2): `useCurrencyOptions` (`@nidus/shared`, tab cache) — client, rate-card and exchange-rate forms pick from
      `currencies` and default to the organisation currency; drafts and Simulator use the regional settings.
- [x] B2 (G3): Rates start / Rates end on rate cards; with B9 the dates now reach the rate engine (tests).
- [x] B3: role and person pickers on rate-card lines (`listOptions={false}` on Person); B9 fixes in `billingData.js`.
- [x] B4: client bulk upload — shared CSV parser, `validateClientRows` preview with per-row problems, add after
      confirmation, summary in the success modal; rate-card line upload on the same parser.
- [x] L3: on inspection these are Level 3/4 children of placed items (Resources, Portfolio) and inherit the placement,
      so no rows were added; taxonomy and placement documents now list Scoring and Scenarios. Owner: run
      `SQL/v1452_consolidated_menu_audit_query.sql` to confirm no unplaced page.
- [x] A3, A5, A6, A13, A14 (UI): SCIM switches with help labels; Details | Audit details tabs on every panel; keys,
      usage, endpoints, deliveries, mappings and connections on `SimpleRecordList`; current organisation via
      `getCurrentUserAccountId`; SCIM role picker; SSO shows the server TXT token and verification, Verify domain,
      Require SSO only when verified; SSO updates no longer blank the reference.
- [x] A14 (server): `SQL/v1611_sso_domain_verification.sql` (guard trigger, request / context / result functions,
      one organisation per domain, weekly real re-check, self-made verifications cleared) + worker handler
      `sso.domain_verify` (DNS over HTTPS through `ctx.httpGet`; tests).
- [x] B10: moved to Slice 3 (done there).

### Slice 3 — Tests, verification, documents

- [x] B10: Revenue and margin in the regional money / number format; Billed revenue opens this project's billed
      invoices (`?status=billed&projectId=…`, new "billed" filter, "Showing … · Show all" line). Unbilled value / hours
      have no list page anywhere — left static (rule 64 exception, noted); Cost and Margin are derived.
- [x] L1: correction to the audit — `levelling.test.js` already held 8 portfolio tests (incl. a small brute-force
      check). Added `engine/__vectors__/portfolio.json` (hand-worked answers) and `portfolio.test.js` (vectors,
      60 seeded random sets against brute force, greedy above the cap). The vectors found **L7**, fixed.
- [x] L2: decision — levelling keeps its 11 targeted JS tests (float, pins, constraints, weekends, priority,
      cross-project load, workload agreement); SQL cannot practically read a shared JSON file, and v1576 keeps its own
      assertions. No separate vectors file.
- [x] Q2 + **Q5**: `qra/__tests__/qraPerformance.test.js` (opt-in, `QRA_PERF=1`). First run 434.7 s; after a
      working-day index per calendar in `schedule.js` (same results, P50 / P80 unchanged) and one calendar per analysis
      run, **9.9 s**. Speeds every schedule calculation that uses a calendar, not only QRA.
- [x] **B12**: schedule screen tests updated to the 22 views / 5 menus and a UUID Simulator key. Whole planning
      suite green (273 passed, 4 opt-in skipped).
- [x] Browser checks (owner, passed 2026-11-28): B7 Simulator + Planner billing; L5 levelling and portfolio; Q1 risk analysis; A7 API with
      an HTTP client, then SCIM / SSO with a test IdP.
- [x] B8, L6, A8: each plan's review section and the ROADMAP lines corrected (v1359 corrections added).
- [x] Owner sign-off (2026-11-28): v1353–v1356 and this plan are closed.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Two sessions editing v1356 at once | G1 first; stage only own hunks (as in v1352 / v1358) |
| Currency change alters existing invoices | Only defaults for new records change; issued invoices keep their frozen currency and rate |
| Placement SQL moves existing items | Insert placements for the three new codes only; `ON CONFLICT DO NOTHING` |
| Applying v1354 / v1355 SQL late against newer schema | Owner runs them in plan order; each ends with its own assertion tests |

## 7. Review

**Slices 1–3 (2026-11-27 / 28).** Commits: ece42930, ec4b8485, c6c25ef0 (slice 1), a494845d, 40765702 (slice 2),
slice 3 next commit; Admin f21f322. SQL: v1608–v1611 (all run by the owner), plus re-runs of v1251.

**What the audit found that the four plans' own reviews missed** — beyond the rule gaps:
- Security, live: integration settings open to every organisation member (A10 / A11); SSO domains never checked
  against DNS, allowing a cross-organisation sign-in takeover (A14).
- Broken features: webhook delivery could never succeed (A9); invoice drafts used wrong charge-out rates (B9); the
  optimiser dropped required pairs (L7); the Planner sign-in page crashed for a signed-in visitor (A12); the
  integrations pages could pick the wrong organisation (A13); billing's menu SQL moved Banking register pages (B5).
- Quality: risk analysis took 7 minutes for a 500-task plan (Q5); two red test suites (B11, B12); CI blockers
  (X2, A2); uncommitted Admin seeds and a whole uncommitted feature (X1, A1).

**Corrections to this audit:** L1 (portfolio tests partly existed) and L3 (no placement rows needed — children of
placed items).

**Shared pieces added:** `useConfirmDialog` (`@nidus/ui`), `useCurrencyOptions` (`@nidus/shared`), working-day index
in the schedule engine.

**Closed 2026-11-28:** the owner passed every browser check (Simulator and Planner billing; levelling, proposals, scoring and scenarios; risk analysis with live data; API key calls, revoke, SCIM and SSO domain verification). v1353, v1354, v1355, v1356 and v1359 are complete.
