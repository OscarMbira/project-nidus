# v1337 — CBS Data Migration Runbook (PRD)

**Status:** Draft for approval · **Owner decisions:** interview 2026-11-09 (D1–D9 below)
**Pack / menu:** Banking & Financial Services → Data Migration
**Source material:** `Documentation/DM_MONITOR_GoLive_Final.xlsx` (go-live data migration monitor) and the
Data Migration menu (screenshot, 2026-11-09).

## a) Problem statement

A core banking go-live is executed from a **data migration runbook**: an ordered list of about 110 load
steps in two windows (static, financial) and six batches, with control steps between them (configuration
changes, backups, extracts, checkpoints, sign-offs), tracked live during every mock, dress rehearsal and
the go-live weekend — records received / loaded / failed, % success, throughput, start / end, time taken
against budget.

Project Nidus has no such runbook. An audit (2026-11-09) found only fragments:

| Exists | Where | Gap |
|---|---|---|
| Runbook references (name, audience, owner) | Data Migration Strategy → Runbooks table | No steps |
| Load results per data object | Mock Migrations | Summary per run; no sequenced steps or checkpoints |
| Mapping-sheet load steps | Data Mapping → Load Steps (v1351) | What a sheet loads, not how a run executes |
| Activity runsheet | Cutover Plan (one text list) | Not step-level, not tracked |
| Runbook documents | IT pack → Runbooks | Operational procedures, not a migration load monitor |

Teams therefore run the go-live from spreadsheets, outside the audit trail, with no live progress view and
no comparison between rehearsals.

## b) Solution

Two new registers under Data Migration, after Mock Migrations:

* **Migration Runbook** — one record per run (Mock 1, Mock 2, dress rehearsals, go-live), linked to its
  Mock Migrations record; windows, budgets, checkpoints, go/no-go, and a live **run summary panel**
  totalling its steps.
* **Runbook Steps** — one record per step, linked to its runbook, ordered by window → batch → sequence,
  with a **Step Type**. Load figures show only for Load / Transformation steps; checkpoints carry a
  decision and sign-off. % success, failed, time taken, throughput and budget variance are calculated.

A vendor-neutral **CBS Data Migration Runbook** system template (≈110 steps from the workbook) lets a
bank create a run with all its steps in one action (v1336 template engine). Three engine additions make
this possible for any register: a **Date & Time** field type, **calculated fields**, and a
**record-reference** field type.

## c) User stories

1. As a data migration lead, I can create a Migration Runbook for a run (Mock 1, Mock 2, dress rehearsal,
   go-live) and link it to its Mock Migrations record.
2. I can create the runbook from the CBS runbook template so all ≈110 steps are created in order.
3. I can create a blank runbook and add my own steps.
4. Each step has a window (Static / Financial), batch, sequence number and step type.
5. Step types: Load · Transformation · Configuration change · Backup · Extract / report · Validation /
   reconciliation · Checkpoint / sign-off · Service start / stop.
6. Load and Transformation steps show data set, load object, mapping sheet, agents, records received,
   loaded, failed, % success and throughput; other types do not show those fields.
7. Configuration-change steps show the instruction and who applied it.
8. Checkpoint steps show the decision (Proceed / Proceed with conditions / Stop) and who signed off.
9. A step can name its Data Mapping sheet; the step then shows that sheet's load object and expected
   record count.
10. A step can list the Migration Defects raised on it.
11. Step start / end are date and time to the minute; extraction and validation have their own start / end.
12. A "Now" button stamps the current date-time into a date-time field.
13. Failed, % success, time taken, throughput and over / under budget are calculated when the step is
    saved and shown in lists, the record view and exports.
14. Step statuses: Not started · In progress · Done · Failed · Blocked · Skipped.
15. Starting a step while an earlier non-parallel step in the same batch is not Done shows a warning and
    asks for a reason; the reason is recorded on the step.
