# v227 — AI Assistant: NotebookLM-Style (Final Merged Plan)

**Feature:** Fast, DB-backed natural language query and interrogation — no Ollama
**Date:** 2026-03-15
**Status:** Pending Approval
**Replaces:** v226 (Ollama + Gemini hybrid) — Ollama removed entirely from the critical path
**Source plans merged:** v226 (phase structure, DB schema, UI components), v227 NotebookLM-style draft (Supabase-first, Sources block, template answers), Claude Haiku proposal (rich prose, Supabase Edge Functions, production path), UI/UX dual-surface recommendation

---

## 1. Problem with v226

- Ollama + Llama 3.1 8B takes **5–10 minutes** to load on first use (model loaded into RAM).
- No way to fix this while keeping Ollama — cold start is a fundamental property of local models.
- Poor UX: long "Starting AI…" spinner with no response until model is ready.
- Generic queries (Gemini) were always instant — only the data-query path was broken.

---

## 2. Solution: Dual-Surface AI + NotebookLM-Style Data Retrieval

### Four Surfaces Across Two Domains

The AI is exposed through **four surfaces** across the Platform and Simulator domains. Platform surfaces share one conversation session/service layer; Simulator surfaces share a separate session using the `sim` schema. Both domains follow the same widget → workspace pattern for consistency.

| Domain | Surface | Purpose | When used |
|---|---|---|---|
| **Platform** | Floating Widget ("Quick Ask") | Fast, contextual questions while working | Always visible — bottom-right of every Platform page |
| **Platform** | AI Workspace (`/app/ai`) | Deep work — full Sources, history, cross-module queries | From widget footer or sidebar nav |
| **Simulator** | AI Coach Widget | Real-time hints during simulation runs | Anchored to Simulator workspace during active run |
| **Simulator** | Simulator AI Workspace (`/simulator/ai`) | Review past debriefs, conversation history, coaching summaries | From Simulator sidebar nav or debrief screen |

### User Journey — Platform (Discovery → Deep Use)

```
Step 1 — Discovery (Platform Floating Widget)
User is on the Risks page → notices the floating AI button
→ Clicks suggested question chip: "Show me high-severity risks"
→ Gets instant answer + 2 Source cards in the widget panel
→ Impressed — clicks "Open in AI Workspace →"

Step 2 — Deep Work (Platform AI Workspace)
Full workspace opens at /app/ai
→ Same conversation already loaded (no restart)
→ Sources displayed in spacious right panel
→ User continues asking cross-module questions
→ Conversation history in left sidebar
→ User bookmarks /app/ai and returns directly

Step 3 — Returning User
User opens app → goes directly to /app/ai from sidebar
→ Last conversation resumes automatically
→ Suggested questions change based on current context/project
```

### User Journey — Simulator (Coaching → Review)

```
Step 1 — Active Coaching (AI Coach Widget)
User is mid-simulation on the Risk module
→ Score drops below 60% → hint fires automatically
→ "You have 3 risks — consider assigning owners before Stage 2"
→ User dismisses or clicks "Ask Coach" for follow-up

Step 2 — Post-Run Debrief (Debrief Screen)
Simulation ends → SimAIDebrief.jsx opens full screen
→ AI narrative: strengths, areas to improve, per-module scores
→ "View in AI Workspace →" link appears

Step 3 — Deep Review (Simulator AI Workspace)
Full workspace opens at /simulator/ai
→ All past debriefs in left history panel
→ Selected debrief displayed in centre panel
→ Module score breakdown in right panel
→ User can ask follow-up questions about their past runs
→ User can compare across multiple simulation runs
```

### Three Core Parts

**Part 1 — NotebookLM-Style Data Retrieval (Supabase-first)**
1. User asks in natural language → system interrogates Supabase via RLS-scoped queries
2. Returns **structured "Sources"** — actual DB records shown as cards
3. A short answer is generated from those records
The DB records ARE the answer. No model load. Immediate.

**Part 2 — AI Prose Generation (Cloud, Fast)**
For a richer conversational answer on top of the retrieved data:
- **Default (recommended):** One **Claude Haiku** call with fetched context → 1–2 second rich prose response
- **Budget option:** One **Gemini 1.5 Flash** call (free tier) → 1–3 second 1–2 sentence summary
- **Privacy mode:** Template answer only — data never leaves Supabase, zero external API call

The organisation controls which mode is active via the `ai_settings` table. The Sources block always appears regardless of mode.

**Part 3 — System Documentation Queries (New)**
User asks how the system works → AI searches the indexed documentation content and answers from it:
- "How do I submit a mandate for approval?"
- "What fields are on the quality register?"
- "How does trial expiry work?"
- "What is the difference between a programme and a portfolio?"

Answers sourced from the Documentation folder content (user guides, technical guides). Sources block shows the document name with a link to the Documentation page.

**Part 4 — Generic PM Knowledge (Gemini — unchanged)**
Unchanged from v226: Gemini 1.5 Flash answers all generic knowledge questions ("what is a risk register", "explain earned value"). No project data ever sent.

---

## 3. UI/UX Architecture

### Surface 1 — Floating Widget ("Quick Ask")

```
┌─────────────────────────────────────────┐
│ 🤖 AI Assistant                    [ ✕ ]│
│─────────────────────────────────────────│
│ Suggested questions (chips):            │
│ [Show high risks] [Pending approvals]   │
│─────────────────────────────────────────│
│                                         │
│  You: Show me high-severity risks       │
│                              ──────►    │
│  AI: Found 3 critical risks on          │
│  Project Alpha. R-001 has no owner      │
│  and is 14 days overdue.                │
│                                         │
│  Sources (2 of 3 shown):                │
│  ┌────────────────────────────────┐     │
│  │ R-001 · Critical · No owner ↗ │     │
│  │ R-005 · High · Overdue 7d   ↗ │     │
│  │ + 1 more · Open in workspace  │     │
│  └────────────────────────────────┘     │
│─────────────────────────────────────────│
│ [ Ask something...              Send ]  │
│─────────────────────────────────────────│
│ 📋 Open in AI Workspace →               │
│ 🔒 Answered from your data              │
└─────────────────────────────────────────┘
                              [ 🤖 ]
```

**Widget behaviour rules:**
- Always visible bottom-right on every Platform page (Layout.jsx)
- Default state: collapsed to a single floating button with a pulse indicator when new insights are available
- Expanded state: 420px wide × 520px tall slide-in panel
- Suggested question chips auto-update based on the current page (e.g. Risks page shows risk chips)
- Sources block shows maximum **2 cards** in the widget — "Open in workspace" to see all
- **Message limit:** After 3 message exchanges, a persistent banner appears: "Continue this conversation in the AI Workspace for full sources and history →"
- "Open in AI Workspace →" link always visible in footer — opens `/app/ai` with the current conversation already loaded
- Widget and workspace share the exact same conversation session — opening the workspace is not a restart

