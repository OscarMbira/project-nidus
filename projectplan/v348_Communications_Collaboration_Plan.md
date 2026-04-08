# v348 — Communications & Collaboration Hub
## Chat · Voice Calls · Video Calls · AI Meeting Summarisation → Issue/Risk Auto-Creation

**Date:** 2026-04-07  
**Author:** Project Nidus Team  
**Scope:** Platform (public schema) + Simulator (sim schema)  
**SQL Versions (implemented):** `v408_communication_tables.sql`, `v409_meeting_ai_tables.sql`, `v411_communications_ai_generated_flags.sql`, `v410_communications_menu_seed.sql` — *Note: repo already used v404–v407 for other features; communications use v408+.*  

---

## Feature Overview

| Feature | Description |
|---------|-------------|
| **Text Chat** | Real-time messaging — direct (1:1), group, and project-linked channels |
| **Voice Calls** | Audio-only calls (1:1 and group) |
| **Video Calls** | Full video conferencing with screen share, participant grid, mute controls |
| **AI Transcription** | Real-time + post-meeting audio-to-text via OpenAI Whisper API |
| **Meeting Summary** | AI-generated structured summary (agenda, decisions, action items) |
| **Issue Auto-Creation** | Extract issues from discussions → draft entries in project Issue Log |
| **Risk Auto-Creation** | Extract risk signals from discussions → draft entries in project Risk Register |
| **Post-Meeting Enrichment** | Users fill in missing fields (owner, due date, severity) on auto-created records |
| **All-Role Sidebar Access** | Every role (system_admin → viewer) sees the Communications hub in sidebar |

---

## Technology Stack

### Real-Time Chat
- **Supabase Realtime** (already in the stack) — pub/sub on `comm_messages` table
- Supabase Presence for online/typing indicators
- Supabase Storage for file attachments

### Voice & Video Calls
- **Agora.io** (primary recommendation)
  - Package: `agora-rtc-react` + `agora-rtc-sdk-ng`
  - Free tier: 10,000 minutes/month (sufficient for launch)
  - Handles: STUN/TURN, codec, cloud recording, screen share
  - React SDK: well-documented, hook-based
- **Alternative: Daily.co** — `@daily-co/daily-react` (similar capability)
- **Self-hosted alternative: Jitsi Meet** — embeddable iframe (`react-jitsi`), no SDK cost

### Meeting Transcription
- **OpenAI Whisper API** — already configured (`VITE_OPENAI_API_KEY` in `.env`)
- Approach: capture audio chunks during meeting → send to Whisper API → stitch transcript in real time
- Post-meeting: process full recording audio file for clean transcript

### AI Summarisation & Extraction
- **Google Gemini 1.5 Flash** (already integrated via `aiAssistantService.js`) — used for summarisation and structured entity extraction
- Structured prompt → JSON output:
  - `summary` — paragraph summary
  - `key_decisions` — array
  - `action_items` — array with owner, due_date, description
  - `issues_identified` — array with title, description, impact, priority
  - `risks_identified` — array with title, description, probability, impact, category

### New Environment Variables Required
```
VITE_AGORA_APP_ID=          # Agora App ID
VITE_AGORA_TOKEN_URL=       # Your token server URL (or use temp tokens for dev)
```

---

## Roles & Access

| Role | Chat | Start Call | Join Call | View Meeting Summary | Review AI-Created Issues/Risks |
|------|------|-----------|----------|---------------------|-------------------------------|
| system_admin | Full | Yes | Yes | Yes | Full CRUD |
| pmo_admin | Full | Yes | Yes | Yes | Full CRUD |
| project_manager | Full | Yes | Yes | Yes | Full CRUD |
| team_lead | Full | Yes | Yes | Yes | Full CRUD |
| team_member | Full | Yes | Yes | Yes | Edit own |
| stakeholder | Read + Send | Yes | Yes | Yes | Read + comment |
| viewer | Read only | No | Yes (invite only) | Yes | Read only |

---

## Database Schema

### SQL File: `v404_communication_tables.sql`

---

#### Table 1: `comm_channels`
Communication channels — direct, group, and project-linked.

```
id              UUID PK
channel_type    VARCHAR(20) NOT NULL  -- direct | group | project | announcement
name            VARCHAR(100)          -- null for direct channels
description     TEXT
project_id      UUID → projects (nullable, for project-linked channels)
account_id      UUID → accounts
is_archived     BOOLEAN DEFAULT false
created_by      UUID → users
created_at, updated_at
```