16. Starting a step after an unsigned checkpoint shows the same warning.
17. A step can be marked "can run in parallel" so it does not trigger the order warning.
18. The runbook shows a live summary: steps done / total, failed, blocked, over budget; records received,
    loaded, failed and overall % success; elapsed time against budget per window.
19. The runbook lists its steps in order, grouped by window and batch, with status colours.
20. The Mock Migrations record shows its runbook's progress (e.g. "64 / 113 steps done").
21. Runbook Steps can be listed across all runs, filtered by runbook, window, batch, status and type.
22. Lists, record views and exports (Excel, Word, PDF, CSV…) work for both registers (rule 38).
23. Both registers have the Audit details tab and version history where the engine provides it.
24. The template contains no product, bank or person names; organisation-specific values are
    [placeholders] (rule 26).
25. The demo project has 10 runbooks (one per Mock Migrations run); the three that have run or are
    running carry full steps with actual figures; the seven planned ones carry header and budgets only.
26. The same roles that see the other Data Migration menus can see and update runbooks (v1343).
27. Platform and Simulator behave the same (rule 34.1).
28. The Date & Time, calculated and record-reference field types work in any register, not only these two.

## d) Implementation decisions (owner, 2026-11-09)

* **D1 Structure** — Migration Runbook (one per run) + Runbook Steps (one per step, linked), master
  runbook as a system template.
* **D2 Menu** — Data Migration, after Mock Migrations: Migration Runbook, Runbook Steps; same role grants
  as v1343; taxonomy updated in the same change (rule 70).
* **D3 Step types** — one ordered list with a Step Type; type-specific fields via conditional fields (v1346).
* **D4 Calculations** — per-step calculated fields stored on save; live run summary panel.
* **D5 Template** — generic CBS runbook from the workbook (≈110 steps, both windows, six batches, control
  steps), vendor-neutral.
* **D6 Samples** — 10 runbooks on SEED334-PRJ-08; full steps with actuals for Mock 1 static, Mock 1 rerun
  and Mock 2 static (running); planned runs header only (≈330 step records).
* **D7 Sequencing** — warn, don't block; reason logged; "can run in parallel" flag.
* **D8 Date-time** — new `datetime` field type (organisation time zone / format, rule 68) with a Now button.
* **D9 Links** — runbook → Mock Migrations run; step → Data Mapping sheet and Migration Defects; needs a
  `record_ref` field type (single or multiple records of a named register, same project).

## e) Testing decisions

* Unit tests: datetime parse / format / Now; calculation rules (failed, % success, time taken, throughput,
  budget variance, edge cases: no end, zero received); record-reference resolution and labels;
  sequencing-warning rules (parallel flag, unsigned checkpoint); run summary totals.
* Component tests: datetime input with Now; record-reference picker; warning dialog with reason;
  summary panel; both apps' form and detail pages.
* SQL tests (temporary function, as v1340): the new field types pass the field-type check constraint;
  a runbook created from the template gets all its steps in order and linked to it; a project may hold
  several runbooks (one per run).
* Seed check: every step value valid for its field; sample ID ranges confirmed free before use.
* Done = all stories demonstrable on the demo project in both apps, tests green, lint and drift clean.

## f) Out of scope

* Automatic loading or reading of migration tool logs (figures are entered or imported by people).
* Bulk upload of step results from the tool's log files (possible later; rule 26 bulk-upload would apply).
* Gantt / timeline chart of the run (the summary panel and grouped list cover the need for now).
* Hard blocking of out-of-order steps (D7).
* Changes to Reconciliations and Migration Sign-Off.

## g) Further notes

* The workbook names a vendor product, its table names, a bank and staff; none of these enter the template
  or samples. Load objects become neutral names (e.g. "Customer master load") with [Load object] where a
  bank must fill in its own table name.
* The record-reference and datetime field types also benefit other registers (e.g. Cutover Activities,
  Hypercare Incidents) — not converted in this change.
* SQL files start at v1374 (next free SQL number at the time of writing); PRD / plan are v1337 under rule 18.0.
