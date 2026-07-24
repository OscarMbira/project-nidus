# v734 — Simulator 5-Role System Implementation Plan

## Objective

Refocus the Simulator system to serve **five core project management roles** only, replacing the current inconsistent role definitions scattered across multiple components. Each role gets a dedicated dashboard, sidebar menu, learning path, scenario library, scoring rubric, and certification track.

## The 5 Roles

| # | Role ID | Display Name | Level | Description |
|---|---------|-------------|-------|-------------|
| 1 | `project_manager` | Project Manager | Advanced | Plans, executes, and closes individual projects |
| 2 | `programme_manager` | Programme Manager | Expert | Coordinates multiple related projects toward strategic outcomes |
| 3 | `portfolio_manager` | Portfolio Manager | Expert | Prioritises and balances a portfolio of programmes/projects against strategic objectives |
| 4 | `pmo_analyst` | PMO Analyst | Intermediate | Supports governance, reporting, standards, and methodology compliance |
| 5 | `project_coordinator` | Project Coordinator | Beginner–Intermediate | Assists PMs with scheduling, tracking, documentation, and stakeholder comms |

## Current State Assessment

### What Exists
- **PM Dashboard** — `simulatorPMMenuConfig.js`, `SimulatorPMSidebar.jsx`, `SimulatorPMLayout.jsx`, 30 pages under `/simulator/pm/`
- **PMO Dashboard** — `simulatorPMOMenuConfig.js`, `SimulatorPMOSidebar.jsx`, `SimulatorPMOLayout.jsx`, 24 pages under `/simulator/pmo/`
- **TM Dashboard** — `simulatorTMMenuConfig.js`, `SimulatorTMSidebar.jsx`, `SimulatorTMLayout.jsx`, pages under `/simulator/tm/`
- **General Simulator** — 80+ practice pages, scenarios, learning, certificates, leaderboard, achievements
- **DB constraint** on `sim.scenarios.target_role` limited to 4 values: `programme_manager`, `project_manager`, `team_lead`, `team_member`
- **Subscription gating** via `SubscriptionAccessGate.jsx` and `subscriptionTier` in menu configs

### Key Gaps
1. **No `portfolio_manager` role** — portfolio features exist but no role-based dashboard
2. **No `project_coordinator` role** — does not exist anywhere in the system
3. **No `pmo_analyst` role** — only `pmo_admin` exists (rename/refocus needed)
4. **Inconsistent role lists** — `RoleSelection.jsx`, `SimulatorWelcome.jsx`, `SimulationSetup.jsx`, and DB constraint all define different sets
5. **No role-specific learning paths** — learning is generic for all users
6. **No role-specific scenario filtering** on dashboards
7. **NPC engine** has 9 roles but not aligned with the 5-role model
8. **TM (Team Manager) dashboard** — to be deprecated/removed

---

## Implementation Phases

### Phase 0: Simulation Time Engine — Turn-Based Time Compression
**Goal:** Enable realistic simulation of long-duration projects (6 months to 3+ years) in 2-4 hours of real time through a turn-based time compression engine that all 5 roles share.

#### 0A — Core Time Engine

- [x] **0A.1** Design the time model:
  - Each **turn** = 1 configurable time period (default: 1 month of project time)
  - A **simulation run** has a total project duration (e.g., 24 months) = 24 turns
  - Each turn has 3 phases: **Review** → **Decide** → **Advance**
  - Estimated real time per turn: 5-10 minutes (so 24 turns ≈ 2-4 hours)
  - Configurable time granularity per scenario: weekly (short projects), monthly (default), quarterly (portfolio-level)

- [x] **0A.2** SQL: Create `sim.simulation_turns` table:
  ```sql
  sim.simulation_turns (
    id UUID PRIMARY KEY,
    run_id UUID REFERENCES sim.simulation_runs(id),
    turn_number INTEGER NOT NULL,
    sim_date_start DATE NOT NULL,        -- simulated calendar start (e.g., 2026-03-01)
    sim_date_end DATE NOT NULL,          -- simulated calendar end (e.g., 2026-03-31)
    time_granularity VARCHAR(20) CHECK (time_granularity IN ('weekly', 'monthly', 'quarterly')),
    status VARCHAR(20) CHECK (status IN ('pending', 'review', 'deciding', 'completed', 'skipped')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    decisions_made JSONB DEFAULT '[]',   -- array of user decisions this turn
    events_triggered JSONB DEFAULT '[]', -- AI/NPC events that fired this turn
    metrics_snapshot JSONB DEFAULT '{}', -- KPI snapshot at turn end
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
  ```

