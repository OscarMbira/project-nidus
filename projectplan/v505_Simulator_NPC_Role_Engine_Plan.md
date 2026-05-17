# v505 – Simulator NPC Role Engine ("Chess vs Computer" Simulation)

**Date:** 2026-05-10  
**Updated:** 2026-05-10 (post gap-analysis — 6 critical additions incorporated)  
**Feature:** Full role-based project simulation — user picks a role, AI plays every other role, generating realistic project events, decisions, risks, reports, and escalations across the full project lifecycle.

---

## Vision

Like playing chess against a computer:
- User chooses a project role (PM, Sponsor, Delivery Manager, etc.)
- The system assigns named NPC characters to every other role
- NPCs proactively generate realistic project events (risks surface, stakeholders complain, team managers raise blockers, sponsors request status updates, board meetings are held)
- User responds to events (multiple-choice, scored), submits artefacts (reports, plans, stage gates), and initiates actions (delegate, request update, submit report)
- Project health metrics and work performance data (EVM) update in real time based on decisions
- Stage gates enforce mandatory artefact completion before phase advancement
- At run end: full debrief with score breakdown, learning outcomes, and coaching

---

## What Already Exists (Do NOT Recreate)

| Item | Location |
|------|----------|
| `sim.simulation_runs` | Core run tracking (extend — do not replace) |
| `sim.ai_events` | Event storage (extend with NPC fields) |
| `sim.scenarios` | Scenario library (extend with seed data) |
| `sim.project_evm_snapshots` | EVM data (seed actuals + integrate into health) |
| `sim.practice_work_packages` | Work packages (NPCs update completion % autonomously) |
| `sim.practice_highlight_reports` | Highlight reports (user submits; Sponsor NPC reacts) |
| `sim.practice_exception_reports` | Exception reports (triggered on tolerance breach) |
| `sim.practice_end_stage_reports` | End stage reports (required for stage gate) |
| `sim.practice_checkpoint_reports` | Checkpoint reports (Team Manager NPC submits) |
| `sim.practice_lessons_log` | Lessons log (mid-project capture, not just closure) |
| `EventModal.jsx` | NPC avatar + multiple-choice + scoring + impact — **reuse as-is** |
| `HintsPanel.jsx` | Coaching hints — **reuse as-is** |
| `simPlanAIService.js` | Edge Function call pattern (use for NPC response AI) |
| All `sim.practice_*` tables | Actual project artefacts (risks, issues, quality, reports) |
| `sim.ai_coach_events` | Coaching hint triggers |
| `sim.module_scores` | Per-phase scoring |
| `sim.badges`, `sim.user_progress` | Gamification — unchanged |
| `sim.ai_conversations` + `sim.ai_messages` | AI chat — unchanged |

---

## Database Schema Changes

### New Tables

#### `sim.npc_characters`
Named NPC characters per project role. Reused across simulation runs.
```sql
CREATE TABLE sim.npc_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name VARCHAR(50) NOT NULL,
  character_name VARCHAR(100) NOT NULL,
  character_initials VARCHAR(3) NOT NULL,
  avatar_colour VARCHAR(20) DEFAULT 'blue',
  personality VARCHAR(30) DEFAULT 'balanced'
    CHECK (personality IN ('demanding','supportive','cautious','optimistic','balanced')),
  communication_style TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sim.npc_event_templates`
Curated event library. 200+ templates covering every phase, role, category, and severity.
```sql
CREATE TABLE sim.npc_event_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_code VARCHAR(50) UNIQUE NOT NULL,
  emitting_role VARCHAR(50) NOT NULL,
  target_role VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  phase_trigger VARCHAR(50),
  methodology VARCHAR(20) DEFAULT 'any'
    CHECK (methodology IN ('any','traditional','agile','hybrid')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL,
  escalation_template_code VARCHAR(50),         -- fires this template if overdue
  deterioration JSONB DEFAULT '{}',             -- health impact applied if unanswered after deadline
  cooldown_days INTEGER DEFAULT 7,
  weight INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sim.npc_run_assignments`
Which NPC characters are assigned to which roles in a given run.
```sql
CREATE TABLE sim.npc_run_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  role_name VARCHAR(50) NOT NULL,
  npc_character_id UUID NOT NULL REFERENCES sim.npc_characters(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (run_id, role_name)
);
```

#### `sim.scenario_seed_data`
Pre-built project artefact snapshots per scenario (JSONB blobs seeded at run start).
```sql
CREATE TABLE sim.scenario_seed_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
  seed_type VARCHAR(50) NOT NULL
    CHECK (seed_type IN (
      'project_brief','team','risks','stakeholders','budget','schedule',
      'issues','quality_criteria','work_packages','evm_baseline',
      'period_actuals','lessons_starters'
    )),
  seed_payload JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sim.sim_clock_ticks` — NEW (Addition A: Simulation Clock)
Tracks every clock advancement for a run. One row per simulated day ticked.
```sql
CREATE TABLE sim.sim_clock_ticks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  sim_day INTEGER NOT NULL,              -- day number within the project (1-based)
  sim_date DATE NOT NULL,               -- absolute simulated calendar date
  real_ticked_at TIMESTAMPTZ DEFAULT NOW(),
  events_generated INTEGER DEFAULT 0,
  evm_updated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sim.phase_gate_requirements` — NEW (Addition F: Phase Gate Validator)
Defines which artefacts must exist and be in a qualifying status before a phase can advance.
```sql
CREATE TABLE sim.phase_gate_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_phase VARCHAR(50) NOT NULL,      -- e.g. 'initiation'
  to_phase VARCHAR(50) NOT NULL,        -- e.g. 'planning'
  methodology VARCHAR(20) DEFAULT 'traditional'
    CHECK (methodology IN ('traditional','agile','hybrid')),
  requirement_type VARCHAR(50) NOT NULL
    CHECK (requirement_type IN ('artefact','approval','event','score')),
  artefact_table VARCHAR(100),          -- e.g. 'practice_project_briefs'
  artefact_status_field VARCHAR(50),    -- e.g. 'status'
  artefact_status_required VARCHAR(50), -- e.g. 'approved'
  description TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sim.stage_gate_reviews` — NEW (Addition C: Stage Gate)
