# v334 Seed — platform projects (portfolio / programme / standalone, max 30)

## Objective
Provide dev-friendly seed data: **30 projects** with realistic mix of **portfolio-only**, **programme-only**, **both**, and **standalone**, plus **My Projects** membership.

## Deliverables
- [x] `SQL/v334_seed_platform_projects_portfolio_programme_dev.sql`
- [x] `Documentation/Seed_Projects_v334_Portfolio_Programme.md`

## Review
- **Counts:** 9 + 9 + 4 + 8 = **30** projects; 3 portfolios; 3 programmes (2 under portfolios, 1 standalone programme).
- **FKs:** Uses first active `accounts` + owner `users.id`; first `project_statuses` row.
- **No new tables** — no `database_tables` insert required.
- **Meaningful copy:** v334 SQL uses 30 unique project titles/descriptions and richer portfolio/programme names; re-run updates existing `SEED334-*` rows and resets programme/portfolio links for those projects.
- **UI:** `ProjectsDetail.jsx` — optional `project_methodologies` embed (no `!inner`), improved “could not open project” copy, routes to `/platform/projects`. See `Documentation/Platform_Project_Detail_Load_and_Navigation.md`.
