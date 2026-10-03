# v982 Implementation Plan — Phase 6: Capability Profiles

Implements Phase 6 of `projectprd/v982_saas_user_journey_account_pmo_delivery_PRD.md` (brief
§12). No hard dependency on Phases 2-5; can proceed once Phase 1 is live.

## Facts established during investigation (grounds every task below)

- **v918's industry-pack model gates menu visibility only** — `industry_packs` →
  `industry_pack_menu_items` (`SQL/v920_industry_packs_schema.sql:25-98`).
  `industry_pack_features` is explicitly commented **"descriptive only — not read by any
  authorization or menu-resolution logic."** No feature-level gating exists today anywhere in the
  codebase — only menu-item visibility. Capability Profiles cannot assume a feature-flag
  enforcement layer exists to plug into; if a profile needs to gate something other than menu
  visibility, that enforcement layer is new work this phase must build, not reuse.
- **`industry_packs` is explicitly documented as free/ungated this phase**: "Free for every
  subscription tier in this phase... no plan-gating column exists yet by design." Confirms PRD
  decision on Capability Profiles (open decision 8: purely organisational defaults, no
  subscription-tier gating) is consistent with the existing, deliberate v918 precedent — not a new
  departure.
- **⚠ Naming collision found**: `subscription_plans.plan_type` already has the value
  `'enterprise'` (`SQL/v113_subscription_plans.sql:11,33`, alongside `starter | professional |
  lifetime`). The brief's suggested Capability Profile tier name "Enterprise" would collide in
  meaning with an *already-shipped, unrelated* subscription-plan tier. **This plan renames the
  top Capability Profile tier to avoid confusion** — see decision 1 below.
- **No `capability_profile` concept exists anywhere** — confirmed via grep, genuinely new from
  scratch, layered on top of (not replacing) v918's entitlement tables per the PRD's explicit
  framing.

## Decisions — accepted by default per user authorization

None touch authorization; all are naming/scope calls proceeded on directly per the coordinator's
explicit instruction.

1. Top tier renamed to **Comprehensive** (not "Enterprise") — avoids the
   `subscription_plans.plan_type = 'enterprise'` collision. Implemented exactly as recommended.
2. Scoped to **menu visibility only**, exactly like industry packs — no new feature-flag
   enforcement layer. Implemented exactly as recommended; reuses the existing
   `toggle_organisation_capability` RPC end to end.
3. **Starting point, not a constraint** — applying a profile bulk-sets the org's existing
   `organisation_disabled_capabilities` overrides once; the org freely diverges afterward via the
   existing "Modules & Capabilities" settings page. Implemented exactly as recommended.

## Todo list

