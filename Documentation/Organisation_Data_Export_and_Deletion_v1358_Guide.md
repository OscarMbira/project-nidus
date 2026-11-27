# Organisation data export and deletion (v1358)

**PRD:** `projectprd/v1358_organisation_data_export_and_deletion_PRD.md` · **Plan:** `projectplan/v1358_organisation_data_export_and_deletion_plan.md`
**Status:** Export (slice 1), Admin tools (slice 2) and the deletion request up to the 30-day lock (slice 3a) built. The day-30 deletion and certificate (slice 3b) follow.

## For the Account Owner

1. Open **Account › Data export** (Platform) or **Settings › Data export** (Project Planner).
2. Select **Request export**. Only the Account Owner sees this button. Only one export can be in progress at a time.
3. The export is prepared in the background. You get a notice in the app and an email when it is ready. The email has no link.
4. Come back to **Data export** and select **ZIP**. A large organisation gets several parts, **Part 1**, **Part 2**, and so on; download all of them.
5. The files are removed after 7 days. You can request a new export at any time.

### What is in the ZIP

| Item | What it is |
|---|---|
| `README.txt` | What the export contains, the tables and their row counts |
| `dictionary.csv` | Every table and column, with its type, whether it is required, and its description |
| `data/<table>.csv` | One file per table, with a header row. It opens in a spreadsheet. |
| `data/<table>.json` | The same records as JSON, for loading into another system |
| `files/<bucket>/…` | Files people uploaded, such as risk attachments and change-log files |
| `files-not-included.csv` | Only when some files could not be copied: each file and the reason |

- **References:** records carry their reference ID where they have one, for example `RSK-012`. They also carry an internal `id` that links records across tables.
- **Large tables:** these are split into numbered files, for example `risks.part-1.csv`.
- **Secrets are never exported:** passwords, keys, tokens, and any column whose name contains hash, secret, token, password, encrypted or salt.
- **People:** the `users` file lists the owner and everyone with a project role. It includes only name, email, job title, whether the account is active, and when it was created.
- **Large files:** any single file over 45 MB is listed in `files-not-included.csv`. You can still download it in the app.
- **Spreadsheet safety:** in the CSV files, text that starts with `=`, `+`, `-` or `@` begins with an apostrophe, so a spreadsheet does not run it as a formula.

### Deleting the organisation

1. On **Data export & deletion**, select **Request deletion**, give a reason and send it. Our support team reviews it.
2. After approval you get an email with a **Confirm the deletion** link (valid 7 days; one reminder with a new link on day 5). Open it while signed in as the Account Owner. If you do nothing, the request lapses and nothing changes.
3. When you confirm, the organisation is **locked for 30 days**:
   - members are signed out and cannot use it (they are told by email; their own accounts and other organisations are not affected);
   - API keys, webhooks and SCIM are switched off, and the subscription is cancelled (no automatic refund);
   - a final export is prepared for you on the same page.
4. You can **Cancel deletion** at any time before the 30 days end. The organisation is unlocked and integrations come back on; choose a plan again under Subscription.
5. On day 30 the data is deleted permanently (slice 3b).

## For system admins (Admin app)

- **Users & Organisations › Organisation Data Requests:** every organisation’s export requests (reference, status, size, who asked) and the organisations on legal hold. Select a reference or an organisation to open it.
- **Organisation detail › Data & compliance:**
  - **Legal hold.** Select **Place hold** or **Lift hold** and give a reason. While an organisation is on hold it cannot be deleted; exports still work. The organisation is not told.
  - **Transfer ownership.** Use this when the Account Owner has left. Choose one of the organisation’s PMO Admins and give a reason. The new owner gets the Account Owner role, billing delegates are removed, and both the old and the new owner are emailed.
  - The organisation’s own export requests.
- **Deletion requests** (Organisation detail › Data & compliance): **Open deletion request** when a customer asked support; **Approve** (refused while on legal hold) or **Reject** (the owner sees your reason); **Cancel** before day 30. Approval only sends the owner a confirmation link; nothing is locked until they confirm.
- Every hold, transfer and deletion decision is recorded in the Admin audit log. Permissions: `organisations.data.view`, `.hold` and `.transfer` (super admin and system admin).

## How it works

- **What is in scope:** `public.organisation_data_scope()` finds every table that holds the organisation's data:
  - tables with an `account_id`, `organisation_id` or `project_id` column;
  - tables linked to those by a foreign key, up to three levels;
  - tables added by a rule in `public.organisation_data_table_rules`.

  `users` is never followed as a parent, because people belong to several organisations.
- **Rules:** `public.organisation_data_table_rules` holds the per-table rules. It controls:
  - whether a table is left out of the export (internal job tables are);
  - which columns a table may export (people);
  - which tables are kept after a deletion (slice 3: our billing records, audit and security logs).
- **Background jobs** (rule 80):
  - `organisation.export_build` builds ZIP parts of about 40 MB. It saves a checkpoint after each part, and continues in a new run when its time budget is used.
  - `organisation.export_expire` runs daily at 02:30 UTC. It removes files after 7 days, and fails any build that has made no progress for 24 hours; the owner is told.
- **Storage:** files go to the private bucket `organisation-exports` at `<account id>/<request id>/…`. Only the Account Owner can read them, and only while the export is ready and not expired. Downloads use a link that is valid for 5 minutes.

## Owner run order (slice 1)

1. Redeploy `background-job-worker` with `--no-verify-jwt`. It has the new handlers, and its adapter can now download and upload files.
2. Run `SQL/v1600_organisation_data_export.sql`.
3. Run Admin `SQL/v264_organisation_data_requests_id_generation_seed.sql`, so requests get references like ODR-001.
4. Run `SQL/v1251_planner_table_wall.sql` again.
5. Run `SQL/v1601_organisation_data_export_tests.sql`. It rolls back. Expect "v1601: all organisation export tests passed (rolling back)".
6. **Browser check:** sign in as an Account Owner and open **Account › Data export**. Request an export and wait for the email (Run now on `organisation.export_build` in Admin is not needed; the request queues it). Then download the ZIP and open `README.txt`, `dictionary.csv` and one CSV file in a spreadsheet.