---

### Surface 2 — AI Workspace (`/app/ai`) — Three-Panel Layout

```
┌──────────────────┬─────────────────────────────────┬──────────────────────┐
│  CONVERSATIONS   │         CHAT WINDOW              │   SOURCES PANEL      │
│  (left sidebar)  │         (centre)                 │   (right panel)      │
│──────────────────│─────────────────────────────────│──────────────────────│
│ + New chat       │ 🤖 AI Workspace        [⚙ ][✕] │ Sources (3 records)  │
│                  │─────────────────────────────────│──────────────────────│
│ ▼ Today          │ Project: [Alpha ▾]  [Export ▾]  │ ■ R-001              │
│   High risks     │─────────────────────────────────│   Critical · No owner│
│   Portfolio Q    │                                  │   [Open record ↗]    │
│                  │  You: Show me high-severity      │                      │
│ ▼ Yesterday      │  risks on Project Alpha          │ ■ R-005              │
│   Mandate status │                        ──────►  │   High · Overdue 7d  │
│   Issue aging    │  AI: Project Alpha has 3         │   [Open record ↗]    │
│                  │  critical risks. R-001 has no    │                      │
│ ▼ Last week      │  owner and is 14 days overdue.   │ ■ R-012              │
│   Benefits rev.  │  R-005 mitigation is overdue.    │   High · Escalated   │
│   Stakeholders   │  R-012 has been escalated.       │   [Open record ↗]    │
│                  │                                  │──────────────────────│
│                  │  👍 👎  Copy                     │ Filter sources:      │
│                  │─────────────────────────────────│ [All modules ▾]      │
│                  │                                  │                      │
│                  │  [Ask a follow-up question... ]  │ Export sources:      │
│                  │                          [Send]  │ [Excel][CSV][Print]  │
│──────────────────│─────────────────────────────────│──────────────────────│
│ 🔒 Data mode: Claude │ Answered from your data     │ 3 records found      │
└──────────────────┴─────────────────────────────────┴──────────────────────┘
```

**Workspace behaviour rules:**
- Route: `/app/ai` — accessible from sidebar nav under a top-level "AI Assistant" menu item
- Three-panel layout (responsive: collapses to tabs on mobile/PWA)
- **Left panel:** Conversation history list (title, date, project); "New chat" button; auto-title from first message
- **Centre panel:** Full chat window; project selector dropdown; Export conversation button; message bubbles with thumbs up/down and copy; streaming response display
- **Right panel:** Sources block for the currently selected/last message — all records shown (not limited to 2); filter by module; export Sources to Excel/CSV/Print
- On load: resumes last active conversation automatically
- On mobile (PWA): three panels collapse to a tabbed layout — Chat / Sources / History tabs
- Keyboard shortcut: `Ctrl+Shift+A` opens the workspace from anywhere

---

---

### Surface 3 — Simulator AI Coach Widget (Active Run Only)

```
┌─────────────────────────────────────────┐
│ 🎓 AI Coach              [on/off] [ ✕ ] │
│─────────────────────────────────────────│
│ ⚠ Score dropped below 60% on Risks     │
│                                         │
│ "You have 3 risks with no assigned      │
│  owner. Best practice: assign owners    │
│  before moving to Stage 2."             │
│                                         │
│  [Dismiss]  [Ask Coach about this →]   │
│─────────────────────────────────────────│
│ Next hint: Stage 2 entry — 2 pending    │
└─────────────────────────────────────────┘
```

**Coach widget behaviour rules:**
- Anchored to the Simulator workspace (not floating globally — only visible during an active run)
- Appears automatically on trigger events (score drop, idle, blank field, stage entry, bad decision)
- One hint shown at a time — queue if multiple triggers fire simultaneously
- "Ask Coach about this →" pre-fills the coach input with the hint context
- On/off toggle in Simulator settings (advanced users can disable)
- At run end: widget transitions to "View your debrief →" button

---

### Surface 4 — Simulator AI Workspace (`/simulator/ai`)

```
┌──────────────────┬─────────────────────────────────┬──────────────────────┐
│  DEBRIEF HISTORY │      DEBRIEF / CHAT WINDOW       │  MODULE SCORES PANEL │
│  (left sidebar)  │         (centre)                 │  (right panel)       │
│──────────────────│─────────────────────────────────│──────────────────────│
│ + New chat       │ 🎓 Simulator AI Workspace  [⚙ ] │ Run: Scenario A      │
│                  │─────────────────────────────────│ 2026-03-14           │
│ ▼ Debriefs       │ Run: [Scenario A ▾] [Export ▾]  │──────────────────────│
│   Scenario A     │─────────────────────────────────│ Risk Mgmt      92%   │
│   Scenario B     │                                  │ Stakeholders   48%   │
│   Scenario C     │  AI: Your risk identification    │ Quality        71%   │
│                  │  was excellent (92%). However,   │ Issues         65%   │
│ ▼ Conversations  │  stakeholder engagement was      │ Benefits       80%   │
│   Risk Q&A       │  low (48%) — you engaged only    │──────────────────────│
│   Stage 2 help   │  3 of 8 key stakeholders.        │ Overall: 71%         │
│                  │                                  │                      │
│                  │  What went well:                 │ Compare runs:        │
│                  │  ✓ Risk identification            │ [Select run ▾]      │
│                  │  ✓ Issue escalation               │                      │
│                  │                                  │ Export scores:       │
│                  │  Areas to improve:               │ [Excel][PDF][Print]  │
│                  │  • Stakeholder engagement         │                      │
│                  │  • Stage 2 decision timing        │                      │
│                  │─────────────────────────────────│                      │
│                  │  [Ask a follow-up question...]   │                      │
│                  │                          [Send]  │                      │
│──────────────────│─────────────────────────────────│──────────────────────│
│ 🎓 Simulator AI  │ Powered by Claude Haiku          │ 5 modules scored     │
└──────────────────┴─────────────────────────────────┴──────────────────────┘
```

**Simulator workspace behaviour rules:**
- Route: `/simulator/ai` — accessible from Simulator sidebar nav
- Uses `sim` schema DB tables (`sim.ai_conversations`, `sim.ai_messages`, `sim.ai_debriefs`) — completely separate from Platform conversations
- **Left panel:** Debrief history (grouped by run/scenario) + general coaching conversations; "New chat" button
- **Centre panel:** Debrief narrative OR free-form chat with the AI coach; run selector dropdown; Export debrief (PDF/Word)
- **Right panel:** Module scores for the selected run; compare with another run; export scores
- On load: opens the most recent debrief automatically
- User can ask follow-up questions: "Why was my stakeholder score low?", "What should I have done differently in Stage 2?"
- "Compare runs" feature: select two runs → right panel shows side-by-side module scores
- Mobile/PWA: three panels collapse to tabs — Debrief / Scores / History

