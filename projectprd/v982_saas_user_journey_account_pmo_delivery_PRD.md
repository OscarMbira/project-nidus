# v982 — SaaS User Journey: Account, PMO, Delivery Authority & Menu Architecture PRD

## a) Problem statement

Project Nidus already has real, working SaaS foundations: organisation-first registration, a
multi-step wizard (Account → Organisation → Industry → Professional Role → Verify → Workspace,
built by v918), industry-aware provisioning (`account_industries`, `industry_packs`,
`industry_pack_menu_items`), a working trial/subscription/Paynow lifecycle, an org/project role
system (`roles` + `project_roles` + `project_memberships` + `role_menu_items`), and real, live
Portfolio/Programme entities (confirmed live: 13 portfolios, 18 programmes on the current PMO
dashboard).

What it does **not** yet do is treat six concepts the brief identifies as distinct — Identity,
Commercial/Subscription Ownership, Organisation/Tenant Membership, Organisation/PMO Configuration,
Delivery Assignment/Scope, and Authority/Permission — as actually separate:

- The founder is unconditionally granted **both** `account_owner` and `pmo_admin` at registration,
  regardless of who they actually are (confirmed live — flagged but not resolved by v918's own
  audit).
- Registration is one identical path for a freelancer, a corporate purchaser, and an invited team
  member — no branching by intent.
- PMO configuration exists only as scattered settings pages (industry/capability toggles, custom
  roles, menu bundles) with no guided entry point, and stops well short of the brief's fuller
  vision (methodology/lifecycle/templates/stage gates/approval structures/authorities).
- Portfolios and Programmes exist as entities, but role assignment stops at the project level —
  there is no portfolio- or programme-scoped role/authority model, so a Portfolio Manager's
  authority over their portfolio's programmes/projects is not formally modelled.
- A single identity is effectively anchored to one organisation's context; there is no workspace
  switching for someone who consults for multiple organisations.
- Every persona sees the same dashboard shape; nothing is role-aware.
- There is no tiered Capability Profile concept (Essential/Standard/Advanced/Enterprise) — only
  per-industry-pack toggling.

`Documentation/SaaS_User_Journey_Account_PMO_Delivery_and_Menu_Architecture.md` (referred to below
as "the brief") is the target architecture for all of this. **This PRD adopts the brief's full
scope** — every numbered section is either already delivered, brought into scope here, or
explicitly named as still out of scope with a reason (section (h)). Delivery is sequenced into
phases (section (b)) so that a working MVP slice ships early rather than the whole thing landing
at once; later phases build on earlier ones rather than being independently re-scoped later.

## b) Solution — phased, building on what already exists

Each phase corresponds to one or more of the brief's own sections. Phases are ordered so each is
independently shippable and the next phase's authority/data model depends on the previous one
existing, not on speculative design.

**Phase 1 — Registration entry & Account/PMO separation** (brief §5-8; realistic near-term MVP
slice, ~2-3 weeks given how much of the wizard already exists)
- One branching question after "Start Free": For myself / For my organisation / I was invited.
- "For myself": today's v918 wizard, unchanged, ending with `account_owner` + `pmo_admin` + a
  default delivery role auto-granted (a 1-person workspace has no one else to hold them).
- "For my organisation": today's wizard plus one new step — "Would you also like PMO Admin
  access, or will you invite an administrator?" — closing the exact gap v918's audit flagged.
- "I was invited": formalize routing so a pending invitation is detected and the user never sees
  organisation/industry/subscription setup.
- A guided "Getting Started as PMO Admin" entry point into the configuration surfaces that
  already exist (industry & capability settings, custom roles, menu bundles).

**Phase 2 — Full PMO/Organisation Admin Configuration Zone** (brief §10, §13 Stage 2, §23-24)
- Build out the taxonomy the brief specifies as real, DB-driven configuration: Delivery
  Methodologies, Governance Model, Project Classifications/Complexity Levels, Lifecycle
  Configuration (predictive/agile/hybrid, stage gates, approval gates), Project Standards
  (per-artefact-type standard), Templates (project/programme/portfolio/document/register/report),
  Workflows (approval chains per type), Authorities (delegated authority, approval thresholds,
  escalation levels), Roles & Responsibilities (org/portfolio/programme/project/PMO role
  definitions, default RACI), Reference Data, Naming/ID rules.
- Project Templates become governance engines (§23): a template can define methodology,
  lifecycle, required modules/documents, standard milestones, RAID configuration, governance
  structure, approval gates, required roles — and creating a project from a classified template
  auto-provisions that governance (§24), rather than every PM configuring it by hand.

