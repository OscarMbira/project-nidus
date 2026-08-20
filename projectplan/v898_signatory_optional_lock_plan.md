# v898 — Lock Remaining Optional Signatories — Implementation Plan

See `projectprd/v898_signatory_optional_lock_PRD.md` for the problem
statement, user stories, and decisions this plan implements.

## Todo

- [x] SQL `SQL/v898_signatory_lock_remaining_optional.sql`: extend
      `chk_ptds_status`/`chk_sim_ptds_status` to include `'expired'`; add
      `locked_by`, `locked_at`, `lock_reason` columns (public + sim); replace
      `policy_ptds_update` / `policy_sim_ptds_update` with a third case
      permitting a signed-mandatory signatory to flip a pending optional row
      to `expired`, gated on the whole round being mandatory-complete.
- [x] `packages/shared/src/services/processTemplateSignatoryService.js`:
      - `canLockRemainingOptionalSlots(slots, userId)` — pure helper.
      - `lockRemainingOptionalSignatories(db, { templateNodeId, reason })` —
        bulk update, mirrors `declineSlot`'s required-reason validation.
      - `getDeclinedSignatoryCount(db, templateNodeId)` — cheap, all-rounds
        count (added mid-session per follow-up request on decline audit
        accessibility).
- [x] `apps/platform/src/components/ui/SignatoriesPanel.jsx` +
      `apps/simulator/src/components/ui/SignatoriesPanel.jsx` (parity):
      - Generalise `DeclineReasonPrompt` → `ReasonPrompt` (tone/placeholder/
        label props), used by both Decline and Lock.
      - `STATUS_BADGE.expired` (Lock icon, gray).
      - `canLock` gating: `fullySigned && canLockRemainingOptionalSlots(...)`.
      - "Lock remaining optional signatories" action + reason prompt.
      - Expired-row detail line (locked_at + lock_reason), mirroring the
        declined-row line.
      - History list: show `lock_reason` for `expired` rows.
      - Notifications: affected optional signatories + document owner.
      - Persistent, `disabled`-independent "N recorded declines" notice
        (`declinedCount`, `getDeclinedSignatoryCount`, `openHistory`) — PRD
        user story 11.
      - Decline notifications broadened from "document owner only" to every
        other currently-assigned signatory — PRD user story 12.
- [x] Unit tests: service helpers (both apps not needed — service is shared,
      single test file) + component tests in both `SignatoriesPanel.test.jsx`
      copies.
- [x] SQL migration applied to Supabase — confirmed by user (v898 ran successfully).
- [x] Manual in-app verification — confirmed by user via screenshot on
      Project Charter TPL-0030 (SEED334-PRJ-07): after the sole mandatory
      slot (Project Manager) signed, the panel correctly showed "All
      mandatory slots are complete — the document content is now read-only.
      4 optional signatory slots are still open below," the green "All
      mandatory signatories have signed" banner, and the "Lock remaining
      optional signatories" button — all four remaining optional slots
      (Programme Manager, Portfolio Manager, PMO Admin, Project
      Sponsor/Executive) still assignable/pending rather than locked out.

## Review

**What changed:**
- New DB migration (`SQL/v898_signatory_lock_remaining_optional.sql`) adds a
  fourth signatory status, `expired`, plus `locked_by`/`locked_at`/
  `lock_reason` audit columns, and a third RLS case letting any signed
  mandatory signatory close out remaining pending optional slots once the
  whole round is mandatory-complete — enforced at the RLS layer, not just
  client-side.
- Shared service (`processTemplateSignatoryService.js`) gained
  `canLockRemainingOptionalSlots`, `lockRemainingOptionalSignatories`, and
  (from the follow-up decline-audit request) `getDeclinedSignatoryCount`.
- Both `SignatoriesPanel.jsx` copies (Platform + Simulator, kept at parity):
  a "Lock remaining optional signatories" action with a required-reason
  prompt (the existing per-slot decline prompt was generalised into a
  reusable `ReasonPrompt` rather than duplicated); an `expired` status badge
  and per-row detail line; and a persistent, always-visible "N recorded
  declines" notice plus decline notifications now reaching every assigned
  signatory, not just the document owner.
- Tests: 9 new cases in the shared service test file, 4 new cases in each
  app's `SignatoriesPanel.test.jsx` — all passing (44 / 13 / 9 respectively).

**Not done / left for the user:** the SQL migration has not been applied to
any Supabase environment yet, and the feature has not been exercised in a
running dev server — both are called out as an explicit open todo above.
