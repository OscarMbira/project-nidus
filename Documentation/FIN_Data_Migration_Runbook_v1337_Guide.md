# Data Migration Runbook (v1337)

Banking & Financial Services pack → **Data Migration → Migration Runbook** and **Runbook Steps** (after Mock Migrations).

PRD: `projectprd/v1337_cbs_data_migration_runbook_PRD.md` · Plan: `projectplan/v1337_cbs_data_migration_runbook_plan.md`

## What it is

A runbook is the ordered list of steps for one migration run: a mock, a dress rehearsal or the go-live weekend. The team records actual figures and times on each step as the run happens. The runbook page shows a live summary of the run.

| Register | One record per | Main tabs |
|---|---|---|
| Migration Runbook (`fin_migration_runbook`) | migration run | Details · Windows & Budgets · Checkpoints & Backups · Go / No-Go · Notes |
| Runbook Steps (`fin_runbook_steps`) | step of a run | Details · Load Figures · Timing · Control · Checkpoint · Defects · Notes |

Each runbook links to its **Mock Migrations** record. Each step links to its runbook, to its **Data Mapping** sheet (which shows the expected record count) and to any **Migration Defects** it raised.

## Running a migration with it

1. **Create the runbook.** Use Migration Runbook → New → *From template* → **Core Banking System Data Migration Runbook**. This creates the runbook and its 153 steps in one go: preparation, the static window, the financial window in six batches, end of day, reconciliation and go / no-go. Every step already points at the new runbook. Fill in the [placeholders], link the Mock Migration and set the window times and budgets.
2. **Work through the steps in order.** Open a step and set it to *In Progress*, then *Done*.
   - **Start / End:** the **Now** button stamps the current time. Times are stored in UTC and shown in the organisation's time zone.
   - **Load figures:** enter Records Received and Records Loaded.
   - **Worked out on save:** Records Failed, % Success, Throughput, Time Taken and Over / Under Budget. These fields can't be edited.
3. **Out-of-order warnings.** You get a warning when you start or finish a step while either of these is true:
   - an earlier step in the same batch is not Done or Skipped (steps marked *Can Run in Parallel* are left out of this check);
   - an earlier checkpoint has not been passed (*Proceed* or *Proceed with conditions*).

   You can carry on after giving a reason. The reason is added as a new row in the *Out-of-Order Reasons* table on the step, with columns When (UTC), By and Reason.

   *Depends On (steps)* and *Decision Notes* are lists, one entry per line.
4. **Watch the run.** The runbook page shows:
   - **Run summary:** steps done, in progress, failed or blocked, steps over budget, records received, loaded and failed, % success, and time against budget per window.
   - **Steps list:** grouped by window and batch, searchable, with links to each step.

   The Mock Migrations page shows the progress of every runbook linked to that run.
5. **Decide.** Record checkpoint decisions on the checkpoint steps. Record the final go / no-go on the runbook's Go / No-Go tab.

To reuse a runbook you've improved, use **Save as template** on the runbook. Its steps are saved with it, and each step's runbook link is kept as a `{{parent}}` placeholder.

## Engine features added (usable by any register)

| Feature | How a register uses it |
|---|---|
| **Date & Time** field (`datetime`) | Stored as a UTC ISO string and shown with the organisation's date format, time format and time zone (rule 68). Comes with a Now button. |
| **Record reference** field (`record_ref`) | `dropdown_options = [{ value: '<register_key>', label, multiple?, show_fields? }]`. Lets the user pick records of that register in the same project. The value is stored as `[{ id, label }]`. The view page links each record and shows the `show_fields` values. |
| **Calculated fields** | `local_register_fields.calculation = { op, … }`, where `op` is one of `difference`, `percent`, `minutes_between` or `per_second`. Optional `decimals`, and `display` of `duration` or `percent`. The value is read-only in the form, worked out from the values being typed and stored on save. |
| **Register behaviour** | `local_registers.behaviour = { type, templates?, template_children? }`. `type` is `runbook`, `runbook_steps` or `runbook_progress`. `templates: true` turns on New → From template without making the register a sign-off document. `template_children` lists the registers whose records are saved with a template. |

Shared code:
- utilities in `packages/shared/src/utils/`: `registerDateTime`, `registerCalculations`, `registerRecordRef`, `runbookSequencing`, `runbookSummary`;
- components in `packages/ui/src/`: `DateTimeInput`, `RecordRefInput`, `RecordRefView`, `SequenceWarningDialog`, `RunbookSummaryPanel`, `RunbookStepList`;
- the app-bound panel `apps/*/src/components/shared-app/RunbookRecordPanels.jsx`, which is identical in both apps.

## SQL — run order

| File | What it does |
|---|---|
| `SQL/v1375_register_runbook_engine.sql` | Adds the field types, the `calculation` and `behaviour` columns, and the template functions with `{{parent}}` substitution and record-reference children (public + sim). |
| `SQL/v1376_fin_migration_runbook_registers.sql` | Adds the two registers, their fields, the menus (sort orders 638 and 639; later Data Migration items move to 640–642) and role access. Turns on runbook progress on Mock Migrations. |
| `SQL/v1378_fin_cbs_runbook_system_template.sql` | Adds the system template with 153 steps. Rebuild it with `node scripts/build-cbs-runbook-template.mjs <file>` (the content check runs first; use `--check` to run the check alone). |
| `SQL/v1379_fin_migration_runbook_seed.sql` | Seeds SEED334-PRJ-08: 10 runbooks and 249 steps with actual figures for Mock 1 static, Mock 1 financial, the Mock 1 rerun and Mock 2 static (in progress). |
| `SQL/v1380_register_runbook_template_tests.sql` | Template tests R1–R6. Everything is rolled back; it shows PASS or FAIL for each test. |
| `SQL/v1381_fin_runbook_step_list_columns.sql` | Sets the runbook page's Steps list columns, in workbook order, with their headings, number formats and red-highlight rules. They are stored in `behaviour.list_columns` on Runbook Steps, so you change them in the database, not the code. Re-run it after any re-run of v1376, because v1376 resets `behaviour`. |
| `SQL/v1382_fin_runbook_step_list_budget_variance.sql` | Adds the **Over / Under** column after Budget: Time Taken minus Budget, shown with its sign (`+15m` over budget, `-5m` under) and in red when over budget. Run it after v1381. |
| `SQL/v1383_fin_runbook_steps_multi_value_fields.sql` | Makes three step fields multi-valued:<br>• *Depends On (steps)* and *Decision Notes* become lists.<br>• *Out-of-Order Reasons* becomes a table (When (UTC) / By / Reason), and reasons already saved are converted to table rows.<br>Run it after v1379. |

v1374 and v1377 belong to other work (ICT architecture) and are not part of this feature.

## Simulator

The Simulator uses the same system registers and template (public). The form, view, warnings and panels are the same in both apps. There is no FIN Data Migration menu in the Simulator, which matches the other FIN registers.

## Vendor-neutral content

The template comes from a real go-live monitoring workbook. Every bank, vendor, product code, routine name and person was removed (rule 26). `scripts/cbs-runbook-template-content.mjs` holds the content and the list of banned words.