---

### Navigation and Entry Points

All routes into the AI experience funnel through the correct domain's conversation session:

**Platform entry points:**

| Entry point | Where | Action |
|---|---|---|
| Floating widget button | Every Platform page (bottom-right) | Opens Platform widget panel |
| "Open in AI Workspace →" | Widget footer | Opens `/app/ai` with current conversation |
| "AI Assistant" sidebar item | Platform sidebar (all roles) | Navigates to `/app/ai` |
| "Ask about this" on Insight card | Dashboard | Opens widget pre-filled with insight context |
| Suggested question chip | Any page (in widget) | Pre-fills widget input and sends |
| `Ctrl+Shift+A` keyboard shortcut | Platform — anywhere | Opens Platform AI Workspace |

**Simulator entry points:**

| Entry point | Where | Action |
|---|---|---|
| AI Coach Widget (auto-trigger) | Simulator workspace (active run) | Hint fires on trigger event |
| "Ask Coach about this →" | Coach widget | Pre-fills coach input with hint context |
| "View your debrief →" | Coach widget (run end) | Opens `SimAIDebrief.jsx` full screen |
| "View in AI Workspace →" | Post-run debrief screen | Opens `/simulator/ai` with that debrief loaded |
| "AI Workspace" sidebar item | Simulator sidebar | Navigates to `/simulator/ai` |
| `Ctrl+Shift+S` keyboard shortcut | Simulator — anywhere | Opens Simulator AI Workspace |

---

## 4. Engine Routing (Updated)

```
User types question (in widget OR workspace — same service)
        │
        ▼
queryRouter.js  (classifies data vs generic)
        │
        ├── data query ─────────────────────────────────────────────────────────┐
        │                                                                        │
        │   intentDetector.js (maps keywords → DB modules)                      │
        │           │                                                            │
        │           ▼                                                            │
        │   contextFetcher.fetchContextStructured()  [Supabase, RLS-scoped]     │
        │           │                                                            │
        │           ├── structured: { risks: [...rows], issues: [...rows] }     │
        │           │   → widget: first 2 cards + "Open in workspace"           │
        │           │   → workspace: all cards in right Sources panel           │
        │           │                                                            │
        │           └── formattedText (for AI summary prompt)                   │
        │                       │                                                │
        │               org ai_settings.data_answer_mode                        │
        │                  │           │            │                            │
        │              'template'  'claude'     'gemini'                        │
        │                  │           │            │                            │
        │            Template    Claude Haiku   Gemini Flash                    │
        │            string      via Supabase   via Supabase                    │
        │            (instant,   Edge Function  Edge Function                   │
        │            no API)     (~1-2 s)       (~1-3 s, free)                  │
        │                  │           │            │                            │
        │                  └───────────┴────────────┘                           │
        │                              │                                         │
        │                        Answer text                                    │
        │                              │                                         │
        │              AIChatMessage.jsx (same component, both surfaces)        │
        │           [Answer text] + [Sources: 2 in widget / all in workspace]   │
        │                                                                        │
        ├── docs query ────────────────────────────────────────────────────────►
  │                               │
  │                   docFetcher.js
  │                   keyword search on ai_docs_index (Supabase table)
  │                   pre-indexed chunks from Documentation/ folder
  │                               │
  │                   Matching chunks -> Edge Function ai-docs
  │                   Claude Haiku answers from doc content only
  │                               │
  │                   AIChatMessage.jsx
  │                   [Answer] + Sources: [Doc name -> /app/documentation]
  │                   badge: "Answered from system docs"
  │
  └── generic query ──────────────────────────────────────────────────────►
                                        │
                                Gemini 1.5 Flash
                                via Supabase Edge Function
                                (no project data sent)
                                        │
                                AIChatMessage.jsx
                                [Answer] + badge: "General knowledge"
```

---

## 5. Data Answer Modes (Org Setting)

| Mode | Answer text | Data leaves Supabase? | Speed | Cost |
|---|---|---|---|---|
| `template` | "Found 3 high-severity risks. See details below." | No | Instant | Free |
| `claude` (default) | Rich prose: "Project Alpha has 3 critical risks. R-001 has no owner and is 14 days overdue…" | Snippet to Anthropic | ~1–2 s | ~$0.25/M input tokens |
| `gemini` | 1–2 sentence summary | Snippet to Google | ~1–3 s | Free (1,500 req/day) |

**In all modes:** Sources block always shown — in widget (2 cards) and workspace (all cards).

**Privacy note in widget footer / workspace status bar:** "Your data is queried directly from your secure database. [If claude/gemini: A data snippet is sent to [Anthropic/Google] to generate a summary.]"

---

## 6. Supabase Edge Functions (Production-Ready)

All external AI API calls are made server-side via Supabase Edge Functions. API keys never reach the browser.

| Edge Function | Calls | When |
|---|---|---|
| `ai-data-summary` | Claude Haiku or Gemini Flash | data_answer_mode = 'claude' or 'gemini' |
| `ai-knowledge` | Gemini 1.5 Flash | Generic PM knowledge queries |
| `ai-simulator-hint` | Gemini 1.5 Flash | Real-time simulator coaching hints |
| `ai-simulator-debrief` | Claude Haiku (richer) | Post-simulation full debrief |

**Supabase secrets (never in .env):**
```
ANTHROPIC_API_KEY   → ai-data-summary (claude mode), ai-simulator-debrief
GEMINI_API_KEY      → ai-knowledge, ai-data-summary (gemini mode), ai-simulator-hint
```

---

## 7. Database Schema Changes (Additions to v226 Schema)

### 7.1 Changes to `ai_settings` table (extend v321)

```sql
ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS data_answer_mode TEXT
    NOT NULL DEFAULT 'claude'
    CHECK (data_answer_mode IN ('template', 'claude', 'gemini'));

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS data_privacy_accepted_at TIMESTAMPTZ;
```

### 7.2 Changes to `ai_messages` table (extend v321)

```sql
-- Stores Sources alongside the message for history rehydration
ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS structured_data JSONB;
-- Shape: { "modules": { "risks": [...], "issues": [...] }, "row_count": 3 }
```

### 7.3 `sim.ai_settings` table (sim schema parity)

```sql
CREATE TABLE IF NOT EXISTS sim.ai_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id            UUID NOT NULL,
  ai_enabled                 BOOLEAN DEFAULT TRUE,
  insights_enabled           BOOLEAN DEFAULT TRUE,
  data_answer_mode           TEXT NOT NULL DEFAULT 'claude'
                               CHECK (data_answer_mode IN ('template', 'claude', 'gemini')),
  data_privacy_accepted_at   TIMESTAMPTZ,
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id)
);
ALTER TABLE sim.ai_settings ENABLE ROW LEVEL SECURITY;
```

