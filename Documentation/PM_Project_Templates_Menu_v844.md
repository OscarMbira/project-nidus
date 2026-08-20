# PM Project Templates (v844)

## What
Separate PM sidebar section **Project Templates** for templates the PM has **copied down** to the current project (`tier = project`).

## Split
| Menu (DB `menu_code`) | Shows |
|----------------------|--------|
| Organizational Templates (`plat_pm_templates`) | Higher-tier / org candidates for **Copy down** (excludes this project's own copies when project-scoped) |
| Project Templates (`plat_pm_project_templates`) | Only `tier=project` nodes for the current project — View/Edit / Retire |

## Apply
1. Run `SQL/v844_pm_project_templates_menu.sql` (and `v843` if not already applied).
2. Run **`SQL/v845_pm_project_templates_menu_grants_fix.sql`** — copies role grants from Organizational Templates so the new leaf appears for the same roles (v844 grants alone were often insufficient).
3. Hard-refresh / restart the Platform app (sidebar cache version **44**).

## Routes
- Platform: `/platform/templates/project`
- Simulator PM: `/simulator/pm/templates/project`
