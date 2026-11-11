# Core Project Management — Fields and Sample Data Audit

Prepared 12 November 2026 for the owner's request to add best-practice fields (including audit fields) and at least 10 sample records to the Core PM sidebar sections. It follows CLAUDE.md rule 74 (register engine vs hand-built pages).

**Sources:** the live menu tree (`SQL/v1433_core_pm_menu_audit_query.sql` → `CSV Files/core_pm_menu_audit.csv.csv`), the live table sizes and sample counts (`SQL/v1434_core_pm_table_audit_query.sql` → `CSV Files/core_pm_table_audit.csv`), and a static scan of each page's code (Platform; the Simulator mirrors it under rule 34.1).

## 1. Key findings

1. **Most Core PM forms are not short of fields.** Their tables are already wide: risks 94 columns, end project reports 91, issues 88, PIDs 78, work packages 70, project briefs 66, quality reviews 66, change assessments 63, mandates 55, project closures 54. The gap is mostly **sample data**, plus **missing tabs** (Audit, Custom Fields), not missing columns. Adding columns to these pages without a page-by-page review would add clutter, not value (rule 62).
2. **Sample data:** of 108 record pages, **21 have no sample records** for SEED334-PRJ-08 and **31 have fewer than 10**. Well covered already: Testing (50+ each), Requirements (65), RAID Log (42), Risks (27), Tasks (27), Timesheets (23), Quality (12), Benefits (12), Work Packages (10).
3. **Audit details tab (rule 63.1):** **74 record pages do not show it** (detected statically — verify in the browser).
4. **Custom Fields tab:** **103 record pages** have no way for an organisation to add its own fields without a release.
5. **Thin forms that should move to the register engine (rule 74):** Constraints Register, Deliverable Register, Decision Log, Policies & Compliance, Stage Gate Reviews, Stage Gates, Lessons Log, Vendors, Vendor Categories, Vendor Performance, Environments, Releases / Sprints, My Daily Log, Custom Metrics. Each is a simple form plus a list with no special logic.
6. **Menus to verify:** these menu routes do not match a page route exactly and may open the wrong page or nothing: Report Builder, Kaizen Board, Agile Process Forms, Highlight / Exception / End Stage / Issue reports, Scenario Planning, Network / Dependencies, Workload, Working Days & Holidays, Work Authorisations, Pending My Approval, My Submitted Records, Approval Chains, Procurement Plan, Testing Centre.

## 2. How to read the tables

- **Type:** *View* (dashboard, report, calendar, board, queue — nothing to add), *Document* (one record per project, so one complete sample is the target, not 10), *Rich* (workflow, visuals or several tables — keep hand-built), *Thin* (one simple table — candidate for the register engine).
- **Main table (columns):** the page's main database table and its column count.
- **Samples:** rows for SEED334-PRJ-08. *org-level* means the table is not per project (shared by the organisation).
- **Audit / Custom Fields:** whether the page shows the Audit details tab / a custom fields area.
- Classification is from a static scan; each wave's PRD confirms it page by page.

## 3. Pages by section

