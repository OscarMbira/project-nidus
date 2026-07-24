# v755 — System-Wide Migration to the Admin ID Generation Engine

**Companion plan (Admin engine extension — must land first):**
`E:\project-nidus-admin\projectplans\v23_id_generation_sequential_date_engine_plan.md`

**Related:** `projectplan/v754_pmo_form_template_builder_plan.md` — `form_instances` adopts
this architecture from day one rather than getting its own bespoke generator.

## Goal
Going forward, **all record IDs across Platform, Simulator, and Admin are generated exclusively
by the Admin-managed `admin.id_generation_rules` engine** — no table defines its own
`generate_*_identifier()` function. This plan is the audit + phased migration of the ~20 record
types that currently do.

## Blocking dependency
✅ **`v23_id_generation_sequential_date_engine_plan.md`** implemented in `project-nidus-admin`
(v155 SQL + Admin UI + v156 entity rules seed).

## Inventory — confirmed via grep of `SQL/` for `CREATE OR REPLACE FUNCTION generate_\w+\(`

| Domain | Entity/table | Current function(s) | Source file | Format (as coded) |
|---|---|---|---|---|
| Accounts | accounts | `generate_account_code` | v84 | ACC prefix + numeric suffix |
| Risk | risks / risk_register | `generate_risk_register_reference`, `generate_risk_identifier`, `generate_risk_number` | v172, v706 (fix), v697 (seed) | `R-YYYY-NNN`, scoped to risk_register_id, resets yearly |
| Issues | issues / issue_register | `generate_issue_register_reference`, `generate_issue_identifier` | v174 | `ISS-YYYY-NNN` scoped to issue_register_id |
| Lessons | lessons_logs / lessons_learned | `generate_lessons_log_reference`, `generate_lesson_reference`, `generate_lesson_number` | v169 | `LL-YYYY-NNN`, `L-YYYY-NNN` |
| Lessons Report | lessons_reports | `generate_lessons_report_reference` | v203 | project-scoped LSR |
| Mandate | project_mandates | `generate_mandate_reference_trigger`, `generate_mandate_reference` | v160 | `MAN-YYYY-NNN` |
| Brief | project_briefs | `generate_brief_reference` | v163 | `PB-YYYY-NNN` |
| Daily Log | daily_logs | `generate_log_reference`, `generate_entry_number` | v166 | `DL-YYYY-NNN` |
| Checkpoint Report | checkpoint_reports | `generate_checkpoint_report_ref` | v191 | project-scoped CPR |
| Issue Report | issue_reports | `generate_issue_report_reference` | v201 | issue-scoped ISR |
| RMS | risk_management_strategies | `generate_rms_reference` | v197 | `RMS-YYYY-NNN` |
| Configuration Item | configuration_items | `generate_ci_identifier` | v194 | project-scoped CI |
| End Project Report | end_project_reports | `generate_end_project_report_ref` | v192 | project-scoped EPR |
| Config Mgmt Strategy | configuration_management_strategies | `generate_cfg_ms_reference` | v192 | `CMS-CFG-YYYY-NNN` |
| End Stage Report | end_stage_reports | `generate_end_stage_report_reference` | v218 | project-scoped ESR |
| Work Package | work_packages + criteria | `generate_wp_reference`, `generate_qc_reference`, `generate_ac_reference` | v216 | WP/QC/AC patterns |
| PID | project_initiation_documents + objectives | `generate_pid_reference`, `generate_objective_reference` | v214 | PID/OBJ |
| Product Status Account | product_status_accounts | `generate_psa_reference` | v211 | `PSA-YYYY-NNN` |
| Product Description | product_descriptions + criteria | `generate_pd_reference`, `generate_pd_criteria_reference` | v207 | PD/AC |
| Comms Mgmt Strategy | communication_management_strategies | `generate_cms_reference` | v190 | `CMS-YYYY-NNN` |
| Project Plan | project_plans + stage_plans | `generate_project_plan_reference`, `generate_stage_plan_reference` | v205 | PP/SP |
| Highlight Report | highlight_reports | `generate_highlight_report_reference` | v222 | project-scoped HLR |
| Exception Report | exception_reports | `generate_exception_report_ref` | v220 | project-scoped EXR |
| Quality Register | quality_reviews + inspections | `generate_quality_activity_identifier` | v184 | `QA-YYYY-NNNN` |
| Business Case | business_cases | `generate_business_case_reference` | v260 | `BC-YYYY-NNN` |
| Quality Mgmt Strategy | quality_management_strategies | `generate_qms_reference` | v180 | `QMS-YYYY-NNN` |
| Portfolio | portfolios | `generate_portfolio_code` | v526 (live: `PORT-NNNN`) | global PORT-NNNN |
| Support Ticket | support_tickets | `generate_ticket_number` | v63 | `TKT-YYYYMMDD-NNNNN` |
| Product Product Desc | project_product_descriptions + criteria | `generate_ppd_reference`, `generate_criteria_reference` | v177 | PPD/AC |
| form_instances | form_instances | *(new)* | v756d | `FI-YYYY-NNN` scoped to project_id |