Formal end-stage/board review records.
```sql
CREATE TABLE sim.stage_gate_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL,
  review_type VARCHAR(30) NOT NULL
    CHECK (review_type IN ('end_stage','exception','closure','sprint_review')),
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','approved','rejected','exception_raised')),
  submitted_at TIMESTAMPTZ,
  board_response JSONB DEFAULT '{}',     -- NPC board responses as scored Q&A
  board_decision VARCHAR(30)
    CHECK (board_decision IN ('authorized','rejected','exception','deferred')),
  decided_at TIMESTAMPTZ,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sim.npc_user_messages` — NEW (Addition E: User→NPC Actions)
Stores messages/requests that the user sends TO NPC characters.
```sql
CREATE TABLE sim.npc_user_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_npc_character_id UUID NOT NULL REFERENCES sim.npc_characters(id),
  message_type VARCHAR(50) NOT NULL
    CHECK (message_type IN (
      'status_request','report_submission','delegation',
      'approval_request','escalation','general_message'
    )),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  linked_artefact_type VARCHAR(50),      -- e.g. 'highlight_report'
  linked_artefact_id UUID,
  npc_response TEXT,                     -- AI-generated NPC reply
  npc_response_score INTEGER,            -- score for how appropriate the submission was
  npc_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sim.npc_autonomous_actions` — NEW (NPC Autonomous Actions)
Records actions NPCs take without user prompting (appear in Activity Feed).
```sql
CREATE TABLE sim.npc_autonomous_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  npc_character_id UUID NOT NULL REFERENCES sim.npc_characters(id),
  action_type VARCHAR(50) NOT NULL
    CHECK (action_type IN (
      'work_package_update','checkpoint_report_submitted',
      'quality_review_submitted','change_request_raised',
      'expense_claim_submitted','risk_updated','lesson_logged'
    )),
  action_description TEXT NOT NULL,
  artefact_type VARCHAR(50),
  artefact_id UUID,
  health_impact JSONB DEFAULT '{}',
  sim_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Extend Existing Tables

```sql
-- simulation_runs: add user role, NPC config, project health, practice project link,
-- simulation clock, methodology, and run history
ALTER TABLE sim.simulation_runs
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS methodology VARCHAR(20) DEFAULT 'traditional'
    CHECK (methodology IN ('traditional','agile','hybrid')),
  ADD COLUMN IF NOT EXISTS practice_project_id UUID
    REFERENCES sim.practice_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_health JSONB DEFAULT '{
    "budget_pct": 100,
    "schedule_variance_days": 0,
    "quality_score": 100,
    "team_morale": 100,
    "stakeholder_satisfaction": 100
  }',
  ADD COLUMN IF NOT EXISTS evm_snapshot JSONB DEFAULT '{
    "pv": 0, "ev": 0, "ac": 0,
    "cpi": 1.0, "spi": 1.0,
    "eac": 0, "tcpi": 1.0,
    "period_actuals": []
  }',
  ADD COLUMN IF NOT EXISTS sim_day INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sim_start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS phase_events_fired JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_stage VARCHAR(50) DEFAULT 'initiation',
  ADD COLUMN IF NOT EXISTS tolerance_breached BOOLEAN DEFAULT FALSE;

-- ai_events: add NPC character reference, pre-built options array, escalation tracking
ALTER TABLE sim.ai_events
  ADD COLUMN IF NOT EXISTS npc_character_id UUID
    REFERENCES sim.npc_characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS npc_event_template_id UUID
    REFERENCES sim.npc_event_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS response_options JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS selected_option_index INTEGER,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalated_from_event_id UUID
    REFERENCES sim.ai_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_deteriorated BOOLEAN DEFAULT FALSE;

-- scenarios: add allowed user roles and methodology support
ALTER TABLE sim.scenarios
  ADD COLUMN IF NOT EXISTS allowed_user_roles TEXT[] DEFAULT
    ARRAY['project_manager','project_sponsor','programme_manager',
          'team_manager','project_assurance','change_authority'],
  ADD COLUMN IF NOT EXISTS methodology VARCHAR(20) DEFAULT 'traditional'
    CHECK (methodology IN ('traditional','agile','hybrid')),
  ADD COLUMN IF NOT EXISTS project_duration_days INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS project_budget_baseline NUMERIC(14,2);
