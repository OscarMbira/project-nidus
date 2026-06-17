# v660 — PMO Administration Section — Complete Rationalisation Plan

**Date:** 2026-05-29
**Scope:** Platform PMO sidebar + Simulator PMO sidebar (parity)
**Trigger:** Screenshot `PMO Menu Segregation v2.png` — full audit reveals 41+ items dumped into PMO Administration from 5 sources
**Depends on:** v659 (complete)

---

## 1. Full Source Audit

Items reaching "PMO Administration" come from **5 distinct sources**:

| Source | File(s) | Count |
|--------|---------|-------|
| A — Static config | `pmoMenuConfig.js` | 10 items |
| B — SQL DB seeds | `v130`, `v153`, `v161`, `v165`, `v182`, `v199`, `v265`, `v393` SQL files | 22+ items |
| C — useMenu.js virtual fallbacks | `useMenu.js` `ensureAdminItem()` | 4 items |
| D — Screenshot DB orphans | `menu_items` with wrong category | 11 items (from v2 screenshot) |
| E — pmisGapMenuRegistry | `pmisGapMenuRegistry.js` | 5 items |

---

## 2. Complete Item-by-Item Verdict

### 2A — From `pmoMenuConfig.js` (static — Source A)

| Item | ID | Verdict | Action |
|------|----|---------|--------|
| Local Data Extensions | `pmo-admin-local-data-extensions` | ✅ Stays | No change |
| Form Templates | `pmo-admin-form-templates` | ✅ Stays | No change |
| Organisation Settings | `pmo-admin-org-settings` | ✅ Stays | No change |
| User Management | `pmo-admin-users` | ✅ Stays | No change |
| Role Menu Access | `pmo-admin-role-menu-access` | ✅ Stays | No change |
| Project Types | `pmo-admin-project-types` | ✅ Stays | Deduplicate DB copy |
| Funding Sources | `pmo-admin-funding-sources` | ✅ Stays | No change |
| Budget Categories | `pmo-admin-budget-categories` | ✅ Stays | No change |
| Subscription | `pmo-admin-subscription` | ✅ Stays | No change |
| Branding | `pmo-admin-branding` | ✅ Stays | Merge with virtual Branding items |

---

### 2B — From SQL DB seeds (Source B)

| Item | SQL File | Verdict | Move To |
|------|----------|---------|---------|
| Assign Roles to Projects | v130 | ❌ Wrong section | People & Resources |
| Send Role Invitations | v130 | ❌ Duplicate | People & Resources (already exists as "Send Invitations") → deactivate |
| Business Cases (section + child) | v265 | ❌ Duplicate | Initiation & Business Justification → deactivate (already in static) |
| All Business Cases | v265 | ❌ Duplicate | deactivate |
| Benefits Review Plans (section + child) | v265 | ❌ Duplicate | Initiation & Business Justification → deactivate (already in static) |
| All Benefits Review Plans | v265 | ❌ Duplicate | deactivate |
| Procurement section | v265 | ❌ Duplicate | Already in Procurement (v659) → deactivate |
| RFP Register (DB copy) | v265 | ❌ Duplicate | Already in Procurement → deactivate |
| Load RFP (DB copy) | v265 | ❌ Duplicate | Already in Procurement → deactivate |
| RFP Drafts (DB copy) | v265 | ❌ Duplicate | Already in Procurement → deactivate |
| Project Types (DB copy) | v153 | ❌ Duplicate | Already in static Admin → deactivate DB copy |
| Project Statuses | v153 | ✅ Valid admin item | Keep in PMO Administration (add to static config) |
| Project Mandates (section) | v161 | ❌ Wrong section | Governance & Standards |
| Create Mandate | v161 | ❌ Wrong section | Governance & Standards |
| All Mandates | v161 | ❌ Wrong section | Governance & Standards |
| Unlinked Mandates | v161 | ❌ Wrong section | Governance & Standards |
| Mandate Pending Approvals | v161 | ❌ Wrong section | Workflows & Approvals |
| Project Briefs (section) | v165 | ❌ Wrong section | Initiation & Business Justification |
| All Briefs | v165 | ❌ Wrong section | Initiation & Business Justification |
| Brief Pending Approvals | v165 | ❌ Wrong section | Workflows & Approvals |
| Quality Management Strategies (section) | v182 | ❌ Wrong section | Governance & Standards (already has QMS item) → deactivate |
| All Quality Strategies | v182 | ❌ Wrong section | Governance & Standards → deactivate (duplicate) |
| Risk Management Strategies (section) | v199 | ❌ Wrong section | Governance & Standards (already has RMS item) → deactivate |
| All Risk Strategies | v199 | ❌ Wrong section | Governance & Standards → deactivate (duplicate) |
| Add users to project | v393 | ❌ Wrong section | People & Resources |