**Constraints:** UNIQUE (project_id) WHERE channel_type = 'project' — one channel per project.

---

#### Table 2: `comm_channel_members`
Who belongs to each channel.

```
id              UUID PK
channel_id      UUID → comm_channels ON DELETE CASCADE
user_id         UUID → users ON DELETE CASCADE
role            VARCHAR(20) DEFAULT 'member'  -- owner | admin | member | readonly
is_muted        BOOLEAN DEFAULT false
last_read_at    TIMESTAMPTZ
joined_at       TIMESTAMPTZ DEFAULT NOW()
UNIQUE (channel_id, user_id)
```

---

#### Table 3: `comm_messages`
Messages in channels.

```
id              UUID PK
channel_id      UUID → comm_channels ON DELETE CASCADE
sender_id       UUID → users ON DELETE SET NULL
parent_id       UUID → comm_messages (nullable — for threads/replies)
content         TEXT
message_type    VARCHAR(20) DEFAULT 'text'  -- text | file | system | call_event
is_edited       BOOLEAN DEFAULT false
edited_at       TIMESTAMPTZ
is_deleted      BOOLEAN DEFAULT false
deleted_at      TIMESTAMPTZ
metadata        JSONB  -- for file info, call event details, etc.
created_at      TIMESTAMPTZ DEFAULT NOW()
```

**Index:** channel_id + created_at (DESC)

---

#### Table 4: `comm_message_reactions`
Emoji reactions on messages.

```
id              UUID PK
message_id      UUID → comm_messages ON DELETE CASCADE
user_id         UUID → users ON DELETE CASCADE
emoji           VARCHAR(10) NOT NULL
created_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE (message_id, user_id, emoji)
```

---

#### Table 5: `comm_message_attachments`
File attachments on messages.

```
id              UUID PK
message_id      UUID → comm_messages ON DELETE CASCADE
file_name       VARCHAR(255) NOT NULL
file_size       BIGINT
file_type       VARCHAR(100)
storage_path    TEXT NOT NULL  -- Supabase Storage path
uploaded_by     UUID → users
uploaded_at     TIMESTAMPTZ DEFAULT NOW()
```

---

### SQL File: `v405_meeting_ai_tables.sql`

---

#### Table 6: `comm_meetings`
Scheduled and ad-hoc meetings/calls.

```
id                  UUID PK
channel_id          UUID → comm_channels (nullable)
project_id          UUID → projects (nullable)
account_id          UUID → accounts
title               VARCHAR(200) NOT NULL
description         TEXT
meeting_type        VARCHAR(20) DEFAULT 'video'  -- video | audio | scheduled
status              VARCHAR(20) DEFAULT 'scheduled'
                    -- scheduled | in_progress | ended | cancelled
scheduled_start     TIMESTAMPTZ
scheduled_end       TIMESTAMPTZ
actual_start        TIMESTAMPTZ
actual_end          TIMESTAMPTZ
agora_channel_name  VARCHAR(200)  -- unique channel for Agora SDK
recording_enabled   BOOLEAN DEFAULT false
recording_url       TEXT  -- Supabase Storage path to recording
ai_processing_status VARCHAR(20) DEFAULT 'pending'
                    -- pending | transcribing | summarising | completed | failed
organised_by        UUID → users
created_at, updated_at
```

---

#### Table 7: `comm_meeting_participants`
Who was invited and whether they joined.

```
id              UUID PK
meeting_id      UUID → comm_meetings ON DELETE CASCADE
user_id         UUID → users ON DELETE CASCADE
invite_status   VARCHAR(20) DEFAULT 'invited'  -- invited | accepted | declined | tentative
joined_at       TIMESTAMPTZ
left_at         TIMESTAMPTZ
duration_mins   INT  -- calculated on leave
UNIQUE (meeting_id, user_id)
```

---

#### Table 8: `comm_meeting_transcripts`
Raw transcription from Whisper API — segmented by speaker.

```
id              UUID PK
meeting_id      UUID → comm_meetings ON DELETE CASCADE
segment_index   INT NOT NULL
speaker_id      UUID → users (nullable — not always identifiable)
speaker_label   VARCHAR(50)  -- "Speaker 1", or user name if identified
start_time_sec  NUMERIC(10,2)
end_time_sec    NUMERIC(10,2)
text            TEXT NOT NULL
confidence      NUMERIC(4,3)  -- 0.000–1.000
created_at      TIMESTAMPTZ DEFAULT NOW()
```