### (other Core PM menus)

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Budget | Rich | project_budget_categories (9) | partial (5) | yes | no | Keep hand-built; targeted fields via PRD |
| Planning Poker | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Project Initiation Document | Document | project_initiation_documents (78) | OK (1) | yes | no | Keep; one complete sample per project |
| My Expenses | Rich | project_expense_claims (18) | partial (7) | yes | no | Keep hand-built; targeted fields via PRD |
| Stakeholder Register | Rich | stakeholders (49) | partial (5) | yes | no | Keep hand-built; targeted fields via PRD |
| My Projects | View | process_template_node_links (5) | n/a | n/a | yes | View — no record form; no fields or samples needed |
| ITTO Templates | View | project_ittos (18) | n/a | yes | n/a | View — no record form; no fields or samples needed |
| Checkpoint Reports | View | work_packages (70) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Story Map | View | story_map_items (13) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Value Stream Map | View | lean_value_stream_maps (8) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Communication Mgmt Strategy | Document | communication_management_strategies (45) | OK (1) | no | no | Keep; one complete sample per project |
| All Teams | Rich | teams (17) | partial (3) | no | no | Keep hand-built; targeted fields via PRD |
| Dashboard | View | work_packages (70) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| My Tasks | View | tasks (61) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Ask Nidus | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Actuals | Thin | cost_actuals (13) | partial (6) | no | no | Keep (feeds cost reports and EVM) |
| Risk Categories | Rich | risks (94) | OK (27) | no | no | Keep hand-built; targeted fields via PRD |
| Highlight Reports | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| All Projects | View | process_template_node_links (5) | n/a | n/a | yes | View — no record form; no fields or samples needed |
| All Tasks | View | tasks (61) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| My Team | Thin | project_named_contacts (7) | org-level (0 rows) | yes | no | Keep (personal view of team data) |
| ITTO Project | Rich | project_ittos (18) | MISSING (0) | yes | no | Keep hand-built; targeted fields via PRD |
| Stakeholder Analysis | Rich | stakeholders (49) | partial (5) | no | no | Keep hand-built; targeted fields via PRD |
| Expense Approvals | Rich | project_expense_claims (18) | partial (7) | no | no | Keep hand-built; targeted fields via PRD |
| Benefits Review Plan | Document | benefits_review_plans (58) | OK (1) | no | no | Keep; one complete sample per project |
| Configuration Mgmt Strategy | Document | configuration_management_strategies (45) | OK (1) | no | no | Keep; one complete sample per project |
| Kaizen Board | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Releases / Sprints | Thin | agile_releases (11) | MISSING (0) | no | no | **Move to the register engine** (rule 74) |
| Agile Process Forms | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Organizational Templates | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Forecast & Performance | View | project_evm_snapshots (10) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Project Templates | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Quality Mgmt Strategy | Document | quality_management_strategies (45) | OK (1) | yes | no | Keep; one complete sample per project |
| ITTO Drafts | Thin | project_ittos (18) | MISSING (0) | no | no | Keep (part of the ITTO builder) |
| Work Packages | Rich | work_packages (70) | OK (10) | no | no | Keep hand-built; targeted fields via PRD |
| Financial Reports | View | project_budget_categories (9) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Engagement Planning | Rich | stakeholders (49) | partial (5) | no | no | Keep hand-built; targeted fields via PRD |
| Create Project | View | project_mandates (55) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Issue Reports | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Task Board | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Risk Mgmt Strategy | Document | risk_management_strategies (46) | OK (1) | yes | no | Keep; one complete sample per project |
| Communication Plans | Rich | stakeholders (49) | partial (5) | no | no | Keep hand-built; targeted fields via PRD |
| Exception Reports | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Product Descriptions | Document | product_descriptions (50) | MISSING (0) | no | no | Keep; one complete sample per project |
| Skill Matrix | View | skill_requirements (9) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Task Calendar | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Communication formats | Rich | stakeholders (49) | partial (5) | no | no | Keep hand-built; targeted fields via PRD |
| Document Governance | Thin | project_documents (29) | MISSING (0) | no | no | Keep (document workflow rules) |
| Calendar | View | tasks (61) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Archives / On Hold | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Power/Interest Matrix | View | stakeholders (49) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| End Stage Reports | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Project Product Description | Document | project_product_descriptions (38) | OK (1) | yes | no | Keep; one complete sample per project |
| Constraints Register | Thin | constraints_register (16) | MISSING (0) | no | no | **Move to the register engine** (rule 74) |
| End Project Report | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Assessment Matrix | View | stakeholders (49) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Dependency Parties | Rich | external_dependency_items (9) | org-level (31 rows) | no | no | Keep hand-built; targeted fields via PRD |
| Policies & Compliance | Thin | policies_compliance (16) | org-level (0 rows) | no | no | **Move to the register engine** (rule 74) |
| Manage Roles | Thin | — | ? | no | no | Keep (administration, not a project record) |
| My Daily Log | Thin | daily_log_entries (25) | org-level (15 rows) | no | no | **Move to the register engine** (rule 74) |
| Work Authorisations | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Stage Gate Reviews | Thin | stage_gate_reviews (15) | partial (4) | no | no | **Move to the register engine** (rule 74) |
| Timesheet Overview | View | project_timesheet_settings (12) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Work Plan Variance | View | timesheet_entries (22) | n/a | n/a | n/a | View — no record form; no fields or samples needed |

### Reporting Tools

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Report Library | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Report Builder | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Analytics Dashboards | View | analytics_dashboards (21) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Custom Metrics | Thin | custom_metrics (14) | org-level (3 rows) | no | no | **Move to the register engine** (rule 74) |