---

### 2C — From `useMenu.js` virtual fallbacks `ensureAdminItem()` (Source C)

| Virtual Item | Verdict | Move To |
|-------------|---------|---------|
| Branding & Identity | ⚠️ Partial | Merge into Branding row in static Admin |
| Branding History | ⚠️ Partial | Add to Branding sub-items in static Admin |
| Platform Settings | ❌ Wrong section | System Administration |
| PWA Settings | ❌ Wrong section | System Administration |

---

### 2D — Screenshot DB orphans (Source D — items visible in v2.png)

| Item | Verdict | Move To |
|------|---------|---------|
| Platform Settings | ❌ Duplicate of 2C | System Administration |
| End Project Report | ❌ Duplicate | Reporting & Assurance → deactivate DB copy |
| Releases | ❌ Wrong section | Delivery Management → Projects |
| Process Assets | ❌ Wrong section | Knowledge & Assets |
| Project Mandates | ❌ Duplicate of 2B | Governance & Standards → deactivate DB copy |
| Administration (nested →) | ❌ Confusing duplicate | Remove / deactivate |
| Add OPA | ❌ Wrong section | Knowledge & Assets |
| Scrum of Scrums | ❌ Wrong section | Delivery Management → Agile & Lean Tools |
| Pending AI Reviews | ❌ Wrong section | Email & Notifications → Communications |
| OPA Drafts | ❌ Wrong section | Knowledge & Assets |
| Settings (nested →) | ❌ Confusing duplicate | System Administration → deactivate DB copy |
| OPA Bulk upload | ❌ Wrong section | Knowledge & Assets |
| Value Stream Map | ❌ Wrong section | Delivery Management → Agile & Lean Tools |
| Kaizen Board | ❌ Wrong section | Delivery Management → Agile & Lean Tools |
| Lean Metrics | ❌ Wrong section | Reporting & Assurance |
| Agile Metrics Hub | ❌ Wrong section | Reporting & Assurance |

---

### 2E — From `pmisGapMenuRegistry.js` (Source E)

| Item | Current Category | Verdict | Move To |
|------|-----------------|---------|---------|
| Automation Rules | `pmo-cat-governance-standards` | ⚠️ Check | Consider Workflows & Approvals |
| Custom Fields | `pmo-cat-governance-standards` | ✅ OK as-is | Keep in Governance / Admin area |
| Public Intake Forms | `pmo-cat-governance-standards` | ⚠️ Check | Could be Workflows & Approvals |
| Client Portals | `pmo-cat-governance-standards` | ⚠️ Check | Could be separate section |
| Integrations Hub | `pmo-cat-governance-standards` | ❌ Wrong | PMO Administration |

---

## 3. Summary — Where Every Item Lands

### ✅ STAYS in PMO Administration (13 items — all legitimate admin)

| Item | Source | Note |
|------|--------|------|
| Local Data Extensions | Static | — |
| Form Templates | Static | — |
| Organisation Settings | Static | — |
| User Management | Static | — |
| Role Menu Access | Static | — |
| Project Types | Static | Deactivate SQL duplicate |
| Project Statuses | SQL v153 | Add to static config |
| Funding Sources | Static | — |
| Budget Categories | Static | — |
| Subscription | Static | — |
| Branding | Static | Absorb Branding & Identity + Branding History |
| Integrations Hub | pmisGap | Move from Governance → Admin |
| Draft Queue (Expiry + Org Drafts) | pmMenuConfig | Already referenced — confirm visible |

---

### ❌ MOVES — Destination Mapping

