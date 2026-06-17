# v663 — Governance & Standards Menu Rationalisation Plan

## Problem Statement

The **Governance & Standards** sidebar section is polluted with items that belong to other sections. Root causes are:

1. `pmisGapMenuRegistry.js` incorrectly tags `pmo_section_platform_config` (and its children) and `pmo_section_procurement` (and its children) with `category: 'pmo-cat-governance-standards'`.
2. `pmo_notification_prefs` in `pmisGapMenuRegistry.js` also carries `category: 'pmo-cat-governance-standards'`.
3. `pmoMenuConfig.js` has both a singleton `pmo-gov-mandate` ("Project Mandate") and a grouped `pmo-gov-mandates-section` ("Project Mandates >") as children of the same governance section — duplicates.
4. The Supabase `menu_items` table contains stale/misclassified rows that mirror these JS-side errors.

### What the section currently shows (incorrect)
| Item | Why it's wrong |
|---|---|
| Automation Rules | Belongs to Administration (`pmo-cat-admin`) |
| Custom Fields | Belongs to Administration |
| Public Intake Forms | Belongs to Administration |
| Client Portals | Belongs to Administration |
| Vendor Register | Belongs to Financial & Commercial (`pmo-cat-financial-commercial`) |
| Purchase Requests | Belongs to Financial & Commercial |
| Purchase Orders | Belongs to Financial & Commercial |
| Contracts | Belongs to Financial & Commercial |
| Invoice Tracking | Belongs to Financial & Commercial |
| EEF Bulk upload | Stale DB record — not in JS registry; remove |
| Project Mandate (singleton) | Duplicate of the "Project Mandates" group below it |
| Governance > (sub-container) | Stale/mis-parented DB record — remove |
| Notification Preferences | Belongs to Email & Notifications (`pmo-cat-email-notifications`) |

### What the section should contain (target state)
1. Project Mandates > (grouped: Create Mandate / All Mandates / Unlinked Mandates)
2. Approval / Authorisation
3. Communication Management Strategy
4. Configuration Management Strategy
5. Quality Management Strategy
6. Risk Management Strategy
7. ITTO Templates
8. ITTO Drafts
9. Environment Factors
10. Add EEF
11. EEF Drafts

---

## Scope

| File | Change |
|---|---|
| `src/config/pmisGapMenuRegistry.js` | Re-categorise Platform Config + Procurement + Notification Prefs |
| `src/config/pmoMenuConfig.js` | Remove singleton `pmo-gov-mandate` from governance children |
| `src/config/menuRegistry.js` | Remove duplicate `pmo_gov_mandate` registry entry |
| `src/hooks/useMenu.js` | Governance bucket whitelist + orphan re-classification (cache v30) |
| `SQL/v663_governance_menu_rationalisation.sql` | DB mirror of the above + remove stale records |

Platform–Simulator parity: the Simulator governance section is clean (no procurement or platform-config items bleed in there); no Simulator changes required.

---

## Todo List

- [x] **1. Fix `pmisGapMenuRegistry.js`** — Platform Configuration section
  - Change `pmo_section_platform_config` category: `pmo-cat-governance-standards` → `pmo-cat-admin`
  - Change `pmo_admin_automations` category → `pmo-cat-admin`
  - Change `pmo_admin_custom_fields` category → `pmo-cat-admin`
  - Change `pmo_admin_intake_forms` category → `pmo-cat-admin`
  - Change `pmo_admin_client_portals` category → `pmo-cat-admin`

- [x] **2. Fix `pmisGapMenuRegistry.js`** — Procurement section
  - Change `pmo_section_procurement` category: `pmo-cat-governance-standards` → `pmo-cat-financial-commercial`
  - Change `pmo_procurement_vendors` category → `pmo-cat-financial-commercial`
  - Change `pmo_procurement_requests` category → `pmo-cat-financial-commercial`
  - Change `pmo_procurement_orders` category → `pmo-cat-financial-commercial`
  - Change `pmo_procurement_contracts` category → `pmo-cat-financial-commercial`
  - Change `pmo_procurement_invoices` category → `pmo-cat-financial-commercial`

- [x] **3. Fix `pmisGapMenuRegistry.js`** — Notification Preferences
  - Change `pmo_notification_prefs` category: `pmo-cat-governance-standards` → `pmo-cat-email-notifications`

- [x] **4. Fix `pmoMenuConfig.js`** — Remove duplicate singleton
  - Remove the `pmo-gov-mandate` entry ("Project Mandate") from governance children
  - Keep `pmo-gov-mandates-section` (the grouped version)

- [x] **5. Create `SQL/v663_governance_menu_rationalisation.sql`**
  - UPDATE menu_items: re-parent platform-config codes under `pmo_admin_section`
  - UPDATE menu_items: re-parent procurement codes under procurement section
  - UPDATE menu_items: re-parent `pmo_notification_prefs` under `pmo_comms_section`
  - DELETE stale "EEF Bulk upload" DB record (deactivate `org_knowledge_eef_bulk`)
  - DELETE stale "Governance" sub-container DB record (deactivate orphan containers)
  - DELETE `pmo_gov_mandate` singleton DB record (deactivate duplicate)

- [x] **6. Runtime guard (`useMenu.js`)**
  - Unpack `pmo_section_governance` children and re-classify orphans via `matchCategory`
  - Whitelist filter on `pmo-cat-governance-standards` bucket (11 target items only)
  - Extend admin whitelist for platform-config gap menu codes
  - Menu cache bumped to `v30`

- [x] **7. Remove duplicate from `menuRegistry.js`**
  - Removed `pmo_gov_mandate` singleton entry (grouped mandates remain)

---

## Review

**Status:** ✅ 100% complete (2026-05-28)

### Summary of changes

| Area | Change |
|------|--------|
| `pmisGapMenuRegistry.js` | Platform Configuration → `pmo-cat-admin`; Procurement → `pmo-cat-financial-commercial`; Notification Prefs → `pmo-cat-email-notifications` |
| `pmoMenuConfig.js` | Removed duplicate singleton `pmo-gov-mandate`; kept grouped Project Mandates section |
| `menuRegistry.js` | Removed `pmo_gov_mandate` registry fallback entry |
| `useMenu.js` | Governance section unpack + whitelist; extended admin whitelist; cache `v30` |
| `SQL/v663_governance_menu_rationalisation.sql` | Reparent misplaced DB rows; deactivate stale EEF bulk, Governance orphan, mandate singleton |

### Verification

- `npm run validate:menus` — all registry routes valid
- `menuRegistry.test.js` — passing
- Hard refresh required for menu cache `v30`

### Deployment

Run on Supabase (after v659/v660/v661 if not already applied):

```sql
-- SQL/v663_governance_menu_rationalisation.sql
```