All schema changes: `SQL/v330_ai_settings_data_answer_mode.sql`, `SQL/v331_ai_docs_index.sql`

### 7.4 `ai_docs_index` table (public schema)

SQL file: `SQL/v331_ai_docs_index.sql` — creates `ai_docs_index` table with columns: id, doc_filename, doc_title, chunk_index, chunk_text, keywords (TEXT[]), doc_route, created_at, updated_at. RLS enabled: authenticated users can read all rows (system-wide docs, no org scoping). Registered in database_tables registry.

**Indexing strategy:** Documentation files are chunked (~500 words each) and inserted via `scripts/seed_docs_index.js`. Re-run whenever docs are updated. Keyword array matching used for V1 search (no vector embeddings needed).

---

## 8. New and Changed Files

| File | Type | Change |
|---|---|---|
| `src/pages/app/AIWorkspace.jsx` | **New** | Platform three-panel AI Workspace (`/app/ai`) |
| `src/components/ai/AIWorkspaceChat.jsx` | **New** | Centre panel — full chat, project selector, export |
| `src/components/ai/AIWorkspaceSources.jsx` | **New** | Right panel — all Sources cards, filter, export, record links |
| `src/components/ai/AIWorkspaceHistory.jsx` | **New** | Left panel — Platform conversation history list |
| `src/pages/simulator/SimAIWorkspace.jsx` | **New** | Simulator three-panel AI Workspace (`/simulator/ai`) |
| `src/components/ai/SimAIWorkspaceDebrief.jsx` | **New** | Centre panel — debrief narrative + follow-up chat |
| `src/components/ai/SimAIWorkspaceScores.jsx` | **New** | Right panel — module scores, compare runs, export |
| `src/components/ai/SimAIWorkspaceHistory.jsx` | **New** | Left panel — debrief history + coaching conversations |
| `src/components/ai/AIChatWidget.jsx` | Modify | Limit to 3 exchanges; add "Open in workspace →" footer link; remove Ollama spinner; update badge |
| `src/components/ai/AIChatMessage.jsx` | Modify | Sources block: 2 cards in widget mode / all cards in workspace mode (prop: `surface='widget'|'workspace'`) |
| `src/utils/contextFetcher.js` | Modify | Add `fetchContextStructured()` — returns `{ formattedText, structured: { moduleName: [rows] } }` |
| `src/utils/dataAnswerTemplates.js` | **New** | Template sentences from module name + row counts/titles |
| `src/utils/queryRouter.js` | Modify | Rename `engine: 'local'` → `engine: 'data'`; remove Ollama availability check |
| `src/services/aiAssistantService.js` | Modify | Data path: contextFetcher + mode-based answer; remove all Ollama calls |
| `src/services/aiInsightsService.js` | Modify | Rule-based (Option A) or Gemini (Option B); remove Ollama |
| `src/services/simAICoachService.js` | Modify | Hints → Gemini Edge Function; debrief → Claude Haiku Edge Function |
| `src/config/pmMenuConfig.js` | Modify | Add "AI Assistant" top-level sidebar item → `/app/ai` |
| `supabase/functions/ai-data-summary/` | **New** | Claude Haiku or Gemini for data summaries |
| `supabase/functions/ai-knowledge/` | **New** | Gemini for generic PM knowledge |
| `supabase/functions/ai-simulator-hint/` | **New** | Gemini for simulator hints |
| `supabase/functions/ai-simulator-debrief/` | **New** | Claude Haiku for post-run debriefs |
| `SQL/v330_ai_settings_data_answer_mode.sql` | **New** | Schema additions: data_answer_mode, structured_data, sim.ai_settings |
| `SQL/v331_ai_docs_index.sql` | **New** | `ai_docs_index` table + RLS + database_tables registry |
| `src/utils/docFetcher.js` | **New** | Keyword search on `ai_docs_index`; returns matching chunks + doc metadata |
| `supabase/functions/ai-docs/` | **New** | Edge Function: Claude Haiku answers from doc chunks only |
| `scripts/seed_docs_index.js` | **New** | Chunks Documentation/ files and upserts into `ai_docs_index` |

---

## 9. Phased Implementation Plan

---

### Phase 1 — Remove Ollama, Add Supabase-First Data Path

**Goal:** Data queries return instantly from Supabase. No Ollama. No loading wait. Foundation for both surfaces.

- [x] 1.1 Extend `contextFetcher.js`: add `fetchContextStructured()` returning `{ formattedText, structured: { moduleName: [rows] } }` for all 9 modules (risks, issues, mandates, stakeholders, portfolio, programme, quality, benefits, tasks)
- [x] 1.2 Create `src/utils/dataAnswerTemplates.js`: template sentences per module + row counts
- [x] 1.3 Update `aiAssistantService.sendMessage` for `engine === 'data'`:
  - Call `fetchContextStructured`
  - If no rows: return "No matching records found in your data."
  - Read `data_answer_mode` from org `ai_settings`
  - `template` mode: return template string immediately
  - `claude` / `gemini` mode: call Edge Function `ai-data-summary`
  - Save `structured_data` to `ai_messages.structured_data`
  - Return `{ content, engine: 'data', structured }`
- [x] 1.4 Remove all Ollama code from `aiAssistantService.js`: `checkOllamaStatus`, `warmupOllama`, `streamOllama`, Ollama fetch calls, Vite proxy references for Ollama
- [x] 1.5 Update `queryRouter.js`: rename `engine: 'local'` → `engine: 'data'`; remove Ollama availability check; update all consumers
- [x] 1.6 Create Supabase Edge Function `ai-data-summary`:
  - Input: `{ formattedText, question, mode: 'claude' | 'gemini' }`
  - `claude`: call Claude Haiku (ANTHROPIC_API_KEY secret); system prompt: "Answer only from the provided data. Be concise. Do not invent."
  - `gemini`: call Gemini 1.5 Flash (GEMINI_API_KEY secret)
  - Return: `{ answer: string }`
- [x] 1.7 Create Supabase Edge Function `ai-knowledge`:
  - Input: `{ question }`; calls Gemini 1.5 Flash; no project data attached
  - Return: `{ answer: string }`
- [x] 1.8 SQL `v330_ai_settings_data_answer_mode.sql`
- [x] 1.9 Unit tests: `dataAnswerTemplates.js`; `queryRouter.js` (dataAnswerTemplates and queryRouter tests added)

**Deliverable:** Core AI service works without Ollama. Both surfaces can now call `aiAssistantService` and get instant responses.

---

### Phase 1.5 — Documentation Query Path

