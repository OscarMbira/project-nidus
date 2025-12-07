# Product Requirements Document (PRD)
## Project Management Simulator Module

**Version:** 1.0
**Date:** 2025-11-20
**Status:** Ready for Development
**Author:** Project Nidus Team

---

## 1. Executive Summary

### 1.1 Vision Statement

The Project Management Simulator is a practice-based learning platform that functions like a "flight simulator for project managers." Just as pilots train in simulators before flying real aircraft, aspiring and practicing project managers can practice managing projects from start to closure in a risk-free, realistic environment.

### 1.2 Mission

To provide an immersive, hands-on learning experience that bridges the gap between theoretical project management knowledge and real-world application, enabling users to develop practical skills through simulated project scenarios.

### 1.3 Target Audience

**Primary Users:**
- Aspiring project managers seeking to build practical skills
- Practicing project managers looking to refine their techniques
- Students in project management courses
- Professionals transitioning into project management roles

**Secondary Users:**
- Training departments in organizations
- Project management certification bodies
- Universities and educational institutions
- Corporate L&D teams

### 1.4 Key Differentiators

1. **Practice-Based Learning** - Learn by doing, not just reading
2. **Role-Specific Paths** - Tailored experiences for Programme Manager, Project Manager, Team Lead, and Team Member
3. **AI-Driven Dynamic Events** - Realistic, unpredictable challenges like real projects
4. **Multi-Methodology Support** - Structured PM, Scrum, Kanban, Hybrid approaches
5. **Seamless Integration** - Direct pathway to real project management in the PM system
6. **Lifetime Access Option** - One-time payment for permanent access

---

## 2. System Architecture

### 2.1 Domain Separation

The simulator operates as a separate domain within the unified Project Nidus application:

| Aspect | PM Domain | SIM Domain |
|--------|-----------|------------|
| Purpose | Real projects | Simulated learning |
| Schema | `public` | `sim` |
| Client | `appDb` | `simDb` |
| Routes | `/app/...` | `/simulator/...` |
| Data | Persistent business data | Training & progress data |

### 2.2 Integration Points

```
┌─────────────────────────────────────────────┐
│           Project Nidus Platform            │
├─────────────────┬───────────────────────────┤
│   PM Module     │      SIM Module           │
│   (public)      │      (sim)                │
├─────────────────┼───────────────────────────┤
│                 │                           │
│  Real Projects  │  Simulation Scenarios     │
│  Real Tasks     │  Simulation Runs          │
│  Real Teams     │  AI Events                │
│  Real Reports   │  Scorecards               │
│                 │  Certificates             │
│                 │  Leaderboards             │
│                 │                           │
└─────────────────┴───────────────────────────┘
         │                    │
         └────────┬───────────┘
                  │
         ┌────────┴────────┐
         │   Core Module   │
         │   (shared)      │
         │                 │
         │  Auth           │
         │  Subscriptions  │
         │  Monetization   │
         │  User Profiles  │
         └─────────────────┘
```

### 2.3 Technical Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **AI Engine:** OpenAI API / Custom ML models
- **Real-time:** Supabase Realtime
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage

---

## 3. Target Roles & Learning Paths

### 3.1 Programme Manager Path

**Target Users:** Senior professionals managing multiple related projects

**Learning Objectives:**
- Portfolio oversight and strategic alignment
- Benefits realization management
- Cross-project resource optimization
- Programme-level risk management
- Stakeholder management at executive level

**Simulation Scenarios:**
- Manage a programme with 3-5 interdependent projects
- Navigate conflicting project priorities
- Optimize resource allocation across projects
- Track and realize programme benefits
- Handle escalations from project managers

**Skills Assessed:**
- Strategic thinking
- Decision-making under uncertainty
- Resource optimization
- Stakeholder communication
- Benefits tracking

### 3.2 Project Manager Path

**Target Users:** Aspiring and practicing project managers

**Learning Objectives:**
- Full project lifecycle management
- Planning and scheduling
- Risk and issue management
- Team leadership and coordination
- Stakeholder communication
- Budget and resource management