```

---

## Seed Data: NPC Characters (minimum set)

| Role | Name | Personality | Avatar |
|------|------|-------------|--------|
| project_sponsor | Sarah Chen | demanding | purple |
| programme_manager | James Okafor | cautious | indigo |
| project_manager | Alex Rivera | balanced | blue |
| team_manager | Marcus Johnson | optimistic | green |
| project_assurance | Priya Patel | cautious | amber |
| change_authority | David Smith | balanced | orange |
| quality_assurance | Elena Torres | demanding | red |
| team_member | Liam Nakamura | supportive | teal |
| project_board_member | Fatima Al-Said | balanced | violet |

---

## Seed Data: 3 Built-in Scenarios

### Scenario A — "Infrastructure Modernisation"
- Industry: Technology | Methodology: Traditional | Difficulty: Medium
- Budget: £2.4M | Duration: 18 months (540 sim days)
- Team: 8 people | Stages: 4
- Key challenges: Legacy system dependencies, vendor delays
- Seed data: 10 risks, 6 stakeholders, 8 work packages, EVM baseline (BCWP/BCWS curves), period actuals for sim days 1–30, 3 quality criteria

### Scenario B — "Digital Product Launch"
- Industry: Technology / FMCG | Methodology: Agile (Scrum) | Difficulty: High
- Budget: £950K | Duration: 9 months (270 sim days) | 6 Sprints
- Team: 6 people
- Key challenges: Shifting requirements, regulatory approval
- Seed data: 10 risks, 5 stakeholders (external regulator), 6 sprints with velocity baselines, backlog of 30 stories, 2 pre-loaded change requests

### Scenario C — "Organisational Restructure"
- Industry: Financial Services | Methodology: Hybrid | Difficulty: Expert
- Budget: £650K | Duration: 12 months (365 sim days) | Stages: 3
- Team: 5 people
- Key challenges: Complex stakeholder politics, change resistance, regulatory constraints
- Seed data: 12 risks (3 pre-triggered), 8 stakeholders (resistant exec included), 3 open issues, period actuals showing 8% over budget at day 1, 4 pending change requests

---

## NPC Event Template Library (200+ events)

**Sponsor Events (target: PM)**
- Urgent status update request before board meeting
- Sponsor threatening de-scope unless costs reduced 15%
- Go-live date brought forward 6 weeks
- Stage 2 budget approval delayed — sponsor asks what to do
- Sponsor escalates to Programme Board after no highlight report received

**Team Manager Events (target: PM)**
- Key developer resigned with 2 weeks notice
- Testing team 40% over capacity — priority call requested
- Two team members in conflict affecting morale
- Overtime request submitted £12,000 above budget
- Work package completion delayed by 3 weeks — asking for scope reduction

**Quality Assurance Events (target: PM)**
- 23 high-priority defects flagged in latest sprint — recommends halt
- Customer acceptance criteria changed — re-baseline requested
- Quality gate blocked until documentation is complete
- QA audit revealed process non-compliance in Stage 2

**Assurance Events (target: PM)**
- Risk register not updated for 3 weeks — compliance flag
- Project board requires revised exception report within 48 hours
- Assurance recommends formal lessons log review
- Assurance escalation: tolerances breached, exception report mandatory

**Change Authority Events (target: PM)**
- Change request to add System X integration submitted by client
- Change authority rejected CR-007 — PM must communicate to sponsor
- Three change requests pending — project cannot proceed until resolved
- Emergency change requested by executive — out-of-process escalation

**External Events (any phase)**
- Regulatory change: all data must be stored in-country — scope TBC
- Key supplier entered administration — alternative needed within 1 week
- Client organisation being acquired — project continuity uncertain
- Force majeure event — site access suspended for 2 weeks

**Agile-specific Events (methodology: agile)**
- Sprint velocity 40% below forecast — Scrum Master raises blocker
- Product Owner changed sprint priorities mid-sprint
- Retrospective identified critical team process issue
- Stakeholder demanding feature outside current sprint scope

**Escalation Events (auto-generated when overdue)**
- Sponsor escalation: "PM has not responded to my request in 3 days"
- Programme Board notified of unresolved critical risk
- Assurance has flagged PM inactivity to Project Board

---

## Addition A: Simulation Clock System

### How the Clock Works
- Each simulation run has a `sim_day` counter starting at 1
- The clock advances **explicitly** — user clicks "Advance to Next Day" on the dashboard
  - This is deliberate: forces user to process events before moving on (like taking a chess turn)
- Each clock tick: 1 sim day = maps to real project time based on scenario duration
  - e.g., Scenario A (540 days) means sim day 1 = real project day 1
- **Phase boundaries** are defined by sim day ranges:
  - Initiation: days 1–30 | Planning: 31–120 | Execution: 121–480 | Closure: 481–540
- Each tick triggers `tickSimulationClock()`:
  1. Advance `sim_day` and `sim_date`
  2. Log `sim_clock_ticks` row
  3. Call `generateNextEvents()` (checks if any templates are due)
  4. Call `updateEVMSnapshot()` (recalculate EV/AC/PV)
  5. Call `applyNPCAutonomousActions()` (NPCs update work packages, submit reports)
  6. Call `autoEscalateOverdueEvents()` (check response_deadline breaches)
  7. Check `active_stage` vs phase boundary — prompt stage gate if boundary reached

### Clock UI on Dashboard
- Prominent "**Day N of N**" counter with simulated calendar date
- **"Advance Day"** button (disabled if critical events are unresolved)
- Progress bar showing % through current phase

---

## Addition B: Work Performance Data (WPD) & EVM

### What Gets Seeded Per Scenario
Each scenario's `scenario_seed_data` includes:
- **`evm_baseline`**: BCWS (Planned Value) curve — an array of `{sim_day, pv}` data points covering the full project duration
- **`work_packages`**: 6–12 work packages per scenario with: name, owner_npc_role, planned_start_day, planned_end_day, planned_cost, baseline_% complete curve
- **`period_actuals`**: First 30 days of pre-seeded actuals (AC values) so the simulation feels mid-flight from day 1

### EVM Calculation per Clock Tick
`updateEVMSnapshot(runId)` runs on every tick:
```
EV  = sum(work_package.actual_pct_complete × work_package.planned_cost)
AC  = sum(period actuals to current sim_day)
PV  = BCWS curve value at current sim_day
CPI = EV / AC  (if AC > 0)
SPI = EV / PV  (if PV > 0)
EAC = total_budget / CPI
TCPI = (BAC - EV) / (BAC - AC)
```
Stored in `simulation_runs.evm_snapshot` JSONB and snapshotted to `sim.project_evm_snapshots`.

### WPD Dashboard Panel
New component `SimEVMPanel.jsx` on the run dashboard:
- S-curve chart (PV vs EV vs AC over sim days)
- CPI / SPI gauges (green ≥ 0.9, amber ≥ 0.75, red < 0.75)
- EAC vs Budget-at-Completion
- Period spend table (last 5 sim weeks of actuals vs planned)

---

## Addition C: Stage Gate & Exception Report Workflow

### Stage Gate Process
When `sim_day` reaches a phase boundary, the system:
1. **Blocks "Advance Day"** — user cannot proceed past boundary
2. Calls `checkPhaseGateCompliance(runId, fromPhase, toPhase)` — verifies required artefacts (see `sim.phase_gate_requirements`)
3. Shows **`SimStageGateReview.jsx`** — a formal review page where:
   - PM sees the artefact compliance checklist
   - PM reads the End Stage Report (auto-drafted from practice_* data, editable)
   - PM submits the report to Project Board NPCs
4. Project Board NPCs review (scored Q&A — 3–5 questions from board members via EventModal)
5. Board NPC renders decision: **Authorized / Rejected / Exception Required**
6. If Authorized → `advancePhase()` unlocks next phase, "Advance Day" re-enabled
7. If Rejected → PM must address issues (artefact gaps) and resubmit
8. If Exception → triggers Exception Report workflow (see below)

### Required Artefacts per Phase Gate (phase_gate_requirements seed data)

| Gate | Artefact | Status Required |
|------|----------|----------------|
| Initiation → Planning | `practice_project_briefs` | approved |
| Initiation → Planning | `practice_business_cases` | submitted |
| Planning → Execution | `practice_pids` | approved |
| Planning → Execution | `practice_project_plans` | approved |
| Planning → Execution | `practice_risks` (RMS) | has_entries |
| Execution → Closure | All `practice_work_packages` | complete |
| Execution → Closure | `practice_end_stage_reports` | submitted |
| Any → Any (Agile) | Sprint Retrospective | submitted |

### Exception Report Workflow
Triggered automatically when any health metric hits a red threshold (< 50):
1. System sets `simulation_runs.tolerance_breached = TRUE`
2. Blocks further phase advancement and day ticking
3. Surfaces `SimExceptionReportFlow.jsx`:
   - PM must acknowledge the tolerance breach
   - PM completes the Exception Report form (impact, options, recommendation)
   - Submits to Project Board NPC
4. Board NPC responds (scored): Approve Revised Plan / Escalate / Close Project
5. If approved: tolerance reset, simulation continues with adjusted baseline
6. If close project: simulation ends early → debrief triggered

---

## Addition D: Escalation Scheduler

### Auto-Escalation Logic
`autoEscalateOverdueEvents(runId)` runs every clock tick:

```
For each unresolved ai_event where response_deadline < current sim_date:
  1. Apply deterioration JSONB from npc_event_templates to project_health
     e.g. {team_morale: -5, stakeholder_satisfaction: -3}
  2. Mark ai_event.auto_deteriorated = TRUE
  3. If escalation_template_code is set on the template:
     → Insert new ai_event from that escalation template (higher severity)
     → Mark original event.escalated = TRUE
  4. If no escalation template: mark event resolved with score = 0 (missed)