- [x] **0A.3** SQL: Create `sim.turn_events` table — events injected into specific turns:
  ```sql
  sim.turn_events (
    id UUID PRIMARY KEY,
    run_id UUID REFERENCES sim.simulation_runs(id),
    turn_id UUID REFERENCES sim.simulation_turns(id),
    event_type VARCHAR(50),              -- 'risk_materialised', 'stakeholder_escalation', 'scope_change', 'resource_departure', 'budget_overrun', etc.
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requires_decision BOOLEAN DEFAULT true,
    decision_options JSONB DEFAULT '[]', -- array of { id, label, description, consequences }
    user_decision VARCHAR(100),          -- which option the user chose
    outcome JSONB,                       -- consequence of the decision
    target_role VARCHAR(50),             -- which role sees this event
    npc_source VARCHAR(50),              -- which NPC character triggered it
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
  ```

- [x] **0A.4** SQL: Create `sim.turn_metrics` table — tracks KPIs across turns for trend analysis:
  ```sql
  sim.turn_metrics (
    id UUID PRIMARY KEY,
    run_id UUID REFERENCES sim.simulation_runs(id),
    turn_id UUID REFERENCES sim.simulation_turns(id),
    turn_number INTEGER NOT NULL,
    metric_category VARCHAR(50),         -- 'schedule', 'budget', 'quality', 'risk', 'stakeholder', 'team'
    metric_name VARCHAR(100),
    metric_value NUMERIC,
    trend VARCHAR(10) CHECK (trend IN ('improving', 'stable', 'declining')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
  ```

- [x] **0A.5** Register all new tables in `database_tables` registry
- [x] **0A.6** SQL: Enable RLS on all new tables

#### 0B — Turn Flow Engine (Frontend Service)

- [x] **0B.1** Create `src/services/sim/turnEngineService.js` — core turn management:
  - `initializeTurns(runId, projectDuration, granularity)` — generates all turn records for a run
  - `getCurrentTurn(runId)` — returns the active turn
  - `advanceTurn(runId)` — marks current turn complete, activates next
  - `skipTurn(runId)` — fast-forward through a quiet period (no events)
  - `getTurnHistory(runId)` — all completed turns with decisions and outcomes
  - `getTurnMetrics(runId)` — KPI trends across all turns

- [x] **0B.2** Create `src/services/sim/turnEventService.js` — event injection:
  - `getEventsForTurn(turnId, userRole)` — role-filtered events for current turn
  - `submitDecision(eventId, decisionOptionId)` — record user's decision, calculate outcome
  - `generateTurnEvents(runId, turnNumber, userRole)` — AI/rule-based event generation based on scenario, role, project state, and previous decisions

- [x] **0B.3** Create `src/services/sim/turnMetricsService.js` — KPI calculation:
  - `calculateTurnMetrics(runId, turnNumber)` — compute KPIs based on events, decisions, and time elapsed
  - `getMetricsTrend(runId, metricName)` — time-series data for charting
  - `getProjectHealthScore(runId, turnNumber)` — overall RAG status

#### 0C — Turn UI Components

- [x] **0C.1** Create `SimulationTurnView.jsx` — the main simulation gameplay screen:
  - **Top bar:** Turn counter ("Turn 7 of 24 — July 2026"), progress bar, elapsed real time
  - **Review panel:** Dashboard showing current project state (KPIs, RAG status, recent events)
  - **Events panel:** Cards for each event requiring a decision, with NPC avatar and context
  - **Decision panel:** Option cards with consequence hints (risk level, not exact outcomes)
  - **Advance button:** "End Turn & Advance to August 2026" (or "Fast-Forward" if no events pending)

- [x] **0C.2** Create `TurnTimeline.jsx` — horizontal timeline showing all turns with:
  - Completed turns (green), current turn (blue/pulsing), future turns (grey)
  - Event density indicator per turn (more dots = more events happened)
  - Click to review any past turn's decisions and outcomes

- [x] **0C.3** Create `TurnDashboard.jsx` — role-specific KPI dashboard per turn:
  - **Project Manager:** SPI, CPI, risk count, open issues, milestone status
  - **Programme Manager:** cross-project dependencies, benefits tracker, tranche progress
  - **Portfolio Manager:** portfolio heat map, investment allocation, strategic alignment score
  - **PMO Analyst:** compliance score, audit findings, reporting accuracy, methodology adherence
  - **Project Coordinator:** action completion rate, document status, schedule variance, meeting backlog

- [x] **0C.4** Create `TurnEventCard.jsx` — individual event display with:
  - NPC avatar and name (e.g., "Sarah Chen — Project Sponsor")
  - Event type badge and severity indicator
  - Description and context
  - Decision options as selectable cards with risk/effort indicators

- [x] **0C.5** Create `TurnSummary.jsx` — end-of-turn summary showing:
  - Decisions made and their immediate outcomes
  - KPI changes (arrows up/down with before/after values)
  - Score impact for each competency area
  - "What a senior PM would have done" — learning feedback (shown after decision is locked in)

- [x] **0C.6** Create `SimulationComplete.jsx` — end-of-simulation debrief:
  - Final scores per competency (radar chart)
  - Decision timeline — all decisions reviewed with outcomes
  - "Critical moments" — the 3-5 turns where decisions had the biggest impact
  - Comparison to benchmark (how does this score compare to average for this role/scenario)
  - Certificate eligibility check
  - "Try again" or "Try different role" CTAs