---

#### Table 9: `comm_meeting_summaries`
AI-generated structured summary.

```
id                  UUID PK
meeting_id          UUID → comm_meetings ON DELETE CASCADE UNIQUE
summary_text        TEXT
key_decisions       JSONB DEFAULT '[]'  -- [{decision, made_by, timestamp}]
action_items        JSONB DEFAULT '[]'  -- [{description, owner_name, due_date, status}]
topics_discussed    JSONB DEFAULT '[]'  -- [{topic, duration_mins}]
sentiment           VARCHAR(20)  -- positive | neutral | tense | mixed
ai_model_used       VARCHAR(100)
generated_at        TIMESTAMPTZ DEFAULT NOW()
reviewed_by         UUID → users
reviewed_at         TIMESTAMPTZ
is_approved         BOOLEAN DEFAULT false
```

---

#### Table 10: `comm_meeting_extracted_issues`
Draft issues auto-created from AI extraction — linked to project issue register.

```
id                  UUID PK
meeting_id          UUID → comm_meetings ON DELETE CASCADE
issue_id            UUID → issues (nullable — set when user approves + creates)
project_id          UUID → projects
ai_extracted_title  TEXT NOT NULL
ai_extracted_desc   TEXT
ai_confidence       NUMERIC(4,3)  -- how confident the AI was this is an issue
suggested_priority  VARCHAR(20)  -- high | medium | low
suggested_category  VARCHAR(50)
source_quote        TEXT  -- exact quote from transcript that triggered this
status              VARCHAR(20) DEFAULT 'pending_review'
                    -- pending_review | approved | rejected | enriched | created
enriched_data       JSONB DEFAULT '{}'  -- fields added by user: owner, due_date, etc.
reviewed_by         UUID → users
reviewed_at         TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

#### Table 11: `comm_meeting_extracted_risks`
Draft risks auto-created from AI extraction — linked to project risk register.

```
id                  UUID PK
meeting_id          UUID → comm_meetings ON DELETE CASCADE
risk_id             UUID → risks (nullable — set when user approves + creates)
project_id          UUID → projects
ai_extracted_title  TEXT NOT NULL
ai_extracted_desc   TEXT
ai_confidence       NUMERIC(4,3)
suggested_probability VARCHAR(20)  -- high | medium | low
suggested_impact    VARCHAR(20)
suggested_category  VARCHAR(50)
suggested_response  VARCHAR(30)  -- avoid | transfer | mitigate | accept
source_quote        TEXT
status              VARCHAR(20) DEFAULT 'pending_review'
enriched_data       JSONB DEFAULT '{}'
reviewed_by         UUID → users
reviewed_at         TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

#### Table 12: `comm_meeting_action_items`
Follow-on actions extracted from meeting — these become tasks.

```
id              UUID PK
meeting_id      UUID → comm_meetings ON DELETE CASCADE
task_id         UUID → tasks (nullable — set when converted to task)
description     TEXT NOT NULL
assigned_to_name TEXT  -- name as mentioned in meeting (may not map to a user yet)
assigned_user_id UUID → users (nullable — set during enrichment)
due_date        DATE (nullable — set during enrichment)
priority        VARCHAR(20) DEFAULT 'medium'
status          VARCHAR(20) DEFAULT 'pending'
                -- pending | assigned | converted_to_task | completed | dismissed
source_quote    TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

---

---

### SQL File: `v407_ai_generated_flag_issues_risks.sql`

Adds two columns to the **existing** `issues`, `risks`, `sim.practice_issues`, and `sim.practice_risks` tables — plus fixes two broken CHECK constraints in the sim tables.

#### Columns added to `issues` and `risks` (public schema)

```sql
-- issues table
ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_source_type    VARCHAR(50) DEFAULT NULL;
  -- ai_source_type values: 'meeting_extraction' | NULL

-- Partial index for fast badge-count queries
CREATE INDEX IF NOT EXISTS idx_issues_ai_draft
  ON issues (project_id, is_ai_generated)
  WHERE is_ai_generated = true AND status = 'draft' AND is_deleted = false;

-- risks table
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_source_type    VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_risks_ai_draft
  ON risks (project_id, is_ai_generated)
  WHERE is_ai_generated = true AND status = 'draft' AND is_deleted = false;