**Simulation Scenarios:**
- Full lifecycle project (initiation to closure)
- Methodology-specific projects (Structured PM, Scrum, Kanban)
- Crisis management scenarios
- Scope change and change control
- Budget overrun recovery

**Skills Assessed:**
- Planning accuracy
- Risk identification and response
- Communication effectiveness
- Decision-making speed and quality
- Adaptability to change

### 3.3 Team Manager/Lead Path

**Target Users:** Team leads and aspiring team managers

**Learning Objectives:**
- Work package management
- Team coordination and motivation
- Product delivery management
- Quality control
- Progress reporting

**Simulation Scenarios:**
- Accept and deliver work packages
- Manage a development team sprint
- Handle team conflicts
- Coordinate deliverables with dependencies
- Quality review and acceptance

**Skills Assessed:**
- Task allocation
- Team motivation
- Quality management
- Time management
- Escalation judgment

### 3.4 Team Member Path

**Target Users:** New project team members

**Learning Objectives:**
- Task execution and progress reporting
- Collaboration and communication
- Issue identification and reporting
- Time management
- Quality standards adherence

**Simulation Scenarios:**
- Complete assigned tasks within deadlines
- Collaborate with team members
- Report blockers and issues
- Participate in daily standups
- Contribute to retrospectives

**Skills Assessed:**
- Task completion rate
- Communication quality
- Collaboration
- Problem identification
- Time estimation accuracy

---

## 4. Simulation Modes

### 4.1 Full Lifecycle Simulation

Complete project from start to finish:

```
Startup → Initiation → Planning → Execution → Control → Closure
```

**Duration:** 2-4 hours (simulated 3-6 months)
**Difficulty Levels:** Beginner, Intermediate, Advanced, Expert

**Features:**
- Complete project phases with realistic timing
- Stakeholder interactions throughout
- Budget and resource constraints
- AI-generated events and challenges
- Comprehensive scoring across all phases

### 4.2 Modular Simulations

Focus on specific project phases or areas:

#### Phase-Specific Modules
- **Initiation Module** - Project brief, business case, PID creation
- **Planning Module** - WBS, schedule, resource allocation
- **Execution Module** - Task management, team coordination
- **Control Module** - Progress tracking, change control
- **Closure Module** - Handover, lessons learned, final reports

#### Domain-Specific Modules
- **Risk Management** - Risk identification, assessment, response
- **Issue Management** - Issue logging, resolution, escalation
- **Stakeholder Management** - Engagement, communication planning
- **Quality Management** - Quality criteria, reviews, acceptance
- **Change Control** - Change requests, impact assessment, approval

#### Methodology-Specific Modules
- **Scrum Sprint Simulation** - Sprint planning to retrospective
- **Kanban Flow Simulation** - Continuous flow management
- **Structured PM Stage** - Stage gate management
- **Hybrid Approach** - Combined methodology execution

### 4.3 Custom Scenario Simulations

Users can upload or paste:
- Case studies
- Project briefs
- PIDs (Project Initiation Documents)
- RAID logs
- WBS spreadsheets
- Any narrative project description

**AI Processing:**
The system extracts and structures:
- Scope and objectives
- Deliverables and products
- Stakeholders and their interests
- PBS/WBS structures
- Risks and issues
- Timeline and constraints
- Budget parameters

---

## 5. Core Features

### 5.1 Scenario Library

**Pre-Built Scenarios:**

| Industry | Difficulty | Duration | Methodology |
|----------|------------|----------|-------------|
| IT/Software | Beginner-Expert | 1-4 hrs | Scrum, Kanban |
| Construction | Intermediate-Expert | 2-4 hrs | Structured PM |
| Healthcare | Advanced-Expert | 3-4 hrs | Hybrid |
| Finance | Intermediate-Advanced | 2-3 hrs | Structured PM |
| Marketing | Beginner-Intermediate | 1-2 hrs | Agile |
| Manufacturing | Intermediate-Expert | 2-4 hrs | Structured PM |
| Event Management | Beginner-Advanced | 1-3 hrs | Hybrid |
| Research & Development | Advanced-Expert | 3-4 hrs | Agile |

**Scenario Categories:**
- Crisis management
- Scope creep handling
- Budget recovery
- Team conflict resolution
- Stakeholder management
- Technology failure
- Vendor management
- Regulatory compliance

