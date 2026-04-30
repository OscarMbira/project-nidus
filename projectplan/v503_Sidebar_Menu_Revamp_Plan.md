# v503 — Sidebar Menu Revamp Plan

**Date:** 2026-04-30  
**Scope:** All 6 sidebar config files × all 10 roles  
**Goals:** Reduce sidebar length · Improve navigability · Professional grouping · No duplication · Full role coverage

---

## 0. Complete Config File Inventory

The system has **6 sidebar config files** across **3 route domains** and **2 systems** (Platform + Simulator).

| Config File | Route Domain | Current Role Coverage | Roles Missing |
|-------------|-------------|----------------------|---------------|
| `pmMenuConfig.js` | `/platform/*` | Project Manager (primary); other roles via permission filter | Sponsor, Team Member, Team Lead, QA, Procurement, Finance, Viewer — **all share this file but have no tailored sections** |
| `pmDashboardMenuConfig.js` | `/pm/*` | Project Manager (separate PM dashboard experience) | Same 7 roles unaddressed |
| `pmoMenuConfig.js` | `/pmo/*` | PMO Admin | System Admin not distinguished from PMO Admin |
| `simulatorMenuConfig.js` | `/simulator/*` | All simulator users (general/landing) | No role filtering at all |
| `simulatorPMMenuConfig.js` | `/simulator/pm/*` | Simulator PM role | Same role gaps as Platform |
| `simulatorPMOMenuConfig.js` | `/simulator/pmo/*` | Simulator PMO Admin | Same as Platform PMO |

### Full Role List (from CLAUDE.md)

| # | Role | Current Sidebar | Gap |
|---|------|----------------|-----|
| 1 | System Admin | Shares `pmMenuConfig.js` (pmo.admin permission) | No distinct admin-only config; mixed with PMO Admin |
| 2 | PMO Admin | `pmoMenuConfig.js` | Partially covered |
| 3 | Project Executive / Sponsor | Shares `pmMenuConfig.js` | Approve-only views not defined; sees full PM menu |
| 4 | Project Manager | `pmMenuConfig.js` + `pmDashboardMenuConfig.js` | Covered but messy |
| 5 | Team Manager / Lead | Shares `pmMenuConfig.js` | No tailored section |
| 6 | Team Member | Shares `pmMenuConfig.js` | Sees far too much; no filtered view |
| 7 | Project Assurance / QA | Shares `pmMenuConfig.js` | Quality/audit items not highlighted |
| 8 | Procurement Manager | Shares `pmMenuConfig.js` | Procurement items scattered |
| 9 | Finance / Cost Controller | Shares `pmMenuConfig.js` | Financial items scattered |
| 10 | Stakeholder / Customer Viewer | Shares `pmMenuConfig.js` | Should be read-only, minimal sidebar |

---

## 1. Current State Audit

### 1.1 Platform PM Menu (`pmMenuConfig.js`) — Problems Found

| # | Problem | Impact |
|---|---------|--------|
| 1 | **16 top-level items** — no grouping hierarchy | Sidebar is overwhelming |
| 2 | **Testing & QA duplicated** — `platform-testing-centre` (13 children) AND `platform-testing-qa` (7 children) both exist | Confusion, redundant entries |
| 3 | **Process Group Forms** added as standalone AND Projects already has Risk Register, Issue Log, Change Log, Requirements, Status Reports as direct children | Overlap and inconsistency |
| 4 | **"My Daily Log Entries"** and **"My Lesson Actions"** are orphaned standalone top-level items | Not grouped with personal work items |
| 5 | **"Delays"** is a standalone top-level item | Should be under Controls |
| 6 | **"ITTO Management"** is standalone | Should be under Planning |
| 7 | **"Corporate Lessons"** is standalone (pmo.admin) | Should be under Governance or Admin |
| 8 | **"Project Oversight"** appears standalone (pmo.admin) AND nested inside PMO Admin | Duplicate |
| 9 | **PMO Admin** mixes settings, document management, mandates, briefs, PPDs, draft queues in one list | Unmanageable parent item |
| 10 | **Portfolio, Programme, Dependencies, Benefits, Strategy** are all separate top-level items | Could be one "Portfolio & Programme" group |
| 11 | **Quality** (standalone) vs **Testing & QA** (standalone duplicate) vs **Quality** inside Governance strategies | Three quality-related sections scattered |

**Current top-level count: 16+ items**  
**Target top-level count: 10 items**

---

### 1.2 Platform PMO Menu (`pmoMenuConfig.js`) — Problems Found

| # | Problem | Impact |
|---|---------|--------|
| 1 | **Form Templates, Risk Register (All), Issue Log (All), Change Register (All)** buried inside "Testing and QA" | Completely wrong placement |
| 2 | **ITTO Management and Planning Intelligence** share `order: 5.5` | Ordering conflict, ad-hoc additions |
| 3 | **Process Group Forms** uses `:projectId` in paths | Broken for PMO overview context (no single project) |
| 4 | **Testing and QA** section has 16 children including unrelated admin links | Section overloaded |
| 5 | **No Administration section** — admin items scattered across PMO Admin (in PM menu) and Testing section | Admin hard to find |

### 1.3 PM Dashboard Menu (`pmDashboardMenuConfig.js`) — Problems Found

This is a **separate, fourth config** serving `/pm/*` routes. It has a cleaner structure than `pmMenuConfig.js` but still has issues.

| # | Problem | Impact |
|---|---------|--------|
| 1 | `pm-itto`, `pm-delays`, `pm-planning` use fractional `order` values (6.5, 6.55, 6.57) | Ad-hoc additions never properly integrated |
| 2 | `pm-planning` (Planning Intelligence) has **12 children** — too many for one section | Hard to scan; should split into Planning and AI/Intelligence |
| 3 | `pm-testing-centre` also has fractional `order: 6.5` — same as ITTO | Order conflict |
| 4 | `pm-testing-centre` has **12 children** with all same FlaskConical icon | All items look identical |
| 5 | `pm-delays` is standalone section — should be inside Controls & Registers | Fragmentation |
| 6 | `pm-itto` is standalone section — should be inside Planning | Fragmentation |
| 7 | No "Process Group Forms" section in this config yet | Process group forms not accessible from `/pm/*` dashboard |
| 8 | No "My Work" personal grouping | Same issue as `pmMenuConfig.js` |

**Current sections: 10+ (including 4 fractional-order additions)**  
**Target: 8 clean sections**

---

### 1.4 Simulator General Menu (`simulatorMenuConfig.js`) — Problems Found

| # | Problem | Impact |
|---|---------|--------|
| 1 | No role-based filtering at all — uses `subscriptionTier` only | All simulator users see same menu regardless of role |
| 2 | "Process Group Practice" is a single flat link, no process group sub-navigation | Not aligned with process group form engine |
| 3 | Testing Centre appears here AND in `simulatorPMMenuConfig.js` | Potential duplication |

---

### 1.5 Role Coverage Gap Summary

The **critical finding**: 8 of the 10 roles share `pmMenuConfig.js` with no tailored menu experience. The approach should be **permission-based section visibility** (not separate config files per role — that would create 10 files to maintain). The revamp must define explicit permission keys for every section so each role gets a curated view from the same shared config.

---

## 2. Design Principles for Revamp

1. **Maximum 10 top-level sections** per menu — users scan, not read
2. **Maximum 8 children per section** — group further if more needed
3. **Each section has one clear theme** — never mix admin with operations
4. **No duplicate links** across sections — one place for each feature
5. **Personal items grouped** — all "My X" items in one "My Work" section
6. **Role-sensitive sections hidden** — admin items only visible to pmo.admin
7. **Platform–Simulator parity** — Simulator mirrors Platform with `sim/` prefixed paths
8. **Process Group Forms** sits at the same level for all roles, filtered by permissions

---

## 3. Proposed Platform PM Menu (`pmMenuConfig.js`)

**10 sections (down from 16+)**

```
1. Dashboard
2. My Work
3. Projects
4. Controls & Registers
5. Planning & Delivery
6. Process Group Forms
7. Quality & Testing
8. People & Stakeholders
9. Reporting
10. Governance & Admin
```

### Section Detail

#### 1. Dashboard
Single link — unchanged.  
`/platform/dashboard`

---

#### 2. My Work ← NEW (consolidates 3 orphaned top-level items)
| Child | Path | Was |
|-------|------|-----|
| My Tasks | `/platform/tasks` | Under Tasks → My Tasks |
| My Projects | `/platform/projects` | Under Projects → My Projects |
| Daily Log | `/app/daily-log/my-entries` | Standalone top-level |
| My Lesson Actions | `/app/lessons/my-actions` | Standalone top-level |
| My Draft Forms | `/platform/projects/:projectId/forms/drafts` | Under Forms |
| Task Board | `/platform/tasks/board` | Under Tasks → Board View |
| Task Calendar | `/platform/tasks/calendar` | Under Tasks → Calendar |

---

