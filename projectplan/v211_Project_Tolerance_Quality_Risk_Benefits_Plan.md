# v211 Project Tolerance Fields: Quality, Risk, Benefits

## Summary
Added three new tolerance description fields to the Create Project form (Tolerances section), after Scope Tolerance: **Quality**, **Risk**, and **Benefits**. Each is a text area for describing acceptable variance without escalation. Full CRUD: Create and Read via project create/detail; Update/Delete follow existing project update flows once the new columns exist in the database.

## Changes

### 1. Database (SQL)
- **File:** `SQL/v266_project_tolerance_quality_risk_benefits.sql`
- Added to `projects` table:
  - `tolerance_quality_description` (TEXT)
  - `tolerance_risk_description` (TEXT)
  - `tolerance_benefits_description` (TEXT)
- Comments added for each column.

### 2. UI – Lifecycle & Controls section
- **File:** `src/components/project/LifecycleControlsSection.jsx`
- After **Scope Tolerance (Description)** added:
  - **Quality Tolerance (Description)** – textarea, placeholder and help text for quality variance.
  - **Risk Tolerance (Description)** – textarea, placeholder and help text for risk thresholds.
  - **Benefits Tolerance (Description)** – textarea, placeholder and help text for benefits variance.
- Same pattern as Scope (label, textarea, Info description). Theme-aware (dark/light).

### 3. Create Project – state and payload
- **File:** `src/pages/ProjectsCreate.jsx`
- **Form state:** `tolerance_quality_description`, `tolerance_risk_description`, `tolerance_benefits_description` added to initial `formData` and passed to `LifecycleControlsSection`.
- **Submit payload:** All three fields sent in `projectData` (null when empty).
- **Export:** Included in `EXPORT_SECTIONS` under Lifecycle & Controls for any export that uses that config.

## CRUD Coverage
- **Create:** New projects can set Quality, Risk, and Benefits tolerance descriptions on create; values are sent to the API and stored once the new columns exist.
- **Read:** Project detail/list responses will include the new columns once the migration is applied; no frontend change required for read.
- **Update:** Any existing project update flow that sends lifecycle/tolerance fields can include these three; no separate form added for update in this change.
- **Delete:** No separate delete; clearing the text is an update. Project delete unchanged.

## Deployment
1. Run `SQL/v266_project_tolerance_quality_risk_benefits.sql` on the target database (e.g. Supabase SQL editor).
2. Deploy frontend; Create Project form will show the new fields and include them in the create payload.

## Review
- New fields are optional (no validation requiring them).
- Existing note “At least one tolerance (time or cost) must be defined” unchanged.
- Simulator: not duplicated in this change; can be added later if the sim project schema has equivalent tolerance fields.