**Goal:** AI can answer "how do I" and system-knowledge questions by searching indexed Documentation content. Sources block shows the document with a link to the Documentation page.

- [x] 1.5.1 Create `SQL/v331_ai_docs_index.sql`: `ai_docs_index` table + RLS + database_tables registry
- [x] 1.5.2 Create `scripts/seed_docs_index.js`:
  - Reads all .md files in Documentation/ folder
  - Splits each into ~500-word chunks
  - Extracts keywords (header words, bold terms) per chunk
  - Upserts into `ai_docs_index` (re-runnable)
- [x] 1.5.3 Create `src/utils/docFetcher.js`:
  - `fetchDocContext(question)` queries `ai_docs_index` using PostgreSQL array overlap on `keywords`
  - Returns `{ chunks: [{ doc_title, chunk_text, doc_filename, doc_route }], formattedText }`
  - Max 3 chunks per query
- [x] 1.5.4 Update `queryRouter.js`: add `engine: 'docs'` classification:
  - Triggers on: "how do I", "how does", "what fields", "where is", "how to", "what is the process", "guide", "help with"
  - Priority order: data > docs > generic
- [x] 1.5.5 Update `intentDetector.js`: recognise `docs` as a module type
- [x] 1.5.6 Update `aiAssistantService.sendMessage` for `engine === 'docs'`:
  - Call `docFetcher.fetchDocContext(question)`
  - If no chunks found: fall back to generic (Gemini) path
  - Call Edge Function `ai-docs` or Gemini fallback with chunks + question
  - Save `structured_data: { modules: { docs: [{ doc_title, doc_filename, doc_route }] } }`
  - Return `{ content, engine: 'docs', structured }`
- [x] 1.5.7 Create Supabase Edge Function `ai-docs`:
  - Input: `{ chunks, question }`
  - Calls Claude Haiku; system prompt: "Answer only from the provided documentation chunks. Do not use external knowledge."
  - Return: `{ answer: string }`
- [x] 1.5.8 Sources block for docs responses:
  - Widget/workspace: doc name as source card with link (doc_route)
  - Badge: "Answered from system docs"
- [x] 1.5.9 Add docs suggested question chips to `AISuggestedQuestions.jsx`:
  - Global: "How do I create a mandate?", "What is the approval process?"
  - Per-page: Risks, Quality, Mandates, etc. with how-to questions
- [x] 1.5.10 Unit tests: `docFetcher.fetchDocContext`; queryRouter docs classification
- [x] 1.5.11 `npm run seed:ai-docs` script + `Documentation/AI_Docs_Index_Seed_Guide.md`; run seed after applying v331 to populate `ai_docs_index`

**Deliverable:** User asks "How do I submit a mandate for approval?" -> AI searches indexed docs -> answers from the User Guide -> Sources card shows the document with a link to the Documentation page.

---

### Phase 2 — Floating Widget ("Quick Ask" — Updated)

**Goal:** Updated floating widget — fast contextual answers, drives discovery, nudges to workspace after 3 messages.

- [x] 2.1 Update `AIChatWidget.jsx`:
  - Remove Ollama warmup spinner and "Starting AI…" state entirely
  - Default collapsed state: floating button (bottom-right)
  - Expanded: slide-in panel, dark theme default
  - Engine badge updated to "Answered from your data" (data queries) / "General knowledge" (generic)
- [x] 2.2 Message limit in widget:
  - After 3 message exchanges: show persistent banner "Continue this conversation in the AI Workspace for full sources and history →"
  - "Open in AI Workspace" link in banner and always in footer
- [x] 2.3 "Open in AI Workspace →" link:
  - Always visible in widget footer; opens `/platform/ai?conversation=<id>`
  - Workspace loads and resumes that exact conversation
- [x] 2.4 Sources block in widget (limited):
  - Show maximum 2 Source cards per response; "+N more — Open in workspace" when more
  - Compact labels per source row
- [x] 2.5 Suggested question chips: auto-update based on current page route (existing AISuggestedQuestions)
- [x] 2.6 Privacy footer: "Your data is queried from your database. Summary may use AI (Gemini)."
- [x] 2.7 Unit tests: widget open/close; message count banner trigger; "Open in workspace" link passes conversation ID; Sources truncation to 2 cards

**Deliverable:** Floating widget is the discovery surface — fast, contextual, always accessible. After 3 exchanges it actively guides users to the full workspace.

---

### Phase 3 — AI Workspace Page (`/app/ai`)

**Goal:** Full three-panel NotebookLM-style workspace for deep work, full Sources, and conversation history.

- [x] 3.1 Create `src/pages/platform-app/AIWorkspace.jsx` — route `/platform/ai`:
  - Reads `?conversation=<id>` query param on load — resumes that conversation if present
  - Otherwise resumes last active conversation for the user
  - Renders three-panel layout (left: history, centre: chat, right: sources placeholder)
- [x] 3.2 Left panel: conversation history list, "New chat", click to load conversation
- [x] 3.3 Centre panel: full chat, project selector, `AIChatMessage` with `surface='workspace'`, streaming
- [x] 3.4 Create `src/components/ai/AIWorkspaceSources.jsx` — right panel (filter by module, export CSV/Print, record links)
- [x] 3.5 Update `AIChatMessage.jsx`: add `surface` prop (`'widget'` | `'workspace'`): widget = max 2 cards + "N more"; workspace = all in message
- [x] 3.6 Mobile/PWA layout: three panels collapse to tabs
- [x] 3.7 Add "AI Assistant" to sidebar navigation (`pmMenuConfig.js` + Sidebar `bot` icon): path `/platform/ai`
- [x] 3.8 Unit tests: workspace load with conversation ID; Sources panel update on message click; mobile tab layout; conversation history list; history search

**Deliverable:** Full three-panel AI Workspace at `/platform/ai`. User can interrogate all their data, see full Sources in message, review conversation history. Right panel Sources detail and export in follow-up.

---

### Phase 4 — Org Settings and Privacy Controls

**Goal:** Organisation admins control which AI mode is used and see clear privacy notices across both surfaces.

- [x] 4.1 Org settings page: add "AI Data Answer Mode" section:
  - Radio buttons: Template only (private) / Claude Haiku (recommended) / Gemini Flash (free tier)
  - Description of what each mode sends externally
  - Privacy acceptance acknowledgement (required for Claude/Gemini)
  - Save to `ai_settings.data_answer_mode` and `data_privacy_accepted_at`
- [x] 4.2 First-time privacy modal: when org admin first enables Claude or Gemini mode, one-time disclosure modal before saving
- [x] 4.3 Privacy footer in widget (dynamic text per mode)
- [x] 4.4 Privacy status bar in workspace bottom bar (dynamic text per mode)
- [x] 4.5 Platform–Simulator parity: same settings in `sim.ai_settings`
- [x] 4.6 Unit tests: settings save/load; privacy notice content per mode; first-time modal trigger

