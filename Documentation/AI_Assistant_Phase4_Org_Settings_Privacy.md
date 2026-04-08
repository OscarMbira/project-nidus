# AI Assistant — Phase 4: Org Settings and Privacy Controls

**Plan:** v227 AI Assistant Final Merged Plan  
**Completed:** 2026-03-15

## Summary

Phase 4 adds organisation-level control of the AI Data Answer Mode and clear privacy notices on both the Quick Ask widget and the AI Workspace.

## Deliverables

1. **Org settings page (Organization Admin → Settings tab)**  
   - "AI Data Answer Mode" section with three options:
     - **Template only (private):** No data sent externally; count-based summary only.
     - **Claude Haiku (recommended):** Data snippet sent to Anthropic for prose summary.
     - **Gemini Flash (free tier):** Data snippet sent to Google for short summary.
   - Short description per mode and Save button.  
   - Saves to `ai_settings.data_answer_mode` and, when applicable, `data_privacy_accepted_at`.

2. **First-time privacy modal**  
   - When the org admin selects Claude or Gemini and has not previously accepted, a one-time disclosure modal appears before saving.  
   - Content explains that a data snippet is sent to the provider and is not stored.  
   - "I accept" confirms and saves with `data_privacy_accepted_at` set.

3. **Dynamic privacy footer (widget) and status bar (workspace)**  
   - Widget footer and workspace bottom bar show mode-specific text via `getPrivacyNoticeText(mode)`:
     - Template: "No data is sent externally."
     - Claude: "Summary may use AI (Anthropic Claude)."
     - Gemini: "Summary may use AI (Google Gemini)."
   - Org ID is resolved via `getOrgIdForUser(authUserId)`; AI mode is loaded from `getOrgAiSettings(orgId)`.

4. **Platform–Simulator parity**  
   - On save, `aiSettingsService.updateSettings()` upserts both `public.ai_settings` and `sim.ai_settings` so both domains use the same data answer mode and privacy acceptance.

5. **Unit tests**  
   - `aiSettingsService.test.js`: `getPrivacyNoticeText` for template/claude/gemini/unknown; `getSettings(null)` and `getOrgIdForUser(null)`.  
   - `AIPrivacyModal.test.jsx`: Renders when open; shows Anthropic/Google per mode; Cancel and I accept callbacks.

## Files Created/Updated

| File | Change |
|------|--------|
| `src/services/aiSettingsService.js` | **New.** `getSettings`, `updateSettings` (with sim sync), `getOrgIdForUser`, `getPrivacyNoticeText`. |
| `src/components/ai/AIPrivacyModal.jsx` | **New.** First-time privacy disclosure modal. |
| `src/pages/platform-app/OrganizationAdmin.jsx` | **Updated.** Settings tab shows AI Data Answer Mode section; load/save AI settings; open modal when required. |
| `src/components/ai/AIChatWidget.jsx` | **Updated.** Resolve orgId, load AI mode, pass orgId to `sendMessage`, show `getPrivacyNoticeText(aiDataMode)` in footer. |
| `src/pages/platform-app/AIWorkspace.jsx` | **Updated.** Resolve orgId, load AI mode, pass orgId to `sendMessage`, show `getPrivacyNoticeText(aiDataMode)` in status bar. |
| `src/services/__tests__/aiSettingsService.test.js` | **New.** Unit tests for privacy text and service. |
| `src/components/ai/__tests__/AIPrivacyModal.test.jsx` | **New.** Unit tests for modal. |
| `projectplan/v227_AI_Assistant_Final_Merged_Plan.md` | **Updated.** Phase 4 tasks marked complete; review section updated. |

## Database

- Uses existing `public.ai_settings` (`data_answer_mode`, `data_privacy_accepted_at`) and `sim.ai_settings` (same columns).  
- No new migrations; v330 already defines these.

## User flow

1. Org admin goes to **Organization Admin** → **Settings**.  
2. Chooses an AI Data Answer Mode and clicks **Save**.  
3. If they choose Claude or Gemini and have not accepted before, the privacy modal appears.  
4. They click **I accept** (or Cancel); on accept, settings are saved and the modal closes.  
5. All users in that org see the chosen mode in the widget footer and workspace status bar, and data answers use that mode (template / Claude / Gemini).