```

### Deterioration Rates (default, overridable per template)
| Severity | Daily deterioration if unanswered |
|----------|----------------------------------|
| low | -1 to one metric |
| medium | -2 to two metrics |
| high | -4 to two metrics |
| critical | -8 to three metrics, blocks day tick after 2 days |

Critical events (severity = 'critical') **block** the "Advance Day" button after 2 sim days overdue — user must respond before the simulation can progress.

---

## Addition E: User → NPC Actions

### User-Initiated Action Types

| Action | Description | NPC Reactor | Scored? |
|--------|-------------|-------------|---------|
| Submit Highlight Report | PM submits periodic status report | Sponsor NPC | Yes — timeliness + completeness |
| Request Status Update | PM asks Team Manager for WP progress | Team Manager NPC | No — NPC auto-replies |
| Delegate Work | PM assigns a task to Team Manager | Team Manager NPC | Yes — appropriate delegation |
| Request Approval | PM asks Sponsor/Board to approve artefact | Sponsor / Board NPC | Yes — linked to stage gate |
| Submit Exception Report | PM formally notifies board of tolerance breach | Board NPCs | Yes — quality scored |
| Send General Message | PM communicates with any NPC | Target NPC | No |

### UI: `SimNPCMessageComposer.jsx`
- Accessible from NPC Team Panel — click any NPC → "Send Message" button
- Dropdown: select action type
- Subject + body fields
- "Attach Artefact" — link a specific practice artefact (report, plan, risk)
- On submit: creates `npc_user_messages` row; calls Edge Function to generate NPC reply
- NPC reply appears in Activity Feed within 1–2 sim days

### Highlight Report Scoring
- Sponsor NPC expects a Highlight Report every N sim days (set per scenario, default 14)
- If report not submitted on time: `stakeholder_satisfaction` -5 per overdue period
- When submitted: NPC reads it and responds (EventModal-style Q&A — 2 questions)
- Score based on: timeliness (50%), content completeness (50%)

---

## Addition F: Phase Gate Validator

### `checkPhaseGateCompliance(runId, fromPhase, toPhase)`
Service function in `simRunStateService.js`:

```
1. Load all phase_gate_requirements for (fromPhase → toPhase, methodology)
2. For each requirement:
   a. If requirement_type = 'artefact':
      → query sim.[artefact_table] WHERE practice_project_id = run.practice_project_id
      → check artefact_status_field = artefact_status_required
   b. If requirement_type = 'score':
      → check module_scores for minimum threshold
   c. If requirement_type = 'event':
      → check specific event type has been resolved
3. Return { canAdvance: boolean, missing: [{description, is_mandatory}] }
```

### Phase Gate Checklist UI (inside `SimStageGateReview.jsx`)
- Checklist of all requirements with green tick / red cross per item
- Mandatory items missing = cannot submit for board review
- Optional items missing = warning only, can proceed with justification
- Link to each missing artefact — user can create/complete it directly from this screen
- "Create Missing Artefact" shortcut buttons for each gap

---

## NPC Autonomous Actions

NPCs perform the following actions independently each sim day (appear in Activity Feed only — no user response required unless they trigger a health threshold):

| NPC Role | Autonomous Action | Frequency |
|----------|------------------|-----------|
| Team Manager | Update work package % complete | Every 3 sim days |
| Team Manager | Submit checkpoint report | Every 7 sim days |
| QA / Quality Assurance | Submit quality review result | After each work package completion |
| Change Authority | Log change request decisions | When CR pending > 5 days |
| Assurance | Log compliance observation | Every 14 sim days |
| Team Member | Log daily log entry | Every sim day (batch) |
| Stakeholder | Escalate engagement issue | If engagement level < 40% |

All autonomous actions are recorded in `sim.npc_autonomous_actions` and reflected in the Activity Feed.

---

## Methodology Support

### Traditional / Structured
- Phase progression: Initiation → Planning → Execution (Stages 1…N) → Closure
- Formal stage gates, End Stage Reports, Exception Reports
- Checkpoint Reports from Team Managers
- Highlight Reports to Sponsor/Board
- Change Authority approval for all changes

### Agile (Scrum)
- Phase progression: Sprint 0 (Setup) → Sprint 1…N → Sprint Review → Retrospective → Release
- Stage gates replaced by **Sprint Reviews** (lighter — scored Q&A with Product Owner NPC)
- No Checkpoint Reports; instead: Daily Standup log (auto-generated by Team Manager NPC)
- Change Authority replaced by **Product Owner NPC** who manages backlog prioritization
- Velocity tracking replaces EVM (though EVM still calculated in background)
- Exception Reports replaced by Sprint Impediment Escalation

### Hybrid
- Stages for governance (Initiation, Planning, Deployment) with Agile delivery sprints inside Execution
- Full stage gates at stage boundaries, Sprint Reviews inside execution
- Both EVM and velocity tracked

---

## New Services

### `simRunBootstrapService.js` (NEW)
```
startSimulationRun({ scenarioId, userRole, methodology, difficulty, userId })
  → creates simulation_runs row
  → assigns NPC characters (assignNPCCharacters)
  → creates practice_project from scenario seed data (seedProjectArtefacts)
  → seeds EVM baseline and period actuals (seedWPDData)
  → seeds phase_gate_requirements for methodology
  → returns { runId, practiceProjectId, npcAssignments }