**Deliverable:** Full transparency and admin control across both surfaces.

---

### Phase 5 — Persistent Conversations and Suggested Questions

*Preserved from v226 Phase 3 — updated for dual-surface.*

- [x] 5.1 DB-persisted conversation history: load last active conversation on widget open OR workspace load; send last 10 messages as context on each new message
- [x] 5.2 Conversation auto-title: first message truncated to 50 chars becomes the conversation title
- [x] 5.3 `AISuggestedQuestions.jsx` — question chips shown in widget, auto-updated per page (7 pages):
  - Dashboard: "What needs my attention today?", "Summarise my portfolio health"
  - Risks: "Show me all high-severity open risks", "Which risks have no mitigation plan?"
  - Issues: "List unresolved issues older than 14 days", "Who owns the most open issues?"
  - Mandates: "Which mandates are pending approval?", "Summarise this project's mandate"
  - Stakeholders: "Who are my high-influence stakeholders?", "Who has low engagement?"
  - Quality: "Are there overdue quality reviews?", "Summarise the quality register"
  - Portfolio: "What is my overall portfolio status?", "Which programmes are behind?"
- [x] 5.4 Workspace: conversation history sidebar (left panel, covered in Phase 3 above — cross-reference)
- [x] 5.5 Thumbs up/down feedback → `ai_feedback` table (both surfaces)
- [x] 5.6 "Clear conversation" and "Copy response" buttons (both surfaces)
- [x] 5.7 Unit tests: conversation persistence; auto-title; resume on widget open and workspace load

**Deliverable:** User closes browser, reopens next day — widget resumes last conversation; workspace resumes last conversation. Both are the same session.

---

### Phase 6 — Proactive Dashboard Insights

*Adapted from v226 Phase 4 — Ollama replaced.*

- [x] 6.1 `aiInsightsService.js` — default rule-based (no external API):
  - Run Supabase queries for each insight category
  - Build template insight strings from results
  - Categories: risks with no owner; mandates pending > 7 days; issues unresolved > 21 days; benefits measurements overdue; budget variance > 15%; stakeholders with low engagement
  - Store in `ai_insights_cache` (expires 24h)
- [x] 6.2 Optional Gemini narrative (org setting `insights_mode = 'gemini'`):
  - Send aggregated rule-based text to Gemini — no individual records
  - Document: "Aggregated summary data sent to Google."
- [x] 6.3 `AIInsightsPanel.jsx` on Platform Dashboard:
  - Insight cards: icon, text, severity badge (info/warning/critical)
  - "Ask about this" → opens widget pre-filled with insight context
  - "Refresh" button; loading skeleton; empty state
- [x] 6.4 PMO Admin Dashboard: org-wide AI health summary
- [x] 6.5 Org-level toggle: enable/disable proactive insights
- [x] 6.6 Unit tests for `aiInsightsService.js`

**Deliverable:** Dashboard "Today's Insights" cards — instant from Supabase rule queries. "Ask about this" drives users into the widget and then to the workspace.

---

### Phase 7 — Simulator AI Coach + Simulator AI Workspace

*Adapted from v226 Phase 5 — Ollama replaced. Simulator now has full parity with Platform: coach widget (active run) + three-panel AI Workspace (`/simulator/ai`).*

#### Part A — AI Coach Widget (Active Run)

- [x] 7.1 `simAICoachService.js` — real-time hints via Gemini Flash (Edge Function `ai-simulator-hint`):
  - Input: `{ stage, moduleId, score, triggerReason }` — no sensitive data
  - Returns coaching hint in ~1–2 seconds
  - Triggers: stage entry, score < 60%, blank critical field, idle > 90s, bad decision
- [x] 7.2 `simAICoachService.js` — post-run debrief via Claude Haiku (Edge Function `ai-simulator-debrief`):
  - Input: `{ runSummary }` — aggregated scores and decisions, no PII
  - Returns structured debrief: strengths, areas to improve, per-module commentary
  - Stores in `sim.ai_debriefs`
- [x] 7.3 `SimAICoach.jsx` — collapsible hints panel anchored to Simulator workspace (active run only):
  - Auto-fires on trigger events; one hint at a time (queue)
  - "Ask Coach about this →" pre-fills input
  - At run end: widget transitions to "View your debrief →" button
- [x] 7.4 `SimAIDebrief.jsx` — post-simulation full-screen debrief:
  - AI narrative (strengths, improvements, per-module commentary)
  - "View in AI Workspace →" link → opens `/simulator/ai` with that debrief loaded
  - Export debrief as PDF
- [x] 7.5 Hints on/off toggle in Simulator settings

#### Part B — Simulator AI Workspace (`/simulator/ai`)

- [x] 7.6 Create `src/pages/simulator/SimAIWorkspace.jsx` — route `/simulator/ai`:
  - Uses `sim` schema DB tables exclusively — no Platform data mixed in
  - Reads `?debrief=<id>` query param on load — opens that debrief if present
  - Otherwise opens most recent debrief automatically
  - Three-panel layout (responsive: tabs on mobile/PWA)
  - Keyboard shortcut: `Ctrl+Shift+S`
- [x] 7.7 Create `src/components/ai/SimAIWorkspaceHistory.jsx` — left panel:
  - Two sections: **Debriefs** (grouped by scenario/run) and **Conversations** (general coaching Q&A)
  - Click any debrief → loads it in centre panel + module scores in right panel
  - Click any conversation → loads it in centre panel
  - "New chat" button for open-ended coaching conversations
- [x] 7.8 Create `src/components/ai/SimAIWorkspaceDebrief.jsx` — centre panel:
  - Displays debrief narrative when a debrief is selected
  - Switches to chat mode for follow-up questions ("Why was my stakeholder score low?", "What should I have done differently in Stage 2?")
  - Run selector dropdown at top
  - Export debrief: PDF / Word
  - Follow-up questions use `simAICoachService` with the selected run as context
- [x] 7.9 Create `src/components/ai/SimAIWorkspaceScores.jsx` — right panel:
  - Module score breakdown for the selected run (bar chart or score cards)
  - "Compare with another run" dropdown → side-by-side scores for two runs
  - Export scores: Excel / PDF / Print
  - Overall score + pass/fail indicator
- [x] 7.10 Mobile/PWA tab layout: [Debrief] [Scores] [History] tabs
- [x] 7.11 Add "AI Workspace" to Simulator sidebar nav (`src/config/simulatorMenuConfig.js`):
  - Route: `/simulator/ai`
  - Visible to all authenticated Simulator users
- [x] 7.12 Platform–Simulator parity: `sim.ai_settings` covers coaching on/off and `data_answer_mode` per org
- [x] 7.13 Unit tests: `simAICoachService.js`; Simulator workspace load with debrief ID; compare runs feature; mobile tab layout; history list

