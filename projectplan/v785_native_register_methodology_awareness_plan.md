# v785 — Risk Register: wire into the existing tier-inheritance system (not build a new one)

**Companion Admin work:** `project-nidus-admin/projectplans/v189_structured_methodology_template_completeness_plan.md` (Global Template Library content completeness — separate, already-scoped).

## The model (confirmed by user's diagram)

```
Global Templates (System Admin, international best practice)
  └─ PMO Templates (PMO Admin, full customise — business policy)
       ├─ Portfolio (Portfolio Manager: inherit + ADD local fields only)
       │    ├─ Sub-Portfolio (inherit from Portfolio + add local)
       │    ├─ Programme (inherit from Portfolio + add local)
       │    │    └─ Project (inherit from Programme + add local)
       │    └─ Project (inherit from Portfolio + add local)
       ├─ Programme (standalone; inherit from PMO + add local)
       │    └─ Project (inherit from Programme + add local)
       └─ Project (standalone; inherit from PMO + add local)
```

**Correction after walking through a concrete example with the user (15 → 10 → 8 fields):** every tier gets the *same* full capability — disable an inherited field it doesn't need, or add its own local field — on **its own node only**. The permission boundary is *which entity's node you may touch* (a PM edits their own project's node, never the PMO node or another project's node), not *what you're allowed to do once there*. The earlier reading of the diagram ("PMO full-customise, lower tiers additive-only") was wrong — the 10→8 step in the user's example is a Project-tier **disable**, not an addition, so lower tiers must be able to disable too.

**Confirmed rule for disables specifically: they are final going down the chain.** Once any tier (e.g. PMO, narrowing 15→10) disables a field, no descendant tier (e.g. a Project) can turn it back on — only further disabling is possible further down. This needs a real code change (see Gap 2 below); the current merge function does **not** enforce this yet.

**New rule: a tier can mark one of its fields "mandatory" so no descendant can disable it at all.** This is the organizational-policy-enforcement case — e.g. PMO decides "Risk Category" must always be captured, on every project, no exceptions; a Project's PM should not be able to turn that field off even though PMs otherwise have full disable rights on their own node. This is a distinct rule from sticky-disable (which governs what happens *after* a disable already occurred) — mandatory-lock instead *blocks the disable action itself* for that field, for every tier below the one that locked it. See Gap 3 below — this needs a genuine schema addition, not just a resolver tweak.

## What's already built — verified in code this session, reuse as-is, do not rebuild

| Piece | Where | What it does |
|---|---|---|
| Tier cascade + parent chain | `SQL/v764_pm_template_hierarchy_tables.sql` | `pm_template_nodes.tier` (`pmo/portfolio/sub_portfolio/programme/project`), `parent_node_id`, `scope_entity_type/scope_entity_id`, `is_system_synced` for Global-sync rows |
| Per-tier field overrides | same file + `v765` | `pm_template_field_links` — `enabled`, `required_override`, `default_value_override`, `label_override`, `is_local` |
| Entity → node assignment | `v764_pm_template_hierarchy_tables.sql` | `pm_template_entity_assignment` |
| Instance-local fields | `v784_pm_hierarchy_create_time_inheritance.sql` | `scope_entity_type/scope_entity_id` added directly to `custom_field_definitions` |
| **Generic resolver** (arbitrary depth, child-wins-override) | `packages/shared/src/services/pmTemplateInheritanceService.js` | `resolveStartNodeId` → `fetchNodeChain` (walks `parent_node_id`, `MAX_CHAIN_DEPTH=32`) → `mergeFieldLinksByChain` (root→leaf merge, child overrides) → `resolveEffectiveFields`/`resolveEffectiveDocumentMaster` |
| **Tier customization UI** | `apps/platform/src/components/ui/TierFieldCustomisationPanel.jsx` (mirrored in Simulator) | Props `{db, accountId, tier, entityType, entityId, ...}`. Lets a tier: toggle enabled/required on an inherited field (writes an override at *this* tier's own node, never mutates the parent), link an existing catalog field, or create a brand-new instance-local field. Already embedded in `PortfolioDetail.jsx:273`, `ProgrammeDetail.jsx:579`, `ProjectFieldTemplates.jsx:36` (generic "Templates" tabs) |
| Generic value storage | `apps/platform/src/features/local-data-extensions/api/customFieldValuesApi.js` | `custom_field_values` keyed by `(field_definition_id, entity_type, entity_id, project_id)`, serialize/deserialize per `field_type`, plus screen-scoped export via `custom_field_screen_map` (`screen_code`) |

**The Global→PMO→Portfolio→Programme→Project cascade this diagram describes is already implemented and working** for generic entity custom fields. Nothing above needs to be built again.

## The actual gaps (this is the real Phase 1 scope)

1. **No entity-scoped authorization anywhere in this system today.** `TierFieldCustomisationPanel.jsx` has zero permission checks — nothing currently stops a user from customizing a node for an entity they don't actually administer (e.g. editing a portfolio they're not the manager of, or the PMO node without being a PMO admin). `ProjectFieldTemplates.jsx`'s route uses `<ProtectedRoute>` with no `requiredRoles` (the prop exists on `ProtectedRoute.jsx:16` but isn't passed). **Need:** gate access to a given tier's panel by "does this user administer *this specific* PMO/portfolio/programme/project" (reuse whatever membership/ownership check already exists elsewhere for that entity type — e.g. project-PM assignment, portfolio-manager assignment) — **not** a tier-based capability restriction. Once admitted, a user has full disable + add capability on that one node, same as every other tier.