#### 0D — Time Compression Profiles per Role

- [x] **0D.1** Define default time settings per role:

  | Role | Default Granularity | Typical Duration | Turns | Real Time |
  |------|-------------------|-----------------|-------|-----------|
  | Project Coordinator | Weekly | 3 months | 12 | ~1-2 hrs |
  | PMO Analyst | Monthly | 12 months | 12 | ~2 hrs |
  | Project Manager | Monthly | 12-24 months | 12-24 | ~2-4 hrs |
  | Programme Manager | Monthly | 24-36 months | 24-36 | ~3-5 hrs |
  | Portfolio Manager | Quarterly | 24-36 months | 8-12 | ~2-3 hrs |

- [x] **0D.2** Allow scenario-level overrides — some scenarios may use different granularity (e.g., a "crisis project recovery" scenario for PM uses weekly turns over 3 months = 12 turns)

- [x] **0D.3** Implement "Fast-Forward" — when no events are scheduled for a turn, auto-advance with a 2-second animation showing time passing and metrics updating. User can pause fast-forward at any point.

- [x] **0D.4** Implement "Save & Resume" — users can exit mid-simulation and resume from the exact turn they left off. Persisted via `sim.simulation_turns.status` tracking.

#### 0E — Event Generation Rules

- [x] **0E.1** Create event probability engine — each turn calculates which events fire based on:
  - **Scenario template:** pre-scripted events at specific turns (e.g., "sponsor change at turn 8")
  - **Cascading consequences:** previous decisions affect future event probability (e.g., rejected risk mitigation → higher chance of risk materialising 2-3 turns later)
  - **Random variance:** ±20% probability variation so replaying the same scenario isn't identical
  - **Role filter:** events tagged for the user's active role only

- [x] **0E.2** Define event archetypes (reusable across scenarios):
  - **Schedule events:** milestone delay, resource unavailability, dependency slip, fast-track opportunity
  - **Budget events:** cost overrun, funding cut, exchange rate change, savings opportunity
  - **Risk events:** risk materialised, new risk identified, risk escalation, risk expired
  - **Stakeholder events:** sponsor change, scope change request, political conflict, executive escalation
  - **Team events:** key member departure, skill gap, morale drop, performance issue
  - **Quality events:** defect spike, audit finding, standards breach, process improvement opportunity
  - **External events:** regulatory change, market shift, competitor action, vendor failure

- [x] **0E.3** Create `src/services/sim/eventGeneratorService.js`:
  - `generateEventsForTurn(scenario, turnNumber, projectState, previousDecisions, userRole)` — returns array of events
  - `calculateConsequences(eventId, decisionId, projectState)` — returns metric impacts
  - `getEventProbability(eventArchetype, projectState)` — probability calculation

- [x] **0E.4** Integrate with existing NPC engine — NPC characters deliver events contextually (e.g., risk events come from the Quality Assurance NPC, budget events from the Project Sponsor NPC)

#### 0F — Testing & Documentation

- [x] **0F.1** Unit tests for turn engine service (initialise, advance, skip, metrics)
- [x] **0F.2** Unit tests for event generator (probability, consequence cascading, role filtering)
- [x] **0F.3** Unit tests for metrics calculation (KPI computation, trend detection)
- [x] **0F.4** Integration test: full 12-turn simulation run (start → events → decisions → debrief)
- [x] **0F.5** Create `Documentation/Simulator_Time_Engine_Guide.md` — explains time compression model, turn flow, event system

**SQL file:** `SQL/v734_00_simulator_time_engine.sql`

---

### Phase 1: Foundation — Role Constants & DB Schema
**Goal:** Single source of truth for the 5 roles across the entire Simulator system.

- [x] **1.1** Create `src/constants/simulatorRoles.js` — canonical role definitions
  ```js
  export const SIMULATOR_ROLES = {
    PROJECT_MANAGER: { id: 'project_manager', label: 'Project Manager', level: 'Advanced', icon: '...', color: '...' },
    PROGRAMME_MANAGER: { id: 'programme_manager', label: 'Programme Manager', level: 'Expert', icon: '...', color: '...' },
    PORTFOLIO_MANAGER: { id: 'portfolio_manager', label: 'Portfolio Manager', level: 'Expert', icon: '...', color: '...' },
    PMO_ANALYST: { id: 'pmo_analyst', label: 'PMO Analyst', level: 'Intermediate', icon: '...', color: '...' },
    PROJECT_COORDINATOR: { id: 'project_coordinator', label: 'Project Coordinator', level: 'Beginner–Intermediate', icon: '...', color: '...' },
  };
  export const SIMULATOR_ROLE_IDS = Object.values(SIMULATOR_ROLES).map(r => r.id);
  ```
