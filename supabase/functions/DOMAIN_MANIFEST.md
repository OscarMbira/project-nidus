# Edge Function Domain Manifest (v729 Phase 4.1 / 4.2)

Legacy function folder names are retained for backward compatibility with deployed clients.
New functions should use the prefix convention below.

| Function (deployed name) | Domain prefix | Serves |
|--------------------------|---------------|--------|
| `paynow-initiate` | `platform-*` | Platform billing |
| `paynow-poll` | `platform-*` | Platform billing |
| `paynow-verify-subscription` | `platform-*` | Platform billing |
| `paynow-webhook` | `platform-*` | Platform billing |
| `send-trial-email` | `platform-*` | Platform onboarding |
| `check-trial-expirations` | `platform-*` | Platform subscriptions |
| `ai-simulator-debrief` | `simulator-*` | Simulator AI |
| `ai-simulator-hint` | `simulator-*` | Simulator AI |
| `send-email` | `shared-*` | Both domains |
| `accept-invitation` | `shared-*` | Both domains |
| `agora-token` | `shared-*` | Both domains |
| `ai-data-summary` | `shared-*` | Both domains |
| `ai-docs` | `shared-*` | Both domains |
| `ai-knowledge` | `shared-*` | Both domains |
| `expire-drafts` | `shared-*` | Both domains |
| `meeting-ai-extract` | `shared-*` | Both domains |
| `plan-ai-generate` | `shared-*` | Both domains |
| `whisper-transcribe` | `shared-*` | Both domains |

## Naming convention for new functions

- `platform-<feature>` — Platform-only APIs
- `simulator-<feature>` — Simulator-only APIs
- `shared-<feature>` — Used by both apps

## Per-domain deploy (CI)

Deploy only changed functions:

```bash
supabase functions deploy ai-simulator-hint --project-ref $SIMULATOR_SUPABASE_PROJECT_ID
supabase functions deploy paynow-initiate --project-ref $PLATFORM_SUPABASE_PROJECT_ID
```
