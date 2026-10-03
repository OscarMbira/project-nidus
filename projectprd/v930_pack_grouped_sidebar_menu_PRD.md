# v930 — Pack-Grouped Sidebar Menu PRD

## a) Problem statement

The sidebar's top-level groups (Executive Overview, Portfolio & Delivery, Workflows &
Governance, People & Resources, Knowledge & Operations, Administration, System
Administration, plus the separate Structured/Standards-Based/Agile methodology tracks) are
organised entirely by **PM function** — a design carried forward from v638/v671/v676, before
the v918 SaaS Industry-Aware Tenant Provisioning initiative existed.

v918 already built a real, working **entitlement pipeline** — `industry_packs`,
`industry_pack_menu_items`, `organisation_disabled_capabilities`, and the
`get_account_available_menu_item_ids()` RPC (v924) — that decides *which* menu items an
organisation can see, composed from: the org's always-on Generic PM pack (modelled as the
`industry_packs` row for the Cross-Industry/"General Project Management" category), plus
whichever industry pack(s) the org has explicitly selected, minus anything the org has opted
out of. This matches the layered composition described in
`Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md` §12–15 ("Global Menu
Definition → Core Pack / Generic PM Pack / Industry Pack / Optional Feature Packs →
Organisation Assignments → Role Permissions").

That pipeline is real, but it is **invisible** — it only narrows which items exist inside the
old function-based groups. A user has no way to see *why* an item is in their menu, or that
their organisation's industry selection had anything to do with what they're looking at. The
sidebar today looks identical to how it looked before v918 shipped, regardless of which
industry pack(s) are enabled.

The brief's diagram describes a **visible** composition (Core/Generic PM → Industry Pack →
Org Assignment → Role Permission, each a distinct layer feeding the next), not merely an
invisible filter. This PRD closes that gap: the sidebar's top-level structure itself should
reflect pack composition, not just PM function.

## b) Solution

Replace the sidebar's top-level grouping principle from "PM function" to "pack source":