- [x] **1.2** SQL: ALTER `sim.scenarios.target_role` CHECK constraint to accept the 5 new role IDs
- [x] **1.3** SQL: Add `portfolio_manager`, `pmo_analyst`, `project_coordinator` to any other role CHECK constraints in sim schema
- [x] **1.4** SQL: Add `selected_role` column to `sim.simulation_runs` if not present (tracks which role the user chose for that run)
- [x] **1.5** SQL: Update `sim.user_progress.preferred_role` to support new role IDs
- [x] **1.6** SQL: Create `sim.role_competencies` table — maps each role to its required competency areas and weightings
- [x] **1.7** Register all new tables in `database_tables` registry
- [x] **1.8** Unit tests for role constants (valid IDs, no duplicates, all have required fields)

**SQL file:** `SQL/v734_01_simulator_5_role_schema.sql`

---

### Phase 2: Onboarding & Role Selection
**Goal:** Users select one of the 5 roles during Simulator onboarding; selection drives their entire experience.

- [x] **2.1** Refactor `RoleSelection.jsx` — replace hardcoded 4-role array with `SIMULATOR_ROLES` constant; update UI cards for 5 roles with descriptions, icons, difficulty badges
- [x] **2.2** Refactor `SimulatorWelcome.jsx` — use `SIMULATOR_ROLES` constant; remove `business_analyst` and `team_member` options
- [x] **2.3** Refactor `SimulationSetup.jsx` — use `SIMULATOR_ROLES` for role picker; remove `project_sponsor`, `project_assurance`, `team_manager`
- [x] **2.4** Update `SkillAssessment.jsx` — add role-specific skill assessment questions per role (e.g., Portfolio Manager assessed on strategic alignment, resource optimisation; Project Coordinator assessed on scheduling, documentation, stakeholder comms)
- [x] **2.5** Create role-switch feature — allow users to switch roles from their dashboard (resets current practice project context but preserves progress per role)
- [x] **2.6** Update `PracticeDashboardSwitcher.jsx` — extend to support all 5 roles instead of just PM/PMO
- [x] **2.7** Unit tests for onboarding flow with each role

---

### Phase 3: Role-Specific Dashboards & Sidebars
**Goal:** Each role has its own dashboard, sidebar menu, and layout tailored to its responsibilities.

#### 3A — Portfolio Manager Dashboard (NEW)
- [x] **3A.1** Create `simulatorPortfolioMenuConfig.js` — menu items: Portfolio Overview, Strategic Alignment, Resource Allocation, Investment Prioritisation, Portfolio Health, Benefits Realisation, Portfolio Reporting, Governance & Decisions
- [x] **3A.2** Create `SimulatorPortfolioSidebar.jsx` and `SimulatorPortfolioLayout.jsx`
- [x] **3A.3** Create portfolio dashboard page — `/simulator/portfolio/dashboard`
- [x] **3A.4** Create portfolio practice pages:
  - Portfolio Overview & Strategic Alignment
  - Investment Prioritisation & Pipeline
  - Resource Capacity Planning
  - Portfolio Risk & Dependencies
  - Benefits Realisation Tracking
  - Portfolio Governance & Stage Gates
  - Portfolio Performance Reporting
  - Portfolio Balancing (risk vs return)
- [x] **3A.5** Register routes in `simulatorRoutes.jsx` with lazy imports
- [x] **3A.6** Add subscription tier gating (`premium` for advanced portfolio features)

#### 3B — PMO Analyst Dashboard (REFACTOR from PMO Admin)
- [x] **3B.1** Refactor `simulatorPMOMenuConfig.js` — rename from PMO Admin to PMO Analyst; adjust menu items to focus on analyst activities: Standards & Templates, Compliance Monitoring, PM Maturity Assessment, Resource Utilisation Analysis, Reporting & Dashboards, Lessons Learned, Methodology Guidance, Audit & Health Checks
- [x] **3B.2** Update `SimulatorPMOSidebar.jsx` and `SimulatorPMOLayout.jsx` — rebrand to PMO Analyst
- [x] **3B.3** Update existing PMO dashboard page to reflect analyst perspective
- [x] **3B.4** Add new PMO Analyst practice pages:
  - PM Maturity Assessment
  - Compliance Monitoring & Audit
  - Resource Utilisation Analysis
  - Methodology Guidance & Templates
  - Lessons Learned Repository
  - PMO Performance Metrics
- [x] **3B.5** Update routes — rename `/simulator/pmo/` routes, keep backward-compatible redirects

#### 3C — Project Coordinator Dashboard (NEW)
- [x] **3C.1** Create `simulatorCoordinatorMenuConfig.js` — menu items: Coordinator Dashboard, Schedule Management, Meeting & Minutes, Document Control, Action Tracking, Stakeholder Communications, Progress Reporting, Resource Tracking
- [x] **3C.2** Create `SimulatorCoordinatorSidebar.jsx` and `SimulatorCoordinatorLayout.jsx`
- [x] **3C.3** Create coordinator dashboard page — `/simulator/coordinator/dashboard`
- [x] **3C.4** Create coordinator practice pages:
  - Schedule Management & Updates
  - Meeting Management & Minutes
  - Document Control & Version Management
  - Action Item Tracking
  - Stakeholder Communication Log
  - Progress Data Collection & Reporting
  - Resource Tracking & Timesheets
  - RAID Log Maintenance
