# v805 — Global vs Organisational Template Libraries, Bulk Copy, Full CRUD, Downstream Inheritance

**Depends on:** v798 (Template Library + Copy), v804 (process_template account-level RLS) — both shipped.

## Goal
1. **Two sidebar sections**, not one mixed list: **Global Template Library** (staff-authored, read-only + copy) and **Organisational Templates** (the account's own copies/customisations).
2. **Bulk copy** — select all or selected rows in the Global library and copy them to Organisational in one action, not one row at a time.
3. **Full CRUD** on Organisational Templates — Create (already exists via Copy), **Read, Update, Delete** (none of which exist yet).
4. **Downstream tiers (Portfolio/Programme/Project) use the Organisational Library**, not the raw Global master, once an org copy exists.

## Current state (researched, not assumed — this changes the plan)
- One page (`TemplateLibraryPage.jsx`) mixes `is_system_synced=true` and `=false` rows today with a single per-row Copy button.
- **Critical finding: copying today does not make downstream tiers prefer the copy.** `resolveStartNodeId`'s fallback query (`pmTemplateInheritanceService.js`) explicitly does `.order('is_system_synced', { ascending: false })` — sorts the **global** master before the org's own copy as the tiebreak. Goal #4 needs new wiring, not something that falls out for free from Copy existing.
- That same resolver is built for "one governing document per domain" (Fields, Industry Plan, OPA) — `process_template` doesn't fit that shape, since it represents **many independently-named documents per domain** (24 different document types, each with many titled instances). A domain-wide singular resolver is the wrong tool for "prefer my org's version of *this specific* template" — the right key is `parent_node_id` (already set to the global source's node id by `copyTemplateNodeForAccount`), not domain/category.
- **No update or delete function exists on `pm_template_nodes` at all** (`pmTemplateNodeService.js`) — only `createPmoFieldTemplateNode`, `createTierFieldTemplateNode`, `createTierDocumentTemplateNode`, `getTemplateNode`, `listFieldTemplateNodes`, `listFieldLinksForNode`, `upsertFieldLink`, `publishTemplateNode` (status flip only), `getOrCreateEntityAssignment`.
- **No edit UI is wired to `pm_template_nodes` for any domain.** `PmoFieldTemplateDetailPage.jsx` is view-only (plus a Publish button). `OPAEdit.jsx`/`FormTemplateBuilder.jsx` exist and edit the underlying `organisational_process_assets`/`form_templates` rows directly, but neither currently links back to/from a `pm_template_nodes` row — that link needs verifying/wiring, not assuming it's there.
- **No bulk-select pattern exists anywhere in the codebase** (checked `apps/platform/src`, `packages/ui/src` — nothing beyond textarea/CSV bulk-invite). This is new UI to build, not something to reuse.
- `pm_template_nodes.parent_node_id` on a copy already points at the global source node's id (`parentNodeId: source.id` in `copyTemplateNodeForAccount`) — this is the correct FK for "does my org have an override of this exact global template."

## Design decisions (flagging for approval, per your ask — not building until you approve)

1. **Two separate pages, not one page with a mode toggle.** `TemplateLibraryPage.jsx` narrows to `is_system_synced=true` only (Global). New `OrganisationalTemplatesPage.jsx` (+ Simulator mirror) shows `is_system_synced=false AND account_id=mine`. Two menu leaves under the existing Templates section (`plat_tpl_library` stays Global; new `plat_tpl_organisational` / `sim_tpl_organisational`).

2. **Downstream inheritance via a new targeted helper, not a resolver-order flip.** Flipping `resolveStartNodeId`'s tiebreak would change default behaviour for Fields/Industry-Plan/OPA too (single-governing-document domains where that resolver is the correct tool) — too broad and behaviour-changing for every account, not just ones who've customised. Instead: a new `resolveAccountTemplateOverride(db, { accountId, globalNodeId })` — looks up a current, non-deleted node with `parent_node_id = globalNodeId` and `account_id = accountId`, returns it if found else `null`. Used to substitute the org's row wherever a global one would otherwise show/apply for that account — silent substitution (no extra click), since "customise once, apply everywhere downstream" is the stated intent.
   - **Open question for you:** I haven't found an existing "apply this template to my project" surface beyond the Library itself (the `?entityType=project&entityId=…` params the Library already accepts suggest the Library *is* that surface today). Phase 4 starts with confirming that rather than assuming a consumer UI exists elsewhere.

3. **Bulk copy runs sequentially with a results summary**, not `Promise.all` — some domains fail by design (`form_template`) or by permission gap, and a clean per-row report ("18 copied, 2 skipped: form_template not supported, 1 failed: <reason>") is more useful than one aborted batch or a wall of parallel toasts.

4. **Update scope, deliberately narrow for v1:** reuse the existing `OPAEdit.jsx` for `opa` rows. For `process_template` (24 different document shapes) and level templates (portfolio/programme/project — JSON payload on the node), a **generic editor** (title/description/raw JSON or key fields) rather than 24 bespoke forms — flag as a v1 simplification, not a gap to silently accept forever.

5. **Delete is a soft-delete** on the `pm_template_nodes` row only — leaves the underlying domain-content row (e.g. the `team_performance_assessments` row) untouched, to avoid orphaning content that might be referenced elsewhere. New `archiveTemplateNode()` in `pmTemplateNodeService.js`. **Correction found during implementation:** `pm_template_nodes` has no `is_deleted` column at all (checked the actual schema, `SQL/v764`) — only `is_current`, already this table's established "no longer active" convention (used for version supersession), and already what every read query here filters on. Delete sets `is_current=false`, not a nonexistent `is_deleted`.

## Scope

### Phase 1 — Split into two pages + two menu entries
- Narrow `TemplateLibraryPage.jsx` (+ sim mirror) to `is_system_synced=true` only; relabel "Browse published Global Templates" copy.
- New `OrganisationalTemplatesPage.jsx` (+ sim mirror) — same table/card/export/row-number scaffolding (`@nidus/ui`), filtered to the account's own rows.
- New SQL migration: `plat_tpl_organisational` / `sim_tpl_organisational` menu leaves alongside the existing `plat_tpl_library` / `sim_tpl_library`, same role grants as `v802`.

### Phase 2 — Bulk select + bulk copy (Global Template Library)
- Checkbox column + "select all (current filter)" + bulk toolbar ("Copy N to Organisational").
- Sequential copy loop over `copyTemplateNodeForAccount`; results summary toast/modal.

### Phase 3 — Organisational Templates CRUD
- **Read:** new detail page — `pm_template_nodes` metadata + a domain-specific content viewer.
- **Update:** `opa` → link to `OPAEdit.jsx`; `process_template`/level templates → new generic editor.
- **Delete:** `archiveTemplateNode()` service function + confirm-dialog delete action in the list (matches rule 53's justification/confirm pattern already used elsewhere for governed records).

### Phase 4 — Downstream inheritance
- Confirm (don't assume) whether any consuming UI beyond the Library exists for "apply a named template to my project" today.
- Build `resolveAccountTemplateOverride()`; wire into the Global Library list ("you have a custom version →" annotation + link) and into entity-scoped Library browsing (prefer the org's row transparently).

### Phase 5 — Platform/Simulator parity, tests, docs
- Every phase ships to both apps together (rule 34.1).
- Unit tests for `resolveAccountTemplateOverride`, `archiveTemplateNode`, bulk-copy summary logic.
- Update `Documentation/Template_Library_Menu_And_Copy_Guide.md` (or split into a new guide for Organisational Templates).

## Explicitly out of scope for this plan
- Rich per-document-type edit forms for all 24 `process_template` shapes — generic editor only (see decision 4); bespoke forms are a much larger follow-up if needed later.
- Fixing Simulator's process_template RLS gap (flagged previously — zero policies exist on `sim`'s mirror tables). Bulk copy/CRUD for that domain in Simulator will hit the same wall until that's separately fixed; flagging again here so it isn't lost.
- Changing `resolveStartNodeId`'s behaviour for Fields/Industry-Plan/OPA — those stay as-is (decision 2).

## Todo
- [x] Confirm design decisions above, especially #2 (silent substitution) and #4 (generic editor scope)
- [x] Phase 1: split pages + menu SQL
- [x] Phase 2: bulk select + bulk copy
- [x] Phase 3: Read/Update/Delete CRUD
- [x] Phase 4: downstream inheritance helper + wiring (starts with confirming the actual consumer surface)
- [x] Phase 5: parity, tests, docs

## Review

**Completed 2026-07-23.**

### Delivered
| Phase | Artifact |
|---|---|
| 1 | `TemplateLibraryPage.jsx` narrowed to Global-only (both apps); new `OrganisationalTemplatesPage.jsx` (both apps); `SQL/v805_organisational_templates_menu.sql` |
| 2 | Checkbox column + select-all + bulk copy toolbar with sequential copy + results summary, built directly into `TemplateLibraryPage.jsx` (both apps) |
| 3 | `updateTemplateNode` / `archiveTemplateNode` (`pmTemplateNodeService.js`); `pmTemplateContentService.js` (`getNodeContent`, `updateOpaContent`, `updateProcessTemplateContent`); `OrganisationalTemplateDetailPage.jsx` (both apps) — view/edit/retire |
| 4 | `pmTemplateOverrideService.js` (`resolveAccountTemplateOverride`); "you have a custom version →" annotation on Global rows; entity-scoped copy now forks from the override when one exists; `copyTemplateNodeForAccount`'s "must be system-synced" guard relaxed to also allow forking your own org template |
| 5 | Routes wired: `packages/modules/pmo-module/src/routes.jsx` (Platform, unified `app/pmo/*` mount); `apps/simulator/src/routes/SimPmoFederatedOutlet.jsx` + `simulatorRoutes.jsx` (Simulator, separate shell-level route — different mounting convention than Platform, matched rather than unified). 20 new/updated unit tests, all passing (142/142 in `packages/shared` overall). `Documentation/Template_Library_Menu_And_Copy_Guide.md` updated with a new v805 section. |

### Corrections made during implementation (vs. the plan as originally written)
- Delete uses `is_current=false`, not `is_deleted` (that column doesn't exist — see decision 5 above).
- Discovered while building the generic editor: portfolio/programme/project_template domains have **no payload column and no domain_ref catalog row at all** (`SQL/v785` sets `domain_ref_id` to `NULL` for them) — the plan's "generic editor... or key fields" for these domains resolved to "just the node's own name/description/category," not a cut corner.
- `packages/shared/vitest.config.js` uses an explicit file allowlist, not a glob — the two new test files had to be added there too, same gap hit twice earlier in this session for other new test files.

### Known follow-ups (explicitly out of scope per the plan, still true after implementation)
- Simulator's `process_template` RLS gap (zero policies on `sim`'s mirror tables) — bulk copy/CRUD for that specific domain in Simulator still hits this wall.
- 24 bespoke `process_template` edit forms — still a generic JSON editor for v1.
- `resolveStartNodeId`'s Fields/Industry-Plan/OPA behaviour is unchanged, by design.

### Apply order
Add to the existing v798 sequence: `SQL/v805_organisational_templates_menu.sql` last. Same wrong-parent-guess risk as `v800`/`v802` — verify after applying that the menu row's `parent_menu_id` actually resolved (see the guide's smoke-test section).