**Per rule 34.1 (Platform–Simulator parity):** Sim `practice_*` mirrors migrated in `v756c`.

## Migration pattern (per table)

**Step A — configure the rule (Admin repo):** `v156_id_generation_sequential_entity_rules_seed.sql`

**Step B — replace the trigger (this repo):** `v756b` (public), `v756c` (sim), `v756d` (form_instances)

**Step C — verify:** manual smoke tests per verification checklist in `Documentation/ID_Generation_Migration_Guide.md`

**Step D — Simulator parity:** included in `v756c`

## Phased rollout

- [x] **Phase 0 — Pilot: Risk.** Steps A–D complete in SQL.
- [x] **Phase 1 — Issue family.** Issues, Issue Report.
- [x] **Phase 2 — Reports family.** Checkpoint, Highlight, Exception, End Stage, End Project.
- [x] **Phase 3 — Strategy documents.** RMS, Config Mgmt, Comms, Quality Mgmt.
- [x] **Phase 4 — Product documents.** PD, PSA, PPD, CI, criteria tables.
- [x] **Phase 5 — Planning documents.** PID, Plans, WP, Mandate, Brief.
- [x] **Phase 6 — Logs & lessons.** Daily Log, Lessons Log/Learned/Report, Quality activities.
- [x] **Phase 7 — Remaining.** Business Case, Portfolio, Support Ticket, Accounts.
- [x] **Phase 8 — form_instances.** `instance_reference` column + rules + triggers.
- [x] **Phase 9 — Documentation + cleanup.** `Documentation/ID_Generation_Migration_Guide.md`; legacy generators dropped in migration SQL.

## Todo list
- [x] Confirm `v23` (Admin engine extension) is implemented.
- [x] Phase 0 (Risk) — Steps A–D.
- [x] Phases 1–7 — Steps A–D per table.
- [x] Phase 8 — form_instances.
- [x] Phase 9 — docs + cleanup.

## Review

**Status: Complete (SQL + rules + docs). Apply migrations in Supabase to activate.**

### Deliverables

| Area | Location |
|------|----------|
| Admin sequential rules seed | `project-nidus-admin/SQL/v156_id_generation_sequential_entity_rules_seed.sql` |
| Trigger helpers | `SQL/v756_id_generation_migration_helpers.sql` |
| Public migration | `SQL/v756b_id_generation_migration_public.sql` |
| Simulator migration | `SQL/v756c_id_generation_migration_sim.sql` |
| Form instances | `SQL/v756d_form_instances_display_id.sql` |
| Documentation | `Documentation/ID_Generation_Migration_Guide.md` |
| Unit tests | `packages/shared/src/__tests__/idGenerationMigration.test.js` |

### Summary

1. **~70 sequential admin rules** seeded/upserted for public + sim entities (unique abbreviations per rule).
2. **Public schema:** all legacy `generate_*` triggers replaced with AFTER INSERT → `admin.generate_display_id()`. Combined triggers split where integer counters remain.
3. **Sim schema:** missing identifier columns added; practice mirrors wired; legacy sim generators retired.
4. **form_instances:** new `instance_reference` column (Platform + Simulator).
5. **Integer counters** (`risk_number`, `issue_number`, etc.) intentionally kept on BEFORE INSERT triggers.

### Apply order

1. Admin: `v155` → `v156`
2. Monorepo: `v756` → `v756b` → `v756c` → `v756d`

### Format change note

Complex legacy formats with embedded project codes (e.g. `CPR-PROJ-WP-001`) simplify to engine format (`CPR-001` per project scope). Existing IDs unchanged.

### Manual verification still required

Run smoke tests in `Documentation/ID_Generation_Migration_Guide.md` after applying SQL.
