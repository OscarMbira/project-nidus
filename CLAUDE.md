## Standard Workflow
1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md. Where it is necessary, you can create a new file for the plan in order to maitain different plans for different features/functionality and to avoid the projectplan.md file growing so big or overwriting the previous content. Make a logical judgement to create additional and separate planning files.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information.
8. When creating a new page/component/form/visualisation items etc, always make them theme aware to toggle between dark and light mode depending on the user preferences.
9. Always create all SQL command files (*.sql) under the SQL folder in the root
10. Always create all documentation files (*.md) under the Documentation folder in the root, except for this CLAUDE.md file which should remain in the root directory
11. Always create all CSV data files (*.csv) under the "CSV Files" folder in the root
12. Do not insert any sample/dummy data unless I specify
13. After creation any new features, always create and attach to the role-based sidebar menu and sublinks
14. When creating any SQL files(*.sql), recall that I am using supabase as the backend and it requires 15. PostgreSQL. So make sure the SQL syntax is aligned accordingly.
15. The countries field on any page(system-wide) should only show the DB table "countries" details where the is_active field is true. This always applies to all dropdown list for the country field.
16. Make sure after successfully creating/updating any application record/table, there is a succesful form displayed to show the user that the update was successful with record specific information like record id, CRUD operation that was performed.
17. All SQL files(*.sql) should be created in the folder SQL for easy access. This SQL folder should be created on the root if it doesn't exist
18. When creating any SQL files, make sure to give some version name that shows the sequence and rpecedence by which the files are created and for future refence. 
18.1 Can you apply the same sequencing logic when creating implementation plans in projectplan folder. Versions for easy of knowing the sequence.
19. All documentation files (*.md) should be created under the Documentation folder and folder should be created on the root if it doesn't exist
20. Always push the code to the github after a major change has been done to the codebase or every 3 days, whichever comes first.
21. I will be creating a massive documentaion of this system and therefore do not override any planning files all planning files should be placed in in root folder "projectplan". Always document in a separate file for any changes you make and and guides for documentation for each topic or functionality/feature.
22. I will be creating a blog for the application features, hence you should always document any change by using a separate file where applicable.
23. For each new feature/functionality, always create unit tests for automated testing purposes
24. Make sure to have a distinct and separate folder strutures for a) Frontend and b) Backend. If they do not exist, created them and be updating/creating project files by following this folder structure religiously for easy future maintainability of the application. Any future updates to any functionality should not have a side effect of affecting any working functionality.
25. All data should be fetched from the DB tables and do not use mock or dummy data until I have confirmed the same.
26. **NEVER use fallback data, mock data, or default static data unless explicitly requested by the user.** All data must come from the database. If database queries fail, handle the error appropriately but do not substitute with fallback data.
26. For all features that may require to upload bulk data from other existing project management tools or data, create a feature for both a) Single record capture and b) Bulk record upload/capture with all CRUD and user confirmation flows and where applicable, user the multi-step flows.
26. When creating new and named components/folders always avoid Copyright/Trademark names for compliance with international laws and avoiding lawsuits.
27. Do not use or name any component with the word PRINCE2 due to copyright sensitivity. Use other non-copyright/trademark text, e.g. structured/traditional
28. The default them for all components/pages/forms/tables/dropdowns etc, should be dark during creation and setup.
29. For frontend components, always optimise for progressive web app(PWA) for mobile responsivenes.
30. All created images should be stored under the root folder "Design Images". Create it if it doesn't exist.
31) Provide clear code patches (full files or diffs) and explain changes.
32) Do NOT refactor unrelated modules
33) Always create a todo-list when working on a large or complex features/functionalities.
34) If you create any new features/functionalities/components in the Platform system/folder, always check if the same is applicable to the Simulator System. If applicable, then create the same functionality to cater for the Simulator System, else not. This includes validations rules, tables, fields, modifications etc. This makes sure that the Platform and Simulator systems are at par interms of applicable features/functionalities and components/tables/fields/RLS etc. the intention is to complete the system at the same time and fully deploy at the same time with similar features/functionalities.
34.1) **Platform–Simulator parity (compliance):** Any change to a common functionality that exists in both Platform and Simulator MUST be applied to both systems. When you change, optimise, or fix a feature on one system (e.g. Programme Dashboard, list pages, forms, services), apply the same change—or the equivalent for the Simulator schema and routes—on the other. Do not leave the Simulator behind when updating shared behaviour; both systems must remain at par for that functionality.
35) Always check and fix the duplicate import errors each time a new feature/functionality is created.
36) Whenever you are creating a new amount/numeric field type, implement a feature/functionality that allows the user to enter some values/figures like 10t/T and convert 10,000(thousand) or 3m/M as 3,000,000(million) etc after pressing the Enter Key. Use any best practice applicable conversions for these amounts.
37) When creating a new feature that involves capturing new record or amend/edit existing record, always simultenously create a feature (or use existing) for the user to be able to put the record on hold and come back later to continue by selecting the record from the hold/draft queue instead of restarting recapturing the record data again.
38) Always add a feature/function(for both Plaform and Simulator systems) for each table/list and record viewing/reading as follows: 1) If it is a table/list, add a features/functionality to export to excel/powerpoint/word/csv/xml/json/print for the list of all the records that satisfied the selection criteria for these table records. If it is powerpoint/word, the default maximum number of exportable fields is 5, however, there should be some flexibility for the user to choose the fields to export upto a maximum of 10 fields/attributes.  2) If it is a record view/read/see mode, add feature/function to export a) Powerpoint and can be multiple pages based on the record data, b) MS Word with each field/attribute being a header, 3) Excel with fields/attribute being the column headers. The user should choose the right button based on the preferences. 4) For numbered or bulletted items, make sure that they are exported as such based on the what document type the user choose(ppt, docx, xls, csv, XML, JSon, Print). This makes it easy for human reading.5) For excel, show the bulleted multivalues one per each line, the same way a user will manually press alt+enter to enter values on a separate line. 6) The export functionality should show as a dropdown the list of export formats(excel/word/powerpoint/csv/xml/JSon/Print). 7) Utilise the existing exporting functionality/features to avoid redundant or duplicated code.
39) Always make sure to implement the Progressive Web App (PWA) functionality which will be used by users to access the system, especially through their mobile devices. This has to be done for ALL NEW/Amended/Updated funtionalities/Features added in the system(both Platform and Simulation).
40) For any NEW table/list, add clickable, sortable column headers to every table and list view across the Platform and Simulator systems. Clicking a column heading cycles through: **unsorted → ascending → descending → unsorted**. Visual indicators (↑ ↓ ⇅) show the current sort state. This applies consistently to both HTML `<table>` pages and card/list-view pages (via a sort toolbar). The **`#` row-number column is never sortable.**
41) For NEW tables/lists, add a consistent **Card ⊞ / Table-List ≡ view toggle** to every table and list page across the Platform and Simulator systems(show all CRUD operation button for each record). Both views always include a **search bar**. The user's last-chosen view is remembered per page via `localStorage`.
42) Do NOT bypass RLS policies as a workaround.
43) Run the retest suite after each fix to confirm no regressions
44) For any **NEW or amended table/list view** (Platform and Simulator), show row numbers in **both** view modes when a Card ⊞ / Table-List ≡ toggle exists (rule 41):
   - **Table-list mode:** `#` as the **first column** via `TableRowNumberHeader`, `TableRowNumberCell`, and `getDisplayRowNumber()` from `src/utils/tableRowNumberUtils.js` — never inline `{index + 1}`. The `#` column is **never sortable** (rule 40).
   - **Card/grid mode:** `#N` badge via `RowNumberBadge` from `src/components/ui/RowNumberBadge.jsx`, using the **same** `getDisplayRowNumber(index, { page, pageSize })` values as the table view on that page.
   - Numbers reflect the **current visible order** (after search, sort, and pagination). For paginated lists, pass `{ page, pageSize }` into `getDisplayRowNumber()`.
   - Include `#` in list exports via `ExportListMenu` / `withExportRowNumbers()` (rule 38).
   - **Platform–Simulator parity applies** (rule 34.1). See `Documentation/Table_Row_Numbers_Guide.md`.

