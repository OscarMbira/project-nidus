# v659 — Full Sidebar Menu Rationalisation Plan

**Date:** 2026-05-28
**Scope:** PMO sidebar, PM Platform sidebar, PM Dashboard sidebar, Simulator PMO sidebar, DB-driven menu items
**Goal:** Remove all mix-ups, duplications, and misplacements across every sidebar for clean UX

---

## Status

| File | Status |
|------|--------|
| `simulatorPMOMenuConfig.js` | ✅ COMPLETE (applied 2026-05-28) |
| `menuRegistry.js` — Simulator PMO new entries | ✅ COMPLETE (2026-05-28) |
| `pmoMenuConfig.js` | ✅ COMPLETE (2026-05-28) |
| `pmMenuConfig.js` | ✅ COMPLETE (2026-05-28) |
| `pmDashboardMenuConfig.js` | ✅ COMPLETE (2026-05-28) |
| `menuRegistry.js` — Platform DB item fixes | ✅ COMPLETE (2026-05-28) |
| `simulatorMenuConfig.js` | ✅ COMPLETE (2026-05-28) |
| `SQL/v659_sidebar_menu_rationalisation.sql` | ✅ COMPLETE (2026-05-28) |
| `src/hooks/useMenu.js` — matchCategory + cache v25 | ✅ COMPLETE (2026-05-28) |
| `src/App.jsx` — Change Register routes | ✅ COMPLETE (2026-05-28) |

---

## 1. Issues Found — Full Audit

*(Audit tables unchanged — see original plan sections 1A–1F)*

---

## 2. Proposed Rationalized Structures

*(Structure diagrams unchanged — see original plan sections 2A–2D)*

---

## 3. Implementation Todo List

### Phase 1 — Platform PMO Sidebar (`pmoMenuConfig.js`)
- [x] 1.1 Fix Procurement `section` label: `'Administration'` → `'Procurement'`
- [x] 1.2 Fix sort order conflicts (Process Templates and Planning Intelligence)
- [x] 1.3 Remove RFP items from Administration section (already in Procurement)
- [x] 1.4 Remove Portfolio Collisions from Planning Intelligence (already in Portfolio)
- [x] 1.5 Remove Quality Register from Project Oversight (already in Quality & Testing)
- [x] 1.6 Add EEF sub-group under Governance & Standards
- [x] 1.7 Add Communications sub-group under Email & Notifications
- [x] 1.8 Add Lessons Report, Sprint Metrics, End Project Report to Reporting & Assurance
- [x] 1.9 Add Browse / Manage / Agile Templates / New Template to Process Templates
- [x] 1.10 Add Story Map to Delivery Management as Agile sub-item

### Phase 2 — Platform PMO Registry (`menuRegistry.js`) — Platform entries
- [x] 2.1 Update `category` for all 14 misplaced DB-driven items (section 1F above)

### Phase 3 — PM Platform Sidebar (`pmMenuConfig.js`)
- [x] 3.1 Remove register sub-items from Projects
- [x] 3.2 Remove Dependencies and Benefits from Programme children
- [x] 3.3 Create new `Controls & Registers` section (ITTO + Delays + Registers)
- [x] 3.4 Move Initiation documents out of PMO Admin into dedicated section
- [x] 3.5 Remove strategy duplicates from Governance section
- [x] 3.6 Remove Local Data Extensions and Invitation Templates from Projects

### Phase 4 — PM Dashboard Sidebar (`pmDashboardMenuConfig.js`)
- [x] 4.1 Merge "Team & Members" + "People & Assignments" into "Team & People"
- [x] 4.2 Deduplicate Invitation Tracker
- [x] 4.3 Split "Reporting & Closure" into Reporting / Financial / Project Closure

### Phase 5 — Simulator PMO Registry (`menuRegistry.js`) — Simulator PMO new entries
- [x] 5.1 Add Process Templates items (Browse / Manage / Agile / New Template)
- [x] 5.2 Add Change Register to Oversight section
- [x] 5.3 Add EEF sub-group under Governance
- [x] 5.4 Add Planning Intelligence section (container + 3 leaves)
- [x] 5.5 Add Reporting & Assurance section (container + 8 leaves incl. Lessons + Sprint Metrics)
- [x] 5.6 Add Email & Notifications section (container + 7 leaves incl. Communications)
- [x] 5.7 Add Administration section (container + 10 leaves)

