# v1358 — Organisation data export and deletion — PRD

**Status:** Draft for owner approval (interview completed 2026-11-27, decisions D1–D16).
**Origin:** v1352 background jobs, Slice 3 manual job M.5, moved to its own feature by owner decision 2026-11-27.
**Systems:** Platform and Planner edition (`public`) for requests; Admin (`E:\project-nidus-admin`) for approval,
legal hold and ownership transfer. Simulator excluded (D9, recorded rule 34.1 exception).

## a) Problem statement

An organisation that leaves Project Nidus, or wants a copy of everything it holds, has no way to get it. Today:

- **Per-person privacy exists, per-organisation does not.** v1108 lets each user export their own data or ask for
  it to be anonymised (Privacy Center; PMO Admin Data Management page; `gdpr_export_registry`). Nothing covers
  everything an organisation owns: projects, registers, documents, files, settings, billing records.
- **No organisation lifecycle.** `accounts` has only a soft-delete flag (`is_deleted`). There is no locked or
  closing state, no grace period, no legal hold. Only individual users can be suspended (Admin v09).
- **Deletion today would be by hand in SQL**, with no approval, no proof for the customer and no record of what
  was removed or kept.
- **Abandoned organisations are stuck.** Only the current owner can transfer ownership (`transferAccountOwnership`,
  v734). If the owner has left, nobody can request an export or deletion.
- v1352 Slice 3 added `organisation_data_footprint(account_id)`, a read-only list of an organisation’s tables and
  row counts, as the starting point.

Customers expect to take their data with them and to have it removed when they leave (privacy law, procurement
questionnaires, contract ends). Doing it by hand is slow and risky.

## b) Solution

1. **Export (self-service):** the Account Owner requests a full export in the app. A background job builds one ZIP
   (CSV + JSON per table, uploaded files, a read-me with a data dictionary). The owner is emailed when it is ready
   and downloads it in the app; it is deleted after 7 days.
2. **Deletion (approved and confirmed):** the Account Owner requests deletion (or Admin opens one on their behalf).
   One system admin approves with a reason; the Account Owner confirms by an email link. The organisation is then
   locked for 30 days with a final export made automatically; the owner or Admin can cancel. On day 30 a background
   job deletes the data permanently, keeping only our billing records, the audit and security logs (7 years) and a
   deletion record, and emails a deletion certificate.
3. **Admin tools:** a requests list, legal hold (blocks deletion), and ownership transfer when the owner has left.

## c) User stories

Export
1. As an Account Owner, I can request a full export of my organisation from the app (Platform and Planner).
2. As an Account Owner, my export starts at once, with no Admin approval.
3. As an Account Owner, I see my export requests with status (queued, building, ready, expired, failed).
4. As an Account Owner, I get an email when my export is ready; the email has no download link.
5. As an Account Owner, I download the ZIP from the app after signing in.
6. As an Account Owner, the ZIP has one CSV and one JSON file per table, the uploaded files in folders, and a read-me
   with a data dictionary of every table and column.
7. As an Account Owner, records show their display IDs where they exist, not only internal UUIDs.
8. As an Account Owner, my export is available for 7 days, then removed; I can request a new one at any time.
9. As a PMO Admin who is not the owner, I cannot request an organisation export.
10. As a system admin, every export request is logged and visible in Admin.

Deletion
11. As an Account Owner, I can request deletion of my organisation, with a reason.
12. As a system admin, I can open a deletion request on the customer’s behalf, with a reason.
13. As a system admin, I see deletion requests and can approve or reject each, with a reason.
14. As an Account Owner, after Admin approves, I get an email with a confirmation link.
15. As an Account Owner, the link is valid for 7 days; I get one reminder on day 5.
16. As an Account Owner, if I don’t confirm in 7 days the request lapses and nothing is locked or deleted.
17. As an Account Owner, when I confirm, the organisation is locked: members can no longer sign in to it.
18. As an Account Owner, a final export is made automatically at lock and I can download it during the 30 days.
19. As an Account Owner or system admin, I can cancel the deletion during the 30 days and everything returns as it
    was.
20. As an Account Owner, when the organisation locks, the paid subscription is cancelled and renewal reminders stop;
    no automatic refund.
21. As an Account Owner, if I cancel the deletion, I resubscribe as normal.
22. As an integration owner, the organisation’s API keys, SCIM tokens and webhooks stop working at lock and start
    again if the deletion is cancelled.
23. As the system, on day 30 all of the organisation’s data is permanently deleted, except what D6 keeps.
24. As the system, our own billing records (subscription payments to us) are kept for the tax period.
25. As the system, the organisation’s audit and security logs are kept 7 years, visible to system admins only, then
    removed by the retention job.
26. As the system, a deletion record is kept: organisation name, who asked, who approved, who confirmed, dates,
    tables and row counts deleted, what was kept and why.
27. As a member, my membership ends when the organisation is deleted.
28. As a member who belongs to no other organisation and has no Simulator learning record, my sign-in and profile are
    deleted too.
29. As a member who belongs to another organisation or has a Simulator record, I keep my account and other work, and
    I am emailed that the organisation was closed.
30. As an Account Owner (and the requester, if different), I receive an email with a PDF deletion certificate when the
    deletion finishes.
31. As a system admin, I see the deletion record and certificate in Admin afterwards.

Admin tools
32. As a system admin, I can place a legal hold on an organisation, with a reason.
33. As a system admin, while a hold is on, a deletion cannot be approved, and a lock already counting down does not
    delete on day 30 until the hold is lifted.