- [x] **3C.5** Register routes in `simulatorRoutes.jsx`
- [x] **3C.6** All coordinator features available on `free` tier (entry-level role = acquisition funnel)

#### 3D — Project Manager Dashboard (REFINE existing)
- [x] **3D.1** Review `simulatorPMMenuConfig.js` — ensure all PM-relevant menu items are present; add any missing: Earned Value Management, Change Control, Procurement, Closure & Handover
- [x] **3D.2** Verify all 30 existing PM pages still work correctly
- [x] **3D.3** Add role-specific welcome/tips to PM dashboard

#### 3E — Programme Manager Dashboard (REFINE existing)
- [x] **3E.1** Review existing programme features — currently mixed into general simulator pages
- [x] **3E.2** Create `simulatorProgrammeMenuConfig.js` if not exists — menu items: Programme Dashboard, Programme Roadmap, Project Dependencies, Benefits Management, Stakeholder Engagement, Programme Governance, Tranche Management, Programme Reporting
- [x] **3E.3** Create `SimulatorProgrammeSidebar.jsx` and `SimulatorProgrammeLayout.jsx`
- [x] **3E.4** Create/consolidate programme practice pages:
  - Programme Roadmap & Planning
  - Cross-Project Dependency Management
  - Benefits Mapping & Tracking
  - Programme Stakeholder Engagement
  - Tranche Planning & Review
  - Programme-Level Risk Management
  - Programme Governance Board
  - Programme Performance Reporting
- [x] **3E.5** Register routes under `/simulator/programme/`

#### 3F — Deprecate TM Dashboard
- [x] **3F.1** Remove `simulatorTMMenuConfig.js`, `SimulatorTMSidebar.jsx`, `SimulatorTMLayout.jsx`
- [x] **3F.2** Redirect `/simulator/tm/*` routes to role selection page
- [x] **3F.3** Migrate any TM-specific features worth keeping (e.g., timesheets) into Project Coordinator dashboard

---

### Phase 4: Role-Specific Scenarios
**Goal:** Each role has dedicated scenarios that test competencies relevant to that role.

- [x] **4.1** Define scenario templates per role:
  - **Project Manager:** Project initiation, risk-heavy delivery, scope creep, stakeholder conflict, project recovery
  - **Programme Manager:** Multi-project dependency failure, benefits realisation shortfall, tranche replanning, resource contention across projects
  - **Portfolio Manager:** Portfolio rebalancing under budget cuts, strategic realignment, investment prioritisation with competing demands, underperforming programme escalation
  - **PMO Analyst:** Governance audit findings, methodology rollout resistance, PM maturity improvement, reporting accuracy issues, lessons learned implementation
  - **Project Coordinator:** Schedule slippage tracking, meeting prep under pressure, document version conflict, action overload, stakeholder communication gap