### 5.2 AI Event Engine

**Dynamic Event Types:**

| Event Category | Examples |
|----------------|----------|
| **Resource Events** | Team member illness, resignation, skill gap |
| **Schedule Events** | Dependency delays, task overruns, critical path changes |
| **Budget Events** | Cost overruns, funding cuts, currency fluctuation |
| **Stakeholder Events** | Requirement changes, priority shifts, sponsor change |
| **Technical Events** | System failures, integration issues, security breaches |
| **External Events** | Vendor delays, regulatory changes, market shifts |
| **Team Events** | Conflicts, morale issues, communication breakdown |

**Event Characteristics:**
- Configurable probability based on difficulty
- Reproducible through seed values
- Escalating complexity as simulation progresses
- Realistic timing and impact
- Multiple valid response options

### 5.3 Real-Time Scoring & Feedback

**Scoring Dimensions:**

| Dimension | Weight | Metrics |
|-----------|--------|---------|
| Planning Quality | 20% | WBS completeness, estimation accuracy, dependency logic |
| Risk Management | 15% | Risk identification rate, response effectiveness, mitigation success |
| Communication | 15% | Report quality, stakeholder satisfaction, escalation timing |
| Decision Making | 20% | Decision speed, outcome quality, rationale clarity |
| Budget Control | 10% | Variance management, forecast accuracy |
| Schedule Control | 10% | Milestone achievement, critical path management |
| Quality | 10% | Deliverable acceptance rate, defect rate |

**Feedback Types:**
- Real-time hints and suggestions
- Post-decision analysis
- Phase completion reviews
- End-of-simulation comprehensive report
- Comparison with expert decisions
- Peer comparison (anonymized)

### 5.4 Progress Tracking

**Individual Progress:**
- XP (Experience Points) accumulation
- Skill levels per competency
- Achievement badges
- Completion certificates
- Learning path progress
- Historical performance trends

**Competency Matrix:**

| Competency | Levels | Assessment Method |
|------------|--------|-------------------|
| Planning | 1-5 | WBS quality, estimation accuracy |
| Risk Management | 1-5 | Risk identification, response effectiveness |
| Leadership | 1-5 | Team decisions, conflict resolution |
| Communication | 1-5 | Report quality, stakeholder feedback |
| Problem Solving | 1-5 | Issue resolution, creative solutions |
| Adaptability | 1-5 | Change handling, recovery actions |
| Technical | 1-5 | Tool usage, methodology adherence |

### 5.5 Certificate Generation

**Certificate Types:**

| Certificate | Requirements | Price |
|-------------|--------------|-------|
| Module Completion | Complete any module with 70%+ | Free (with subscription) |
| Role Mastery | Complete all modules in role path with 80%+ | $19.99 |
| Methodology Expert | Complete methodology-specific advanced simulations | $29.99 |
| Simulator Professional | Complete full lifecycle at Expert level with 85%+ | $49.99 |
| Verified Certificate | Above + identity verification + LinkedIn badge | $79.99 |

**Certificate Features:**
- Unique certificate ID
- QR code for verification
- Digital badge for LinkedIn
- PDF download
- Optional physical certificate mailing

### 5.6 Leaderboards

**Leaderboard Categories:**
- Global rankings
- Role-specific rankings (PM, Team Lead, etc.)
- Methodology-specific rankings
- Industry-specific rankings
- Weekly/Monthly challenges
- Organization-specific (corporate licenses)

**Ranking Factors:**
- Cumulative score
- Consistency (streak bonus)
- Difficulty multiplier
- Speed bonus
- Peer collaboration score

---

## 6. Database Schema Design (sim schema)

### 6.1 Core Tables

