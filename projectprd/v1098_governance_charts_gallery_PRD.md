# v1098 — Governance chart / image gallery upload

## a) Problem statement

Governance Structure Overview only had free text. Users need to attach governance org charts and related diagrams (images and PDF), with paste support, and remove files completely when discarded.

## b) Solution

Multi-file gallery under Overview: browse / drag / paste, optional captions, signed-URL preview, hard delete of storage + DB row. Cap 10 files, 5MB each.

## c) User stories

1. As a PM, I can upload up to 10 governance charts (PNG/JPEG/GIF/WEBP/SVG/PDF).
2. As a PM, I can paste a clipboard image into the drop zone.
3. As a PM, I can add an optional caption per file.
4. As a PM, I can preview images and open PDFs via signed URL.
5. As a PM, when I Delete a chart, the storage object and DB row are both removed.
6. Overview narrative text remains available beside the gallery.

## d) Implementation decisions

- Child table `project_governance_charts` + private bucket `governance-charts`
- Immediate upload on pick/paste/drop
- Path `{project_id}/{auth_user_id}/{uuid}.{ext}`
- Platform only (no Simulator Governance Structure page)
- No reorder in v1

## e) Testing

- Unit: validate mime/size, path detection, image/pdf helpers
- Manual: paste image, upload PDF, caption, Delete clears Storage

## f) Out of scope

Reorder UI, PDF editor, Simulator page, orphan GC cron

## g) Further notes

SQL: `SQL/v1098_governance_charts_storage.sql`