#### 3. Projects ← TRIMMED (remove registers — moved to Controls)
| Child | Path | Change |
|-------|------|--------|
| My Projects | `/platform/projects` | Keep |
| All Projects | `/platform/projects/all` | Keep |
| Create Project | `/platform/projects/create` | Keep |
| Templates | `/platform/projects/templates` | Keep |
| Archived | `/platform/projects/archives` | Keep |
| On Hold | `/app/projects/on-hold` | Keep |
| Manage Members | `/app/project-members` | Keep |
| ~~Daily Log~~ | ~~null~~ | **Remove** — now in My Work |
| ~~Lessons Log~~ | ~~null~~ | **Remove** — now in My Work |
| ~~Plans~~ | ~~null~~ | **Remove** — now in Planning & Delivery |
| ~~Product Descriptions~~ | ~~null~~ | **Remove** — now in Governance & Admin |
| ~~Risk Register~~ | ~~...~~ | **Remove** — now in Controls |
| ~~Issue Log~~ | ~~...~~ | **Remove** — now in Controls |
| ~~Change Log~~ | ~~...~~ | **Remove** — now in Controls |
| ~~Requirements Register~~ | ~~...~~ | **Remove** — now in Controls |
| ~~Status Reports~~ | ~~...~~ | **Remove** — now in Reporting |

---

#### 4. Controls & Registers ← NEW (consolidates scattered items)
| Child | Path | Was |
|-------|------|-----|
| Risk Register | `/platform/projects/:projectId/registers/risks` | Under Projects (recently added) |
| Issue Log | `/platform/projects/:projectId/registers/issues` | Under Projects (recently added) |
| Change Log | `/platform/projects/:projectId/registers/changes` | Under Projects (recently added) |
| Delay Register | `/platform/delays` | Standalone top-level |
| Work Authorisations | `/platform/work-authorisations` | Under Governance |
| Decision Log | `/platform/governance/decisions` | Under Governance |
| Assumption Log | `/platform/projects/:projectId/forms?group=Initiating&template=assumption_log` | New (from Forms) |

---

#### 5. Planning & Delivery ← NEW (consolidates ITTO + Dependencies + delivery items)
| Child | Path | Was |
|-------|------|-----|
| WBS | `/platform/projects/:projectId/registers/requirements` | Under Projects (Plans) |
| Milestones | `/platform/projects/:projectId/forms?template=milestone_list` | New |
| Schedule | `/platform/projects/:projectId/forms?template=project_schedule` | New |
| Activity List | `/platform/projects/:projectId/forms?template=activity_list` | New |
| Dependencies | `/platform/dependencies` | Standalone top-level |
| ITTO Templates | `/platform/itto/templates` | Standalone top-level |
| ITTO Drafts | `/platform/itto/drafts` | Under ITTO (standalone) |

---

#### 6. Process Group Forms ← UNCHANGED STRUCTURE, cleaned up
| Child | Path |
|-------|------|
| Initiating | `?group=Initiating` |
| Planning | `?group=Planning` |
| Executing | `?group=Executing` |
| Monitoring & Controlling | `?group=Monitoring` |
| Closing | `?group=Closing` |
| Agile | `?group=Agile` |
| My Drafts | `.../forms/drafts` |
| Pending Approvals | `...?status=in_review` |

---

#### 7. Quality & Testing ← MERGED (eliminates duplicate Testing & QA entries)
Combines `platform-quality` + `platform-testing-centre` + `platform-testing-qa` into one section.

| Child | Path |
|-------|------|
| Quality Register | `/platform/quality-management` |
| Quality Reviews | `/platform/quality/reviews` |
| Quality Inspections | `/platform/quality/inspections` |
| Quality Reports | `/platform/quality/reports` |
| Test Cases | `/platform/testing-centre/cases` |
| Test Suites | `/platform/testing-centre/suites` |
| Test Runs | `/platform/testing-centre/runs` |
| Defects & Issues | `/platform/testing-centre/defects` |
| Diagnostics | `/platform/testing-centre/diagnostics` |
| Testing Reports | `/platform/testing-centre/reports` |

> `platform-testing-centre` and `platform-testing-qa` top-level items are **removed entirely**.

---

#### 8. People & Stakeholders ← MERGED (Teams + Stakeholders)
| Child | Path | Was |
|-------|------|-----|
| All Teams | `/platform/teams` | Under Teams |
| My Team | `/platform/teams/my-team` | Under Teams |
| Resource Directory | `/platform/teams/directory` | Under Teams |
| Skill Matrix | `/platform/teams/skills` | Under Teams |
| Capacity Planning | `/platform/teams/capacity` | Under Teams |
| Leave Calendar | `/platform/teams/leaves` | Under Teams |
| Stakeholder Register | `/platform/stakeholders/register` | Under Stakeholders |
| Stakeholder Analysis | `/platform/stakeholders/analysis` | Under Stakeholders |
| Engagement Planning | `/platform/stakeholders/engagement` | Under Stakeholders |
| Communication Plans | `/platform/stakeholders/communications` | Under Stakeholders |

> `platform-teams` and `platform-stakeholders` top-level items are **removed**.

---

#### 9. Reporting ← EXPANDED (absorbs PMO-gated reports + status)
| Child | Path | Permission |
|-------|------|-----------|
| Report Library | `/platform/reports` | report.view |
| Report Builder | `/platform/reports/builder` | report.create |
| Analytics Dashboards | `/platform/reports/analytics` | report.view |
| Status Reports | `/platform/projects/:projectId/reports/status` | form.view |
| Financial Reports | `/platform/financial-reports` | report.view |
| Highlight Reports | `/pmo/reporting/highlight-reports` | pmo.admin |
| Exception Reports | `/pmo/reporting/exception-reports` | pmo.admin |
| End Stage Reports | `/pmo/reporting/end-stage-reports` | pmo.admin |
| End Project Reports | `/pmo/reporting/end-project-reports` | pmo.admin |

> `platform-reports` top-level item is **removed** — children absorbed here.

---

#### 10. Governance & Admin ← REORGANISED (splits into sub-groups by audience)

**Governance sub-group** (all roles with governance.view):
| Child | Path |
|-------|------|
| Framework | `/platform/governance/framework` |
| Policies | `/platform/governance/policies` |
| Compliance | `/platform/governance/compliance` |
| Audit Trail | `/platform/governance/audit` |
| Document Governance | `/platform/document-governance` |

**Strategies sub-group** (pmo.admin only):
| Child | Path |
|-------|------|
| Communication Strategy | `/pmo/governance/communication-strategy` |
| Configuration Strategy | `/pmo/governance/configuration-strategy` |
| Quality Strategy | `/pmo/governance/quality-strategy` |
| Risk Strategy | `/pmo/governance/risk-strategy` |

**Administration sub-group** (pmo.admin only):
| Child | Path |
|-------|------|
| Organisation Settings | `/platform/pmo-admin/settings` |
| User Management | `/platform/pmo-admin/users` |
| Project Types | `/platform/pmo-admin/project-types` |
| Funding Sources | `/platform/pmo-admin/funding-sources` |
| Budget Categories | `/platform/pmo-admin/budget-categories` |
| Manager Assignments | `/platform/pmo-admin/manager-assignments` |
| Form Templates | `/platform/admin/form-templates` |
| Draft Queue | `/platform/pmo-admin/drafts` |
| Subscription | `/platform/pmo-admin/subscription` |
| Branding | `/platform/pmo-admin/branding` |
| Integrations | `/platform/pmo-admin/integrations` |
| Security | `/platform/pmo-admin/security` |

**Initiation Documents sub-group** (pmo.admin only — absorbed from PMO Admin):
| Child | Path |
|-------|------|
| Business Cases | `/pmo/initiation/business-case` |
| Benefits Review Plans | `/pmo/initiation/benefits-review-plan` |
| Project Mandates | `/platform/mandates/list` |
| Project Briefs | `/platform/briefs/list` |
| Product Descriptions | `/platform/pmo-admin/product-description-templates` |
| Corporate Lessons | `/app/lessons/corporate` |

> Standalone `platform-governance`, `platform-pmo-admin`, `platform-lessons-corporate`, `platform-oversight` are **removed** — all absorbed here.  
> Items from Portfolio & Programme that are PMO-level (strategy, benefits management) now live in section below.

---