| Destination Section | Items Moving There |
|--------------------|-------------------|
| **Initiation & Business Justification** | Project Briefs (section + All Briefs) |
| **Governance & Standards** | Project Mandates (section + Create + All + Unlinked) |
| **Workflows & Approvals** | Mandate Pending Approvals, Brief Pending Approvals |
| **People & Resources** | Assign Roles to Projects, Add users to project |
| **Reporting & Assurance** | Lean Metrics, Agile Metrics Hub |
| **Delivery Management → Projects** | Releases |
| **Delivery Management → Agile & Lean Tools** (new sub-group) | Scrum of Scrums, Value Stream Map, Kaizen Board |
| **Knowledge & Assets** (new section — category exists but empty) | Process Assets, Add OPA, OPA Drafts, OPA Bulk upload |
| **Email & Notifications → Communications** | Pending AI Reviews |
| **System Administration** (new section — category exists but empty) | Platform Settings, PWA Settings |

---

### 🗑️ DEACTIVATE (DB duplicates of static config items)

| Item | Reason |
|------|--------|
| Business Cases + All Business Cases (DB) | Already in Initiation & Business Justification static config |
| Benefits Review Plans + All BRP (DB) | Already in Initiation static config |
| Procurement section + RFP items (DB) | Already in Procurement static config (v659) |
| Project Types (DB copy) | Already in Admin static config |
| Quality Management Strategies section | Already have QMS in Governance static config |
| Risk Management Strategies section | Already have RMS in Governance static config |
| End Project Report (DB) | Already in Reporting & Assurance static config |
| Project Mandates (DB duplicate from screenshot) | Already handled via v161 entries |
| Administration nested sub-item | Confusing duplication — remove |
| Settings nested sub-item | Confusing duplication — remove |
| Send Role Invitations (DB) | Already in People & Resources as "Send Invitations" |

---

## 4. New Sections to Add to `pmoMenuConfig.js`

Two category buckets (`pmo-cat-knowledge-assets` and `pmo-cat-system-admin`) are defined in
`pmoSidebarCategories.js` but have **zero items** in `pmoMenuConfig.js` — this is why orphaned
items fall through to PMO Administration as a fallback.

### 4A — Knowledge & Assets (new section, order: 10.5)
```
Knowledge & Assets
├── Org Knowledge Hub         /platform/org-knowledge
├── Process Assets            /pmo/knowledge/opa
├── Add OPA                   /pmo/knowledge/opa/new
├── OPA Drafts                /pmo/knowledge/opa/on-hold
└── OPA Bulk upload           /pmo/knowledge/opa/bulk-upload
```

### 4B — System Administration (new section, order: 15)
```
System Administration
├── Platform Settings         /platform/settings
└── PWA Settings              /platform/pwa-settings
```

### 4C — Agile & Lean Tools (new sub-group under Delivery Management, order: 4)
```
Delivery Management
└── Agile & Lean Tools
    ├── Scrum of Scrums       /pmo/agile/scrum-of-scrums
    ├── Value Stream Map      /pmo/agile/value-stream-map
    └── Kaizen Board          /pmo/agile/kaizen
```

### 4D — Items to add to existing sections

| Section | New Items |
|---------|-----------|
| Reporting & Assurance | Lean Metrics, Agile Metrics Hub |
| Delivery Management → Projects | Releases |
| Email & Notifications → Communications | Pending AI Reviews |
| Governance & Standards | Project Mandates sub-section (Create / All / Unlinked — Pending Approvals → Workflows) |
| Initiation & Business Justification | Project Briefs sub-section (All Briefs — Pending Approvals → Workflows) |
| People & Resources | Assign Roles to Projects, Add users to project |
| PMO Administration | Project Statuses, Integrations Hub |
| Workflows & Approvals | Mandate Pending Approvals, Brief Pending Approvals |

---

## 5. Changes Required Per File

### `pmoMenuConfig.js`
- [x] Add Project Statuses to Administration children
- [x] Add Integrations Hub to Administration children
- [x] Add Branding History and Branding & Identity as Branding sub-items (or merge labels)
- [x] Add new "Knowledge & Assets" section with 5 items
- [x] Add new "System Administration" section with 2 items
- [x] Add "Agile & Lean Tools" sub-group to Delivery Management
- [x] Add Lean Metrics + Agile Metrics Hub to Reporting & Assurance
- [x] Add Releases to Projects sub-section
- [x] Add Pending AI Reviews to Communications sub-group in Email & Notifications
- [x] Add Project Mandates sub-section to Governance & Standards
- [x] Add Project Briefs sub-section to Initiation & Business Justification
- [x] Add Mandate / Brief Pending Approvals to Workflows & Approvals
- [x] Add Assign Roles + Add users to project to People & Resources

