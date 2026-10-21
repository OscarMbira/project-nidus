# Custom fields on local registers (v1311)

Every local register — the industry-pack registers such as **Banking Transformation** and **Core Banking**, and any register your organisation creates — has a **Custom Fields** tab. Use it when you need to capture something the register doesn't have a field for.

Custom fields belong to **your organisation**: everyone in your organisation sees and uses them, and nobody outside it does.

## For register users

### Add a field
1. Open a record (create or edit) and go to the **Custom Fields** tab (just before *Audit details*).
2. Click **Add custom field**.
3. **Use an existing field** (first tab) — your organisation may already have the field you need, perhaps on another register. Search the list and click **Add to this register**. Reusing a field keeps reports consistent and avoids duplicates.
4. Otherwise choose **Create a new field**:
   - **Field name** — if the name already exists in your organisation (ignoring case, spaces and punctuation) you are offered the existing field instead. Similar names show **Did you mean …?**.
   - **Type** — Text, Notes (long text), Number, Date, Yes / No, Link (URL), Dropdown, Multi-select dropdown or Multi-value list.
   - **Options** — for the two dropdown types, one option per line.
   - **Required** — tick it only if every record in this register must have a value; a required field blocks saving until it is filled.
5. Click **Create field**. It is available immediately to everyone in your organisation.

### Fill in and use custom fields
- Values are entered on the **Custom Fields** tab and saved with the record when you press **Save**.
- Required custom fields appear in the *Required to save* list as "Field name (Custom Fields)".
- The record view page shows them on its own **Custom Fields** tab.
- The register list shows custom fields as extra columns, the search box searches their values, and **Export** (Excel, CSV, JSON, XML, Word, PowerPoint, Print) includes them.

### Limits
Each organisation can add a limited number of custom fields to any one register (30 by default). The tab shows "*n* of *limit* custom fields used". When the limit is reached, ask a PMO admin to retire a field you no longer need, or your system administrator to raise the limit.

## For PMO admins
Only PMO admins can change a field after it is created. Use **Manage fields** on the Custom Fields tab (or *PMO Admin › Local Data Extensions*):
- **Rename** a field, edit its dropdown options or change *Required* — *Field Definitions*.
- **Retire** a field (status *Deprecated*) — it disappears from every register; values already saved on records are kept.
- **Remove a field from one register** — *Screen Mapping*, screen "Local Registers › <register name>".
- Every field created or attached from a register is recorded in **Audit History** with who did it.

## For system administrators
*Admin › System › Register Custom Field Limits*:
- **Default limit** — custom fields per register per organisation (1–200, initially 30).
- **Organisation overrides** — a different limit for a specific organisation.
Every change needs a reason and is written to the admin audit log. Lowering a limit never removes fields; organisations above it simply cannot add more.

## How it works (technical)
- **Definitions** reuse Local Data Extensions: `custom_field_definitions` / `custom_field_options` (account-scoped, published on creation), attached to a register through `custom_field_screen_map` and one `system_screens` row per register (`local_register:<register id>`, module `local_registers`, created on first use). The `multi_line` type was added to LDE for multi-value lists.
- **Values** are stored on the register record in `local_register_records.field_values` under `cf__<definition id>` — not in LDE's project-scoped `custom_field_values` — so they save with the record, follow the record's own security, and work for portfolio, programme and PMO registers that have no project.
- **Writes** by users go only through SECURITY DEFINER RPCs (`local_register_custom_fields`, `…_library`, `local_register_add_custom_field`, `local_register_attach_custom_field`, in `public` and `sim`), which check organisation membership, register access, duplicate names and the limit. LDE's own table security (PMO admins only) is unchanged.
- **Simulator** uses the same feature with its own `sim.*` LDE tables.
- **Limit** = `public.local_register_custom_field_limit(account)`: the organisation override, else the default.

### SQL run order
1. `SQL/v1311_local_register_custom_fields_schema.sql`
2. `SQL/v1312_local_register_custom_fields_rpc.sql`
3. `SQL/v1313_local_register_custom_fields_tests.sql` (read-only result table; leaves no data)
4. `SQL/v1251_planner_table_wall.sql` (re-run: two new public tables)
5. Admin: `E:\project-nidus-admin\SQL\v242_local_register_custom_field_limit_admin_rpc.sql`

PRD: `projectprd/v1311_local_register_custom_fields_PRD.md` · Plan: `projectplan/v1311_local_register_custom_fields_plan.md`
