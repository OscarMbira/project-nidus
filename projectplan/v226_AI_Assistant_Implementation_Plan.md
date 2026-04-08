# v226 — AI Assistant Implementation Plan
**Feature:** Context-Aware AI Assistant — Hybrid Engine (Ollama + Gemini Free Tier)
**Date:** 2026-03-14
**Status:** Pending Approval

> **Performance note:** Ollama can take 5–10 minutes to load and may give poor UX. For a **fast, NotebookLM-style** alternative where users interrogate DB/tables via natural language against Supabase (no Ollama), see **v227_AI_Assistant_NotebookLM_Style_Plan.md**.

---

## Confirmed Decisions
| # | Question | Answer |
|---|---|---|
| 1 | Conversation history | Persists across browser sessions — stored in DB |
| 2 | Simulator hints | Real-time during simulation (not post-run only) |
| 3 | AI engine | Hybrid — Ollama for data queries, Gemini free tier for generic knowledge |

---

## 1. Summary

Integrate a fully private, self-hosted AI assistant into Project Nidus using a **hybrid engine**:

- **Ollama + Llama 3.1 8B (self-hosted)** — handles all queries that involve real project data.
  Client data never leaves your infrastructure.
- **Google Gemini 1.5 Flash (free tier)** — handles general PM knowledge questions only.
  No project data is ever sent to Gemini.

A `queryRouter` classifies every user question and directs it to the correct engine automatically.
The UI shows a small privacy badge on each response so users always know which engine answered.

Development runs entirely on localhost. Migration to a cloud VPS requires changing one
environment variable — zero application code changes.

---

## 2. AI Engines

### 2.1 Ollama + Llama 3.1 8B — Private Engine (Data Queries)

| Property | Detail |
|---|---|
| Cost | Free forever |
| Data privacy | 100% — no data sent externally |
| Dev setup | localhost:11434 |
| Production | Same model on a cloud VPS |
| RAM required | 16 GB system RAM (your machine qualifies) |
| Context window | 128K tokens |
| Response speed | ~20–40 tokens/sec on CPU |
| Used for | Any query involving real project data |

### 2.2 Google Gemini 1.5 Flash — Knowledge Engine (Generic Queries)

| Property | Detail |
|---|---|
| Cost | Free tier — 1,500 req/day, 1M tokens/min |
| Data privacy | No project data ever sent — generic knowledge only |
| API key | Free at aistudio.google.com (no billing required) |
| Context window | 1M tokens |
| Used for | General PM knowledge ("What is a risk register?", "Explain earned value") |
| Paid fallback | ~$0.075 per 1M tokens if free limits exceeded |

---

## 3. Hybrid Routing Architecture

### Query Router Logic

```
User Question
      |
      v
queryRouter.js
      |
      |── contains project data keywords?         generic PM knowledge only?
      |   ("my risks", "show issues",              ("what is", "explain",
      |    "which mandates", "stakeholders",        "how do I", "best practice",
      |    "my projects", "portfolio health")        "definition of")
      |                                                      |
      v                                                      v
Ollama (localhost/VPS)                         Gemini 1.5 Flash (free tier)
Private — DB data injected                     No DB data attached
Response badge: "Answered locally"             Response badge: "General knowledge"
      |                                                      |
      └────────────────────┬─────────────────────────────────┘
                           v
                     AIChatMessage.jsx
                  (renders markdown + badge)
```

### When in Doubt — Route to Ollama
If the router cannot clearly classify a query as generic, it defaults to Ollama.
Keeping project data local is always the safe choice.

---

## 4. Architecture: Dev vs Production

### Development (Now)
```
React App (localhost:5173)
        |
        |── data query → POST /api/ai/chat  → Vite Proxy → Ollama (localhost:11434)
        |── generic    → POST /api/ai/gemini → Gemini REST API (external, no DB data)
```

### Production (Later — zero code changes)
```
React App (your domain)
        |
        |── data query → Supabase Edge Function: ai-assistant → Ollama (cloud VPS)
        |── generic    → Supabase Edge Function: ai-knowledge  → Gemini REST API
```

### The Only Change Between Dev and Production
```bash
# .env.development
VITE_AI_LOCAL_ENDPOINT=/api/ai/chat          # Vite proxies to localhost:11434
VITE_AI_GEMINI_ENDPOINT=/api/ai/gemini       # Vite proxies to Gemini REST API
VITE_AI_MODE=local

# .env.production
VITE_AI_LOCAL_ENDPOINT=https://<project>.supabase.co/functions/v1/ai-assistant
VITE_AI_GEMINI_ENDPOINT=https://<project>.supabase.co/functions/v1/ai-knowledge
VITE_AI_MODE=cloud
VITE_GEMINI_API_KEY=<stored as Supabase secret in production — not in .env>
```