**Phase 3 — Portfolio/Programme-Scoped Roles & Authority Model** (brief §14-18)
- Extend the existing `project_roles`/`project_memberships` pattern upward: `portfolio_roles` and
  `programme_roles` with their own membership tables, mirroring the already-proven project-level
  shape rather than inventing a new pattern.
- Formal Permission Scopes chain (SaaS/Global → Organisation → Portfolio → Programme → Project →
  Record), each grant explicit about role + scope + permission (brief §16-17) — visibility at a
  parent scope never implies write/approve authority on child objects without its own grant.
- Assignment (what you're responsible for) stays explicitly separate from Authority (what you may
  do) — a user can be assigned to a delivery entity with view-only authority.

**Phase 4 — Workspace Switching** (brief §3, §19)
- A user identity can hold memberships in multiple organisations/personal workspaces.
- A workspace switcher (top-level UI) that recalculates membership, entitlements, role, scope,
  and the resolved menu on switch — no page reload masquerading as a data refresh.

**Phase 5 — Role-Aware Home Pages** (brief §20)
- One configurable dashboard framework (not six separate dashboard engines) with role/context-
  aware widgets: Account Owner Home, PMO Admin Home, Portfolio/Programme/Project Manager Home,
  Freelancer Home — each pulling from the same widget library, differently composed.

**Phase 6 — Capability Profiles** (brief §12)
- Essential/Standard/Advanced/Enterprise profiles as Admin-governed, configurable bundles layered
  on top of (not replacing) the existing per-industry-pack entitlement model from v918.

**Phase 7 — Main Application Zones** (brief §21)
- Top-level navigation restructure into My Work / Delivery / Organisation / Account, each zone
  showing only what's relevant to the signed-in user's roles/scopes — the outermost expression of
  everything Phases 1-6 build underneath it.

Phases 2-7 each warrant their own implementation plan (and, where the scope genuinely branches,
their own PRD) once the phase ahead of them is live — this PRD documents the full target and the
sequencing, not seven simultaneous vertical slices being built at once.

## c) Current-state audit summary

| Area | Current Implementation | Target | Phase | Reuse | Risk |
|---|---|---|---|---|---|
| Registration entry | Single path, no persona branching | Branch by intent before the existing wizard | 1 | v918 wizard | Low |
| Account Owner / PMO Admin grant | Both roles always auto-assigned to founder | Conditional on registration path | 1 | `assignSystemRole()` | Medium — live grant path, needs regression coverage |
| Invited-user path | Exists (`accept-invitation` edge function) | Formalize entry routing only | 1 | Existing edge function | Low |
| Industry provisioning, menu resolution runtime | Fully built, live (v918) | Unchanged throughout | — | Everything | None |
| PMO configuration | Industry/capability toggles, custom roles, menu bundles exist; no methodology/lifecycle/templates/workflows/authorities | Full §10 taxonomy as real DB-governed config | 2 | Existing settings infrastructure, `org_menu_bundles` pattern | Medium-High — genuinely new tables/pages |
| Project templates | Exist as a concept (`pmo_industry_templates`, project-scoped) | Extended into governance engines per §23 | 2 | `pmo_industry_templates` — reconcile, don't duplicate (v918 decision 15 already flagged this as a deferred reconciliation) | Medium |
| Portfolio/Programme entities | **Already exist, live** (13 portfolios, 18 programmes confirmed on current PMO dashboard) | Unchanged as entities; gain scoped roles | 3 | Existing tables | Low for entities themselves |
| Portfolio/Programme-scoped roles | Only project-level `project_roles`/`project_memberships` exist today | New `portfolio_roles`/`programme_roles` + membership tables, same shape as project-level | 3 | `project_roles` pattern | Medium — new tables, RLS, must not weaken existing project-level enforcement |
| Permission scope chain | Org → Project only, no portfolio/programme layer, no record-level | Full SaaS→Org→Portfolio→Programme→Project→Record chain | 3 | Existing RLS patterns | High — touches authorization, needs the most rigorous testing in this whole PRD |
| Workspace switching | Not implemented — effectively 1 org context per session | Multi-org membership + switcher UI | 4 | — | High — genuine data-model change |
| Role-aware dashboards | One dashboard shape per layout | Shared framework, role-aware widgets | 5 | Existing dashboard widget components | Medium |
| Capability Profiles | Per-industry-pack toggling only (v918) | Tiered profiles layered on top | 6 | v918 entitlement tables | Medium — must not conflict with existing toggle model |
| Main application zones | Today's rationalised Core PM sidebar taxonomy (this session) | My Work/Delivery/Organisation/Account top-level restructure | 7 | Today's menu resolution pipeline | High — touches the same fragile `pmoMenuHierarchyUtils.js` pipeline flagged repeatedly this session; needs the harness-verification discipline already established |

