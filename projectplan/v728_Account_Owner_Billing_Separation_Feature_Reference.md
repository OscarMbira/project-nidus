# v728 – Account Owner & Billing Separation – Feature Reference

**Version range:** v728 → v735  
**Date:** 2026-06-07 (rev. 2)  
**Status:** IMPLEMENTED  
**Related docs:** `Documentation/Role_Menu_Structures.md`, `Documentation/Account_Owner_Billing_Ops_Runbook.md`

---

## Implementation status

| Phase | Status | Deliverables |
|-------|--------|--------------|
| **v728** | ✅ Complete | Role metadata SQL, `Role_Menu_Structures.md` updated |
| **v729** | ✅ Complete | Menu separation canonical + `SQL/v729_*`, cache v31 |
| **v730** | ✅ Complete | Founder dual role in `organisationService.js`, billing email in org setup, `SQL/v730_*` |
| **v731** | ✅ Complete | `postLoginRouter.js`, `SubscriptionExpiryBanner`, `billingAccessService.js` |
| **v732** | ✅ Complete | `BillingAccessGate`, `SubscriptionManagement` guard, `SQL/v732_*` |
| **v733** | ✅ Complete | `account_billing_delegates`, `accountBillingDelegateService.js`, `PmoAdminUserManagement` |
| **v734** | ✅ Complete | Ownership transfer in User Management UI + service |
| **v735** | ✅ Complete | `Documentation/Account_Owner_Billing_Ops_Runbook.md` |

---

## 1. Executive summary

Project Nidus separates **who pays** from **who operates the PMO**, with optional **delegation** so trusted PMO administrators can handle billing without becoming the legal account owner.

| Persona | Base role | Billing privileges | Count per org |
|---------|-----------|-------------------|---------------|
| **Founder / legal owner** | `account_owner` + `pmo_admin` | **Automatic** | **1** |
| **Delegated billing PMO admin** | `pmo_admin` | **Granted** by owner | **0–N** |
| **Standard PMO admin** | `pmo_admin` | **None** | **N** |

---

## 2. Approved product decisions (locked)

- ✅ Founder: `account_owner` + `pmo_admin` on org creation  
- ✅ Healthy billing user → `/platform/dashboard`; 7-day expiry **banner** (not redirect)  
- ✅ Billing-capable users invite `pmo_admin` **without** billing privileges  
- ✅ Only account owner grants/revokes **Account Owner Privileges**  
- ✅ No duplicate “PMO” role  

---

## 8. Versioned implementation plan

### v728 — Role model lock-in

- [x] Approve feature reference (rev. 2)
- [x] Update `Documentation/Role_Menu_Structures.md`
- [x] `SQL/v728_account_owner_role_metadata.sql`

### v729 — Menu separation

- [x] `v671PmoMenuCanonical.js` — `accountSubscription`; remove Subscription from Administration
- [x] `pmoMenuConfig.js`, `pmoSidebarCategories.js`
- [x] `useMenu.js` — `applyBillingMenuPolicy` via `hasBillingAccess`
- [x] `SQL/v729_account_owner_menu_separation.sql`
- [x] Sidebar cache **v31**

### v730 — Registration & org setup

- [x] `organisationService.js` — dual founder roles + `billing_email`
- [x] `OrganisationSetup.jsx` — required billing email
- [x] `SQL/v730_backfill_account_owners.sql`

### v731 — Post-login routing & 7-day banner

- [x] `postLoginRouter.js` — billing-scoped subscription routing
- [x] `PlatformLogin.jsx` — `returnTo` query param
- [x] `SubscriptionExpiryBanner.jsx` in `PMOLayout`
- [x] `billingAccessService.js`

### v732 — Route guards & RLS

- [x] `BillingAccessGate.jsx` + `SubscriptionManagement.jsx`
- [x] `pmoAdminService.js` — exclude `account_owner` from assignable roles
- [x] `SQL/v733_billing_rls.sql`

### v733 — PMO admin invite & billing delegation

- [x] `SQL/v732_account_billing_delegates.sql`
- [x] `accountBillingDelegateService.js`
- [x] `PmoAdminUserManagement.jsx` — `/platform/pmo-admin/users`
- [x] Audit log table in v733 SQL

### v734 — Ownership transfer

- [x] `transferAccountOwnership()` in delegate service
- [x] UI on User Management page (account owner only)

### v735 — Ops runbook

- [x] `Documentation/Account_Owner_Billing_Ops_Runbook.md`

---

## 10. Test plan (acceptance checklist)

### Roles, privileges & menus

- [x] Unit: billing menu strip/inject (`billingMenuUtils.test.js`)
- [x] Unit: Administration subsections (`pmoMenuHierarchyUtils.test.js`)
- [ ] Manual: Founder billing menus without delegate record
- [ ] Manual: Delegate sees Account & Subscription after grant
- [ ] Manual: Standard PMO admin — no billing menus

### Login & routing

- [ ] Manual: Billing user healthy → dashboard
- [ ] Manual: Expiry ≤ 7 days → banner
- [ ] Manual: `past_due` → `/platform/subscription`
- [ ] Manual: `returnTo=/platform/subscription` after login

### Security

- [ ] Manual: Standard PMO admin blocked from subscription page
- [ ] Manual: Delegate cannot grant billing privileges

---

## 12. Approval sign-off

| Item | Status | Date |
|------|--------|------|
| Founder dual role | Approved | 2026-06-07 |
| Dashboard landing + 7-day banner | Approved | 2026-06-07 |
| Delegation + PMO invite rules | Approved | 2026-06-07 |
| Implementation complete | Done | 2026-06-07 |

---

## Key files

| Area | Path |
|------|------|
| Billing access | `src/services/billingAccessService.js` |
| Delegation | `src/services/accountBillingDelegateService.js` |
| Menu policy | `src/utils/billingMenuUtils.js` |
| User Management UI | `src/pages/platform-app/PmoAdminUserManagement.jsx` |
| Post-login | `src/services/postLoginRouter.js` |
| Banner | `src/components/billing/SubscriptionExpiryBanner.jsx` |
| Route guard | `src/components/billing/BillingAccessGate.jsx` |
| Ops runbook | `Documentation/Account_Owner_Billing_Ops_Runbook.md` |

**SQL order:** v728 → v729 → v730 → **v732** → v733