---

## 5. One-Time Local Setup (Before Development Begins)

```bash
# Step 1: Download and install Ollama from https://ollama.com (Windows installer)

# Step 2: Pull Llama 3.1 8B (4.7 GB — do this once)
ollama pull llama3.1

# Step 3: Verify Ollama is running
curl http://localhost:11434/api/tags

# Step 4: Get free Gemini API key
# Visit: https://aistudio.google.com/app/apikey
# Create key — no billing required
# Add to .env.development: VITE_GEMINI_API_KEY=your_key_here
```

---

## 6. Security & Privacy Model

| Risk | Mitigation |
|---|---|
| Project data sent to Gemini | queryRouter blocks all data-query requests from reaching Gemini |
| Gemini API key in browser | Key only used in Vite proxy (dev) or Supabase Edge Function secret (prod) — never in browser bundle |
| User sees another org's data | All DB queries use existing RLS — user JWT enforces data boundaries |
| Prompt injection | System prompt and user message sent as separate roles to both engines |
| Conversation log privacy | `ai_messages` rows scoped to `user_id` with RLS |
| Cost overrun (Gemini) | Rate-limit: 20 msgs/hour per user; `maxOutputTokens` cap per request |
| Server load (Ollama) | Same 20 msgs/hour rate limit per user protects the local/VPS model |
| Org-level opt-out | Admins can disable AI per organisation via `ai_settings` table |
| Privacy notice in UI | Chat widget footer: "Project data is processed on our secure servers only. General questions use Gemini." |
| Audit trail | `ai_messages.processed_by` records which engine answered each message |

---

## 7. Phased Implementation

---

### Phase 1 — Foundation (Core Chat Infrastructure)
**Goal:** Working chat widget with hybrid routing, Ollama on localhost + Gemini for generic queries.

- [x] 1.1 Install Ollama + pull `llama3.1` on dev machine
- [x]  Get free Gemini API key from aistudio.google.com — add to `.env.development`
- [x]  Add Vite proxy in `vite.config.js`:
  - `/api/ai/chat` → `localhost:11434` (Ollama)
  - `/api/ai/gemini` → Gemini REST API
- [x]  Create SQL `v321_ai_tables.sql`:
  - `ai_conversations` table — includes `title`, `domain`, session metadata
  - `ai_messages` table — includes `processed_by` column (`local` / `external`)
  - `ai_feedback` table
  - `ai_settings` table — org-level AI on/off + hybrid toggle
  - RLS policies for all tables (scoped to `user_id`)
  - Register all tables in `database_tables` registry
- [x]  Create SQL `v322_sim_ai_tables.sql`:
  - `sim.ai_conversations`, `sim.ai_messages`, `sim.ai_feedback` tables
  - RLS policies for sim tables
  - Register in `database_tables` registry
- [x]  Build `queryRouter.js`:
  - `classifyQuery(question)` → returns `{ engine: 'local' | 'external', reason: string }`
  - Data keywords list: project names, risk/issue/mandate/stakeholder/portfolio/programme/quality/benefit/task
  - Generic keywords list: "what is", "explain", "define", "how do I", "best practice", "what does"
  - Default: `local` if classification is uncertain
- [x]  Create `aiAssistantService.js`:
  - `sendMessage(question, conversationId, context)` — routes via `queryRouter`, calls correct engine
  - `streamResponse(response, onChunk)` — handles streaming tokens from both engines
  - `saveMessage(conversationId, role, content, processedBy)` — persists to `ai_messages`
  - `createConversation(userId, projectId)` — creates session in `ai_conversations`
  - `loadConversation(conversationId)` — loads full message history from DB
- [x]  Build `AIChatWidget.jsx`:
  - Floating action button (bottom-right corner)
  - Slide-in chat panel (dark/light theme aware)
  - Message input with send button and Enter key support
  - Streaming response display (tokens appear as they arrive)
  - Loading indicator during generation
  - Privacy footer notice
  - Error state handling
- [x]  Build `AIChatMessage.jsx`:
  - User message bubble (right-aligned)
  - AI response bubble (left-aligned, renders markdown via `react-markdown`)
  - Small engine badge: "Answered locally" (shield icon) or "General knowledge" (globe icon)
  - Timestamp display
  - Thumbs up/down feedback buttons
