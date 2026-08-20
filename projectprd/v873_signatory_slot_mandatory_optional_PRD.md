# v873 — Signatory Slot Mandatory / Optional — PRD

**Extends:** `projectprd/v868_process_template_document_signatories_PRD.md`
**Repos:** `E:\project-nidus` (Platform + Simulator). No Admin ID Generation change (boolean column only).
**Status:** Interview complete; implementation shipped (see plan). Awaiting SQL apply + manual checklist.

---

## a) Problem statement

v868 lets a PMO Admin configure an ordered list of signatory role-slots per document type. Every configured slot is treated as required: the document only locks when **all** slots are signed, turn order waits on every earlier slot, and every slot must be assigned before signing can start.

Real governance practice often needs a mix — e.g. Project Manager and Sponsor **must** sign a Charter, while a PMO Admin or Portfolio Manager signature is desirable but not blocking. Today there is no way to mark a slot optional without removing it entirely.

## b) Solution

Add a per-slot **Mandatory** flag (default **true**) on the Document Signatory requirements config and snapshot it onto each document signing instance when a round starts.

- Document locks when every **mandatory** slot in the current round is `signed`.
- Turn order / RLS only wait on earlier **mandatory** slots.
- Only mandatory slots must be assigned before signing proceeds.
- Optional slots still appear (with an **Optional** badge), can be assigned and signed later, and still **halt the chain if declined**.
- At least one slot in a saved list must remain mandatory.
- Existing rows migrate as mandatory so behaviour is unchanged until an admin opts out.

## c) User stories

1. As a PMO Admin on Document Signatory, I can mark each slot **Mandatory** (checkbox, on by default) or uncheck it to make the slot optional.
2. As a PMO Admin, I cannot save a slot list where every slot is optional — at least one must stay mandatory.
3. As a PMO Admin, my mandatory/optional choices are snapshotted onto documents when their signing round starts; later config edits do not rewrite in-progress or completed rounds.
4. As a project team member, I see an **Optional** badge on optional slots on the Signatories tab.
5. As a project team member, I can leave optional slots unassigned and still start / complete signing for mandatory slots.
6. As a signatory on a later slot, I am not blocked by an earlier unsigned optional slot — only by earlier unsigned mandatory slots.
7. As any user, the document locks read-only once every **mandatory** slot is signed (optional slots may still be pending / unsigned).
8. As a signatory on an optional slot who declines (with a reason), the chain **halts** the same way as a mandatory decline (owner notified; restart required to continue).
9. As a user exporting a signed document, I see every slot in the Signatures section; unsigned optional slots show “Optional — not signed” (or Declined).
10. As a Simulator user, I get the same mandatory/optional behaviour as Platform (rule 34).
11. As an organisation upgrading from v868, all existing requirement slots and in-flight rows behave as mandatory until changed.

## d) Implementation decisions

| # | Decision | Chosen | Covers |
|---|----------|--------|--------|
| 1 | Fully signed / lock | Every **mandatory** slot signed; unsigned optional do not block | Stories 7 |
| 2 | Turn order | Only earlier **mandatory** slots must be signed before a later slot can act | Stories 6 |
| 3 | Assignment gate | Only **mandatory** slots must be assigned before signing proceeds | Stories 5 |
| 4 | Snapshot | `is_mandatory` copied onto `process_template_document_signatories` at round start (like `role_label`) | Stories 3 |
| 5 | Config UI | Per-row **Mandatory** checkbox, default checked | Stories 1 |
| 6 | All-optional lists | Disallowed on save — at least one mandatory slot required | Stories 2 |
| 7 | Signatories tab | Same row + small **Optional** badge; blank assignment allowed | Stories 4, 5 |
| 8 | Decline on optional | Still **halts** the chain (genuine decline) | Stories 8 |
| 9 | Export | List all slots; unsigned optional → “Optional — not signed” | Stories 9 |
| 10 | Existing data | `is_mandatory DEFAULT true` (migration + backfill) | Stories 11 |
| 11 | Scope | Platform + Simulator | Stories 10 |

**Consistency calls (not re-interviewed):**

- Column name: `is_mandatory boolean NOT NULL DEFAULT true` on `process_template_signatory_requirements` and `process_template_document_signatories` (public + sim).
- Update sequential RLS `NOT EXISTS` to ignore earlier rows where `is_mandatory = false` (or equivalently: only require earlier `is_mandatory` rows to be `signed`).
- `isDocumentFullySigned`: `every` mandatory row is `signed` (and at least one mandatory row exists, guaranteed by config validation + snapshot).
- Next-turn notifications: find next eligible pending slot under mandatory-only blocking rules.
- No new Admin ID Generation rule (boolean only).

## e) Testing decisions

- Extend `processTemplateSignatoryService` Vitest coverage: save rejects all-optional; fully-signed ignores unsigned optional; turn eligibility with optional gap; init round snapshots `is_mandatory`; restart preserves snapshot from current requirements.
- Extend Platform (and Simulator where present) `SignatoriesPanel` tests: Optional badge; lock when mandatory complete with optional pending.
- Manual checklist: configure mixed mandatory/optional → assign only mandatory → sign past optional gap → confirm lock with optional still pending → decline optional → confirm halt → export shows “Optional — not signed”.

## f) Out of scope

- Per-document override of mandatory/optional (config remains per document type).
- Removing sequential order entirely / parallel signing of all mandatory slots.
- Changing decline reason rules.
- Admin app UI (no Admin config surface for this table).

## g) Further notes

- Version: **v873** (v872 already used by friendly project URLs).
- SQL: single migration `SQL/v873_signatory_slot_is_mandatory.sql` (public + sim ADD COLUMN + RLS policy refresh for sequential check).
- Precedent: v868 snapshot of `role_label`; same replace-on-save requirements UX.