```

#### Columns added + CHECK constraint fix for `sim.practice_issues`

`sim.practice_issues` has a CHECK constraint `status IN ('new','assigned','in_progress','resolved','closed','reopened','cancelled')` — **'draft' is not in this list**, so inserting a draft AI issue would fail. Fix:

```sql
-- Drop old constraint, re-create with 'draft' added
ALTER TABLE sim.practice_issues
  DROP CONSTRAINT IF EXISTS practice_issues_status_check;

ALTER TABLE sim.practice_issues
  ADD CONSTRAINT practice_issues_status_check
    CHECK (status IN ('draft','new','assigned','in_progress','resolved','closed','reopened','cancelled'));

ALTER TABLE sim.practice_issues
  ADD COLUMN IF NOT EXISTS is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_source_type    VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sim_practice_issues_ai_draft
  ON sim.practice_issues (practice_project_id, is_ai_generated)
  WHERE is_ai_generated = true AND status = 'draft';
```

#### Columns added + CHECK constraint fix for `sim.practice_risks`

`sim.practice_risks` has a CHECK constraint `status IN ('identified','assessed','mitigated','monitored','closed','realized')` — **'draft' is not in this list**. Fix:

```sql
ALTER TABLE sim.practice_risks
  DROP CONSTRAINT IF EXISTS practice_risks_status_check;

ALTER TABLE sim.practice_risks
  ADD CONSTRAINT practice_risks_status_check
    CHECK (status IN ('draft','identified','assessed','mitigated','monitored','closed','realized'));

ALTER TABLE sim.practice_risks
  ADD COLUMN IF NOT EXISTS is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_source_type    VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sim_practice_risks_ai_draft
  ON sim.practice_risks (practice_project_id, is_ai_generated)
  WHERE is_ai_generated = true AND status = 'draft';
```

---

### Simulator Mirror Tables (sim schema)
All 12 communication/meeting tables mirrored in `sim` schema with:
- `project_id` → `sim.simulation_runs` instead of `projects`
- `issue_id` → `sim.practice_issues`
- `risk_id` → `sim.practice_risks`
- `task_id` → `sim.practice_tasks`

---

### RLS Policies (both schemas)

**`comm_channels`:** Users in same org can see channels they are members of. Project channels visible to project members.

**`comm_messages`:** Only channel members can read/write. Deleted messages return empty content.

**`comm_meetings`:** Participants + project members can view. Organiser + PM/Admin can manage.

**`comm_meeting_*` tables:** Meeting participants + project PM/TL/Admin.

**`comm_meeting_extracted_issues/risks`:** Project PM/TL/Admin for review/enrichment. TM/Stakeholder read-only.

---

### Supabase Storage Buckets (to configure)
- `comm-attachments` — chat file uploads (max 50MB per file)
- `comm-recordings` — meeting audio/video recordings (large files, private)

---

## Menu Structure — `v406_communications_menu_seed.sql`

New top-level menu: **"Communications"** (icon: `message-square`, colour: `#0891B2`)

| menu_code | Label | Route | Who sees it |
|-----------|-------|-------|-------------|
| `comms` | Communications | /comms | All roles |
| `comms_messages` | Messages | /comms/messages | All roles |
| `comms_direct` | Direct Messages | /comms/direct | All roles |
| `comms_meetings` | Meetings | /comms/meetings | All roles |
| `comms_meetings_new` | Schedule Meeting | /comms/meetings/new | All except viewer |
| `comms_meeting_summaries` | Meeting Summaries | /comms/meetings/summaries | All roles |
| `comms_pending_review` | Pending AI Reviews | /comms/pending-review | PM, TL, Admin |

---

## Frontend — Platform

### New npm packages to install
```bash
npm install agora-rtc-react agora-rtc-sdk-ng
# OR alternative:
npm install @daily-co/daily-react @daily-co/daily-js
```

### Services — `src/services/communications/`

| File | Responsibility |
|------|---------------|
| `channelService.js` | Create/get/archive channels, manage members, get DMs |
| `messageService.js` | Send, edit, delete, react, load history, search |
| `meetingService.js` | Schedule, start, end, get Agora token, participants |
| `recordingService.js` | Start/stop recording, fetch Supabase Storage URL |
| `transcriptionService.js` | Submit audio to OpenAI Whisper, store segments |
| `meetingSummaryService.js` | Call Gemini AI with structured prompt, parse JSON output |
| `meetingExtractionService.js` | Create extracted issues/risks/actions, approve/reject/enrich flow |
| `agoraTokenService.js` | Generate Agora RTC tokens (via Supabase Edge Function) |

