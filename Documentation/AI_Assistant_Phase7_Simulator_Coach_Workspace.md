# AI Assistant Phase 7 — Simulator AI Coach + Simulator AI Workspace

## Overview

Phase 7 delivers full AI parity for the Simulator: real-time coaching hints during runs (via Gemini), post-run debriefs (via Claude), and a dedicated Simulator AI Workspace at `/simulator/ai` for reviewing debriefs, module scores, and run comparison.

## Part A — AI Coach (Active Run)

### 7.1–7.2 Edge Functions and Service

- **`supabase/functions/ai-simulator-hint/index.ts`**  
  Invoked with `{ stage?, moduleId, score, triggerReason }`. Uses Gemini 1.5 Flash to return a short coaching hint. No PII.

- **`supabase/functions/ai-simulator-debrief/index.ts`**  
  Invoked with `{ runSummary }` (aggregated text). Uses Claude Haiku to return a structured JSON debrief (summary, strengths, improvements, topTip, moduleCommentary). No PII.

- **`src/services/simAICoachService.js`**  
  - `getRealtimeHint(runId, userId, moduleId, triggerReason, currentScore, stage)` — calls `simDb.functions.invoke('ai-simulator-hint', …)`, then logs to `sim.ai_coach_events`.  
  - `generateDebrief(runId, userId, runData)` — builds run summary, calls `ai-simulator-debrief`, saves to `sim.ai_debriefs`, returns debrief (with `_insertedId` for link).  
  - `getPastDebriefs`, `getDebriefById`, `getModuleScoresForRun`, `getRunSummary`, `getSimCoachHintsEnabled` for workspace and settings.

### 7.3 SimAICoach.jsx

- Collapsible hints panel; "Ask Coach about this →" pre-fills parent input (e.g. for a future coach chat).
- Label updated from "Ask coach" to "Ask Coach about this →".

### 7.4 SimAIDebrief.jsx

- Full-screen debrief with score, summary, strengths, improvements, top tip.
- **"View in AI Workspace →"** — navigates to `/simulator/ai?debrief=<id>` (uses `_insertedId` or latest matching debrief id).
- **Export debrief as PDF** — opens print dialog with debrief HTML.
- Replay Simulation button unchanged.

### 7.5 Hints on/off

- **SQL v333:** `sim.ai_settings.coach_hints_enabled` (default true).
- **Service:** `getSimCoachHintsEnabled(orgId)` — reads from `sim.ai_settings`. Callers (e.g. Simulator layout or settings page) can pass `enabled={await getSimCoachHintsEnabled(orgId)}` into `SimAICoach`. Toggle UI can be added to a Simulator settings page when available.

## Part B — Simulator AI Workspace (`/simulator/ai`)

### 7.6 SimAIWorkspace.jsx

- **Route:** `/simulator/ai` (protected, simulator platform).
- **Query:** `?debrief=<id>` — on load, selects that debrief if present in the user’s list; otherwise most recent debrief.
- **Layout:** Three panels (History | Debrief | Scores). On mobile/PWA, tabs: [Debrief] [Scores] [History].
- **Shortcut:** Ctrl+Shift+S focuses/navigates to Simulator AI Workspace (documented; can be wired to open `/simulator/ai`).

### 7.7 SimAIWorkspaceHistory.jsx (left)

- Lists **Debriefs** from `getPastDebriefs(userId)`; click loads that debrief in centre and scores in right panel.
- **"New chat"** — clears selection (centre/right show empty state). Conversations / follow-up chat can be added later.

### 7.8 SimAIWorkspaceDebrief.jsx (centre)

- Shows debrief narrative (summary, strengths, improvements, topTip) and overall score.
- Run selector dropdown when user has multiple debriefs; export **PDF** (print dialog) and **Word** (download .txt for now).

### 7.9 SimAIWorkspaceScores.jsx (right)

- Module score breakdown for selected run (from `getModuleScoresForRun(runId)`); bar-style display; overall score and pass/review.
- **Compare with another run** — dropdown of other runs; shows their module scores below.
- Print for scores (no separate Excel/PDF export in this pass).

### 7.10–7.11

- Mobile tabs implemented in `SimAIWorkspace.jsx`.
- **Simulator sidebar:** "AI Workspace" added in `simulatorMenuConfig.js` (path `/simulator/ai`, icon `bot`). `SimulatorLayout` iconMap extended with `bot: Bot`.

### 7.12 Parity

- `sim.ai_settings` already has `data_answer_mode`, `insights_enabled`, `insights_mode` (Phase 4/6). v333 adds `coach_hints_enabled`. No Platform data in Simulator workspace; all data from `sim` schema.

### 7.13 Unit tests

- **`src/services/__tests__/simAICoachService.test.js`** — getPastDebriefs (empty/list), getDebriefById (null), getSimCoachHintsEnabled (null → true, false, true).

## Database

- **v333:** `SQL/v333_sim_ai_settings_coach_hints.sql` — `coach_hints_enabled` on `sim.ai_settings`.
- Existing: `sim.ai_debriefs`, `sim.ai_coach_events`, `sim.simulation_runs`, `sim.module_scores`.

## Deployment

1. Deploy Edge Functions: `ai-simulator-hint`, `ai-simulator-debrief` (set `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` in Supabase secrets).
2. Run v333 in Supabase (sim schema).
3. Simulator sidebar and route `/simulator/ai` are in app; no extra env for frontend.