**Deliverable:** Simulator has full AI parity with Platform. During a run: AI Coach Widget fires real-time hints. After a run: full-screen debrief. From anywhere: `/simulator/ai` workspace for deep review, follow-up questions, and run comparison — mirroring the Platform AI Workspace experience.

---

## 10. What is Removed from v226

| v226 Item | Status in v227 |
|---|---|
| Ollama install requirement | Removed entirely |
| `ollama pull llama3.1` setup step | Removed |
| `checkOllamaStatus()` | Removed |
| `warmupOllama()` | Removed |
| `streamOllama()` | Removed |
| Vite proxy for `localhost:11434` | Removed |
| "Starting AI…" / warmup spinner | Removed |
| `VITE_AI_LOCAL_ENDPOINT` pointing to Ollama | Removed |
| `VITE_AI_MODE=local` | Removed |
| `engine: 'local'` label | Renamed to `engine: 'data'` |
| Single-surface Platform (widget only) | Split into widget (quick ask) + AI Workspace `/app/ai` |
| Single-surface Simulator (coach widget only) | Split into AI Coach widget (active run) + Simulator AI Workspace `/simulator/ai` |

---

## 11. What is Kept from v226 (Unchanged)

- All DB tables from v321, v322, v323, v324
- `queryRouter.js` classification logic
- `intentDetector.js` (all 10 module mappings)
- `contextFetcher.js` existing functions (extended, not replaced)
- `promptBuilder.js` (used for Edge Function prompt assembly)
- `AIChatMessage.jsx` structure (extended with Sources block + `surface` prop)
- `AISuggestedQuestions.jsx`
- `AIInsightsPanel.jsx`
- `SimAICoach.jsx`, `SimAIDebrief.jsx`
- All conversation persistence logic and DB tables
- All RLS policies
- Gemini 1.5 Flash for generic PM knowledge — unchanged

---

## 12. Environment Variables

```bash
# .env.development
VITE_AI_GEMINI_ENDPOINT=/api/ai/gemini    # Vite proxy for generic queries during dev
VITE_GEMINI_API_KEY=your_free_gemini_key  # dev only — prod uses Supabase secret

# .env.production
# No AI API keys here — all stored as Supabase Edge Function secrets:
#   ANTHROPIC_API_KEY  → ai-data-summary (claude mode), ai-simulator-debrief
#   GEMINI_API_KEY     → ai-knowledge, ai-data-summary (gemini mode), ai-simulator-hint
```

---

## 13. Full Todo Checklist

### Phase 1 — Remove Ollama, Supabase-First Data Path
- [x] 1.1 `contextFetcher.js` — `fetchContextStructured()` (9 modules)
- [x] 1.2 `dataAnswerTemplates.js`
- [x] 1.3 `aiAssistantService.sendMessage` data path (3 modes)
- [x] 1.4 Remove all Ollama code from `aiAssistantService.js`
- [x] 1.5 `queryRouter.js` — rename engine label, remove Ollama check
- [x] 1.6 Edge Function `ai-data-summary`
- [x] 1.7 Edge Function `ai-knowledge`
- [x] 1.8 SQL `v330_ai_settings_data_answer_mode.sql`
- [x] 1.9 Unit tests

### Phase 1.5 — Documentation Query Path
- [x] 1.5.1 SQL `v331_ai_docs_index.sql`
- [x] 1.5.2 `scripts/seed_docs_index.js`
- [x] 1.5.3 `docFetcher.js` (fetchDocContext keyword search)
- [x] 1.5.4 `queryRouter.js` — add docs engine classification
- [x] 1.5.5 `intentDetector.js` — add docs module type
- [x] 1.5.6 `aiAssistantService.sendMessage` — docs path
- [x] 1.5.7 Edge Function `ai-docs`
- [x] 1.5.8 Sources block for docs responses (widget + workspace + badge)
- [x] 1.5.9 Docs suggested question chips
- [x] 1.5.10 Unit tests
- [x] 1.5.11 Seed script + guide; run `npm run seed:ai-docs` after v331

### Phase 2 — Floating Widget (Updated)
- [x] 2.1 Remove Ollama spinner; update badge
- [x] 2.2 Message limit banner (after 3 exchanges)
- [x] 2.3 "Open in AI Workspace →" footer link (passes conversation ID)
- [x] 2.4 Sources block — max 2 cards + "N more" in widget
- [x] 2.5 Suggested question chips per page route (existing)
- [x] 2.6 Dynamic privacy footer
- [x] 2.7 Unit tests

### Phase 3 — AI Workspace Page (`/platform/ai`)
- [x] 3.1 `AIWorkspace.jsx` page (route, conversation ID from URL)
- [x] 3.2 Left panel: history list, new chat (inline in AIWorkspace.jsx)
- [x] 3.3 Centre panel: full chat, project selector (inline in AIWorkspace.jsx)
- [x] 3.4 `AIWorkspaceSources.jsx` — right panel (filter, export CSV/Print, record links)
- [x] 3.5 `AIChatMessage.jsx` — add `surface` prop (widget: 2 cards / workspace: all)
- [x] 3.6 Mobile/PWA tab layout
- [x] 3.7 Sidebar menu item: "AI Assistant" → `/platform/ai`
- [x] 3.8 Unit tests

### Phase 4 — Org Settings and Privacy Controls
- [x] 4.1 Org settings: AI Data Answer Mode selector
- [x] 4.2 First-time privacy modal
- [x] 4.3 Privacy footer (widget) and status bar (workspace)
- [x] 4.4 Simulator parity
- [x] 4.5 Unit tests

### Phase 5 — Persistent Conversations and Suggested Questions
- [x] 5.1 DB-persisted conversation history (load on widget open + workspace load)
- [x] 5.2 Conversation auto-title
- [x] 5.3 `AISuggestedQuestions.jsx` (7 pages)
- [x] 5.4 Thumbs up/down feedback
- [x] 5.5 Clear/Copy buttons (both surfaces)
- [x] 5.6 Unit tests

### Phase 6 — Proactive Dashboard Insights
- [x] 6.1 `aiInsightsService.js` rule-based
- [x] 6.2 Optional Gemini narrative
- [x] 6.3 `AIInsightsPanel.jsx`
- [x] 6.4 PMO Admin summary
- [x] 6.5 Org toggle
- [x] 6.6 Unit tests