```sql
-- Simulation Scenarios
CREATE TABLE sim.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    methodology VARCHAR(50),
    difficulty_level VARCHAR(20),
    duration_minutes INTEGER,
    target_role VARCHAR(50),
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    scenario_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Simulation Runs
CREATE TABLE sim.simulation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    scenario_id UUID NOT NULL REFERENCES sim.scenarios(id),
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    current_phase VARCHAR(50),
    total_score INTEGER,
    time_spent_minutes INTEGER,
    simulation_state JSONB,
    seed_value INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Events
CREATE TABLE sim.ai_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES sim.simulation_runs(id),
    event_type VARCHAR(50),
    event_category VARCHAR(50),
    event_data JSONB,
    triggered_at TIMESTAMP DEFAULT NOW(),
    user_response JSONB,
    response_score INTEGER,
    impact_analysis JSONB
);

-- Module Scores
CREATE TABLE sim.module_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES sim.simulation_runs(id),
    module_name VARCHAR(100),
    score INTEGER,
    max_score INTEGER,
    metrics JSONB,
    feedback TEXT,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- User Progress
CREATE TABLE sim.user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    badges JSONB DEFAULT '[]',
    competencies JSONB DEFAULT '{}',
    completed_scenarios INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Custom Scenarios
CREATE TABLE sim.custom_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(255),
    source_type VARCHAR(50),
    original_content TEXT,
    extracted_data JSONB,
    is_public BOOLEAN DEFAULT false,
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Certificates
CREATE TABLE sim.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    certificate_type VARCHAR(50),
    certificate_name VARCHAR(255),
    issue_date TIMESTAMP DEFAULT NOW(),
    certificate_number VARCHAR(50) UNIQUE,
    verification_code VARCHAR(100) UNIQUE,
    score INTEGER,
    metadata JSONB,
    is_verified BOOLEAN DEFAULT false,
    pdf_url TEXT,
    badge_url TEXT
);

-- Leaderboards
CREATE TABLE sim.leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    leaderboard_type VARCHAR(50),
    period VARCHAR(20),
    score INTEGER,
    rank INTEGER,
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions (Simulator-specific)
CREATE TABLE sim.simulator_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    plan_type VARCHAR(50),
    status VARCHAR(20),
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_lifetime BOOLEAN DEFAULT false,
    payment_id VARCHAR(255),
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD'
);

-- Scenario Packs
CREATE TABLE sim.scenario_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    description TEXT,
    industry VARCHAR(100),
    scenario_ids UUID[],
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Purchases
CREATE TABLE sim.user_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    item_type VARCHAR(50),
    item_id UUID,
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_provider VARCHAR(50),
    payment_id VARCHAR(255),
    purchased_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Views and Functions

```sql
-- User Dashboard View
CREATE VIEW sim.user_dashboard AS
SELECT
    u.id AS user_id,
    p.total_xp,
    p.current_level,
    p.badges,
    p.competencies,
    p.completed_scenarios,
    p.streak_days,
    COUNT(r.id) AS active_runs,
    COUNT(c.id) AS certificates_earned
FROM auth.users u
LEFT JOIN sim.user_progress p ON u.id = p.user_id
LEFT JOIN sim.simulation_runs r ON u.id = r.user_id AND r.status = 'in_progress'
LEFT JOIN sim.certificates c ON u.id = c.user_id
GROUP BY u.id, p.total_xp, p.current_level, p.badges, p.competencies,
         p.completed_scenarios, p.streak_days;

-- Calculate User Level Function
CREATE OR REPLACE FUNCTION sim.calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(SQRT(xp / 100)) + 1;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Monetization Strategy

### 7.1 Revenue Model Overview

The monetization strategy is designed to maximize revenue through multiple streams while maintaining accessibility for beginners.

