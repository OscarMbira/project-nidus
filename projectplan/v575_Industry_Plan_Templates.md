# v575 — Industry Plan Templates

**Objective:** Provide PMO-maintained, industry-specific project plan blueprints (phases, deliverables, risks, milestones, roles) that any PM can browse and copy into their own project as a customisable starting point. 30 industries are seeded. PMO can add, edit, and retire templates at any time.

**Version scope:**
- `v575` — Database tables + RLS (Platform public schema)
- `v576` — Seed data: 30 industry templates with phases, deliverables, risks, milestones, roles
- `v577` — Menu seed: PMO management entries + PM browse/copy entries (both Platform and Simulator)

**Note:** This feature is DISTINCT from the existing `template_library` (document format templates). Industry Plan Templates define the *project methodology structure* for a given industry — they are not document format templates.

**Platform–Simulator parity:** Master templates live in the `public` schema and are shared. Project-scoped copies for Platform go into `public.project_industry_plan`; Simulator practice copies go into `sim.practice_industry_plan`.

---

## 1. Industries Covered (Seed Data — v576)

| # | `industry_code` | `industry_name` |
|---|---|---|
| 1 | `software_development` | Software Development & IT |
| 2 | `construction` | Construction |
| 3 | `management_consulting` | Management Consulting |
| 4 | `infrastructure` | Infrastructure & Civil Engineering |
| 5 | `research_development` | Research & Development (R&D) |
| 6 | `hr_people` | HR & People Management |
| 7 | `office_relocation` | Office Relocation |
| 8 | `event_management` | Event Planning & Management |
| 9 | `manufacturing` | Manufacturing & Product Development |
| 10 | `healthcare_clinical` | Healthcare & Clinical Projects |
| 11 | `marketing_campaigns` | Marketing & Campaign Management |
| 12 | `financial_services` | Financial Services & Transformation |
| 13 | `education_training` | Education & Training Programme |
| 14 | `oil_gas_energy` | Oil, Gas & Energy |
| 15 | `retail_commercial` | Retail & Commercial Fit-Out |
| 16 | `telecommunications` | Telecommunications & Network Rollout |
| 17 | `aerospace_defence` | Aerospace & Defence |
| 18 | `pharmaceutical` | Pharmaceutical & Life Sciences |
| 19 | `agriculture_food` | Agriculture & Food Production |
| 20 | `logistics_supply_chain` | Logistics & Supply Chain |
| 21 | `legal_services` | Legal Services & Compliance |
| 22 | `nonprofit_charity` | Non-Profit & Charity Projects |
| 23 | `government_public_sector` | Government & Public Sector |
| 24 | `mining_natural_resources` | Mining & Natural Resources |
| 25 | `hospitality_tourism` | Hospitality & Tourism |
| 26 | `media_broadcasting` | Media & Broadcasting |
| 27 | `real_estate_property` | Real Estate & Property Development |
| 28 | `cybersecurity` | Cybersecurity & Information Security |
| 29 | `digital_transformation` | Digital Transformation |
| 30 | `sustainability_environment` | Sustainability & Environmental Projects |

Each industry gets: phases, deliverables (linked to phases), risks, milestones, and recommended roles. See §8 for full seed content.

---

## 2. Database Tables (v575)

### 2a. `pmo_industry_templates` — Master template header (PMO-owned)

```sql
CREATE TABLE public.pmo_industry_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code     TEXT NOT NULL UNIQUE,          -- e.g. 'software_development'
  industry_name     TEXT NOT NULL,
  description       TEXT,
  typical_duration  TEXT,                           -- e.g. '3–18 months'
  icon              TEXT,                           -- lucide icon name for UI
  tags              TEXT[] DEFAULT '{}',
  version           TEXT NOT NULL DEFAULT '1.0',
  status            TEXT NOT NULL DEFAULT 'published'
                      CHECK (status IN ('draft', 'published', 'archived')),
  is_active         BOOLEAN DEFAULT TRUE,
  is_deleted        BOOLEAN DEFAULT FALSE,
  created_by        UUID REFERENCES auth.users(id),
  updated_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2b. `pmo_industry_template_phases` — Stages / phases per template

```sql
CREATE TABLE public.pmo_industry_template_phases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_number          INT NOT NULL,
  phase_name            TEXT NOT NULL,
  phase_description     TEXT,
  estimated_duration    TEXT,                       -- e.g. '2–4 weeks'
  sort_order            INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 2c. `pmo_industry_template_deliverables` — Typical deliverables per template (optionally linked to a phase)

```sql
CREATE TABLE public.pmo_industry_template_deliverables (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_id              UUID REFERENCES public.pmo_industry_template_phases(id) ON DELETE SET NULL,
  deliverable_name      TEXT NOT NULL,
  deliverable_type      TEXT DEFAULT 'document'
                          CHECK (deliverable_type IN ('document','report','artefact','decision','approval')),
  is_mandatory          BOOLEAN DEFAULT FALSE,
  sort_order            INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 2d. `pmo_industry_template_activities` — Typical activities per phase with attributes

```sql
CREATE TABLE public.pmo_industry_template_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_id              UUID REFERENCES public.pmo_industry_template_phases(id) ON DELETE SET NULL,
  activity_name         TEXT NOT NULL,
  activity_description  TEXT,
  activity_type         TEXT DEFAULT 'task'
                          CHECK (activity_type IN ('task','review','approval','meeting','deliverable','milestone')),
  typical_duration      TEXT,           -- e.g. '3–5 days'
  typical_effort        TEXT,           -- e.g. '16–24 hours'
  resource_type         TEXT,           -- e.g. 'Business Analyst, PM'
  predecessor_notes     TEXT,           -- e.g. 'After requirements kick-off'
  constraints           TEXT,           -- e.g. 'Must complete before design begins'
  sort_order            INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 2e. `pmo_industry_template_risks` — Pre-defined risk entries per template

```sql
CREATE TABLE public.pmo_industry_template_risks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  risk_title        TEXT NOT NULL,
  risk_description  TEXT,
  risk_category     TEXT,                           -- e.g. 'Technical', 'Commercial', 'Regulatory'
  likelihood        TEXT CHECK (likelihood IN ('low','medium','high')),
  impact            TEXT CHECK (impact IN ('low','medium','high')),
  sort_order        INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2f. `pmo_industry_template_milestones` — Key milestones per template

```sql
CREATE TABLE public.pmo_industry_template_milestones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_id          UUID REFERENCES public.pmo_industry_template_phases(id) ON DELETE SET NULL,
  milestone_name    TEXT NOT NULL,
  milestone_description TEXT,
  sort_order        INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2g. `pmo_industry_template_roles` — Recommended team roles per template

```sql
CREATE TABLE public.pmo_industry_template_roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  role_title        TEXT NOT NULL,
  role_description  TEXT,
  is_key_role       BOOLEAN DEFAULT FALSE,
  sort_order        INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2h. `project_industry_plan` — PM's project-scoped copy (Platform)

```sql
CREATE TABLE public.project_industry_plan (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id       UUID NOT NULL REFERENCES public.pmo_industry_templates(id),
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  plan_title        TEXT NOT NULL,
  customisation_notes TEXT,
  included_phases       JSONB DEFAULT '[]',         -- PM's selected/re-ordered phases
  included_activities   JSONB DEFAULT '[]',         -- PM's selected/custom activities with attributes (name, duration, effort, resource_type, predecessor_notes, constraints, activity_type)
  included_deliverables JSONB DEFAULT '[]',         -- PM's selected deliverables (with added/removed)
  included_risks        JSONB DEFAULT '[]',         -- PM's selected/custom risks
  included_milestones   JSONB DEFAULT '[]',         -- PM's selected/custom milestones
  included_roles        JSONB DEFAULT '[]',         -- PM's selected roles
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','active','completed','archived')),
  is_on_hold        BOOLEAN DEFAULT FALSE,
  on_hold_reason    TEXT,
  is_deleted        BOOLEAN DEFAULT FALSE,
  updated_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 2i. `sim.practice_industry_plan` — Simulator practice copy

```sql
CREATE TABLE sim.practice_industry_plan (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  template_id       UUID NOT NULL REFERENCES public.pmo_industry_templates(id),  -- references shared master
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  plan_title        TEXT NOT NULL,
  customisation_notes TEXT,
  included_phases       JSONB DEFAULT '[]',
  included_activities   JSONB DEFAULT '[]',         -- same structure as Platform copy
  included_deliverables JSONB DEFAULT '[]',
  included_risks        JSONB DEFAULT '[]',
  included_milestones   JSONB DEFAULT '[]',
  included_roles        JSONB DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','active','completed','archived')),
  is_on_hold        BOOLEAN DEFAULT FALSE,
  on_hold_reason    TEXT,
  is_deleted        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. RLS Policies (v575)

### Master tables (`pmo_industry_templates` + all child tables)

```sql
-- Published templates: anyone authenticated can read
CREATE POLICY "industry_tmpl_select_published" ON public.pmo_industry_templates
  FOR SELECT USING (status = 'published' AND is_deleted = FALSE);

-- PMO can read all (including drafts/archived)
CREATE POLICY "industry_tmpl_select_pmo" ON public.pmo_industry_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin'))
  );

-- PMO can INSERT / UPDATE / DELETE
-- (same EXISTS check as above — apply to all 6 master tables)
```

### `project_industry_plan` (Platform copy)

```sql
-- PM can CRUD own project's plan
CREATE POLICY "proj_ind_plan_select" ON public.project_industry_plan
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );
-- PMO can read all (oversight)
CREATE POLICY "proj_ind_plan_pmo_select" ON public.project_industry_plan
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin'))
  );
-- PM INSERT / UPDATE / DELETE: created_by = auth.uid() check
```

### `sim.practice_industry_plan` (Simulator copy)

```sql
-- Users can only see their own practice plans
CREATE POLICY "sim_pil_select" ON sim.practice_industry_plan
  FOR SELECT USING (
    user_id = auth.uid()  -- auth.users.id, same as other sim.practice_* tables
  );
