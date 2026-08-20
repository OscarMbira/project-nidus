# v898 — Lock Remaining Optional Signatories (Platform + Simulator)

## a) Problem statement

v868/v873 introduced a sequential, mandatory/optional signatory chain for
`process_templates` documents. Once every **mandatory** slot is signed, the
document is `fullySigned` and its content locks read-only. Optional slots have
no deadline: if an optional signatory never acts, their slot sits `pending`
indefinitely, and (per the v893/session fix immediately preceding this PRD)
they retain permanent access to sign/decline via the Signatories tab. There is
no way to formally close out a round when the mandatory signatories judge that
optional signatories have had enough time and the document should move on
without them.

## b) Solution

Add a document-level action, **"Lock remaining optional signatories,"**
available to any signatory who has already signed a **mandatory** slot in the
current round, once **all** mandatory slots are signed (i.e. the round is
`fullySigned`). Triggering it (with a required reason, mirroring the existing
Decline flow) flips every still-`pending` **optional** slot in the current
round to a new terminal status, `expired`, recording who closed it and why.
Mandatory slots are never touched by this action. RLS enforces both
eligibility conditions (caller signed a mandatory slot; all mandatory slots
signed) independently of the UI, matching this feature area's existing
"RLS is the real enforcement boundary" convention.

## c) User stories

1. As a mandatory signatory who has signed, once every mandatory slot in the
   round is signed, I see a "Lock remaining optional signatories" action if at
   least one optional slot is still pending.
2. Clicking it requires me to enter a reason before I can confirm (mirrors the
   Decline flow's mandatory-reason pattern).
3. Confirming flips every pending optional slot in the current round to
   `expired`, recording `locked_by`, `locked_at`, `lock_reason`.
4. An expired slot displays a distinct badge ("Expired") and the lock reason +
   timestamp, the same way a declined slot shows its decline reason.
5. The affected optional signatories (those whose slot just expired) and the
   document owner receive an in-app notification explaining the round was
   closed and why.
6. Once no pending optional slots remain, the "Lock remaining optional
   signatories" action disappears and the "N optional slots still open"
   banner (from the immediately-preceding fix) reverts to the plain
   "Fully signed" message.
7. A signatory who has NOT signed a mandatory slot in this round never sees
   the lock action, even if they can otherwise view/manage the document
   (`disabled=false`).
8. The lock action is unavailable while any mandatory slot is still pending —
   even to a signatory who has personally signed a mandatory slot — since the
   round is not yet `fullySigned`.
9. Signing history (`View history`) shows expired slots with their status
   label and lock reason, the same way it already shows declined slots.
10. Platform and Simulator behave identically (shared service in
    `packages/shared`; parity applied to both `SignatoriesPanel.jsx` copies).
11. A decline is a permanent part of the document's audit trail — it survives
    a chain restart (the append-only round design already guarantees this)
    and stays visible to **every** signatory ever assigned to the document,
    not just whoever currently manages it. A persistent notice ("This
    document has N recorded declines…") is shown in the Signatories panel —
    unconditionally, i.e. even when `disabled` — so the audit trail is
    discoverable without hunting for the "View history" toggle. Clicking it
    opens history directly.
12. When a decline happens, every OTHER signatory currently assigned to a
    slot on the document (not just the document owner) receives an in-app
    notification, in addition to the existing owner notification.

## d) Implementation decisions

- **New terminal status `expired`** (not a reuse of `declined`) — declining is
  a personal refusal by the assigned signatory; expiring is an administrative
  close-out by someone else. Keeping them distinct preserves the meaning of
  existing `declined` data/behaviour (e.g. the "Restart signing" button only
  appears for `declined`, not `expired` — locking an optional slot is not a
  chain-halting failure, so no restart is implied or required).
- **New columns** on `process_template_document_signatories` (public + sim):
  `locked_by uuid NULL REFERENCES users(id)`, `locked_at timestamptz NULL`,
  `lock_reason text NULL`. No new table, so no `database_tables` /
  ID-Generation registration is required (rule 16.2 only applies to new
  tables).
- **Eligibility, enforced in RLS** (not just the UI): the caller must (a) have
  a `signed` row where `is_mandatory = true` in the *same round*, AND (b) no
  mandatory row in that round may still be non-`signed`. Both conditions
  together are exactly `fullySigned` scoped to "and it was this specific
  person who filled one of those mandatory slots" — the RLS predicate is
  self-contained and doesn't trust a client-computed flag.
- **Reason is mandatory**, mirroring `declineSlot`'s existing
  `if (!reason?.trim()) throw ...` pattern — an administrative close-out
  affecting other people's slots warrants the same accountability as a
  personal decline.
- **No "unlock" / reopen action** in this pass — once expired, an optional
  slot is terminal for the round. If an org later decides an expired
  signatory must be brought back in, the existing "Restart signing" (new
  round, everyone re-signs) is the escape hatch. A scoped reopen-single-slot
  action is explicitly out of scope (see below).
- **Shared `ReasonPrompt`**: the existing per-slot `DeclineReasonPrompt` is
  generalised into a small reusable `ReasonPrompt` (title/placeholder/tone
  props) used by both Decline and Lock, rather than duplicating a near-
  identical textarea+buttons block.

## e) Testing decisions

- Unit tests in `packages/shared/src/services/__tests__/
  processTemplateSignatoryService.test.js` for the new
  `canLockRemainingOptionalSlots()` pure helper and
  `lockRemainingOptionalSignatories()` service call (mocked Supabase client).
- Component tests in both `SignatoriesPanel.test.jsx` copies: button
  visibility gating (not shown pre-fullySigned, not shown to a non-mandatory
  signer, shown+works for an eligible mandatory signer), reason required
  before confirm enabled, badge rendering for `expired`.
- No new RLS integration test harness exists in this repo for this table;
  the SQL policy is manually reasoned through against the same pattern as
  v873's already-shipped policy (this PRD's "Implementation decisions"
  section documents the exact predicate).

## f) Out-of-scope items

- Automatic/time-based expiry (a real "deadline" with a cron job). This PRD
  is a manual close-out action only — no scheduling infrastructure is added.
- Reopening a single expired slot without a full round restart.
- Any change to the mandatory-slot sequential signing behaviour.
- Export/report surfaces (PDF/Word/Excel signature exports) — `expired` slots
  will render through the existing `resolveDocumentSignaturesForExport`
  per-slot status rendering with no changes needed (it already renders
  arbitrary status strings).

## g) Further notes

- This directly follows the same-session fix where `SignatoriesPanel`'s
  `disabled` prop was decoupled from `fullySigned` in
  `OrganisationalTemplateDetailPage.jsx` (Platform + Simulator) so optional
  signatories keep write access after mandatory completion. This PRD adds the
  deliberate, auditable way to end that open-ended waiting period.
- Version: SQL `v898_signatory_lock_remaining_optional.sql`; plan
  `v898_signatory_optional_lock_plan.md`.
