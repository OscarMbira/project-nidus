# Success Confirmation Modal (v861)

A blocking "OK to acknowledge" modal shown after a successful create/update/delete, replacing `toast.success()` / `window.alert()` / page-local success banners for CRUD confirmations (CLAUDE.md rule 16). Companion Admin implementation: `E:\project-nidus-admin\projectplans\v202_success_confirmation_modal_plan.md`.

## Why

Before this, the same kind of action (saving a record) gave five different experiences depending on the page: nothing at all, a native `alert()`, a toast that fired and navigated away in the same tick, a toast with no navigation, or a one-off inline banner duplicated per app. None of them forced the user to actually acknowledge the confirmation before continuing.

## What it is

- **PDF/Word/PPT/Excel-style content?** No — that's [Record View Document Preview](./Record_View_Document_Preview_v853_Guide.md), a different feature. This one shows a small modal: record ID + what happened (created/updated/deleted) + a single **OK** button.
- Built on the existing `Modal.jsx` (`size="sm"`, `closeOnOverlayClick={false}` — a stray click can't dismiss it, only OK or Escape).
- Auto-focused OK button, Copy-ID action, icon/color by operation (green check for created/updated, amber for deleted).

## How to use it

```jsx
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

function MyForm({ onSave }) {
  const { showSuccess, modal } = useSuccessModal()

  const handleSubmit = async () => {
    const saved = await saveRecord(...)
    showSuccess({
      recordId: saved.display_id,       // display ID, never the raw UUID (rule 16.1)
      operation: 'created',              // 'created' | 'updated' | 'deleted'
      message: 'Record created successfully.',
      onOk: () => navigate('/records'),  // OPTIONAL — see below
    })
  }

  return (
    <>
      {modal}
      <form onSubmit={handleSubmit}>...</form>
    </>
  )
}
```

**`onOk` is per-flow, never a default.** Pass it only when this specific save is terminal and should navigate the user elsewhere (e.g. "Create Risk" → the risk list). Omit it for iterative multi-save pages (e.g. the Form Template Builder) so OK just closes the modal and the user keeps working. The hook never assumes navigation on your behalf.

**Reset your unsaved-changes baseline before calling `showSuccess`** if the page uses `useUnsavedChangesGuard` — otherwise a subsequent navigation can double-prompt.

## Where it lives

| File | Role |
|---|---|
| `packages/ui/src/SuccessConfirmationModal.jsx` | Presentational modal. |
| `packages/shared/src/hooks/useSuccessModal.jsx` | Local per-page hook — `{ showSuccess, modal }`. Mirrors Admin's `useConfirmAction()` shape. No global provider. |

Both have byte-identical shadow copies in `apps/platform/src/{components/ui,hooks}/` and `apps/simulator/src/{components/ui,hooks}/` — this repo's established convention for shared-package code. Keep them in sync on any future edit.

## Rollout status (v861)

Fixed now, as the starting batch:
- `RiskForm.jsx` (Platform + Simulator) — previously gave **no feedback at all** on save.
- `IssueForm.jsx` (Platform + Simulator) — previously used a native `window.alert()`.
- `FormTemplateBuilder.jsx`, `StakeholderAssessmentMatrixPage.jsx`, `PracticeStakeholderAssessmentMatrixPage.jsx` (6 files, Platform + Simulator) — migrated off the now-deleted, per-app-duplicated `CrudSuccessBanner.jsx`.

**Everything else keeps its existing `toast.success()`/`showSuccess()` for now.** CLAUDE.md rule 16 mandates `useSuccessModal()` for NEW and AMENDED create/update/delete flows going forward — migrate a page's save flow to it opportunistically when you're already touching that page, not as a standalone batch task. There are still ~1,000 existing CRUD toast call sites across Platform/Simulator/Admin that this plan deliberately did not sweep (see PRD `projectprd/v861_success_confirmation_modal_PRD.md`, decision D2).

## Admin

Admin has its own, separately-built `useSuccessModal()` (`E:\project-nidus-admin\packages\ui\src\useSuccessModal.jsx`) on top of its existing `AdminModal` — per the cross-codebase import ban, it shares design intent with this one but no code. See the Admin plan for its own rollout status.