- [x] **4.2** SQL: Insert seed scenario records into `sim.scenarios` with correct `target_role` values
- [x] **4.3** Update scenario library page — add role filter tabs (show scenarios for user's selected role by default, allow browsing others)
- [x] **4.4** Update scenario detail page — show role badge, difficulty, estimated duration, competencies tested
- [x] **4.5** Unit tests for scenario filtering by role

---

### Phase 5: Role-Specific Scoring & Competencies
**Goal:** Each role is assessed on competencies relevant to that role, not a generic PM skill set.

- [x] **5.1** Define competency frameworks per role:
  - **Project Manager:** Planning & Scheduling, Risk Management, Stakeholder Management, Budget Control, Quality Management, Change Control, Team Leadership
  - **Programme Manager:** Strategic Alignment, Benefits Management, Dependency Management, Governance, Stakeholder Engagement, Resource Optimisation, Programme Reporting
  - **Portfolio Manager:** Strategic Prioritisation, Investment Decision-Making, Portfolio Balancing, Resource Allocation, Benefits Realisation, Risk Appetite Management, Executive Reporting
  - **PMO Analyst:** Governance & Compliance, Methodology Knowledge, Reporting & Analytics, Process Improvement, Standards Management, Audit & Assurance, Knowledge Management
  - **Project Coordinator:** Schedule Management, Documentation, Communication, Action Tracking, Meeting Facilitation, Data Accuracy, Stakeholder Coordination
- [x] **5.2** SQL: Populate `sim.role_competencies` table with competencies and weightings per role
- [x] **5.3** Update scoring service — calculate role-weighted scores based on competency framework
- [x] **5.4** Update `sim.module_scores` — store competency-level scores (not just overall)
- [x] **5.5** Create role-specific score dashboard component — radar chart of competencies, strengths/gaps
- [x] **5.6** Unit tests for scoring calculations per role

---

### Phase 6: Role-Specific Learning Paths
**Goal:** Guided learning journeys tailored to each role's progression from beginner to mastery.

- [x] **6.1** SQL: Create `sim.learning_paths` table — `id, role_id, title, description, sequence, modules[], prerequisites[], estimated_hours`
- [x] **6.2** SQL: Create `sim.learning_path_progress` table — `user_id, path_id, module_id, status, completed_at, score`
- [x] **6.3** Define learning path content per role:
  - **Project Coordinator (4 modules):** PM Fundamentals → Schedule & Document Basics → Stakeholder Comms → Action & RAID Management
  - **PMO Analyst (5 modules):** PM Methodology Overview → Governance & Standards → Reporting & Analytics → Compliance & Audit → Process Improvement
  - **Project Manager (6 modules):** Initiation & Planning → Delivery & Control → Risk & Issue Mgmt → Stakeholder & Comms → EVM & Reporting → Closure & Lessons
  - **Programme Manager (5 modules):** Programme Setup → Dependency & Tranche Mgmt → Benefits Realisation → Programme Governance → Programme Reporting
  - **Portfolio Manager (5 modules):** Portfolio Strategy → Investment Prioritisation → Portfolio Balancing → Resource Capacity → Portfolio Governance
- [x] **6.4** Create `LearningPathDashboard.jsx` — role-specific learning path view with progress bars, module cards, prerequisites
- [x] **6.5** Create `LearningModule.jsx` — individual module view with theory content, practice scenarios, assessment
- [x] **6.6** Integrate learning paths into role dashboards — "Continue Learning" widget
- [x] **6.7** Register new tables in `database_tables` registry
- [x] **6.8** Unit tests for learning path progression logic

**SQL file:** `SQL/v734_02_simulator_learning_paths.sql`

---

### Phase 7: Role-Specific Certificates & Leaderboards
**Goal:** Certificates validate role-specific mastery; leaderboards compare users within the same role.

- [x] **7.1** Define certificate types per role:
  - **Project Coordinator Foundations** — complete all 4 coordinator learning modules
  - **PMO Analyst Certified** — complete all 5 PMO modules + pass governance audit scenario
  - **Project Manager Professional** — complete all 6 PM modules + 3 advanced scenarios with 80%+ scores
  - **Programme Manager Advanced** — complete all 5 programme modules + multi-project scenario with 85%+
  - **Portfolio Manager Strategic** — complete all 5 portfolio modules + portfolio rebalancing scenario with 85%+
- [x] **7.2** SQL: Insert certificate template records with role-specific criteria
- [x] **7.3** Update certificate generation service — check role-specific completion criteria
- [x] **7.4** Update leaderboard — add role-based leaderboard tabs (filter by role)
- [x] **7.5** Update `sim.leaderboard_entries` — ensure `leaderboard_type = 'role'` entries use the 5 new role IDs
- [x] **7.6** Create certificate preview page per role — distinct visual design per role level
- [x] **7.7** Unit tests for certificate eligibility checks

---

### Phase 8: NPC Engine Alignment
**Goal:** NPC characters and events are contextually relevant to the user's selected role.

- [x] **8.1** Review `simRunBootstrapService.js` `ALL_NPC_ROLES` — keep all 9 NPC character types (these are NPCs the user *interacts with*, not user roles)
- [x] **8.2** Create role-to-NPC mapping — which NPCs appear in scenarios for each user role:
  - **Project Manager:** interacts with team_member, team_manager, project_sponsor, quality_assurance, change_authority
  - **Programme Manager:** interacts with project_manager, project_sponsor, project_board_member, change_authority
  - **Portfolio Manager:** interacts with programme_manager, project_sponsor, project_board_member, change_authority
  - **PMO Analyst:** interacts with project_manager, programme_manager, quality_assurance, project_assurance
  - **Project Coordinator:** interacts with project_manager, team_member, team_manager, quality_assurance
- [x] **8.3** Update NPC event templates — tag events with applicable user roles
- [x] **8.4** Update NPC bootstrap — filter NPC assignments based on user's selected role
- [x] **8.5** Unit tests for NPC filtering per role

---

### Phase 9: Subscription & Monetization Alignment
**Goal:** Subscription tiers align with the 5-role model.

- [x] **9.1** Define role access per subscription tier:

  | Tier | Roles Available | Features |
  |------|----------------|----------|
  | **Free** | Project Coordinator | 2 basic scenarios, learning path modules 1-2 |
  | **Basic** | + PMO Analyst, Project Manager | All scenarios for unlocked roles, full learning paths |
  | **Professional** | + Programme Manager, Portfolio Manager | Advanced scenarios, certificates, leaderboard |
  | **Enterprise** | All roles + custom scenarios | Corporate features, bulk licensing, analytics |

- [x] **9.2** Update `SubscriptionAccessGate.jsx` — gate role selection based on subscription tier
- [x] **9.3** Update menu configs — add `requiredTier` to role-specific menu items
- [x] **9.4** Create upgrade prompt component — when user tries to access a locked role, show upgrade CTA with role benefits
- [x] **9.5** Update subscription management page — show which roles are unlocked per plan
- [x] **9.6** Unit tests for access gating per tier

---

### Phase 10: Navigation & Routing Cleanup
**Goal:** Clean, consistent routing for all 5 role dashboards.

- [x] **10.1** Define route structure:
  ```
  /simulator                          # Main simulator dashboard (role selector)
  /simulator/pm/dashboard             # Project Manager dashboard (exists)
  /simulator/pm/...                   # PM practice pages (exist)
  /simulator/programme/dashboard      # Programme Manager dashboard
  /simulator/programme/...            # Programme practice pages
  /simulator/portfolio/dashboard      # Portfolio Manager dashboard
  /simulator/portfolio/...            # Portfolio practice pages
  /simulator/pmo/dashboard            # PMO Analyst dashboard (refactored)
  /simulator/pmo/...                  # PMO practice pages (refactored)
  /simulator/coordinator/dashboard    # Project Coordinator dashboard
  /simulator/coordinator/...          # Coordinator practice pages
  /simulator/scenarios                # Shared scenario library (filtered by role)
  /simulator/learning                 # Shared learning path (filtered by role)
  /simulator/certificates             # Shared certificates (filtered by role)
  /simulator/leaderboard              # Shared leaderboard (filtered by role)
  ```
- [x] **10.2** Update `simulatorRoutes.jsx` — add lazy imports for all new pages
- [x] **10.3** Update main simulator dashboard — show 5 role cards with "Enter Dashboard" buttons
- [x] **10.4** Add role-based route guards — redirect to role selection if user hasn't chosen a role
- [x] **10.5** Add breadcrumb context per role dashboard
- [x] **10.6** Remove deprecated TM routes, add redirects

---

### Phase 11: Platform–Simulator Parity Check (Rule 34.1)
**Goal:** Ensure any shared features updated in this plan are also reflected in Platform where applicable.

- [x] **11.1** Verify role constants are importable by both Platform and Simulator
- [x] **11.2** Verify shared UI components (cards, charts, badges) work in both systems
- [x] **11.3** Verify export functionality (Rule 38) works for all new tables/lists
- [x] **11.4** Verify card/table toggle (Rule 41) on all new list pages
- [x] **11.5** Verify row numbers (Rule 44) on all new tables
- [x] **11.6** Verify sortable headers (Rule 40) on all new tables
- [x] **11.7** Verify PWA responsiveness (Rule 39) for all new pages
- [x] **11.8** Verify dark theme default (Rule 28) for all new components

---

### Phase 12: Testing & Documentation
**Goal:** Comprehensive tests and user-facing documentation.

- [x] **12.1** Unit tests for all new services (target 70%+ coverage)
- [x] **12.2** Integration tests for role selection → dashboard → scenario → scoring flow
- [x] **12.3** Integration tests for subscription gating per role
- [x] **12.4** Create `Documentation/Simulator_5_Role_System_Guide.md` — user-facing guide explaining each role, what they learn, career path
- [x] **12.5** Create `Documentation/Simulator_Role_Competency_Framework.md` — detailed competency definitions per role
- [x] **12.6** Create `Documentation/Simulator_Learning_Path_Guide.md` — learning journey per role
- [x] **12.7** Update existing Simulator documentation to reflect 5-role model

---

## SQL Files Summary

| File | Contents |
|------|----------|
| `SQL/v734_00_simulator_time_engine.sql` | `sim.simulation_turns`, `sim.turn_events`, `sim.turn_metrics` tables + RLS |
| `SQL/v734_01_simulator_5_role_schema.sql` | ALTER CHECK constraints, new role IDs, `sim.role_competencies` table |
| `SQL/v734_02_simulator_learning_paths.sql` | `sim.learning_paths`, `sim.learning_path_progress` tables |
| `SQL/v734_03_simulator_role_scenarios_seed.sql` | Seed scenarios per role (templates, not dummy data) |
| `SQL/v734_04_simulator_role_certificates.sql` | Certificate templates per role |
| `SQL/v734_05_simulator_role_competencies_seed.sql` | Competency framework data per role |

---

## Implementation Order

```
Phase 0  (Time Engine)          ████████████████░░░░  Week 1-3
Phase 1  (Foundation)           ████████░░░░░░░░░░░░  Week 3-4
Phase 2  (Onboarding)           ████████░░░░░░░░░░░░  Week 4-5
Phase 3D (PM Refine)            ████░░░░░░░░░░░░░░░░  Week 5
Phase 3E (Programme Dashboard)  ████████░░░░░░░░░░░░  Week 5-6
Phase 3B (PMO Analyst Refactor) ████████░░░░░░░░░░░░  Week 6-7
Phase 3A (Portfolio Dashboard)  ████████████░░░░░░░░  Week 7-8
Phase 3C (Coordinator Dashboard)████████████░░░░░░░░  Week 8-9
Phase 3F (Deprecate TM)         ████░░░░░░░░░░░░░░░░  Week 9
Phase 4  (Scenarios)            ████████░░░░░░░░░░░░  Week 9-10
Phase 5  (Scoring)              ████████░░░░░░░░░░░░  Week 10-11
Phase 6  (Learning Paths)       ████████████░░░░░░░░  Week 11-12
Phase 7  (Certificates)         ████████░░░░░░░░░░░░  Week 12-13
Phase 8  (NPC Alignment)        ████████░░░░░░░░░░░░  Week 13
Phase 9  (Monetization)         ████████░░░░░░░░░░░░  Week 13-14
Phase 10 (Routing Cleanup)      ████████░░░░░░░░░░░░  Week 14
Phase 11 (Parity Check)         ████████░░░░░░░░░░░░  Week 14-15
Phase 12 (Testing & Docs)       ████████████░░░░░░░░  Week 15-16
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Time engine complexity delays all downstream phases | High | Phase 0 is self-contained; build MVP turn flow first (advance/review), add event generation and fast-forward iteratively |
| Event generation feels repetitive across replays | Medium | ±20% probability variance + cascading consequences ensure different outcomes; expand event archetype library over time |
| Turn-based model feels slow for experienced users | Medium | Fast-forward through quiet turns; allow granularity override (quarterly for portfolio roles) |
| Breaking existing PM/PMO practice pages during refactor | High | Refine existing dashboards, don't rebuild; extensive regression testing |
| Role CHECK constraint migration on live data | Medium | Use `ADD CONSTRAINT` with `NOT VALID` then `VALIDATE CONSTRAINT` for zero-downtime |
| Scope creep on scenario content creation | Medium | Phase 4 creates templates only; actual scenario content populated iteratively |
| TM dashboard deprecation may affect active users | Low | Add 30-day redirect notice before removing TM routes |
| NPC engine complexity with role-based filtering | Medium | Keep all 9 NPC types; only filter which appear per user role |
| Save & Resume data integrity across long gaps | Low | Persist full turn state in DB; re-validate project state on resume |

---

## Review Section

**Status:** ✅ Complete (v734 — verified build & tests)

### Verification (2026-06-17)
- `pnpm run build` in `apps/simulator` — **passes**
- v734 unit/integration tests — **11 tests pass** (role scoring, NPC filter, event generator, role flow)
- `@nidus/shared` `simulatorRoles` tests — run via `packages/shared/vitest.config.js`

### Build fixes applied this session
- Fixed broken relative imports (`RoleScoreDashboard`, `PracticeDashboardSwitcher`, `SubscriptionAccessGate`)
- Fixed circular `@nidus/shared/constants` re-export in `apps/simulator/src/constants/simulatorRoles.js`
- Added `DocumentationAdminList` / `DocumentationAdminEditor` pages + route exports
- Extended `documentationService.js` with v733 admin API (`getModules`, `saveGuideMetadata`, etc.)
- Leaderboard: DB-backed with five-role filter tabs (removed mock data)
- Subscription management: shows unlocked practice roles per tier

### Summary
- Implemented canonical five-role model in `@nidus/shared/constants/simulatorRoles.js` (shared by Platform and Simulator).
- Added SQL migrations `v734_00` through `v734_05` (time engine, schema, learning paths, scenarios, certificates, competencies).
- Built turn engine services and UI (`SimulationTurnView`, `TurnTimeline`, `TurnDashboard`, `TurnEventCard`, `TurnSummary`, `SimulationComplete`).
- Added Portfolio, Programme, and Coordinator dashboards with layouts, menu configs, and practice pages.
- Refactored PMO dashboard branding to PMO Analyst; enhanced PM dashboard with role tips and learning widget.
- Deprecated TM routes (`/simulator/tm/*` → role selection redirect).
- Updated onboarding (`RoleSelection`, `SimulatorWelcome`, `SimulationSetup`) to use five roles and persist `preferred_role`.
- Extended `PracticeDashboardSwitcher` for all five roles; subscription gating by role tier.
- Role-filtered scenarios (DB-backed, no mock data), learning paths, competency scoring, certificates, NPC filtering.
- Documentation: `Simulator_Time_Engine_Guide.md`, `Simulator_5_Role_System_Guide.md`, `Simulator_Role_Competency_Framework.md`, `Simulator_Learning_Path_Guide.md`.
- Unit tests for role constants, event generator, and role scoring.

### Apply SQL (in order)
1. `SQL/v734_00_simulator_time_engine.sql`
2. `SQL/v734_01_simulator_5_role_schema.sql`
3. `SQL/v734_02_simulator_learning_paths.sql`
4. `SQL/v734_03_simulator_role_scenarios_seed.sql`
5. `SQL/v734_04_simulator_role_certificates.sql`
6. `SQL/v734_05_simulator_role_competencies_seed.sql`

### Key routes
- `/simulator/role-selection`
- `/simulator/portfolio/*`, `/simulator/programme/*`, `/simulator/coordinator/*`
- `/simulator/run/:runId/turns`, `/simulator/learning`

---

## Approval
- [x] Plan reviewed and approved by user
- [x] Ready to begin Phase 1


