# Cursor AI Build Prompt: Configurable Automated Testing & Diagnostics Module for PMIS

## 1. Project Context

I am building a **Project Management Information System (PMIS)** that supports both:

- **Predictive / Waterfall project management**
- **Adaptive / Agile project management**

The PMIS already has frontend and backend functionality completed or nearing completion. I am a **one-person development and testing team**, so I need a built-in, configurable testing and diagnostics module that helps me:

1. Create, amend, view, delete, organise, and run test cases.
2. Run automated tests during development and after future system changes.
3. Support positive and negative test scenarios.
4. Capture screenshots, logs, traces, and test evidence.
5. Diagnose issues reported by users.
6. Generate clear feedback on what happened during testing.
7. Produce pass/fail reports and recommended fixes.
8. Allow all application roles to perform CRUD operations on test cases, subject to proper permissions and audit logging.
9. Support test scripts that can be expanded over time without rebuilding the whole module.
10. Use captured screenshots as part of testing and diagnostics, including comparing actual UI against expected behaviour where practical.

The module should be designed as a **PMIS Testing & Diagnostics Centre**.

---

## 2. Preferred Technology Stack

Use the existing PMIS stack where possible.

### Frontend

- React
- TypeScript
- Tailwind CSS
- React Router, if already used in the PMIS
- Existing app layout, sidebar, dashboard, and role-based navigation

### Backend

Use the current backend architecture of the PMIS. If the PMIS uses Supabase, use:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Supabase Storage for screenshots and evidence files
- Supabase Edge Functions where useful
- Supabase local development and test workflows

### Testing Tools to Integrate

Use a layered testing approach:

1. **Vitest** for unit tests and utility tests.
2. **React Testing Library** for React component tests.
3. **Playwright** for end-to-end UI tests, screenshots, traces, and browser automation.
4. **pgTAP / SQL-based tests** for PostgreSQL database validation if Supabase/PostgreSQL is used.
5. Optional future integration point for CI/CD through GitHub Actions or equivalent.

The module must not depend on only one test type. It should support manual test cases, automated test scripts, database tests, API tests, UI tests, and diagnostic checks.

---

## 3. High-Level Goal

Build a fully functional configurable testing module inside the PMIS called:

# PMIS Testing & Diagnostics Centre

The module should allow users to manage and run test cases across the PMIS, including:

- Login and authentication flows
- Role-based access control
- Project creation and management
- Predictive / Waterfall workflows
- Agile boards and sprints
- Backlog management
- Risk management
- Issue management
- Change control
- Quality management
- Stakeholder management
- Document management
- Reporting and dashboards
- Notifications
- User administration
- System configuration
- Data integrity
- Audit logs
- Security rules
- Integration points

---

## 4. Key Design Principles

Build the module using the following principles:

1. **Configuration-first design**  
   Test cases, test suites, environments, test data, expected results, and screenshots must be configurable through the UI and database.

2. **One-person testing support**  
   The module must help a single developer/tester understand what failed, where it failed, why it likely failed, and what to do next.

3. **Evidence-driven testing**  
   Every test run should store evidence such as logs, screenshots, traces, input data, output results, and error messages.

4. **Positive and negative testing**  
   Each PMIS feature must support both expected success scenarios and expected failure/validation scenarios.

5. **Repeatable testing**  
   Tests should be runnable repeatedly after every major change.

6. **Role-aware testing**  
   Test cases must support running under different PMIS roles.

7. **Traceable testing**  
   Test cases should be linked to modules, features, requirements, user stories, defects, risks, issues, change requests, and releases where applicable.

8. **Safe automated diagnosis**  
   The module may recommend changes, generate fix instructions, or produce developer notes for Cursor AI, but it must not silently change production data or production code without review.

9. **Human-readable reporting**  
   Test reports must be understandable by a project manager, developer, tester, and system administrator.

10. **Expandable architecture**  
   New test types, new PMIS modules, and new automation scripts should be addable later.

---

## 5. Required Main Navigation

Add a new main sidebar/navigation section:

## Testing & Diagnostics

Submenus:

1. **Testing Dashboard**
2. **Test Case Library**
3. **Test Suites**
4. **Test Runs**
5. **Automated Scripts**
6. **Screenshot Evidence**
7. **Diagnostic Centre**
8. **Defect & Issue Links**
9. **Test Data Manager**
10. **Reports**
11. **Settings**

---

## 6. User Roles and Permissions

The module must be available to all roles, but actions should be permission controlled.

Suggested role capability matrix:

| Role | View Test Cases | Create/Edit Test Cases | Delete Test Cases | Run Tests | View Results | View Logs | Configure Automation | Approve Fix Recommendations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| System Admin | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| PMO Admin | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Project Manager | Yes | Yes | Limited | Yes | Yes | Yes | Limited | No |
| Scrum Master | Yes | Yes | Limited | Yes | Yes | Yes | Limited | No |
| Product Owner | Yes | Yes | No | Yes | Yes | Limited | No | No |
| Team Member | Yes | Limited | No | Yes | Own/Assigned | Limited | No | No |
| Tester / QA | Yes | Yes | Limited | Yes | Yes | Yes | Limited | Recommend Only |
| Viewer / Auditor | Yes | No | No | No | Yes | Yes | No | No |

Important implementation requirement:

- Use the PMIS existing role and permission model.
- If the PMIS has a dynamic permissions table, integrate with it.
- If it does not, add a simple permission layer for this module.
- All create, update, delete, run, and approval actions must be audit logged.

---

## 7. Core Data Model

Create or adapt database tables for the following entities.

Use the existing naming convention in the PMIS. If Supabase/PostgreSQL is used, create migrations.

### 7.1 test_modules

Stores PMIS modules/features under test.

Fields:

- id
- name
- code
- description
- methodology_type: `predictive`, `agile`, `hybrid`, `system`
- parent_module_id
- route_path
- is_active
- created_by
- created_at
- updated_at

Example modules:

- Authentication
- User Management
- Project Startup
- Project Initiation
- Project Planning
- Stage / Phase Management
- Risk Management
- Issue Management
- Change Control
- Agile Backlog
- Sprint Management
- Kanban Board
- Reporting Dashboard
- Document Management
- Notifications
- Audit Logs

---

### 7.2 test_cases

Stores individual test cases.

Fields:

- id
- test_case_code
- title
- description
- module_id
- feature_name
- methodology_type: `predictive`, `agile`, `hybrid`, `system`
- test_type: `manual`, `automated`, `api`, `ui`, `database`, `security`, `performance`, `diagnostic`
- scenario_type: `positive`, `negative`, `edge_case`, `regression`, `smoke`, `sanity`
- priority: `low`, `medium`, `high`, `critical`
- severity_if_failed: `low`, `medium`, `high`, `critical`
- preconditions
- test_steps as JSONB
- test_data as JSONB
- expected_result
- automation_key
- playwright_spec_path
- vitest_spec_path
- database_test_path
- expected_screenshot_id
- tags as text array
- status: `draft`, `ready`, `deprecated`, `blocked`
- owner_role
- owner_user_id
- is_reusable
- is_active
- created_by
- updated_by
- created_at
- updated_at

Example test_steps JSON:

```json
[
  {
    "step_no": 1,
    "action": "Login as Project Manager",
    "input": "Valid PM credentials",
    "expected": "User lands on dashboard"
  },
  {
    "step_no": 2,
    "action": "Create a new predictive project",
    "input": "Project name, start date, end date, sponsor",
    "expected": "Project is created and visible in project list"
  }
]
```

---

### 7.3 test_suites

Groups multiple test cases.

Fields:

- id
- suite_code
- name
- description
- suite_type: `smoke`, `regression`, `release`, `module`, `methodology`, `diagnostic`, `custom`
- methodology_type
- target_module_id
- environment_id
- is_active
- created_by
- created_at
- updated_at

---

### 7.4 test_suite_cases

Many-to-many link between suites and cases.

Fields:

- id
- suite_id
- test_case_id
- run_order
- is_required
- created_at

---

### 7.5 test_environments

Stores test environment configuration.

Fields:

- id
- name
- environment_type: `local`, `development`, `staging`, `uat`, `production_readonly`
- base_url
- api_base_url
- database_reference
- browser_config as JSONB
- seed_data_profile
- is_default
- is_active
- created_by
- created_at
- updated_at

Important:

- Production testing should default to safe read-only diagnostics unless explicitly authorised.
- Destructive tests must never run against production.

---

### 7.6 test_runs

Stores each execution run.

Fields:

- id
- run_code
- suite_id
- test_case_id nullable
- environment_id
- triggered_by
- trigger_type: `manual`, `scheduled`, `pre_release`, `post_change`, `diagnostic`, `ci_cd`
- run_status: `queued`, `running`, `passed`, `failed`, `partially_passed`, `cancelled`, `error`
- started_at
- finished_at
- duration_ms
- total_tests
- passed_tests
- failed_tests
- skipped_tests
- blocked_tests
- summary
- error_summary
- recommended_next_action
- created_at

---

### 7.7 test_run_results

Stores result per test case execution.

Fields:

- id
- test_run_id
- test_case_id
- status: `passed`, `failed`, `skipped`, `blocked`, `error`
- actual_result
- expected_result
- failure_reason
- assertion_details as JSONB
- logs as JSONB
- screenshot_ids as UUID array
- trace_file_id
- video_file_id
- started_at
- finished_at
- duration_ms
- executed_by
- created_at

---

### 7.8 test_evidence_files

Stores screenshots, traces, videos, logs, and uploaded evidence.