## Simulator Module Architecture Rules

The platform contains ONE unified application with TWO major domains that must be kept strictly separate:

### Domain Separation
1. **Platform (Project Management Application)**
   - Real projects, tasks, and schedules
   - Uses **Supabase `public` schema**
   - Uses **`platformDb` client** (legacy: `appDb` for backward compatibility)
   - UI routes start with: `/app/...`
   - Components in: `src/components/app/`
   - Modules in: `src/modules/platform/`

2. **Simulator (Project Management Simulator)**
   - Simulation scenarios, runs, and AI events
   - Uses **Supabase `sim` schema**
   - Uses **`simDb` client**
   - UI routes start with: `/simulator/...`
   - Components in: `src/components/sim/`
   - Modules in: `src/modules/sim/`

### Critical Rules for Simulator Development
- **NEVER mix Platform and Simulator components, modules, or database calls**
- **NEVER write simulation data to `public` schema**
- **NEVER write real project data to `sim` schema**
- Always use `simDb` for simulation operations
- Always use `platformDb` for real project operations
- Always place simulation logic in `modules/sim`
- Always generate RLS-enabled SQL for new sim tables

### Simulator Folder Structure
```
src/
  app/
    app/                    # Main Platform system routes
    simulator/              # Simulation system routes
  modules/
    core/                   # Shared logic (auth, subscriptions, roles)
    platform/               # Platform logic (public schema)
    sim/                    # Simulator logic (sim schema)
  services/
    supabase/
      supabaseClient.js     # Exports platformDb and simDb
  components/
    ui/                     # Shared UI components
    app/                    # Platform-specific components
    sim/                    # Simulator-specific components
```

### Supabase Client Configuration
```typescript
// platformDb — public schema (Platform)
export const platformDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'public' },
});

// Legacy export for backward compatibility
export const appDb = platformDb;

// simDb — sim schema (Simulator)
export const simDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'sim' },
});
```

