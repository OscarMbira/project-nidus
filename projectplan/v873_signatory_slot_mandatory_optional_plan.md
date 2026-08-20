# v873 — Signatory Slot Mandatory / Optional — Implementation Plan

**PRD:** `projectprd/v873_signatory_slot_mandatory_optional_PRD.md`
**Status:** ✅ Implemented (awaiting SQL apply + manual checklist).
**Repos:** `E:\project-nidus` (Platform + Simulator).

---

## Design recap

- `is_mandatory boolean NOT NULL DEFAULT true` on requirements + document signatory rows (public + sim).
- Config UI: Mandatory checkbox per slot; save requires ≥1 mandatory.
- Snapshot at round init; lock / turn / assignment use mandatory only; optional decline still halts; export labels unsigned optional.

---

## Todos

- [x] `SQL/v873_signatory_slot_is_mandatory.sql`
- [x] Update `processTemplateSignatoryService.js` + unit tests
- [x] `SignatoryRequirementsPage.jsx` (pmo-module + sim-pmo-module)
- [x] `SignatoriesPanel.jsx` (Platform + Simulator)
- [ ] Extend `SignatoriesPanel` component tests (opportunistic; service tests cover core rules)
- [x] Update `Documentation/Process_Template_Document_Signatories_v868_Guide.md`
- [x] Review section

---

## Manual steps after merge

1. Run `SQL/v873_signatory_slot_is_mandatory.sql` on Supabase.
2. Hard-refresh Document Signatory; uncheck Mandatory on a slot; Save; confirm Optional badge + lock without that signature.
3. Decline an optional assigned slot → confirm chain halts; export shows Declined / Optional — not signed as appropriate.

---

## Review section

### Summary

Shipped v873 mandatory/optional signatory slots: schema + RLS/storage turn-order (mandatory-only blocking), shared service helpers and save validation (23 tests passing), PMO config checkbox (Platform + Simulator), Signatories tab Optional badge and lock/turn/notification updates, export text for unsigned optional / declined slots, and guide updates.

### Files

- `SQL/v873_signatory_slot_is_mandatory.sql`
- `packages/shared/src/services/processTemplateSignatoryService.js` (+ tests)
- `packages/modules/pmo-module` / `sim-pmo-module` `SignatoryRequirementsPage.jsx`
- `apps/platform` / `apps/simulator` `SignatoriesPanel.jsx`
- `Documentation/Process_Template_Document_Signatories_v868_Guide.md`
- `projectprd/v873_signatory_slot_mandatory_optional_PRD.md`
