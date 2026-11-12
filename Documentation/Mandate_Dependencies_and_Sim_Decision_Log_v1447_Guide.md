# Mandate dependencies and the Simulator Decision Log (v1447–v1448)

**Introduced:** SQL `v1447`, `v1448`, Admin SQL `v248`. Plan `projectplan/v1340_core_pm_waves_2_to_4_plan.md`, Amendment A.

## Mandate dependencies

A project mandate now has a **Dependencies** section: other work the project relies on, or that relies on it.

| Field | Meaning |
|---|---|
| Dependency | What the dependency is (required) |
| Type | Internal, External, Interdependency or Unknown |
| Status | Identified, Analysed or Managed |
| Affects the project while it runs | Yes / No |
| Continues after implementation | Yes / No |

**Where:**
- **Platform:** add, edit and delete on the mandate's edit page. The view page lists them read-only. Each change saves straight away, separately from the mandate's Save button.
- **Simulator:** on the practice mandate's view page. Read-only once the mandate is approved or archived.

The list has a table / card toggle, search and sortable columns. Mandate exports include a **13. Dependencies** table. Excel, CSV, XML and JSON exports get one line per dependency.

**Access:**
- **Platform:** a dependency is visible to whoever can see its mandate. It can be changed by the mandate's creator, or by a PM or PMO role holder who can see that mandate. Before v1447, any signed-in user could read every organisation's dependencies.
- **Simulator:** dependencies are private to the owner of the practice mandate.

## Simulator Decision Log

The Simulator Decision Log (**Governance → Decision Log**, `/simulator/governance/decisions`) now saves decisions in the Simulator schema (`sim.project_decisions`), against **practice projects**, like the other practice registers.

- **Choosing a project:** a practice project picker sits at the top of the list. With one practice project, it is selected automatically.
- **Decision IDs:** come from Admin ID Generation, for example `SDEC-001`, numbered per practice project.
- **Access:** only the practice project's owner and active members can see or change its decisions. Before v1448, any signed-in user could.
- **Custom fields:** the decision page shows custom fields when the organisation has published fields for the "Decision log entry" screen.
- **AI search:** Ask Nidus in the Simulator already reads this table, so new decisions show up there.

**Earlier decisions:** decisions saved through the Simulator before this change were stored against Platform projects. They stay where they are and still show in the Platform Decision Log.

**Known gap:** the Simulator's authorisation queue still reads Platform lifecycle tables. Opening a Platform decision from that queue in the Simulator shows "Decision not found".

## Run order

1. Admin: `E:\project-nidus-admin\SQL\v248_sim_project_decisions_id_generation_seed.sql`
2. `SQL/v1447_mandate_dependencies_access_and_sim_table.sql`. Check: `public_policies` lists only the two v1447 policies, and `sim_table_exists` is true.
3. `SQL/v1448_sim_decision_log_practice_projects.sql`. Check: 4 sim policies, `admin_rule_exists` true, `blank_references` 0, `sim_screen_rows` 1.
