# Information Technology — Architecture Reviews Register

Guide to the registers under **Information Technology → Architecture**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Architecture Reviews

One record per **architecture review (one board or design authority sitting)**. Statuses: Requested · Scheduled · In Progress · Held – Actions Open · Complete · Cancelled.

| Tab | Fields |
|---|---|
| Details | Review Reference, Review Type, Review Body, Architecture Domains, Delivery Stage, Review Date, Chair, Presenter |
| Scope & Artefacts | Scope of the Review, Questions for the Board, **Artefacts Reviewed** table (Artefact, Version, Reference), **Related Decisions** table (Reference, Decision) |
| Participants | **Participants** table (Name, Role, Attendance ▾), Quorum Met |
| Assessment | **Compliance Checks** table (Principle / Standard, Result ▾, Comment), Strategic Fit (1 = poor, 5 = strong), Standards Compliance (1 = poor, 5 = strong), Security (1 = poor, 5 = strong), Resilience & Performance (1 = poor, 5 = strong), Supportability (1 = poor, 5 = strong), Architecture Score *calculated* |
| Findings & Actions | **Findings** table (Finding, Severity ▾, Domain), **Actions** table (Action, Owner, Due Date, Status ▾), **Risks Raised** table (Risk, Rating ▾, Mitigation) |
| Outcome | Outcome, Conditions, **Waivers / Dispensations** table (Standard, Reason, Expiry Date, Approved By), Decision By, Minutes Reference, Next Review Date |
| Notes | Notes |

## SQL

1. `SQL/v1409_ict_architecture_reviews_fields.sql` adds the fields, tabs and status workflow.
2. `SQL/v1410_ict_architecture_reviews_seed_values.sql` fills the 10 Architecture Reviews records seeded by v1374 for SEED334-PRJ-08 (fictional Northbridge Bank core banking replacement) with review details, participants, ratings, findings, actions and outcomes. Dated around today (11 Nov 2026): six reviews are held, one is in progress today, two are scheduled and the go-live sign-off review is requested. Only records whose values are still empty are filled, so edits made since are kept. The final query counts records with values.
