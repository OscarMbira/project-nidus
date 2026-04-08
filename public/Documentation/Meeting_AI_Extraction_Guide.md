# Meeting AI Extraction — Guide

## Flow

1. A meeting ends; transcript segments are stored in `comm_meeting_transcripts` (Platform: `public`, Simulator: `sim`).
2. The Edge Function `meeting-ai-extract` sends the full transcript text to Gemini and returns structured JSON (summary, decisions, action items, issues, risks).
3. Application code inserts rows into `comm_meeting_extracted_issues`, `comm_meeting_extracted_risks`, and `comm_meeting_action_items`.
4. Users open **Pending AI reviews** and approve items; approved Platform items can create **draft** issues/risks with `is_ai_generated = true` and `ai_source_type = 'meeting_extraction'` (see `v411_communications_ai_generated_flags.sql`).

## Environment

- **Edge Function:** `meeting-ai-extract` — requires `GEMINI_API_KEY` in Supabase secrets.
- **Client:** uses `platformDb.functions.invoke('meeting-ai-extract', { body: { transcript } })`.

## SQL

- `v409_meeting_ai_tables.sql` — meeting and extraction tables + RLS.
- `v411_communications_ai_generated_flags.sql` — AI flags on `issues` / `risks` / practice tables.
