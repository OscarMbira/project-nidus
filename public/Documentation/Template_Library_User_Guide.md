# Template Library — User Guide

## Overview

The Template Library provides **master templates** (PMO-managed) and **project template copies** (tailored per project or per simulator run). Master templates are versioned automatically; each project copy maintains its own version history.

## Platform

- Browse published templates: **Template Library** → `/platform/templates`
- PMO manages drafts and publishing: **Manage templates** → `/platform/templates/manage`
- Create a **project copy** from a template detail page or **My project templates** → `/platform/templates/project-copies`
- **Update notifications** appear when a published master template is changed: `/platform/templates/notifications`

## Simulator

Same flows under `/simulator/templates`, with copies linked to **simulation runs** instead of platform projects.

## Database

Apply migrations in order:

1. `SQL/v406_template_library_tables.sql`
2. `SQL/v407_template_library_menu_seed.sql`

## Roles

- **PMO / system admin**: create, edit, publish, archive master templates; manage categories; bulk CSV import.
- **PM / team lead**: create and edit copies for projects they manage (see RLS in migration).
- **Other project members**: read copies for their project.
