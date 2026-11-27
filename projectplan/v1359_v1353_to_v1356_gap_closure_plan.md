# v1359 — Gap closure for v1353, v1354, v1355 and v1356 — Audit and implementation plan

**Covers:** `projectplan/v1353_project_billing_and_revenue_plan.md`,
`projectplan/v1354_resource_levelling_and_portfolio_optimisation_plan.md`,
`projectplan/v1355_quantitative_risk_analysis_plan.md`, `projectplan/v1356_public_api_and_scim_plan.md`.
**No new PRD:** every gap below is inside the scope the owner already approved in the v1353–v1356 PRDs; this plan
only finishes and corrects that work. **Status:** approved 2026-11-27. Slice 1 code done and committed (ece42930, Admin f21f322); owner to run SQL v1609, re-run v1251, run check v1608, and deploy.

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

### v1354 — Levelling & portfolio optimisation

| # | Sev | Gap | Evidence |
|---|---|---|---|
| L1 | R | No tests for `portfolioScoring.js` or `portfolioOptimiser.js` (plan: vectors + brute-force check on small sets); no screen tests for scoring / scenarios | `packages/planning/src/engine/__tests__` |
| L2 | R | Levelling has no shared vectors used by both JS and SQL re-check tests (plan "Engine") | no `engine/__vectors__` |
| L3 | R | Portfolio Scoring / Scenarios / Level resources menus have role grants but **no placement rows** (rule 75), and Scoring / Scenarios are missing from the taxonomy and placement documents (rule 70) | `SQL/v1575` (0 placements); both docs |
| L4 | B | Scenario **Apply** (changes project statuses, priority order, start dates) and **Submit** run on one click: no confirmation, no error handling, no success modal (rule 16) | `PortfolioScenarioScreen.jsx` 278–280 |
| L5 | V | SQL v1572–v1576 + Admin v258 not run; no browser check of Level resources, cross-project proposal, inbox, scoring, scenarios | v1354 review |
| L6 | D | Plan review says "Not committed" — wrong; ROADMAP lines list partial SQL | v1354 review, ROADMAP 356 / 382 |

### v1355 — Quantitative risk analysis

| # | Sev | Gap | Evidence |
|---|---|---|---|
| Q1 | V | SQL v1566–v1571 + Admin v257 not run; screens never loaded live data | v1355 review |
| Q2 | V | Performance test (5,000 iterations × 500 tasks) not executed (plan risk mitigation) | v1355 review |
| Q3 | R | Cost-line delete and group delete use `window.confirm`, no error handling | `QraInputsScreen.jsx` 157, 301 |
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
- [x] B5: read-only query `SQL/v1608_billing_finance_placement_check.sql` (owner runs; no rows = nothing to fix).
- [x] X3: owner ran v1566–v1576, v1585–v1590 and Admin v257–v261 (2026-11-27).

### Slice 2 — Safety and rule gaps (Platform + Simulator + Planner, shared screens)

- [ ] L4: scenario Apply / Submit — confirmation stating what changes, error message, success modal (rule 16).
- [ ] A4: API key Revoke / Rotate — confirmation, error handling, success modal.
- [ ] Q3, B6: replace `window.confirm` with the shared confirm dialog in QRA inputs and invoice draft lines; error
      handling on delete.
- [ ] B1 (G2): currency from regional settings + `currencies` picker (SelectField) on client, rate-card and
      exchange-rate forms; Simulator reads its practice settings; remove `'USD'` literals.
- [ ] B2 (G3): Effective from / to on rate cards; resolution already honours dates — add a test.
- [ ] B3: people picker for the rate-card Person column (`listOptions={false}` on its help label).
- [ ] B4: client bulk upload — proper CSV parsing, preview with per-row errors, confirm, result summary in the success
      modal (rules 26, 71 legend kept).
- [ ] L3: placement rows for `plat_|sim_portfolio_scoring`, `_scenarios`, `_res_levelling` (new SQL); taxonomy and
      placement documents updated (rules 70, 75); run `SQL/v1452` audit query.
- [ ] A3, A5, A6 (if G1 = take over): field help on SCIM switches; Audit tab on key / endpoint / SCIM / SSO records;
      key and endpoint lists on the shared list table (sort, `#`, search, toggle, export).

### Slice 3 — Tests, verification, documents

- [ ] L1: `portfolioScoring` and `portfolioOptimiser` tests with vectors, including brute-force agreement on ≤ 10
      candidates and the greedy label above the cap; scoring / scenario screen tests.
- [ ] L2: levelling vectors file used by the JS tests and by the v1576 SQL re-check.
- [ ] Q2: performance test — 5,000 iterations on a 500-task synthetic schedule, time recorded in the v1355 review.
- [ ] Browser checks (owner): B7 Simulator + Planner billing; L5 levelling and portfolio; Q1 risk analysis; A7 API with
      an HTTP client, then SCIM / SSO with a test IdP.
- [ ] B8, L6, A8: correct each plan's review section and ROADMAP lines; tick v1353–v1356 complete only after their
      checks pass.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Two sessions editing v1356 at once | G1 first; stage only own hunks (as in v1352 / v1358) |
| Currency change alters existing invoices | Only defaults for new records change; issued invoices keep their frozen currency and rate |
| Placement SQL moves existing items | Insert placements for the three new codes only; `ON CONFLICT DO NOTHING` |
| Applying v1354 / v1355 SQL late against newer schema | Owner runs them in plan order; each ends with its own assertion tests |

## 7. Review

(to be completed after implementation)