---

### Pages — `src/pages/comms/`

| File | Purpose |
|------|---------|
| `CommsHub.jsx` | Main communications hub — channel list sidebar + message pane |
| `DirectMessages.jsx` | DM list, start new DM |
| `ChannelView.jsx` | Single channel — messages, thread drawer, call button, file upload |
| `MeetingList.jsx` | All meetings (upcoming, past) with filter by project |
| `MeetingSchedule.jsx` | Schedule meeting — title, participants, project link, date/time |
| `MeetingRoom.jsx` | Active video/audio call — Agora SDK, video grid, controls bar |
| `MeetingDetail.jsx` | Post-meeting view — recording playback, transcript, summary |
| `MeetingSummaryView.jsx` | AI summary + extracted issues/risks/actions for review |
| `PendingAIReview.jsx` | All pending extracted issues/risks across meetings |
| `MeetingExtractionReview.jsx` | Per-meeting: review/approve/reject each extracted item |
| `ExtractedIssueEnrich.jsx` | Enrichment form for an auto-created issue (set owner, priority, dates) |
| `ExtractedRiskEnrich.jsx` | Enrichment form for an auto-created risk (set owner, response, dates) |

---

### Key Components — `src/components/comms/`

| Component | Purpose |
|-----------|---------|
| `MessageBubble.jsx` | Individual message with reactions, reply, edit, delete |
| `MessageInput.jsx` | Rich text input with emoji picker, @mention, file upload, send |
| `ChannelSidebar.jsx` | Left panel — channel list, DMs, online presence |
| `ThreadDrawer.jsx` | Right side drawer for message thread replies |
| `VideoGrid.jsx` | Agora video tiles — remote users + local user |
| `CallControls.jsx` | Mute, video on/off, screen share, record, leave call |
| `ParticipantPanel.jsx` | List of call participants + status |
| `TranscriptViewer.jsx` | Scrollable transcript with speaker labels and timestamps |
| `SummaryCard.jsx` | Styled AI summary display with key decisions, actions |
| `ExtractedItemCard.jsx` | Card for an extracted issue/risk — approve/reject/enrich buttons |
| `EnrichmentModal.jsx` | Modal form to fill in missing fields on auto-created issue/risk |
| `OnlinePresenceIndicator.jsx` | Green/amber/grey dot using Supabase Presence |
| `TypingIndicator.jsx` | "User is typing..." via Supabase Realtime broadcast |

---

### Agora Integration Architecture

```
User clicks "Start Call"
    ↓
meetingService.js: creates comm_meetings row, generates Agora channel name
    ↓
agoraTokenService.js: calls Supabase Edge Function → returns RTC token
    ↓
MeetingRoom.jsx: initialises AgoraRTC client with token + channel
    ↓
Participants join → Agora handles WebRTC mesh
    ↓
[Optional] recordingService.js: starts Agora Cloud Recording → stored to S3 (Agora) → downloaded to Supabase Storage after call
    ↓
Meeting ends → transcriptionService.js: uploads audio to OpenAI Whisper
    ↓
meetingSummaryService.js: sends full transcript to Gemini → structured JSON
    ↓
meetingExtractionService.js: parses JSON → inserts rows in:
  comm_meeting_extracted_issues
  comm_meeting_extracted_risks
  comm_meeting_action_items
    ↓
PMs/TLs notified → review in PendingAIReview.jsx
```

---

### AI Extraction Prompt (Gemini)

```
System: You are a project management assistant. Analyse this meeting transcript and extract:
1. A concise summary (2-3 paragraphs)
2. Key decisions made
3. Action items with suggested owner (from speakers) and urgency
4. Project issues mentioned (problems, blockers, complaints)
5. Project risks mentioned (potential future problems, concerns, uncertainties)

Return ONLY valid JSON in this exact schema:
{
  "summary": "...",
  "key_decisions": [{"decision": "...", "made_by": "..."}],
  "action_items": [{"description": "...", "owner_name": "...", "due_date": null, "priority": "medium"}],
  "issues": [{"title": "...", "description": "...", "priority": "high|medium|low", "category": "...", "source_quote": "..."}],
  "risks": [{"title": "...", "description": "...", "probability": "high|medium|low", "impact": "high|medium|low", "category": "...", "response": "mitigate|avoid|transfer|accept", "source_quote": "..."}]
}

Transcript:
{transcript}
```