```
┌─────────────────────────────────────────────────────────────┐
│                    REVENUE STREAMS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Recurring   │  │ One-Time    │  │ Corporate   │         │
│  │ Revenue     │  │ Purchases   │  │ Licensing   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│    Subscriptions    Lifetime Access   Bulk Licenses         │
│                     Scenario Packs    White Label           │
│                     Certificates      Custom Dev            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Subscription Tiers

| Tier | Monthly | Annual (20% off) | Features |
|------|---------|------------------|----------|
| **Free** | $0 | $0 | 1 basic simulation/month, Limited scenarios, Basic feedback |
| **Basic** | $9.99 | $95.90 | 5 simulations/month, Basic scenarios, Standard feedback, Progress tracking |
| **Professional** | $29.99 | $287.90 | Unlimited simulations, All scenarios, Advanced feedback, Certificates (discounted), Custom scenarios |
| **Enterprise** | Custom | Custom | All Professional features + Team management, Analytics dashboard, SSO integration, Custom scenarios |

### 7.3 One-Time Purchases

#### Lifetime Access
| Package | Price | Features |
|---------|-------|----------|
| **Lifetime Basic** | $299 | All Basic features forever |
| **Lifetime Professional** | $499 | All Professional features forever |
| **Lifetime Ultimate** | $799 | All features + All future scenario packs + Priority support |

**Value Proposition:** Pay once, use forever. Equivalent to ~17 months of Professional subscription.

#### Scenario Packs
| Pack | Price | Contents |
|------|-------|----------|
| IT Project Pack | $29.99 | 10 IT/Software scenarios |
| Construction Pack | $39.99 | 8 Construction scenarios |
| Healthcare Pack | $49.99 | 8 Healthcare scenarios |
| Finance Pack | $39.99 | 8 Finance scenarios |
| Crisis Management Pack | $34.99 | 6 Crisis scenarios |
| Complete Industry Bundle | $149.99 | All industry packs (40+ scenarios) |

#### Certificates
| Certificate Type | Price |
|-----------------|-------|
| Module Completion | Free (with subscription) |
| Role Mastery | $19.99 |
| Methodology Expert | $29.99 |
| Simulator Professional | $49.99 |
| Verified Certificate + LinkedIn Badge | $79.99 |
| Physical Certificate (add-on) | $29.99 |

### 7.4 Corporate & Institutional Licensing

| License Type | Price per Seat/Year | Minimum Seats | Features |
|-------------|---------------------|---------------|----------|
| Team | $199 | 5 | All Professional features, Team dashboard |
| Department | $149 | 25 | + Analytics, Custom branding |
| Enterprise | $99 | 100 | + SSO, API access, Custom scenarios |
| Education | $49 | 50 | + LMS integration, Academic reports |

**Enterprise Add-ons:**
- Custom scenario development: $5,000-$20,000
- White-label solution: $25,000 setup + $500/month
- On-premise deployment: Custom pricing
- Dedicated support: $500/month

### 7.5 Marketplace Revenue

**User-Generated Scenarios:**
- Users can create and sell scenarios
- Revenue share: 70% creator / 30% platform
- Quality review process
- Rating and review system

**Expert-Created Premium Scenarios:**
- Partnered with PM consultants and trainers
- Revenue share: 60% creator / 40% platform
- Verified "Expert" badge

### 7.6 Revenue Projections

**Assumptions:**
- Year 1: 10,000 free users, 10% conversion to paid
- Year 2: 50,000 free users, 12% conversion
- Year 3: 150,000 free users, 15% conversion

| Revenue Stream | Year 1 | Year 2 | Year 3 |
|----------------|--------|--------|--------|
| Subscriptions | $120,000 | $720,000 | $2,700,000 |
| Lifetime Access | $50,000 | $200,000 | $500,000 |
| Scenario Packs | $15,000 | $75,000 | $200,000 |
| Certificates | $20,000 | $100,000 | $300,000 |
| Corporate Licenses | $50,000 | $300,000 | $1,000,000 |
| Marketplace | $5,000 | $50,000 | $200,000 |
| **Total** | **$260,000** | **$1,445,000** | **$4,900,000** |

### 7.7 Pricing Psychology

**Strategies Employed:**
1. **Anchoring:** Show Lifetime Ultimate ($799) first to make Professional ($499) seem reasonable
2. **Decoy Pricing:** Basic tier makes Professional look like better value
3. **Loss Aversion:** "Save 20%" on annual subscriptions
4. **Social Proof:** Show number of users who chose each tier
5. **Urgency:** Limited-time discounts on lifetime access
6. **Bundling:** Scenario packs cheaper than individual purchases
7. **Freemium Conversion:** Free tier with clear upgrade path

---

## 8. User Journey & Onboarding

### 8.1 Registration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │ ──▶ │   Sign Up   │ ──▶ │   Verify    │
│    Page     │     │   (Email)   │     │   Email     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Tutorial   │ ◀── │   Select    │ ◀── │   Skill     │
│ Simulation  │     │    Role     │     │   Quiz      │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Dashboard  │
                                        │  (Ready!)   │
                                        └─────────────┘
```

