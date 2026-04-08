# Communications Hub — User Guide

## Overview

The Communications area (`/platform/comms` on Platform, `/simulator/comms` on Simulator) provides:

- **Channels and direct messages** — real-time chat (Supabase Realtime on `comm_messages`).
- **Meetings** — schedule sessions, join an Agora-powered room, view transcripts and AI summaries.
- **Pending AI reviews** — approve or reject issues and risks suggested from meeting transcripts.

## Roles

Menus are seeded for all roles; viewers cannot schedule new meetings (application + menu rules). Pending AI reviews are most relevant for PM, TL, and admins.

## Prerequisites

1. Run SQL migrations in order: `v408_communication_tables.sql`, `v409_meeting_ai_tables.sql`, `v411_communications_ai_generated_flags.sql`, `v410_communications_menu_seed.sql`.
2. Create Storage buckets `comm-attachments` and `comm-recordings` (private) in Supabase.
3. Enable Realtime for `public.comm_messages` (and `sim.comm_messages` for Simulator) in the Supabase Dashboard if not already added to the `supabase_realtime` publication.

## Navigation

Use the sidebar **Communications** group (icon: message square). Routes are under `/platform/comms/...` or `/simulator/comms/...`.
