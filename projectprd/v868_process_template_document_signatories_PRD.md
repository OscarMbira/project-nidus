# v868 — Process Template Document Signatories — PRD

**Companion feature to:** `projectprd/v867_process_template_document_attachments_prd.md` (same target system, same document-level linking pattern via `pm_template_nodes.id`)
**Repos touched:** `E:\project-nidus` (monorepo — Platform + Simulator). No Admin repo changes beyond an ID Generation seed.
**Status:** Interview complete (16 decisions confirmed with user, one question at a time, per CLAUDE.md rules 56–60). PRD drafted. Plan not yet built — awaiting explicit go-ahead per rule 60.

---

## a) Problem statement

The `process_templates` system holds the organisation's formal, PMBOK/PRINCE2-style governance documents — Project Charter, Business Case, Project Management Plan, Closure Checklist, and 20 others (see full list in §d). These are exactly the class of document that, in real organisational practice, requires named individuals to formally sign off before the document is considered final: a Project Manager and Sponsor signing a Charter, a Business Owner signing off a Business Case, and so on.

Today, nothing in the system captures this. The closest existing things are:
- A generic single-approver **record lifecycle** (`record_status`, `authorised_by`, `authorised_at` — CLAUDE.md rule 53) used elsewhere in the app (risks, issues, projects) for a one-person authorise/reject gate — not a multi-signatory chain, and not wired to `process_templates` documents at all.
- One document (`ProjectClosureForm.jsx`) has ad hoc `prepared_by`/`approved_by`/`final_approval_date` fields living inside its freeform `document_data` JSONB — not a structured, reusable, or enforced signing mechanism, and not visible or attachable to any other document type.

There is no way today for an organisation to say "a Project Charter isn't final until the PM and the Sponsor have both signed it," track who has signed and when, capture an actual signature image, lock the document once fully signed, or export a signed copy with the signature block intact.

## b) Solution

Add a **document-level, sequential, multi-signatory sign-off workflow** to `process_templates` documents, following the exact document-linking pattern already established by `process_template_attachments` (v867): keyed by `pm_template_nodes.id`, not by any of the 24 individual content tables.

Shape of the feature:
1. **PMO Admin configures, per organisation and per document type**, a fixed, ordered list of required signatory role-slots (e.g. Project Charter → "Project Manager", "Sponsor").
2. **Whoever fills in an actual document** picks which project team member fills each configured role-slot for that specific document instance.
3. **Signatories sign in slot order** (sequential) by uploading an image of their signature — reusing a saved signature after the first time, or uploading fresh.
4. **A signatory can decline** (with a mandatory reason) instead of signing, which halts the chain and notifies the document owner; resolving it means a full restart where everyone signs again.
5. **Once every required slot is signed**, the document (its content fields and its Attachments panel) locks read-only.
6. **Exports** (Word/PDF/PPT/Print) of a fully-signed document include a signature block: each signatory's name, role label, signed date/time, and their signature image.
7. Only document types a PMO Admin has actually configured show a "Signatories" tab at all — most of the 24 types will show nothing extra.

## c) User stories

**PMO Admin — policy configuration**
1. As a PMO Admin, I can open a settings screen and, for any of the 24 process_template document types, define an ordered list of required signatory role-slots (e.g. slot 1 = "Project Manager", slot 2 = "Sponsor").
2. As a PMO Admin, I can reorder, rename, add, or remove role-slots for a document type, and my changes only affect documents that haven't started signing yet (in-progress/completed signing chains keep the slot labels they were assigned under).
3. As a PMO Admin, I can deactivate a document type's signatory requirement entirely, which removes the Signatories tab from documents of that type going forward.
4. As a PMO Admin, my configuration is scoped to my organisation only — other organisations' configurations are independent.

**Document preparer / project team member — assigning signatories**
5. As a project team member viewing a document whose type has a configured signatory requirement, I see a "Signatories" tab alongside "Document details" and "Audit details".
6. As a project team member, for each required role-slot I can pick which project team member will fill it, from the members of this document's project.
7. As a project team member, I cannot leave a slot unassigned once I start the signing process — every configured slot must have a person picked before the first signatory can sign.
8. As a project team member, I can change who's assigned to an unsigned slot at any time before that slot has been signed.

**Signatory — signing**
9. As a signatory, I can see the full ordered list of slots for this document, who's assigned to each, and each slot's status (not yet their turn / awaiting them / signed / declined).
10. As a signatory, when it becomes my turn (the slot before mine, if any, is signed), I receive a notification.
11. As a signatory whose turn it is, I can sign by uploading an image of my signature.
12. As a signatory who has signed before on any document, I'm offered "sign with my saved signature" as a one-click option, with the ability to upload a different image instead.
13. As a signatory whose turn it is, I can instead decline to sign, and must provide a reason before the decline is recorded.
14. As a signatory, I cannot sign or decline before my turn (earlier slots must be signed first).
15. As a signatory, once I've signed, my slot shows my name, role label, and the exact date/time I signed, and displays my signature image.