### Phase 7 — Simulator AI Coach + Simulator AI Workspace
- [x] 7.1 Hints via Gemini Edge Function (`ai-simulator-hint`)
- [x] 7.2 Debrief via Claude Haiku Edge Function (`ai-simulator-debrief`)
- [x] 7.3 `SimAICoach.jsx` (active run hints; "View debrief →" on run end)
- [x] 7.4 `SimAIDebrief.jsx` (full-screen debrief; "View in workspace →" link; PDF export)
- [x] 7.5 Hints on/off toggle in Simulator settings
- [x] 7.6 `SimAIWorkspace.jsx` — `/simulator/ai` page (debrief ID from URL)
- [x] 7.7 `SimAIWorkspaceHistory.jsx` — left panel (debriefs + conversations)
- [x] 7.8 `SimAIWorkspaceDebrief.jsx` — centre panel (narrative + follow-up chat)
- [x] 7.9 `SimAIWorkspaceScores.jsx` — right panel (module scores, compare runs, export)
- [x] 7.10 Mobile/PWA tab layout
- [x] 7.11 Simulator sidebar menu item: "AI Workspace" → `/simulator/ai`
- [x] 7.12 `sim.ai_settings` parity
- [x] 7.13 Unit tests

### Docs
- [x] `Documentation/AI_Assistant_User_Guide.md`
- [x] `Documentation/AI_Assistant_Technical_Guide.md`
- [x] `Documentation/AI_Assistant_Blog.md`

---

## 14. Phase Dependencies

```
Phase 1 (Remove Ollama + Supabase data path — foundation for everything)
  ├── Phase 1.5 (Documentation query path — extends Phase 1 router + service)
  │     └── Phase 2 (Platform Widget — widget uses all 3 engines: data, docs, generic)
  │     └── Phase 3 (Platform AI Workspace /app/ai — requires widget conversation ID passing)
  │               └── Phase 4 (Privacy settings — requires both Platform surfaces)
  │                         └── Phase 5 (Conversations — builds on Phase 1 + both Platform surfaces)
  │                                       └── Phase 6 (Insights — independent, uses Phase 1 service)
  └── Phase 7 (Simulator — independent of Phases 2–6)
        ├── Part A: AI Coach Widget — needs Edge Functions from Phase 1 only
        └── Part B: Simulator AI Workspace /simulator/ai — needs Part A debrief data + sim schema
```

**Platform (Phases 2–6) and Simulator (Phase 7) can be built in parallel after Phase 1 is complete.**

---

## 15. Cost Estimate (Monthly, Typical Usage)

| Item | Cost |
|---|---|
| Claude Haiku (data summaries, debrief) — ~500K tokens/month | ~$1.50 |
| Gemini 1.5 Flash (generic queries, hints) — within free tier | $0 |
| Supabase Edge Function invocations — within free tier | $0 |
| Ollama / VPS | $0 (removed) |
| **Total** | **~$1.50/month** |

*If data_answer_mode = 'gemini' or 'template': $0/month.*

---

## 16. Review Section

**Implementation progress (Phases 1–7 completed):**

- **Summary of changes:** Ollama removed from the entire flow. Data path now uses `fetchContextStructured()` (Supabase-only) plus template or Gemini/Claude summary. Query router uses `engine: 'data'` instead of `'local'`. New SQL v330 adds `data_answer_mode`, `structured_data` on messages, and `sim.ai_settings`. Edge Functions `ai-data-summary` and `ai-knowledge` added. Floating widget updated: no Ollama spinner, 3-message banner, "Open in AI Workspace" link, Sources block (max 2 cards), dynamic privacy footer per org AI mode, last 10 messages as context, "Clear conversation" button. New AI Workspace page at `/platform/ai` with three-panel layout (history, chat, sources placeholder), dynamic privacy status bar, last 10 messages as context, "+ New chat" (Clear conversation). Sidebar menu item "AI Assistant" added. `AIChatMessage` supports `surface`, Sources block, Copy response, and Thumbs up/down → `ai_feedback`. **Phase 4:** Org Settings (Organization Admin → Settings tab) with AI Data Answer Mode, first-time privacy modal, `aiSettingsService`, sim sync. **Phase 5:** Conversation auto-title via `updateConversationTitle(conversationId, title)` (50 chars); widget and workspace send last 10 messages as history; `AISuggestedQuestions` aligned to plan wording for 7 pages (Dashboard, Risks, Issues, Mandates, Stakeholders, Quality, Portfolio) plus programme/tasks; Clear conversation + Copy response on both surfaces; unit tests for auto-title and suggested questions. **Phase 6:** Proactive dashboard insights: `aiInsightsService.js` rewritten to rule-based (no Ollama)—categories risks no owner, mandates pending >7 days, issues unresolved >21 days; optional Gemini narrative when `insights_mode = 'gemini'`; cache in `ai_insights_cache` (24h); SQL v332 adds `insights_mode` to `ai_settings`; `AIInsightsPanel` on Platform Dashboard with "Ask about this" opening widget via `ai-widget-prefill` event; org-level toggle and insights narrative in Organization Settings; PMO Admin link to org AI settings; unit tests for `aiInsightsService`. **Phase 7:** Simulator AI Coach + Simulator AI Workspace: Edge Functions `ai-simulator-hint` (Gemini Flash) and `ai-simulator-debrief` (Claude Haiku); `simAICoachService` uses `simDb.functions.invoke` for hints and debriefs; `SimAICoach` "Ask Coach about this →"; `SimAIDebrief` "View in AI Workspace →" and Export PDF; `SimAIWorkspace` at `/simulator/ai` with three-panel layout, `?debrief=<id>`, mobile tabs [Debrief][Scores][History], Ctrl+Shift+S; `SimAIWorkspaceHistory`, `SimAIWorkspaceDebrief`, `SimAIWorkspaceScores`; AI Workspace in Simulator sidebar; SQL v333 `coach_hints_enabled` in sim.ai_settings; unit tests for `simAICoachService`.
- **Performance vs v226:** No 5–10 min Ollama load. Data answers are immediate (template) or ~1–3 s (Gemini/Claude summary). Insights are instant (rule-based) or ~1–2 s when Gemini narrative is used. Simulator hints ~1–2 s via Edge Function; debrief ~2–4 s via Claude.
- **Breaking changes:** `engine: 'local'` renamed to `'data'`. All Ollama code removed; `checkOllamaStatus`, `warmupOllama` no longer exported. Frontend must use `processed_by === 'data'` for "Answered from your data" badge.
- **Completed in audit:** Phase 2.5 (suggested chips) and Section 13 Phase 6/7 checkboxes synced. Phase 3.4 `AIWorkspaceSources.jsx` (filter by module, export CSV/Print, record links); Phase 3.6 mobile tabs (Chat/Sources/History) on Platform AI Workspace; Phase 2.7 and 3.8 unit tests (AIChatWidget, AIWorkspace); Documentation: `AI_Assistant_User_Guide.md`, `AI_Assistant_Technical_Guide.md`, `AI_Assistant_Blog.md`.
- **Remaining:** None — plan is fully implemented and audited.