assignNPCCharacters(runId, userRole)
  → picks named NPC for each non-user role
  → inserts npc_run_assignments rows

seedProjectArtefacts(practiceProjectId, scenarioId)
  → reads scenario_seed_data rows
  → inserts practice_risks, stakeholders, work_packages, briefs, etc.

seedWPDData(practiceProjectId, scenarioId, runId)
  → reads evm_baseline and period_actuals seed payloads
  → inserts into sim.project_evm_snapshots (baseline curve)
  → pre-populates sim_day 1–30 actuals
```

### `simNPCEngineService.js` (NEW)
```
getPendingEvents(runId)
  → returns unresolved ai_events joined with npc_characters

generateNextEvents(runId, triggerContext)
  → filters templates by phase, methodology, cooldown, weight
  → respects tolerance_breached (escalation templates only if breached)
  → inserts ai_events rows

scoreEventResponse(eventId, selectedOptionIndex)
  → reads options[selectedOptionIndex]
  → updates response_score, feedback, user_response, selected_option_index
  → calls applyHealthImpact()
  → awards module_scores entry
  → calls generateNextEvents() for follow-up events

resolveEvent(eventId, optionIndex)
  → calls scoreEventResponse → marks is_resolved = true

autoEscalateOverdueEvents(runId)
  → applies deterioration, inserts escalation events, marks missed events

applyNPCAutonomousActions(runId)
  → checks npc_autonomous_actions schedule per sim_day
  → updates practice_work_packages completion %
  → inserts checkpoint_reports, quality_reviews, daily_log_entries
  → logs to sim.npc_autonomous_actions

tickSimulationClock(runId)
  → advances sim_day, logs sim_clock_ticks
  → calls: generateNextEvents, updateEVMSnapshot,
           applyNPCAutonomousActions, autoEscalateOverdueEvents
  → checks phase boundary → prompts stage gate if reached
```

### `simRunStateService.js` (NEW)
```
applyHealthImpact(runId, impact)
  → clamps budget_pct, quality_score, team_morale, stakeholder_satisfaction 0–100
  → schedule_variance_days is unbounded
  → updates simulation_runs.project_health

updateEVMSnapshot(runId)
  → calculates EV, AC, PV, CPI, SPI, EAC, TCPI
  → updates simulation_runs.evm_snapshot
  → inserts sim.project_evm_snapshots snapshot row

advancePhase(runId, newPhase)
  → calls checkPhaseGateCompliance first
  → if compliant: updates active_stage, triggers phase events
  → if not: returns { blocked: true, missing: [...] }

checkPhaseGateCompliance(runId, fromPhase, toPhase)
  → validates all phase_gate_requirements
  → returns { canAdvance, missing }

completeRun(runId)
  → sets status = 'completed', completed_at
  → computes final_score
  → awards badges/certificates
  → creates ai_debriefs record

handleToleranceBreach(runId, metric, value)
  → sets tolerance_breached = TRUE
  → blocks clock tick
  → triggers Exception Report workflow
```

### `simStageGateService.js` (NEW)
```
createStageGateReview(runId, stageName, reviewType)
  → inserts stage_gate_reviews row
  → generates board Q&A questions (from npc_event_templates where category = 'stage_gate')

submitStageGateReview(reviewId, endStageReportId)
  → links report to review
  → triggers board NPC Q&A (EventModal sequence)

recordBoardDecision(reviewId, decision, score)
  → updates stage_gate_reviews with decision
  → if authorized: calls advancePhase()
  → if exception: calls handleToleranceBreach()
  → if rejected: returns feedback list for PM to address
```

### `simNPCMessageService.js` (NEW)
```
sendMessageToNPC(runId, npcCharacterId, messageType, subject, body, linkedArtefact)
  → inserts npc_user_messages row
  → calls Edge Function 'npc-respond' with context (role, personality, artefact data)
  → schedules NPC response within 1–2 sim days

scoreHighlightReportSubmission(runId, reportId)
  → checks timeliness (days since last report vs expected frequency)
  → checks content completeness (key fields populated)
  → returns score + feedback

getOverdueHighlightReports(runId)
  → returns periods where highlight report was not submitted on time