**Document owner / project team — decline and restart**
16. As the document's project team, when any signatory declines, I'm notified with their stated reason.
17. As the document's project team, after addressing a decline, I can restart the signing chain — every previously-signed slot resets to unsigned and every signatory must sign again from slot 1.
18. As the document's project team, I can see the full history of prior signing rounds (including declined ones and their reasons) for audit purposes.

**Document lock**
19. As any user, once every required slot on a document is signed, the Document details fields and the Attachments panel become read-only, and I can see a clear "Fully signed" indicator.
20. As a PMO Admin, I can still see and export a fully-signed, locked document.

**Export**
21. As a user exporting a document (Word/PDF/PPT/Print), if it has any completed signatures, I see a "Signatures" section listing each signatory's name, role, and signed date/time, with their signature image embedded, formatted appropriately for that export type (rule 38).

**Simulator parity**
22. As a Simulator user practising governance documents, I have the same Signatories tab, configuration, signing, decline, and export behaviour as Platform, scoped to `sim.practice_projects`.

## d) Implementation decisions

Decided through the mandatory one-at-a-time interview (CLAUDE.md rules 56–60); each links to the corresponding user story above.

| # | Decision | Chosen | Covers |
|---|----------|--------|--------|
| 1 | Target system | `process_templates` only (not the Dynamic Form Engine, not both) | Problem statement, all stories |
| 2 | Signatory pool | Any project team member (`public.user_projects` / `sim.practice_projects` scope) — not any org user, not external non-login signatories | Stories 6, 8 |
| 3 | Count/requirement model | Fixed, ordered list of role-slots **per document type**, not ad hoc per document and not a simple org-wide max count | Stories 1–4 |
| 4 | Policy scope | Per-organisation (`account_id`-scoped), configured by PMO Admin — not a single system-wide default | Stories 1, 4 |
| 5 | Slot definition | A role **label** only (free text, e.g. "Sponsor"); the actual person is picked per document instance, not auto-resolved from an existing role field | Stories 1, 6 |
| 6 | Signing order | Sequential — a slot can't be signed until all earlier slots are signed | Stories 9, 10, 14 |
| 7 | Signature capture | An **uploaded image file** of the signatory's signature (not a drawn canvas, not typed-name styling) | Stories 11, 15 |
| 8 | Post-signing effect | Document (content fields + Attachments panel) locks **read-only** once every required slot is signed | Story 19 |
| 9 | Decline handling | A signatory may decline in place of signing, with a **mandatory reason** — halts the chain | Story 13, 16 |
| 10 | Restart after decline | **Full restart** — every slot resets, every signatory re-signs from slot 1 (not resume-from-decline-point) | Story 17 |
| 11 | Simulator parity | Built for **both** Platform and Simulator (rule 34) | Story 22 |
| 12 | UI placement | A new, dedicated **"Signatories" tab**, alongside the existing "Document details"/"Audit details" tabs (rule 63 precedent) | Story 5 |
| 13 | Notifications | Reuses the existing `notifications` table/bell-icon system — fires on: becomes-your-turn, decline, chain complete | Stories 10, 16 |
| 14 | Export support | Signature block (name, role, signed date/time, embedded image) rendered on **every** export format (Word/PDF/PPT/Print), reusing the exact image-embedding mechanism built for v863/v867 | Story 21 |
| 15 | Applicability scope | Signatories tab **only appears** on document types a PMO Admin has actually configured a requirement for — not shown (even empty) on the other document types | Story 5 |
| 16 | Signature image reuse | Saved once per user (`public.user_signature_images`, keyed by `auth_user_id` — a signature is a property of the person, shared between Platform and Simulator, not duplicated per app), offered as a one-click default with an explicit "use a different image" override | Stories 12, 22 |

