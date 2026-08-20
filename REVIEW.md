# Project Nidus — REVIEW.md

> **Location:** Repository root
>
> **Role:** Independent verification and release-quality review standard.
>
> This document intentionally does **not** duplicate the detailed engineering rules in `CLAUDE.md`.
> It tells the reviewer **what evidence to verify after a change**.
>
> If this document conflicts with `CLAUDE.md`, `CLAUDE.md` wins.

---

## 1. Purpose

`REVIEW.md` provides a repeatable review gate for completed changes.

It is used to determine whether a change:

- satisfies its approved requirement
- follows the repository rules in `CLAUDE.md`
- preserves security and data integrity
- avoids regressions
- remains consistent with Project Nidus architecture
- has adequate tests/evidence
- can safely be accepted or released

It does **not** replace:

- the review section required in each implementation plan
- the user's approval of implementation plans
- automated tests
- security/RLS tests
- a feature PRD
- the engineering rules in `CLAUDE.md`

Instead, the result of this review should be summarised inside the relevant implementation plan's final review section.

---

## 2. Review Inputs

For a normal feature/change review, inspect:

1. `CLAUDE.md`
2. the approved feature PRD, when one exists
3. the approved implementation plan, when one exists
4. the changed files
5. directly related unchanged files/dependencies
6. relevant SQL/migrations
7. relevant RLS/policies/functions/triggers
8. relevant tests
9. relevant Platform/Simulator/Admin equivalents
10. the relevant roadmap area in `ROADMAP.md`

Do not approve a change from a diff alone when surrounding context is necessary to establish safety.

---

## 3. Review Modes

### QUICK

Use for genuinely small, low-risk changes.

Minimum evidence:

- requirement matched
- no obvious regression
- applicable `CLAUDE.md` rules followed
- targeted validation/tests performed

### STANDARD

Default for normal feature work.

Review:

- functionality
- architecture
- data
- security/access
- UX
- tests
- regression blast radius
- documentation/plan completion

### DEEP

Required for changes involving, at minimum:

- authentication
- authorization
- RLS
- tenant/organisation/project isolation
- SQL migrations affecting existing data
- database functions/triggers
- Admin-to-Platform/Simulator cross-schema exceptions
- payment/subscription/trial logic
- financial calculations
- scheduling/baseline calculations
- audit/governance lifecycle
- bulk updates/imports
- destructive operations
- major shared-package changes
- Module Federation architecture
- critical integrations

### RELEASE

Use before production release.

Adds:

- broader automated regression suite
- migration sequencing/readiness
- deployment configuration
- rollback/recovery readiness
- critical E2E journeys
- known-risk acceptance
- operational/observability checks

---

## 4. Severity Model

### CRITICAL

Examples:

- cross-tenant data access
- authentication/authorization bypass
- service secret exposure
- destructive production-data loss/corruption
- payment integrity failure
- unrecoverable audit/history loss

**Result:** BLOCK

### HIGH

Examples:

- broken core workflow
- unsafe migration
- incorrect governed status/approval behaviour
- major regression
- materially incorrect dashboard/financial/schedule result
- required Platform/Simulator/Admin parity omitted without justification
- required access control absent

**Result:** BLOCK unless the owner explicitly accepts the risk.

### MEDIUM

Examples:

- edge-case defect
- missing validation
- insufficient test coverage
- accessibility issue
- inconsistent UX
- maintainability issue
- incomplete non-critical error state

**Result:** FIX or explicitly accept.

### LOW

Examples:

- naming clarity
- minor documentation improvement
- non-blocking cosmetic issue
- small refactor opportunity

**Result:** May follow later.

---

## 5. Final Review Decisions

Use only:

### PASS

No unresolved Critical/High findings and required verification is satisfactory.

### PASS WITH CONDITIONS

No unresolved Critical findings. Remaining findings or unverified areas are explicitly recorded, accepted, and have a clear follow-up.

