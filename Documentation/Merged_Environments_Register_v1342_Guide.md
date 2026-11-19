# Environments — one form for every project (v1342)

**Applies to:** Platform and Simulator. **SQL:** v1467 (register), v1468 (records), v1469 (menus).
**PRD / plan:** `projectprd/v1342_merged_environments_register_PRD.md`, `projectplan/v1342_merged_environments_register_plan.md`.

## What changed for users

- **One place.** Project Setup › Project Settings › **Environments** is the only Environments page, on every project. The separate Testing environments page and the Banking and IT environment pages are gone from the menus.
- **One form, for every industry.** Construction, NGO, Healthcare, Energy, Banking, IT or no industry: every project gets the same tabs.

  | Tab | What it holds |
  |---|---|
  | Details | Title (environment name), Description (purpose), Environment Type, Environment Code, Used By, Hosting Model, Data Centre / Site, Environment Owner, Status |
  | Cloud Setup / Cloud Compliance | Shown when Hosting Model is Cloud or Hybrid |
  | Infrastructure | Shown when Hosting Model is Non-cloud or Hybrid. Host name, IP address and mount point (Connection Details) also follow this |
  | Connection Details · Database · Availability & Refresh · Access & Bookings · Health & Issues · Notes | Always |
  | Banking | Only on Banking & Financial Services projects: Banking Component |

- **Statuses:** Not Provisioned → Provisioned → Ready → In Use, plus Issue and Decommissioned.
- **Test suites and test runs** pick from this list. Decommissioned environments are not offered. Existing test suites keep their environments: the records kept their ids.
- **Old links and bookmarks still work.** The old Testing environments pages and the old Banking / IT environment pages open the new register, and the same record where the old address named one.

## What happened to existing records

| From | How |
|---|---|
| Core (Testing) environments | Copied with the same id. Name → Title, Description → Description, Active → Ready, inactive → Decommissioned. |
| Banking Environments register | Moved: same id, display ID, documents and history. Environment → Environment Type, Component → Banking Component. |
| IT Environments register | Moved, same as Banking. Hosting → Hosting Model (private / public cloud → Cloud + Deployment Type), Purpose → Description (or a "Purpose:" line in Notes), a non-cloud Location → a "Location:" line in Notes, Application Version → Deployed Build / Release / Version. |

Every moved record carries `field_values._moved_from` (old table or register key). Records with the same name are not merged.

## For administrators

- **Industry-only fields:** a register field with `visible_when = { "project_industry": ["<industry category name>"] }` shows only on projects with that industry. That's how the Banking tab works. Add another industry tab the same way, in the database; no code change. A tab whose fields are all hidden disappears.
- **Run order:** v1467 → v1468 → v1469, together. v1468 is safe to run again (it picks up environments added through the old page in between).
- **Checks:**
  - v1468's self-check: counts per project, test suite links that don't resolve, records left behind.
  - v1469's check: the core entry, and retired items still switched on.
  - Then the menu audits `SQL/v1452` and `SQL/v1465`.

## Rollback (nothing was deleted)

1. **Menus:** set `menu_items.is_active = TRUE` for `fin_reg_fin_core_banking_environments`, `ict_reg_ict_environments` and `ict_cat_environments`, and turn their placements back on. Put `plat_pm_testing_environments.route_path` back to `/platform/testing/environments` (the app routes would then need the old pages restored from git).
2. **Banking / IT records:** `UPDATE local_register_records SET register_id = <old id> WHERE field_values->>'_moved_from' = '<old key>'`. Rename the mapped keys back if needed. Set the old registers `is_active = TRUE, moved_to_register_id = NULL`.
3. **Core rows:** the old `test_environments` / `practice_test_environments` rows are untouched. Delete the copied register records (`_moved_from = 'test_environments'` / `'practice_test_environments'`) and point `getTestEnvironments` back at the old tables (git).