### 8.2 Skill Assessment Quiz

**Purpose:** Personalize learning path based on current knowledge

**Question Categories:**
- Project management basics (5 questions)
- Methodology knowledge (5 questions)
- Tool proficiency (3 questions)
- Leadership experience (3 questions)
- Industry experience (2 questions)

**Results:**
- Recommended role path
- Starting difficulty level
- Suggested first scenarios
- Identified skill gaps

### 8.3 Tutorial Simulation

**Duration:** 15-20 minutes

**Covers:**
- Interface navigation
- How to read scenario briefs
- Making decisions
- Understanding AI events
- Scoring system explanation
- Progress tracking features

**Completion Reward:**
- 100 XP bonus
- "First Steps" badge
- Unlock beginner scenarios

### 8.4 Personalized Learning Path

Based on assessment results, system generates:

1. **Recommended Scenario Sequence**
2. **Skill Development Goals**
3. **Weekly Practice Schedule**
4. **Milestone Targets**

---

## 9. Gamification & Engagement

### 9.1 XP & Leveling System

**XP Sources:**
| Activity | XP Range |
|----------|----------|
| Complete tutorial | 100 |
| Complete beginner simulation | 200-400 |
| Complete intermediate simulation | 400-800 |
| Complete advanced simulation | 800-1,500 |
| Complete expert simulation | 1,500-3,000 |
| Perfect score bonus | +50% |
| Streak bonus (daily) | +10% per day |
| First attempt bonus | +25% |

**Level Progression:**
- Level = √(XP/100) + 1
- Level 1: 0-100 XP
- Level 5: 1,600 XP
- Level 10: 8,100 XP
- Level 20: 36,100 XP
- Level 50: 240,100 XP

### 9.2 Achievement Badges

**Progression Badges:**
- Rookie (Level 5)
- Apprentice (Level 10)
- Professional (Level 20)
- Expert (Level 35)
- Master (Level 50)
- Legend (Level 100)

**Skill Badges:**
- Risk Whisperer (5 perfect risk assessments)
- Schedule Sage (5 perfect schedule completions)
- Stakeholder Champion (10 high stakeholder satisfaction scores)
- Budget Guardian (5 under-budget completions)
- Change Master (10 successful change controls)

**Special Badges:**
- Early Adopter (first 1,000 users)
- Perfectionist (100% score)
- Marathon Runner (4-hour simulation completed)
- Speed Demon (Expert simulation in record time)
- Helper (5 scenarios shared)

### 9.3 Streak System

**Daily Streak:**
- +10% XP bonus per consecutive day
- Max bonus: +100% at 10-day streak
- Grace period: 1 day without losing streak

**Weekly Challenges:**
- Complete 3 simulations
- Score 90%+ on any simulation
- Try a new methodology
- Share a custom scenario

**Monthly Challenges:**
- Complete a role path
- Earn 5 certificates
- Reach top 100 leaderboard
- Help 10 community members

### 9.4 Community Features

**Discussion Forums:**
- Scenario-specific discussions
- Strategy sharing
- Q&A sections
- Success stories

**Mentorship:**
- High-level users can mentor beginners
- Mentor points and rewards
- Direct messaging

**Competition:**
- Weekly tournaments
- Industry-specific competitions
- Team challenges (for corporate)

---

## 10. Technical Requirements

### 10.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Page load time | < 2 seconds |
| API response time | < 500ms |
| Simulation state save | < 1 second |
| AI event generation | < 2 seconds |
| Certificate generation | < 5 seconds |

### 10.2 Scalability Requirements

| Metric | Target |
|--------|--------|
| Concurrent users | 10,000+ |
| Concurrent simulations | 5,000+ |
| Total scenarios | 1,000+ |
| Historical runs stored | Unlimited |
| Leaderboard entries | 1,000,000+ |

### 10.3 AI Integration