- **Core Project Management** — one merged top-level section covering everything the org
  always has: the Generic PM / Cross-Industry pack's items, plus any menu item that was never
  classified into any `industry_pack_menu_items` row at all (today's fail-open items). The
  existing functional groupings (Portfolio & Delivery, Workflows & Governance, People &
  Resources, Knowledge & Operations, Administration, System Administration, etc.) — and the
  Structured/Standards-Based/Agile methodology tracks — survive **nested inside** this section
  as sub-headers, unchanged in their internal item composition.
- **One section per enabled industry pack**, ordered primary-industry-first, for whichever
  industry pack(s) the organisation has actually selected (via Organisation Settings →
  Industries & Capabilities). An organisation that has only the Cross-Industry default (i.e.
  hasn't picked a real industry — the common case for every pre-v918 account) sees **no**
  extra sections; its Cross-Industry pack items live inside Core Project Management as
  described above.
- Items an org has opted out of via `organisation_disabled_capabilities` continue to be
  excluded entirely, same as today — this PRD does not touch that mechanism.
- Role-granted filtering (`role_menu_items`) continues to apply on top, same as today. A pack
  section that ends up with zero visible items for a given role does not render at all.
- "Optional Feature Packs" (the fourth box in the brief's diagram) has **no backing data
  today** — there is no table distinguishing a purchasable/toggleable feature pack from an
  industry pack. This PRD does not invent that concept; see Out-of-scope.

This is a **frontend regrouping only**. No new database tables, no changes to
`get_account_available_menu_item_ids()`'s selection logic, no changes to which items an org
can see — only how the already-resolved set of visible items is organised into top-level
sidebar sections.

## c) User stories

1. As a user at an organisation with no industry selected (or only the Cross-Industry
   default), I see a sidebar that looks the same as it does today — one "Core Project
   Management" top-level section containing all the familiar functional sub-groups.
2. As a user at an organisation that has selected the Banking industry, I see a "Banking
   Industry Pack" section in addition to Core Project Management, containing whichever items
   `industry_pack_menu_items` assigns to the Banking pack that my role also grants.
3. As a user at an organisation with two industries selected (e.g. Banking as primary,
   Construction as secondary), I see two separate industry sections, Banking listed before
   Construction.
4. As a user, within Core Project Management I still see Portfolio & Delivery, Workflows &
   Governance, People & Resources, etc. as sub-groups, in their current order — my existing
   navigation muscle memory is preserved.
5. As a user, the Structured / Standards-Based / Agile methodology-track sections still appear
   nested inside Core Project Management, still controlled by the existing "Methodology Focus"
   selector at the top of the sidebar — this PRD does not change methodology-track behaviour,
   only where it visually sits.
6. As a PMO admin, if I disable a specific item via Organisation Settings → Modules &
   Capabilities, that item disappears from wherever it was showing (Core or an industry
   section) exactly as it does today.
7. As a user whose role doesn't grant any item in a given industry pack, that industry's
   section does not appear in my sidebar at all (no empty section headers).
8. As a user of an account created before v918 (Cross-Industry only, no explicit industry
   selection), my sidebar is unaffected by this change — same items, same Core Project
   Management grouping, no new empty sections.
9. As a Simulator user, the same pack-based grouping applies to my sidebar under the
   equivalent `sim_pmo_cat_*` / `sim.industry_packs` data, per Platform–Simulator parity.
10. As a developer extending the menu later, adding a new industry pack via
    `industry_pack_menu_items` automatically produces a new top-level sidebar section once an
    org selects it — no frontend code change required per new industry.

## d) Implementation decisions

1. **Visible form:** full re-grouping of top-level sidebar sections by pack source, not a
   per-item badge and not an admin-only view. *(User decision.)*
2. **Core + Generic PM merge:** shown as one "Core Project Management" section, not two
   separate sections — both are always-on for every org, so splitting them adds a distinction
   with no practical difference to any user. *(User decision.)*
3. **Functional sub-headers survive, nested:** Portfolio & Delivery, Workflows & Governance,
   People & Resources, Knowledge & Operations, Administration, System Administration, etc.
   remain as nested sub-headers inside whichever top-level pack section their items belong to
   (in practice, almost entirely inside Core Project Management, since these functional
   categories are themselves part of the Generic PM pack today). *(User decision.)*
4. **Methodology tracks:** Structured / Standards-Based / Agile nest inside Core Project
   Management as additional sub-headers, alongside the existing sub-headers above; the
   existing "Methodology Focus" dropdown and its localStorage-backed visible-track resolution
   are unchanged. *(User decision.)*
5. **Multi-industry orgs:** one section per enabled industry pack, ordered primary industry
   first, then remaining selected industries in whatever order `account_industries` returns
   them (no additional sort key introduced). *(User decision.)*
6. **Cross-Industry / unclassified items:** the Cross-Industry pack's items, AND any menu item
   never assigned to any `industry_pack_menu_items` row for any pack (today's fail-open
   items), both live inside Core Project Management. No separate "Cross-Industry Pack" or
   "Unclassified" section is shown. *(User decision + existing v924 fail-open precedent.)*
7. **Rollout:** ship directly, no feature flag. Given rule 66 and the precedent of
   `INDUSTRY_MENU_AVAILABILITY_ENABLED`/`ACCOUNT_EMAIL_VERIFICATION_ENABLED` in this same
   codebase, this is a deliberate deviation from that precedent, made explicitly by the user
   for this change. *(User decision — see Further notes for the mitigation this implies for
   the testing bar.)*
8. **Scope:** both Platform and Simulator, in the same change, per CLAUDE.md's
   Platform–Simulator parity rule (34.1) — Simulator already runs the same
   `pmoMenuHierarchyUtils.js` pipeline (its own copy) with `sim_pmo_cat_*` category codes and
   has its own `sim.industry_packs` schema from the v918 initiative. *(User decision.)*
9. **Pack-membership derivation:** a resolved menu item belongs to an industry section if its
   `menu_item_id` appears in `industry_pack_menu_items` for that industry's pack; otherwise
   (including the Cross-Industry pack's own items) it belongs to Core Project Management. This
   reuses existing v920 data — no new classification table. *(Derived from existing schema,
   not a new user decision.)*
10. **Ordering of top-level sections:** Core Project Management first, then one section per
    enabled industry (primary first), matching the diagram's left-to-right composition order.
    *(Derived default, low-risk — flagged here rather than asked as a separate interview
    question.)*
11. **Empty-section suppression:** a pack section with zero role-visible items after all
    existing filters (org availability + role grants) does not render — same principle already
    used for empty functional categories today. *(Derived default from existing behaviour.)*

## e) Testing decisions

- Pure-function unit tests in `packages/config/src/__tests__/pmoMenuHierarchyUtils.test.js`
  (and its Platform/Simulator copies, kept in sync) for the new pack-bucketing function:
  given a resolved node list + a set of `industry_pack_menu_items` mappings + an org's
  selected industries, assert the correct top-level section assignment, section ordering, and
  correct nesting of the existing functional sub-headers inside Core Project Management.
- Regression coverage for: zero industries selected (Cross-Industry only) → sidebar unchanged
  from pre-v930 behaviour; one industry selected → exactly one extra section; two industries
  selected → two extra sections in primary-first order; an item unclassified in
  `industry_pack_menu_items` → lands in Core; an industry section with all items role-filtered
  out → section does not render.
- Because this ships without a feature flag (decision 7), manual verification against a
  handful of real accounts (a Cross-Industry-only account, a single-industry account, a
  multi-industry account, each with at least one narrow-role user) is required **before**
  calling this done — captured as a manual test checklist in the implementation plan's Phase
  covering verification, mirroring the structure already used for
  `Documentation/v918_SaaS_Industry_Tenant_Provisioning_Manual_Test_Guide.md`.
- Existing `useMenu.js`/`useSimMenu.js` tests (fail-open filter logic, 6/6 each per prior
  session work) must continue passing unmodified — this PRD does not touch that filter, only
  what happens to its output afterward.

## f) Out-of-scope

- **Optional Feature Packs** — the diagram's fourth composition layer has no backing
  data model today (no table distinguishes a toggleable feature pack from an industry pack).
  Not invented here. If/when that concept is built, it would need its own PRD covering the
  schema, entitlement/subscription-tier interaction, and where it sits relative to Core and
  Industry sections.
- **Per-item "why am I seeing this" badges or tooltips** — considered and explicitly not
  chosen (see interview decision 1); may be revisited later as a smaller, separate,
  purely-additive change.
- **Admin-facing pack composition/audit view** — Organisation Settings already has an
  Industries & Capabilities page (v918 Phase 7) for selecting industries and toggling
  capabilities; this PRD does not add a new admin view, only changes end-user sidebar
  rendering.
- **Changes to `get_account_available_menu_item_ids()` or any RLS/availability logic** — the
  set of items a user can see is unchanged; only their visual grouping changes.
- **Changes to `organisation_disabled_capabilities` behaviour** — opted-out items remain
  excluded exactly as today.
- **A feature flag / gradual rollout mechanism** — explicitly declined by the user for this
  change (decision 7).

## g) Further notes

- Because this ships live with no flag, the implementation plan should still land in small,
  independently-revertible commits (per rule 6 of the Standard Workflow) so any single piece
  can be rolled back via `git revert` without reverting the whole change, even though there's
  no runtime toggle.
- The brief document (`Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md`) §14
  explicitly bans hardcoded sidebar trees; this PRD's bucketing logic derives section
  membership from `industry_pack_menu_items` (DB data) rather than hardcoding which menu
  codes belong to which industry, so new industries/packs added later need no frontend code
  change — only new DB rows.
- This PRD was scoped following a live investigation of a user-reported "menu doesn't match
  the diagram" observation; see conversation history for the fact-finding that preceded it
  (confirmed DB `sort_order`/`menu_label` for existing categories already agree with the
  frontend fallback config, and a related, narrower compliance fix — making
  `applyCategorySortOrders()` a "missing-only" fallback instead of an unconditional override —
  was already applied ahead of this PRD, independently of this scope).