### Simulator Database Tables (sim schema)
All simulation tables MUST live inside the `sim` schema:
- `sim.scenarios` - Pre-built and custom scenarios
- `sim.simulation_runs` - User simulation sessions
- `sim.module_scores` - Scoring per module
- `sim.user_progress` - Learning progress tracking
- `sim.ai_events` - Dynamic AI-generated events
- `sim.certificates` - Completion certificates
- `sim.leaderboards` - User rankings

### Simulator Routing Conventions
```
/simulator                    # Simulator dashboard
/simulator/scenarios          # Scenario library
/simulator/runs               # Active/completed runs
/simulator/modules            # Module-specific simulations
/simulator/custom-scenarios   # User-uploaded scenarios
/simulator/certificates       # User certificates
/simulator/leaderboard        # Rankings
```

### Monetization Integration
The SIM module integrates with existing PM monetization and must support:
- Free Tier (limited access)
- Premium subscriptions (monthly/yearly)
- Lifetime Access (one-time payment)
- Scenario Packs (industry-specific)
- Certificate sales
- Corporate licensing

## Database Table Registration Rule
Whenever a new database table is created in the system, you MUST register it in the database_tables table for the ID Generation Rules system:

1. Add an entry to the `database_tables` table with:
   - table_name: The actual table name (must be unique)
   - table_description: A clear, human-readable description of what the table stores
   - is_system_table: TRUE if it's a system/audit table, FALSE for application tables
   - is_active: TRUE by default

2. SQL Template for new table registration (add at the end of your table creation SQL file):
```sql
-- Register new table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('your_new_table_name', 'Clear description of what this table stores', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
```

3. Always include this INSERT statement at the end of any SQL file that creates new tables.

4. Examples:
   - Application table: `('customer_orders', 'Customer purchase orders and transaction history', false, true)`
   - System table: `('audit_trail', 'System-wide audit log for all table changes', true, true)`
- Make sure admin application is a separate application in       
the root E:\Hifo\AI Business and should be called 
project-nidus-admin. It should not be in the same application    
 folder the way you have shown on your plan. If this is clear    
 proceed.

## Registration Flow Revamp Conventions

### Organisation-First Registration
31. **Organisation Creation is Mandatory**: All users must create an organisation before accessing the platform. This is enforced at the database level (one email = one organisation).
32. **Organisation Verification Required**: Organisations must be verified via email before users can create projects. The verification link expires in 24 hours.
33. **Protected Routes Check**: All protected routes for Platform (`requiredPlatform === 'platform'`) must check for organisation existence and verification. Users without organisations are redirected to `/onboarding/organisation-setup`. Users with unverified organisations are redirected to `/onboarding/organisation-verification-notice`.
34. **Trial Eligibility**: Each organisation can only create ONE free trial project. This is enforced by the `check_trial_eligibility` database function. Subsequent projects must be paid subscriptions.

### Trial Management
35. **Trial Duration**: Free trials last 14 days from project creation date. This is tracked in the `trial_project_tracking` table.
36. **Trial Limitations**: Trial projects have a 5-member limit and access to basic features only. Advanced features are locked.
37. **Trial Expiry**: Expired trials are automatically locked (read-only). Users can upgrade at any time to unlock. All trial data is preserved during upgrade.
38. **Trial Automation**: The system runs daily cron jobs to check for expiring trials, send reminders (3 days, 1 day), and lock expired projects.

### Payment Integration (Paynow)
39. **Payment Gateway**: The system uses Paynow (not Stripe) for all payment processing. All payment-related code should reference Paynow.
40. **Payment Flow**: Payment initiation → Paynow redirect → Payment verification → Subscription creation → Project unlock.
41. **Webhook Processing**: Paynow webhooks are handled by Supabase Edge Functions. All webhooks must verify hash before processing.
42. **Payment Transactions**: All payments are logged in the `payment_transactions` table for audit and tracking.

### Service Conventions
43. **Organisation Service**: Use `organisationService.js` for all organisation-related operations (create, verify, get, check eligibility).
44. **Trial Service**: Use `trialService.js` for all trial-related operations (create trial project, get status, upgrade, lock expired).
45. **Subscription Plan Service**: Use `subscriptionPlanService.js` for plan retrieval and pricing calculations.
46. **Database Functions**: Use database functions for complex operations (e.g., `check_trial_eligibility`, `get_expiring_trials`) to ensure consistency and performance.

### Testing Conventions
47. **Unit Tests**: All new services must have unit tests in `src/services/__tests__/`.
48. **Integration Tests**: Integration tests for complete flows should be in `src/test/integration/`.
49. **Test Structure**: Use Vitest with React Testing Library. Mock Supabase client in test setup.
50. **Test Coverage**: Target 70%+ overall coverage, 100% for critical paths (registration, payment, trial expiry).

### Documentation Conventions
51. **User Guides**: All user-facing documentation goes in `Documentation/` folder (e.g., `Registration_Flow_User_Guide.md`).
52. **API Documentation**: Document all API endpoints, Edge Functions, and database functions.
53. **Setup Guides**: Create setup guides for external services (Paynow, email service, cron jobs).
54. **Deployment Documentation**: Always include deployment checklists and rollback procedures.