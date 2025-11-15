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
19. All documentation files (*.md) should be created under the Documentation folder and folder should be created on the root if it doesn't exist
20. Always push the code to the github after a major change has been done to the codebase or every 3 days, whichever comes first.
21. I will be creating a massive documentaion of this system and therefore do not override any planning files all planning files should be placed in in root folder "projectplan". Always document in a separate file for any changes you make and and guides for documentation for each topic or functionality/feature.
22. I will be creating a blog for the application features, hence you should always document any change by using a separate file where applicable.
23. For each new feature/functionality, always create unit tests for automated testing purposes
24. Make sure to have a distinct and separate folder strutures for a) Frontend and b) Backend. If they do not exist, created them and be updating/creating project files by following this folder structure religiously for easy future maintainability of the application. Any future updates to any functionality should not have a side effect of affecting any working functionality.
25. All data should be fetched from the DB tables and do not use mock or dummy data until I have confirmed the same.
26. For all features that amy require to upload bulk data from other existing project management tools or data, create a feature for both a) Single record capture and b) Bulk record upload/capture with all CRUD and user confirmation flows and where applicable, user the multi-step flows.
26. When creating new and named components/folders always avoid Copyright/Trademark names for compliance with international laws and avoiding lawsuits.

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