## d) User stories

**Phase 1**
1. A prospective user is asked, before any form appears, whether they're signing up for
   themselves, for an organisation, or joining one they were invited to.
2. A "for myself" user lands with full authority over their own workspace without being asked
   team-configuration questions.
3. A "for my organisation" user is explicitly asked whether they want PMO configuration
   authority, and can decline it.
4. An invited user (link or pending invitation) never sees organisation/industry/subscription
   setup.
5. A PMO Admin has a guided entry point into existing configuration surfaces.

**Phase 2**
6. A PMO Admin defines their organisation's methodology, lifecycle model, project
   classifications, and required standards once, in one place — not per-project.
7. A PMO Admin builds a project template that bundles methodology, required documents, standard
   milestones, RAID configuration, and required approval gates; creating a project from that
   template auto-provisions the governance it specifies.
8. A PMO Admin defines delegated authorities and approval thresholds once, applied consistently
   across projects using that classification.

**Phase 3**
9. A Portfolio Manager is assigned to a specific portfolio with a defined role and can see
   roll-up health across its programmes/projects, without that visibility implying they can edit
   individual project schedules.
10. A user can hold different roles at different scopes simultaneously (e.g. PMO Analyst at
    organisation level, Viewer on Portfolio A, Project Manager on Project Y).
11. Authority is never inferred purely from job title, org membership, or parent-scope
    visibility — every write/approve action checks its own explicit grant.

**Phase 4**
12. A freelance consultant with client engagements at three different organisations switches
    between them from one identity, with menus/entitlements/roles recalculating on switch.

**Phase 5**
13. A Portfolio Manager's home page shows portfolio health/programmes/investment/risk without
    being cluttered by individual task-level detail a Project Manager's home page would show.

**Phase 6**
14. A PMO Admin selects a Capability Profile (e.g. "Standard") for their organisation as a
    starting point, then fine-tunes individual capabilities from there rather than starting from
    zero.

**Phase 7**
15. Any user's top-level navigation shows only the zones relevant to their roles — a pure
    delivery contributor never sees an "Account" or "Organisation" zone with nothing they're
    authorised to touch inside it.

## e) Implementation decisions (settled)

1. **Build on what exists at every phase — v918 (industry/registration), the existing
   `project_roles`/`project_memberships` pattern, and the live Portfolio/Programme entities are
   never re-decided, only extended.**
2. **Phases are sequential dependencies, not independent workstreams** — Phase 3's scope model
   needs Phase 1's cleaner role-grant foundation; Phase 5's role-aware dashboards need Phase 3's
   scope model to key off; Phase 7's zone restructure sits on top of everything below it. Do not
   start Phase N+1's implementation before Phase N is live and regression-tested.
3. **Menu visibility is never the security boundary, at any phase** — every phase's authority
   change must be enforced at the RLS/route level; hiding a menu item is a UX convenience only
   (brief §27, §25 — already a standing principle, restated here because Phase 3/7 are exactly
   the kind of change that tempts a menu-only shortcut).
4. **Phase 2's project-template governance engine reconciles with, rather than duplicates,
   `pmo_industry_templates`** — v918 decision 15 already flagged this reconciliation as deferred;
   Phase 2 is where it actually happens.
5. **Existing tenants are never retroactively re-graded by Phase 1**; Phases 3/6/7's changes to
   existing tenants (new scope tables, capability profile defaults, zone restructure) each need
   their own explicit backfill/migration decision made in that phase's own implementation plan,
   not assumed here.

## f) Open decisions — needs your review before implementation plans are written

**Phase 1**
1. Where does an Account Owner who declined PMO Admin land immediately after registration?
   Recommended: Account & Subscription zone with a visible "Invite a PMO Administrator" CTA.
2. Can PMO Admin be self-granted later without an invitation round-trip? Recommended: yes, at
   any time, from Organisation Settings.
3. Does "For myself" always grant all three roles, or ask a lighter version of the PMO question?
   Recommended: always grant — no one else exists to hold them.

**Phase 2**
4. How much of the Templates/Workflows/Authorities taxonomy ships in Phase 2's first slice versus
   a Phase 2b? This is a large taxonomy (§10 alone lists 9 sub-areas) — recommend sequencing
   Methodology/Lifecycle/Classifications first (unblocks template governance), Templates second,
   Workflows/Authorities third, since each of the first two is usable standalone while
   Workflows/Authorities are more valuable once templates exist to attach them to.