### `menuRegistry.js` (Platform)
- [x] Add registry entries for Knowledge & Assets section (container + 5 leaves)
- [x] Add registry entries for System Administration section (container + 2 leaves)
- [x] Add Agile & Lean Tools entries (3 leaves, parent: Delivery Management)
- [x] Add Lean Metrics + Agile Metrics Hub entries
- [x] Add Releases entry
- [x] Add Pending AI Reviews entry
- [x] Add Project Statuses + Integrations Hub entries under Admin
- [x] Fix `category` for all misplaced DB entries (see section 3)

### `simulatorPMOMenuConfig.js` (Parity — same structure, `/simulator/pmo/` prefix)
- [x] Add "Practice Knowledge & Assets" section (OPA items)
- [x] Add Agile & Lean Tools sub-group
- [x] Add Lean Metrics + Agile Metrics Hub to Reporting
- [x] Add Releases to Projects
- [x] Add System Administration section
- [x] Add Pending AI Reviews to Communications
- [x] Add Project Mandates sub-section to Governance
- [x] Add Project Briefs sub-section to Initiation
- [x] Add Project Statuses + Integrations Hub to Administration

### `menuRegistry.js` (Simulator PMO)
- [x] Mirror all Platform registry entries with `sim_pmo_` prefix and `/simulator/pmo/` routes

### `SQL/v660_pmo_admin_rationalisation.sql`

**UPDATE category for misplaced items:**
- [x] OPA items → `pmo-cat-knowledge-assets`
- [x] Agile & Lean items → `pmo-cat-delivery-management`
- [x] Lean Metrics, Agile Metrics Hub → `pmo-cat-reporting-intelligence`
- [x] Platform Settings, PWA Settings → `pmo-cat-system-admin`
- [x] Releases → `pmo-cat-delivery-management`
- [x] Pending AI Reviews → `pmo-cat-email-notifications`
- [x] Project Mandates, Create/All/Unlinked Mandates → `pmo-cat-governance-standards`
- [x] Project Briefs, All Briefs → `pmo-cat-initiation`
- [x] Mandate/Brief Pending Approvals → `pmo-cat-workflows-approvals`
- [x] Assign Roles, Add users → `pmo-cat-teams`
- [x] Integrations Hub → `pmo-cat-admin`

**SET is_active = false for DB duplicates:**
- [x] Business Cases (DB) + All Business Cases (DB)
- [x] Benefits Review Plans (DB) + All BRP (DB)
- [x] Procurement section + RFP items (DB copies from v265)
- [x] Project Types (DB copy from v153)
- [x] QMS section + All Quality Strategies (DB from v182)
- [x] RMS section + All Risk Strategies (DB from v199)
- [x] End Project Report (DB copy)
- [x] Administration nested sub-item
- [x] Settings nested sub-item
- [x] Send Role Invitations (DB duplicate)

### `useMenu.js`
- [x] Review `ensureAdminItem()` — update so Platform Settings and PWA Settings inject into `pmo-cat-system-admin` not `pmo-cat-admin`
- [x] Update Branding & Identity / Branding History to inject into `pmo-cat-admin` as Branding sub-items (correct)

---

## 6. Final "PMO Administration" After Rationalisation

```
PMO Administration   (13 items — all genuine)
├── Local Data Extensions
├── Form Templates
├── Organisation Settings
├── User Management
├── Role Menu Access
├── Project Types
├── Project Statuses      [ADDED from SQL v153]
├── Funding Sources
├── Budget Categories
├── Subscription
├── Branding
│   ├── Branding & Identity   [merged from virtual fallback]
│   └── Branding History      [merged from virtual fallback]
└── Integrations Hub      [MOVED from pmisGapMenuRegistry]
```

And the sections that receive the relocated items:

```
Knowledge & Assets   [NEW — 5 items]
System Administration   [NEW — 2 items]
Delivery Management → Agile & Lean Tools   [NEW sub-group — 3 items]
Governance & Standards   [GAINS Project Mandates sub-section]
Initiation & Business Justification   [GAINS Project Briefs sub-section]
Workflows & Approvals   [GAINS Mandate + Brief Pending Approvals]
Reporting & Assurance   [GAINS Lean Metrics + Agile Metrics Hub + Releases]
People & Resources   [GAINS Assign Roles + Add users to project]
Email & Notifications → Communications   [GAINS Pending AI Reviews]
```

