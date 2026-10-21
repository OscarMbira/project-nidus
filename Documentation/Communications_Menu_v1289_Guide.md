# Communications menu (v1289)

## What changed

The Comms Hub pages were built and routed in both apps, but nobody could reach them from the sidebar. They now have one home: a **Communications** section (Simulator: **Practice Communications**). It appears for PMO Admin / Account Owner, Project Manager, Team Manager, Team Lead and Team Member roles.

| Platform page | Address |
|---|---|
| Comms Hub | `/platform/comms` |
| Channel Messages | `/platform/comms/messages` |
| Direct Messages | `/platform/comms/direct` |
| Meeting Summaries | `/platform/comms/meetings/summaries` |
| Pending AI Reviews | `/platform/comms/pending-review` |
| Meetings (under **Governance → Meetings**) | `/platform/comms/meetings` |

The Simulator section has the same pages under `/simulator/comms/*`, plus **Meetings**, because the Simulator has no Governance → Meetings item. To schedule a meeting, use the **Schedule** button on the Meetings page. It is not a separate menu item.

## How it works

- **Database** (`SQL/v1289_communications_menu_section.sql`):
  - Creates the section rows `plat_pm_communications` and `sim_pm_communications` and their pages.
  - Deactivates the older comms rows the new section replaces (v410, v568, v659/v667, v681/v682 generations). The NOTICE lists exactly which ones.
  - Grants the section, its pages and Governance → Meetings to the roles above.
  - Ends with a check query showing which roles see each row.
- **Sidebar code** (`packages/config`):
  - `plat_pm_communications` is a top-level category in both the PM/Team list (`PM_CATEGORY_DEFS`) and the PMO list (`PMO_CATEGORY_DEFS`).
  - `sim_pm_communications` is a top-level category in both Simulator lists.
  - Any `/platform/comms/*` or `/simulator/comms/*` row is grouped into that section, even if its parent row is missing. Before this change, PMO users saw these pages under "Email & Notifications".
  - Meeting Summaries gets its own dedupe key, so it is no longer merged away as a duplicate of Meetings.
- **Taxonomy:** `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` §25.

## Setup and testing

1. Run `SQL/v1289_communications_menu_section.sql` in Supabase. Keep the NOTICE text, which lists the rows it deactivated.
2. Check the result grid: every Communications row should list the PMO, PM and Team roles.
3. Sign in as each role and reload the page. The sidebar first shows its saved copy, then refreshes from the database in the background, so the section can take a moment to appear. Open **Communications**.

Rollback: `SQL/v1289_communications_menu_section_rollback.sql`. Paste the NOTICE codes into it first.

## Who can file meeting items (v1290)

The meeting review page (`comms/review/:meetingId`, opened from Pending AI Reviews or a meeting's **File to registers** button) follows the role grant on the Pending AI Reviews menu item:

- **Role can use Pending AI Reviews** (PMO, Project Manager, Team Manager, Team Lead by default): can run the AI, choose what to do with each item, and file them.
- **Role can only view it** (Team Member by default): sees the same items read-only, with a note to ask their Project Manager or PMO admin. The AI and filing buttons are hidden.
- To change this for a role, turn "use" on or off for Pending AI Reviews in the role menu screens. No code change is needed.
- If the check cannot run (for example, `SQL/v1290_auth_user_can_use_menu.sql` has not been run yet), the page stays view-only for everyone.

The check is `public.auth_user_can_use_menu(menu_codes)`. It returns only true/false, for the signed-in user's own roles. Run `SQL/v1290_auth_user_can_use_menu.sql` after v1289. Its result grid lists which roles can file and which can only view.

This is a screen rule, not a database rule: register permissions themselves are unchanged. A Team Member who can already add risks or issues in the registers can still do so there.