- [x] 1.10 Integrate `AIChatWidget` into `Layout.jsx`
- [x] 1.11 Set up `.env.development` and `.env.production` with all AI variables
- [x] 1.12 Write unit tests for `aiAssistantService.js`
- [x] 1.13 Write unit tests for `queryRouter.js`

**SQL Files:** `SQL/v321_ai_tables.sql`, `SQL/v322_sim_ai_tables.sql`
**Deliverable:** Chat widget answers general PM questions via Gemini and routes data queries locally via Ollama. Each response shows which engine answered.

---

### Phase 2 — Data-Aware Responses (DB Context Injection)
**Goal:** Ollama answers data questions using the user's actual live project data from DB.

- [x]  Build `intentDetector.js` — maps question keywords to DB modules:
  - "risk / risks" → risks module
  - "issue / issues" → issues module
  - "mandate" → mandates module
  - "stakeholder" → stakeholders module
  - "portfolio" → portfolio module
  - "programme / program" → programme module
  - "quality" → quality module
  - "benefit / benefits" → benefits module
  - "project / projects" → projects module
  - "task / tasks" → tasks module
  - unrecognised → general (no DB fetch, Ollama answers from training only)
- [x]  Build `contextFetcher.js` — per-module RLS-scoped DB queries:
  - `fetchRiskContext(userId, projectId)` — top 10 open risks by severity
  - `fetchIssueContext(userId, projectId)` — unresolved issues, oldest first
  - `fetchMandateContext(userId, orgId)` — mandates + approval status
  - `fetchProjectContext(userId, orgId)` — project list + statuses + health
  - `fetchStakeholderContext(userId, projectId)` — stakeholder register summary
  - `fetchPortfolioContext(userId, orgId)` — portfolio + programme summary
  - `fetchQualityContext(userId, projectId)` — quality register + overdue reviews
  - `fetchBenefitContext(userId, projectId)` — benefits + measurement status
  - `fetchTaskContext(userId, projectId)` — overdue and in-progress tasks
- [x]  Build `promptBuilder.js` — assembles Ollama prompt:
  - System section: user role, org name, current date, instruction to use only provided data
  - Data section: fetched DB rows formatted as structured plain text
  - User question
  - Note: Gemini prompts are built separately (no DB data injected — general knowledge only)
- [x]  Pass current page context from frontend (`pageModule`, `projectId`) with each message
- [x]  Add "Current Project" dropdown selector in chat widget header
- [x]  Unit tests for `intentDetector.js`
- [x]  Unit tests for each `contextFetcher` function
- [x]  Integration test: data question → router → intent → DB fetch → Ollama → response
- [x]  Integration test: generic question → router → Gemini → response (no DB data in prompt)

**Deliverable:** "You have 3 high-severity open risks on Project Alpha — R-001 (no owner), R-005 (mitigation overdue), R-012 (escalated to PMO)." — answered by Ollama using live DB data.

---

### Phase 3 — Smart Query Engine (Persistent Conversations & Suggestions)
**Goal:** DB-persisted conversation history across sessions, suggested questions, response utilities.

- [x]  Implement DB-persisted conversation history:
  - On chat open: load last active conversation from `ai_conversations` for the user
  - Send last 10 messages from `ai_messages` as context to the AI engine on each new message
  - History survives browser close, logout, device switch
  - `resumeConversation(userId)` — fetches latest open conversation from DB on widget open
- [x]  Conversation history sidebar:
  - List of all past conversations (title, date, project)
  - Click any conversation to reload it in the chat panel
  - "Start new conversation" button
  - Auto-title: first message truncated to 50 chars becomes conversation title
- [x]  Build `AISuggestedQuestions.jsx` — context-aware question chips per page:
  - Dashboard: "What needs my attention today?", "Summarise my portfolio health"
  - Risks page: "Show me all high-severity open risks", "Which risks have no mitigation plan?"
  - Issues page: "List unresolved issues older than 14 days", "Who owns the most open issues?"
  - Mandates page: "Which mandates are pending approval?", "Summarise this project's mandate"
  - Stakeholders page: "Who are my high-influence stakeholders?", "Who has low engagement?"
  - Quality page: "Are there overdue quality reviews?", "Summarise the quality register"
  - Portfolio page: "What is my overall portfolio status?", "Which programmes are behind?"
  - Suggested questions chips are hardcoded per page (fast, predictable, no extra AI call)