### Project Setup

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Project Details | Thin | — | ? | yes | no | Keep (the project record itself) |
| Project Mandate | Document | project_mandates (55) | MISSING (0) | yes | no | Keep; one complete sample per project |
| Project Brief | Document | project_briefs (66) | MISSING (0) | no | no | Keep; one complete sample per project |
| Business Case | Document | business_cases (54) | MISSING (0) | no | no | Keep; one complete sample per project |
| Project Charter | Document | project_briefs (66) – same record as the Project Brief | MISSING (0) | no | no | Keep; one complete sample per project |
| Project Initiation Documents (PIDs) | Document | project_initiation_documents (78) | OK (1) | yes | no | Keep; one complete sample per project |
| Benefits Review Plans | Document | benefits_review_plans (58) | OK (1) | no | no | Keep; one complete sample per project |
| Project Team › Team Members | Rich | teams / team_members (17 / 19) | partial (3 teams) | no | no | Keep hand-built; targeted fields via PRD |
| Project Team › Project Roles & Skills | Rich | — | ? | yes | no | Keep hand-built; targeted fields via PRD |
| Project Team › RACI | Rich | raci_rows (9) | org-level (10 rows) | no | no | Keep hand-built; targeted fields via PRD |
| Project Team › Team Structure | Thin | — | ? | no | no | Keep (visual org chart) |
| Project Team › Contact Directory | Rich | project_contacts (18) | MISSING (0) | no | no | Keep hand-built; targeted fields via PRD |
| Governance Setup › Governance Structure | Rich | project_governance_structure (15) | MISSING (0) | yes | no | Keep hand-built; targeted fields via PRD |
| Governance Setup › Steering Committee | Thin | project_governance_members (17) | MISSING (0) | no | no | Keep (part of governance structure) |
| Governance Setup › Project Board | View | project_governance_members (17) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Governance Setup › Governance Framework | Document | governance_frameworks (15) | org-level (0 rows) | no | no | Keep; one complete sample per project |
| Regional & Format Settings | Rich | project_regional_format_settings (21) | partial (1) | yes | no | Keep hand-built; targeted fields via PRD |
| Timesheet Settings | Rich | project_timesheet_settings (12) | partial (1) | no | no | Keep hand-built; targeted fields via PRD |
| Working Days & Holidays | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Document Signatory | Rich | process_template_signatory_requirements (13) | org-level (31 rows) | no | no | Keep hand-built; targeted fields via PRD |
| Environments | Thin | test_environments (12) | partial (7) | no | no | **Move to the register engine** (rule 74) |

### Scope & Deliverables

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Scope Statement | Document | scope_statements (21) | MISSING (0) | yes | no | Keep; one complete sample per project |
| Product Breakdown Structure | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Work Breakdown Structure | Thin | wbs_dictionary_entries (17) | MISSING (0) | yes | no | Keep (hierarchy editor) |
| Deliverable Register | Thin | deliverable_register (19) | MISSING (0) | no | no | **Move to the register engine** (rule 74) |
| Requirements Register | Thin | requirements_register (23) | OK (65) | no | no | Keep (feeds the traceability matrix) |
| EEF | Thin | — | ? | no | no | Keep (linked to organisational assets) |

### Organizational Templates

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Templates | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Forms | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |

### Project Templates

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Templates | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Forms | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |

### Documents

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Document Register | Thin | — | ? | no | no | Keep (file storage and versions) |
| Version History | View | process_template_node_links (5) | n/a | n/a | n/a | View — no record form; no fields or samples needed |

### Standard Reports

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Project Status Report | View | milestones (18) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Executive Report | View | milestones (18) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Schedule Report | View | milestones (18) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Cost Report | View | cost_actuals (13) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| RAID Report | View | raid_log (14) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Change Report | View | change_board (22) | n/a | yes | yes | View — no record form; no fields or samples needed |
| Resource Report | View | resources (24) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Quality Report | View | quality_register (37) | n/a | yes | yes | View — no record form; no fields or samples needed |
| Testing Report | View | test_cases (25) | n/a | n/a | n/a | View — no record form; no fields or samples needed |

### Quality

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Quality Plan | Document | quality_management_strategies (45) | OK (1) | yes | no | Keep; one complete sample per project |
| Quality Register | Rich | quality_register (37) | OK (12) | yes | yes | Keep hand-built; targeted fields via PRD |
| Quality Reviews | Rich | quality_register (37) | OK (12) | yes | yes | Keep hand-built; targeted fields via PRD |
| Acceptance | Rich | project_product_descriptions (38) | partial (1) | no | no | Keep hand-built; targeted fields via PRD |
| Testing Centre | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Non-Conformance | Rich | quality_register (37) | OK (12) | yes | no | Keep hand-built; targeted fields via PRD |
| Configuration Item Register | Rich | configuration_items (40) | partial (3) | no | no | Keep hand-built; targeted fields via PRD |
| Configuration Item Types | Rich | configuration_management_strategies (45) | partial (1) | no | no | Keep hand-built; targeted fields via PRD |

