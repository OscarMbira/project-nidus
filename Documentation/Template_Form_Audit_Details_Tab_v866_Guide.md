# Template / Form Audit Details Tab (v866)

## Purpose

Every template and form **detail** surface shows a consistent **Details | Audit details** tab pair so users can see classification and history without technical UUIDs/table names.

## Shared UI

| Package | Components |
|---------|------------|
| `@nidus/ui` (monorepo) | `AuditField`, `AuditCard`, `AuditDetailsPanel`, `DetailAuditTabList` |
| `@nidus-admin/ui` | Same names (Admin-local copies) |
| `@nidus/shared/utils/auditDisplayUtils.js` | `formatAuditDate`, `humanizeAuditToken`, `resolveScopeReferenceLabel` |

**Never** render a Technical reference card (Internal ID / Content row ID / Storage table).

**Scope reference:** resolve to friendly labels (e.g. `project_code`) via `resolveScopeReferenceLabel`; fall back to UUID only if lookup fails.

Default tab: **Details**.

## Surfaces (v866)

| App | Page |
|-----|------|
| Platform / Simulator | `OrganisationalTemplateDetailPage` (process/project docs & org templates) |
| Platform / Simulator | `PmoFieldTemplateDetailPage` |
| Platform / Simulator | `FormTemplateBuilder` (view and edit) |
| Platform / Simulator | `FormView` — Audit cards + `FormAuditTimeline` footer |
| Admin | `GlobalTemplateLibraryDetail` |
| Admin | `GlobalTemplateLibraryForm` (view and edit) |

## Card inventory

1. **Identity** — display ID, status, version, current/origin as applicable  
2. **Classification** — tier/domain/methodology/scope (or form process group / project)  
3. **Record history** — created/updated by (resolved name when possible) and timestamps  
4. **Optional** — document content history / publish history when linked data exists  

## Rules

- Monorepo: `CLAUDE.md` rule **63**  
- Admin: `CLAUDE.md` rule **16**  

## Related

- PRD: `projectprd/v866_template_form_audit_details_tab_PRD.md`  
- Plan: `projectplan/v866_template_form_audit_details_tab_plan.md`  