Fields:

- id
- test_run_id
- test_run_result_id
- test_case_id
- file_type: `screenshot`, `trace`, `video`, `log`, `json`, `html_report`, `uploaded_reference`, `uploaded_issue_screenshot`
- storage_bucket
- storage_path
- file_name
- mime_type
- file_size
- description
- captured_step_no
- comparison_status: `not_compared`, `matched`, `different`, `baseline_missing`, `error`
- uploaded_by
- created_at

---

### 7.9 test_defects

Stores defects discovered during testing or diagnosis.

Fields:

- id
- defect_code
- title
- description
- source: `test_run`, `user_report`, `manual_diagnosis`, `system_log`
- linked_test_run_id
- linked_test_case_id
- linked_test_result_id
- linked_project_id nullable
- linked_issue_id nullable
- linked_risk_id nullable
- linked_change_request_id nullable
- module_id
- severity
- priority
- status: `new`, `triaged`, `in_progress`, `fixed`, `retest_required`, `closed`, `reopened`
- suspected_root_cause
- recommended_fix
- cursor_prompt_generated
- assigned_to
- created_by
- created_at
- updated_at

---

### 7.10 diagnostic_sessions

Stores investigation sessions for user-raised issues.

Fields:

- id
- session_code
- title
- reported_by
- affected_user_id
- affected_role
- affected_module_id
- issue_description
- reproduction_steps as JSONB
- uploaded_screenshot_ids as UUID array
- environment_id
- diagnosis_status: `open`, `running`, `needs_info`, `probable_cause_found`, `fix_recommended`, `closed`
- probable_root_cause
- recommended_fix
- generated_cursor_prompt
- linked_defect_id
- created_at
- updated_at

---

### 7.11 test_audit_logs

Stores full audit history.

Fields:

- id
- actor_user_id
- actor_role
- action_type
- entity_type
- entity_id
- before_data as JSONB
- after_data as JSONB
- ip_address
- user_agent
- created_at

---

## 8. Frontend Pages and Features

### 8.1 Testing Dashboard

Show summary cards:

- Total test cases
- Ready test cases
- Automated test cases
- Manual test cases
- Passed tests
- Failed tests
- Blocked tests
- Latest regression run status
- Defects open
- Defects awaiting retest
- Diagnostic sessions open

Charts:

- Pass/fail trend over time
- Results by module
- Results by methodology: Predictive, Agile, Hybrid, System
- Defects by severity
- Failed tests by priority
- Automation coverage percentage

Filters:

- Date range
- Module
- Methodology
- Environment
- Test type
- Scenario type
- Priority
- Status

---

### 8.2 Test Case Library

CRUD page for test cases.

Features:

- Search
- Filter by module, methodology, type, scenario, priority, status
- Create new test case
- Edit test case
- Clone test case
- Delete or deactivate test case
- Import test cases from CSV/JSON
- Export test cases to CSV/JSON/Markdown
- Link test case to suite
- Attach baseline screenshot
- Attach expected output file
- Attach requirement/user story/project module

Test Case form sections:

1. General information
2. Methodology and module mapping
3. Preconditions
4. Test steps
5. Test data
6. Expected result
7. Automation configuration
8. Evidence and screenshots
9. Tags and ownership
10. Review status

---

### 8.3 Test Suites

Features:

- Create test suite
- Add/remove test cases
- Reorder test cases
- Mark required tests
- Assign target environment
- Run entire suite
- Schedule suite for future CI/CD integration
- View suite history
- Clone suite for another module/release

Suggested default suites:

- Authentication Smoke Suite
- Predictive Project Lifecycle Regression Suite
- Agile Sprint Management Regression Suite
- Risk and Issue Management Suite
- Role Permission Negative Test Suite
- Release Readiness Suite
- User Reported Issue Diagnostic Suite

---

### 8.4 Test Runs

Features:

- Start test run
- Select suite or individual test case
- Select environment
- Select role/persona to test as
- Choose browser: Chromium, Firefox, WebKit where supported
- Choose headless/headed mode
- Choose evidence capture level:
  - Minimal logs only
  - Screenshots on failure
  - Screenshots every step
  - Full trace/video capture
- Display live status
- Display logs in real time where possible
- Show pass/fail result
- Show failed steps
- Show screenshots and traces
- Generate defect from failed test
- Generate Cursor AI fix prompt from failed test

---

### 8.5 Automated Scripts

This page manages automation script metadata.

Features:

- Register automation key
- Link automation script to test case
- Show script path
- Show script type: Playwright, Vitest, SQL, API
- Show last run status
- Show last failure
- Show coverage area
- Mark script active/inactive
- Validate whether script file exists
- Run script if allowed
- Show script logs

Important:

- Do not allow arbitrary unsafe code execution from the browser.
- Use a safe backend-controlled test runner.
- Only allow registered scripts from allowed test directories.

