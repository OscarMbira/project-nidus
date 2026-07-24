# v767 — PM Template Documents Domain (Phase 3)

**Status:** COMPLETE (schema linking MVP)
**SQL:** `SQL/v766_pm_template_document_links.sql`

## Delivered
- [x] Nullable `pm_template_node_id` on `form_templates`, `pmo_industry_templates`, `organisational_process_assets` (public + sim where present)
- [x] `process_template_node_links` join table (public + sim) instead of altering ~24 Process Templates Hub tables
- [x] RLS + `database_tables` registry

## Follow-ups
- UI breadcrumbs “Inherited from …” on existing copy wizards
- Wire `resolveEffectiveDocumentMaster` into ProjectOPACopy / IndustryPlanCopyWizard / form instance creation