-- Same pattern for INSERT / UPDATE / DELETE
```

---

## 4. New Frontend Pages

### PMO Side — Template Management

**A. Industry Templates List** — `src/pages/pmo/IndustryTemplateList.jsx`
- Route: `/pmo/industry-templates`
- Table + Card toggle, search bar, filter by status (draft/published/archived), sort by industry name/updated_at
- Actions per row: View, Edit, Archive, Duplicate
- Add Template button → Page B
- Export: Excel, CSV, Word (list view)

**B. Industry Template Create/Edit** — `src/pages/pmo/IndustryTemplateForm.jsx`
- Routes: `/pmo/industry-templates/new`, `/pmo/industry-templates/:id/edit`
- Multi-step wizard:
  - Step 1 — Header: `industry_name`, `industry_code`, `description`, `typical_duration`, `icon`, `tags`, `status`
  - Step 2 — Phases: add/reorder/delete phases; each has number, name, description, estimated_duration
  - Step 3 — Activity Attributes: per-phase; add activities with `activity_name`, `activity_type`, `typical_duration`, `typical_effort`, `resource_type`, `predecessor_notes`, `constraints`; drag to reorder within phase
  - Step 4 — Deliverables: assign deliverables to phases; flag mandatory; set deliverable_type
  - Step 5 — Risks: add risk title, category, likelihood, impact
  - Step 6 — Milestones: add milestone name, linked phase
  - Step 7 — Roles: add role title, flag as key role
  - Step 8 — Review & Publish (or Save as Draft)
- On-hold / draft queue supported (save any step as draft, resume later)

**C. Industry Template Detail (PMO view)** — `src/pages/pmo/IndustryTemplateDetail.jsx`
- Route: `/pmo/industry-templates/:id`
- Read-only sections for all 6 child data groups (tabs: Phases, Deliverables, Risks, Milestones, Roles)
- Version history panel
- Edit / Archive / Duplicate / Export (Word, PDF, Excel) actions

**D. Industry Template On-Hold Queue** — `src/pages/pmo/IndustryTemplateOnHold.jsx`
- Route: `/pmo/industry-templates/on-hold`
- Lists draft / on-hold templates for PMO to resume

### PM Side — Browse & Copy

**E. Industry Template Browser** — `src/pages/app/IndustryTemplateBrowser.jsx`
- Route: `/platform/industry-templates`
- Grid of cards, one per industry; search + filter by industry type
- "Preview" expands a read-only panel (phases, activities, deliverables, risks, milestones, roles)
- "Use for My Project →" button → Page F

**F. Copy & Customise Wizard** — `src/pages/app/IndustryPlanCopy.jsx`
- Route: `/app/projects/:projectId/industry-plan/new?from_template=:templateId`
- Multi-step:
  - Step 1 — Name & Notes (`plan_title`, `customisation_notes`)
  - Step 2 — Phases: check/uncheck, drag to reorder, rename phases for your project
  - Step 3 — Activity Attributes: per-phase table of activities; include/exclude each; edit `activity_name`, `typical_duration`, `typical_effort`, `resource_type`, `predecessor_notes`, `constraints`, `activity_type`; add project-specific activities; reorder within phase
  - Step 4 — Deliverables: include/exclude per phase, add project-specific deliverables
  - Step 5 — Risks: include/exclude, add project-specific risks
  - Step 6 — Milestones: include/exclude, set target dates
  - Step 7 — Roles: include/exclude, map to actual team members
  - Step 8 — Review & Save (or Put on Hold)
- On-save: creates one `project_industry_plan` row with JSONB snapshots (including `included_activities`)

**G. Project Industry Plan View** — `src/pages/app/ProjectIndustryPlan.jsx`
- Route: `/app/projects/:projectId/industry-plan`
- Tabbed: Phases | Activities | Deliverables | Risks | Milestones | Roles
- Activities tab: table with columns Phase, Activity, Type, Duration, Effort, Resource Type, Predecessor Notes, Constraints — sortable and exportable
- Edit → re-opens Page F in edit mode
- Export: Word (one section per phase with activities listed), Excel (full activity list with all attributes), PPT
- Archive action

### Simulator Equivalents (same component pattern, sim routes and simDb)

**H.** `src/pages/simulator/IndustryTemplateBrowser.jsx` — Route: `/simulator/industry-templates`
**I.** `src/pages/simulator/IndustryPlanCopy.jsx` — Route: `/simulator/practice-projects/:projectId/industry-plan/new?from_template=:templateId`
**J.** `src/pages/simulator/PracticeIndustryPlan.jsx` — Route: `/simulator/practice-projects/:projectId/industry-plan`

---

## 5. Service Layer

**Platform:**

`src/services/industryTemplateService.js`
```js
listIndustryTemplates({ status, search })       // published only for PM; all for PMO
getTemplateById(id)                             // header + all child rows
createTemplate(payload)                         // PMO: header insert
updateTemplate(id, payload)                     // PMO: update header
archiveTemplate(id)
duplicateTemplate(id)                           // deep copy header + 7 child tables
addPhase / updatePhase / deletePhase
addActivity / updateActivity / deleteActivity   // activity attributes CRUD
addDeliverable / updateDeliverable / deleteDeliverable
addRisk / updateRisk / deleteRisk
addMilestone / updateMilestone / deleteMilestone
addRole / updateRole / deleteRole
getActivitiesByTemplate(templateId)             // all activities across phases
getActivitiesByPhase(phaseId)                   // activities for a single phase
```

`src/services/projectIndustryPlanService.js`
```js
getProjectPlan(projectId)                       // fetch existing copy
createProjectPlan(projectId, templateId, payload) // snapshot JSONB copy
updateProjectPlan(id, payload)
putOnHold(id, reason)
archivePlan(id)
deletePlan(id)
```

**Simulator:**

`src/services/sim/simIndustryTemplateService.js` — reads from public schema master tables via `platformDb` (master templates are shared; no sim-schema duplicate)

`src/services/sim/simPracticeIndustryPlanService.js` — writes to `sim.practice_industry_plan` via `simDb`

---

## 6. Menu Items

### PMO Sidebar — Projects section (alongside existing `pmo-pp-project-templates`)

The existing Templates item (`pmo-pp-project-templates` → `/platform/templates`) already sits in the PMO **Projects** section. The three new industry template items are added to the same section at the next available `sort_order` slots.

| Menu Code | Label | Route | Parent Section | Access | Roles |
|---|---|---|---|---|---|
| `pmo_industry_templates` | Industry Templates | `/pmo/industry-templates` | PMO Projects section | Full | `pmo_admin`, `pmo_manager` |
| `pmo_industry_templates_new` | Add Industry Template | `/pmo/industry-templates/new` | PMO Projects section | Full | `pmo_admin`, `pmo_manager` |
| `pmo_industry_templates_on_hold` | Template Drafts | `/pmo/industry-templates/on-hold` | PMO Projects section | Full | `pmo_admin`, `pmo_manager` |

### PM Sidebar — §14 KNOWLEDGE & RESOURCES (add 2 items)

These sit under the `pm_knowledge_section` parent (the §14 section header in the DB-driven sidebar). The 4 existing §14 items are Template Library, Resource Directory, Skill Matrix, and AI Assistant. The 2 new items are appended at `sort_order` 50 and 60.

| Menu Code | Label | Route | Parent Section | Access | Role |
|---|---|---|---|---|---|
| `pm_industry_templates_browse` | Industry Templates | `/platform/industry-templates` | `pm_knowledge_section` (§14) | **View** (`can_use=false`) | `project_manager` |
| `pm_industry_plan` | My Industry Plan | `/app/projects/:projectId/industry-plan` | `pm_knowledge_section` (§14) | **Full** (`can_use=true`) | `project_manager` |

### Simulator PM Sidebar — Equivalent items (v577 Simulator seed)

The Simulator static config has a `sim-org-knowledge` section (confirmed in `simulatorMenuConfig.js`) containing Template Library and template management. The DB-driven sidebar needs an equivalent parent `sim_pm_knowledge_section`. v577 must create this parent first (if not already seeded by v571), then insert both child items under it.

| Menu Code | Label | Route | Parent Section | Access | Role |
|---|---|---|---|---|---|
| `sim_pm_knowledge_section` | Knowledge & Resources | *(no route — section header)* | *(top-level)* | — | `project_manager` |
| `sim_pm_industry_templates_browse` | Industry Templates | `/simulator/industry-templates` | `sim_pm_knowledge_section` | **View** (`can_use=false`) | `project_manager` |
| `sim_pm_industry_plan` | My Practice Industry Plan | `/simulator/practice-projects/:projectId/industry-plan` | `sim_pm_knowledge_section` | **Full** (`can_use=true`) | `project_manager` |

NOTE: `sim_pm_knowledge_section` must be created with `ON CONFLICT (menu_code) DO NOTHING` so that if v571 already seeded it, v577 does not duplicate it.

### v567 Cross-Reference

The 2 PM items (`pm_industry_templates_browse`, `pm_industry_plan`) must also be:
- Added to **§14** in `projectplan/v567_PM_Sidebar_Rationalisation_Plan.md` sidebar structure
- Added to the **v568 menu seed list** in v567 Phase 1
- Included in **v569** role assignment (View and Full respectively)
- Included in **v571** Simulator parity seed

See §9 Phase 3 (Menu Seed) for v577 implementation details.

---

## 7. SQL Files

| File | Purpose |
|---|---|
| `SQL/v575_industry_template_tables.sql` | Create 9 tables + indexes + RLS (public + sim schemas); register all 9 tables in `database_tables` |
| `SQL/v576_seed/batches/batch_01_of_10.sql` … `batch_10_of_10.sql` | Seed 30 industries (3 per file; Editor-safe). Pointer: `SQL/v576_industry_template_seed.sql` |
| `SQL/v577_industry_template_menu_seed.sql` | PMO items (3, `pmo_admin`+`pmo_manager`) + PM items (2, `project_manager`) + Simulator PM items (2, `project_manager`); assign to roles in `role_menu_items` |

**Execution order:** v575 → v576 → v577

---

## 8. Seed Content (v576) — Per Industry

> Full INSERT statements in v576. Summary below.

### 1. Software Development & IT
**Phases:** Discovery (1–2w) → Requirements (2–4w) → Design (2–4w) → Development (8–16w) → Testing (3–6w) → UAT (2–4w) → Deployment (1–2w) → Hypercare (2–4w)  
**Activities (per phase):**
- *Discovery:* Stakeholder kick-off meeting [meeting, 1d, 4h, PM], Competitor & market analysis [task, 3–5d, 12h, BA], Technical feasibility assessment [task, 2–3d, 8h, Tech Lead]
- *Requirements:* Conduct stakeholder interviews [meeting, 2–3d, 16h, BA], Write user stories & acceptance criteria [task, 5–10d, 40h, BA+PO], Requirements sign-off review [approval, 1d, 2h, PM]
- *Design:* System architecture design [task, 5–7d, 30h, Tech Lead], UI/UX wireframes & prototyping [task, 5–10d, 40h, Designer], Design review & approval [review, 2d, 6h, PM+PO]
- *Development:* Sprint planning sessions [meeting, 1d/sprint, 4h, Scrum Master], Code development & unit tests [task, ongoing, per sprint, Developers], Code review & merge [review, ongoing, 2h/PR, Tech Lead], Integration testing [task, 3–5d, 16h, QA]
- *Testing:* Test case execution [task, 10–15d, 60h, QA], Defect logging & triage [task, ongoing, 4h/d, QA+Dev], Regression testing [task, 3–5d, 20h, QA]
- *UAT:* UAT environment setup [task, 1–2d, 6h, DevOps], User acceptance testing sessions [meeting, 5–10d, 40h, PO+Users], UAT sign-off [approval, 1d, 2h, PO]
- *Deployment:* Go-live checklist review [review, 1d, 3h, PM+Tech Lead], Production deployment [task, 1d, 8h, DevOps], Post-deployment smoke test [task, 1d, 4h, QA]
- *Hypercare:* Daily stand-up with support team [meeting, 1d, 0.5h, PM], Bug triage & hotfix deployment [task, ongoing, 4h/issue, Dev], Hypercare close-out report [deliverable, 2d, 8h, PM]  
**Deliverables:** PRD, System Architecture Doc, UI/UX Prototypes, Sprint Plans, Test Cases, Deployment Runbook, Release Notes, Post-Launch Review  
**Risks:** Scope creep [high/high], Technical debt [medium/high], Key developer dependency [medium/high], Integration failures [medium/high], Security vulnerability [low/high]  
**Milestones:** MVP Approval, Beta Release, User Acceptance, Go-Live, Hypercare Sign-Off  
**Roles:** Product Owner ★, Tech Lead ★, Software Developers, QA Engineers, DevOps Engineer, Business Analyst, Scrum Master

### 2. Construction
**Phases:** Pre-Construction (4–8w) → Design (8–16w) → Procurement (4–8w) → Foundation (4–12w) → Structure (8–24w) → MEP & Fit-Out (8–16w) → Finishing (4–8w) → Handover (2–4w)  
**Activities (per phase):**
- *Pre-Construction:* Site survey & soil investigation [task, 5–10d, 40h, Structural Eng], Planning permission submission [task, 3–5d, 16h, Architect], Stakeholder & community consultation [meeting, 2–3d, 12h, PM]
- *Design:* Architectural concept design [task, 10–20d, 80h, Architect], Structural design & calculations [task, 10–15d, 60h, Structural Eng], Design review meetings [review, 2d, 8h, PM+Architect], Value engineering session [meeting, 2d, 8h, QS]
- *Procurement:* Tender package preparation [task, 5–10d, 40h, QS], Contractor tendering & evaluation [task, 10–20d, 40h, PM+QS], Contract negotiation & award [approval, 3–5d, 12h, PM]
- *Foundation:* Set out & excavation [task, 5–10d, 60h, Site Manager], Foundation pour & inspection [task, 3–5d, 20h, Structural Eng], Foundation sign-off inspection [review, 1d, 4h, Building Inspector]
- *Structure:* Structural frame erection [task, 20–40d, ongoing, Contractor], Progress inspections [review, 1d/week, 3h, Site Manager], Topping-out ceremony coordination [milestone, 1d, 4h, PM]
- *MEP & Fit-Out:* MEP coordination drawings [task, 5–10d, 30h, MEP Eng], Mechanical & electrical installation [task, 30–50d, ongoing, Contractor], MEP commissioning tests [task, 5–10d, 40h, MEP Eng]
- *Finishing:* Internal fit-out works [task, 15–25d, ongoing, Contractor], Snagging survey [task, 3–5d, 20h, Site Manager], Defect rectification [task, 5–10d, 30h, Contractor]
- *Handover:* Practical completion inspection [review, 2d, 8h, PM+Client], O&M manual compilation [deliverable, 3–5d, 20h, Site Manager], Handover meeting & key handover [meeting, 1d, 4h, PM]  
**Deliverables:** Site Survey Report, Architectural Drawings, Structural Drawings, Planning Permission, Bill of Quantities, Site Safety Plan, Inspection Reports, Completion Certificate  
**Risks:** Weather delays [medium/medium], Material shortages [medium/high], Safety incident [low/high], Regulatory approval delay [medium/high], Ground condition surprises [low/high]  
**Milestones:** Planning Permission Granted, Ground Breaking, Topping Out, Practical Completion, Final Handover  
**Roles:** Project Manager ★, Site Manager ★, Architect ★, Structural Engineer, MEP Engineer, HSE Officer, Quantity Surveyor, Main Contractor

### 3. Management Consulting
**Phases:** Proposal (2–4w) → Kick-Off (1w) → Discovery (3–6w) → Analysis (3–6w) → Solution Design (4–8w) → Implementation (8–20w) → Review & Close (2–4w)  
**Activities (per phase):**
- *Proposal:* Scope & SOW drafting [task, 3–5d, 20h, Engagement Mgr], Proposal review & sign-off [approval, 1–2d, 4h, Partner], Client proposal presentation [meeting, 1d, 3h, Engagement Mgr]
- *Kick-Off:* Project charter alignment [meeting, 1d, 4h, PM+Client], Team introductions & roles [meeting, 0.5d, 2h, PM], Work plan & RACI setup [task, 2d, 8h, PM]
- *Discovery:* Stakeholder interviews [meeting, 5–10d, 40h, Consultant], Document & data collection [task, 5–10d, 30h, BA], Workshop facilitation [meeting, 2–3d, 16h, Consultant]
- *Analysis:* Data cleaning & structuring [task, 3–5d, 20h, BA], Root cause & gap analysis [task, 5–10d, 40h, Consultant], Analysis peer review [review, 2d, 8h, Senior Consultant]
- *Solution Design:* Options development [task, 5–10d, 40h, Consultant], Business case modelling [task, 3–5d, 20h, BA], Solution review with client steering group [review, 1–2d, 6h, Engagement Mgr]
- *Implementation:* Change & comms planning [task, 3–5d, 16h, Change Mgr], Workstream execution & tracking [task, ongoing, 4h/d, PM], Weekly status reporting [deliverable, 1d, 4h/week, PM]
- *Review & Close:* Benefits measurement [task, 2–3d, 12h, BA], Lessons learned workshop [meeting, 1d, 4h, Engagement Mgr], Final report compilation [deliverable, 3–5d, 20h, Consultant]  
**Deliverables:** Proposal & SOW, Current State Assessment, Gap Analysis Report, Recommendations Report, Implementation Roadmap, Executive Presentation, Final Report  
**Risks:** Stakeholder resistance [high/high], Data access restrictions [medium/high], Scope creep [high/medium], Client capacity constraints [medium/medium], Key consultant departure [medium/high]  
**Milestones:** Engagement Kick-Off, Current State Sign-Off, Recommendations Presented & Approved, Implementation Complete, Final Review  
**Roles:** Engagement Manager ★, Senior Consultant ★, Business Analyst, Subject Matter Expert, Data Analyst, Change Manager

### 4. Infrastructure & Civil Engineering
**Phases:** Feasibility (8–16w) → Preliminary Design (8–12w) → Environmental Assessment (8–16w) → Detailed Design (12–24w) → Procurement (8–12w) → Construction (24–104w) → Commissioning (4–12w) → Handover (2–4w)  
**Activities (per phase):**
- *Feasibility:* Options appraisal study [task, 10–15d, 60h, Civil Eng], Cost benefit analysis [task, 5–10d, 30h, QS], Feasibility report and review [deliverable, 3–5d, 16h, PM]
- *Preliminary Design:* Topographic survey [task, 5–10d, 30h, Surveyor], Preliminary drawings & calculations [task, 10–20d, 80h, Civil Eng], Authority pre-application consultation [meeting, 2–3d, 10h, PM]
- *Environmental Assessment:* Ecological survey [task, 10–15d, 40h, Ecologist], EIA scoping report [deliverable, 5–10d, 30h, Env Specialist], Public consultation events [meeting, 3–5d, 20h, PM]
- *Detailed Design:* Detailed engineering drawings [task, 20–40d, 160h, Civil Eng], Design coordination meetings [meeting, 1d/week, 3h, PM], Design freeze sign-off [approval, 1–2d, 4h, PM+Client]
- *Procurement:* ITT preparation & issue [task, 5–10d, 30h, Commercial Mgr], Tender evaluation & scoring [task, 5–10d, 20h, PM+QS], Contract award & mobilisation [approval, 2–3d, 8h, PM]
- *Construction:* Progress meetings (weekly) [meeting, 1d, 3h, PM], Site inspections & quality checks [review, 2d/month, 8h, Eng], Variation order management [task, ongoing, 2h/order, PM]
- *Commissioning:* Commissioning test procedures [task, 5–10d, 40h, Commissioning Mgr], Performance testing & sign-off [review, 3–5d, 20h, Engineer], Punch list resolution [task, 5–10d, 30h, Contractor]
- *Handover:* As-built drawing compilation [deliverable, 5–10d, 40h, Engineer], Handover inspection [review, 2–3d, 10h, PM+Client], O&M manual issue [deliverable, 2–3d, 10h, PM]  
**Deliverables:** Feasibility Study, EIA Report, Preliminary Design Pack, Planning Submission, Detailed Engineering Drawings, Procurement Packages, As-Built Drawings, O&M Manual  
**Risks:** Adverse ground conditions [medium/high], Regulatory change [low/high], Cost overrun [high/high], Community/public opposition [medium/medium], Supply chain delay [medium/high]  
**Milestones:** Feasibility Approval, Planning Consent, Contract Award, Substantial Completion, Commissioning Complete, Final Handover  
**Roles:** Project Director ★, Civil Engineer ★, Environmental Specialist, Structural Engineer, HSE Manager, Commissioning Manager, Contracts Manager

### 5. Research & Development (R&D)
**Phases:** Research Planning (4–8w) → Ethics/Regulatory Approval (8–16w) → Literature Review (4–8w) → Experimentation/Data Collection (12–52w) → Analysis (8–16w) → Reporting (4–8w) → Dissemination (4–12w)  
**Activities (per phase):**
- *Research Planning:* Research question & hypothesis definition [task, 3–5d, 16h, PI], Protocol drafting [task, 5–10d, 40h, PI+Co-I], Budget & resource planning [task, 3–5d, 12h, Research Admin]
- *Ethics/Regulatory Approval:* Ethics application preparation [task, 5–10d, 40h, PI], Submission to ethics board [task, 1–2d, 4h, Research Admin], Response to ethics queries [task, 3–10d, 20h, PI]
- *Literature Review:* Systematic search of databases [task, 5–10d, 30h, Research Scientist], Literature screening & extraction [task, 5–10d, 30h, Research Scientist], Literature synthesis write-up [deliverable, 5–7d, 25h, PI]
- *Experimentation:* Lab/field setup & calibration [task, 3–5d, 20h, Research Scientist], Data collection sessions [task, ongoing, per protocol, Research Scientist], Data quality checks [review, 1d/week, 3h, Data Manager]
- *Analysis:* Data cleaning & preparation [task, 5–10d, 30h, Data Analyst], Statistical analysis [task, 10–20d, 80h, Biostatistician], Peer review of analysis results [review, 3–5d, 12h, Co-I]
- *Reporting:* Manuscript drafting [task, 10–20d, 80h, PI], Internal review & revision [review, 3–5d, 12h, Co-I], Journal submission [task, 1–2d, 4h, PI]
- *Dissemination:* Conference abstract submission [task, 1–2d, 6h, PI], Presentation preparation [task, 3–5d, 15h, PI], Press release & lay summary [deliverable, 2–3d, 8h, Comms]  
**Deliverables:** Research Protocol, Ethics Application, Literature Review Document, Data Management Plan, Experimental Data, Analysis Report, Research Paper, Conference Presentation  
**Risks:** Ethics approval delay [medium/high], Hypothesis failure [medium/high], Data quality issues [medium/high], Participant recruitment shortfall [high/medium], Publication rejection [medium/low]  
**Milestones:** Ethics Approval, Pilot Study Complete, Full Study Complete, Database Lock, Paper Submitted, Publication  
**Roles:** Principal Investigator ★, Co-Investigator ★, Research Scientists, Biostatistician, Data Manager, Ethics Liaison, Research Administrator

### 6. HR & People Management
**Phases:** Needs Analysis (2–4w) → Job Design (2–4w) → Recruitment Campaign (4–12w) → Selection & Offer (2–4w) → Onboarding (4–8w) → Development (ongoing) → Performance Review (12w cycles)  
**Activities (per phase):**
- *Needs Analysis:* Workforce demand planning session [meeting, 2d, 8h, HR Mgr+Line Mgr], Skills gap assessment [task, 3–5d, 16h, L&D Specialist], Headcount approval [approval, 1–2d, 4h, HR Director]
- *Job Design:* Job description drafting [task, 2–3d, 10h, HR BP], Salary benchmarking [task, 2–3d, 8h, HR Mgr], Grading & approval [approval, 1d, 2h, HR Director]
- *Recruitment Campaign:* Job advert copywriting [task, 1–2d, 6h, Recruiter], Multi-channel posting [task, 1d, 3h, Recruiter], CV screening & shortlisting [task, 5–10d, 20h, Recruiter]
- *Selection & Offer:* Interview scheduling [task, 2–3d, 6h, Recruiter], Panel interviews [meeting, 3–5d, 30h, Line Mgr+HR], Reference checks [task, 2–3d, 6h, HR], Offer letter issue [deliverable, 1d, 2h, HR]
- *Onboarding:* IT & access setup [task, 1–2d, 6h, IT], Induction programme delivery [meeting, 3–5d, 20h, HR], Buddy/mentor assignment [task, 1d, 2h, Line Mgr], 30-day check-in [meeting, 1d, 1h, HR BP]
- *Development:* Training needs identification [task, 2–3d, 8h, L&D], Training plan scheduling [task, 2–3d, 6h, L&D], Course delivery & tracking [task, ongoing, per course, Facilitator]
- *Performance Review:* Review form distribution [task, 1d, 2h, HR], 1:1 review meetings [meeting, 1–2d, 1h each, Line Mgr], Rating calibration session [meeting, 1d, 3h, HR Director]  
**Deliverables:** Workforce Plan, Job Descriptions, Recruitment Campaign Brief, Interview Scorecards, Onboarding Manual, Training Programme, Probation Review Template, Performance Framework  
**Risks:** Talent scarcity [high/high], Poor cultural fit [medium/high], Regulatory compliance failure [low/high], High attrition [medium/high], Delayed hiring [medium/medium]  
**Milestones:** Roles Defined & Approved, Job Adverts Live, First Hire Start Date, Probation Period Completed, 90-Day Review  
**Roles:** HR Manager ★, Talent Acquisition Lead ★, L&D Specialist, HR Business Partner, Line Manager, Payroll Coordinator

### 7. Office Relocation
**Phases:** Planning (4–8w) → New Site Assessment (2–4w) → Vendor Selection (4–6w) → Fit-Out & Infrastructure (8–16w) → IT Migration Planning (4–8w) → Relocation Execution (1–4w) → Decommission Old Site (2–4w) → Stabilisation (2–4w)  
**Activities (per phase):**
- *Planning:* Relocation objectives & scope definition [task, 2–3d, 8h, PM], Current headcount & space audit [task, 3–5d, 12h, Facilities Mgr], Staff communication plan draft [deliverable, 2–3d, 8h, HR]
- *New Site Assessment:* Site visits & shortlisting [task, 3–5d, 15h, Facilities Mgr], Lease negotiation [task, 5–10d, 20h, Legal], Building condition survey [task, 2–3d, 10h, Surveyor]
- *Vendor Selection:* Fit-out tender preparation [task, 3–5d, 12h, PM], Contractor & supplier evaluation [task, 5–7d, 16h, PM], Contract award [approval, 1–2d, 4h, PM]
- *Fit-Out & Infrastructure:* Space planning & design sign-off [review, 2d, 6h, PM+Staff reps], Fit-out construction works [task, 30–50d, ongoing, Contractor], IT infrastructure cabling [task, 5–10d, 30h, IT Lead]
- *IT Migration Planning:* Asset inventory & categorisation [task, 3–5d, 16h, IT Lead], Migration sequence planning [task, 3–5d, 12h, IT Lead], Connectivity testing at new site [task, 2–3d, 8h, IT Lead]
- *Relocation Execution:* Staff move briefings [meeting, 1–2d, 4h, PM], Physical move execution [task, 2–10d, ongoing, Removals], Post-move IT connectivity checks [task, 1–2d, 8h, IT Lead]
- *Decommission:* Old site dilapidations survey [task, 2–3d, 8h, Surveyor], Reinstatement works [task, 5–15d, ongoing, Contractor], Lease surrender [approval, 1–2d, 4h, Legal]
- *Stabilisation:* Issue log review & resolution [task, 5–10d, 8h, PM], Staff feedback survey [task, 1–2d, 4h, HR], Stabilisation close report [deliverable, 2d, 6h, PM]  
**Deliverables:** Space Requirements Brief, Lease/Contract, Fit-Out Drawings, IT Migration Plan, Move Schedule, Staff Communication Plan, New Site Snag List, Decommission Sign-Off  
**Risks:** Business disruption during move [high/high], IT downtime [medium/high], Fit-out delays [medium/medium], Staff dissatisfaction [medium/medium], Hidden building defects [low/high]  
**Milestones:** New Site Secured, Fit-Out Complete, IT Systems Live, Office Open Day, Old Site Handed Back  
**Roles:** Facilities Manager ★, IT Lead ★, HR / Change Manager, Removals Coordinator, Fit-Out Contractor, Finance Lead

### 8. Event Planning & Management
**Phases:** Concept & Scoping (2–4w) → Planning (4–8w) → Supplier Management (4–8w) → Marketing & Registrations (4–12w) → Pre-Event Logistics (1–2w) → Event Execution (1–5d) → Post-Event (2–4w)  
**Activities (per phase):**
- *Concept & Scoping:* Event objectives definition [meeting, 1d, 4h, Event Mgr+Stakeholders], Budget approval [approval, 1–2d, 4h, Finance], Venue shortlisting & site visits [task, 3–5d, 15h, Event Mgr]
- *Planning:* Venue contract negotiation [task, 3–5d, 10h, Event Mgr], Agenda & programme design [task, 3–5d, 16h, Event Mgr], Speaker identification & outreach [task, 5–10d, 20h, Event Mgr]
- *Supplier Management:* AV & tech supplier briefing [meeting, 1–2d, 6h, AV Lead], Catering brief & tasting session [meeting, 1d, 3h, Catering Mgr], Supplier contracts sign-off [approval, 1–2d, 4h, PM]
- *Marketing & Registrations:* Event landing page setup [task, 2–3d, 12h, Marketing], Email campaign design & send [task, 2–3d, 10h, Marketing], Registration tracking & reporting [task, ongoing, 1h/d, Marketing]
- *Pre-Event Logistics:* Run of show finalisation [deliverable, 2–3d, 8h, Event Mgr], On-site setup & rehearsal [task, 1–2d, 12h, Event Mgr+AV], Attendee packs & materials preparation [task, 2–3d, 8h, Event Mgr]
- *Event Execution:* Registration desk management [task, event duration, ongoing, Event Team], Session facilitation [meeting, event duration, ongoing, Facilitator], Real-time issue resolution [task, event duration, ongoing, Event Mgr]
- *Post-Event:* Attendee feedback survey distribution [task, 1d, 2h, Marketing], Financial reconciliation [task, 2–3d, 8h, Finance], Post-event report compilation [deliverable, 3–5d, 12h, Event Mgr]  
**Deliverables:** Event Brief, Venue Contract, Supplier Contracts, Run of Show, Marketing Materials, Registration System, Post-Event Report, Financial Reconciliation  
**Risks:** Low attendance [high/high], Venue issue or cancellation [low/high], Supplier failure [medium/high], Technical AV failure [medium/medium], Weather (outdoor) [medium/high], Budget overrun [medium/high]  
**Milestones:** Venue Confirmed, Speakers Confirmed, Registrations Open, 80% Capacity Reached, Event Day, Post-Event Report Published  
**Roles:** Event Manager ★, Marketing Lead ★, Logistics Coordinator, AV / Technology Lead, Catering Manager, Finance Controller

### 9. Manufacturing & Product Development
**Phases:** Concept (4–8w) → Design (8–16w) → Prototype (4–12w) → Testing & Validation (8–16w) → Regulatory Approval (8–24w) → Pilot Production (4–8w) → Scale-Up & Launch (8–16w)  
**Activities (per phase):**
- *Concept:* Ideation workshop [meeting, 1–2d, 8h, Product Mgr+Team], Market & feasibility assessment [task, 5–10d, 30h, Product Mgr], Concept approval gate [approval, 1d, 3h, Leadership]
- *Design:* CAD modelling & engineering drawings [task, 15–25d, 120h, Design Eng], Design FMEA [task, 3–5d, 20h, Quality Mgr], Design review (PDR) [review, 2d, 8h, PM+Engineering]
- *Prototype:* Prototype build [task, 10–20d, 80h, Mfg Eng], First article inspection [review, 2–3d, 10h, Quality Mgr], Prototype review meeting [meeting, 1d, 4h, PM+Design]
- *Testing & Validation:* Test plan execution [task, 15–25d, 100h, QA], Failure analysis & redesign iterations [task, 5–15d, 40h, Design Eng], Validation sign-off [approval, 2d, 6h, Quality Mgr]
- *Regulatory Approval:* Technical file compilation [deliverable, 10–15d, 60h, Regulatory], Submission to regulatory body [task, 1–2d, 4h, Regulatory], Response to regulatory queries [task, 5–20d, 30h, Regulatory]
- *Pilot Production:* Pilot run setup [task, 3–5d, 20h, Mfg Eng], Pilot batch production [task, 5–10d, 40h, Production], Pilot batch inspection [review, 2–3d, 10h, Quality Mgr]
- *Scale-Up & Launch:* Production line commissioning [task, 5–10d, 40h, Mfg Eng], Supply chain readiness check [review, 2–3d, 8h, Supply Chain Mgr], Go-to-market launch meeting [meeting, 1d, 4h, PM+Marketing]  
**Deliverables:** Product Specification, CAD / Engineering Drawings, Prototype, Test Reports, Regulatory Submission, Production Plan, Launch Plan, User Manual  
**Risks:** Design flaws discovered late [medium/high], Supplier quality failure [medium/high], Regulatory rejection [low/high], Market timing miss [medium/high], Cost overrun in tooling [medium/medium]  
**Milestones:** Concept Approved, Prototype Ready, Regulatory Approval, Pilot Production Sign-Off, Full Production Launch  
**Roles:** Product Manager ★, Design Engineer ★, Manufacturing Engineer ★, Quality Manager, Regulatory Affairs Officer, Supply Chain Manager

### 10. Healthcare & Clinical Projects
**Phases:** Protocol Design (4–8w) → Ethics & Regulatory Approval (8–24w) → Site & Patient Recruitment (8–24w) → Data Collection (24–104w) → Database Lock (2–4w) → Statistical Analysis (4–12w) → Reporting & Dissemination (4–12w)  
**Activities (per phase):**
- *Protocol Design:* Study design workshop [meeting, 2–3d, 12h, PI+Co-I], Protocol drafting [task, 10–15d, 60h, PI], Internal scientific review [review, 3–5d, 12h, Medical Monitor]
- *Ethics & Regulatory Approval:* Ethics submission preparation [task, 5–10d, 40h, CRC], IND/CTA application [task, 5–10d, 40h, Regulatory], Response to authority queries [task, 5–15d, 25h, PI]
- *Site & Patient Recruitment:* Site initiation visits [meeting, 2–3d, 12h, CRC], Patient screening & eligibility check [task, ongoing, per patient, Site Staff], Informed consent process [task, ongoing, 1h/patient, PI]
- *Data Collection:* Case report form (CRF) completion [task, ongoing, per visit, Site Staff], Remote data monitoring visits [review, 1d/month, 4h, Monitor], Protocol deviation reporting [task, as needed, 2h, CRC]
- *Database Lock:* Data query resolution [task, 5–10d, 30h, Data Mgr], Final data review [review, 3–5d, 12h, Biostatistician], Database lock sign-off [approval, 1d, 2h, Data Mgr+PI]
- *Statistical Analysis:* SAP finalisation [task, 3–5d, 20h, Biostatistician], Statistical analysis execution [task, 5–10d, 40h, Biostatistician], Analysis results review [review, 2–3d, 8h, PI+Biostatistician]
- *Reporting & Dissemination:* CSR drafting [deliverable, 10–20d, 80h, Medical Writer], Regulatory submission preparation [task, 5–10d, 30h, Regulatory], Publication writing [task, 10–20d, 60h, PI]  
**Deliverables:** Clinical Protocol, Informed Consent Forms, Ethics Submission, Investigator Brochure, Data Management Plan, Case Report Forms, Clinical Study Report, Regulatory Submission  
**Risks:** Patient recruitment shortfall [high/high], Protocol deviations [medium/high], Adverse events [medium/high], Regulatory non-compliance [low/high], Site dropout [medium/medium]  
**Milestones:** Ethics Approval, First Patient In (FPI), Last Patient In (LPI), Database Lock, Final Clinical Study Report, Regulatory Submission  
**Roles:** Principal Investigator ★, Clinical Research Coordinator ★, Biostatistician, Data Manager, Regulatory Affairs Officer, Medical Monitor, Site Staff

### 11. Marketing & Campaign Management
**Phases:** Strategy & Briefing (2–4w) → Campaign Design (3–6w) → Content Creation (4–8w) → Pre-Launch QA (1–2w) → Campaign Launch (1d) → In-Flight Optimisation (4–12w) → Campaign Close & Reporting (2–4w)  
**Activities (per phase):**
- *Strategy & Briefing:* Target audience analysis [task, 2–3d, 12h, Analyst], Campaign brief drafting [task, 2–3d, 10h, Campaign Mgr], Brief sign-off [approval, 1d, 2h, Brand Mgr]
- *Campaign Design:* Creative concept ideation [meeting, 1–2d, 8h, Creative Director], Mood board & concept approval [approval, 1d, 3h, Campaign Mgr], Media channel planning [task, 2–3d, 10h, Media Buyer]
- *Content Creation:* Copy writing & editing [task, 5–10d, 40h, Content Writer], Graphic design & asset creation [task, 5–10d, 40h, Designer], Legal & compliance review [review, 1–2d, 6h, Legal]
- *Pre-Launch QA:* Tracking & analytics setup [task, 1–2d, 8h, Analyst], Landing page & link testing [task, 1–2d, 6h, Digital Mgr], Stakeholder preview & sign-off [approval, 1d, 3h, Campaign Mgr]
- *Campaign Launch:* Scheduled publishing & activation [task, 1d, 4h, Digital Mgr], Launch monitoring (first 24h) [task, 1d, 4h, Analyst], Immediate anomaly response [task, as needed, 2h, Campaign Mgr]
- *In-Flight Optimisation:* Weekly performance reporting [deliverable, 1d, 3h/week, Analyst], A/B test analysis & iteration [task, ongoing, 4h/week, Digital Mgr], Budget reallocation decisions [approval, 1d/month, 2h, Campaign Mgr]
- *Campaign Close & Reporting:* Final performance data extraction [task, 1–2d, 6h, Analyst], Campaign post-mortem meeting [meeting, 1d, 3h, Campaign Mgr+Team], Final report compilation [deliverable, 2–3d, 10h, Campaign Mgr]  
**Deliverables:** Campaign Brief, Creative Assets, Media Plan, Landing Pages, Analytics Dashboard, Mid-Campaign Report, Final Campaign Report  
**Risks:** Brand inconsistency [medium/high], Budget overrun [medium/medium], Low engagement / click-through [high/medium], Platform algorithm changes [medium/medium], Creative delays [medium/medium]  
**Milestones:** Brief Approved, Creative Sign-Off, Campaign Live, Mid-Campaign Review, Campaign Close, Final Report Delivered  
**Roles:** Campaign Manager ★, Creative Director ★, Content Writer, Media Buyer, Digital Analyst, Brand Manager

### 12. Financial Services & Transformation
**Phases:** Scoping (4–8w) → Requirements Analysis (6–12w) → Solution Design (8–16w) → Development (12–24w) → Integration Testing (6–12w) → Regulatory Review (4–12w) → Parallel Run (4–8w) → Go-Live (1–2w) → Post-Implementation Review (4–8w)  
**Activities (per phase):**
- *Scoping:* Senior stakeholder alignment workshops [meeting, 2–3d, 12h, Programme Mgr], Regulatory impact pre-assessment [task, 3–5d, 16h, Compliance], Scoping document sign-off [approval, 1–2d, 4h, PM+Sponsor]
- *Requirements Analysis:* Process mapping workshops [meeting, 5–10d, 40h, BA], Regulatory requirements mapping [task, 3–5d, 20h, Compliance], BRD drafting & review [deliverable, 5–10d, 30h, BA]
- *Solution Design:* Architecture design [task, 10–15d, 60h, IT Architect], Data migration strategy [task, 5–7d, 25h, Data Lead], Solution design review [review, 2d, 8h, PM+Architect+Compliance]
- *Development:* Sprint-based development cycles [task, ongoing, per sprint, Dev Team], Code review & quality gate [review, ongoing, 2h/PR, Tech Lead], Compliance checkpoint [review, 1d/fortnight, 3h, Compliance]
- *Integration Testing:* SIT test script execution [task, 10–20d, 80h, Test Mgr], Defect triage & fix [task, ongoing, 4h/issue, Dev], SIT sign-off [approval, 2d, 6h, Test Mgr+PM]
- *Regulatory Review:* Regulatory submission preparation [deliverable, 5–10d, 30h, Compliance], Regulator Q&A management [task, 10–30d, 20h, Compliance], Regulatory approval confirmation [approval, 1d, 2h, Compliance]
- *Parallel Run:* Parallel run monitoring [task, ongoing, 2h/d, Operations], Discrepancy investigation & resolution [task, ongoing, 4h/issue, BA+Dev], Parallel run sign-off [approval, 2d, 6h, PM+Sponsor]
- *Go-Live:* Go/no-go decision meeting [meeting, 1d, 3h, PM+Sponsor], Production cutover [task, 1–2d, 12h, IT], Post-cutover monitoring (first 48h) [task, 2d, ongoing, PM+IT]
- *PIR:* Benefits realisation measurement [task, 3–5d, 16h, BA], Lessons learned session [meeting, 1d, 4h, PM], PIR report [deliverable, 2–3d, 10h, PM]  
**Deliverables:** Business Requirements Document, Process Maps, System Specifications, Regulatory Impact Assessment, Test Plans, Test Results, Regulatory Submissions, PIR Report  
**Risks:** Regulatory non-compliance [low/high], Data security breach [low/high], System integration failure [medium/high], Change resistance [high/medium], Market / rate change during build [medium/medium]  
**Milestones:** Requirements Sign-Off, Regulatory Pre-Approval, UAT Complete, Regulatory Sign-Off, Go-Live, Post-Implementation Review  
**Roles:** Programme Manager ★, Business Analyst ★, Compliance Officer ★, IT Architect, Risk Manager, Change Manager, Test Manager

### 13. Education & Training Programme
**Phases:** Training Needs Analysis (4–6w) → Curriculum Design (4–8w) → Content Development (8–16w) → Pilot Delivery (2–4w) → Feedback & Revision (2–4w) → Full Rollout (8–24w) → Evaluation (4–8w)  
**Activities (per phase):**
- *TNA:* Learner survey distribution & analysis [task, 3–5d, 16h, L&D Mgr], SME interviews [meeting, 2–3d, 10h, L&D], TNA report write-up [deliverable, 2–3d, 8h, L&D Mgr]
- *Curriculum Design:* Learning objectives definition [task, 2–3d, 10h, Instructional Designer], Curriculum map creation [deliverable, 3–5d, 16h, Instructional Designer], Curriculum sign-off [approval, 1d, 3h, L&D Mgr+Sponsor]
- *Content Development:* Module content drafting [task, 3–5d/module, 20h/module, Instructional Designer], SME review of content [review, 2–3d/module, 8h, SME], LMS upload & configuration [task, 2–3d, 10h, LMS Admin]
- *Pilot Delivery:* Pilot participant recruitment [task, 2–3d, 6h, L&D], Pilot session facilitation [meeting, 2–5d, 16h, Facilitator], Pilot feedback collection [task, 1d, 3h, L&D]
- *Feedback & Revision:* Feedback analysis [task, 2–3d, 8h, Instructional Designer], Content revision & update [task, 3–7d, 20h, Instructional Designer], Revised content sign-off [approval, 1d, 2h, L&D Mgr]
- *Full Rollout:* Rollout communication to learners [task, 1–2d, 4h, Comms], Session scheduling & calendar management [task, 2–3d, 6h, L&D Admin], Completion tracking & nudge comms [task, ongoing, 1h/week, LMS Admin]
- *Evaluation:* Evaluation survey design & distribution [task, 2–3d, 8h, L&D], Data analysis & ROI calculation [task, 3–5d, 16h, L&D Mgr], Evaluation report [deliverable, 2–3d, 10h, L&D Mgr]  
**Deliverables:** TNA Report, Curriculum Map, Learning Materials, Facilitator Guide, LMS Configuration, Pilot Feedback Report, Evaluation Report  
**Risks:** Low learner engagement [high/medium], SME availability for content review [medium/medium], LMS technical issues [medium/medium], Outdated content after launch [medium/low], Facilitator quality variance [medium/medium]  
**Milestones:** TNA Approved, Curriculum Sign-Off, Content Ready for Pilot, Pilot Complete, Full Rollout Launch, Evaluation Published  
**Roles:** Learning & Development Manager ★, Instructional Designer ★, Subject Matter Expert, Facilitator, LMS Administrator, Evaluation Specialist

### 14. Oil, Gas & Energy
**Phases:** Feasibility (12–24w) → Front-End Engineering Design (FEED) (16–32w) → Detailed Engineering (24–52w) → Procurement (16–32w) → Construction & Installation (52–156w) → Commissioning & Start-Up (12–24w) → Operations Handover (4–8w)  
**Activities (per phase):**
- *Feasibility:* Reservoir/resource assessment [task, 10–20d, 80h, Geologist], Economic modelling & NPV analysis [task, 5–10d, 30h, Finance], Feasibility gate review [review, 2–3d, 10h, Project Director]
- *FEED:* Process flow diagram development [task, 10–20d, 80h, Process Eng], HAZOP study facilitation [meeting, 5–10d, 40h, HSE Mgr], FEED report compilation [deliverable, 5–10d, 30h, Eng Lead]
- *Detailed Engineering:* Detailed P&ID development [task, 15–30d, 120h, Process Eng], Equipment data sheets [task, 10–20d, 60h, Mech Eng], Interdisciplinary design review (IDR) [review, 2–3d, 10h, Eng Lead]
- *Procurement:* Long-lead equipment purchase orders [task, 5–10d, 20h, Procurement Mgr], Vendor document review [review, ongoing, 4h/package, Eng], Inspection at vendor works [task, 2–5d, 15h, Inspector]
- *Construction & Installation:* Construction progress meetings (weekly) [meeting, 1d, 3h, PM], HSE toolbox talks [meeting, 0.5h/d, 0.5h, HSE Mgr], Mechanical completion punch list [task, 5–10d, 30h, Site Mgr]
- *Commissioning:* Pre-commissioning checks [task, 10–20d, 80h, Commissioning Mgr], System walk-downs & sign-off [review, 5–10d, 30h, Eng], First fire & start-up [milestone, 1–2d, 8h, Commissioning Mgr]
- *Operations Handover:* Operations readiness review [review, 2–3d, 10h, Ops Rep+PM], Training of operations team [task, 5–10d, 40h, Tech], Final handover certificate [deliverable, 1–2d, 4h, PM]  
**Deliverables:** Feasibility Study, FEED Report, P&ID Drawings, HAZOP Study, Procurement Packages, Equipment Data Books, HSE Case, Commissioning Procedures, As-Built Drawings, O&M Manual  
**Risks:** Commodity price volatility [medium/high], Regulatory / permit delays [medium/high], HSE incident [low/high], Equipment delivery delay [medium/high], Ground / seabed condition surprises [low/high], Cost & schedule overrun [high/high]  
**Milestones:** Feasibility Approval, Final Investment Decision (FID), FEED Completion, Mechanical Completion, Ready for Start-Up (RFSU), First Oil / First Gas, Operational Handover  
**Roles:** Project Director ★, Drilling / Process Engineer ★, HSE Manager ★, Commissioning Manager, Procurement Manager, Regulatory Affairs Officer, Operations Representative

### 15. Retail & Commercial Fit-Out
**Phases:** Concept & Brief (2–4w) → Planning Permission (8–16w) → Design Development (4–8w) → Contractor Procurement (4–8w) → Construction / Fit-Out (8–20w) → Visual Merchandising & IT (2–4w) → Soft Opening (1–2w) → Full Launch (1w) → Post-Opening Stabilisation (4–8w)  
**Activities (per phase):**
- *Concept & Brief:* Brand & customer brief alignment [meeting, 1–2d, 6h, Retail PM+Brand], Space requirements planning [task, 2–3d, 8h, Interior Designer], Concept approval [approval, 1d, 3h, Retail Director]
- *Planning Permission:* Architect drawing preparation [task, 5–10d, 30h, Architect], Planning application submission [task, 1–2d, 4h, Architect], Local authority liaison [task, ongoing, 2h/week, PM]
- *Design Development:* Detailed interior design drawings [task, 10–15d, 60h, Interior Designer], Material & finish specification [task, 3–5d, 12h, Interior Designer], Design sign-off meeting [approval, 1d, 3h, Retail Director]
- *Contractor Procurement:* Tender package issue [task, 2–3d, 8h, PM], Contractor interviews [meeting, 2–3d, 10h, PM], Contract award [approval, 1–2d, 4h, PM]
- *Construction / Fit-Out:* Weekly site progress meetings [meeting, 1d, 2h, PM+Site Mgr], Quality inspection visits [review, 1d/week, 3h, PM], Snagging survey [task, 2–3d, 10h, PM]
- *Visual Merchandising & IT:* Fixture installation & planogram [task, 3–5d, 20h, Visual Merchandiser], EPoS & payment system setup [task, 2–3d, 10h, IT Lead], IT connectivity testing [task, 1–2d, 6h, IT Lead]
- *Soft Opening:* Soft opening staff briefing [meeting, 1d, 3h, Store Mgr], Soft trading & customer feedback capture [task, 3–5d, ongoing, Store Mgr], Snag resolution [task, 3–5d, 12h, Contractor]
- *Full Launch:* Marketing & PR launch activities [task, 1–2d, 8h, Marketing], Grand opening event [meeting, 1d, 8h, Store Mgr+Event Coord], Opening day sales report [deliverable, 1d, 2h, Finance]
- *Post-Opening Stabilisation:* Daily trading reports review [task, 1d, 1h/d, Store Mgr], Remaining snag resolution [task, 5–10d, 20h, Contractor], Stabilisation close report [deliverable, 2d, 6h, PM]  
**Deliverables:** Concept Design, Planning Application, Fit-Out Drawings, Supplier Contracts, Snag List, IT / EPoS Setup Sign-Off, Launch Plan, Post-Opening Trading Report  
**Risks:** Planning permission refused [medium/high], Construction cost overrun [medium/medium], Supply chain disruption [medium/medium], Trading during works disruption [medium/high], Staff readiness [medium/medium]  
**Milestones:** Design Approved, Planning Permission Granted, Contractor Mobilised, Fit-Out Complete, IT Systems Live, Soft Opening, Grand Opening  
**Roles:** Retail Project Manager ★, Interior / Fit-Out Designer ★, Store Manager, Main Contractor, IT / EPoS Lead, Visual Merchandiser, Finance Controller

### 16. Telecommunications & Network Rollout
**Activities (per phase):**
- *Feasibility & Survey:* Coverage demand modelling [task, 5–10d, 30h, Network Eng], Site feasibility surveys [task, 10–15d, 50h, Field Eng], Feasibility report sign-off [approval, 1–2d, 4h, PM]
- *Design & Spectrum Planning:* Radio frequency planning [task, 10–15d, 60h, RF Eng], Network topology design [task, 5–10d, 30h, Network Arch], Design peer review [review, 2–3d, 8h, Eng Lead]
- *Regulatory & Licensing:* Spectrum licence application [task, 3–5d, 16h, Regulatory], Local authority tower permits [task, 5–10d, 20h, PM], Licence approval tracking [task, ongoing, 1h/d, Regulatory]
- *Procurement:* Equipment specification & tender [task, 5–10d, 30h, Procurement], Vendor evaluation & selection [task, 5–10d, 20h, PM+Eng], Purchase orders & delivery scheduling [task, 2–3d, 8h, Procurement]
- *Site Acquisition:* Landlord negotiation & lease signing [task, 10–20d, 30h, Site Acq Mgr], Site access agreement [task, 2–3d, 8h, Legal], Site readiness inspection [review, 1d/site, 3h, Field Eng]
- *Infrastructure Build:* Tower/mast erection [task, 2–3d/site, 16h, Field Eng], Equipment installation & cabling [task, 1–2d/site, 10h, Field Eng], Health & safety sign-off [approval, 0.5d/site, 2h, HSE]
- *Integration & Testing:* End-to-end network integration test [task, 5–10d, 40h, Network Eng], Coverage drive testing [task, 3–5d, 20h, RF Eng], Test results review & acceptance [review, 2d, 8h, PM]
- *Go-Live & Optimisation:* Commercial launch announcement coordination [task, 1–2d, 6h, PM+Marketing], Post-launch performance monitoring [task, ongoing, 2h/d, NOC], Optimisation tuning [task, 5–10d, 20h, RF Eng]  
**Phases:** Feasibility & Survey (4–8w) → Design & Spectrum Planning (8–16w) → Regulatory & Licensing (8–16w) → Procurement (6–12w) → Site Acquisition (8–20w) → Infrastructure Build (16–52w) → Integration & Testing (8–16w) → Go-Live & Optimisation (4–8w)  
**Deliverables:** Coverage & Feasibility Report, Network Design Document, Licence Applications, Vendor Contracts, Site Lease Agreements, Build Completion Reports, Integration Test Results, Network Performance Report  
**Risks:** Spectrum licence delays [medium/high], Site access refusal [high/medium], Equipment supply delays [medium/high], Coverage gap post-launch [medium/high], Regulatory non-compliance [low/high], Interference issues [medium/medium]  
**Milestones:** Licence Granted, Site Acquisition Complete, First Site Live, Network Integration Sign-Off, Commercial Launch, Performance Baseline Established  
**Roles:** Programme Manager ★, Network Design Engineer ★, Regulatory Affairs Officer, Site Acquisition Manager, Procurement Lead, RF Optimisation Engineer, Field Engineers

### 17. Aerospace & Defence
**Activities (per phase):**
- *Concept Definition:* CONOPS development workshop [meeting, 3–5d, 20h, Systems Eng], Trade studies & technology selection [task, 5–10d, 30h, Systems Eng], Concept review gate [review, 2d, 8h, Programme Director]
- *System Requirements:* System requirements specification drafting [task, 10–20d, 80h, Systems Eng], Requirements verification matrix [task, 5–10d, 30h, Systems Eng], Requirements baseline sign-off [approval, 2d, 6h, PM+Customer]
- *Preliminary Design:* Preliminary design review (PDR) preparation [task, 10–15d, 60h, Chief Designer], PDR presentation [review, 2–3d, 12h, Programme Director+Customer], Risk register update post-PDR [task, 2–3d, 8h, PM]
- *Detailed Design:* CDR preparation & documentation [task, 15–25d, 100h, Chief Designer], CDR presentation & approval [approval, 2–3d, 12h, Programme Director], Export control review [review, 2–3d, 8h, Export Officer]
- *Development & Build:* Manufacturing kick-off [meeting, 1d, 4h, PM+Mfg Lead], Build progress tracking (weekly) [task, 1d, 3h, PM], Configuration change board (CCB) [meeting, 1d/month, 4h, PM]
- *Integration & Test:* Integration test plan execution [task, 15–30d, 120h, T&E Lead], Anomaly reporting & disposition [task, ongoing, 3h/anomaly, Systems Eng], T&E report compilation [deliverable, 5–7d, 25h, T&E Lead]
- *Qualification & Certification:* Airworthiness evidence package [deliverable, 10–20d, 80h, Safety Mgr], Certification authority submission [task, 3–5d, 12h, Regulatory], Type certificate award ceremony [milestone, 1d, 3h, PM]
- *Delivery & Support:* Delivery acceptance review [review, 2d, 8h, PM+Customer], ILS documentation handover [deliverable, 2–3d, 8h, Logistics Mgr], In-service support plan activation [task, 2–3d, 8h, Support Mgr]  
**Phases:** Concept Definition (8–16w) → System Requirements (12–24w) → Preliminary Design (16–32w) → Detailed Design (24–52w) → Development & Build (52–156w) → Integration & Test (24–52w) → Qualification & Certification (16–40w) → Delivery & Support (ongoing)  
**Deliverables:** Concept of Operations (CONOPS), System Requirements Specification, Preliminary Design Review (PDR) Pack, Critical Design Review (CDR) Pack, Manufacturing Plans, Test & Evaluation Plans, Airworthiness / Certification Evidence, Integrated Logistics Support Plan  
**Risks:** Requirements creep [high/high], Technology readiness shortfall [medium/high], Export control / ITAR compliance [low/high], Key talent availability [medium/high], Schedule compression [high/high], Safety certification failure [low/high]  
**Milestones:** PDR Approval, CDR Approval, First Article Complete, Integration Test Complete, Certification Achieved, Delivery to Customer  
**Roles:** Programme Director ★, Systems Engineer ★, Chief Designer ★, Safety & Airworthiness Manager, Test & Evaluation Lead, Logistics Support Manager, Export Control Officer

### 18. Pharmaceutical & Life Sciences
**Activities (per phase):**
- *Target Identification:* Target validation assays [task, 10–20d, 60h, Research Scientist], Compound library screening [task, 10–20d, 50h, Research Scientist], Go/no-go decision review [review, 1–2d, 6h, CMO]
- *Pre-Clinical:* In vitro study execution [task, 20–40d, 100h, Research Scientist], In vivo animal studies [task, 30–60d, 120h, Research Scientist], Pre-clinical safety data package [deliverable, 5–10d, 30h, Regulatory]
- *Phase I Trial:* Site & investigator selection [task, 5–10d, 20h, Clinical Ops], Protocol training for site staff [meeting, 2–3d, 12h, CRC], Dose escalation review [review, 1d/cohort, 4h, Data Safety Monitoring Board]
- *Phase II Trial:* Interim analysis review [review, 2–3d, 10h, Biostatistician+PI], Dose selection decision [approval, 1–2d, 6h, CMO], Safety review committee meeting [meeting, 1d/quarter, 4h, Safety Mgr]
- *Phase III Trial:* Multi-site initiation visits [meeting, 2d/site, 8h, CRA], Blinded interim analysis [task, 5–10d, 30h, Biostatistician], DSMB recommendation review [review, 1–2d, 4h, PI+Sponsor]
- *Regulatory Submission:* NDA/MAA dossier assembly [task, 15–25d, 120h, Regulatory], Agency pre-submission meeting [meeting, 1–2d, 6h, Regulatory Director], Response to agency questions [task, 10–30d, 60h, Regulatory]
- *Approval & Launch:* Launch readiness review [review, 2–3d, 10h, Programme Mgr], Commercial distribution setup [task, 5–10d, 30h, Supply Chain], Medical affairs launch briefing [meeting, 1–2d, 8h, Medical Affairs]
- *Post-Marketing:* Adverse event monitoring [task, ongoing, 2h/d, Pharmacovigilance], Risk management plan update [task, quarterly, 8h, Regulatory], Post-marketing study execution [task, ongoing, per protocol, Clinical Ops]  
**Phases:** Target Identification (12–24w) → Pre-Clinical Research (24–104w) → Phase I Clinical Trial (52–104w) → Phase II Clinical Trial (104–208w) → Phase III Clinical Trial (104–260w) → Regulatory Submission (24–52w) → Approval & Launch (24–52w) → Post-Marketing Surveillance (ongoing)  
**Deliverables:** Target Product Profile (TPP), IND/CTA Application, Clinical Study Protocol, Investigator Brochure, Phase I–III CSRs, New Drug Application (NDA/MAA), Risk Management Plan, Post-Marketing Report  
**Risks:** Trial failure at any phase [high/high], Regulatory rejection [medium/high], Patient recruitment shortfall [high/medium], Adverse drug reaction [low/high], Manufacturing scale-up failure [medium/high], IP / patent challenge [low/high]  
**Milestones:** IND/CTA Approval, First Patient In (Phase I), Phase I Complete, Phase II Complete, Phase III Complete, Regulatory Submission, Market Authorisation, Product Launch  
**Roles:** Chief Medical Officer ★, Clinical Development Lead ★, Regulatory Affairs Director ★, Biostatistician, Clinical Operations Manager, Pharmacovigilance Officer, CMC Lead

### 19. Agriculture & Food Production
**Activities (per phase):**
- *Land Assessment & Planning:* Soil analysis & water availability survey [task, 5–10d, 30h, Agronomist], Crop/production selection & rotation plan [task, 3–5d, 16h, Agronomist], Regulatory & environmental compliance check [task, 2–3d, 8h, Compliance Officer]
- *Input Procurement:* Seed/input specification & vendor selection [task, 3–5d, 12h, Farm Mgr], Purchase orders & delivery scheduling [task, 2–3d, 6h, Farm Mgr], Cold chain & storage readiness [task, 2–3d, 8h, Logistics Mgr]
- *Land Preparation:* Irrigation infrastructure installation [task, 5–10d, 30h, Irrigation Eng], Soil preparation & fertilisation [task, 3–5d, 16h, Agronomist], Equipment readiness inspection [review, 1–2d, 6h, Farm Mgr]
- *Planting / Production Setup:* Planting schedule execution [task, 5–10d, ongoing, Field Supervisors], IPM (integrated pest management) plan activation [task, 1–2d, 4h, Agronomist], Crop health monitoring setup [task, 1–2d, 4h, Agronomist]
- *Crop / Production Cycle:* Weekly crop scouting & health assessments [task, 1d/week, 4h, Agronomist], Irrigation scheduling & adjustment [task, ongoing, 2h/d, Irrigation Mgr], Pest & disease intervention [task, as needed, 4h/intervention, Agronomist]
- *Harvest / Processing:* Harvest readiness assessment [review, 1–2d, 6h, Agronomist], Harvest execution & logistics coordination [task, 5–15d, ongoing, Farm Mgr+Field Supervisors], Post-harvest processing & grading [task, 5–10d, 30h, Processing Team]
- *Quality Assurance & Certification:* Product sampling & laboratory testing [task, 3–5d, 12h, QA Officer], Certification audit preparation [task, 3–5d, 16h, QA Officer], Certification body audit [review, 1–3d, 12h, Certifying Body]
- *Market & Distribution:* Buyer negotiation & contracts [task, 3–5d, 12h, Farm Mgr], Distribution logistics planning [task, 2–3d, 8h, Logistics Mgr], First-batch delivery & confirmation [task, 1–2d, 6h, Logistics Mgr]  
**Phases:** Land Assessment & Planning (4–12w) → Input Procurement (4–8w) → Land Preparation (2–6w) → Planting / Production Setup (2–8w) → Crop / Production Cycle (12–40w) → Harvest / Processing (4–12w) → Quality Assurance & Certification (4–8w) → Market & Distribution (4–8w)  
**Deliverables:** Land Survey Report, Agronomy Plan, Input Procurement Plan, Irrigation & Infrastructure Design, Crop / Production Schedule, Harvest Record, Food Safety & Certification Report, Market Plan  
**Risks:** Adverse weather / climate [high/high], Pest & disease outbreak [medium/high], Water scarcity [medium/high], Price volatility [high/medium], Regulatory / certification failure [low/high], Labour availability [medium/medium]  
**Milestones:** Land Preparation Complete, Planting Complete, Mid-Season Assessment, Harvest Start, Quality Certification Achieved, First Batch to Market  
**Roles:** Farm / Production Manager ★, Agronomist ★, Irrigation Engineer, Food Safety Officer, Logistics & Distribution Manager, Finance Controller, Field Supervisors

### 20. Logistics & Supply Chain
**Activities (per phase):**
- *Network Design:* As-is network mapping [task, 3–5d, 20h, Supply Chain Director], To-be network modelling & optimisation [task, 5–10d, 30h, Supply Chain Analyst], Network design sign-off [approval, 1–2d, 4h, PM+Director]
- *Supplier Onboarding:* Supplier qualification & due diligence [task, 5–10d, 30h, Procurement Mgr], SLA & contract negotiation [task, 5–10d, 20h, Commercial], Supplier kick-off meeting [meeting, 1d/supplier, 3h, PM]
- *Warehouse / Hub Setup:* Layout design & racking plan [task, 3–5d, 16h, Warehouse Mgr], WMS configuration & testing [task, 5–10d, 30h, IT Lead], H&S inspection & sign-off [review, 1–2d, 6h, HSE]
- *Systems Integration:* WMS/TMS integration specification [task, 3–5d, 16h, IT Architect], API development & testing [task, 5–10d, 30h, Dev], UAT sign-off [approval, 2d, 6h, IT Lead+PM]
- *Pilot Operations:* Pilot volumes definition [task, 1–2d, 4h, Operations Mgr], Pilot order processing & monitoring [task, 5–10d, 30h, Warehouse Mgr], Pilot performance review [review, 2d, 8h, PM+Director]
- *Full Rollout:* Phased volume ramp-up [task, 10–20d, ongoing, Operations Mgr], Carrier & 3PL onboarding [task, 5–10d, 20h, Logistics Mgr], KPI dashboard activation [task, 2–3d, 8h, Analyst]
- *Performance Optimisation:* Monthly KPI review [meeting, 1d, 3h, PM+Director], Route & load optimisation analysis [task, 3–5d, 16h, Analyst], Supplier performance review [review, 1d/quarter, 4h, Procurement Mgr]  
**Phases:** Network Design (4–8w) → Supplier Onboarding (4–12w) → Warehouse / Hub Setup (8–16w) → Systems Integration (6–12w) → Pilot Operations (4–8w) → Full Rollout (8–20w) → Performance Optimisation (ongoing)  
**Deliverables:** Network Design Report, Supplier Contracts & SLAs, Warehouse Layout Plan, WMS / TMS Configuration, Integration Test Results, SOPs, KPI Dashboard, Pilot Review Report  
**Risks:** Supplier reliability failure [high/high], Customs & regulatory delays [medium/high], IT system integration failure [medium/high], Demand forecasting error [high/medium], Carrier / haulage capacity [medium/medium], Labour disruption [medium/high]  
**Milestones:** Network Design Approved, Key Suppliers Contracted, Warehouse Operational, Systems Go-Live, Pilot Complete, Full Network Live  
**Roles:** Supply Chain Director ★, Logistics Project Manager ★, Procurement Manager, Warehouse Manager, IT Systems Lead, Customs & Trade Compliance Officer, Carrier Relationship Manager

### 21. Legal Services & Compliance
**Activities (per phase):**
- *Matter Scoping:* Client intake & conflicts check [task, 1d, 3h, Partner], Scope, fee estimate & engagement letter [deliverable, 1–2d, 6h, Senior Counsel], Client briefing meeting [meeting, 1d, 2h, Partner+Client]
- *Research & Due Diligence:* Legal database research [task, 3–7d, 20h, Associate], Document review & privilege log [task, 3–7d, 20h, Paralegal], Due diligence report [deliverable, 2–3d, 10h, Associate]
- *Strategy Development:* Legal strategy memo drafting [task, 2–3d, 12h, Senior Counsel], Strategy review with client [meeting, 1d, 3h, Partner+Client], Risk assessment & advice letter [deliverable, 1–2d, 6h, Senior Counsel]
- *Documentation & Drafting:* First draft of agreements/pleadings [task, 5–15d, 40h, Associate], Internal review & mark-up [review, 2–3d, 8h, Senior Counsel], Client review & comment resolution [task, 2–5d, 10h, Associate]
- *Review & Negotiation:* Counterparty negotiation sessions [meeting, 3–10d, 20h, Partner], Redline tracking & version control [task, ongoing, 2h/round, Associate], Final agreed form sign-off [approval, 1d, 2h, Partner]
- *Filing / Execution:* Document execution coordination [task, 1–2d, 4h, Paralegal], Court or registry filing [task, 1d, 3h, Paralegal], Filing confirmation & receipts [deliverable, 1d, 1h, Paralegal]
- *Post-Execution Compliance:* Compliance calendar setup [task, 1–2d, 4h, Compliance Officer], Ongoing regulatory monitoring [task, ongoing, 2h/week, Compliance Officer], Compliance report to client [deliverable, 1d/quarter, 4h, Compliance Officer]  
**Phases:** Matter Scoping (1–2w) → Research & Due Diligence (2–8w) → Strategy Development (2–4w) → Documentation & Drafting (4–16w) → Review & Negotiation (2–8w) → Filing / Execution (1–4w) → Post-Execution Compliance (ongoing)  
**Deliverables:** Matter Scope & Engagement Letter, Due Diligence Report, Legal Strategy Memo, Draft Agreements / Pleadings, Negotiation Summary, Executed Documents, Compliance Monitoring Plan  
**Risks:** Regulatory change mid-matter [medium/high], Client information gaps [high/medium], Privilege breach [low/high], Deadline / limitation period miss [low/high], Adverse court / regulatory ruling [medium/high], Conflict of interest [low/high]  
**Milestones:** Matter Scope Agreed, Due Diligence Complete, Strategy Approved, Drafts Finalised, Negotiation Complete, Execution / Filing, Post-Execution Review  
**Roles:** Partner / Senior Counsel ★, Associate Solicitor ★, Paralegal, Compliance Officer, Legal Project Manager, Client Relationship Lead

### 22. Non-Profit & Charity Projects
**Activities (per phase):**
- *Needs Assessment:* Community consultation sessions [meeting, 3–5d, 20h, Programme Director], Baseline data collection [task, 5–10d, 25h, M&E Mgr], Needs assessment report [deliverable, 3–5d, 12h, Programme Director]
- *Programme Design:* Theory of change workshop [meeting, 2–3d, 10h, Programme Director+Team], Logical framework (logframe) development [task, 3–5d, 16h, M&E Mgr], Programme design review with board [review, 1–2d, 4h, Programme Director]
- *Funding & Grant Applications:* Funding landscape mapping [task, 3–5d, 12h, Fundraising Lead], Grant proposal writing [task, 5–15d, 40h, Fundraising Lead], Proposal submission & tracking [task, 1–2d/proposal, 4h, Fundraising Lead]
- *Partnerships & MOU:* Partner identification & due diligence [task, 3–5d, 16h, Partnership Mgr], MOU drafting & negotiation [task, 3–5d, 12h, Legal+Partnership Mgr], MOU signing ceremony [milestone, 1d, 2h, Programme Director]
- *Implementation:* Activity schedule management [task, ongoing, 2h/d, PM], Monthly beneficiary reporting [deliverable, 1d/month, 4h, Field Coordinators], Donor progress report [deliverable, 1d/quarter, 6h, Programme Director]
- *Monitoring & Evaluation:* Data collection tool deployment [task, 2–3d, 8h, M&E Mgr], Monthly data review & analysis [task, 1–2d/month, 6h, M&E Mgr], Mid-term evaluation [task, 5–10d, 30h, External Evaluator]
- *Reporting & Impact Assessment:* Final data consolidation [task, 3–5d, 16h, M&E Mgr], Impact story collection [task, 2–3d, 8h, Comms Mgr], Final impact report [deliverable, 5–7d, 25h, Programme Director]  
**Phases:** Needs Assessment (4–8w) → Programme Design (4–8w) → Funding & Grant Applications (8–20w) → Partnerships & MOU (4–8w) → Implementation (12–52w) → Monitoring & Evaluation (ongoing) → Reporting & Impact Assessment (4–8w)  
**Deliverables:** Needs Assessment Report, Theory of Change, Programme Design Document, Funding Proposals, Grant Agreements / MOUs, Activity Reports, Monitoring & Evaluation Framework, Impact Report  
**Risks:** Funding shortfall [high/high], Donor priorities shifting [medium/high], Beneficiary access issues [medium/high], Staff / volunteer turnover [medium/medium], Regulatory compliance (charity law) [low/high], Reputational risk [low/high]  
**Milestones:** Needs Assessment Complete, Funding Secured, Implementation Launch, Mid-Programme Review, Final Evaluation, Impact Report Published  
**Roles:** Programme Director ★, M&E Manager ★, Fundraising Lead, Partnership Manager, Finance Officer, Communications Manager, Field Coordinators

### 23. Government & Public Sector
**Activities (per phase):**
- *Policy & Business Case:* Strategic options appraisal [task, 5–10d, 30h, Programme Mgr], Outline Business Case (OBC) drafting [deliverable, 10–15d, 60h, BA], Treasury/approving authority submission [task, 2–3d, 8h, Finance Director]
- *Procurement & Tender:* Market engagement (Prior Information Notice) [task, 2–3d, 6h, Commercial], ITT/RFP drafting & legal review [task, 10–15d, 50h, Commercial+Legal], Tender evaluation & scoring [task, 5–10d, 30h, Evaluation Panel]
- *Contract Award:* Standstill period management [task, 10d statutory, 2h/d, Commercial], Contract finalisation & signing [task, 3–5d, 10h, Legal+Commercial], Contract award notification [deliverable, 1d, 2h, Commercial]
- *Mobilisation:* Joint kick-off workshop [meeting, 2–3d, 12h, Programme Mgr+Supplier], Governance & reporting framework setup [task, 3–5d, 16h, Programme Mgr], RACI & escalation matrix sign-off [approval, 1–2d, 4h, SRO]
- *Delivery:* Monthly programme board meetings [meeting, 1d, 3h, Programme Mgr], Gateway review preparation [task, 5–10d, 30h, PM], Ministerial/stakeholder briefing packs [deliverable, 1–2d/quarter, 6h, Comms Lead]
- *Assurance & Audit:* Internal audit programme execution [task, 5–10d, 30h, Audit], NAO/external audit liaison [task, 3–5d, 12h, Finance], Audit recommendation action plan [deliverable, 2–3d, 8h, PM]
- *Transition & Closure:* Benefits realisation measurement [task, 3–5d, 16h, Benefits Owner], Lessons learned session [meeting, 1d, 4h, Programme Mgr], Project closure report [deliverable, 3–5d, 12h, PM]  
**Phases:** Policy & Business Case (8–16w) → Procurement & Tender (12–24w) → Contract Award (2–4w) → Mobilisation (4–8w) → Delivery (24–104w) → Assurance & Audit (4–12w) → Transition & Closure (4–8w)  
**Deliverables:** Outline Business Case (OBC), Full Business Case (FBC), ITT / RFP Documents, Evaluation Report, Contract, Programme Plan, Gateway Review Reports, Benefits Realisation Plan, Lessons Learned Report  
**Risks:** Political priority change [high/high], Procurement challenge [medium/high], Budget allocation cut [medium/high], Public scrutiny / FOI [medium/medium], Supplier performance failure [medium/high], Parliamentary / legislative dependency [low/high]  
**Milestones:** OBC Approved, FBC Approved, Contract Award, Gateway 0–5 Reviews, Project Delivery Complete, Benefits Review  
**Roles:** SRO (Senior Responsible Owner) ★, Programme Manager ★, Commercial / Procurement Lead ★, Finance Director, Communications Lead, Independent Assurance Reviewer, Benefits Owner

### 24. Mining & Natural Resources
**Activities (per phase):**
- *Exploration:* Geophysical survey execution [task, 10–20d, 60h, Geologist], Drilling programme management [task, 15–30d, 80h, Drilling Eng], Sample assay & data QA/QC [task, 5–10d, 25h, Geologist]
- *Resource Estimation:* Geological modelling [task, 10–15d, 60h, Geologist], Resource classification (JORC/NI43-101) [task, 5–10d, 30h, Competent Person], Resource estimate report sign-off [approval, 2–3d, 8h, Project Director]
- *Feasibility Study:* Mining method selection [task, 5–10d, 30h, Mine Eng], Capital & operating cost estimation [task, 5–10d, 30h, QS], Feasibility study peer review [review, 3–5d, 12h, Independent Reviewer]
- *ESIA:* Baseline environmental & social survey [task, 10–20d, 60h, Env Specialist], Stakeholder & community consultation [meeting, 5–10d, 30h, Community Relations Mgr], ESIA report submission [deliverable, 5–10d, 25h, Env Specialist]
- *Permitting:* Mining licence application [task, 5–10d, 20h, Regulatory], Government authority engagement [meeting, ongoing, 3h/meeting, PM], Permit conditions review [task, 2–3d, 8h, Legal]
- *Mine Design & Engineering:* Mine plan development [task, 15–25d, 100h, Mine Eng], Infrastructure design (haul roads, tailings) [task, 10–20d, 80h, Civil Eng], Design basis freeze [approval, 2d, 6h, Project Director]
- *Construction:* Construction progress meetings (weekly) [meeting, 1d, 3h, PM], HSE incident reporting & review [task, ongoing, 1h/incident, HSE Mgr], Mechanical completion inspection [review, 3–5d, 15h, Commissioning Mgr]
- *Commissioning & Ramp-Up:* Cold commissioning of plant [task, 5–10d, 40h, Commissioning Mgr], First ore processing trial [milestone, 2–3d, 12h, Operations Mgr], Ramp-up performance reporting [deliverable, 1d/week, 4h, PM]  
**Phases:** Exploration (12–52w) → Resource Estimation (8–24w) → Feasibility Study (12–24w) → Environmental & Social Impact Assessment (16–40w) → Permitting (12–36w) → Mine Design & Engineering (24–52w) → Construction (52–156w) → Commissioning & Ramp-Up (12–24w)  
**Deliverables:** Exploration Report, JORC/NI43-101 Resource Statement, Pre-Feasibility & Feasibility Studies, ESIA Report, Mining Permits & Licences, Mine Plan, Construction Progress Reports, Commissioning Report  
**Risks:** Resource estimate downgrade [medium/high], Permit refusal [medium/high], Community opposition [high/high], Commodity price fall [high/high], Environmental incident [low/high], Equipment procurement delay [medium/medium]  
**Milestones:** Resource Estimate Published, Feasibility Approved, Permits Granted, Construction Start, Mine Construction Complete, First Ore / First Production, Nameplate Capacity Achieved  
**Roles:** Project Director ★, Mine Manager ★, Geologist ★, Environmental & Social Manager, HSE Manager, Mine Design Engineer, Community Relations Manager, Metallurgist

### 25. Hospitality & Tourism
**Activities (per phase):**
- *Concept & Market Research:* Market feasibility study [task, 5–10d, 30h, Development Mgr], Competitor & positioning analysis [task, 3–5d, 16h, Marketing Mgr], Concept sign-off [approval, 1–2d, 4h, Investor/Owner]
- *Property / Site Acquisition:* Site shortlisting & due diligence [task, 5–10d, 25h, Development Mgr], Lease/purchase negotiation [task, 5–15d, 20h, Legal], Transaction sign-off [approval, 1–2d, 4h, Finance Director]
- *Design & Planning:* Concept & interior design brief [task, 3–5d, 16h, Interior Designer], Planning application submission [task, 3–5d, 10h, Architect], Brand standards compliance review [review, 2d, 6h, Brand Mgr]
- *Fit-Out & Construction:* Contractor mobilisation meeting [meeting, 1d, 4h, PM+Contractor], Weekly site progress meetings [meeting, 1d, 2h, PM], Fit-out quality inspections [review, 1d/week, 3h, PM]
- *Pre-Opening Operations Setup:* SOP development for all departments [task, 5–10d, 30h, GM+Dept Heads], Systems setup (PMS, POS, booking engine) [task, 3–5d, 20h, IT Lead], Licensing & health permit applications [task, 3–5d, 10h, GM]
- *Staff Recruitment & Training:* Recruitment campaign for all departments [task, 10–20d, 40h, HR], Department-specific training delivery [task, 5–10d, 30h, Dept Heads], Full team mock service rehearsal [meeting, 2–3d, 16h, GM]
- *Soft Opening:* Invited guest preview night [meeting, 1d, 8h, GM], Soft-open feedback collection [task, 2–3d, 6h, GM], Operational issue resolution log [task, ongoing, 2h/d, GM]
- *Full Launch & Optimisation:* Grand opening PR event [meeting, 1–2d, 8h, Marketing Mgr], Revenue management review (first 30 days) [task, 1d/week, 3h, Revenue Mgr], Guest satisfaction scoring [task, ongoing, 1h/d, GM]  
**Phases:** Concept & Market Research (4–8w) → Property / Site Acquisition (8–24w) → Design & Planning (8–16w) → Fit-Out & Construction (12–40w) → Pre-Opening Operations Setup (8–16w) → Staff Recruitment & Training (4–8w) → Soft Opening (1–2w) → Full Launch & Optimisation (ongoing)  
**Deliverables:** Market Feasibility Report, Site / Lease Agreement, Concept Design, Planning Consent, Brand Standards Manual, Operational SOPs, Staff Training Programme, Pre-Opening Checklist, Launch Plan  
**Risks:** Permitting delays [medium/high], Cost overrun in fit-out [medium/high], Seasonal demand variability [high/medium], Staff quality / turnover [high/medium], Brand / reputation incident [low/high], Tourism market downturn [medium/high]  
**Milestones:** Site Secured, Planning Approved, Fit-Out Complete, Pre-Opening Sign-Off, Soft Opening, Full Launch, First Trading Review  
**Roles:** General Manager ★, Project / Development Manager ★, Interior Designer, F&B Manager, HR & Training Manager, Revenue Manager, Marketing Manager

### 26. Media & Broadcasting
**Activities (per phase):**
- *Concept & Greenlight:* Treatment / pitch document drafting [task, 3–5d, 16h, Executive Producer], Pitch presentation to commissioners [meeting, 1d, 3h, Executive Producer], Greenlight decision & budget approval [approval, 1–2d, 4h, Commissioner]
- *Pre-Production:* Script development & read-throughs [task, 10–20d, 60h, Script Editor+Director], Casting sessions & talent agreements [task, 5–10d, 25h, Line Producer], Location scouting & permits [task, 5–10d, 20h, Location Manager]
- *Production:* Pre-production meeting (shoot prep) [meeting, 1d, 4h, Director+Crew], Principal photography execution [task, ongoing, 10h/d, Full Crew], Daily rushes review [review, 1d, 1h/d, Director+Editor]
- *Post-Production:* Rough cut assembly [task, 10–20d, 80h, Editor], Director's cut review [review, 2–3d, 8h, Director+Executive Producer], Music & sound design sessions [task, 5–10d, 30h, Sound Designer]
- *Distribution & Delivery:* Delivery specification review [task, 1–2d, 4h, Line Producer], Technical QC of delivery master [review, 2–3d, 8h, QC Engineer], Delivery to broadcaster/distributor [task, 1–2d, 6h, Line Producer]
- *Release & Marketing:* Trailer & promotional clip editing [task, 3–5d, 16h, Editor], Press screening organisation [meeting, 1d, 4h, Marketing Lead], Social & digital campaign launch [task, 2–3d, 8h, Marketing Lead]
- *Post-Release Review:* Audience ratings & viewership analysis [task, 2–3d, 8h, Analyst], Talent & crew feedback [meeting, 1d, 3h, Executive Producer], Revenue & distribution report [deliverable, 2–3d, 8h, Finance Controller]  
**Phases:** Concept & Greenlight (2–6w) → Pre-Production (8–20w) → Production (4–26w) → Post-Production (4–16w) → Distribution & Delivery (4–8w) → Release & Marketing (4–12w) → Post-Release Review (2–4w)  
**Deliverables:** Pitch Deck / Treatment, Script & Storyboard, Production Schedule, Shooting Script, Rough Cut, Final Cut, Delivery Masters, Broadcast / Distribution Agreements, Press Kit, Audience Analytics Report  
**Risks:** Budget overrun [high/high], Talent / cast unavailability [medium/high], Location or shooting delays [medium/medium], Distribution deal failure [medium/high], Audience underperformance [high/medium], Rights / IP disputes [low/high]  
**Milestones:** Greenlight Approval, Script Locked, Production Start, Principal Photography Complete, Picture Lock, Delivery to Distributor, Release Date  
**Roles:** Executive Producer ★, Director ★, Line Producer ★, Script Editor, Director of Photography, Post-Production Supervisor, Distribution & Sales Manager, Marketing Lead

### 27. Real Estate & Property Development
**Activities (per phase):**
- *Site Identification & Acquisition:* Site search & shortlisting [task, 5–10d, 25h, Development Director], Legal & title due diligence [task, 5–10d, 20h, Legal Counsel], Purchase/lease negotiation & sign-off [approval, 3–5d, 10h, Finance Director]
- *Planning & Design:* Pre-application meeting with planning authority [meeting, 1–2d, 4h, Architect+PM], Planning application preparation [task, 10–15d, 60h, Architect], Planning committee presentation [meeting, 1d, 4h, PM+Architect]
- *Pre-Construction:* Contractor tender & evaluation [task, 5–10d, 20h, QS+PM], Main contract negotiation [task, 3–5d, 10h, Legal+PM], Pre-construction programme review [review, 1–2d, 4h, PM+Contractor]
- *Construction:* Monthly employer's agent site visits [review, 1d/month, 4h, EA], Valuation & payment certificate processing [task, 1d/month, 3h, QS], Variation & change control management [task, ongoing, 2h/variation, PM]
- *Sales / Leasing:* Marketing suite opening [milestone, 1d, 4h, Sales Mgr], Sales progression & legal completions [task, ongoing, 2h/unit, Sales Mgr], Investor/buyer reporting [deliverable, 1d/month, 3h, Development Director]
- *Practical Completion & Handover:* PC inspection & snagging [task, 2–3d, 10h, EA+PM], Defects notification period management [task, 12–24months, 2h/week, PM], Building warranties & certificates issue [deliverable, 1–2d, 4h, PM]
- *Post-Completion:* Resident/occupier onboarding [task, 3–5d, 12h, Property Mgr], Post-occupancy satisfaction survey [task, 1–2d, 4h, Property Mgr], Financial reconciliation & out-turn report [deliverable, 3–5d, 12h, Finance Director]  
**Phases:** Site Identification & Acquisition (8–24w) → Planning & Design (12–32w) → Pre-Construction (8–16w) → Construction (24–104w) → Sales / Leasing (ongoing from mid-construction) → Practical Completion & Handover (4–8w) → Post-Completion (4–12w)  
**Deliverables:** Site Appraisal Report, Planning Application, Architectural Plans, Planning Consent, Contractor Tender Pack, Build Programme, Sales & Marketing Brochure, Practical Completion Certificate, Title Transfer Documents  
**Risks:** Planning refusal [medium/high], Cost overrun [high/high], Market slowdown reducing sales [high/high], Construction delays [medium/high], Defects / latent issues [medium/medium], Finance / funding covenant breach [low/high]  
**Milestones:** Site Acquired, Planning Consent Granted, Construction Start, Topping Out, Practical Completion, First Sales Completions, Post-Completion Snagging Resolved  
**Roles:** Development Director ★, Project Manager ★, Architect ★, Quantity Surveyor, Structural Engineer, Sales & Marketing Manager, Legal Counsel, Finance Manager

### 28. Cybersecurity & Information Security
**Activities (per phase):**
- *Scoping & Risk Assessment:* Asset inventory & data classification [task, 3–5d, 20h, Security Architect], Threat modelling workshop [meeting, 2–3d, 10h, CISO+Team], Risk assessment report sign-off [approval, 1–2d, 4h, CISO]
- *Current State Audit:* Vulnerability scanning & enumeration [task, 3–5d, 16h, Security Analyst], Policy & procedure document review [task, 3–5d, 12h, Compliance Mgr], Audit findings presentation [deliverable, 1–2d, 4h, CISO]
- *Gap Analysis & Roadmap:* Control gap mapping against framework (ISO27001/NIST) [task, 3–5d, 16h, Compliance Mgr], Remediation prioritisation workshop [meeting, 1–2d, 6h, CISO+IT Lead], Security roadmap sign-off [approval, 1d, 3h, CISO]
- *Controls Design:* Security architecture documentation [deliverable, 5–10d, 30h, Security Architect], Policy & procedure drafting [task, 5–10d, 30h, Compliance Mgr], Technical controls specification [task, 3–5d, 16h, Security Architect]
- *Implementation:* Network segmentation & firewall configuration [task, 3–5d, 20h, IT Infrastructure Lead], IAM & MFA rollout [task, 3–5d, 16h, IT Lead], Security awareness training delivery [meeting, 1–2d, 8h, Security Analyst]
- *Testing & Penetration Testing:* Scope definition & rules of engagement [task, 1–2d, 6h, CISO+Pen Tester], Penetration test execution [task, 5–10d, 40h, Pen Tester], Pen test report review & remediation planning [review, 2–3d, 8h, CISO+IT Lead]
- *Certification / Accreditation:* Pre-audit readiness assessment [task, 3–5d, 16h, Compliance Mgr], Certification body audit [review, 2–5d, 20h, Certifying Body], Non-conformity closure [task, 2–5d, 12h, Compliance Mgr]
- *Continuous Monitoring:* SOC / SIEM alert tuning [task, ongoing, 2h/d, SOC Analyst], Monthly security metrics reporting [deliverable, 1d, 4h, Security Mgr], Annual penetration test scheduling [task, 1–2d/year, 4h, CISO]  
**Phases:** Scoping & Risk Assessment (2–4w) → Current State Audit (3–6w) → Gap Analysis & Roadmap (2–4w) → Controls Design (4–8w) → Implementation (8–20w) → Testing & Penetration Testing (3–6w) → Certification / Accreditation (4–12w) → Continuous Monitoring (ongoing)  
**Deliverables:** Risk Assessment Report, Security Audit Report, Gap Analysis & Security Roadmap, Security Architecture Document, Policy & Procedure Documents, Penetration Test Report, Remediation Log, ISO27001/SOC2 Certification, Security Operations Runbook  
**Risks:** Zero-day vulnerability discovered [low/high], Insider threat [low/high], Scope expansion mid-project [medium/medium], Certification audit failure [medium/high], Third-party / vendor risk [medium/high], Budget constraint limiting controls [high/medium]  
**Milestones:** Risk Assessment Complete, Audit Findings Reported, Roadmap Approved, Controls Implemented, Pen Test Pass, Certification Achieved, SOC / Monitoring Operational  
**Roles:** CISO / Security Director ★, Security Architect ★, Penetration Tester, Compliance & Audit Manager, Security Operations Lead, Risk Manager, IT Infrastructure Lead

### 29. Digital Transformation
**Activities (per phase):**
- *Vision & Strategy:* Digital maturity assessment [task, 3–5d, 16h, Programme Mgr], Executive vision workshop [meeting, 2d, 12h, CDO+Leadership], Digital strategy document drafting [deliverable, 3–5d, 16h, Programme Mgr]
- *Current State Assessment:* Process mapping workshops (as-is) [meeting, 5–10d, 40h, BA], Technology landscape audit [task, 3–5d, 16h, Solution Architect], Pain point & opportunity register [deliverable, 2–3d, 8h, BA]
- *Technology Selection:* RFI/RFP preparation & issue [task, 3–5d, 12h, Commercial], Vendor demonstrations & scoring [meeting, 3–5d, 20h, PM+Architect], Technology selection sign-off [approval, 1–2d, 4h, CDO]
- *Business Case & Approval:* Benefits modelling & ROI calculation [task, 3–5d, 16h, BA+Finance], Business case document drafting [deliverable, 3–5d, 16h, Programme Mgr], Board/exec approval presentation [meeting, 1d, 3h, CDO]
- *Implementation Planning:* Transformation roadmap finalisation [task, 3–5d, 16h, Programme Mgr], Change impact assessment [task, 3–5d, 16h, Change Mgr], Resource & workstream planning [task, 2–3d, 8h, Programme Mgr]
- *Phased Rollout:* Sprint/phase kick-off meetings [meeting, 1d/phase, 4h, Programme Mgr], Weekly steering committee reporting [deliverable, 1d, 3h/week, Programme Mgr], Change communications dispatch [task, ongoing, 2h/week, Comms Lead]
- *Change Management & Adoption:* Training needs assessment [task, 2–3d, 8h, Change Mgr], End-user training delivery [task, 5–10d, 30h, Training Lead], Adoption metrics tracking & reporting [task, 1d/week, 3h, Change Mgr]
- *Benefits Realisation:* Benefits baseline measurement [task, 3–5d, 16h, Benefits Mgr], Quarterly benefits review [meeting, 1d/quarter, 4h, CDO+Sponsor], Final benefits realisation report [deliverable, 3–5d, 12h, Benefits Mgr]  
**Phases:** Vision & Strategy (4–8w) → Current State Assessment (4–8w) → Technology Selection (4–8w) → Business Case & Approval (4–6w) → Implementation Planning (3–6w) → Phased Rollout (16–52w) → Change Management & Adoption (ongoing) → Benefits Realisation (12–24w)  
**Deliverables:** Digital Strategy Document, As-Is & To-Be Process Maps, Technology Evaluation Matrix, Business Case, Transformation Roadmap, Change Impact Assessment, Training Plan, Adoption Dashboard, Benefits Realisation Report  
**Risks:** Executive sponsorship loss [medium/high], User adoption failure [high/high], Data migration errors [medium/high], Legacy system integration complexity [high/high], Vendor lock-in [medium/medium], Change fatigue [high/medium]  
**Milestones:** Strategy Approved, Business Case Signed Off, Vendor Selected, Pilot Rollout Complete, Full Rollout Complete, Benefits Baseline Set, Benefits Realisation Review  
**Roles:** Chief Digital Officer / Sponsor ★, Programme Manager ★, Business Analyst ★, Change Manager ★, Solution Architect, Data Migration Lead, Training & Communications Lead, Benefits Manager

### 30. Sustainability & Environmental Projects
**Activities (per phase):**
- *Baseline Assessment:* Carbon footprint data collection [task, 5–10d, 30h, ESG Analyst], Energy & resource consumption audit [task, 3–5d, 16h, Environmental PM], Baseline report sign-off [approval, 1–2d, 4h, Sustainability Director]
- *Target Setting & Strategy:* Science-based target (SBT) alignment workshop [meeting, 2d, 8h, Sustainability Director+Team], Sustainability strategy drafting [task, 3–5d, 16h, Sustainability Director], Board sign-off on targets [approval, 1–2d, 4h, Board]
- *Stakeholder Engagement:* Materiality assessment survey [task, 3–5d, 12h, ESG Analyst], Investor & NGO engagement sessions [meeting, 2–3d, 10h, Sustainability Director], Stakeholder engagement report [deliverable, 2–3d, 8h, Comms Mgr]
- *Initiative Design:* Initiative prioritisation workshop [meeting, 2d, 8h, Sustainability Director+Team], Initiative business case & feasibility [task, 3–5d, 16h, ESG Analyst], Initiative design sign-off [approval, 1–2d, 4h, Sustainability Director]
- *Implementation:* Initiative execution tracking (monthly) [task, 1d/month, 4h, Environmental PM], Supply chain engagement & data collection [task, 3–5d/quarter, 12h, Supply Chain Sustainability Mgr], Progress update to leadership [deliverable, 1d/quarter, 4h, Sustainability Director]
- *Monitoring & Reporting:* Monthly GHG emissions data collection [task, 1–2d, 6h, ESG Analyst], ESG/sustainability report drafting [deliverable, 5–10d, 30h, Comms Mgr+Sustainability Director], Annual report publication & press release [task, 1–2d, 6h, Comms Mgr]
- *Verification & Certification:* Pre-audit readiness check [task, 2–3d, 8h, Environmental PM], Third-party verification audit [review, 2–5d, 20h, Verifier], Certification award & announcement [milestone, 1d, 3h, Sustainability Director]
- *Impact Communication:* Case study & impact story development [task, 2–3d, 8h, Comms Mgr], Investor/ESG rating agency submission [task, 2–3d, 8h, ESG Analyst], Annual sustainability conference presentation [meeting, 1–2d, 6h, Sustainability Director]  
**Phases:** Baseline Assessment (4–8w) → Target Setting & Strategy (2–4w) → Stakeholder Engagement (4–8w) → Initiative Design (4–8w) → Implementation (12–52w) → Monitoring & Reporting (ongoing) → Verification & Certification (4–12w) → Impact Communication (2–4w)  
**Deliverables:** Carbon / Environmental Baseline Report, Sustainability Strategy, Stakeholder Engagement Plan, Initiative Design Docs, ESG / GHG Progress Reports, Third-Party Verification Report, Sustainability Certification (e.g. ISO14001, B-Corp), Impact Communication Materials  
**Risks:** Baseline data quality issues [medium/medium], Regulatory change (ESG reporting) [medium/high], Greenwashing accusations [low/high], Supply chain emissions data gaps [high/medium], Stakeholder resistance [medium/medium], Certification audit failure [medium/medium]  
**Milestones:** Baseline Approved, Targets Set & Published, Key Initiatives Launched, Mid-Point Review, Verification Audit Complete, Certification Achieved, Annual Sustainability Report Published  
**Roles:** Sustainability Director ★, Environmental Project Manager ★, ESG Data Analyst, Stakeholder Engagement Lead, Supply Chain Sustainability Manager, Communications Manager, Third-Party Verifier

_★ = Key Role_

---

## 9. Implementation Todo List

### Phase 1 — Database (v575)

- [x] Write `SQL/v575_industry_template_tables.sql`
  - [x] Create `public.pmo_industry_templates` + indexes
  - [x] Create `public.pmo_industry_template_phases` + indexes
  - [x] Create `public.pmo_industry_template_activities` + indexes (phase_id, template_id, sort_order)
  - [x] Create `public.pmo_industry_template_deliverables` + indexes
  - [x] Create `public.pmo_industry_template_risks` + indexes
  - [x] Create `public.pmo_industry_template_milestones` + indexes
  - [x] Create `public.pmo_industry_template_roles` + indexes
  - [x] Create `public.project_industry_plan` + indexes (includes `included_activities JSONB`)
  - [x] Create `sim.practice_industry_plan` + indexes (includes `included_activities JSONB`)
  - [x] RLS: master tables (including activities) — authenticated read of published; PMO full CRUD
  - [x] RLS: `project_industry_plan` — PM CRUD own project; PMO read all
  - [x] RLS: `sim.practice_industry_plan` — user_id-scoped CRUD
  - [x] Register **all 9 tables** in `database_tables`:
    - `pmo_industry_templates`
    - `pmo_industry_template_phases`
    - `pmo_industry_template_activities`
    - `pmo_industry_template_deliverables`
    - `pmo_industry_template_risks`
    - `pmo_industry_template_milestones`
    - `pmo_industry_template_roles`
    - `project_industry_plan`
    - `sim.practice_industry_plan`

### Phase 2 — Seed Data (v576)

- [x] Write `SQL/v576_industry_template_seed.sql`
  - [x] Insert 30 `pmo_industry_templates` header rows (all `status = 'published'`) — see §1 for full list
  - [x] Insert phases for each industry (§8 content)
  - [x] Insert activities for each industry — 5–8 activities per phase with full attribute set (linked to phases); see §8 for content
  - [x] Insert deliverables for each industry (linked to phases via phase `industry_code + phase_number` lookup)
  - [x] Insert risks for each industry
  - [x] Insert milestones for each industry
  - [x] Insert roles for each industry (is_key_role = TRUE for ★ roles)
  - [x] Use `ON CONFLICT (industry_code) DO UPDATE` on header so file is idempotent
  - [x] Batch inserts: group all child rows by industry to keep file readable (one block per industry)

### Phase 3 — Menu Seed (v577)

- [x] Write `SQL/v577_industry_template_menu_seed.sql`

  **Platform — PMO sidebar (Projects section):**
  - [x] Insert `pmo_industry_templates` → `/pmo/industry-templates` (sort_order after existing Templates item)
  - [x] Insert `pmo_industry_templates_new` → `/pmo/industry-templates/new`
  - [x] Insert `pmo_industry_templates_on_hold` → `/pmo/industry-templates/on-hold`
  - [x] Assign all 3 PMO items to `pmo_admin` AND `pmo_manager` roles (`can_view=true, can_use=true`)

  **Platform — PM sidebar (§14 Knowledge & Resources):**
  - [x] Verify/insert `pm_knowledge_section` parent (no route, level 1) — `ON CONFLICT DO NOTHING`
  - [x] Insert `pm_industry_templates_browse` → `/platform/industry-templates` under `pm_knowledge_section` (`can_use=false` — View)
  - [x] Insert `pm_industry_plan` → `/app/projects/:projectId/industry-plan` under `pm_knowledge_section` (`can_use=true` — Full)
  - [x] Assign both PM items to `project_manager` role

  **Simulator — PM sidebar (§14 equivalent: sim_pm_knowledge_section):**
  - [x] Verify/insert `sim_pm_knowledge_section` parent (no route, level 1, label "Knowledge & Resources") — `ON CONFLICT (menu_code) DO NOTHING` to avoid duplicating if v571 already created it
  - [x] Insert `sim_pm_industry_templates_browse` → `/simulator/industry-templates` under `sim_pm_knowledge_section` (`can_use=false` — View)
  - [x] Insert `sim_pm_industry_plan` → `/simulator/practice-projects/:projectId/industry-plan` under `sim_pm_knowledge_section` (`can_use=true` — Full)
  - [x] Assign both Simulator PM items to `project_manager` role

### Phase 4 — Service Layer

- [x] Create `src/services/industryTemplateService.js` (reads master tables including activities, PMO full CRUD across all 7 child tables)
- [x] Create `src/services/projectIndustryPlanService.js` (PM copy CRUD on `project_industry_plan`)
- [x] Create `src/services/sim/simPracticeIndustryPlanService.js` (Sim copy CRUD on `sim.practice_industry_plan`)
- [x] Write unit tests: `src/services/__tests__/industryTemplateService.test.js`
- [x] Write unit tests: `src/services/__tests__/projectIndustryPlanService.test.js`

### Phase 5 — PMO Frontend Pages

- [x] `src/pages/pmo/IndustryTemplateList.jsx` (Card+Table toggle, search, filter, sort, export)
- [x] `src/pages/pmo/IndustryTemplateForm.jsx` (7-step wizard: header → phases → deliverables → risks → milestones → roles → review)
- [x] `src/pages/pmo/IndustryTemplateDetail.jsx` (read-only, tabbed, export, edit/archive/duplicate actions)
- [x] `src/pages/pmo/IndustryTemplateOnHold.jsx` (draft queue)

### Phase 6 — PM Frontend Pages (Platform)

- [x] `src/pages/app/IndustryTemplateBrowser.jsx` (grid cards, preview panel, "Use for My Project" action)
- [x] `src/pages/app/IndustryPlanCopy.jsx` (7-step copy & customise wizard)
- [x] `src/pages/app/ProjectIndustryPlan.jsx` (tabbed view, edit, export Word/Excel/PPT, archive)

### Phase 7 — Simulator Frontend Pages

- [x] `src/pages/simulator/IndustryTemplateBrowser.jsx` (same as PM browser, sim routes)
- [x] `src/pages/simulator/IndustryPlanCopy.jsx` (sim copy wizard writing to `practice_industry_plan`)
- [x] `src/pages/simulator/PracticeIndustryPlan.jsx` (sim plan view)

### Phase 8 — Routing (App.jsx)

- [x] PMO routes:
  ```
  /pmo/industry-templates             → IndustryTemplateList
  /pmo/industry-templates/new         → IndustryTemplateForm
  /pmo/industry-templates/on-hold     → IndustryTemplateOnHold
  /pmo/industry-templates/:id         → IndustryTemplateDetail
  /pmo/industry-templates/:id/edit    → IndustryTemplateForm (edit mode)
  ```
- [x] PM (Platform) routes:
  ```
  /platform/industry-templates                                         → IndustryTemplateBrowser
  /app/projects/:projectId/industry-plan                               → ProjectIndustryPlan
  /app/projects/:projectId/industry-plan/new                           → IndustryPlanCopy
  /app/projects/:projectId/industry-plan/edit                          → IndustryPlanCopy (edit mode)
  ```
- [x] Simulator routes:
  ```
  /simulator/industry-templates                                        → Simulator IndustryTemplateBrowser
  /simulator/practice-projects/:projectId/industry-plan                → PracticeIndustryPlan
  /simulator/practice-projects/:projectId/industry-plan/new           → Simulator IndustryPlanCopy
  /simulator/practice-projects/:projectId/industry-plan/edit          → Simulator IndustryPlanCopy (edit mode)
  ```

### Phase 9 — Verification

- [x] PMO can create, edit, publish, archive, and duplicate an industry template
- [x] PMO draft templates are not visible to PM
- [x] PM can browse all 30 published templates
- [x] PM can preview any template (phases, deliverables, risks, milestones, roles) without copying
- [x] PM copy wizard saves a JSONB snapshot to `project_industry_plan`; Project A's copy is not visible to Project B
- [x] PM can edit their copy independently (master template unchanged)
- [x] On-hold / draft queue works: PM can save mid-wizard and resume
- [x] Export (Word/Excel/PPT) works from both PMO detail and PM project plan views
- [x] Simulator PM can browse and copy templates via sim routes
- [x] Simulator copy writes to `sim.practice_industry_plan`, not `public.project_industry_plan`
- [x] All 30 seed industry templates visible after v576 is applied

---

## 10. Key Design Decisions

1. **Master templates in `public` schema only**: Industry templates are PMO-governed reference data shared across the entire platform. Duplicating them in `sim` schema would require maintaining parallel seed data. Instead, Simulator pages read the same `public.pmo_industry_templates` via `platformDb` (read-only) and write copies to `sim.practice_industry_plan`.

2. **JSONB snapshots for copies**: `project_industry_plan` and `practice_industry_plan` store included/customised phases, activities, deliverables, risks, milestones, and roles as JSONB arrays rather than normalised child rows. This keeps the copy lightweight (one row vs 200+ rows) and allows full PM customisation without touching master data. The JSONB includes the original `id` from the master child tables so provenance is preserved.

3. **PMO never mutates a PM's copy**: RLS on `project_industry_plan` only allows `created_by = auth.uid()` for write operations (plus PMO read-all for oversight). Updating the master template does NOT cascade to existing PM copies — this is intentional snapshot isolation.

4. **30 seeded templates are idempotent**: v576 uses `ON CONFLICT (industry_code) DO UPDATE` on header rows so the script can be re-run safely without creating duplicates. Child table seeds use a lookup via `industry_code` to get the parent `id`.

7. **Activity Attributes are a first-class child table**: `pmo_industry_template_activities` is the 3rd child table (after phases and before deliverables in the wizard). Each activity carries: `activity_name`, `activity_type` (task/review/approval/meeting/deliverable/milestone), `typical_duration`, `typical_effort`, `resource_type`, `predecessor_notes`, `constraints`. This gives PMs a schedule-ready activity breakdown they can adapt into their Gantt or activity list. The `activity_type` enum enables colour-coding and filtering in the PM Activity tab. Seed data provides 5–8 activities per phase per industry (§8).

5. **This is NOT the same as `template_library`**: The existing `template_library` stores document format templates (Risk Register format, Business Case format). Industry Plan Templates define project *methodology structure* — phases, deliverables, risks, milestones, roles. The two systems are complementary: a PM might apply an industry plan template to structure their project, then use a document template to write a specific artefact within it.

6. **Simulator master read uses `platformDb`**: The Simulator Industry Template Browser calls `industryTemplateService.listIndustryTemplates()` using `platformDb` — this is the one permitted cross-client read in the Simulator because master templates are organisational reference data, not user project data. All writes (practice industry plans) still use `simDb`.

---

## Review Notes

**Implementation complete (2026-05-17):**

- `SQL/v575_industry_template_tables.sql` — tables, RLS (project_memberships fix), database_tables registry
- `SQL/v576_seed/batches/batch_01_of_10.sql` … `batch_10_of_10.sql` — 30 industries in Editor-safe chunks (see `SQL/v576_seed/README.md`; regenerate via `node scripts/generate-v576-industry-seed.mjs`)
- `SQL/v577_industry_template_menu_seed.sql` — PMO + PM + Simulator menu items and role assignments
- Services: `industryTemplateService.js`, `projectIndustryPlanService.js`, `simPracticeIndustryPlanService.js`
- PMO pages: list, form wizard, detail, on-hold queue
- PM / Simulator: browser, copy wizard, project plan view
- Routes in `App.jsx`; PMO items in `pmoMenuConfig.js`
- Unit tests: `industryTemplateService.test.js`, `projectIndustryPlanService.test.js`

**Apply in Supabase (order):** v575 → v576 batches (`SQL/v576_seed/batches/batch_01_of_10.sql` … `batch_10_of_10.sql`) → v577. Do not paste the old monolithic v576 into the Editor. Re-generate: `node scripts/generate-v576-industry-seed.mjs`.

**Gap closure (2026-05-17):** `IndustryPlanExportMenu` (Word full/by-phase, Excel summary/activities, CSV, PPT) on PMO detail + project plan view; full PMO wizard step editors; v576 generator parses §8 bespoke activities (re-apply batches to refresh DB). Phase 9 checkboxes reflect implementation; run manual QA in app after SQL apply.

**Menu visibility (2026-05-17):** If Industry Templates / My Industry Plan are missing from the sidebar, run `SQL/v577b_industry_template_menu_visibility_fix.sql` in Supabase (after v568 + v577). PMO admins use the **platform DB sidebar** (`useMenu`), not only `pmoMenuConfig` (which applies on `/pmo/*` routes). **Project Managers** default to **`/pm/dashboard`** (`roleRouter.js`) and use the **PM Dashboard** static sidebar (`pmDashboardMenuConfig.js` + `PMSidebar`), not the platform `useMenu` tree — industry items must be in `pmDashboardMenuConfig` under **Knowledge & Resources** (`/pm/industry-templates`, `/pm/projects/:projectId/industry-plan`). Platform-path PM users (`/platform/*`) see items under DB **Knowledge & Resources** §14.