---

### 8.6 Screenshot Evidence

Features:

- Upload screenshots from user issue reports
- Capture screenshots from automated tests
- Store baseline screenshots
- Compare actual vs baseline screenshots where supported
- Link screenshots to test cases, test runs, defects, or diagnostic sessions
- Add notes to screenshot
- Mark screenshot as:
  - Baseline
  - Actual result
  - Failure evidence
  - User reported evidence
  - Before fix
  - After fix

Screenshot comparison:

- For Playwright tests, support expected screenshot comparison where practical.
- Store comparison outcome.
- Show difference status and link to evidence files.

---

### 8.7 Diagnostic Centre

This is for diagnosing user-raised system issues.

Features:

- Create diagnostic session
- Capture affected user, role, environment, module, and issue description
- Upload screenshot or attach evidence
- Add reproduction steps
- Run related test cases
- Run module health checks
- Check recent error logs
- Check permission rules
- Check failed database/API calls if logged
- Suggest probable root cause
- Generate recommended next action
- Generate defect record
- Generate Cursor AI prompt to fix the issue

Diagnostic output should include:

- Issue summary
- Affected module
- Affected role
- Reproduction steps
- Evidence reviewed
- Tests executed
- Results
- Probable cause
- Recommended fix
- Retest recommendation
- Linked defect

---

### 8.8 Defect & Issue Links

Features:

- List all defects created from testing
- Link defect to PMIS project issue if applicable
- Link defect to risk or change request if applicable
- Update defect status
- Assign owner
- Record fix notes
- Trigger retest
- Close defect with evidence

---

### 8.9 Test Data Manager

Features:

- Define reusable test data sets
- Define personas:
  - System Admin
  - PMO Admin
  - Project Manager
  - Scrum Master
  - Product Owner
  - Team Member
  - Viewer/Auditor
- Define sample project data
- Define sample predictive projects
- Define sample agile projects
- Define risk/issue/change test records
- Reset test data in local/staging
- Seed test data for automated runs

Important:

- Test data must be isolated from production data.
- Destructive reset should only be available for local/development/staging environments.
- Production diagnostic tests must use read-only checks by default.

---

### 8.10 Reports

Reports required:

1. Test Run Summary Report
2. Test Case Coverage Report
3. Regression Test Report
4. Failed Test Report
5. Defect Summary Report
6. Diagnostic Session Report
7. Screenshot Evidence Report
8. Role Permission Test Report
9. Release Readiness Report
10. Positive vs Negative Test Report

Export formats:

- PDF, if the PMIS already supports PDF export
- CSV
- JSON
- Markdown

---

### 8.11 Settings

Settings should include:

- Default environment
- Default browser
- Screenshot capture mode
- Trace/video capture mode
- Retention period for evidence files
- Maximum screenshot file size
- Allowed test directories
- Allowed script types
- Test run timeout
- Safe mode for production
- Enable/disable visual comparison
- Enable/disable generated Cursor prompt
- Enable/disable automatic defect creation
- Role permissions

---

## 9. Automated Test Runner Architecture

Implement a safe test runner architecture.

### Required Components

1. **Frontend UI**
   - Allows users to configure and request test runs.

2. **Backend Orchestrator**
   - Receives test run requests.
   - Validates user permissions.
   - Validates environment safety.
   - Creates test_run record.
   - Queues or starts the test runner.
   - Streams or stores logs.
   - Updates run status.

3. **Test Runner Service**
   - Runs Playwright, Vitest, SQL tests, or API tests.
   - Uses only approved script paths.
   - Captures output.
   - Captures screenshots/traces/videos.
   - Saves result files.
   - Updates database with results.

4. **Evidence Storage**
   - Stores screenshots, traces, logs, HTML reports, uploaded files.

5. **Result Parser**
   - Parses JSON/JUnit/HTML outputs where available.
   - Converts them into test_run_results rows.

6. **Diagnostic Engine**
   - Maps failures to likely modules/root causes.
   - Suggests fix/retest actions.
   - Generates defect records and Cursor AI prompts.

---

## 10. Safe Automation Requirements

The module must include these safety controls:

1. Never execute arbitrary user-entered code directly.
2. Only allow execution of scripts registered in approved directories.
3. Validate all test run requests against role permissions.
4. Prevent destructive tests in production.
5. Mask secrets in logs.
6. Do not store plain-text passwords.
7. Use service keys only in secure backend environments.
8. Store evidence in protected storage buckets.
9. Use audit logs for all sensitive actions.
10. Allow fix recommendations, but require human review before applying code or database changes.
11. Distinguish between:
   - Test failure
   - Environment failure
   - Data setup failure
   - Permission failure
   - Automation script failure
   - Real application defect

---

## 11. Playwright Integration Requirements

Use Playwright for end-to-end UI testing.