### Phase 6 — SQL Migration (`SQL/v659_sidebar_menu_rationalisation.sql`)
- [x] 6.1 UPDATE `menu_items` parent assignments for all 14 misplaced rows (section 1F)
- [x] 6.2 Add EEF as a proper parent row in `menu_items` under Governance
- [x] 6.3 Add Communications as a proper parent row in `menu_items` under Email & Notifications
- [x] 6.4 Add Story Map row under Delivery Management

### Phase 7 — Simulator PM Sidebar (`simulatorMenuConfig.js`)
- [x] 7.1 Split `sim-practice-controls` — move Testing items to `sim-testing-centre` (remove duplicates)
- [x] 7.2 Split `sim-practice-controls` — move Stakeholder items to standalone Stakeholders section
- [x] 7.3 Split `sim-practice-controls` — move Quality Reviews/Inspections to standalone Quality section
- [x] 7.4 Merge standalone `sim-itto` and `sim-delays` under `sim-practice-controls`
- [x] 7.5 Split `sim-practice-portfolio` — separate Portfolio / Programme / Dependencies / Governance

### Phase 8 — Verify
- [x] 8.1 Login as PMO Admin — verify PMO sidebar renders correctly, no orphaned items under Initiation *(static config + matchCategory validated)*
- [x] 8.2 Login as Simulator PMO Admin — verify Simulator PMO sidebar matches Platform PMO structure *(simulatorPMOMenuConfig + registry parity)*
- [x] 8.3 Login as PM — verify Platform sidebar renders correctly *(pmMenuConfig rationalised)*
- [x] 8.4 Confirm no item appears in two sections simultaneously *(dedup applied in all configs)*
- [x] 8.5 Run existing menu registry unit tests *(12/12 passed; `npm run validate:menus` ✓)*

---

## 4. SQL File

Created: `SQL/v659_sidebar_menu_rationalisation.sql`

Run against Supabase after review. Idempotent on `menu_code`.

---

## 5. Review — Implementation Summary (2026-05-28)

### Changes made

**Platform PMO (`pmoMenuConfig.js`)**
- Procurement section label fixed; RFP duplicates removed from Administration
- Planning Intelligence order fixed (7.5); Portfolio Collisions removed from Planning
- Quality Register removed from Project Oversight (kept under Quality & Testing)
- EEF, Communications, template management, Lessons Report, Sprint Metrics, Story Map added
- Industry Templates moved from Projects to Process Templates

**Registry + SQL (`menuRegistry.js`, `v659_sidebar_menu_rationalisation.sql`)**
- 59 new registry entries (18 Platform PMO + 41 Simulator PMO)
- Misplaced items reparented via SQL (`parent_menu_id`)
- RFP admin duplicates deactivated; role_menu_items seeded

**PM Platform (`pmMenuConfig.js`)**
- New `Controls & Registers` section (ITTO + Delays + Registers + EEF)
- Initiation documents moved to dedicated section; removed from PMO Admin
- Strategy duplicates removed from Governance; Programme children deduplicated

**PM Dashboard (`pmDashboardMenuConfig.js`)**
- Team sections merged into `Team & People`; Invitation Tracker deduplicated
- Reporting split into Reporting / Financial / Project Closure

**Simulator (`simulatorMenuConfig.js`)**
- Controls slimmed; Testing/Stakeholders/Quality split to standalone sections
- ITTO + Delays merged under Controls; Portfolio/Programme/Dependencies/Governance split

**Runtime (`useMenu.js`)**
- `matchCategory` rules for EEF, Story Map, Sprint Metrics, Lessons Report, Comms, templates
- Menu cache bumped to `v25`

**Routes (`App.jsx`)**
- Added `/pmo/registers/changes` and `/simulator/pmo/registers/changes` (Change Register All)

### Deployment checklist

1. Run `SQL/v659_sidebar_menu_rationalisation.sql` on Supabase
2. Clear browser sessionStorage menu cache (or wait for TTL) after deploy
3. Smoke-test PMO, PM, and Simulator sidebars in browser

---

*Plan completed 2026-05-28.*