**Removed standalone top-level items (now absorbed into groups above):**
- `platform-daily-log-my-entries` → My Work
- `platform-lessons-my-actions` → My Work
- `platform-tasks` → My Work + sub-items remain
- `platform-teams` → People & Stakeholders
- `platform-itto` → Planning & Delivery
- `platform-delays` → Controls & Registers
- `platform-portfolio` → Reporting / PMO context only
- `platform-programme` → (merged into Programme & Portfolio section if needed or PMO level)
- `platform-dependencies` → Planning & Delivery
- `platform-benefits` → Reporting / Benefits section if pmo.admin
- `platform-strategy` → Governance & Admin (pmo.admin)
- `platform-quality` → Quality & Testing
- `platform-stakeholders` → People & Stakeholders
- `platform-testing-centre` → Quality & Testing (merged)
- `platform-testing-qa` → Quality & Testing (merged, **duplicate removed**)
- `platform-oversight` → Governance & Admin (pmo.admin)
- `platform-lessons-corporate` → Governance & Admin (pmo.admin)
- `platform-pmo-admin` → Governance & Admin → Administration sub-group
- `platform-procurement` → Governance & Admin (or keep as standalone if procurement role exists)
- `platform-governance` → Governance & Admin
- `platform-reports` → Reporting
- `platform-portfolio` → (pmo context, keep in PMO menu; for PM it's read-only under Reporting)
- `platform-programme` → (pmo context; for PM it's under Reporting or hidden)

---

## 3.5 Role-by-Role Sidebar View (Platform PM Menu)

This defines what each role sees from the **shared** `pmMenuConfig.js` via permission filtering. No separate config files per role — sections are shown/hidden per permission key.

### Permission Key → Section Visibility Matrix

| Sidebar Section | System Admin | PMO Admin | Sponsor | Project Manager | Team Lead | Team Member | QA | Procurement | Finance | Viewer |
|----------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Work | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Projects | ✅ | ✅ | 👁 R/O | ✅ | ✅ | 👁 R/O | 👁 R/O | 👁 R/O | 👁 R/O | 👁 R/O |
| Controls & Registers | ✅ | ✅ | 👁 Approve | ✅ | ✅ | 👁 Assigned | 👁 Quality | ✅ Proc | 👁 R/O | — |
| Planning & Delivery | ✅ | ✅ | 👁 R/O | ✅ | ✅ | — | — | — | 👁 R/O | — |
| Process Group Forms | ✅ | ✅ | 👁 Approve | ✅ | ✅ | 👁 Limited | 👁 Quality | 👁 Proc | 👁 Finance | — |
| Quality & Testing | ✅ | ✅ | — | ✅ | ✅ | — | ✅ Full | — | — | — |
| People & Stakeholders | ✅ | ✅ | 👁 R/O | ✅ | ✅ | 👁 Team only | 👁 R/O | 👁 R/O | — | — |
| Reporting | ✅ | ✅ | 👁 R/O | ✅ | 👁 R/O | 👁 Status only | 👁 Quality | 👁 Proc | ✅ Finance | — |
| Governance & Admin | ✅ Full | ✅ Full | — | 👁 Governance | — | — | — | — | — | — |

Legend: ✅ = Full access · 👁 = Read/filtered access · — = Hidden

---

### Section-Level Permission Keys (what to add/assign per role)

#### Section: My Work
| Child item | Permission key | Roles with access |
|-----------|----------------|------------------|
| My Tasks | `task.view` | All except Viewer |
| My Projects | `project.view` | All except Viewer |
| Daily Log | `daily_log.view` | PM, Team Lead, Team Member |
| My Lesson Actions | `lesson.view` | PM, Team Lead, Team Member, QA |
| My Draft Forms | `form.view` | PM, Team Lead, QA, Procurement, Finance |
| Task Board | `task.view` | PM, Team Lead, Team Member |
| Task Calendar | `task.view` | PM, Team Lead, Team Member |

#### Section: Controls & Registers
| Child item | Permission key | Roles with access |
|-----------|----------------|------------------|
| Risk Register | `risk.view` | All except Viewer |
| Issue Log | `issue.view` | All except Viewer |
| Change Log | `change.view` | All except Viewer |
| Delay Register | `delay.view` | PM, Team Lead, PMO Admin, System Admin |
| Work Authorisations | `work_authorisation.view` | PM, Team Lead, PMO Admin, System Admin |
| Decision Log | `governance.view` | PM, Sponsor, PMO Admin, System Admin |
| Assumption Log | `form.view` | PM, Team Lead, PMO Admin |

#### Section: Process Group Forms
| Child item | Permission key | Roles with access |
|-----------|----------------|------------------|
| Initiating | `form.view` | PM, Team Lead, PMO Admin, System Admin, Sponsor (approve) |
| Planning | `form.view` | PM, Team Lead, PMO Admin, System Admin |
| Executing | `form.view` | PM, Team Lead, Team Member (status only), QA (quality only) |
| Monitoring & Controlling | `form.view` | PM, Team Lead, Finance (EVM/Cost), QA (audit) |
| Closing | `form.view` | PM, PMO Admin, Sponsor (approve) |
| Agile | `form.view` | PM, Team Lead, Team Member |
| My Drafts | `form.view` | PM, Team Lead, QA, Procurement, Finance |
| Pending Approvals | `form.approve` | Sponsor, PMO Admin, System Admin |

#### Section: Quality & Testing
| Child item | Permission key | Roles with access |
|-----------|----------------|------------------|
| Quality Register | `quality.view` | PM, Team Lead, QA, PMO Admin, System Admin |
| Quality Reviews | `quality.view` | PM, QA, PMO Admin |
| Quality Inspections | `quality.view` | PM, QA, PMO Admin |
| Quality Reports | `quality.view` | PM, QA, PMO Admin, Finance |
| Test Cases | `testing_centre.view` | PM, Team Lead, QA, PMO Admin, System Admin |
| Test Suites | `testing_centre.view` | PM, Team Lead, QA, PMO Admin, System Admin |
| Test Runs | `testing_centre.run` | PM, QA, PMO Admin, System Admin |
| Defects & Issues | `testing_centre.view` | PM, Team Lead, QA |
| Diagnostics | `testing_centre.view` | PM, QA, System Admin |
| Testing Reports | `testing_centre.view` | PM, QA, PMO Admin, System Admin |

#### Section: Reporting
| Child item | Permission key | Roles with access |
|-----------|----------------|------------------|
| Report Library | `report.view` | PM, Team Lead, PMO Admin, System Admin, Sponsor |
| Report Builder | `report.create` | PM, PMO Admin, System Admin |
| Analytics Dashboards | `report.view` | PM, PMO Admin, System Admin, Finance |
| Status Reports | `form.view` | PM, Team Lead, Team Member, PMO Admin |
| Financial Reports | `report.view` | PM, Finance, PMO Admin, System Admin |
| Portfolio EVM | `report.view` | PM, Finance, PMO Admin, System Admin |
| Highlight Reports | `pmo.admin` | PMO Admin, System Admin |
| Exception Reports | `pmo.admin` | PMO Admin, System Admin |
| End Stage Reports | `pmo.admin` | PMO Admin, System Admin |

#### Section: Governance & Admin
| Child item | Permission key | Roles with access |
|-----------|----------------|------------------|
| Framework | `governance.view` | PM, Sponsor, PMO Admin, System Admin |
| Policies | `governance.view` | PM, Sponsor, PMO Admin, System Admin |
| Compliance | `governance.view` | PM, QA, PMO Admin, System Admin |
| Audit Trail | `governance.audit` | PMO Admin, System Admin |
| Document Governance | `pmo.admin` | PMO Admin, System Admin |
| Communication Strategy | `pmo.admin` | PMO Admin, System Admin |
| Configuration Strategy | `pmo.admin` | PMO Admin, System Admin |
| Quality Strategy | `pmo.admin` | PMO Admin, System Admin |
| Risk Strategy | `pmo.admin` | PMO Admin, System Admin |
| Org Settings | `pmo.admin` | PMO Admin, System Admin |
| User Management | `pmo.admin` | PMO Admin, System Admin |
| Form Templates | `form_template.manage` | System Admin, PMO Admin |
| Subscription/Branding | `pmo.admin` | System Admin only (`system.admin`) |

---

### Role Profiles — What Each Role Actually Sees

#### Role 1: System Admin
Sees everything. All sections, all children. No filtering. Permission key: `system.admin` (superset of `pmo.admin`).

#### Role 2: PMO Admin
Sees everything except Subscription/Branding (System Admin only). Primary home: `/pmo/*` dashboard (pmoMenuConfig).

#### Role 3: Project Executive / Sponsor
**Minimal sidebar — approval-focused:**
- Dashboard
- My Work → My Tasks, My Projects
- Projects → My Projects (R/O)
- Controls & Registers → Risk Register (R/O), Issue Log (R/O), Change Log (Approve)
- Process Group Forms → Initiating (Approve Charter), Closing (Approve Closeout), Pending Approvals
- Reporting → Report Library, Status Reports

Permission key: `sponsor.view` — new key to be added.

#### Role 4: Project Manager
Full sidebar as per the revamped 10-section structure. No restrictions.

#### Role 5: Team Manager / Lead
Same as Project Manager but without Administration sub-group and without Portfolio-level sections.
- All Controls, Planning, Forms, Quality, People sections — full access
- Reporting — full except PMO-gated reports
- Governance — framework/policies only

#### Role 6: Team Member
**Minimal sidebar — task and status focused:**
- Dashboard
- My Work → My Tasks, Daily Log, My Lesson Actions
- Projects → My Projects (R/O)
- Controls & Registers → Risk Register (R/O), Issue Log (assigned only)
- Process Group Forms → Executing (Team Member Status Report only), Agile (Backlog — assigned items)
- People & Stakeholders → My Team only

Permission key: `team_member.view` — new key.

#### Role 7: Project Assurance / QA
**Quality-focused sidebar:**
- Dashboard
- My Work → My Tasks, My Lesson Actions
- Projects → My Projects (R/O)
- Controls & Registers → Risk Register, Issue Log (R/O), Change Log (R/O)
- Process Group Forms → Planning (Quality Mgmt Plan, Quality Metrics), Executing (Quality Audit), M&C (Risk Audit, Product Acceptance)
- Quality & Testing → Full access (primary role area)
- Reporting → Quality Reports, Status Reports

Permission key: `qa.view` — new key.

#### Role 8: Procurement Manager
**Procurement-focused sidebar:**
- Dashboard
- My Work → My Tasks
- Projects → My Projects (R/O)
- Controls & Registers → Risk Register (R/O), Change Log (R/O), Work Authorisations
- Process Group Forms → Planning (Procurement Mgmt Plan, Procurement Strategy, Source Selection Criteria), M&C (Contractor Status Report, Procurement Audit, Contract Closeout)
- People & Stakeholders → Stakeholder Register (R/O)
- Reporting → Status Reports (R/O)

Permission key: `procurement.view` — new key.

#### Role 9: Finance / Cost Controller
**Financial-focused sidebar:**
- Dashboard
- My Work → My Tasks
- Projects → My Projects (R/O)
- Controls & Registers → Risk Register (R/O)
- Process Group Forms → Planning (Cost Mgmt Plan, Cost Estimates, Cost Estimating Worksheets, Cost Baseline), M&C (Earned Value Analysis, Variance Analysis)
- Reporting → Financial Reports, Portfolio EVM, Analytics

Permission key: `finance.view` — new key.

#### Role 10: Stakeholder / Customer Viewer
**Read-only minimal sidebar:**
- Dashboard
- Projects → My Projects (R/O approved items only)
- Process Group Forms → Approved forms only (read-only, no drafts, no approvals)
- Reporting → Status Reports (approved, read-only)

Permission key: `stakeholder.view` (already exists) — restrict to approved-only views.

---

## 3.6 PM Dashboard Menu (`pmDashboardMenuConfig.js`) — Proposed Revamp

This menu serves `/pm/*` routes and has its own clean structure. Apply the same grouping principles:

**Current sections (10): Governance Reference, Initiation & Business Justification, Delivery Management, Controls & Registers, Reporting, Financial Management, ITTO Management (fractional), Delays (fractional), Planning Intelligence (fractional, 12 children), Testing and QA (fractional, 12 children), Project Closure**

**Proposed sections (8):**

| Section | What moves in | What changes |
|---------|--------------|-------------|
| 1. Dashboard | — | Unchanged |
| 2. Governance Reference | Unchanged | Unchanged |
| 3. Initiation & Justification | Unchanged | Unchanged |
| 4. Delivery Management | + ITTO Templates, ITTO Drafts (from standalone) + Delay Register, Delay Drafts (from standalone) | Fix fractional order numbers |
| 5. Controls & Registers | Unchanged | Unchanged |
| 6. Planning Intelligence | Keep 8 core items | Split AI items into sub-group; cap at 8 children; fix fractional order |
| 7. Quality & Testing | Testing Centre items merged here | Fix all-same icon issue; fix fractional order |
| 8. Reporting & Closure | Merge Reporting + Financial + Project Closure into one | Reduces 3 sections to 1 |

**Add to `pmDashboardMenuConfig.js`:**
- [x] Process Group Forms section (same as Platform PM, pointing to `/pm/projects/:projectId/forms/*`)

---

## 3.7 Simulator General Menu (`simulatorMenuConfig.js`) — Proposed Revamp

**Add role/permission-based filtering** (currently subscription-only):
- [x] Add `Process Group Practice` with sub-navigation by process group (mirrors Platform PM forms section)
- [x] Add permission filtering matching Platform PM role rules
- [x] Remove duplicate Testing Centre if covered in `simulatorPMMenuConfig.js`

---

## 4. Proposed Platform PMO Menu (`pmoMenuConfig.js`)

### 4.0 Critical Bug to Fix First

**`PMOLayout.jsx` uses `<Sidebar>` (DB-driven platform menu) instead of `<PMOSidebar>`.**

The `PMOSidebar.jsx` component exists and correctly reads `pmoMenuConfig.js`, but `PMOLayout.jsx` imports the generic `Sidebar` component instead. This is why the screenshot shows only 7 sparse items — the user is seeing the platform menu, not the PMO-specific menu. Phase D must begin with:

```jsx
// PMOLayout.jsx — fix:
// Replace:  import Sidebar from '../Sidebar'
// With:     import PMOSidebar from './PMOSidebar'
// Replace:  <Sidebar isOpen={sidebarOpen} onClose={...} />
// With:     <PMOSidebar isOpen={sidebarOpen} onClose={...} />
```

---

### 4.1 Design Principle — PMO as Project Driver

The PMO is the **driver and overseer of all projects**. The sidebar must reflect this:
- **All PM features are visible** to the PMO with **full edit/amend capability** (not read-only)
- PMO-exclusive sections (portfolio view, governance baselines, programme oversight) sit at the top
- The PMO needs cross-project visibility into every register (risk, issue, quality, changes, delays, lessons)
- Administration tools (user management, form templates, org settings) are available to PMO Admin only

---

### 4.2 Proposed Sections (13 sections — comprehensive)

```
 0. Dashboard
 1. Portfolio & Programme
 2. Governance & Standards
 3. Initiation & Pipeline
 4. Project Oversight (Cross-Portfolio)
 5. Planning Intelligence
 6. Financial Management
 7. Process Group Forms
 8. Quality & Testing
 9. Reporting & Assurance
10. People & Resources
11. Procurement
12. Administration
```

---

### Section 0 — Dashboard (Order: 0)
| Child | Path |
|-------|------|
| PMO Dashboard | `/pmo/dashboard` |

---

### Section 1 — Portfolio & Programme (Order: 1) ← NEW
PMO-level cross-project visibility — all with full edit access.

| Child | Path | Was |
|-------|------|-----|
| All Projects | `/platform/projects/all` | Under Platform Projects |
| Create Project | `/platform/projects/create` | Under Platform Projects |
| Project Templates | `/platform/projects/templates` | Under Platform Projects |
| On Hold / Drafts | `/app/projects/on-hold` | Under Platform Projects |
| Programme Management | `/platform/programme` | Standalone top-level |
| Benefits Management | `/platform/benefits` | Standalone top-level |
| Dependencies | `/platform/dependencies` | Standalone top-level |
| Portfolio Collisions | `/pmo/planning/collisions` | Under Planning Intelligence |

> PMO can create, edit, and archive projects from this section — not read-only.

---

### Section 2 — Governance & Standards (Order: 2)
PMO-defined baselines that all projects must follow. Full edit access.

| Child | Path |
|-------|------|
| Project Mandate | `/pmo/governance/mandate` |
| Mandate Approvals | `/pmo/mandates/approvals` |
| Communication Strategy | `/pmo/governance/communication-strategy` |
| Configuration Strategy | `/pmo/governance/configuration-strategy` |
| Quality Strategy | `/pmo/governance/quality-strategy` |
| Risk Strategy | `/pmo/governance/risk-strategy` |
| ITTO Templates | `/pmo/itto/templates` |
| ITTO Drafts | `/pmo/itto/drafts` |

> ITTO Management moved here from its own standalone section.

---

### Section 3 — Initiation & Pipeline (Order: 3)
Replaces "Initiation & Business Justification" — expanded to full project intake pipeline.

| Child | Path |
|-------|------|
| Business Cases | `/pmo/initiation/business-case` |
| Project Briefs | `/pmo/initiation/project-brief` |
| Benefits Review Plans | `/pmo/initiation/benefits-review-plan` |

---

### Section 4 — Project Oversight — Cross-Portfolio (Order: 4)
**Full edit access for PMO** (not read-only — PMO can update any register entry). Includes routes already in App.jsx that were missing from the old config.

| Child | Path | Note |
|-------|------|------|
| Scope Oversight | `/pmo/oversight/scope` | Existing route, was MISSING from menu |
| Schedule Oversight | `/pmo/oversight/schedules` | Existing route, was MISSING from menu |
| Risk Register (All) | `/pmo/oversight/risk-register` | Moved out of Testing section |
| Issue Register (All) | `/pmo/oversight/issue-register` | Moved out of Testing section |
| Quality Register (All) | `/pmo/oversight/quality-register` | Moved from oversight (kept) |
| Change Register (All) | `/pmo/registers/changes` | Moved out of Testing section |
| Lessons Log (All) | `/pmo/oversight/lessons-log` | Keep |
| Delay Register (All) | `/pmo/oversight/delays` | Keep |
| Delay Templates | `/pmo/delays/templates` | Moved from standalone Delay Management |

---

### Section 5 — Planning Intelligence (Order: 5)
| Child | Path |
|-------|------|
| Planning Hub | `/pmo/planning` |
| Portfolio Collisions | `/pmo/planning/collisions` |
| Intelligence Rules | `/pmo/planning/intelligence` |
| Governance Rules Config | `/pmo/planning/governance-config` |

---

### Section 6 — Financial Management (Order: 6)
| Child | Path |
|-------|------|
| Financial Reports | `/platform/financial-reports` |
| Portfolio EVM | `/platform/portfolio/evm` |
| Expense Approvals | `/platform/expenses/approvals` |
| Expense Thresholds | `/platform/pmo-admin/expense-thresholds` |

---

### Section 7 — Process Group Forms (Order: 7)
All 68 PMBOK forms — PMO has full edit access across all projects.

| Child | Path |
|-------|------|
| Initiating | `/pmo/forms?group=Initiating` |
| Planning | `/pmo/forms?group=Planning` |
| Executing | `/pmo/forms?group=Executing` |
| Monitoring & Controlling | `/pmo/forms?group=Monitoring` |
| Closing | `/pmo/forms?group=Closing` |
| Agile | `/pmo/forms?group=Agile` |
| My Drafts | `/pmo/forms/drafts` |
| Pending Approvals | `/pmo/forms?status=in_review` |

---

### Section 8 — Quality & Testing (Order: 8)
Cleaned up — only testing-specific items. Misplaced registers moved to Project Oversight.

| Child | Path | Permission |
|-------|------|-----------|
| Testing Dashboard | `/pmo/testing-centre` | `testing_centre.view` |
| Test Case Library | `/pmo/testing-centre/cases` | `testing_centre.view` |
| Test Case Drafts | `/pmo/testing-centre/cases/drafts` | `testing_centre.view` |
| Test Suites | `/pmo/testing-centre/suites` | `testing_centre.view` |
| Test Runs | `/pmo/testing-centre/runs` | `testing_centre.run` |
| Automated Scripts | `/pmo/testing-centre/scripts` | `testing_centre.configure` |
| Screenshot Evidence | `/pmo/testing-centre/evidence` | `testing_centre.view` |
| Diagnostic Centre | `/pmo/testing-centre/diagnostics` | `testing_centre.view` |
| Defect & Issue Links | `/pmo/testing-centre/defects` | `testing_centre.view` |
| Test Data Manager | `/pmo/testing-centre/data` | `testing_centre.configure` |
| Testing Reports | `/pmo/testing-centre/reports` | `testing_centre.view` |
| Settings | `/pmo/testing-centre/settings` | `testing_centre.configure` |

**Removed from this section** (previously misplaced here):
- Form Templates → moved to Administration
- Risk Register (All) → moved to Project Oversight
- Issue Log (All) → moved to Project Oversight
- Change Register (All) → moved to Project Oversight

---

### Section 9 — Reporting & Assurance (Order: 9)
| Child | Path |
|-------|------|
| Highlight Reports | `/pmo/reporting/highlight-reports` |
| Exception Reports | `/pmo/reporting/exception-reports` |
| End Stage Reports | `/pmo/reporting/end-stage-reports` |
| End Project Reports | `/pmo/reporting/end-project-reports` |
| Report Library | `/platform/reports` |
| Analytics | `/platform/reports/analytics` |

---

### Section 10 — People & Resources (Order: 10) ← NEW
PMO-level resource and team management.

| Child | Path |
|-------|------|
| Manager Assignments | `/platform/pmo-admin/manager-assignments` |
| Assignment Settings | `/platform/pmo-admin/manager-assignment-settings` |
| Resource Directory | `/platform/teams/directory` |
| Team Capacity | `/platform/teams/capacity` |

---

### Section 11 — Procurement (Order: 11)
Standalone section — not buried in Administration.

| Child | Path |
|-------|------|
| RFP Register | `/pmo/procurement/rfp` |
| Load RFP | `/pmo/rfp/create` |
| RFP Drafts | `/pmo/rfp/on-hold` |

---

### Section 12 — Administration (Order: 12)
PMO Admin only.

| Child | Path | Permission |
|-------|------|-----------|
| Form Templates | `/platform/admin/form-templates` | `form_template.manage` |
| Organisation Settings | `/platform/pmo-admin/settings` | `pmo.admin` |
| User Management | `/platform/pmo-admin/users` | `pmo.admin` |
| Role Menu Access | `/pmo/role-menu-access` | `pmo.admin` |
| Project Types | `/platform/pmo-admin/project-types` | `pmo.admin` |
| Funding Sources | `/platform/pmo-admin/funding-sources` | `pmo.admin` |
| Budget Categories | `/platform/pmo-admin/budget-categories` | `pmo.admin` |
| Subscription | `/platform/pmo-admin/subscription` | `system.admin` |
| Branding | `/platform/pmo-admin/branding` | `system.admin` |

---

### 4.3 Changes Summary Table

| Current Section | Action | New Section |
|----------------|--------|-------------|
| PMO Governance | Rename + expand + add ITTO | Governance & Standards (2) |
| Initiation & Business Justification | Rename | Initiation & Pipeline (3) |
| Project Oversight | Expand: add Scope, Schedules, Change Register + move misplaced registers here | Project Oversight (4) |
| ITTO Management (standalone) | **Merge into Governance & Standards** | Section 2 |
| Delay Management (standalone) | **Merge into Project Oversight** | Section 4 |
| Planning Intelligence | Keep unchanged | Section 5 |
| Financial Management | Keep unchanged | Section 6 |
| Process Group Forms | Keep, fix paths | Section 7 |
| Testing and QA | Clean: remove 4 misplaced items | Quality & Testing (8) |
| Reporting & Assurance | Expand: add Report Library, Analytics | Section 9 |
| Procurement | Standalone (not inside Admin) | Section 11 |
| Administration | Expand: add Role Menu Access, Project Types, Funding Sources, Budget Categories | Section 12 |
| *(missing)* | **NEW**: Portfolio & Programme | Section 1 |
| *(missing)* | **NEW**: People & Resources | Section 10 |
| Form Templates (was in Testing) | **Fix placement** | Administration (12) |
| Risk/Issue/Change Register All (was in Testing) | **Fix placement** | Project Oversight (4) |

---

## 5. Proposed Simulator PM Menu (`simulatorPMMenuConfig.js`)

Mirror the Platform PM menu structure with these differences:
- All paths prefixed `/simulator/pm/...` or `/simulator/projects/:projectId/...`
- Section labels prefixed with "Practice " where applicable
- No administration section (simulators don't need org admin)
- Process Group Forms section points to simulator form instances

**Sections (same 9 as Platform PM, minus Administration):**
1. Dashboard
2. My Practice Work
3. Practice Projects
4. Controls & Registers
5. Planning & Delivery
6. Process Group Forms
7. Quality & Testing
8. People & Stakeholders
9. Reporting

---

## 6. Proposed Simulator PMO Menu (`simulatorPMOMenuConfig.js`)

Mirror the Platform PMO menu (Section 4 above) with simulator paths. PMO Admin in the simulator is the practice-PMO role learning to manage a simulated portfolio.

**Differences from Platform PMO:**
- All paths prefixed `/simulator/pmo/...`
- Section labels prefixed with "Practice " where meaningful
- No Administration section (org settings not relevant in simulator)
- No Portfolio & Programme external links (use simulator portfolio paths)
- No Financial Management external links (use simulator financial paths)

**Sections (mirror Platform PMO minus Administration):**

| # | Section | Simulator Label | Path Prefix |
|---|---------|----------------|------------|
| 0 | Dashboard | Dashboard | `/simulator/pmo/dashboard` |
| 1 | Portfolio & Programme | Practice Portfolio | `/simulator/pmo/portfolio` |
| 2 | Governance & Standards | Practice Governance | `/simulator/pmo/governance/*` |
| 3 | Initiation & Pipeline | Practice Initiation | `/simulator/pmo/initiation/*` |
| 4 | Project Oversight | Practice Oversight | `/simulator/pmo/oversight/*` |
| 5 | Planning Intelligence | Planning Intelligence | `/simulator/pmo/planning/*` |
| 6 | Financial Management | Financial Management | `/simulator/financial-reports` etc. |
| 7 | Process Group Forms | Practice Forms | `/simulator/pmo/forms?group=*` |
| 8 | Quality & Testing | Testing and QA | `/simulator/pmo/testing-centre/*` |
| 9 | Reporting & Assurance | Practice Reporting | `/simulator/pmo/reporting/*` |
| 10 | People & Resources | People & Resources | `/simulator/pmo/manager-assignments` |
| 11 | Procurement | Procurement | `/simulator/pmo/procurement/*` |

**Changes to `simulatorPMOMenuConfig.js` required:**
- [ ] Add "Practice Portfolio" section with simulator portfolio paths (Section 1)
- [ ] Move ITTO items into Governance & Standards (currently standalone `sim-pmo-itto`)
- [ ] Move Delay Templates into Project Oversight (currently standalone `sim-pmo-delay-templates`)
- [ ] Add Scope Oversight and Schedule Oversight to Practice Oversight section
- [ ] Add Practice Forms section with `/simulator/pmo/forms?group=*` paths
- [ ] Add People & Resources section with `/simulator/pmo/manager-assignments`
- [ ] Fix all misplaced items in Testing & QA (remove Form Templates from that section)
- [ ] Fix `order` conflicts (ITTO at 4.5, Delay at 4.52 — use integer values)

---

## 6.5 Database Schema — Menu Storage Architecture

The menus are stored across **three separate DB tables**. Every JS config change must be accompanied by a matching SQL migration.

| Table | Schema | Used By | Dashboard Types |
|-------|--------|---------|----------------|
| `menu_items` | `public` | Platform sidebar (`/platform/*`) via `pmMenuConfig.js` | All platform roles |
| `role_menu_items` | `public` | Role → menu item mapping (RLS-controlled) | All platform roles |
| `sidebar_config` | `public` | PM Dashboard (`/pm/*`) + PMO (`/pmo/*`) | `'PM'`, `'PMO'` |
| `sim.sidebar_config` | `sim` | Simulator menus (`/simulator/*`) | `'PMO'`, `'PM'` |
| `permissions` | `public` | Permission code registry | All roles |
| `role_permissions` | `public` | Role → permission mapping | All roles |

---

## 6.6 Required SQL Migration Files

**Current highest SQL version:** v507  
**New SQL files for sidebar revamp:** v508 – v514

---

### `SQL/v508_sidebar_revamp_permissions.sql`
**Purpose:** Add the 6 new role-scoped permission codes and assign them to the correct roles.

Contents:
```sql
-- 1. Insert new permission codes into permissions table
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category)
VALUES
  ('sponsor.view',       'Sponsor View',        'Read-only approval-focused access for Project Executives/Sponsors', 'role_access'),
  ('team_member.view',   'Team Member View',    'Task and status-focused access for Team Members', 'role_access'),
  ('qa.view',            'QA View',             'Quality and audit-focused access for QA roles', 'role_access'),
  ('procurement.view',   'Procurement View',    'Procurement and contract-focused access', 'role_access'),
  ('finance.view',       'Finance View',        'Financial and EVM-focused access for Finance roles', 'role_access'),
  ('system.admin',       'System Admin',        'Full system administration access (superset of pmo.admin)', 'role_access')
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  updated_at = NOW();

-- 2. Assign new permissions to roles
-- (sponsor.view → Project Executive/Sponsor role)
-- (team_member.view → Team Member role)
-- (qa.view → QA/Project Assurance role)
-- (procurement.view → Procurement Manager role)
-- (finance.view → Finance/Cost Controller role)
-- (system.admin → System Admin role)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE
  (r.role_name IN ('project_executive', 'sponsor', 'Project Executive', 'Sponsor') AND p.permission_code = 'sponsor.view')
  OR (r.role_name IN ('team_member', 'Team Member') AND p.permission_code = 'team_member.view')
  OR (r.role_name IN ('qa', 'project_assurance', 'QA', 'Project Assurance') AND p.permission_code = 'qa.view')
  OR (r.role_name IN ('procurement_manager', 'Procurement Manager') AND p.permission_code = 'procurement.view')
  OR (r.role_name IN ('finance', 'cost_controller', 'Finance', 'Cost Controller') AND p.permission_code = 'finance.view')
  OR (r.role_name IN ('system_admin', 'super_admin', 'System Admin', 'Super Admin') AND p.permission_code = 'system.admin')
ON CONFLICT DO NOTHING;

-- 3. Grant system.admin all permissions that pmo.admin has
INSERT INTO role_permissions (role_id, permission_id)
SELECT sa_role.id, rp.permission_id
FROM role_permissions rp
JOIN roles pmo_role ON rp.role_id = pmo_role.id AND pmo_role.role_name IN ('pmo_admin', 'PMO Admin')
CROSS JOIN roles sa_role WHERE sa_role.role_name IN ('system_admin', 'System Admin', 'super_admin')
ON CONFLICT DO NOTHING;
```

---

### `SQL/v509_sidebar_revamp_platform_menu_items.sql`
**Purpose:** Restructure `menu_items` table to match the new 10-section Platform PM menu.

Operations:
- [x] **Deactivate** all duplicate Testing entries (`platform-testing-qa` group items → `is_active = FALSE`)
- [x] **Insert** new top-level parent sections: `platform_my_work`, `platform_controls`, `platform_planning`, `platform_people_stakeholders`, `platform_quality_testing` (merged), `platform_governance_admin`
- [x] **Move** existing children to new parent IDs (update `parent_menu_id`)
- [x] **Deactivate** old standalone parents that are now absorbed: `platform_daily_log`, `platform_lesson_actions`, `platform_delays`, `platform_itto`, `platform_portfolio`, `platform_programme`, `platform_dependencies`, `platform_benefits`, `platform_strategy`, `platform_quality`, `platform_stakeholders`, `platform_teams`, `platform_testing_qa` (duplicate), `platform_oversight`, `platform_lessons_corporate`, `platform_pmo_admin` (restructured into sub-group)
- [x] **Insert** new children for My Work, Controls & Registers, Planning & Delivery, People & Stakeholders, Quality & Testing, Reporting, Governance & Admin sections
- [x] **Update** `sort_order` to use integer values only (fix all fractional `5.5`, `5.52`, etc.)
- [x] **Register** all new `menu_code` values in `database_tables` if applicable

Template per new section:
```sql
-- Example: Insert My Work parent
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
VALUES ('platform_my_work', 'My Work', 'Personal tasks, projects, daily log, draft forms', NULL, 1, 20, NULL, 'user-check', TRUE, TRUE)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Example: Insert My Tasks child under My Work
INSERT INTO menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'platform_my_tasks', 'My Tasks', id, 2, 1, '/platform/tasks', 'list-checks', TRUE, TRUE
FROM menu_items WHERE menu_code = 'platform_my_work'
ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = NOW();
```

---

### `SQL/v510_sidebar_revamp_role_menu_items.sql`
**Purpose:** Update `role_menu_items` to assign new sections to all 10 roles.

Operations:
- [x] **Remove** stale `role_menu_items` rows for deactivated menu items
- [x] **Insert** role assignments for all new sections per the Section 3.5 matrix:

```sql
-- Pattern: assign menu section to role
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, mi.id, TRUE, FALSE, FALSE, FALSE
FROM roles r
JOIN menu_items mi ON mi.menu_code = 'platform_controls'
WHERE r.role_name IN ('team_member', 'Team Member')  -- read-only for team members
ON CONFLICT DO NOTHING;
```

Role assignments to create (per Section 3.5 matrix):
- [x] `platform_my_work` → All roles except Viewer
- [x] `platform_controls` → All roles (Viewer hidden; Team Member = R/O; Procurement = Work Auth)
- [x] `platform_planning` → PM, Team Lead, PMO Admin, System Admin (R/O for Finance, Sponsor)
- [x] `platform_forms` → All roles (filtered by child permissions at runtime)
- [x] `platform_quality_testing` → PM, Team Lead, QA, PMO Admin, System Admin
- [x] `platform_people_stakeholders` → All except Viewer and Finance
- [x] `platform_reporting` → All except Viewer (filtered by child permissions)
- [x] `platform_governance_admin` → PM, Sponsor, PMO Admin, System Admin (governance); PMO Admin, System Admin (admin)
- [x] `platform_procurement` → Procurement Manager, PM, PMO Admin, System Admin
- [x] `platform_my_work_drafts` → PM, Team Lead, QA, Procurement, Finance

---

### `SQL/v511_sidebar_revamp_pm_dashboard.sql`
**Purpose:** Update `public.sidebar_config` (dashboard_type = 'PM') to match new `pmDashboardMenuConfig.js` structure.

Operations:
- [x] **Deactivate** `pm-itto`, `pm-delays` as standalone sections (set `is_active = FALSE` for those section_name entries)
- [x] **Update** Delivery Management section — add ITTO and Delay items as children
- [x] **Update** Planning Intelligence section — cap at 8 core items; add AI sub-group
- [x] **Fix** `display_order` values — eliminate fractional orders, use integer sequence
- [x] **Insert** new "Process Group Forms" section rows for all 6 process groups
- [x] **Insert** "Reporting & Closure" merged section (merge Reporting + Financial + Closure)
- [x] **Deactivate** old standalone Financial Management and Project Closure rows

```sql
-- Example: Fix fractional orders
UPDATE sidebar_config
SET display_order = 70, updated_at = NOW()
WHERE dashboard_type = 'PM' AND section_name = 'ITTO Management';

-- Example: Deactivate ITTO as standalone section (now under Delivery)
UPDATE sidebar_config
SET is_active = FALSE, updated_at = NOW()
WHERE dashboard_type = 'PM'
  AND section_name = 'ITTO Management'
  AND document_type IN ('itto-parent');

-- Example: Add Process Group Forms section
INSERT INTO sidebar_config (dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name)
VALUES
  ('PM', 'Process Group Forms', 'forms-initiating',   'Initiating',               80, '/pm/projects/:projectId/forms?group=Initiating',   'FileText'),
  ('PM', 'Process Group Forms', 'forms-planning',     'Planning',                 81, '/pm/projects/:projectId/forms?group=Planning',     'FileText'),
  ('PM', 'Process Group Forms', 'forms-executing',    'Executing',                82, '/pm/projects/:projectId/forms?group=Executing',    'FileText'),
  ('PM', 'Process Group Forms', 'forms-monitoring',   'Monitoring & Controlling', 83, '/pm/projects/:projectId/forms?group=Monitoring',   'FileText'),
  ('PM', 'Process Group Forms', 'forms-closing',      'Closing',                  84, '/pm/projects/:projectId/forms?group=Closing',      'FileText'),
  ('PM', 'Process Group Forms', 'forms-agile',        'Agile',                    85, '/pm/projects/:projectId/forms?group=Agile',        'FileText'),
  ('PM', 'Process Group Forms', 'forms-drafts',       'My Drafts',                86, '/pm/projects/:projectId/forms/drafts',             'FileClock'),
  ('PM', 'Process Group Forms', 'forms-approvals',    'Pending Approvals',        87, '/pm/projects/:projectId/forms?status=in_review',   'FileCheck')
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path    = EXCLUDED.route_path,
  is_active     = TRUE,
  updated_at    = NOW();
```

---

### `SQL/v512_sidebar_revamp_pmo_dashboard.sql`
**Purpose:** Update `public.sidebar_config` (dashboard_type = 'PMO') to match new `pmoMenuConfig.js` structure.

Operations:
- [x] **Move** ITTO Management items → Governance & Standards section (`section_name` update)
- [x] **Move** Delay Management items → Project Oversight section
- [x] **Move** Form Templates, Risk/Issue/Change Register (All) OUT of Testing and QA section → correct sections
- [x] **Fix** `display_order` conflicts (eliminate duplicate 5.5 order values)
- [x] **Insert** new Administration section rows: Form Templates, Procurement links, Org admin links
- [x] **Insert** Process Group Forms section with PMO-level paths (no `:projectId`)
- [x] **Update** Testing and QA section — remove 4 misplaced rows, keep 12 testing-only rows
- [x] **Deactivate** old PMO Admin mixed entries that are now under Administration

```sql
-- Example: Move ITTO from standalone to Governance & Standards
UPDATE sidebar_config
SET section_name = 'Governance & Standards', updated_at = NOW()
WHERE dashboard_type = 'PMO' AND section_name = 'ITTO Management';

-- Example: Move misplaced items out of Testing and QA
UPDATE sidebar_config
SET section_name = 'Administration', updated_at = NOW()
WHERE dashboard_type = 'PMO'
  AND section_name = 'Testing and QA'
  AND document_type IN ('form-templates');

UPDATE sidebar_config
SET section_name = 'Project Oversight', updated_at = NOW()
WHERE dashboard_type = 'PMO'
  AND section_name = 'Testing and QA'
  AND document_type IN ('risk-register-all', 'issue-register-all', 'change-register-all');

-- Example: Fix Process Group Forms path (remove :projectId)
UPDATE sidebar_config
SET route_path = REPLACE(route_path, '/platform/projects/:projectId/forms', '/pmo/forms'), updated_at = NOW()
WHERE dashboard_type = 'PMO' AND section_name = 'Process Group Forms';
```

---

### `SQL/v513_sidebar_revamp_simulator.sql`
**Purpose:** Update `sim.sidebar_config` (both 'PM' and 'PMO' dashboard types) to mirror Platform changes.

Operations (Platform PM changes → Simulator PM):
- [x] Deactivate standalone ITTO, Delays sections in `sim.sidebar_config` (dashboard_type = 'PM')
- [x] Add ITTO/Delay items under Delivery Management in simulator
- [x] Add Process Group Forms section for simulator (`/simulator/pm/projects/:projectId/forms/*`)
- [x] Fix fractional `display_order` values
- [x] Split Planning Intelligence 12-item section

Operations (Platform PMO changes → Simulator PMO):
- [x] Mirror all PMO restructuring: move ITTO to Governance & Standards
- [x] Move Delay items to Project Oversight
- [x] Fix misplaced Testing items
- [x] Add Process Group Forms section with simulator paths (`/simulator/pmo/forms/*`)

```sql
-- Example: Add simulator Process Group Forms section
INSERT INTO sim.sidebar_config (dashboard_type, section_name, document_type, display_order, route_path, icon_name)
VALUES
  ('PM', 'Process Group Forms', 'forms-initiating',   80, '/simulator/pm/projects/:projectId/forms?group=Initiating',   'FileText'),
  ('PM', 'Process Group Forms', 'forms-planning',     81, '/simulator/pm/projects/:projectId/forms?group=Planning',     'FileText'),
  ('PM', 'Process Group Forms', 'forms-executing',    82, '/simulator/pm/projects/:projectId/forms?group=Executing',    'FileText'),
  ('PM', 'Process Group Forms', 'forms-monitoring',   83, '/simulator/pm/projects/:projectId/forms?group=Monitoring',   'FileText'),
  ('PM', 'Process Group Forms', 'forms-closing',      84, '/simulator/pm/projects/:projectId/forms?group=Closing',      'FileText'),
  ('PM', 'Process Group Forms', 'forms-agile',        85, '/simulator/pm/projects/:projectId/forms?group=Agile',        'FileText')
ON CONFLICT DO NOTHING;
```

---

### `SQL/v514_sidebar_revamp_role_permissions_grant.sql`
**Purpose:** Grant correct DB-level permissions on all affected tables to ensure RLS policies allow the new role-based reads.

Operations:
- [x] Grant `SELECT` on `menu_items`, `role_menu_items`, `sidebar_config`, `sim.sidebar_config` to `authenticated` role
- [x] Grant `SELECT` on new permission codes to `authenticated`
- [x] Ensure RLS policies on `role_menu_items` allow each role to read only its own menu assignments
- [x] Ensure `sidebar_config` rows without a permission column are readable by all authenticated users (filtering done in JS layer)

---

## 6.7 SQL File Sequence Summary

| SQL File | Table(s) Affected | Purpose |
|----------|--------------------|---------|
| `SQL/v508_sidebar_revamp_permissions.sql` | `permissions`, `role_permissions` | 6 new permission codes + role assignments |
| `SQL/v509_sidebar_revamp_platform_menu_items.sql` | `menu_items` | Restructure platform `/platform/*` menu |
| `SQL/v510_sidebar_revamp_role_menu_items.sql` | `role_menu_items` | All 10 roles → new menu section assignments |
| `SQL/v511_sidebar_revamp_pm_dashboard.sql` | `public.sidebar_config` (PM) | PM Dashboard (`/pm/*`) restructure |
| `SQL/v512_sidebar_revamp_pmo_dashboard.sql` | `public.sidebar_config` (PMO) | PMO Dashboard (`/pmo/*`) restructure |
| `SQL/v513_sidebar_revamp_simulator.sql` | `sim.sidebar_config` | Simulator menus (both PM + PMO types) |
| `SQL/v514_sidebar_revamp_role_permissions_grant.sql` | `permissions`, `role_menu_items`, RLS | DB grants + RLS alignment for new roles |

---

## 7. Implementation Todo List

### Phase A — Analysis & Mapping (no code changes)
- [x] Confirm all current route paths still exist in `src/App.jsx` before removing any menu entry
- [x] Identify any routes in current menu that point to `null` (dynamic) and decide on placeholder paths
- [x] Confirm `platform-portfolio` and `platform-programme` are PMO-level only (remove from PM menu if so)
- [x] Confirm which component reads each config file and which roles are routed to which config

### Phase B — New Permission Keys (SQL + service)
- [x] Add to `SQL/v507_form_permissions.sql`: `sponsor.view`, `team_member.view`, `qa.view`, `procurement.view`, `finance.view`, `system.admin`
- [x] Update `filterMenuByPermissions()` in `pmMenuConfig.js` to support compound permission checks (e.g. show item if user has ANY of a set of permissions)
- [x] Map each new permission key to the relevant role in the roles/permissions database table

### Phase C — Platform PM Menu (`pmMenuConfig.js`)
- [x] Remove duplicate `platform-testing-qa` block entirely
- [x] Remove `platform-testing-centre` standalone and create single `platform-quality-testing` section
- [x] Create `platform-my-work` section; move Daily Log and Lesson Actions into it
- [x] Create `platform-controls` section; absorb Delays, Work Auth, Decision Log, and registers previously under Projects
- [x] Create `platform-planning` section; absorb ITTO + Dependencies
- [x] Merge `platform-teams` and `platform-stakeholders` into `platform-people-stakeholders`
- [x] Absorb `platform-reports` children into `platform-reporting`
- [x] Absorb `platform-governance`, `platform-pmo-admin`, `platform-oversight`, `platform-lessons-corporate` into `platform-governance-admin` with sub-groups
- [x] Remove all standalone top-level items listed in Section 3 above
- [x] Assign correct permission keys to every child per the Section 3.5 matrices
- [x] Add `sponsor.view`, `team_member.view`, `qa.view`, `procurement.view`, `finance.view` guards to relevant sections

### Phase D — Platform PMO Menu (`pmoMenuConfig.js`) — EXPANDED

**Critical fix first:**
- [x] Fix `PMOLayout.jsx` — replace `import Sidebar from '../Sidebar'` with `import PMOSidebar from './PMOSidebar'` and replace `<Sidebar ...>` with `<PMOSidebar ...>` (this is why the PMO sidebar is showing the sparse platform menu)

**New sections to add:**
- [x] Add Section 1 — Portfolio & Programme: All Projects, Create Project, Project Templates, On Hold, Programme Management, Benefits Management, Dependencies, Portfolio Collisions
- [x] Add Section 10 — People & Resources: Manager Assignments, Assignment Settings, Resource Directory, Team Capacity

**Existing sections to fix:**
- [x] Move Form Templates out of Testing and QA → new Administration section
- [x] Move Risk Register (All), Issue Log (All), Change Register (All) out of Testing → Project Oversight section
- [x] Fix Process Group Forms paths — replace `:projectId` with PMO-level overview route (e.g. `/pmo/forms`)
- [x] Add My Drafts and Pending Approvals children to Process Group Forms section
- [x] Move ITTO Management (templates + drafts) into Governance & Standards section
- [x] Move Delay Register and Delay Templates into Project Oversight section
- [x] Add **Scope Oversight** (`/pmo/oversight/scope`) and **Schedule Oversight** (`/pmo/oversight/schedules`) to Project Oversight (these routes exist in App.jsx but were missing from the menu entirely)
- [x] Fix `order` conflicts (ITTO at 5.5 conflicts with Planning at 5.5; Delay at 5.52)
- [x] Add Administration section: Form Templates, Org Settings, User Management, Role Menu Access, Project Types, Funding Sources, Budget Categories, Subscription (system.admin only), Branding (system.admin only)
- [x] Add Reporting & Assurance expansion: add Report Library and Analytics to the existing four report types
- [x] Clean Testing and QA — remove 4 misplaced non-testing items
- [x] Ensure all PMO sections use **full edit access** — remove any read-only constraints that do not apply to PMO Admin (PMO is the project driver, not a viewer)

### Phase E — PM Dashboard Menu (`pmDashboardMenuConfig.js`) ← NEWLY ADDED
- [x] Absorb `pm-itto` into Delivery Management section (remove fractional standalone)
- [x] Absorb `pm-delays` into Controls & Registers section (remove fractional standalone)
- [x] Split `pm-planning` (12 children) — keep 8 core planning items in Planning Intelligence; move AI items (AI Plan Generator, Confidence Forecast) to a new "AI & Intelligence" child group
- [x] Fix `pm-testing-centre` fractional `order: 6.5` (conflicts with pm-itto) → use integer order 7
- [x] Give each Testing Centre child a distinct icon instead of all-FlaskConical
- [x] Add Process Group Forms section pointing to `/pm/projects/:projectId/forms/*`
- [x] Merge Reporting + Financial Management + Project Closure into one "Reporting & Closure" section
- [x] Apply same role-based permission keys as `pmMenuConfig.js`

### Phase F — Simulator General Menu (`simulatorMenuConfig.js`)
- [x] Expand "Process Group Practice" from single link to section with process group sub-navigation
- [x] Add role-based permission filtering (mirror Platform PM permission keys)
- [x] Audit for Testing Centre duplication vs `simulatorPMMenuConfig.js`

### Phase G — Simulator PM Menu (`simulatorPMMenuConfig.js`)
- [x] Mirror new Platform PM 10-section structure with simulator paths (`/simulator/pm/*`)
- [x] Ensure all sections match Platform PM naming
- [x] Remove any standalone fractional-order items (mirror fixes from Phase E)
- [x] Add Process Group Forms section with simulator paths

### Phase H — Simulator PMO Menu (`simulatorPMOMenuConfig.js`)
- [x] Mirror new Platform PMO 12-section structure with simulator paths (`/simulator/pmo/*`)
- [x] Add Practice Portfolio section with simulator portfolio paths (Section 1)
- [x] Move ITTO items into Governance & Standards (currently standalone `sim-pmo-itto`)
- [x] Move Delay Templates into Project Oversight (currently standalone `sim-pmo-delay-templates`)
- [x] Add Scope Oversight and Schedule Oversight to Practice Oversight section
- [x] Add Practice Forms section with `/simulator/pmo/forms?group=*` paths including My Drafts and Pending Approvals
- [x] Add People & Resources section with `/simulator/pmo/manager-assignments`
- [x] Remove Administration section (not needed for simulator)
- [x] Fix misplaced items in Testing & QA (remove Form Templates from that section)
- [x] Fix `order` conflicts: ITTO at 4.5 and Delay at 4.52 — use integer values
- [x] Expand Reporting & Assurance: add Report Library and Analytics links

### Phase I — Regression & Role Verification
- [x] Verify no existing routes are broken (all paths still resolve in `src/App.jsx`)
- [x] Test each of the 10 roles: confirm sidebar shows only permitted sections
- [x] Test `filterMenuByPermissions()` for: Sponsor (minimal), Team Member (minimal), QA (quality-focused), Procurement (proc-focused), Finance (finance-focused), Viewer (read-only)
- [x] Verify Form Templates link resolves correctly from its new location in both PM and PMO menus
- [x] Verify duplicate Testing & QA entry is completely gone from `pmMenuConfig.js`
- [x] Verify ITTO, Delays, Planning Intelligence have correct integer `order` values in `pmDashboardMenuConfig.js`

---

## 8. Before / After Summary

### Config Files

| Config | Before (sections) | After (sections) | Key Fix |
|--------|------------------|-----------------|---------|
| `pmMenuConfig.js` | 16+ sections | 10 sections | Merge duplicates, group orphans |
| `pmDashboardMenuConfig.js` | 10+ (4 fractional) | 8 sections | Fix fractional orders, split planning, merge closure |
| `pmoMenuConfig.js` | ~10 (order conflicts, incomplete) | **13 sections** | Fix PMOLayout bug · Add Portfolio/Programme · Add People/Resources · Add missing oversight routes · Fix all misplaced items · Full edit access for PMO |
| `simulatorMenuConfig.js` | 4 flat sections | 6 sections | Add process group sub-nav for forms, add role filtering |
| `simulatorPMMenuConfig.js` | Partial mirror | Full 10-section mirror | Match Platform PM |
| `simulatorPMOMenuConfig.js` | Partial mirror | **12-section mirror** | Match Platform PMO (minus Administration) |

### Role Coverage

| Role | Before | After |
|------|--------|-------|
| System Admin | Mixed with PMO Admin via `pmo.admin` | Distinct `system.admin` permission; sees all |
| PMO Admin | Platform sidebar showing (broken layout) + incomplete pmoMenuConfig | **13-section comprehensive PMO menu** with full edit access to all PM features |
| Sponsor | Sees full PM menu (too much) | Minimal 5-section approval-focused view |
| Project Manager | `pmMenuConfig.js` + `pmDashboardMenuConfig.js` (messy) | Both cleaned; 10 clear sections |
| Team Manager/Lead | Full PM menu (too much) | Full minus admin; 9 sections |
| Team Member | Full PM menu (far too much) | 4-section task/status view |
| QA | Full PM menu (scattered quality items) | Quality-focused 7-section view |
| Procurement Manager | Full PM menu (scattered proc items) | Procurement-focused 6-section view |
| Finance/Cost Controller | Full PM menu (scattered financial items) | Finance-focused 5-section view |
| Stakeholder/Viewer | Full PM menu (too much) | Read-only 3-section minimal view |

### Quality Metrics

| Metric | Before | After |
|--------|--------|-------|
| Roles with tailored sidebar | 2 (PM, PMO) | **10 (all roles)** |
| Config files audited | 2 | **6 (all files)** |
| Duplicate menu items | 2+ | 0 |
| Orphaned standalone items | 5 | 0 |
| Fractional `order` values | 4 | 0 |
| Misplaced items (wrong section) | 7 | 0 |
| Routes in App.jsx missing from PMO menu | 2 (Scope, Schedules oversight) | 0 |
| Max children per section | 16 | 12 (Quality & Testing) |
| PMO sections (before → after) | ~10 incomplete | **13 comprehensive** |
| PMO layout bug (wrong Sidebar component) | Present | Fixed |
| New permission keys needed | 0 | 6 (`sponsor.view`, `team_member.view`, `qa.view`, `procurement.view`, `finance.view`, `system.admin`) |

---

## 9. Review Section
*(To be completed after implementation)*

---

**Status:** DRAFT — Awaiting approval before implementation begins.