Required capabilities:

- Run tests against selected environment base URL.
- Support testing different roles/personas.
- Capture screenshots on failure.
- Optionally capture screenshots at each major step.
- Capture trace files for failed tests.
- Optionally capture video for failed tests.
- Support visual screenshot comparison for stable screens.
- Save evidence to storage and link to test results.
- Generate structured JSON results for ingestion.

Suggested directory structure:

```txt
/tests
  /e2e
    /auth
    /predictive
    /agile
    /risk-issue-change
    /reports
    /permissions
  /fixtures
  /personas
  /utils
```

Suggested Playwright command patterns:

```bash
npx playwright test
npx playwright test tests/e2e/auth
npx playwright test --project=chromium
npx playwright test --trace=on-first-retry
npx playwright show-report
```

Use Playwright screenshots for evidence capture and Playwright traces for debugging failed CI or local runs.

---

## 12. Vitest and React Testing Library Requirements

Use Vitest and React Testing Library for:

- Component rendering tests
- Form validation tests
- Utility function tests
- Permission helper tests
- Data transformation tests
- Dashboard calculation tests
- Status mapping tests
- Report calculation tests

Suggested directory structure:

```txt
/src
  /components
  /modules
  /testing-centre
  /utils
/tests
  /unit
  /components
```

Examples of what to test:

- Risk priority calculation
- Issue severity mapping
- Project status calculation
- Agile sprint velocity calculations
- Permission checker functions
- Form validation messages
- Dashboard metric formatting

Testing style:

- Test behaviour from the user perspective.
- Avoid brittle implementation-detail tests.
- Prefer accessible selectors and visible text where practical.
- Mock external APIs safely.

---

## 13. Database Testing Requirements

If the backend uses Supabase/PostgreSQL, add database tests for:

- Table constraints
- Required fields
- Foreign keys
- Data integrity
- RLS policies
- Role permissions
- Stored procedures/functions
- Audit log triggers

Suggested test areas:

- Can a Project Manager create test cases?
- Can a Viewer delete test cases? Expected: no.
- Can a Team Member view only permitted results?
- Are test run results linked correctly?
- Are evidence files protected?
- Are audit logs created after CRUD actions?

Use pgTAP where available for database unit tests.

---

## 14. API Testing Requirements

If the PMIS has API endpoints or server functions, support API tests for:

- Authentication
- Project CRUD
- Agile board updates
- Risk/issue/change CRUD
- Reporting queries
- Test case CRUD
- Test run creation
- Evidence upload
- Diagnostic session creation

API test results should store:

- Endpoint tested
- Request method
- Request payload with secrets masked
- Response status
- Response body summary
- Pass/fail assertion
- Error message

---

## 15. Test Case Templates

Create built-in templates.

### 15.1 Positive Test Case Template

Fields:

- Title
- Module
- Feature
- Preconditions
- Valid input data
- Steps
- Expected successful result
- Evidence required
- Automation script key
- Pass/fail criteria

### 15.2 Negative Test Case Template

Fields:

- Title
- Module
- Feature
- Preconditions
- Invalid or missing input data
- Steps
- Expected validation/error response
- Security/permission expectation
- Evidence required
- Automation script key
- Pass/fail criteria

### 15.3 Diagnostic Test Case Template

Fields:

- User issue description
- Affected role
- Affected module
- Reproduction steps
- Screenshot evidence
- Related test cases
- Diagnostic checks
- Expected system behaviour
- Actual system behaviour
- Probable root cause
- Recommended fix

---

## 16. Seed Test Cases to Create

Create seed/sample test cases for the PMIS.

### Authentication

1. Login with valid credentials should succeed.
2. Login with invalid password should fail.
3. Logged-out user should not access protected routes.
4. User should only see navigation items permitted for their role.

### Predictive / Waterfall

1. Project Manager can create a predictive project.
2. Required project fields are validated.
3. Project stage can be created and assigned.
4. End stage report can be created before moving to the next stage.
5. Viewer cannot edit predictive project baseline.

### Agile / Adaptive

1. Product Owner can create backlog item.
2. Scrum Master can create sprint.
3. Team Member can update assigned task status.
4. Sprint cannot be closed when required completion criteria fail.
5. Viewer cannot move backlog items.

### Risk Management

1. Project Manager can create a risk.
2. Risk score calculates correctly.
3. Missing probability/impact should trigger validation.
4. Risk can be linked to a project.
5. Viewer cannot delete risk.

### Issue Management

1. Project Manager can create issue.
2. Issue can be escalated.
3. Issue status changes are audit logged.
4. Closed issue cannot be edited without permission.
5. Team Member cannot delete project issue.

### Change Control

1. Change request can be created.
2. Change request can be assessed.
3. Change decision updates status.
4. Unauthorised role cannot approve change.
5. Change request appears in dashboard metrics.

