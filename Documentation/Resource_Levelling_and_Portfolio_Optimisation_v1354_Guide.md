# Resource levelling and portfolio optimisation (v1354)

Levelling delays lower-priority tasks so a person stays within the hours already shown on the workload view. It does not split a task or change who it is assigned to. Portfolio scoring and scenarios then choose a set of projects within a budget and a capacity limit.

## Where to open it

- **One project:** Schedule → Time & people → **Level resources**. Choose within float (the project finish stays) or beyond float. Untick any move you do not want. Apply saves a run. Undo last run puts those dates back, unless someone has edited them since.
- **Pin a task:** on the task page, Schedule tab, “Keep this date when levelling resources”. A task set to Manual is also left where it is.
- **Across projects:** Resources → **Level resources**. Tick the projects, or add a programme or portfolio. Send the proposal. Each project manager opens Schedule → **Levelling proposals** and accepts or rejects.
- **Planner:** the same Level resources view, and `/app/levelling` for more than one planner project. Planner has no portfolios.
- **Scoring:** Portfolio → **Scoring**. Weights must total 100%. Use suggested criteria, then open a project to score it 1–5. Strategic fit starts from the contribution confidence already recorded (high 5, medium 3, low 1) when no score is saved yet.
- **Scenarios:** Portfolio → **Scenarios**. Set a budget and hours for each period, add rules, run, then save. Compare up to four from the list. Submit for approval (a justification is required to approve or reject). Apply is available only after approval. In projects become active and take the next priority order. Out projects become pending. A later start shifts the project start by that many months.

## SQL (you run these)

1. `SQL/v1572_resource_levelling.sql`
2. `SQL/v1573_portfolio_scoring.sql`
3. `SQL/v1574_portfolio_scenarios.sql`
4. `E:\project-nidus-admin\SQL\v258_levelling_scenario_id_generation_seed.sql` (after v1572 and v1574, so display ids are assigned)
5. `SQL/v1575_levelling_portfolio_menus.sql`
6. `SQL/v1576_levelling_portfolio_tests.sql` (rolled back; skips when the session is not signed in)

If v1572 or v1574 prints a notice that the reminder tables are missing, run `SQL/v1562_reminders_lead_times_daily_digest.sql` and run that file again. The rest of the file still applies.

Suggested scoring criteria are not written onto existing portfolios. The scoring page has **Use suggested criteria**.