34. As a system admin, I can lift a legal hold, with a reason.
35. As a system admin, exports still work while a hold is on.
36. As a system admin, I can transfer ownership of an organisation to an existing PMO Admin of that organisation, with
    a reason; the old and new owner are emailed.
37. As a system admin, every action here (approve, reject, open on behalf, cancel, hold, lift, transfer) requires a
    reason and is audited.

## d) Implementation decisions (owner, 2026-11-27)

| # | Decision |
|---|---|
| D1 | The Account Owner requests in the app (Platform and Planner); a system admin approves before a deletion runs; Admin can also open a request on the customer’s behalf, with a reason. |
| D2 | An export runs at once, without Admin approval; it is logged and the owner is emailed when it is ready. Only deletion waits for approval. |
| D3 | Export = one ZIP: CSV + JSON per table, uploaded files in folders, a read-me with a data dictionary; display IDs where they exist. |
| D4 | Delivery: email without a link; download in the app after sign-in; private bucket; deleted after 7 days; a new export can be requested any time. |
| D5 | Deletion: 30-day lock after confirmation (members cannot sign in to the organisation); a final export is made automatically; the owner or Admin can cancel within 30 days; permanent deletion on day 30. |
| D6 | Kept after deletion: our own billing records (subscription payments to Nidus) for the tax period, the organisation’s audit and security logs, and a deletion record. Everything else is deleted, including the customer’s client invoices (v1353). |
| D7 | Kept audit and security logs stay as they are for 7 years, visible to system admins only, then removed by the v1352 retention job. |
| D8 | Members lose access; a member’s sign-in and profile are deleted only if they belong to no other organisation and have no Simulator learning record; others keep their account and are emailed. |
| D9 | Platform + Planner. Simulator stays per person through the existing v1108 Privacy Center (recorded rule 34.1 exception). |
| D10 | The subscription is cancelled at lock, no automatic refund (a refund is a separate Admin decision under the terms); if the deletion is cancelled, the customer resubscribes as normal. |
| D11 | One system admin approves (reason required); the Account Owner then confirms by an email link before the lock. |
| D12 | The confirmation link is valid 7 days, with one reminder on day 5; then the request lapses (nothing locked or deleted). |
| D13 | Legal hold: a system admin places / lifts it with a reason; it blocks approval and pauses day-30 deletion; exports still work. |
| D14 | Admin ownership transfer to an existing PMO Admin of the organisation, with a reason and audit; old and new owner emailed. |
| D15 | On completion, the Account Owner (and the requester, if different) receives an email with a PDF deletion certificate; the record stays in Admin. |
| D16 | Build order: (1) export, (2) Admin tools (requests list, legal hold, ownership transfer), (3) deletion. Each slice tested and checked by the owner before the next. |

Technical decisions that follow from the above (not separately asked):
- **Tables in scope** come from `organisation_data_footprint` (tables linked to the account directly or through its
  projects) plus Storage files referenced by those rows; a data-driven **kept list** (billing, audit, security, the
  deletion record) decides what deletion skips. A table not covered by either is reported, never silently skipped.
- **Background work goes through v1352 (rule 80):** `organisation.export_build` (handler; builds and uploads the ZIP),
  `organisation.deletion_lifecycle` (daily, UTC: confirmation reminders and expiry, day-30 deletion in dependency
  order, in batches, re-runnable), the existing `storage.cleanup` / a retention target for expired exports.
- **Lock state:** new organisation lifecycle columns (locked at, lock reason, deletion due at, legal hold) checked by
  the existing organisation route guard and by the API gateway, SCIM and webhook delivery (v1356); background jobs
  skip locked organisations.
- **Admin access** through audited `public.admin_*` SECURITY DEFINER RPCs, a new narrow exception documented in both
  CLAUDE.md files (rule 34.5); new Admin permissions for view / approve / hold / transfer.
- **Display IDs:** new request and deletion-record tables carry a reference column through Admin ID Generation
  (rule 16.2).

## e) Testing decisions

- **SQL tests** (one transaction, rolled back): footprint + kept list cover every organisation table; a deletion
  removes every in-scope row of a test organisation and leaves another organisation untouched; kept tables keep their
  rows; legal hold blocks approval and day-30 deletion; lapse after 7 days; cancel restores access; member rules
  (D8); lock blocks sign-in to the organisation, API keys, SCIM and webhooks.
- **Worker tests (Vitest):** ZIP contents (CSV + JSON per table, files, dictionary), display IDs, size streaming,
  failure recorded; certificate PDF contents.
- **Screen tests:** owner-only request buttons; status list; Admin approve / reject / hold / transfer require a reason.
- **Done** = each slice’s tests pass, the owner runs its SQL and checks in the browser: a real export downloaded and
  opened; a test organisation deleted end to end with a certificate received, and a second organisation unchanged.

## f) Out of scope

- Per-person export and anonymisation (already in v1108).
- Simulator organisation-level requests (D9).
- Automatic refunds (D10).
- Importing an export back into Nidus.
- Partial deletion (one project or module only) — project closure and archive already exist.
- Changing the retention periods of other logs (v1352 Housekeeping).

## g) Further notes

- Security: an export is a full copy of the organisation. Owner-only requests, sign-in to download, no link in email,
  7-day expiry and audit logging limit the damage of a stolen session; a stolen owner login could still export
  (accepted in D2).
- The 7-year keep period for audit logs (D7) matches the audit-log retention recommendation in v1352; legal should
  confirm the tax-period length for billing records.
- Large organisations: the export is streamed per table to Storage so it does not hit edge function memory limits
  (lesson from the v1352 `ai.embed` 546 errors); if one run cannot finish, it continues from where it stopped.
- Example text follows rule 77.
