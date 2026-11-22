# PRD v1347 — Project Setup Custom Fields tab (LDE)

## a) Problem statement

Project Setup initiation documents (Mandate, Brief, Charter, Business Case, PID, Benefits Review Plan, Team Charter, Governance Setup) and Project Details expose rich tabbed forms with Audit details, but operators cannot attach organisation-defined Local Data Extensions (LDE) fields on those surfaces. Risks / Assumptions / Milestones already support LDE via `RecordCustomFields`; Local Registers (including Delivery Overview) already have a **Custom Fields** tab. Project Setup hand-built forms are inconsistent: no Custom Fields tab, and most screens are missing from `system_screens`, so orgs cannot map fields even if they wanted to. View / Export also omit LDE values for these records.

## b) Solution

Add an always-visible **Custom Fields** tab (immediately before **Audit details**) on each agreed Project Setup record surface, hosting organisation LDE through the existing `RecordCustomFields` / `CustomFieldRenderer` stack. Seed `public` and `sim` `system_screens` for the new screens. Reuse existing `project_detail` for Project Details. Include published custom-field values in View / Export. Platform + Simulator parity. Delivery Overview unchanged (register Custom Fields already present).

## c) User stories

1. As a project user, I see a **Custom Fields** tab on Project Details, just before Audit details.
2. As a project user, I see the same tab on Mandate, Brief, Charter, Business Case, PID, Benefits Review Plan, Team Charter, and Governance Setup (create / view / edit as those surfaces exist).
3. As a user on an unsaved create form, the Custom Fields tab explains that fields appear after the record is saved.
4. As a user on a saved record with no org fields published for that screen, I see a clear empty state (configure under Local Data Extensions).
5. As a user whose organisation has published fields for that screen, I can view/edit those values on the tab (same LDE behaviour as Assumptions / Milestones).
6. As an LDE admin, I can map fields separately to **Brief** (`brief_detail`) and **Charter** (`charter_detail`) even though both use the same `project_briefs` row.
7. As a user exporting or using View preview, Custom Fields values appear in a dedicated export section when definitions/values exist.
8. As a Simulator practice user, the same tabs and screens exist for the Simulator copies of these forms.
9. As a Delivery Overview user, behaviour is unchanged (register Custom Fields tab stays as today).
10. As a Business Case user, tier/template inherited fields keep working; org LDE lives on the separate Custom Fields tab (`business_case_detail`).

## d) Implementation decisions (owner interview)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Surfaces | Project Details, Mandate, Brief, Charter, Business Case, PID, BRP, Team Charter, Governance Setup |
| 2 | Skip | Delivery Overview (already has register CF), Project Settings, Project Team roster (only Team Charter) |
| 3 | Mechanism | Organisation LDE via `RecordCustomFields` — not register “add field on this tab” |
| 4 | Tab visibility | Always show; place immediately before Audit details |
| 5 | Empty states | Unsaved → after-save message; saved + no fields → LDE empty state; enhance shared `RecordCustomFields` |
| 6 | Business Case | Keep `InheritedBusinessCaseFields`; add separate org tab `business_case_detail` |
| 7 | Export / View | Include Custom Fields section when definitions/values exist |
| 8 | Project Details | Reuse existing `project_detail` / entity `project` |
| 9 | Brief vs Charter | Separate screens `brief_detail` and `charter_detail`; both entity_type `project_brief` |
| 10 | Screen catalogue | See table below |
| 11 | Parity | Platform + Simulator in the same change |
| 12 | Out of scope | Sample custom-field seed data; Admin app; new definition UI; Delivery Overview / Project Settings |

### Screen catalogue

| Surface | screen_code | entity_type |
|---------|-------------|-------------|
| Project Details | `project_detail` (existing) | `project` |
| Mandate | `mandate_detail` | `project_mandate` |
| Brief | `brief_detail` | `project_brief` |
| Charter | `charter_detail` | `project_brief` |
| Business Case | `business_case_detail` | `business_case` |
| PID | `pid_detail` | `pid` |
| Benefits Review Plan | `benefits_review_plan_detail` | `benefits_review_plan` |
| Team Charter | `team_charter_detail` | `team_charter` |
| Governance Setup | `governance_structure_detail` | `project_governance_structure` |

## e) Testing decisions

- Unit: `RecordCustomFields` empty-state branches (no entity id / no definitions / with definitions); export helper accepts explicit `screenCode` (Brief vs Charter).
- Unit/integration light: screen seed SQL idempotent check query (same style as v1443).
- Manual: open each surface tab on Platform; confirm order Custom Fields → Audit; empty then with a published test field; View/Export shows values; Simulator twin for at least Brief/Charter + one other.
- Retest: Delivery Overview Custom Fields unchanged; Business Case inherited tier fields still render.

## f) Out of scope

- Delivery Overview, Project Settings, Project Team list/roster pages.
- Seeding demo custom field definitions/values.
- Admin app / Admin `field_help`.
- Changing Local Register custom-field creation UX.
- Migrating inline LDE panels on Risks/Issues to tabs (opportunistic later).

## g) Further notes

- Export today maps `entityType → screenCode` via `ENTITY_SCREEN_CODES`; Brief/Charter share entity type, so export must take an explicit `screenCode` override.
- Existing tier screen `business_case` (InheritedBusinessCaseFields) must not be overwritten; org tab uses `business_case_detail`.
- Theme: inherit Layout grey; Custom Fields panel matches existing raised surfaces.
- No new capture columns → no new `field_help` seeds required for LDE definitions (those carry their own help when defined).