```

---

## New Pages

### 1. `SimulationSetup.jsx` — `/simulator/run/setup`
Multi-step wizard:
1. **Choose Methodology** — Traditional / Agile / Hybrid (with description of how each affects the simulation)
2. **Choose Your Role** — card grid per methodology (Agile: Scrum Master, Product Owner, Dev Lead; Traditional: PM, Sponsor, Assurance)
3. **Pick a Scenario** — 3 built-in + custom; shows industry, difficulty, duration, methodology tag
4. **Select Difficulty** — Easy / Standard / Hard / Expert (affects event frequency, deterioration speed, scoring strictness)
5. **Meet Your Team** — NPC cards assigned to other roles; shows name, personality, communication style
6. **Launch** — calls `startSimulationRun()`, redirects to dashboard

### 2. `SimulationRunDashboard.jsx` — `/simulator/run/:runId/dashboard`
Main HUD sections:
- **Day Counter + Advance Day button** (disabled if critical events unresolved or stage gate pending)
- **Project Health Gauges** — 5 colour-coded metrics (green/amber/red)
- **EVM Summary Panel** — CPI, SPI, EAC vs BAC (link to full EVM detail)
- **Stage Progress Bar** — current stage, % through stage, gate status
- **Event Inbox Badge** — count of pending events by severity
- **NPC Team Panel** — avatars with mood indicators
- **Activity Feed** — chronological: NPC actions, resolved events, user submissions
- **Quick Actions** — Submit Highlight Report, Raise Risk, View Schedule, View Budget
- **Coaching Hint** — surfaces `ai_coach_events` hints

### 3. `SimEventInbox.jsx` — `/simulator/run/:runId/inbox`
- Sort by: severity, date, NPC role, overdue status
- Filter: pending / resolved / escalated / all
- Each row: NPC avatar, role, event title, severity badge, sim day received, overdue indicator
- Click → opens `EventModal.jsx` for response
- Critical events highlighted with pulsing border

### 4. `SimStageGateReview.jsx` — `/simulator/run/:runId/stage-gate/:stageName`
- Artefact compliance checklist (green tick / red cross)
- "Create Missing Artefact" shortcuts
- End Stage Report form (pre-filled, editable)
- Submit to Board button → triggers board Q&A sequence (EventModal)
- Board decision display (Authorized / Rejected / Exception)

### 5. `SimExceptionReportFlow.jsx` — `/simulator/run/:runId/exception`
- Tolerance breach banner (which metric, current vs threshold)
- Exception Report form: situation, impact, options considered, recommendation
- Submit to Board button → board NPC responds
- Decision: approve revised plan / escalate / close

### 6. `SimEVMDashboard.jsx` — `/simulator/run/:runId/evm`
- S-curve chart: PV vs EV vs AC over sim days
- CPI / SPI trend chart
- EAC vs BAC with variance
- Period actuals table (last 5 sim weeks)
- Work package completion % table (NPC-updated)

### 7. `SimNPCMessageComposer.jsx` — component
- Action type dropdown (Submit Report, Request Update, Delegate, etc.)
- Subject + body
- Attach artefact picker
- NPC response display (AI-generated, appears after 1–2 sim days)

### 8. `SimulationRunHistory.jsx` — `/simulator/runs`
- Table of all past runs (scenario, role, score, date, methodology)
- Click → view debrief for that run
- Replay button (view decisions in read-only mode)

### 9. `SimulationDebrief.jsx` — `/simulator/run/:runId/debrief`
- Overall Score (circle gauge out of 1000)
- Category Breakdown (Risk, Stakeholder, Quality, Budget, Decisions, Timeliness)
- EVM Final State (CPI, SPI at closure)
- Decision Review — all events: chosen vs optimal option + score delta
- Project Health final gauges
- Stage Gate Results (board decisions per stage)
- Learning Outcomes — skills exercised mapped to competency framework
- Badges Earned
- AI Recommendations on weakest areas (Edge Function call)
- Export to PDF

---

## Phase Progression & Event Trigger Logic

### Traditional
```
Stage 0 – Initiation (sim days 1–30)
  NPC: Sponsor welcome briefing
  NPC: Assurance requests Project Brief draft
  NPC: 2–3 low severity events (resource, stakeholder)
  Gate: Project Brief approved + Business Case submitted
  → Board authorizes Planning stage

Stage 1 – Planning (sim days 31–120)
  NPC: Team Manager raises resource conflicts
  NPC: Assurance requests Risk Register entries
  NPC: Change Authority challenges scope assumptions
  NPC: Sponsor challenges budget baseline
  NPC: Checkpoint reports begin (every 7 days)
  Gate: PID approved + Project Plan approved + RMS in place
  → Board authorizes Stage 1 execution

Stage 2–N – Execution (sim days 121–480)
  NPC: 2–4 active events at a time; medium-high severity
  NPC: Team Manager: WP progress updates autonomously
  NPC: QA: quality reviews after each WP completion
  NPC: Sponsor: requests Highlight Reports every 14 days
  NPC: Escalations if health metrics fall to amber/red
  NPC: Tolerance breach → Exception Report mandatory
  End Stage gates between each execution stage

Stage Final – Closure (sim days 481–540)
  NPC: Team Manager submits final checkpoint report
  NPC: Assurance requests Lessons Log review
  NPC: Sponsor requests benefits handover plan
  NPC: Change Authority: close all CRs
  Gate: All WPs complete + End Project Report submitted
  → Board authorizes project closure
```

### Agile (Scrum)
```
Sprint 0 – Setup (sim days 1–14)
  Backlog grooming with Product Owner NPC
  Team capacity planning with Scrum Master NPC
  Definition of Done agreed

Sprint 1–N – Delivery (14 sim days each)
  Daily standup log from Team Manager NPC (every sim day)
  Impediment escalations from Scrum Master NPC
  Sprint Review with stakeholders (end of sprint — scored Q&A)
  Sprint Retrospective (PM/SM facilitate — scored self-assessment)
  Velocity tracked; forecast vs actual burn-down

Release – Closure
  Acceptance testing sign-off (QA NPC)
  Release notes (PM submits to Sponsor NPC)
  Retrospective on overall project