### Reporting

1. Dashboard loads summary metrics.
2. Project status counts are accurate.
3. Agile sprint metrics are accurate.
4. Failed API response should show friendly error message.
5. Export report button works where supported.

### Testing Centre

1. Admin can create test case.
2. Project Manager can create test case if permitted.
3. Viewer cannot delete test case.
4. Test suite can be created.
5. Test run stores pass/fail result.
6. Screenshot evidence is linked to test run.
7. Failed test can generate defect.
8. Diagnostic session can generate Cursor AI prompt.

---

## 17. Cursor AI Fix Prompt Generation

The module should generate a structured Cursor AI prompt from failed tests or diagnostic sessions.

The generated prompt should include:

```md
# Cursor AI Fix Prompt

## Problem Summary
[Short description of the failed scenario]

## Affected PMIS Module
[Module name]

## Affected Methodology
[Predictive / Agile / Hybrid / System]

## Environment
[Environment name and URL]

## User Role / Persona
[Role used during test]

## Test Case
[Test case code and title]

## Expected Result
[Expected result]

## Actual Result
[Actual result]

## Failure Evidence
- Screenshot path(s)
- Trace file path
- Logs
- Console errors
- API errors

## Reproduction Steps
1. ...
2. ...
3. ...

## Suspected Root Cause
[Generated diagnosis]

## Required Fix
Please inspect the relevant frontend, backend, database, permissions, and routing logic. Fix the issue safely without breaking existing functionality.

## Retest Instructions
After applying the fix, rerun:
- [Specific test case]
- [Related regression suite]
```

Important:

- The module should generate prompts and recommendations, not secretly change code.
- Any code/database fix should be reviewed by the developer before applying.

---

## 18. Diagnostic Logic Rules

Build a first version of diagnostic rules.

Examples:

### Authentication failure

If login test fails:

- Check auth service response.
- Check user exists.
- Check role assignment.
- Check redirect route.
- Check protected route guard.
- Check console errors.

### Permission failure

If a user can access something they should not:

- Check route guard.
- Check sidebar permission mapping.
- Check API/backend permission.
- Check database RLS policy.
- Check role-permission table.
- Create high-severity defect.

### Screenshot mismatch

If screenshot comparison fails:

- Check whether layout changed intentionally.
- Check viewport size.
- Check dynamic data.
- Check broken components.
- Check missing CSS.
- Flag as visual regression.

### CRUD failure

If create/update/delete fails:

- Check validation rules.
- Check API request payload.
- Check database constraints.
- Check RLS policy.
- Check error boundary and toast message.
- Check audit log creation.

### Dashboard metric failure

If dashboard values are wrong:

- Check query filters.
- Check status mapping.
- Check date range calculation.
- Check aggregation logic.
- Check data visibility by role.

---

## 19. Logging Requirements

Every test run should log:

- Who triggered the test
- When it started
- When it ended
- Environment
- Browser/project
- Test suite
- Test cases executed
- Step-level messages where available
- Console errors
- Network/API errors where available
- Screenshots captured
- Traces captured
- Pass/fail status
- Failure reason
- Recommended action

Logs must be searchable and filterable by:

- Date
- Run status
- Module
- Test case
- User
- Environment
- Failure type
- Severity

---

## 20. Test Result Classifications

Classify failures into:

1. **Application Defect**
2. **Test Script Defect**
3. **Test Data Defect**
4. **Environment Issue**
5. **Permission/RLS Issue**
6. **Expected Negative Test Pass**
7. **Visual Regression**
8. **Unknown / Needs Manual Review**

This distinction is important so that a negative test that correctly blocks unauthorised access is treated as a pass, not a failure.

---

## 21. Evidence Capture Levels

Allow the user to choose:

### Level 1: Minimal

- Result status
- Logs only

### Level 2: Failure Evidence

- Screenshot on failure
- Error logs
- Trace on failure

### Level 3: Full Evidence

- Screenshot at every key step
- Full trace
- Video where supported
- Network logs where practical

### Level 4: Diagnostic Deep Capture

- Screenshots
- Trace
- Video
- Console logs
- Network failures
- API summaries
- Permission checks
- Database check summaries

---

## 22. Suggested File Structure

Adapt to the existing PMIS structure, but aim for something like:

```txt
/src
  /modules
    /testing-centre
      /components
      /pages
      /hooks
      /services
      /types
      /utils
      /schemas
      /reports
      /diagnostics

/tests
  /e2e
    /auth
    /predictive
    /agile
    /risk-issue-change
    /reports
    /testing-centre
    /permissions
  /unit
  /components
  /api
  /db
  /fixtures
  /personas
  /evidence
  /reports

/supabase
  /migrations
  /tests
  /functions

/test-runner
  runner.ts
  result-parser.ts
  evidence-uploader.ts
  diagnostic-engine.ts
  playwright-adapter.ts
  vitest-adapter.ts
  db-test-adapter.ts
```