**Additional decisions made while grounding the design in the existing codebase (not asked, because they're facts/consistency calls, not open product questions):**

- **"Document type" identity**: reuses the existing 24-table enumeration already defined in `packages/shared/src/services/pmTemplateContentService.js`'s `PROCESS_TEMPLATE_TABLES` constant (`project_charters`, `assumption_logs`, `project_management_plans`, `requirements_management_plans`, `requirements_documentation`, `wbs_dictionary_entries`, `activity_attributes`, `activity_resource_requirements`, `resource_breakdown_structure`, `activity_duration_estimates`, `cost_management_plans`, `activity_cost_estimates`, `cost_baselines`, `resource_management_plans`, `stakeholder_engagement_plans`, `procurement_management_plans`, `quality_checklists`, `team_performance_assessments`, `make_or_buy_decisions`, `variance_analysis_reports`, `evm_status_reports`, `scope_acceptance_forms`, `project_closure_checklists`, `contract_closure_documents`). The requirement config table is keyed by `(account_id, document_table)` where `document_table` is one of these exact strings — the same value already resolved into `contentInfo.table` on the detail page and stored in `process_template_node_links.document_table`.
- **Project membership check reuses the existing, correct helper**: `public.auth_user_can_access_project()` / `sim.auth_user_can_access_practice_project()` — the same helpers that `v866d`/`v866e` (this session's attachments RLS fix) corrected the attachments feature to use, after discovering that comparing `user_projects.user_id` directly to `auth.uid()` is wrong (`user_projects.user_id` is `public.users.id`, not the auth UID).
- **Signing-round history is append-only, not overwritten** — each restart increments a `signing_round` counter and inserts fresh rows rather than mutating prior rows, mirroring the versioning pattern already used by `process_template_attachments` (`is_current` flag, full history retained) and `record_pending_changes`. This satisfies story 18 (audit history of declines) essentially for free.
- **Lock state is computed, not stored** — "is this document fully signed" is derived by querying whether every required slot's current-round status is `signed`, rather than adding a `record_status` column to 24 different content tables. Avoids a much larger, riskier schema change across every process_template content table.
- **No Admin ID Generation reference on `process_template_signatory_requirements`** (the PMO Admin config table) or `user_signature_images` (a personal asset, not a lookup-by-ID record) — consistent with how other configuration tables (`tier_form_field_policies`, `pm_template_field_links`) and personal assets (`organisation_branding`) don't carry a `display_id` either. **`process_template_document_signatories`** (the per-document signing record) **does** get a `display_id` (rule 16.2), consistent with `process_template_attachments`'s precedent.

## e) Testing decisions

- Unit tests (Vitest) for the new shared service (`processTemplateSignatoryService.js`) covering: requirement CRUD, slot assignment, sequential-turn enforcement (can't sign out of order), signing (with and without a saved signature), decline (reason required), full restart (new `signing_round`, history preserved), and the "is fully signed" lock-state computation.
- Component tests for the new `SignatoriesPanel.jsx` (mirrors the `DocumentAttachmentsPanel.test.jsx` shape: render states, upload flow, decline flow, disabled/locked state) — Platform and Simulator copies.
- Component tests for the PMO Admin requirement-configuration screen (add/reorder/remove slots, per-document-type scoping).
- Regression: re-run the full v863 + v867 test suites afterward to confirm no interference (same discipline used when v867 shipped alongside v863).
- RLS is **not** exercised by unit tests (mocked service) — same known gap that caused the v866/v866b/v866d/v866e debugging cycle on the attachments feature. This PRD explicitly commits to reusing the now-corrected `auth_user_can_access_project()` helper from the start, specifically to avoid repeating that mistake.
- Manual live-testing checklist (documented in the plan) walks through: configure requirement → assign slots → sign in order → attempt out-of-order sign (must fail) → decline → restart → complete signing → confirm lock → export and confirm signature block renders.

## f) Out of scope (for this version)

- **Database-level (RLS) enforcement of the read-only lock.** The 24 content tables' own write RLS is untouched — the lock is enforced in the UI (fields disabled, save/attachment controls hidden) but not at the database layer. Touching write RLS on 24 separate tables to add a "not fully signed" condition is a much larger, higher-risk change than this feature's scope justifies (rule 6/32: avoid large, unrelated-module changes). Flagged here explicitly rather than silently skipped, for the user to decide if a future hardening pass is warranted.
- Legal-grade e-signature compliance (identity verification, cryptographic signing, audit-trail certificates, e.g. DocuSign/Adobe Sign-equivalent guarantees). This is an internal sign-off tracking feature, not a legally-binding e-signature product.
- Signing by non-system-user external parties (e.g. an external client or auditor with no login) — the signatory pool is project team members only (decision 2).
- Configurable signing order (parallel vs sequential per document type) — sequential is the only mode for v1.
- Resuming a declined chain from the decline point instead of a full restart.
- Editing a role-slot's label/order on requirements that already have in-progress or completed signing rounds (existing rounds keep their original labels; only future documents pick up requirement edits).
- Any change to the Dynamic Form Engine (`form_templates`/`form_instances`) — this stays exclusively a `process_templates` feature (decision 1).

## g) Further notes

- This is a direct sequel to v867 (Process Template Document Attachments) and deliberately reuses its patterns: document-level linking via `pm_template_nodes.id`, the same shared-service-file placement discovery (`packages/shared/src/services/*` is the one import family not aliased away per-app — see v867's guide), the same SELECT-broad/WRITE-narrow RLS split, and the same export-embedding mechanism.
- The requirement-configuration screen for PMO Admin needs a UI home; the plan will determine whether this belongs alongside existing Organisational Templates settings or as a new settings page — this is an implementation detail to resolve during planning, not a product decision requiring further interview.
- `user_signature_images` being shared across Platform and Simulator (keyed by `auth_user_id`, not duplicated per schema) is a deliberate exception to the usual "public schema / sim schema are fully separate" rule, justified because a signature is an attribute of the human being, not of either application — this should be called out clearly in the plan's SQL comments so it isn't mistaken for an oversight later.
