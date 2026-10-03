# Stakeholder Analysis periods (v1141)

The Period field on Add/Edit Analysis is a searchable list for the organisation that owns the current project.

Shared periods (available to every organisation): Initiation, Planning, Execution, Monitoring and control, Closure, Weekly, Fortnightly, Monthly, Quarterly, Annual, Stage review, Benefits review.

A missing name can be added from the dropdown with **Add "…" for this organisation**. That name is stored on `public.stakeholder_analysis_periods` and then appears for other users in the same organisation. The analysis record still stores the chosen name in `stakeholder_analysis.analysis_period`.

Run `SQL/v1141_stakeholder_analysis_periods.sql` in the Supabase SQL editor, then refresh the Analysis page. That file creates the table and loads the shared periods. `SQL/v1141_stakeholder_analysis_periods_seed.sql` can be run afterwards if those names need to be inserted again.