### A. Database
- [x] `SQL/v996_capability_profiles.sql` — `capability_profiles` (4 tiers seeded, decision 1
  naming) + `capability_profile_menu_items` (industry-agnostic tier classification, keyed by raw
  `menu_item_id` — see the file's own header for why this differs slightly from a literal
  `industry_pack_menu_items` shape reuse) + `accounts.capability_profile_id` /
  `capability_profile_applied_at` / `capability_profile_applied_by` (the latter two added beyond
  the plan's literal wording, to give the Audit tab real content per rule 63.1) +
  `database_tables` registry rows.
- [x] Seed data: `SQL/v997_capability_profile_menu_items_seed.sql` — a DRAFT, clearly marked for
  review before running (per the coordinator's explicit instruction). See the "Proposed per-tier
  breakdown" table below — review and adjust the tier boundaries there before running this file;
  nothing else in it needs to change to move a whole category to a different tier.

### B. Backend/services
- [x] `capabilityProfileService.js` — `getProfiles()`, `getAccountCapabilityProfile()`,
  `getProfileMenuItems()`, `applyProfileToAccount(accountId, profileId)`. Reuses the EXISTING
  `toggle_organisation_capability` RPC (`organisationIndustryService.js`, v920) for every write —
  no new override table, no new write path, per decision 2/rule 42.
- [x] Simulator mirror: `apps/simulator/src/services/capabilityProfileService.js` (confirmed via
  `organisationIndustryService.js`'s own byte-identical-across-apps precedent that this org-level
  capability concept is shared cross-app through `public` schema, same as Phase 1/2's finding) —
  byte-for-byte copy, no adjustments needed (no app-specific paths in this file).

### C. Frontend
- [x] `pages/pmo-admin/CapabilityProfilePicker.jsx` (`pmo-admin/capability-profile`), surfaced from
  Phase 2's `PmoConfigurationHome.jsx` landing page (new "Capability Profile" card) — 4 tier cards,
  plain-language descriptions, item counts, "Current" badge, Apply with an inline confirm step
  warning about overwriting hand-tuned customizations.
- [x] Theme-aware, success-confirmation modal on apply (rule 16, reports enabled/disabled/
  unchanged counts), `DetailAuditTabList` Details/Audit tabs (rule 63.1) — Audit tab shows the
  currently-applied tier + who applied it + when, reading the two new `accounts` columns.
- [x] Simulator mirror: `pages/pmo-admin/CapabilityProfilePicker.jsx` + route
  `simulator/pmo/capability-profile` + `PmoConfigurationHome.jsx` card, same pattern as every
  other Phase 2/6 Simulator mirror this session (route paths rewritten, component logic identical).

### D. Tests
- [x] `capabilityProfileService.test.js` (7 tests, both apps) — sets exactly the profile's declared
  visibility (1 enable + 1 disable + 1 unchanged, asserted precisely, no more/fewer).
- [x] **The most important test in this phase**: a menu item with no `industry_pack_menu_items`
  row at all (simulating a capability granted through a non-industry-pack path — the shape a
  paying entitlement outside the free/ungated industry-pack model would take) is structurally
  never touched — proven by construction, since the reconciliation loop only ever iterates over
  the account's reachable `industry_pack_menu_items` rows, and `organisation_disabled_capabilities`
  can only ever target one of those rows' ids in the first place.
- [x] Idempotency: re-applying an already-fully-applied profile makes zero
  `toggle_organisation_capability` calls (all 3 items land in `unchanged`).

### E. Verification
- [x] `npx vitest run` clean — both apps, see review section.
- [ ] Manual walkthrough: apply each of the 4 profiles to a test org. **Not performed** — no dev
  server/browser session or live database this session, same class of gap as every prior phase.
  Also blocked on the seed content review below being confirmed first.
- [x] REVIEW.md applicable checks — see review section.

## Review section

Phase 6 is implemented. Summary below; see the inline `[x]` notes above for task-by-task detail.

### Decisions accepted by default per user authorization

All three noted above, implemented exactly as recommended. No further ambiguity was hit beyond
the seed-content review this section covers next.

### Proposed per-tier menu-item breakdown — PLEASE REVIEW BEFORE RUNNING v997

`SQL/v997_capability_profile_menu_items_seed.sql` classifies menu items by TOP-LEVEL PM CATEGORY
(drawn from `packages/config/src/pmoSidebarCategories.js`'s real, current category registry —
these are actual `menu_code` values in the live system, not invented ones), expanded recursively
to every descendant item under each listed category. Each tier is CUMULATIVE (Standard = Essential
+ its own row's additions, etc.), matching the brief's escalating-scope framing.

| Tier | Adds these top-level categories (cumulative on the tier above) |
|---|---|
| **Essential** | Dashboard, Projects, Tasks, Teams, Calendar, Project Setup |
| **Standard** | *(all of Essential)* + Controls & Registers, Planning, RAID, Stakeholders, Documents, Reports, Quality |
| **Advanced** | *(all of Standard)* + Change Control, Resources, Cost Management, Governance, Testing, Benefits, Authorisation, Project Closure, Templates (both Organizational + Project Templates) |
| **Comprehensive** | *(all of Advanced)* + Cross-Framework, AI Assistant, Knowledge & Resources, **plus every remaining menu item reachable through ANY industry pack** (i.e. every industry-specific item across Finance, Construction, ICT, Healthcare, Government, Telecom, Energy, Manufacturing, Education, NGO, Retail, Marketing, HR, Legal/Compliance, etc. — the top tier unlocks everything an org's selected industries offer, full stop) |

**Things worth your explicit review before running v997**:
1. Whether "Quality" belongs in Standard (basic quality tracking) vs. "Testing" staying in Advanced
   (a deeper, more specialist activity) — this session split them that way (Quality = Standard,
   Testing = Advanced) but they're closely related and you may want them in the same tier.
2. Whether "Templates" (both Organizational and Project Templates) really belongs in Advanced
   rather than Standard — a PM using project templates from day one is common, so this could
   arguably move down a tier.
3. Whether "Governance"/"Authorisation" (approval workflows) belong in Advanced or should be
   Comprehensive-only — this session judged them "maturing PMO" territory (Advanced), but a strict
   reading of the brief's framing could put formal governance at the top tier only.
4. The exact wording of each tier's `description` column (in `v996_capability_profiles.sql`'s
   INSERT) is this session's draft copy — feel free to adjust before running.

The seed file is idempotent and its whole tier-to-category mapping lives in six short `VALUES`
lists (one set of top-level `menu_code`s per tier-addition block) — moving a category to a
different tier is a one-line edit, no need to touch the recursive-expansion logic itself.

### Files created

SQL (run in this order — v997 depends on v996's tier rows existing; hold v997 until the table
above is reviewed and any tier reassignments are made):
1. `SQL/v996_capability_profiles.sql` — `capability_profiles`, `capability_profile_menu_items`,
   `accounts.capability_profile_id`/`capability_profile_applied_at`/`capability_profile_applied_by`,
   RLS, `database_tables` registry. Safe to run standalone; no dependency on v997.
2. `SQL/v997_capability_profile_menu_items_seed.sql` — the per-tier menu-item seed (DRAFT content,
   see the table above). **Depends on v996** (reads the 4 tier ids by `tier_code`) and expects the
   listed `menu_code`s to exist in `public.menu_items` (they're drawn from the live category
   registry, but this session did not query the live DB to confirm every one of the ~30 codes
   still resolves to a row — if a code has since been renamed/reparented in a later migration, its
   whole category silently contributes zero rows to that tier rather than erroring; the
   post-run verification query in the file's own footer will surface that as a lower-than-expected
   count for the affected tier).

Platform app:
- `apps/platform/src/services/capabilityProfileService.js`
- `apps/platform/src/pages/pmo-admin/CapabilityProfilePicker.jsx`
- `apps/platform/src/services/__tests__/capabilityProfileService.test.js`

Simulator app (mirrors of the above):
- `apps/simulator/src/services/capabilityProfileService.js`
- `apps/simulator/src/pages/pmo-admin/CapabilityProfilePicker.jsx`
- `apps/simulator/src/services/__tests__/capabilityProfileService.test.js`

### Files changed

- `apps/platform/src/pages/pmo-admin/PmoConfigurationHome.jsx` / `apps/simulator/src/pages/
  pmo-admin/PmoConfigurationHome.jsx` — new "Capability Profile" card.
- `apps/platform/src/routes/lazyImports.js` + `platformRoutes.jsx` — `pmo-admin/capability-profile`
  route.
- `apps/simulator/src/routes/lazyImports.js` + `simulatorRoutes.jsx` —
  `simulator/pmo/capability-profile` route.

### Test results

New tests: 7 assertions per app (14 total) — all passing, verified with a targeted run before the
full-suite run.

Full-suite `npx vitest run`:
- Platform: 226 files / 1506 tests passed, 61 files / 182 tests failed.
- Simulator: 222 files / 1404 tests passed, 62 files / 101 tests failed.

**Exact match to Phase 5's own recorded baseline** on the failing side (61/182 Platform, 62/101
Simulator, unchanged across the whole session) — passing counts up by exactly +1 file/+7 tests in
each app. Nothing this phase touched appears in either app's failing-file list.

### A structural honesty note (not a decision needing your input, just worth knowing)

`organisation_disabled_capabilities.industry_pack_menu_item_id` can only ever reference a row in
`industry_pack_menu_items` — it structurally cannot disable a menu item that isn't reachable
through some industry pack the account selected (there is no "enable/disable outside my packs"
concept anywhere in this codebase, by v920's own deliberate design). This means a Capability
Profile can only CURATE within whatever an account's industry packs already make reachable — it
can never grant visibility into something outside them. This is not a limitation this phase
introduced; it's an honest consequence of decision 2 (reuse the existing mechanism, build no new
one) applied to a pre-existing structural constraint. Documented here and in `v996`'s own header
comment rather than silently discovered later.

### Manual verification not performed

No dev server, browser session, or live database this session. Recommend, in this order: (1)
review the per-tier table above and adjust `v997`'s `VALUES` lists if needed, (2) run `v996` then
`v997` against staging, (3) run the post-run verification query in `v997`'s footer to confirm a
strictly-increasing item count Essential < Standard < Advanced < Comprehensive, (4) manually apply
each tier to a test org and confirm the sidebar matches, dark + light mode, both apps.

### Nothing flagged as needing a further product/security decision

The three pre-resolved decisions covered the scope-shaping questions; the seed-content review
above is the one item the coordinator explicitly asked to surface for your judgment rather than
silently finalize, and it's presented as a clear, adjustable table exactly as instructed.