**Phase 3**
5. Does a Portfolio Manager's role grant any default project-level visibility across the
   portfolio's projects, or is that a separate, explicit grant per the brief's "no automatic
   right" principle (§16 example)? Recommended: read-only roll-up visibility by default (health,
   milestones, RAID counts), never write/approve — matching the brief's own worked example
   exactly.
6. Should existing projects be retroactively linked into a portfolio/programme structure, or does
   Phase 3 only apply going forward? Recommended: going forward only, with an optional manual
   "attach existing project to a portfolio/programme" action — no forced migration.

**Phase 4**
7. When a user has zero organisations (e.g. their only membership was removed), what do they see?
   Recommended: a "create or join a workspace" landing state, not an error page.

**Phase 6**
8. Are Capability Profiles purely organisational defaults (PMO Admin picks one, then customizes),
   or do they ever gate what a subscription tier is allowed to select? Recommended: purely
   organisational defaults for now — no subscription-tier gating, consistent with v918 decision 8
   (industry packs are free/ungated this phase too) — revisit if/when pricing tiers are designed.

## g) Testing decisions

- **Phase 1**: role-grant correctness per branch; route-level (not menu-only) authorization for
  PMO-configuration routes; existing-tenant regression; invitation routing correctness.
- **Phase 2**: a project created from a governance-defining template provisions exactly the
  configured artefacts/approval gates, no more/fewer; PMO configuration changes apply only within
  the owning organisation (cross-tenant isolation).
- **Phase 3**: the brief's own worked examples become literal test cases — a Portfolio Manager's
  grant on Portfolio A does not grant write access to Project 101 without an explicit project-
  level grant; a user's role at one scope never leaks authority to a sibling scope; direct
  RPC/route access is tested independently of sidebar visibility for every new scope level.
- **Phase 4**: switching workspace fully recalculates entitlements/roles/menu — no stale-cache
  leakage of the previous workspace's data (a real, already-hit bug class this session for
  ordinary role changes; workspace switching raises the stakes considerably).
- **Phase 5**: each role-aware home renders only its own persona's widgets; the shared framework
  itself has no persona-specific forks to maintain in parallel.
- **Phase 6**: selecting a Capability Profile never silently revokes a capability the org already
  has a paying entitlement for.
- **Phase 7**: harness-verified (same before/after-across-all-live-roles discipline established
  in this session's Core PM sidebar work) — a zone restructure is exactly the class of change
  that has caused real regressions in `pmoMenuHierarchyUtils.js` before.
- Every phase: dark/light mode, PWA/mobile, unsaved-changes guard on new forms, loading/error/
  success states (standing CLAUDE.md requirements, not phase-specific).

## h) Out-of-scope items (what remains genuinely out of scope, and why)

- **Public landing page marketing content/design** (brief §4 — nav, hero copy, industry pages) —
  not an architecture concern; a lightweight follow-on once Phase 1's branching exists to link
  into, but content/design work, not part of this PRD.
- **Industry-specific menu taxonomies for industries other than Generic/Core PM** (taxonomy doc
  §4-15) — already explicitly out of scope per this session's earlier v966 initiative; unaffected
  by this PRD.
- **Subscription-tier gating of industry packs or Capability Profiles** — v918 decision 8 already
  settled industry packs as free/ungated this phase; Phase 6's open decision 8 recommends the
  same for Capability Profiles. Actual commercial/pricing-tier design is a separate business
  decision, not an architecture one.
- **A new payment gateway or billing model** — Paynow integration remains as-is; this PRD does
  not touch billing/payment mechanics anywhere in any phase.
- **Separate applications or codebases per industry** — explicitly forbidden by the brief itself
  (§22 final principle equivalent) and consistent with this whole codebase's architecture.

## i) Further notes

- The brief remains the canonical reference for every phase above — each phase's own
  implementation plan should quote the relevant brief section rather than re-deriving intent.
- `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` §17's guidance (deep taxonomy levels
  become tabs/page sections, not sidebar entries) already matches this session's Core PM sidebar
  resolution — Phase 2's Templates/Standards taxonomy and Phase 7's zone restructure should follow
  the same principle, not re-litigate it.
- ROADMAP.md's R1 ("Identity, Organisation, Access & SaaS Foundation") is the strategic milestone
  this whole PRD serves; its completion indicators map roughly to Phases 1, 3, and 4 above.
- Given the full scope now included, **Phase 1 remains the realistic near-term MVP** — it is the
  only phase that doesn't require new scope/authority architecture, and closes the one concrete,
  already-confirmed bug (Account Owner/PMO Admin conflation). Recommend approving this PRD's full
  scope and sequencing, then requesting the Phase 1 implementation plan first, rather than trying
  to plan all seven phases' implementation details before anything ships.
