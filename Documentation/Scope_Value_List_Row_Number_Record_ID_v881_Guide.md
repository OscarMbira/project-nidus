# Scope & Value lists — row number + Record ID (v881)

## Menu

- Soft-deleted duplicate long-label EEF menu rows: `plat_s_eef`, `sim_pmo_eef` (and any other active `/platform/eef` or `/simulator/eef` leaf labeled like “Enterprise Environmental Factors…”).
- Kept Controls **Scope & Value** short label: `plat_pm_eef` / `sim_pm_eef` (“EEF”).
- Apply: `SQL/v881_hide_duplicate_eef_menu.sql`.

## List columns

| Page | `#` (first col) | Record ID |
|------|-----------------|-----------|
| Requirements Register | yes | `requirement_code` |
| EEF | yes | `source_reference` if set, else first 8 chars of UUID |
| Benefits Register | yes | `benefit_code` |

Platform and Simulator list UIs updated for the same behaviour.
