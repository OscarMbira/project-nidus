# v1261 — Shared Platform demo

Status: DRAFT — decision interview complete (2026-10-12). Awaiting approval before an implementation plan is written.

This is the first release of demo access. The broader briefing in [Demo_and_Trial_Access_PRD_for_Claude_Cursor.md](Demo_and_Trial_Access_PRD_for_Claude_Cursor.md) stays as background. Where it is wider than this document, this document wins for the first release.

## a) Problem statement

A buyer needs to see a populated project before they subscribe. An empty trial makes them enter data before they can judge the product. The Simulator is for learning and practice, and a buyer who lands there will treat the training tool as the product for sale.

There is no controlled way to open the real Platform on fictional data, let two people try it, and put the data back afterwards. Sales also needs to show that email works, without the public demo sending mail to addresses a visitor types.

## b) Solution

One sample organisation on the real Platform, in the same codebase and the same database, protected by the same row-level security as any other organisation. It holds one fictional project and four members: Project Manager, PMO, Team Leader, and Team Member. Each member has the same permissions that role already has on a live project.

A visitor requests access with an email address on the brand site and receives a link that lasts 24 hours from the time it is sent. The link opens a role choice. The visitor can edit the sample project. Two public visitors may be in the project at the same time. A third is told the demo is in use. The project is reset overnight to the approved sample.

The public session does not send email. The screen shows the message that would have been sent, and tells the visitor that the demo cannot send email unless they are on a full app subscription. The record they were saving is still saved.

Sales uses a presenter sign-in that is not on the public form. It does not count toward the two visitors. The presenter can switch among the four roles and can send the prepared email only to a Nidus demo inbox.

## c) User stories

Request and entry

1. As a visitor on the brand site, I can enter an email address and ask for a demo.
2. As a visitor, I receive a link that signs me into the sample organisation. The link stops working 24 hours after it was sent.
3. As a visitor opening a valid link, I choose one role: Project Manager, PMO, Team Leader, or Team Member.
4. As a visitor, I see only the sample project, and I see that the data is sample data.
5. As a visitor, the role I chose can do what that same role can do on a live project, including editing the sample.
6. As a third visitor while two public visitors are already in the demo, I am told the demo is in use and I can ask again later.
7. As a visitor who signs out, or who leaves the demo idle, my slot frees so someone else can enter. The link itself still expires 24 hours after it was sent.
8. As a visitor using an expired link, I cannot enter, and I can ask for a new link.

Working in the sample

9. As the Project Manager, I can edit the plan and decide the sample item that is waiting for approval.
10. As the PMO, I see the oversight view of that same project.
11. As the Team Leader, I can manage the team’s work on that project.
12. As the Team Member, I can see and update the work assigned to that member.
13. As any of the four roles, I cannot open another organisation, Admin, or billing.
14. As any of the four roles, I cannot invite another person into the demo.

Email

15. As a public visitor, when I take an action that would send an email, the record is saved and no email is sent.
16. As a public visitor, I then see who the email would have gone to, the subject, and the body, with the message that this demo cannot send email unless I am on a full app subscription.

Sales presenter

17. As a salesperson, I sign in with the presenter sign-in, which is not offered on the public form.
18. As a salesperson, I can start a call even when both public visitor slots are in use.
19. As a salesperson, I can switch among Project Manager, PMO, Team Leader, and Team Member during the call.
20. As a salesperson, I can send the prepared email only to the Nidus demo inbox, and I can open that inbox and show the message arriving.
21. As a salesperson, I cannot send the demo email to an address a visitor typed.

Reset

22. As the next day’s visitor, I find the sample project restored, including the four roles’ data, with the previous day’s edits gone.
23. As a visitor or presenter in the project when the reset runs, my session ends and I must use a still-valid link, or the presenter sign-in, to come back to the restored project.

Isolation

24. As a demo user, I cannot read or change any customer organisation.
25. As a customer, I never see the sample organisation’s data.
26. A reset of the sample project does not change Simulator scenarios or any customer or trial organisation.

## d) Implementation decisions