---

## 23. Backend Service Requirements

Create service functions for:

- createTestCase
- updateTestCase
- deleteTestCase
- listTestCases
- getTestCase
- createTestSuite
- updateTestSuite
- runTestSuite
- runTestCase
- createTestRun
- updateTestRunStatus
- saveTestRunResult
- uploadEvidenceFile
- createDefectFromFailedTest
- createDiagnosticSession
- runDiagnosticSession
- generateCursorFixPrompt
- exportTestReport
- getTestingDashboardMetrics
- auditTestingAction

---

## 24. UI/UX Requirements

Use a clean professional design aligned with the PMIS.

Design expectations:

- Dashboard cards
- Data tables with filters
- Status badges
- Severity badges
- Step-by-step forms
- JSON editor for advanced test data
- Screenshot preview panel
- Logs viewer
- Timeline for test run events
- Pass/fail summary
- Defect creation drawer/modal
- Diagnostic wizard
- Export buttons
- Confirmation modals for destructive actions

Status colour guidance:

- Passed: green
- Failed: red
- Running: blue
- Blocked: amber
- Skipped: grey
- Critical: red
- High: orange
- Medium: yellow
- Low: grey/blue

---

## 25. Validation Rules

Add frontend and backend validation.

Examples:

- Test case title is required.
- Module is required.
- Scenario type is required.
- Expected result is required.
- At least one test step is required.
- Automated test cases must have an automation key or script path.
- Test suite must contain at least one test case before running.
- Production environment cannot run destructive tests.
- Screenshot upload must be image file type.
- Evidence file size must respect settings.
- Users can only perform actions allowed by their permissions.

---

## 26. Audit Requirements

Audit these actions:

- Test case created
- Test case updated
- Test case deleted/deactivated
- Test suite created/updated/deleted
- Test run triggered
- Test run cancelled
- Evidence uploaded
- Screenshot baseline changed
- Defect created
- Defect status changed
- Diagnostic session created
- Cursor fix prompt generated
- Settings changed
- Permission changed

---

## 27. Reporting Requirements

Generate a markdown test report after each test run.

Report format:

```md
# Test Run Report

## Run Summary
- Run Code:
- Suite:
- Environment:
- Triggered By:
- Started:
- Finished:
- Duration:
- Overall Status:

## Result Summary
- Total:
- Passed:
- Failed:
- Skipped:
- Blocked:

## Failed Scenarios
| Test Case | Module | Expected | Actual | Failure Type | Evidence |
|---|---|---|---|---|---|

## Passed Scenarios
| Test Case | Module | Scenario Type | Duration |
|---|---|---|---|

## Evidence
- Screenshots:
- Traces:
- Logs:

## Defects Created
- Defect Code:
- Severity:
- Status:

## Recommendations
- Immediate action:
- Retest required:
- Related regression suite:
```

---

## 28. Non-Functional Requirements

### Performance

- Test dashboard should load quickly.
- Paginate large test case and log lists.
- Evidence files should lazy-load.
- Large logs should be collapsible.

### Security

- Apply role permissions.
- Use backend validation.
- Mask secrets.
- Protect evidence files.
- Restrict script execution.
- Enforce safe mode in production.

### Maintainability

- Use typed interfaces.
- Keep adapters modular.
- Avoid hardcoding module names where possible.
- Use config tables.
- Write tests for the testing module itself.

### Reliability

- Failed test runner process should not crash the PMIS.
- Long-running tests should show progress.
- Interrupted test runs should be marked as cancelled/error.
- Evidence upload failures should be logged separately.

### Extensibility

- Allow future adapters for:
  - Load testing
  - Accessibility testing
  - Security scanning
  - CI/CD pipelines
  - AI-assisted log analysis

---

## 29. Implementation Phases

Build this module in phases.

### Phase 1: Foundation

- Database tables and migrations
- Testing Centre navigation
- Test Case Library CRUD
- Test Suite CRUD
- Test Environment settings
- Audit logging

### Phase 2: Test Runs and Results

- Manual run records
- Test run dashboard
- Test result capture
- Evidence upload
- Basic reports

### Phase 3: Automation Integration

- Playwright integration
- Vitest integration
- Database test integration
- Result parser
- Screenshot capture
- Trace capture

### Phase 4: Diagnostics

- Diagnostic sessions
- User issue evidence upload
- Failure classification
- Defect creation
- Cursor AI fix prompt generation

### Phase 5: Advanced Reporting and Hardening

- Regression reports
- Release readiness reports
- Screenshot comparison
- Role permission matrix reports
- Retention policies
- Safe production diagnostics
- CI/CD readiness

---

## 30. Acceptance Criteria

The build is complete when:

1. A user can create, view, edit, delete, and clone test cases.
2. A user can group test cases into suites.
3. A user can run a test case or test suite.
4. The system records test run status.
5. The system records pass/fail/skipped/blocked results.
6. The system stores logs and evidence.
7. Screenshots can be uploaded and linked to tests.
8. Automated Playwright tests can capture screenshots and traces.
9. Failed tests can generate defects.
10. Diagnostic sessions can be created for user-raised issues.
11. Diagnostic sessions can run related tests and generate recommendations.
12. Cursor AI fix prompts can be generated from failed scenarios.
13. Positive and negative scenarios are clearly distinguished.
14. Reports are exportable.
15. All critical actions are audit logged.
16. Role permissions are enforced.
17. Production-safe mode prevents destructive testing.
18. The module is maintainable and expandable.

---

## 31. Definition of Done

For each feature in this module:

- UI completed
- Backend service completed
- Database migration completed
- Permissions enforced
- Audit logging completed
- Validation completed
- Error handling completed
- Loading states completed
- Empty states completed
- Test coverage added
- Documentation added
- Manual test completed
- Automated test added where practical

---

## 32. Developer Notes for Cursor AI

When building this module:

1. First inspect the existing PMIS folder structure, routing, auth, role model, database client, and UI patterns.
2. Reuse existing components and styling where possible.
3. Do not break existing PMIS functionality.
4. Add migrations safely.
5. Use TypeScript types throughout.
6. Use small, modular components.
7. Keep the test runner secure.
8. Do not expose secrets to the frontend.
9. Create seed data for sample test cases.
10. Add documentation under `/docs/testing-centre.md`.
11. Add example Playwright and Vitest tests.
12. Add a README section explaining how to run the testing module locally.
13. Ensure the module works for both Predictive and Agile PMIS workflows.
14. Ensure every automated test result can be traced back to a test case and module.
15. Implement the feature progressively in the phases listed above.

---

## 33. Example First Build Task for Cursor AI

Start by implementing Phase 1:

```md
Build the PMIS Testing & Diagnostics Centre Phase 1.

Tasks:
1. Inspect the existing PMIS architecture.
2. Add database tables for test_modules, test_cases, test_suites, test_suite_cases, test_environments, and test_audit_logs.
3. Add TypeScript types.
4. Add Testing & Diagnostics navigation.
5. Build Testing Dashboard shell.
6. Build Test Case Library CRUD.
7. Build Test Suite CRUD.
8. Build Test Environment settings page.
9. Enforce existing PMIS role permissions.
10. Add audit logging for all CRUD actions.
11. Add seed test modules and sample test cases.
12. Add documentation under /docs/testing-centre.md.
```

---

## 34. Example Second Build Task for Cursor AI

After Phase 1 is working, implement Phase 2:

```md
Build the PMIS Testing & Diagnostics Centre Phase 2.

Tasks:
1. Add test_runs and test_run_results tables.
2. Build Test Runs page.
3. Allow users to run manual test cases and suites.
4. Capture pass/fail/skipped/blocked results.
5. Add logs field and result notes.
6. Add evidence upload support.
7. Add basic Test Run Summary Report.
8. Add filters and dashboard metrics.
9. Link failed results to defect creation.
10. Add audit logging.
```

---

## 35. Example Third Build Task for Cursor AI

After Phase 2 is stable, implement Phase 3:

```md
Build the PMIS Testing & Diagnostics Centre Phase 3.

Tasks:
1. Add a safe backend test runner service.
2. Integrate Playwright for E2E tests.
3. Integrate Vitest for unit/component tests.
4. Add approved script directory validation.
5. Store screenshots, traces, videos, and logs as evidence.
6. Parse test results into test_run_results.
7. Display live or near-live test run progress.
8. Add failure classification.
9. Add screenshot comparison where practical.
10. Add example automated tests for authentication, permissions, predictive project creation, and agile backlog creation.
```

---

## 36. Example Fourth Build Task for Cursor AI

After Phase 3 is stable, implement Phase 4:

```md
Build the PMIS Testing & Diagnostics Centre Phase 4.

Tasks:
1. Add diagnostic_sessions table.
2. Build Diagnostic Centre page.
3. Allow issue screenshots and reproduction steps to be captured.
4. Link diagnostics to test cases and defects.
5. Implement diagnostic rule engine.
6. Generate probable root cause.
7. Generate recommended fix.
8. Generate Cursor AI fix prompt.
9. Add retest workflow.
10. Add diagnostic report export.
```

---

## 37. Final Instruction to Cursor AI

Build this as a professional internal testing and diagnostics module for a PMIS, not just a simple test list.

The module must help a one-person developer/project manager continuously test, diagnose, document, and improve the PMIS across both Predictive/Waterfall and Adaptive/Agile workflows.

Prioritise safety, configurability, traceability, evidence capture, and clear reporting.
