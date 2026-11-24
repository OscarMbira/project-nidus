# Quantitative risk analysis (v1355)

How likely a plan is to finish on time and within budget, and the contingency that confidence implies.

## Where it is

- Platform: Schedule → Risk analysis, or the menu item Quantitative analysis (`/platform/schedule/risk-analysis`).
- Simulator: the same schedule tab, and the menu item at `/simulator/risk-analysis`.
- Planner: the schedule tab only. It has task ranges and no risks, cost lines or exposure.

## What you enter

On a risk, set a probability from 1 to 99, or leave it blank and the middle of the 1–5 score is used (marked “estimated from the score”). Cost and schedule each have a minimum, a most likely and a maximum. The most likely value is also the single impact the rest of the register already shows, so existing risks are not rewritten. A negative cost or a negative number of days is a gain (an opportunity).

Triangular is the usual shape. PERT pulls towards the most likely value. Uniform treats every value between the minimum and the maximum as equally likely.

A group (Low, Medium or High) makes its members rise and fall together. Leave a task, risk or cost line ungrouped if it moves on its own.

On the analysis Inputs tab, a quick range such as −10 to 25 builds a minimum and maximum around each task’s current duration. Cost lines can be copied from the plan budget. A line marked “grows with delay” adds its daily rate for each extra working day the simulated finish slips, and reduces it if the finish is early.

Target confidence is 50, 80 or 90. 80 is the default. A project can override the organisation default.

## What a run means

A run samples the ranges between 1,000 and 20,000 times (5,000 is the usual choice) and schedules the plan each time. The repeat code is stored, so the same inputs and the same code give the same result. “80% chance of finishing by …” is the date that 80% of the samples finished on or before. The same reading is given for cost.

The tornado lists what moved the finish or the cost. Criticality is how often a task sat on the critical path.

Nothing is written to the plan until you choose Adopt. Adopt sets the plan’s contingency to the recommended amount and records who adopted it and what the previous amount was. A schedule-only run has no cost contingency to adopt.

Saved runs cannot be edited. Run again to keep a new one, and tick two rows on Saved runs to compare their dates.

## Programme and portfolio

The programme and portfolio dashboards list each project’s expected cost, 80% cost, chance of the target date, and whether the latest run is older than 30 days. A project with no run is counted as missing. The project manager can also get a reminder when the latest analysis is older than 30 days (Reminder Lead Times).

## SQL to run, in this order

1. `SQL/v1566_qra_quantified_risks.sql`
2. `SQL/v1567_qra_schedule_model.sql`
3. `E:\project-nidus-admin\SQL\v257_qra_runs_id_generation_seed.sql` (after the tables exist, so new runs receive a display id such as QRA-001)
4. `SQL/v1568_qra_cost_and_contingency.sql`
5. `SQL/v1569_qra_rollup_menus_help.sql`
6. `SQL/v1570_qra_tests.sql` (rolls back; it checks the constraints and that a saved run cannot be changed)

Until those files have been applied, the screens show the database error rather than invented figures.