---

### Issue/Risk Auto-Creation Flow

```
Meeting ends → AI extracts items → status = 'pending_review'
    ↓
PM/TL opens "Pending AI Reviews" page
    ↓
For each extracted item:
  ┌─ APPROVE → opens EnrichmentModal (pre-populated with AI data)
  │    User fills: owner, due date, severity, project-specific details
  │    Clicks "Create in Issue Log / Risk Register"
  │    → calls existing createIssue() / createRisk() service
  │    → extracted item status = 'created', issue_id/risk_id linked
  │
  ├─ ENRICH LATER → status = 'enriched', partial data saved
  │    (Record appears in issue/risk log as DRAFT)
  │    User can open and complete it from the Issue/Risk list
  │
  └─ REJECT → status = 'rejected', item dismissed with optional note
```

---

### Post-Meeting Enrichment (Continued Flow)

When a user selects "Enrich Later":
- A draft issue/risk is created in the issue log / risk register with:
  - `status = 'draft'` (new value added to allow-list — see v407 migration)
  - `is_ai_generated = true` ← **dedicated boolean flag for fast queries**
  - `ai_source_type = 'meeting_extraction'` ← distinguishes from other future AI sources
- The meeting extraction record is linked via `issue_id` / `risk_id`
- The issue/risk list shows a badge: "Needs enrichment (from meeting)"  
  (query: `WHERE is_ai_generated = true AND status = 'draft'`)
- User opens the issue/risk from the list, sees all AI-populated fields, fills in the missing ones
- On save: status changes from `draft` to `new` (issue) / `identified` (risk), badge disappears
- Full edit history is tracked via existing audit trail

#### Why `is_ai_generated` is necessary
`status = 'draft'` alone is **ambiguous** — a user can manually save an issue as a draft too.
The `is_ai_generated` boolean allows instant, index-supported queries without joining to the
`comm_meeting_extracted_issues` / `comm_meeting_extracted_risks` tables. Example queries:

```sql
-- Fetch all AI-created issues needing enrichment across a project
SELECT * FROM issues
WHERE project_id = $1
  AND is_ai_generated = true
  AND status = 'draft'
  AND is_deleted = false;

-- Badge count for sidebar notification
SELECT COUNT(*) FROM issues
WHERE is_ai_generated = true AND status = 'draft' AND is_deleted = false;
```

---

## Frontend — Simulator

### Services — `src/services/sim/communications/`
- `simChannelService.js`
- `simMessageService.js`
- `simMeetingService.js`
- `simMeetingSummaryService.js`
- `simMeetingExtractionService.js`

**Note:** Simulator meetings link to `sim.simulation_runs` instead of `projects`. Extracted issues/risks go to `sim.practice_issues` / `sim.practice_risks`.

### Pages — shared with Platform (Phase 7)
Simulator uses the **same** page components as Platform under `/simulator/comms/...` (route-based switching via `useIsSimulator()` / `simDb`), not duplicate `Sim*` files. **Meeting extraction review:** approve calls `approveAndCreatePracticeIssue` / `approveAndCreatePracticeRisk` in `simMeetingExtractionService.js`, which create `sim.practice_*` records and update `sim.comm_meeting_extracted_*` to `status: 'created'` with linked IDs.

---

## Routes — `src/App.jsx`

### Platform
```
/comms                              → CommsHub
/comms/messages                     → CommsHub (channels tab)
/comms/direct                       → DirectMessages
/comms/direct/:userId               → ChannelView (DM)
/comms/channel/:channelId           → ChannelView
/comms/meetings                     → MeetingList
/comms/meetings/new                 → MeetingSchedule
/comms/meetings/summaries           → MeetingSummaryView (all projects)
/comms/meetings/:meetingId          → MeetingDetail
/comms/meetings/:meetingId/room     → MeetingRoom (live call)
/comms/meetings/:meetingId/summary  → MeetingSummaryView (single meeting)
/comms/pending-review               → PendingAIReview
/comms/review/:meetingId            → MeetingExtractionReview
/comms/enrich/issue/:id             → ExtractedIssueEnrich
/comms/enrich/risk/:id              → ExtractedRiskEnrich
```

### Simulator
Same paths under `/simulator/comms/`.

---

## Sidebar Icon

