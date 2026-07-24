# v766 — PM Template Fields Domain (Phase 2)

**Status:** COMPLETE (MVP)
**Companion roadmap:** `v764_project_management_template_hierarchy_plan.md`
**Note:** SQL slot `v765` was used for Global sync RPC (Phase 1); this phase’s plan number is **v766**.

## Delivered
- [x] `packages/shared/src/services/pmTemplateNodeService.js`
- [x] PMO Field Templates list + detail in `pmo-module` (`/app/pmo/field-templates`)
- [x] Simulator parity in `sim-pmo-module` (`/simulator/pmo/field-templates`)
- [x] Shell wiring: `PmoFederatedOutlet` / `SimPmoFederatedOutlet` + bundled fallbacks
- [x] `Layout.jsx` `isPlatformApp` includes `/app/pmo`

## Follow-ups (not blocking)
- Rich field-link editor attaching LDE definitions with drag-reorder
- Portfolio/Programme/Project inline customisation panels on entity forms
