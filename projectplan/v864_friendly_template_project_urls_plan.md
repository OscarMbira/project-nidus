# v864 — Friendly Project Key in Templates URLs — Plan

**Repo:** `E:\project-nidus`  
**PRD:** `projectprd/v864_friendly_template_project_urls_PRD.md`  
**Status:** Implemented.

---

## Goal

Replace UUID query params on PM Project / Organisational Templates with readable  
`/…/templates/{project|organisational}/<projectKey>[/<templateRef>]` URLs (Platform + Simulator).

---

## Todos

- [x] Route helpers + unit tests (`organisationalTemplateRoutes`, `projectRouteParam`)
- [x] Platform routes + `ProjectTemplatesEntry` / `OrganisationalTemplatesEntry` + legacy redirect
- [x] `OrganisationalTemplatesPage` path-based project key; stop writing entity query
- [x] Simulator parity (federated routes + entry pages + page sync)
- [x] Redirect callers (`ProcessTemplatesLandingRedirect`, `TemplateLibraryList`)
- [x] Manual smoke notes in Review

---

## Review

### Shipped
- Helpers: `parsePmTemplatesPath`, `buildPmTemplatesListPath`, `stripLegacyTemplateEntityParams`, `resolveProjectRouteKeyFromId`
- List: `/platform/templates/project/<project_code>` (and organisational equivalent)
- Detail: `/…/<project_code>/<templateRef>`
- Legacy `?entityType&entityId` → replace redirect to friendly path (filters preserved)
- Flat PMO `/app/pmo/organisational-templates` unchanged (no project segment)
- Simulator PM mounts updated the same way

### Tests
- `organisationalTemplateRoutes.test.js` — 14 passed

### Manual UAT
1. Open Project Templates → URL shows project code, not UUID.
2. Open a row → detail keeps project code + template ref.
3. Hit old `?entityId=<uuid>` bookmark → redirects once to friendly path.
4. Simulator PM Project Templates smoke.
5. PMO flat org list still has no project segment.