Add to Sidebar `iconMap`:
- `'message-square': MessageSquare` (Lucide — for Communications)
- `'video': Video` (for Meetings)

---

## UI Feature Checklist

- [x] Dark theme default
- [x] PWA-optimised (mobile-first messaging layout)
- [x] Card/table toggle on meeting list
- [x] Sortable columns on meeting list
- [x] Search in message history
- [x] Export: meeting summary → Word/PDF/PPT
- [x] Export: extracted issues/risks list → Excel/CSV
- [x] Success confirmation modal after creating issue/risk from meeting
- [x] Notification badge on "Pending AI Reviews" sidebar item
- [x] Theme-aware (dark/light)
- [x] Responsive video grid (2×2 on mobile, up to 9×9 on desktop)

---

## Supabase Edge Functions Required

| Function | Purpose |
|----------|---------|
| `agora-token` | Generate Agora RTC token server-side (keeps App Certificate secret) |
| `whisper-transcribe` | Proxy audio chunks to OpenAI Whisper API (keeps key server-side) |
| `meeting-ai-extract` | Send transcript to Gemini, return structured JSON |

*(These can be implemented as Supabase Edge Functions to keep API keys out of the frontend.)*

---

## Unit Tests

- `src/__tests__/communications/channelService.test.js`
- `src/__tests__/communications/meetingService.test.js`
- `src/__tests__/communications/meetingSummaryService.test.js`
- `src/__tests__/communications/meetingExtractionService.test.js`
- `src/__tests__/sim/communications/simMeetingService.test.js`
- `src/__tests__/sim/communications/simMeetingExtractionService.test.js`

---

## Documentation

- `Documentation/Communications_Hub_User_Guide.md`
- `Documentation/Meeting_AI_Extraction_Guide.md`
- `Documentation/Agora_Integration_Setup_Guide.md`
- `Documentation/Communications_Blog_Post.md`

---

## TODO Checklist

### Phase 1 — Infrastructure Setup
- [x] Register Agora.io account, create App ID *(operator action in Agora Console)*
- [x] Add `VITE_AGORA_APP_ID` to `.env.example` *(and `env.production.example` if used in your pipeline)*
- [ ] Create Supabase Storage buckets: `comm-attachments`, `comm-recordings` *(Supabase Dashboard / SQL — operator)*
- [x] Create Supabase Edge Function: `agora-token` *(see `supabase/functions/agora-token/index.ts`)*
- [x] Create Supabase Edge Function: `whisper-transcribe` *(see `supabase/functions/whisper-transcribe/index.ts`)*
- [x] Create Supabase Edge Function: `meeting-ai-extract` *(see `supabase/functions/meeting-ai-extract/index.ts`)*
- [x] Install npm packages: `agora-rtc-react agora-rtc-sdk-ng` *(added to `package.json`)*

### Phase 2 — Database
- [x] Create `SQL/v411_communications_ai_generated_flags.sql` (equivalent to planned v407 AI flags)
  - [x] Add `is_ai_generated` / `ai_source_type` to `issues` + `risks`
  - [x] Partial indexes `idx_issues_ai_draft`, `idx_risks_ai_draft`
  - [x] `sim.practice_issues` / `sim.practice_risks` status CHECK + columns + indexes
- [x] Create `SQL/v408_communication_tables.sql` (planned v404)
  - [x] Core comm tables Platform + Sim, RLS, `database_tables` registry
- [x] Create `SQL/v409_meeting_ai_tables.sql` (planned v405)
  - [x] Meeting + extraction tables Platform + Sim, RLS, permissions, `database_tables`
- [x] Create `SQL/v410_communications_menu_seed.sql` (planned v406)
  - [x] Menu items under `/platform/comms/...`, role assignments

### Phase 3 — Platform Services
- [x] `src/services/communications/channelService.js`
- [x] `src/services/communications/messageService.js`
- [x] `src/services/communications/meetingService.js`
- [x] `src/services/communications/recordingService.js`
- [x] `src/services/communications/transcriptionService.js`
- [x] `src/services/communications/meetingSummaryService.js`
- [x] `src/services/communications/meetingExtractionService.js`
- [x] `src/services/communications/agoraTokenService.js`