### BLOCK

One or more Critical/High findings exist, required validation is missing, or safety/correctness cannot be established.

---

## 6. Mandatory Review Summary

Use this structure for substantial reviews:

```md
## Review Summary

- Change:
- PRD:
- Implementation plan:
- Roadmap area:
- Review mode:
- Decision: PASS | PASS WITH CONDITIONS | BLOCK
- Highest severity:
- Regression risk: LOW | MEDIUM | HIGH
- Database impact: NONE | LOW | MEDIUM | HIGH
- Security impact: NONE | LOW | MEDIUM | HIGH

## Findings

### [SEVERITY] Finding title
- Evidence:
- Problem:
- Impact:
- Recommended action:
- Validation required:

## Validation Evidence
- Type/lint:
- Unit:
- Integration:
- SQL/RLS:
- E2E:
- Build:
- Manual:

## Not Verified
- ...

## Remaining Risks
- ...

## Final Decision
...
```

Do not claim a validation step passed if it was not actually run.

---

## 7. Requirement & Scope Gate

Verify:

- [ ] the implementation matches the approved PRD/current user instruction
- [ ] all in-scope user stories/acceptance criteria are addressed
- [ ] out-of-scope items were not introduced as side effects
- [ ] assumptions were documented rather than silently invented
- [ ] no unrelated refactor was mixed into the change
- [ ] the approved implementation plan was followed or deviations are explained

If a significant unapproved scope change occurred, normally `BLOCK` and return it to planning.

---

## 8. CLAUDE.md Compliance Gate

Do not reproduce the detailed rules here. Instead verify the applicable rules in `CLAUDE.md`, including where relevant:

- repository/file placement
- PRD/plan workflow
- SQL sequencing
- schema ownership
- database table registration
- Admin ID generation
- Platform/Simulator/Admin parity
- shared-package usage
- Module Federation registration
- route/build conventions
- no hardcoding/fallback data
- theme awareness
- PWA/mobile behaviour
- success confirmation
- display IDs
- hold/draft capability
- export capability
- sorting/view toggle/row numbers
- unsaved-changes guard
- approval justification/field locking
- audit tabs
- clickable dashboard summary behaviour
- RLS restrictions
- retest requirements

Record only failures, exceptions, and evidence. Do not rewrite the rules into the review report.

---

## 9. Architecture & Reuse Gate

Verify:

- [ ] existing components/services/hooks/utilities were searched before new ones were created
- [ ] shared behaviour uses the correct shared package or established local pattern
- [ ] no prohibited cross-domain import was introduced
- [ ] Platform/Simulator/Admin boundaries remain intact
- [ ] Module Federation boundaries remain intact
- [ ] new module registration is complete when applicable
- [ ] no duplicate architecture was introduced
- [ ] the change makes the codebase no harder to navigate than before

Ask:

> Could this capability have reused or deepened an existing module rather than creating a parallel implementation?

---

## 10. Data & Database Gate

For changes that touch persistence, verify:

- [ ] the correct schema is used
- [ ] database changes are versioned and placed according to `CLAUDE.md`
- [ ] migration works with existing data
- [ ] constraints/foreign keys/defaults are deliberate
- [ ] indexes are appropriate for significant query paths
- [ ] destructive operations are explicit and recoverable
- [ ] data backfill is defined where needed
- [ ] table registration/ID generation requirements are satisfied where applicable
- [ ] seed/demo behaviour follows the approved rules
- [ ] no silent fallback/static replacement was introduced

For destructive or high-impact migrations, require a rollback/recovery approach before approval.

---

## 11. Security, RLS & Tenant-Isolation Gate

For every affected data-access path, verify as applicable:

- [ ] authentication is enforced
- [ ] organisation/project membership is enforced
- [ ] role/permission checks occur at an authoritative layer
- [ ] RLS remains enabled
- [ ] SELECT behaviour is tenant-safe
- [ ] INSERT behaviour is tenant-safe
- [ ] UPDATE behaviour is tenant-safe
- [ ] DELETE behaviour is tenant-safe
- [ ] `WITH CHECK` behaviour is correct where applicable
- [ ] joins/subqueries cannot leak another tenant's records
- [ ] Edge Functions validate identity/context
- [ ] storage access is correctly scoped
- [ ] service-role use is narrow and justified
- [ ] secrets are not exposed in client code, logs, or errors

Where practical, test adversarially:

- Tenant A reading Tenant B record
- Tenant A updating Tenant B record
- Tenant A deleting Tenant B record
- forged organisation/project ID
- forged role/permission input
- direct endpoint/RPC invocation outside the intended UI

Any verified cross-tenant access is `CRITICAL`.

---

## 12. PMIS Business-Integrity Gate

Review the actual project-management meaning of the change, not only CRUD behaviour.

Where relevant verify:

### Planning / Scheduling
- hierarchy remains valid
- dependencies remain valid
- date semantics are correct
- baseline/current/scenario values are not confused
- status/progress rollups are coherent

### RAID / Decisions / Actions / Change
- ownership and status transitions are valid
- approvals are controlled
- closure/escalation behaviour is coherent
- linked records remain traceable

### Cost / Resource
- calculation definitions are correct
- currency/precision is appropriate
- rollups reconcile
- sensitive information remains protected

### Testing / Quality / Requirements
- traceability links remain correct
- test evidence/history is preserved
- defects link to the correct artefacts
- acceptance status cannot be falsely inferred

### Dashboards / Reporting
- metric definition is clear
- aggregate value reconciles to underlying records
- filters are consistent
- drill-through targets the correct subset where applicable

---

## 13. UX, Accessibility & SaaS Simplicity Gate

Verify:

- [ ] workflow remains understandable without excessive training
- [ ] labels/actions are clear
- [ ] loading, empty, success, and failure states are handled
- [ ] destructive actions are deliberate
- [ ] light/dark behaviour is usable where applicable
- [ ] keyboard/focus/accessibility behaviour is reasonable
- [ ] mobile/PWA layout remains usable
- [ ] long content does not break layouts
- [ ] role-based UI does not misleadingly expose forbidden actions

A technically correct feature can still fail review if its workflow is unnecessarily confusing.

---

## 14. Regression Blast-Radius Gate

Identify what else consumes the changed capability.

Check:

- shared packages
- shared components
- services/hooks
- schemas/tables/functions
- RLS
- Platform equivalent
- Simulator equivalent
- Admin equivalent
- dashboards
- exports
- menus/routes
- audit surfaces
- notifications/integrations
- tests
- mobile/PWA behaviour

Document both:

1. areas actively retested
2. areas potentially affected but not verified

---

## 15. Test Evidence Gate

Relevant tests should prove behaviour, not merely execute code.

Check as applicable:

- unit tests
- integration tests
- SQL/RLS tests
- Playwright/E2E
- build
- manual role-based verification

For bug fixes:

- [ ] add a regression test where practical
- [ ] confirm the test would catch recurrence
- [ ] run the required retest suite from `CLAUDE.md`

Preferred evidence format:

```text
Type/Lint: PASS
Unit: 184 passed / 0 failed
Integration: 32 passed / 0 failed
RLS: 27 passed / 0 failed
E2E: 18 passed / 0 failed
Build: PASS
Manual: Verified Admin and Project Manager paths
```

If not run:

```text
E2E: NOT RUN — test environment unavailable
Risk: Critical workflow not fully validated end-to-end
```

Never convert `NOT RUN` into `PASS`.

---

## 16. AI-Generated Code Review Gate

Actively look for common AI-assisted coding failures:

- duplicate components/services
- fabricated table/column/API names
- hard-coded IDs
- hard-coded user-facing configuration
- fallback/mock data
- broad exception swallowing
- unsafe type casts
- unexplained `any`
- abandoned TODOs
- unnecessary wrappers/abstractions
- disabled lint/type/RLS controls
- over-large refactors
- code that bypasses established services
- comments claiming safety without test evidence