- [x]  Save thumbs up/down feedback → `ai_feedback` table
- [x]  Add "Clear conversation" button — closes current conversation, starts a new one
- [x]  Add "Copy response" button on each AI message bubble
- [x]  Unit tests for conversation persistence (load, resume, auto-title)

**Deliverable:** User closes the browser, reopens the app next day — chat resumes exactly where it left off. Follow-up questions ("And which of those have no owner?") work correctly because history is loaded from DB.

---

### Phase 4 — Proactive AI Insights (Dashboard Cards)
**Goal:** AI surfaces actionable insights on the Dashboard without the user asking.

- [x]  Create SQL `v323_ai_insights_cache.sql`:
  - `ai_insights_cache` table — stores pre-generated insights per user, expires 24h
  - RLS policies
  - Register in `database_tables` registry
- [x]  Build `aiInsightsService.js`:
  - `generateInsights(userId, orgId)` — fetches cross-module data, calls Ollama, returns 3–5 insight objects
  - `getCachedInsights(userId)` — returns cached insights if `expires_at` not reached
  - `refreshInsights(userId, orgId)` — force-regenerates and updates cache
  - All insights generated by Ollama only (contains real project data)
- [x]  Build `AIInsightsPanel.jsx` — card grid on Platform Dashboard:
  - Each card: icon, insight text, severity badge (info / warning / critical)
  - "Ask about this" button — opens chat pre-filled with the insight as context
  - "Refresh insights" button
  - Loading skeleton while generating
  - Empty state when AI is disabled for the org
- [x]  Insight categories generated by Ollama:
  - Overdue risks with no assigned owner
  - Mandates pending approval > 7 days
  - Projects with unresolved issues > 21 days
  - Benefits measurements that are overdue
  - Programmes with unhealthy budget variance
  - Stakeholders with low engagement scores
- [x]  Insights refresh on Dashboard load if cache is expired (> 24h)
- [x]  PMO Admin Dashboard: org-wide AI health summary (all projects in one view)
- [x]  Org-level settings: enable/disable proactive insights per organisation
- [x]  Unit tests for `aiInsightsService.js`

**SQL Files:** `SQL/v323_ai_insights_cache.sql`
**Deliverable:** Dashboard shows "Today's AI Insights" cards — e.g. "2 risks on Project Gamma have no owner", "Mandate for Project Delta has been pending 9 days."

---

### Phase 5 — Simulator AI Coach (Real-Time Hints + Post-Run Debrief)
**Goal:** AI coaching triggered in real-time during simulation + personalised post-run debrief.

#### Real-Time Hint Triggers
Hints are fired automatically when any of these events occur during a simulation run:
- User enters a new stage/module
- User's score on a module drops below 60%
- User leaves a critical field blank (e.g. risk with no owner)
- User has been idle on a decision screen for > 90 seconds
- User makes a decision that conflicts with PM best practice

- [x]  Create SQL `v324_sim_ai_debriefs.sql`:
  - `sim.ai_debriefs` table — stores post-simulation AI debrief per run
  - `sim.ai_coach_events` table — logs each hint shown with trigger reason and user response
  - RLS policies for both tables
  - Register in `database_tables` registry
- [x]  Build `simAICoachService.js`:
  - `getRealtimeHint(runId, moduleId, triggerEvent, currentScore)` — returns a contextual hint from Ollama
  - `generateDebrief(runId, userId)` — post-sim full analysis from Ollama using run data
  - `saveDebrief(runId, debriefContent)` — persists to `sim.ai_debriefs`
  - `logCoachEvent(runId, hintText, triggerReason)` — records hint in `sim.ai_coach_events`
- [x]  Build `SimAICoach.jsx` — real-time coaching hints panel:
  - Collapsible panel anchored to the simulation workspace
  - Hint appears with a subtle animation when a trigger event fires
  - Tone: encouraging and educational ("You have 3 risks — consider assigning an owner to each before proceeding to Stage 2")
  - "Dismiss" button per hint
  - "Ask coach" button — opens AI chat pre-filled with hint context for follow-up questions
  - Hints queue: if multiple triggers fire, show one at a time