```

---

## Scoring Model

| Category | Max Points | Basis |
|----------|-----------|-------|
| Risk Management | 150 | Event response scores (risk/schedule category) |
| Stakeholder Management | 150 | Event scores (stakeholder/communication) |
| Quality | 100 | Event scores (quality/team) + quality_score at closure |
| Budget Control | 100 | CPI at closure + budget_pct |
| Schedule Control | 100 | SPI at closure + schedule_variance_days |
| Stage Gates | 150 | Board decision scores across all gates |
| Decision Quality | 150 | Average response_score across all events |
| Timeliness | 50 | Events within response_deadline + Highlight Reports on time |
| Escalation Avoidance | 50 | Penalty: -10 per escalated event, -20 per missed critical |
| **Total** | **1000** | |

Difficulty modifiers: Easy ×0.8, Standard ×1.0, Hard ×1.2, Expert ×1.5

---

## SQL Files to Create

| File | Contents |
|------|----------|
| `SQL/v540_sim_npc_characters.sql` | `sim.npc_characters` + 9 seed characters |
| `SQL/v541_sim_npc_event_templates.sql` | `sim.npc_event_templates` + 200+ seed events (all methodologies) |
| `SQL/v542_sim_npc_run_assignments.sql` | `sim.npc_run_assignments` + `sim.npc_autonomous_actions` + RLS |
| `SQL/v543_sim_scenario_seed_data.sql` | `sim.scenario_seed_data` + 3 scenario payloads (incl. WPD + EVM baselines) |
| `SQL/v544_sim_simulation_runs_extend.sql` | ALTER simulation_runs: user_role, methodology, evm_snapshot, sim_day, active_stage, tolerance_breached |
| `SQL/v545_sim_ai_events_extend.sql` | ALTER ai_events: npc fields, escalation tracking |
| `SQL/v546_sim_clock_and_gates.sql` | `sim.sim_clock_ticks` + `sim.phase_gate_requirements` + `sim.stage_gate_reviews` + seed gate requirements |
| `SQL/v547_sim_npc_messaging.sql` | `sim.npc_user_messages` + RLS |
| `SQL/v548_sim_npc_rls_policies.sql` | RLS for all new tables |
| `SQL/v549_sim_built_in_scenarios_seed.sql` | 3 built-in scenario rows + complete seed payloads |

---

## Frontend Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/simulator/SimulationSetup.jsx` | NEW – 6-step wizard |
| `src/pages/simulator/SimulationRunDashboard.jsx` | NEW – HUD with clock, health, EVM, inbox |
| `src/pages/simulator/SimEventInbox.jsx` | NEW – event list |
| `src/pages/simulator/SimStageGateReview.jsx` | NEW – stage gate compliance + board Q&A |
| `src/pages/simulator/SimExceptionReportFlow.jsx` | NEW – tolerance breach + exception report |
| `src/pages/simulator/SimEVMDashboard.jsx` | NEW – S-curve, CPI/SPI, WP actuals |
| `src/pages/simulator/SimulationRunHistory.jsx` | NEW – past runs table |
| `src/pages/simulator/SimulationDebrief.jsx` | NEW – end-of-run debrief |
| `src/components/sim/SimNPCTeamView.jsx` | NEW – NPC card grid |
| `src/components/sim/SimHealthGauges.jsx` | NEW – 5 metric gauges |
| `src/components/sim/SimPhaseProgressBar.jsx` | NEW – phase + stage breadcrumb |
| `src/components/sim/SimEVMPanel.jsx` | NEW – mini EVM summary widget |
| `src/components/sim/SimNPCMessageComposer.jsx` | NEW – user→NPC message composer |
| `src/components/sim/SimActivityFeed.jsx` | NEW – chronological activity feed |
| `src/services/sim/simRunBootstrapService.js` | NEW – run setup + seed data + WPD |
| `src/services/sim/simNPCEngineService.js` | NEW – NPC engine (events, clock, escalation, autonomous) |
| `src/services/sim/simRunStateService.js` | NEW – health, EVM, phase gate, tolerance |
| `src/services/sim/simStageGateService.js` | NEW – stage gate reviews + board decisions |
| `src/services/sim/simNPCMessageService.js` | NEW – user→NPC messaging + scoring |
| `src/App.jsx` | Add 8 new routes |
| `src/config/simulatorMenuConfig.js` | Add "Live Simulation" section |

---

## Routes to Register in App.jsx

```
/simulator/run/setup                          → SimulationSetup
/simulator/run/:runId/dashboard               → SimulationRunDashboard
/simulator/run/:runId/inbox                   → SimEventInbox
/simulator/run/:runId/stage-gate/:stageName   → SimStageGateReview
/simulator/run/:runId/exception               → SimExceptionReportFlow
/simulator/run/:runId/evm                     → SimEVMDashboard
/simulator/run/:runId/debrief                 → SimulationDebrief
/simulator/runs                               → SimulationRunHistory
```

---

## Menu Integration (simulatorMenuConfig.js)

Add a new top-level section **"Live Simulation"** (order: 1, before all others):
```js
{
  id: 'sim-live-simulation',
  label: 'Live Simulation',
  section: 'Live Simulation',
  icon: Play,
  children: [
    { label: 'Start New Run',        path: '/simulator/run/setup',           icon: PlayCircle },
    { label: 'Active Run Dashboard', path: '/simulator/run/active/dashboard', icon: LayoutDashboard },
    { label: 'Event Inbox',          path: '/simulator/run/active/inbox',     icon: Inbox },
    { label: 'EVM Dashboard',        path: '/simulator/run/active/evm',       icon: TrendingUp },
    { label: 'My Run History',       path: '/simulator/runs',                 icon: History },
  ]
}
```
`/simulator/run/active/*` → server-side redirect to user's most recent `in_progress` run ID.

---

## Unit Tests

| Test File | Covers |
|-----------|--------|
| `src/services/sim/__tests__/simNPCEngineService.test.js` | `getPendingEvents` success/error paths |
| `src/services/sim/__tests__/simRunBootstrapService.test.js` | `assignNPCCharacters` inserts NPC rows except user role |
| `src/services/sim/__tests__/simRunStateService.test.js` | Health merge/clamp, PV interpolation, EVM metric math |
| `src/services/sim/__tests__/simStageGateService.test.js` | Gate creation insert chain; `submitStageGateReview` update |
| `src/services/sim/__tests__/simNPCMessageService.test.js` | Highlight report scoring (timeliness vs late) |
| `src/pages/simulator/__tests__/SimulationSetup.test.jsx` | Wizard heading + step navigation |
| `src/pages/simulator/__tests__/SimEventInbox.test.jsx` | Inbox render + pending/resolved filter |
| `src/pages/simulator/__tests__/SimStageGateReview.test.jsx` | Compliance checklist + refresh reload |