**AI Engine Requirements:**
- Generate contextually appropriate events
- Analyze user decisions for feedback
- Create realistic NPC (stakeholder) responses
- Adaptive difficulty based on user performance
- Natural language processing for custom scenarios

**AI Models Used:**
- Event generation: GPT-4 or equivalent
- Decision analysis: Custom trained model
- Scenario extraction: NLP pipeline
- Feedback generation: Fine-tuned language model

### 10.4 Mobile Responsiveness

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**PWA Features:**
- Offline scenario viewing
- Push notifications for challenges
- Home screen installation
- Background sync for progress

### 10.5 Accessibility

**WCAG 2.1 AA Compliance:**
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Alt text for all images
- Captions for tutorial videos

---

## 11. Security & Compliance

### 11.1 Data Protection

**User Data:**
- Progress data encrypted at rest
- Personal data encrypted (AES-256)
- Secure session management
- GDPR compliance

**Payment Data:**
- PCI DSS compliance (via Stripe/PayPal)
- No card data stored locally
- Secure checkout flow

### 11.2 Row-Level Security

All sim schema tables must have RLS enabled:

```sql
-- Example RLS policy
ALTER TABLE sim.simulation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs"
ON sim.simulation_runs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own runs"
ON sim.simulation_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 11.3 Academic Integrity

For educational institutions:
- Proctoring integration option
- Activity monitoring
- Plagiarism detection for custom scenarios
- Certificate verification API

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-6)

**Objective:** Core infrastructure and basic simulations

- [ ] Sim schema database setup
- [ ] SimDb client configuration
- [ ] Basic routing structure (/simulator/...)
- [ ] User registration and onboarding
- [ ] Skill assessment quiz
- [ ] Tutorial simulation
- [ ] 5 basic beginner scenarios
- [ ] Basic scoring system
- [ ] Progress tracking

**Milestone:** Users can complete basic simulations

### Phase 2: AI Event Engine (Weeks 7-12)

**Objective:** Dynamic, intelligent simulations

- [ ] AI event generation system
- [ ] Event response processing
- [ ] Decision analysis and feedback
- [ ] 20 intermediate scenarios
- [ ] Adaptive difficulty
- [ ] Real-time hints system
- [ ] NPC (stakeholder) interactions

**Milestone:** AI-driven dynamic simulations operational

### Phase 3: Gamification & Social (Weeks 13-18)

**Objective:** Engagement and retention features

- [ ] XP and leveling system
- [ ] Achievement badges
- [ ] Leaderboards
- [ ] Streak system
- [ ] Weekly/monthly challenges
- [ ] Community forums
- [ ] Custom scenario upload
- [ ] Scenario marketplace

**Milestone:** Full gamification system live

### Phase 4: Monetization (Weeks 19-24)

**Objective:** Revenue generation

- [ ] Subscription tiers implementation
- [ ] Lifetime access purchases
- [ ] Scenario pack purchases
- [ ] Certificate generation and sales
- [ ] Payment processing (Stripe)
- [ ] Corporate licensing system
- [ ] Pricing page and checkout flow
- [ ] Revenue analytics dashboard

**Milestone:** All monetization streams operational

### Phase 5: Advanced Features (Weeks 25-30)

**Objective:** Premium features and scale

- [ ] Advanced scenarios (expert level)
- [ ] Custom scenario AI extraction
- [ ] White-label system
- [ ] LMS integration
- [ ] API for third parties
- [ ] Advanced analytics
- [ ] Mobile app optimization
- [ ] Offline mode

**Milestone:** Enterprise-ready platform

### Phase 6: Polish & Launch (Weeks 31-36)

**Objective:** Production readiness

- [ ] Performance optimization
- [ ] Security hardening
- [ ] Accessibility audit
- [ ] User testing and feedback
- [ ] Documentation completion
- [ ] Marketing website
- [ ] Launch campaign
- [ ] Support system

**Milestone:** Public launch

---

## 13. Success Metrics

### 13.1 User Engagement Metrics

| Metric | Target (6 months) | Target (12 months) |
|--------|-------------------|-------------------|
| Monthly Active Users (MAU) | 5,000 | 25,000 |
| Daily Active Users (DAU) | 1,000 | 5,000 |
| Average Session Duration | 25 min | 30 min |
| Sessions per User per Week | 3 | 4 |
| Simulation Completion Rate | 70% | 80% |
| User Retention (30-day) | 40% | 50% |

### 13.2 Conversion Metrics

| Metric | Target |
|--------|--------|
| Free to Paid Conversion | 10-15% |
| Trial to Subscription | 25% |
| Subscription to Annual | 30% |
| Subscription to Lifetime | 5-10% |
| Certificate Purchase Rate | 40% of completions |

### 13.3 Revenue Metrics

| Metric | Target (12 months) |
|--------|-------------------|
| Monthly Recurring Revenue (MRR) | $100,000 |
| Annual Recurring Revenue (ARR) | $1,200,000 |
| Average Revenue Per User (ARPU) | $15/month |
| Customer Lifetime Value (CLV) | $180 |
| Customer Acquisition Cost (CAC) | $30 |
| CLV:CAC Ratio | 6:1 |

### 13.4 Quality Metrics

| Metric | Target |
|--------|--------|
| User Satisfaction (NPS) | > 50 |
| Support Response Time | < 4 hours |
| Bug Resolution Time | < 48 hours |
| Uptime | 99.9% |
| App Store Rating | 4.5+ stars |

### 13.5 Learning Outcomes

| Metric | Target |
|--------|--------|
| Skill Improvement (pre/post) | > 30% |
| Certification Pass Rate | > 75% |
| User-reported Career Advancement | > 20% |
| Employer Satisfaction (corporate) | > 85% |

---

## 14. Risk Management

### 14.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI event quality inconsistent | Medium | High | Human review, fine-tuning, user feedback |
| Performance issues at scale | Medium | High | Load testing, caching, optimization |
| Integration complexity | Low | Medium | Modular architecture, thorough testing |

### 14.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion rate | Medium | High | A/B testing, pricing optimization |
| Competition | Medium | Medium | Feature differentiation, first-mover advantage |
| Content piracy | Low | Medium | DRM, watermarking, legal action |

### 14.3 User Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Poor onboarding experience | Medium | High | User testing, iteration, tutorials |
| Scenarios feel unrealistic | Medium | High | Expert review, user feedback, iteration |
| Gamification feels forced | Low | Medium | User research, optional features |

---

## 15. Appendices

### Appendix A: Glossary

- **Simulation Run:** A single user session playing through a scenario
- **AI Event:** A dynamically generated challenge or situation
- **Scenario Pack:** A bundle of related scenarios for purchase
- **XP:** Experience Points earned through activities
- **Seed Value:** Random number seed for reproducible AI events

### Appendix B: Competitor Analysis

| Competitor | Strengths | Weaknesses | Our Advantage |
|------------|-----------|------------|---------------|
| PM Certification Courses | Recognized credentials | Theory-focused | Hands-on practice |
| Corporate Training Programs | Enterprise sales | Expensive, inflexible | Self-paced, affordable |
| Free Online Resources | Accessible | No structure, no practice | Structured learning path |
| PM Software Demos | Real tools | Not learning-focused | Learning-first design |

### Appendix C: User Personas

**Persona 1: Career Changer Sarah**
- Age: 32, Marketing Manager
- Goal: Transition to project management
- Pain: No PM experience for interviews
- Need: Portfolio of simulated projects

**Persona 2: Fresh Graduate Mike**
- Age: 24, CS Graduate
- Goal: Land first PM role
- Pain: Theoretical knowledge only
- Need: Practical skills demonstration

**Persona 3: Experienced PM Lisa**
- Age: 45, Senior PM
- Goal: Learn Agile methodologies
- Pain: Traditional PM background
- Need: Safe space to practice new approaches

**Persona 4: Corporate Trainer James**
- Age: 50, L&D Manager
- Goal: Train new PMs efficiently
- Pain: Expensive, time-consuming workshops
- Need: Scalable, measurable training

---

## 16. Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-20 | Project Nidus Team | Initial document |

**Approvals:**

- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Designer
- [ ] Business Analyst

---

**Status:** ✅ **Ready for Development**

---

*This PRD is a living document and will be updated as requirements evolve and user feedback is incorporated.*