### Planning

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Schedule › Activity Register | Rich | tasks (61) | OK (27) | yes | no | Keep hand-built; targeted fields via PRD |
| Schedule › Gantt | View | tasks (61) | n/a | yes | n/a | View — no record form; no fields or samples needed |
| Schedule › Network / Dependencies | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Schedule › Critical Path | View | tasks (61) | n/a | yes | n/a | View — no record form; no fields or samples needed |
| Schedule › Schedule Management Plan | Document | schedule_management_plans (19) | MISSING (0) | no | no | Keep; one complete sample per project |
| Schedule › Look-Ahead Plan | View | tasks (61) | n/a | yes | n/a | View — no record form; no fields or samples needed |
| Schedule › Workload | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Schedule › Schedule Variance | View | tasks (61) | n/a | yes | n/a | View — no record form; no fields or samples needed |
| Baselines | Rich | project_baselines (19) | partial (1) | no | no | Keep hand-built; targeted fields via PRD |
| Planning Assumptions | Rich | assumptions (28) | partial (3) | no | no | Keep hand-built; targeted fields via PRD |
| Milestones | Rich | milestones (18) | MISSING (0) | no | no | Keep hand-built; targeted fields via PRD |
| Dependencies | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Calendars | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Scenario Planning | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |

### RAID

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Risk Register | Rich | risks (94) | OK (27) | yes | yes | Keep hand-built; targeted fields via PRD |
| Assumptions Register | Rich | assumptions (28) | partial (3) | no | no | Keep hand-built; targeted fields via PRD |
| Issue Register | Rich | issue_registers (18) | partial (1) | yes | yes | Keep hand-built; targeted fields via PRD |
| Dependency Register | Rich | inter_project_dependencies (38) | org-level (2 rows) | no | no | Keep hand-built; targeted fields via PRD |
| RAID Log | Rich | raid_log (14) | OK (42) | no | no | Keep hand-built; targeted fields via PRD |
| Delay Register | Rich | project_delays (46) | partial (4) | yes | no | Keep hand-built; targeted fields via PRD |

### Testing

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Test Planning | Rich | test_suites (18) | OK (51) | no | no | Keep hand-built; targeted fields via PRD |
| Test Cases › Repository | Rich | test_cases (25) | OK (58) | no | no | Keep hand-built; targeted fields via PRD |
| Test Cases › Suites | Rich | test_suites (18) | OK (51) | no | no | Keep hand-built; targeted fields via PRD |
| Test Execution | Rich | test_runs (23) | OK (52) | no | no | Keep hand-built; targeted fields via PRD |
| Defects › Defect Register | Rich | defects (51) | OK (54) | no | no | Keep hand-built; targeted fields via PRD |
| Defects › Severity / Priority | View | defects (51) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Evidence | Rich | — | ? | no | no | Keep hand-built; targeted fields via PRD |

### Change Control

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Change Requests | Rich | change_requests (49) | partial (1) | yes | yes | Keep hand-built; targeted fields via PRD |
| Change Log | Rich | change_requests (49) | partial (1) | no | no | Keep hand-built; targeted fields via PRD |

### Resources

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Resource Plan | Rich | cross_project_resource_allocations (24) | OK (4) | yes | no | Keep hand-built; targeted fields via PRD |
| Capacity Planning | Rich | cross_project_resource_allocations (24) | partial (4) | no | no | Keep hand-built; targeted fields via PRD |
| Resource Directory | Rich | resources (24) | org-level (8 rows) | no | no | Keep hand-built; targeted fields via PRD |
| Resource Calendar | View | resources (24) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Time Entry & Work Plan | Rich | timesheet_entries (22) | OK (23) | no | no | Keep hand-built; targeted fields via PRD |
| Approvals | Rich | timesheet_entries (22) | OK (23) | no | no | Keep hand-built; targeted fields via PRD |
| Assignments | Rich | project_invitations (29) | partial (1) | yes | no | Keep hand-built; targeted fields via PRD |

### Benefits

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Benefits Register | Rich | benefits (42) | OK (12) | no | no | Keep hand-built; targeted fields via PRD |
| Measures | Rich | benefits (42) | OK (12) | no | no | Keep hand-built; targeted fields via PRD |
| Realisation Tracking | Rich | benefits (42) | OK (12) | no | no | Keep hand-built; targeted fields via PRD |
| Post-Implementation Review | Rich | benefits (42) | OK (12) | no | no | Keep hand-built; targeted fields via PRD |
| Strategy & OKRs | Document | objectives (14) | org-level (14 rows) | no | no | Keep; one complete sample per project |

