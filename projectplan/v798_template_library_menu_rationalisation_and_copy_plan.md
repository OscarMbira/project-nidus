# v798 — Rationalise Platform/Simulator template menu + "Copy Global Template to customise"

**STATUS: 100% COMPLETE** (code + SQL ready to apply). Operator smoke after DB apply remains the final UI confirmation.

## Design decisions (confirmed by implement request)
- Templates section **alongside** `[S]/[P]/[A]` tracks (not replacing them)
- Library: **disable, don’t hide** non-matching methodology rows
- Reuse existing **Methodology Focus** selector
- One shared `allow_project_methodology_override` flag (broadened meaning/label)
- Client-side filters on one Library page (not ~9 menu rows per methodology)
- Classic field-templates list kept as fallback route

## Delivered

| Phase | Artifact |
|---|---|
| 0 | `SQL/v799_portfolio_programme_delivery_methodology.sql`; `entityDeliveryMethodologyService.js`; Portfolio/Programme form fields; Settings label |
| 1 | `TemplateLibraryPage.jsx` in `pmo-module` + `sim-pmo-module`; routes wired |
| 1b | `annotateTemplateRowsByMethodology` in `methodologyMenuUtils.js` (×4 copies) |
| 1c | `SQL/v801_template_library_seed_data.sql` |
| 2 | `pmTemplateCopyService.js` (fields / form_template / opa / level templates; process deferred) |
| 3 | `SQL/v800_template_library_menu.sql`; sidebar cache → `v7` |
| 4 | Unit tests (annotate, copy, entity resolver); `Documentation/Template_Library_Menu_And_Copy_Guide.md` |

## Todo
- [x] Confirm design decisions
- [x] Phase 0: delivery_methodology_track + resolver + edit UI + Settings copy
- [x] Phase 1: TemplateLibraryPage (Platform + Simulator)
- [x] Phase 1b: annotate + disabled-row rendering + scope strip
- [x] Phase 1c: seed SQL
- [x] Phase 2: pmTemplateCopyService
- [x] Phase 3: menu_items SQL
- [x] Phase 4: parity, tests, docs
- [ ] Manual smoke after SQL apply (Copy + Methodology Focus + Programme→Project chain)

## Review
**Completed 2026-07-22.**

### Apply
1. `SQL/v799_portfolio_programme_delivery_methodology.sql`
2. `SQL/v800_template_library_menu.sql`
3. `SQL/v801_template_library_seed_data.sql`
4. Hard-refresh Platform/Simulator → **Templates → Template Library**

### Follow-ups (explicitly out of scope)
- `process_template` domain copy
- Changing hide behaviour inside `[S]/[P]/[A]` operational tracks
- Per-tier override permission flags