AI-generated code should be treated as untrusted until independently verified.

---

## 17. Destructive / High-Impact Change Gate

If the change includes any of the following, use at least a DEEP review:

- DROP / TRUNCATE
- bulk DELETE or irreversible UPDATE
- table/column rename with dependencies
- data-type narrowing
- RLS removal or permission expansion
- storage-policy broadening
- approved-baseline rewrite
- audit/history modification
- bulk migration/backfill
- payment/subscription-state repair
- cross-schema privilege changes

Require:

- [ ] explicit purpose
- [ ] affected objects/data understood
- [ ] recovery/rollback strategy
- [ ] compatibility impact analysed
- [ ] targeted tests
- [ ] explicit human approval where required by `CLAUDE.md` or the approved plan

Otherwise: `BLOCK`.

---

## 18. Review-Before-Fix Protocol

When asked to **review and fix**:

1. Review first.
2. Record findings.
3. Classify severity.
4. Establish root cause.
5. Propose the smallest fix.
6. Separate low-risk fixes from high-impact fixes.
7. Apply only approved/authorised changes.
8. Run validation.
9. Re-review the modified areas.
10. Report remaining findings.

“Review and fix” is not permission for uncontrolled redesign.

---

## 19. Release Gate

A release should be blocked if any of the following is true:

- unresolved Critical finding
- unaccepted High finding
- required migration not reviewed
- RLS/security change lacks adequate validation
- tenant-isolation test fails
- build fails
- critical E2E flow fails
- required configuration/secrets are invalid
- necessary rollback/recovery is undefined
- known risk materially exceeds the owner's accepted tolerance

---

## 20. Relationship to the Implementation Plan

The implementation plan remains the permanent feature-level delivery record.

After review:

1. Add the review summary to the plan's review section.
2. Record tests actually executed.
3. Record unresolved findings/risks.
4. Record any approved deviations.
5. Update `ROADMAP.md` only if the change materially alters roadmap status, dependency, risk, or priority.

Do not create a separate standalone review document for every small feature unless the user explicitly requests one.

---

## 21. Claude / Cursor Review Prompt

Use after implementation:

> Read `CLAUDE.md`, the approved PRD/implementation plan where applicable, `ROADMAP.md`, and `REVIEW.md`.
> Review the completed change independently rather than assuming it is correct.
> Verify requirement coverage, CLAUDE.md compliance, architecture/reuse, data and schema impact, RLS/security, PMIS business integrity, Platform/Simulator/Admin impact, regression blast radius, UX/accessibility, and test evidence.
> Classify findings as CRITICAL/HIGH/MEDIUM/LOW.
> Report PASS, PASS WITH CONDITIONS, or BLOCK.
> Do not report an unexecuted test as passed.
> Do not apply high-impact fixes merely because the review discovered them.

---

## 22. Definition of Review Complete

A substantial review is complete only when:

- [ ] requirement/scope checked
- [ ] `CLAUDE.md` compliance checked
- [ ] changed code inspected
- [ ] relevant surrounding code inspected
- [ ] architecture/reuse checked
- [ ] database impact checked where applicable
- [ ] security/RLS/tenant isolation checked where applicable
- [ ] PMIS business meaning checked
- [ ] cross-app/parity impact checked where applicable
- [ ] regression blast radius identified
- [ ] relevant validation/tests assessed
- [ ] unverified areas disclosed
- [ ] findings classified
- [ ] final decision stated
- [ ] implementation plan review section updated where applicable

---

## 23. Review Principle

> **The purpose of review is to discover how a change can fail before a user, another tenant, an auditor, or production discovers it.**

A feature is not complete simply because it renders or compiles. It must be sufficiently correct, secure, traceable, maintainable, and verified for its risk level.