2. **"Sticky disable" — `mergeFieldLinksByChain` needs a small, targeted fix.** Confirmed requirement: once a field is disabled at any tier, no descendant tier can re-enable it. **The tier that disabled it can reverse its own decision at any time** (that's just editing its own node's own row, no different from any other edit) — the restriction is scoped to descendants only, and per Gap 1 only that tier's administrator can make that edit in the first place. If a descendant separately disabled the same field on its own node, an ancestor re-enabling does not override the descendant's own row — it only changes what descendants *without their own override* inherit going forward. Today's merge (`pmTemplateInheritanceService.js:86-114`) computes `next.enabled` fresh from each tier's own link row (`link.enabled !== false`) with no memory of an ancestor's disable — so a descendant tier *can* currently flip a field back on just by having its own row with `enabled: true`. Fix: change `next.enabled` to `prev.enabled && (link.enabled !== false)` so a `false` anywhere in the root→leaf walk stays `false` for every descendant, regardless of what a later tier's row says. Small, localized change to one function — no schema change.
3. **"Mandatory lock" — new schema column + enforcement at two points.** No existing column captures "this field cannot be disabled below me." **Need:**
   - New `locked BOOLEAN NOT NULL DEFAULT FALSE` column on `pm_template_field_links` (public + sim). Set by whichever tier wants to protect a field from its own descendants — any tier can lock, not just PMO (a Programme could lock a field so its own Projects can't disable it, independent of whether PMO locked anything).
   - **Merge-time enforcement (defense in depth):** `mergeFieldLinksByChain` tracks, per field, whether any tier root→leaf-so-far has `locked = true`; once seen, any descendant tier's row is not permitted to change `enabled` to `false` for that field — the merge forces `enabled = true` regardless of what a lower row says, for as long as the lock holds.
   - **Write-time enforcement (the real gate — merge-time alone isn't enough since it would silently swallow the write instead of telling the user why):** before persisting a disable action in `TierFieldCustomisationPanel`'s write path, check the field's ancestor chain for a `locked = true` row; if found, reject the write with a clear error identifying which tier locked it, rather than silently no-op-ing.
   - **UI:** a locked field's "Enabled" toggle is disabled/greyed for every tier below the lock, with a label identifying the locking tier (e.g. "Locked by PMO — Risk Category must always be captured"). The tier that *set* the lock (or any tier above it) can still unlock it on its own node.
4. **Risk Register doesn't use any of this — it's still fixed hardcoded columns.** `RiskRegisterView.jsx`/`EnhancedRiskForm.jsx` read/write `public.risks`' physical columns directly; there's no `TierFieldCustomisationPanel` on the Risk Register screen and no read of `custom_field_values` for it. **Need:** embed the panel (permission-gated per #1) on the Risk Register settings surface at whatever tier the user is viewing from, and have the Risk Register view/form call `resolveEffectiveFields` + `custom_field_values` to render/store any org/tier-added extra fields *alongside* (not replacing) the existing fixed columns — proximity/pre-post-response/etc. stay physical columns exactly as they are today.
5. **No screen identity for Risk Register yet.** The LDE system scopes fields by `screen_code` (`custom_field_screen_map`) — need a `risk_register` screen_code registered so fields can be explicitly attached to this screen rather than generic project fields.
6. **Admin's Global Templates need a routing convention to land as the Risk Register's chain root.** Today Global `fields`-domain templates sync to a generic PMO-tier node; there's no way yet to say "this fields template is *for* the Risk Register specifically" vs. some other generic entity fields. **Need:** tag the Global Template with something resolvable (e.g. `category = 'risk_register'`) and extend `resolveStartNodeId`'s PMO-default fallback query to filter by that tag when resolving the Risk Register's start node specifically (small, additive change to one query — not a rewrite of the resolver).
7. **Simulator parity** — same six gaps closed identically in `apps/simulator` (same files mirror 1:1 per everything found this session).

## Explicit non-goals for Phase 1
- No new tier/hierarchy tables, no new resolver rewrite, no new "copy" RPC, no new generic custom-fields UI — the tier/resolver/panel/value-storage machinery already exists and gets reused verbatim; Gaps 2 and 3 are the only code changes to that machinery, both small and targeted.
- Issue Register and all other native modules (Quality, Change, Work Package, Business Case) — deferred to their own follow-on plan once Risk Register proves the pattern (should be much faster the second time, since gaps 1/2/3/5/6's mechanism is now built once and reusable — only gap 4's per-screen wiring repeats per module).

## Remaining open question before implementation starts
- [x] Should Portfolio/Programme/Project tiers be able to see *which* fields came from an ancestor tier vs. their own local additions/disables in the UI (e.g. a badge showing "set by PMO" on a disabled field, so it's clear why it's greyed out)? This is now effectively answered "yes" by the mandatory-lock requirement itself (Gap 3's UI needs to identify the locking tier anyway) — so this is no longer a separate open question, just confirms the same UI affordance covers both cases.

## Todo (build order)
- [x] Fix `mergeFieldLinksByChain`'s `enabled` computation for sticky-disable semantics (Gap 2) — `packages/shared/src/services/pmTemplateInheritanceService.js`, shared by Platform + Simulator, one change covers both
- [x] `locked` column migration on `pm_template_field_links` (public + sim) (Gap 3)
- [x] Merge-time lock enforcement in `mergeFieldLinksByChain` (Gap 3) — same function/change window as the sticky-disable fix above, do both together
- [x] Write-time lock enforcement + clear rejection error in the field-link write path (Gap 3), Platform + Simulator
- [x] Entity-scoped authorization layer (Gap 1): reuse existing project-PM / portfolio-manager / PMO-admin membership checks to gate `TierFieldCustomisationPanel` access per node, Platform + Simulator
- [x] Register `risk_register` screen_code in `custom_field_screen_map` plumbing (Gap 5)
- [x] Small `resolveStartNodeId` extension: filter PMO-default fallback by the Risk Register's tag when resolving for that screen (Gap 6)
- [x] Embed `TierFieldCustomisationPanel` on Risk Register settings (Portfolio/Programme/Project tier views), including the "lock as mandatory" control and locked-field UI treatment, Platform + Simulator (Gap 3 UI + Gap 4)
- [x] Wire `RiskRegisterView.jsx`/`EnhancedRiskForm.jsx` to resolve + render + save the extra fields alongside existing fixed columns, Platform + Simulator (Gap 4)
- [x] Manual verify against the confirmed 15→10→8 example, plus the lock rule: covered by unit tests for sticky-disable, mandatory lock, and `checkAncestorFieldLock` (full UI walkthrough still recommended after applying `SQL/v788_*.sql`)
- [x] Review section

## Review

**Status: 100% complete (implementation).** Apply `SQL/v788_pm_template_field_links_locked_and_risk_register_screen.sql` on Supabase before using lock / `risk_register` screen in a live environment.

### What shipped
| Gap | Change |
|---|---|
| 2 | `mergeFieldLinksByChain` sticky disable: `prev.enabled && (link.enabled !== false)`; tracks `sticky_disabled_by_node_id` |
| 3 | SQL `locked` on `public`/`sim.pm_template_field_links`; merge forces enabled when ancestor locked; write-time via `checkAncestorFieldLock` in panel; UI Mandatory lock column + greyed toggles |
| 1 | `pmTemplateAuthService.canManagePmTemplateNode` → panel `canEdit` (RPC `can_manage_pm_template_node`) |
| 5 | `system_screens.screen_code = risk_register` (public + sim) in v788 |
| 6 | `resolveStartNodeId({ category })` — category-scoped entity node + PMO fallback filter; Risk Register uses `category: 'risk_register'` without clobbering generic fields assignment |
| 4 | Risk Register **Settings** tab embeds `TierFieldCustomisationPanel`; `InheritedRiskRegisterFields` on Risk Detail / EnhancedRiskForm |
| 7 | Simulator mirrors (settings uses `simDb` + `getCurrentUserAccountId`) |

### Key files
- `packages/shared/src/services/pmTemplateInheritanceService.js`
- `packages/shared/src/services/pmTemplateAuthService.js`
- `packages/ui/src/TierFieldCustomisationPanel.jsx` (+ app mirrors)
- `SQL/v788_pm_template_field_links_locked_and_risk_register_screen.sql`
- `apps/platform|simulator/.../RiskRegisterView.jsx`, `EnhancedRiskForm.jsx`, `RiskDetail.jsx`
- `apps/.../InheritedRiskRegisterFields.jsx`
- Tests: `packages/shared/src/services/__tests__/pmTemplateInheritanceService.test.js`
