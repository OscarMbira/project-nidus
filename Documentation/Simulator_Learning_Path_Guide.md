# Simulator Learning Path Guide (v734)

## Tables

- `sim.learning_paths` — role-specific path definitions with module JSON
- `sim.learning_path_progress` — per-user module completion

## Paths per role

| Role | Modules | Est. hours |
|------|---------|------------|
| Project Coordinator | 4 | 8 |
| PMO Analyst | 5 | 12 |
| Project Manager | 6 | 18 |
| Programme Manager | 5 | 15 |
| Portfolio Manager | 5 | 14 |

## UI

- `/simulator/learning?role=<role_id>` — `LearningPathDashboard`
- `/simulator/learning/module/:moduleId` — `LearningModule`

## Certificates

Certificate templates in `sim.certificate_templates` reference required modules. Eligibility is checked via `certificateEligibilityService.js`.