### Phase 4 — Platform Components
- [x] `src/components/comms/ChannelSidebar.jsx`
- [x] `src/components/comms/MessageBubble.jsx`
- [x] `src/components/comms/MessageInput.jsx`
- [x] `src/components/comms/ThreadDrawer.jsx`
- [x] `src/components/comms/VideoGrid.jsx`
- [x] `src/components/comms/CallControls.jsx`
- [x] `src/components/comms/ParticipantPanel.jsx`
- [x] `src/components/comms/TranscriptViewer.jsx`
- [x] `src/components/comms/SummaryCard.jsx`
- [x] `src/components/comms/ExtractedItemCard.jsx`
- [x] `src/components/comms/EnrichmentModal.jsx`
- [x] `src/components/comms/OnlinePresenceIndicator.jsx`
- [x] `src/components/comms/TypingIndicator.jsx`

### Phase 5 — Platform Pages
- [x] `src/pages/comms/CommsHub.jsx`
- [x] `src/pages/comms/DirectMessages.jsx`
- [x] `src/pages/comms/ChannelView.jsx`
- [x] `src/pages/comms/MeetingList.jsx`
- [x] `src/pages/comms/MeetingSchedule.jsx`
- [x] `src/pages/comms/MeetingRoom.jsx` (Agora integration)
- [x] `src/pages/comms/MeetingDetail.jsx`
- [x] `src/pages/comms/MeetingSummaryView.jsx`
- [x] `src/pages/comms/PendingAIReview.jsx`
- [x] `src/pages/comms/MeetingExtractionReview.jsx`
- [x] `src/pages/comms/ExtractedIssueEnrich.jsx`
- [x] `src/pages/comms/ExtractedRiskEnrich.jsx`

### Phase 6 — Simulator Services
- [x] `src/services/sim/communications/simChannelService.js`
- [x] `src/services/sim/communications/simMessageService.js`
- [x] `src/services/sim/communications/simMeetingService.js`
- [x] `src/services/sim/communications/simMeetingSummaryService.js`
- [x] `src/services/sim/communications/simMeetingExtractionService.js`

### Phase 7 — Simulator Pages
- [x] **Parity via shared pages:** same components as Platform with `useIsSimulator()` / `useCommsApi()` — routes under `/simulator/comms/...` *(no duplicate `Sim*` files; avoids drift)*

### Phase 8 — Routing
- [x] Platform comms lazy imports + routes in `src/App.jsx` (`platform/*`)
- [x] Simulator comms routes in `src/App.jsx` (`/simulator/comms/...`)
- [x] `message-square` and `video` icons in `Sidebar.jsx` `iconMap`
- [x] `src/config/simulatorMenuConfig.js` — Communications block

### Phase 9 — Tests & Docs
- [x] Unit tests: `src/__tests__/communications/*.test.js`, `src/__tests__/sim/communications/*.test.js`
- [x] `Documentation/Communications_Hub_User_Guide.md`
- [x] `Documentation/Meeting_AI_Extraction_Guide.md`
- [x] `Documentation/Agora_Integration_Setup_Guide.md`
- [x] `Documentation/Communications_Blog_Post.md`

---

## Review

**Implementation summary (2026-04-08)**

- **Database:** Added `v408`–`v411` SQL migrations (communication core, meetings + AI extraction + permissions, `is_ai_generated` flags, menu seed). Paths use `/platform/comms/...` to match the unified app router.
- **Frontend:** Communications services, components, and pages under `src/services/communications/`, `src/components/comms/`, `src/pages/comms/`. Simulator parity uses the same pages with `simDb`-backed services when the URL is under `/simulator/`. **Meeting extraction approve (Simulator):** wired to `sim.practice_issues` / `sim.practice_risks` via `simMeetingExtractionService.js` (not a placeholder toast).
- **Calls:** Agora Web SDK + `agora-rtc-react` deps; `MeetingRoom` joins using `VITE_AGORA_APP_ID` and token from Edge Function `agora-token`.
- **AI:** Edge functions `whisper-transcribe` (OpenAI `OPENAI_API_KEY`) and `meeting-ai-extract` (Gemini `GEMINI_API_KEY`). Wire transcript → summary → `insertExtractedFromAi` in a future glue step or admin action as needed.
- **Tests:** Six Vitest smoke tests for communications services; `npm run build` passes.
- **Manual / operator:** Create Storage buckets `comm-attachments` and `comm-recordings`; register Agora and deploy Edge Functions with secrets; run SQL on Supabase in order **v408 → v409 → v411 → v410** (after v403 helpers such as `user_has_access_to_account` / `auth_user_can_access_project` / `sim_auth_user_owns_run` exist).

