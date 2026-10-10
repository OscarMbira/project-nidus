# v1200 — Project Planner (standalone product, shared data)

Status: DRAFT — decision interview complete. Awaiting approval before an implementation plan is written.

## a) Problem statement

Individuals and small teams who plan projects but do not use the full Platform need a focused
planner they can subscribe to. Today the only way in is the full Platform, which carries menus,
governance and industry features they do not need. The planner must work on the same project data
as Platform, so nothing is re-keyed when a user upgrades.

## b) Solution (high level)

A second product, Project Planner, delivered as its own app on the shared core package and the
shared database. Planner users sign up through the Planner front door, subscribe to a Planner
entitlement, and manage projects through the planner's own invitation flow. Platform invitations do
not create or invite Planner accounts. Upgrading a Planner account to Platform keeps every project in
place and changes only the entitlement.

## c) User stories

Sign-up and trial
1. As a new visitor, I can sign up with an email address and start a 14-day trial without entering a card.
2. As a trial user, I see the number of days left in my trial in the header.
3. As a trial user whose trial has ended, I can still open and read my projects, but I cannot create or edit anything.
4. As a trial or read-only user, I can choose a plan and convert to paid without losing any data.

First use
5. As a new user with no projects, I see a "Create your first project" prompt instead of an empty grid.
6. As a user, I can create a project with a name, start date and end date.
7. As a user, I can add, edit and delete tasks with a name, start date, end date and duration.
8. As a user, I can link a task to one or more predecessor tasks (finish-to-start), and the timeline shows the link.
9. As a user, I can view the tasks on a simple timeline and in a table, and switch between them.
10. As a user, I can enter timesheet hours against a task for a given day.
11. As a user, I can compare planned work for a week with the timesheet hours logged against it.

Invitations (planner's own flow)
12. As a project manager in Planner, I can invite a person to a project by email. Their invitation is sent by the planner and accepted in the planner.
13. As an invited Planner user, I can accept the invitation and see the project in my list.
14. As a project manager, I can remove a member from a project, and that member loses access to it.
15. A Platform invitation never creates or changes a Planner account.

Menus and access
16. As a Planner user, I see only the menu items on the Planner allow-list.
17. As a Planner user, I cannot reach a Platform-only page by typing its address; the page redirects to the Planner home.
18. As an operator, I can change the allow-list in the database without a code deploy.

Upgrade and downgrade
19. As a Planner user, I can upgrade to Platform, and every project, task, timesheet and membership is still there afterwards.
20. As a Platform user who downgrades to Planner, I see a warning listing what I will lose access to, and I keep all data.
21. After an upgrade, Platform menus appear on my next sign-in, without re-entering any data.

Standards that apply (inherited, not restated here)
- Theme-aware UI, icon-only row actions, sortable headers, row numbers, back buttons, PWA (CLAUDE.md rules 28.1, 61, 40, 44, 73, 39).
- Create and edit forms are routed pages with unsaved-changes guard (rules 65, 52).
- Exports and bulk templates follow rules 38 and 71.

## d) Implementation decisions (settled)

1. One database and one account/project model, shared with Platform. No separate database.
2. Products differ by entitlement on the account, not by separate data. Each app shows only the menus and features its entitlement allows.
3. Access control is enforced by row-level security in the database, not by the app.
4. Planner invitations use the planner's own project invitation flow, run by PMO or the project manager. Platform's invite flow does not create or invite Planner accounts.
5. Upgrading Planner to Platform keeps all projects in place (entitlement change only).
6. Sign-up is open to anyone with an email address. Each user gets one free trial, which converts to a single per-user monthly plan on the same entitlement, so trial data carries over.
7. First sign-in shows an empty "Create your first project" prompt. The minimum feature set is a task list with dates and dependencies, a simple timeline, and timesheet entry with the work-plan comparison. PMO, governance, procurement and industry packs are excluded and stay in Platform.
8. Planner shows only menu items on an allow-list tied to the Planner entitlement. Anything not on the list stays hidden, so new Platform features stay out of Planner by default. The list lives in the database (rule 25.1), so changing it needs no code deploy.
9. Pricing is a single per-user monthly price, with an annual option at about two months free. The free trial lasts 14 days from sign-up, needs no card, and converts only when the user chooses. When a trial ends, the account becomes read-only, not deleted (CLAUDE.md rules 35–37).
10. Upgrade changes only the account entitlement from Planner to Platform. Projects, tasks, timesheets and memberships stay in place, and Platform menus appear on the next sign-in. Downgrade hides Platform-only menus and keeps all data, with a warning before the change.

## e) Testing decisions

Seams to test at
- **Entitlement gate (unit):** a function that, given an entitlement and a menu item, returns visible or hidden. Covers every allow-list entry and every excluded item.
- **Allow-list (integration, against the database):** Planner sessions cannot read or write Platform-only menu rows. RLS blocks direct queries, not only the UI (rule 42).
- **Trial state (unit):** trial days remaining, read-only transition at day 14, and conversion keeping the same account and project IDs.
- **Upgrade and downgrade (integration):** the project count, task count, timesheet count and membership count are identical before and after each change.
- **Invitations (integration):** a Platform invite does not create a Planner account; a Planner invite creates membership only inside Planner.
- **Routes (end-to-end smoke):** each allowed route renders; each excluded route redirects to the Planner home.

Done means
- All user stories 1–21 have at least one passing automated test at the seam above.
- The retest suite passes in both apps after each slice (rule 43).
- Upgrade and downgrade leave data counts unchanged in a seeded test account (rule 18.2 seeds).

## f) Out of scope

- Cross-product invitations (a Platform user inviting a Planner-only user, or the reverse).
- Migrating data between separate databases.
- Desktop or offline clients.
- Resource levelling, critical path analysis and baselines (MS Project-style scheduling depth).
- Industry packs, PMO governance, procurement and reporting packs.
- Payment provider integration details (covered in the billing PRD, not this one).

## g) Further notes

- Trademark rule (CLAUDE.md rules 26–27): no third-party product names in product or component names.
- Related: v918 (SaaS tenant provisioning), v982 (SaaS user journey), v1062 (regional settings).
- Decision 6 and decision 9 together set the trial and pricing rules; if pricing changes, update both the PRD and the billing configuration.