---

## Complete Todo List

### Phase 1 – Database (apply SQL in Supabase first)
- [x] **1.1** `SQL/v540_sim_npc_characters.sql` — table + 9 seed characters
- [x] **1.2** `SQL/v541_sim_npc_event_templates.sql` — table + 200+ events (all methodologies, with escalation + deterioration fields)
- [x] **1.3** `SQL/v542_sim_npc_run_assignments.sql` — run_assignments + autonomous_actions tables + RLS
- [x] **1.4** `SQL/v543_sim_scenario_seed_data.sql` — table + 3 scenario payloads (project_brief, team, risks, stakeholders, work_packages, evm_baseline, period_actuals, lessons_starters)
- [x] **1.5** `SQL/v544_sim_simulation_runs_extend.sql` — ALTER: user_role, methodology, evm_snapshot, sim_day, active_stage, tolerance_breached
- [x] **1.6** `SQL/v545_sim_ai_events_extend.sql` — ALTER: npc_character_id, escalation fields
- [x] **1.7** `SQL/v546_sim_clock_and_gates.sql` — sim_clock_ticks + phase_gate_requirements + stage_gate_reviews + seed gate requirements (all methodologies)
- [x] **1.8** `SQL/v547_sim_npc_messaging.sql` — npc_user_messages table + RLS
- [x] **1.9** `SQL/v548_sim_npc_rls_policies.sql` — RLS for all new tables
- [x] **1.10** `SQL/v549_sim_built_in_scenarios_seed.sql` — 3 scenario rows + full seed payloads

### Phase 2 – Backend Services
- [x] **2.1** `simRunBootstrapService.js` — startSimulationRun, assignNPCCharacters, seedProjectArtefacts, seedWPDData
- [x] **2.2** `simNPCEngineService.js` — getPendingEvents, generateNextEvents, scoreEventResponse, resolveEvent, autoEscalateOverdueEvents, applyNPCAutonomousActions, tickSimulationClock (`tickSimulationClock` calls `updateEVMSnapshot` from run state)
- [x] **2.3** `simRunStateService.js` — applyHealthImpact (alias), updateEVMSnapshot, advancePhase, checkPhaseGateCompliance, completeRun, handleToleranceBreach
- [x] **2.4** `simStageGateService.js` — createStageGateReview, submitStageGateReview, recordBoardDecision
- [x] **2.5** `simNPCMessageService.js` — sendMessageToNPC, scoreHighlightReportSubmission, getOverdueHighlightReports

### Phase 3 – New Components
- [x] **3.1** `SimHealthGauges.jsx` — 5 metric gauges with colour thresholds
- [x] **3.2** `SimNPCTeamView.jsx` — NPC card grid with mood indicators
- [x] **3.3** `SimPhaseProgressBar.jsx` — stage breadcrumb with gate status
- [x] **3.4** `SimEVMPanel.jsx` — mini EVM widget (CPI, SPI, EAC vs BAC)
- [x] **3.5** `SimNPCMessageComposer.jsx` — user→NPC message + artefact attach
- [x] **3.6** `SimActivityFeed.jsx` — chronological feed (events, NPC actions, user submissions)

### Phase 4 – New Pages
- [x] **4.1** `SimulationSetup.jsx` — 6-step wizard (methodology → role → scenario → difficulty → team → launch)
- [x] **4.2** `SimulationRunDashboard.jsx` — HUD (clock, health, EVM, inbox badge, team, feed, quick actions)
- [x] **4.3** `SimEventInbox.jsx` — event list with filters, opens EventModal
- [x] **4.4** `SimStageGateReview.jsx` — artefact checklist + board Q&A + decision
- [x] **4.5** `SimExceptionReportFlow.jsx` — tolerance breach acknowledgement + exception report + board decision
- [x] **4.6** `SimEVMDashboard.jsx` — S-curve chart, CPI/SPI trend, period actuals, WP table
- [x] **4.7** `SimulationRunHistory.jsx` — past runs table with debrief links
- [x] **4.8** `SimulationDebrief.jsx` — full debrief (score, categories, EVM, decisions, stages, badges, recommendations)

### Phase 5 – Routing & Menu
- [x] **5.1** Register 8 new routes in `src/App.jsx`
- [x] **5.2** Add "Live Simulation" section to `simulatorMenuConfig.js`
- [x] **5.3** Add "Start Simulation" CTA to `SimulatorHomepage.jsx`
- [x] **5.4** Add `/simulator/run/active/*` redirect logic (latest in_progress run)

### Phase 6 – Unit Tests
- [x] **6.1** `simNPCEngineService.test.js`
- [x] **6.2** `simRunBootstrapService.test.js`
- [x] **6.3** `simRunStateService.test.js`
- [x] **6.4** `simStageGateService.test.js`
- [x] **6.5** `simNPCMessageService.test.js`
- [x] **6.6** `SimulationSetup.test.jsx`
- [x] **6.7** `SimEventInbox.test.jsx`
- [x] **6.8** `SimStageGateReview.test.jsx`

---

## Review

**Implemented (2026-05-10):** SQL migrations `v540`–`v549`, simulator services (`simRunBootstrapService`, `simNPCEngineService`, `simRunStateService`, `simStageGateService`, `simNPCMessageService`), UI components under `src/components/sim/`, pages under `src/pages/simulator/`, routes in `src/App.jsx`, Live Simulation menu in `simulatorMenuConfig.js`, homepage CTA to `/simulator/run/setup`, and Vitest coverage under `src/services/sim/__tests__/` and `src/pages/simulator/__tests__/`.

**Deploy / verify:** Apply SQL to Supabase in numeric order before relying on the UI. Smoke-test RLS with your auth simulator pattern (`simulation_runs.user_id`). Critical/overdue event blocking and full NPC AI replies remain MVP-level where noted in code comments.

**Doc:** Phase 1 checklist uses **1.4** for `v543_sim_scenario_seed_data.sql` (the earlier draft duplicated **1.3**).