---

## 7. Implementation Todo List

### Phase 1 — `pmoMenuConfig.js`
- [x] 1.1 Add Project Statuses + Integrations Hub to Administration
- [x] 1.2 Merge Branding & Identity / History as Branding sub-items
- [x] 1.3 Add "Knowledge & Assets" section
- [x] 1.4 Add "System Administration" section
- [x] 1.5 Add "Agile & Lean Tools" sub-group under Delivery Management
- [x] 1.6 Add Lean Metrics + Agile Metrics Hub to Reporting & Assurance
- [x] 1.7 Add Releases to Projects sub-section
- [x] 1.8 Add Pending AI Reviews to Communications sub-group
- [x] 1.9 Add Project Mandates sub-section to Governance & Standards
- [x] 1.10 Add Project Briefs sub-section to Initiation & Business Justification
- [x] 1.11 Add Mandate / Brief Pending Approvals to Workflows & Approvals (new section if needed)
- [x] 1.12 Add Assign Roles + Add users to People & Resources

### Phase 2 — `menuRegistry.js` (Platform)
- [x] 2.1 Add all new section containers + leaves (Knowledge, System Admin, Agile/Lean, etc.)
- [x] 2.2 Fix category assignments for all misplaced items

### Phase 3 — `simulatorPMOMenuConfig.js` (Parity)
- [x] 3.1 Mirror all Phase 1 changes with Practice prefix + `/simulator/pmo/` routes

### Phase 4 — `menuRegistry.js` (Simulator PMO)
- [x] 4.1 Mirror all Phase 2 entries with `sim_pmo_` prefix

### Phase 5 — `useMenu.js`
- [x] 5.1 Fix `ensureAdminItem()` to inject Platform Settings + PWA Settings into `pmo-cat-system-admin`
- [x] 5.2 Confirm Branding virtual items inject into `pmo-cat-admin`

### Phase 6 — SQL Migration (`SQL/v660_pmo_admin_rationalisation.sql`)
- [x] 6.1 UPDATE category for all misplaced items (14 reassignments)
- [x] 6.2 SET is_active = false for all DB duplicates (10 deactivations)

### Phase 7 — Verify
- [x] 7.1 PMO Administration shows exactly 13 genuine admin items *(runtime filter + matchCategory)*
- [x] 7.2 No section has orphaned or duplicate items *(admin bucket whitelist + orphan reclassification)*
- [x] 7.3 Knowledge & Assets, System Administration visible with correct items
- [x] 7.4 Simulator PMO matches Platform PMO structure
- [x] 7.5 Run menu registry unit tests *(12/12 passed; validate:menus 304 entries)*

---

## 8. SQL File
Created as: `SQL/v660_pmo_admin_rationalisation.sql`

## 9. Review

**Completed:** 2026-05-29

### Summary of changes

| Area | What changed |
|------|----------------|
| **Static config** | `pmoMenuConfig.js` + `simulatorPMOMenuConfig.js` — new Knowledge & Assets, System Administration, Workflows & Approvals, Agile & Lean Tools sections; admin gains Project Statuses + Integrations Hub; Branding sub-items; relocated mandates/briefs/people/comms/reporting items |
| **Registry** | 52 new Platform + Simulator entries in `menuRegistry.js`; `pmo_admin_integrations` category moved to `pmo-cat-admin` in `pmisGapMenuRegistry.js` |
| **Categories** | `pmoSidebarCategories.js` — added `pmo-cat-agile-lean` under Delivery Management |
| **Runtime** | `useMenu.js` (cache `v27`) — unpack `pmo_admin_section`, re-classify admin orphans, whitelist PMO Administration to 13 items, nest Branding sub-items, route Platform/PWA settings to System Administration |
| **SQL** | `v660_pmo_admin_rationalisation.sql` — upsert new sections, reparent misplaced rows, deactivate 10+ duplicate DB entries, role seeds |

### Verification
- `npm run validate:menus` — 304 registry entries, all routes valid
- `menuRegistry.test.js` — 12/12 passed

### Deploy note
Run `SQL/v660_pmo_admin_rationalisation.sql` on Supabase to persist DB hierarchy changes. Client-side logic in `useMenu.js` applies rationalisation immediately after hard refresh (menu cache `nidus_menu_v27_`).