1. **Same product.** The demo is an organisation on the Platform. It is not a new app, not a fork, and not the Simulator.
2. **One project.** The organisation contains one fictional project. No second project and no industry catalogue in this release.
3. **Four roles, live permissions.** Membership uses the existing role-library entries for Project Manager, PMO, Team Leader, and Team Member. Do not create demo-only permissions. The plan must map these names to the roles that already exist. If a display name differs, keep the existing role.
4. **Public entry.** The brand site (`apps/site`) collects an email and sends one link. The link lasts 24 hours from send. Opening it shows the role choice. There is no shared password on the website.
5. **Two public visitors.** At most two public sessions may use the sample project at once. A third request is refused with a message to ask again later. A slot frees on sign-out or after 30 minutes without activity. The presenter does not occupy either slot.
6. **Editing is real.** Public visitors may create, update, and decide sample records their role allows. The overnight reset is what puts the approved sample back. The reset is idempotent and may also be run on demand by an operator.
7. **Public mail is blocked.** No invitation, approval, or other product email leaves the sample organisation for a public session. The screen shows the prepared message (recipients, subject, body) and the text: “This demo cannot send email. Email is sent when you are on a full app subscription.” Saving the underlying record still succeeds.
8. **Presenter.** The presenter sign-in is issued to sales, not by the public form. The presenter may switch among the four roles and may deliver the prepared email only to the Nidus demo inbox. Delivery to any other address is refused.
9. **Sample data only.** The seed is fictional. Customer data is never copied into this organisation. Display identifiers follow Admin ID generation (blank reference on insert). The seed is idempotent and safe to re-run.
10. **Isolation.** Demo membership does not grant access to any other organisation. Customer membership does not grant access to the sample organisation. Admin screens are not available to the four demo roles or to a public session.
11. **Reset scope.** The overnight job restores the sample project and the demo organisation’s sample rows. It does not touch `sim` data, customer organisations, or trial organisations.
12. **Banner.** Every page in a public or presenter session on this organisation states that the data is sample data and is reset overnight.

## e) Testing decisions

Seams to test at

- **Link lifetime (unit).** A link works at 23 hours and fails at 24 hours and 1 minute. An expired link does not create a session.
- **Concurrency (integration).** Two public sessions are allowed. The third is refused. Sign-out frees a slot. No activity for 30 minutes frees a slot. A presenter session is allowed while both public slots are full.
- **Role permissions (integration).** Each of the four users can do what that role can do on a live project, and cannot do what that role cannot do. No demo-only grant exists.
- **Mail (integration).** A public session saves the record and sends nothing. The response includes the prepared recipients, subject, and body. A presenter session sends only to the configured demo inbox and is refused for any other address.
- **Reset (integration).** After a visitor edits the project, the reset restores the seeded row count and the seeded field values. A customer organisation and a Simulator row are unchanged.
- **Isolation (integration).** A demo user querying another organisation’s project receives nothing. A customer user querying the sample project receives nothing.

Done means

- Stories 1–26 each have at least one automated test at the seam above.
- The Platform retest suite passes (rule 43).
- A reset run twice in a row leaves the sample identical to the approved seed.

## f) Out of scope

- A private proof-of-value organisation for one prospect.
- The 14-day trial, trial conversion, and trial expiry. Those stay as they are.
- A Planning-only demo or a Planning sandbox.
- A catalogue of industries or more than one sample project.
- The Simulator. Practice scenarios are not the sales demo, and this reset must not change them.
- Admin screens for the public visitor. An operator may run the reset. That is not a demo feature.
- Public visitors inviting colleagues, changing billing, or emailing any address.
- Self-serve signup that creates a new organisation. The public form only requests a link to this sample organisation.

## g) Further notes

- The next pass writes `projectplan/v1261_shared_platform_demo_plan.md` and stops for approval before code or SQL. Follow `projectplan/App_Guide.md`.
- The plan should slice the work in this order: sample organisation and seed, 24-hour link and role choice, two-visitor cap, public email preview with send blocked, presenter sign-in and demo-inbox delivery, overnight reset and isolation tests.
- Brand-site copy and the request form are data-driven where the site already loads from the database (v1241). Do not hard-code a second product list.
- Trademark rule: no third-party product names in component or role names (rules 26 and 27).
- Related background only: [Demo_and_Trial_Access_PRD_for_Claude_Cursor.md](Demo_and_Trial_Access_PRD_for_Claude_Cursor.md), [v1200_project_planner_standalone_PRD.md](v1200_project_planner_standalone_PRD.md), [v1239_dual_mode_planning_product_PRD.md](v1239_dual_mode_planning_product_PRD.md), [v1241_nidus_brand_site_PRD.md](v1241_nidus_brand_site_PRD.md).
