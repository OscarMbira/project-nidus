# v794 — Rename "PMBOK" methodology track label to "Standards-Based" (Platform + Simulator)

## Why
Companion to Admin `v194_global_template_methodology_label_rename_plan.md` (project-nidus-admin). PMBOK is a PMI trademark, same risk category as "PRINCE2" (already renamed to "Structured" per CLAUDE rule 27). This closes the same gap in the Platform/Simulator PMO sidebar's `[S]/[P]/[A]` methodology tracks: **Structured** (PRINCE2) / **Standards-Based** (was PMBOK) / **Agile**.

Scope is **display label + comments only**. `METHODOLOGY_TRACK_IDS`, the `track: 'pmbok'` id, the `methodology` DB column values, and all `menu_code`s (`plat_sec_pmbok`, `sim_sec_pmbok`, etc.) are unchanged — renaming those would ripple into `resolveVisibleTracks`, `normalizeProjectDeliveryTrack`, `categoryMethodologyTrack`, and every DB row that keys off `menu_code`/`methodology`, none of which are user-visible.

## Todo
- [x] `config/methodologyMenuUtils.js` — `label`/`shortLabel` on the `pmbok` track def (4 physical copies: `apps/platform`, `apps/simulator`, `packages/config`, legacy `src/config`)
- [x] `components/ui/MethodologySwitcher.jsx` — `'PMBOK focus'` chip (4 copies: `packages/ui`, `apps/platform`, `apps/simulator`, legacy `src`)
- [x] `components/project/LifecycleControlsSection.jsx` — `<option>` text (3 copies: `apps/platform`, `apps/simulator`, legacy `src`)
- [x] `components/platform/OrganisationMethodologySettings.jsx` — dropdown option label (3 copies)
- [x] `components/processTemplates/ProcessTemplatesHub.jsx` — page description text + doc comment (3 copies)
- [x] `config/pmoLayoutMenuExclusions.js` comment (4 copies), `pages/forms/FormTemplateAdmin.jsx` comment (Platform only)
- [x] `SQL/v797_rename_pmbok_track_label_standards_based.sql` — `UPDATE public.menu_items SET menu_label = REPLACE(menu_label, 'PMBOK', 'Standards-Based') WHERE menu_label LIKE '%PMBOK%'`. Covers both `plat_*` and `sim_*` menu_codes (same table drives both apps). **Needs to be run against Supabase by the user** — not auto-applied. (Renumbered v795→v796→v797 twice mid-task: two other SQL files landed concurrently from a different in-progress session on this repo.)
- [x] `Documentation/Role_Menu_Structures.md` (+ `public/Documentation/` mirror) — legend, 7 section-divider headers, 2 permission-matrix rows
- [x] `Documentation/Methodology_Aware_Sidebar_Menu_Guide.md` and `Documentation/Process_Templates_Hub_Guide.md` (+ `public/Documentation/` mirrors)

## Not in scope
- The badge letter stays `P` (it identifies the `pmbok` track id, not the label wording — same treatment as leaving the enum value `pmbok` alone).
- `SQL/v759_form_template_field_seeds_expanded.sql` mention in `PMO_Form_Template_Builder_Guide.md` — describes historical seed-file content, not a UI label.
- Admin app — already done separately (v194).

## Review
Mid-edit, a PowerShell `-replace` pass on `Role_Menu_Structures.md` corrupted the file's Unicode (·, —, ═ dividers) via an encoding round-trip bug. Caught immediately via `git diff --stat` (677 of 1354 lines flagged, an obvious tell), restored the tracked copy with `git checkout --` and rebuilt the untracked `public/Documentation/` mirror by copying the restored file over it, then redid the rename with the Edit tool (which doesn't have this failure mode) instead of shell-level regex. No data was lost; verified via `git diff --stat` afterward (10 line-pairs changed, matching the intended edits exactly) and a manual `sed -n` spot-check of the affected lines.

All ~19 physical file copies verified via `grep -rc PMBOK` returning 0 in `apps/`, `packages/`, and legacy `src/`. Remaining "PMBOK" mentions in the tree are intentionally left (see Not in scope) or reference the technical enum value, not a UI label.
