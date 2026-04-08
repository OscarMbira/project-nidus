# Agora Integration — Setup Guide

## Purpose

Video/audio calls use **Agora RTC**. The browser needs a public **App ID**; tokens must be generated server-side using your **App Certificate** (never expose the certificate in the frontend).

## Frontend

- Set `VITE_AGORA_APP_ID` in `.env` (see `.env.example`).
- `MeetingRoom.jsx` joins the channel named in `comm_meetings.agora_channel_name` using a token from the Edge Function `agora-token`.

## Edge Function: `agora-token`

- Secrets in Supabase: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` (same values as in Agora Console).
- Deploy: `supabase functions deploy agora-token`
- The function returns `{ token, appId, uid }` for `RtcTokenBuilder` (see `supabase/functions/agora-token/index.ts`).

## Optional

- `VITE_AGORA_TOKEN_URL` — reserved if you later point to a standalone token service instead of `functions.invoke`.

## References

- [Agora Web SDK](https://docs.agora.io/en/video-calling/get-started/get-started-sdk)
- Project packages: `agora-rtc-react`, `agora-rtc-sdk-ng`