- [x]  Build `SimAIDebrief.jsx` — post-simulation debrief screen:
  - Overall performance score with AI narrative
  - Per-module scores with AI commentary (what went well, what didn't)
  - "What you did well" section (top 3 strengths)
  - "Areas to improve" section with specific, actionable recommendations
  - Timeline replay: key decision points annotated with AI comments
  - Link to replay the simulation
  - Export debrief as PDF
- [x]  "Past Debriefs" view — user can browse and re-read all previous simulation debriefs
- [x]  Toggle: "Coaching hints" on/off in simulator settings (advanced users can disable)
- [x]  Unit tests for `simAICoachService.js` (hint generation, debrief generation, event logging)

**SQL Files:** `SQL/v324_sim_ai_debriefs.sql`
**Deliverable:** During a simulation, user receives real-time hints when they miss best-practice steps. After the simulation: "Your risk identification was excellent (92%), but stakeholder engagement was low (48%) — you engaged only 3 of 8 key stakeholders before Stage 2."

---

## 8. Database Schema

### v321_ai_tables.sql (public schema)

```sql
-- Conversation sessions (persists across browser sessions)
CREATE TABLE ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id),
  project_id      UUID REFERENCES projects(id),
  title           TEXT,                          -- auto-set from first message (50 chars)
  domain          TEXT DEFAULT 'platform' CHECK (domain IN ('platform', 'simulator')),
  is_active       BOOLEAN DEFAULT TRUE,          -- FALSE when user starts a new conversation
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages (persisted — loaded on chat open)
CREATE TABLE ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  processed_by    TEXT CHECK (processed_by IN ('local', 'external')),  -- which engine answered
  context_modules TEXT[],                        -- DB modules fetched for this turn
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback on responses
CREATE TABLE ai_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  rating     SMALLINT CHECK (rating IN (-1, 1)),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org-level AI settings
CREATE TABLE ai_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  ai_enabled          BOOLEAN DEFAULT TRUE,
  insights_enabled    BOOLEAN DEFAULT TRUE,
  hybrid_enabled      BOOLEAN DEFAULT TRUE,      -- FALSE = force all queries to local only
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id)
);

-- RLS: users see only their own conversations and messages
ALTER TABLE ai_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings       ENABLE ROW LEVEL SECURITY;
```

### v323_ai_insights_cache.sql (public schema)

```sql
CREATE TABLE ai_insights_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id),
  insights        JSONB NOT NULL,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);
ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;
```

### v324_sim_ai_debriefs.sql (sim schema)

```sql
CREATE TABLE sim.ai_debriefs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    JSONB NOT NULL,             -- structured debrief (scores, strengths, improvements)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim.ai_coach_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         UUID NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id      TEXT,
  trigger_reason TEXT,                   -- 'score_low', 'idle', 'blank_field', 'stage_entry', 'bad_decision'
  hint_text      TEXT NOT NULL,
  dismissed      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sim.ai_debriefs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_coach_events  ENABLE ROW LEVEL SECURITY;
```

---

## 9. Frontend File Structure

```
src/
  components/
    ai/
      AIChatWidget.jsx           -- floating button + slide-in panel + history sidebar
      AIChatMessage.jsx          -- message bubble: markdown + engine badge
      AIInsightsPanel.jsx        -- proactive insight cards (Dashboard)
      AISuggestedQuestions.jsx   -- question chips per page
      SimAICoach.jsx             -- real-time coaching hints (Simulator)
      SimAIDebrief.jsx           -- post-simulation debrief screen
  services/
    aiAssistantService.js        -- sendMessage, streamResponse, saveMessage, loadConversation
    aiInsightsService.js         -- generateInsights, getCachedInsights, refreshInsights
    simAICoachService.js         -- getRealtimeHint, generateDebrief, logCoachEvent
  utils/
    queryRouter.js               -- classifyQuery → { engine: 'local' | 'external' }
    intentDetector.js            -- keyword → DB module mapping
    contextFetcher.js            -- per-module RLS-scoped DB queries
    promptBuilder.js             -- assembles Ollama prompt (data queries only)
```

---

## 10. Vite Proxy Configuration (Dev)

```js
// vite.config.js — add to server.proxy
'/api/ai/chat': {
  target: 'http://localhost:11434',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/ai\/chat/, '/api/chat')
},
'/api/ai/gemini': {
  target: 'https://generativelanguage.googleapis.com',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/ai\/gemini/, '')
}
```

---

## 11. Environment Variables

```bash
# .env.development
VITE_AI_LOCAL_ENDPOINT=/api/ai/chat
VITE_AI_GEMINI_ENDPOINT=/api/ai/gemini
VITE_GEMINI_API_KEY=your_free_gemini_key_here
VITE_AI_MODE=local

# .env.production  (Gemini key stored as Supabase secret — NOT here)
VITE_AI_LOCAL_ENDPOINT=https://<project>.supabase.co/functions/v1/ai-assistant
VITE_AI_GEMINI_ENDPOINT=https://<project>.supabase.co/functions/v1/ai-knowledge
VITE_AI_MODE=cloud
```

---

## 12. Production Migration Path (When Ready)

| Step | Action | Effort |
|---|---|---|
| 1 | Provision VPS (Hetzner CX31 or DigitalOcean 8GB, ~$15–20/month) | 15 min |
| 2 | Install Ollama on VPS, pull `llama3.1` | 20 min |
| 3 | Secure Ollama with Nginx reverse proxy + firewall | 30 min |
| 4 | Create Supabase Edge Function `ai-assistant` (data queries → VPS Ollama) | 1 hour |
| 5 | Create Supabase Edge Function `ai-knowledge` (generic queries → Gemini) | 30 min |
| 6 | Set `OLLAMA_URL` and `GEMINI_API_KEY` as Supabase Edge Function secrets | 5 min |
| 7 | Update `.env.production` endpoints | 2 lines |
| 8 | Deploy | Done |

**Zero application code changes required.**

---

## 13. Full Todo Checklist

### Phase 1 — Foundation
- [x] 1.1 Install Ollama + pull llama3.1 on dev machine
- [x]  Get free Gemini API key
- [x]  Add Vite proxy config (Ollama + Gemini)
- [x]  SQL v321: Platform AI tables + RLS (includes `processed_by`, `hybrid_enabled`)
- [x]  SQL v322: Simulator AI tables + RLS
- [x]  queryRouter.js
- [x]  aiAssistantService.js (dual-engine + loadConversation)
- [x]  AIChatWidget.jsx (with history sidebar)
- [x]  AIChatMessage.jsx (with engine badge)
- [x] 1.10 Integrate into Layout.jsx
- [x] 1.11 Environment variables setup
- [x] 1.12 Unit tests for aiAssistantService.js
- [x] 1.13 Unit tests for queryRouter.js

### Phase 2 — Data-Aware Responses
- [x]  intentDetector.js (10 modules + generic)
- [x]  contextFetcher.js (9 data fetchers)
- [x]  promptBuilder.js (Ollama only)
- [x]  Page context passing from frontend
- [x]  Project selector in chat widget
- [x]  Unit tests for intentDetector.js
- [x]  Unit tests for contextFetcher.js
- [x]  Integration test: data query → Ollama
- [x]  Integration test: generic query → Gemini (no DB data)

### Phase 3 — Persistent Conversations & Suggestions
- [x]  DB-persisted conversation history (load/resume on chat open)
- [x]  Conversation history sidebar (list, click to reload, auto-title)
- [x]  AISuggestedQuestions.jsx (7 pages, hardcoded chips)
- [x]  Thumbs up/down feedback → ai_feedback
- [x]  Clear conversation button
- [x]  Copy response button
- [x]  Unit tests for conversation persistence

### Phase 4 — Proactive Insights
- [x]  SQL v323: ai_insights_cache
- [x]  aiInsightsService.js
- [x]  AIInsightsPanel.jsx
- [x]  "Ask about this" button on insight cards
- [x]  Cache refresh logic (on Dashboard load, if expired)
- [x]  PMO Admin org-wide summary
- [x]  Org-level insights toggle
- [x]  Unit tests

### Phase 5 — Simulator AI Coach (Real-Time)
- [x]  SQL v324: sim.ai_debriefs + sim.ai_coach_events
- [x]  simAICoachService.js (hint, debrief, event logging)
- [x]  SimAICoach.jsx (real-time hints with trigger events)
- [x]  SimAIDebrief.jsx (full debrief with export)
- [x]  Past debriefs view
- [x]  Hints on/off toggle in simulator settings
- [x]  Unit tests

### Docs & Blog
- [ ] Documentation/AI_Assistant_Technical_Guide.md
- [ ] Documentation/AI_Assistant_User_Guide.md
- [ ] Documentation/AI_Assistant_Blog.md

---

## 14. Phase Dependencies

```
Phase 1 (Foundation — hybrid routing, chat widget, DB tables)
  └── Phase 2 (Data-Aware — DB context injection into Ollama)
        └── Phase 3 (Smart Queries — persistent conversations, suggestions)
              └── Phase 4 (Insights — dashboard cards from Ollama)
Phase 1
  └── Phase 5 (Simulator Coach — real-time hints, independent of Phase 2–4)
```

---

## 15. Review Section
_(To be completed after implementation)_