### Governance

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Decision Log | Thin | project_decisions (31) | partial (5) | no | no | **Move to the register engine** (rule 74) |
| Pending My Approval | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Actions | Rich | unified_governance_actions_v (12) | partial (4) | no | no | Keep hand-built; targeted fields via PRD |
| My Submitted Records | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Approval Chains | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Meetings | View | comm_meetings (20) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Meetings | View | comm_channels (10) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Stage Gates | Thin | stage_gate_reviews (15) | partial (4) | no | no | **Move to the register engine** (rule 74) |

### Communications

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Comms Hub | View | comm_channels (10) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Channel Messages | View | comm_channels (10) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Direct Messages | View | comm_channels (10) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Meeting Summaries | View | comm_meeting_summaries (12) | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Pending AI Reviews | View | comm_meeting_extracted_issues (15) | n/a | n/a | n/a | View — no record form; no fields or samples needed |

### Project Closure

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Lessons Log | Thin | lessons_logs (19) | partial (1) | no | no | **Move to the register engine** (rule 74) |
| Closure Checklist | Document | project_closures (54) | OK (1) | yes | no | Keep; one complete sample per project |
| Outstanding Items | Document | project_closures (54) | OK (1) | yes | no | Keep; one complete sample per project |
| Handover | Document | project_closures (54) | OK (1) | yes | no | Keep; one complete sample per project |
| Final Acceptance | Document | project_closures (54) | OK (1) | yes | no | Keep; one complete sample per project |
| Benefits Transition | Document | project_closures (54) | OK (1) | yes | no | Keep; one complete sample per project |
| Closure Report | View | project_closures (54) | n/a | yes | n/a | View — no record form; no fields or samples needed |
| Closing a Project | Document | project_closures (54) | OK (1) | yes | no | Keep; one complete sample per project |
| Archive | Thin | project_archive_items (13) | OK (10) | no | no | Keep (archive of closed records) |

### Procurement

| Page | Type | Main table (columns) | Samples | Audit tab | Custom fields | Recommendation |
|---|---|---|---|---|---|---|
| Procurement Plan | View | — | n/a | n/a | n/a | View — no record form; no fields or samples needed |
| Vendors | Thin | vendor_ratings (8) | MISSING (0) | no | no | **Move to the register engine** (rule 74) |
| Vendor Categories | Thin | vendor_ratings (8) | MISSING (0) | no | no | **Move to the register engine** (rule 74) |
| Vendor Performance | Thin | vendor_ratings (8) | MISSING (0) | no | no | **Move to the register engine** (rule 74) |

## 4. Recommended waves

| Wave | What | Code changes | Size |
|---|---|---|---|
| **1. Sample data** | Bring every project-scoped record page to 10+ samples for SEED334-PRJ-08 (one complete record for document pages): Mandate, Brief / Charter, Business Case, Scope Statement, Schedule Management Plan, Product Descriptions, Milestones, Constraints, Deliverables, WBS dictionary, Contact Directory, Governance structure and members, Change Requests, Assumptions, Stakeholders, Decision Log, Delays, Stage Gates, Lessons Log, Baselines, Environments, Capacity, Vendors and ratings, ITTOs, Releases. Platform and Simulator. | None — SQL seeds only (rules 16.2, 18.2) | Medium |
| **2. Audit and Custom Fields tabs** | Add the Audit details tab (rule 63.1) and a shared Custom Fields tab to every record page that lacks them, using the existing shared components. | Small per page, both apps | Medium–large |
| **3. Thin forms → register engine** | Move the 14 thin forms listed in finding 5 to local registers with best-practice fields, tabs and samples, keeping their menus and migrating their existing rows. | Migration + menu repoint; old page retired | Medium |
| **4. Rich modules — targeted fields** | Per section (RAID, Planning, Change Control, Cost, Resources, Quality, Benefits, Governance, Closure, Procurement, Stakeholders): check which existing columns the form does not show yet, add only the best-practice fields still missing, and add audit / compliance fields where they belong (e.g. vendor due diligence, contract audit). | Migration + form + export, both apps, PRD per section | Large |
| **5. Menu fixes** | Verify and fix the menus in finding 6. | Small | Small |

**Recommended order:** 1 → 5 → 2 → 3 → 4. Waves 1 and 5 are quick wins; wave 2 brings every page to the same standard; waves 3–4 need a PRD each and your approval before build.
