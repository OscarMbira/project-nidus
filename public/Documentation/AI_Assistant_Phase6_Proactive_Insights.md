# AI Assistant Phase 6 — Proactive Dashboard Insights

## Overview

Phase 6 delivers "Today's Insights" on the Platform Dashboard: rule-based insight cards generated from Supabase data (no Ollama). Optional Gemini narrative is available when the organisation sets `insights_mode = 'gemini'`. Insights are cached for 24 hours.

## Implemented Items

### 6.1 Rule-based aiInsightsService

- **File:** `src/services/aiInsightsService.js`
- **Behaviour:** Runs Supabase queries for:
  - Risks with no owner
  - Mandates pending approval for more than 7 days
  - Issues unresolved for more than 21 days
- Builds template insight strings from counts and stores results in `ai_insights_cache` with 24h expiry.
- No external API by default; RLS applies to all queries.

### 6.2 Optional Gemini narrative

- When org `ai_settings.insights_mode = 'gemini'`, aggregated rule-based text is sent to Google Gemini to produce 2–4 short bullet insights.
- Documented in UI: "Optional summary may use Google Gemini" / "Aggregated summary data sent to Google" (Org Settings).

### 6.3 AIInsightsPanel on Platform Dashboard

- **File:** `src/components/ai/AIInsightsPanel.jsx`
- **Placement:** Platform Dashboard (`/platform/dashboard`) after Executive Summary (lazy-loaded).
- **Features:** Insight cards with icon, text, severity badge (info/warning/critical); "Ask about this" opens the Quick Ask widget with the insight text pre-filled via custom event `ai-widget-prefill`; Refresh button; loading skeleton; empty state when no insights or insights disabled.
- **Widget integration:** `AIChatWidget.jsx` listens for `ai-widget-prefill` and sets input + opens panel.

### 6.4 PMO Admin org-wide AI summary

- On Platform Dashboard, for PMO Admins a line under the insights panel: "Org-wide: Manage proactive insights and AI settings in Organization Settings" with link to `/platform/organization-admin`.

### 6.5 Org-level toggle and insights mode

- **Location:** Organization Admin → Settings tab.
- **Controls:** "Enable proactive dashboard insights" (checkbox); "Insights narrative": Rule-based only | Gemini (aggregated summary sent to Google).
- **Persistence:** `ai_settings.insights_enabled`, `ai_settings.insights_mode`; synced to `sim.ai_settings` for Platform–Simulator parity.

### 6.6 Unit tests

- **File:** `src/services/__tests__/aiInsightsService.test.js`
- **Coverage:** `getCachedInsights` (null/expired/valid), `getOrgInsightsEnabled`, `getOrGenerateInsights` (cache hit), `refreshInsights` (returns array of insights with text/severity/module).

## Database

- **v332:** `SQL/v332_ai_settings_insights_mode.sql` adds `insights_mode` (`template` | `gemini`) to `public.ai_settings` and `sim.ai_settings`.
- **Existing:** `ai_insights_cache` (user_id, organisation_id, insights, generated_at, expires_at); `ai_settings.insights_enabled` (v321/v330).

## Usage

1. Run SQL migration `v332_ai_settings_insights_mode.sql` if not already applied.
2. On Platform Dashboard, the "Today's Insights" panel appears when `insights_enabled` is true for the org.
3. Click "Ask about this" on an insight to open the Quick Ask widget with that text; user can send or edit.
4. Org admins configure proactive insights and narrative mode under Organization Admin → Settings.
