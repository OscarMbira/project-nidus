# PMIS Forms & Attributes Coverage - User Guide

## Overview

The PMIS Forms & Attributes module provides a dynamic form experience for process guide aligned project documentation.
Forms are grouped by process area and managed as project records with draft, review, approval, and archive states.

This guide explains how end users create, edit, submit, and track forms in Platform and Simulator contexts.

## Access Paths

- Platform PM route base: `/platform/projects/:projectId/forms`
- Simulator PM route base: `/simulator/pm/projects/:projectId/forms`
- Template administration: `/platform/admin/form-templates` (admin permission required)

## Process Group Form Coverage

Forms are available across six groups:

- Initiating
- Planning
- Executing
- Monitoring and Controlling
- Closing
- Agile

The implementation follows a 68-form catalog and supports filtered navigation by process group.

## Core User Flows

### 1) Browse Templates

1. Open the project Forms page.
2. Use the process group filters in the gallery.
3. Select a template to create a new form instance.

### 2) Create a New Form

1. Open the template.
2. Fill required fields and section details.
3. Save as draft.
4. Continue later from the Draft Queue.

### 3) Edit and Save Drafts

- Drafts can be reopened and updated.
- Autosave/save indicators show current persistence status.
- Repeating sections (table-like sections) support row add/remove.

### 4) Submit for Approval

1. Open a draft.
2. Select submit action.
3. Form status moves to `in_review`.

### 5) Approve or Reject

- Approvers can set decision as approved or rejected.
- Comments are recorded in approvals/comments history.
- Approved forms become read-only from normal edit flow.

## Built-in Calculations

The renderer supports key PM calculations:

- Risk score: `probability * impact`
- Three-point estimate: `(O + 4M + P) / 6`
- EVM metrics: SV, CV, SPI, CPI, EAC, ETC, VAC, TCPI
- Numeric shorthand input conversion, for example:
  - `10t` -> `10,000`
  - `3m` -> `3,000,000`

## Attachments, Comments, and Versioning

- Attachments are stored as form-scoped files.
- Comments are captured per form instance.
- Version snapshots are written to form history during updates.

## Role-Based Access

Visibility and action availability are controlled through permissions:

- `form.view`, `form.create`, `form.edit`, `form.approve`
- `form.view_all`
- `form_template.manage`, `form_template.create`, `form_template.approve`
- Domain-specific access keys for quality/procurement/cost use cases

## Export Options

Form pages support export menu actions for:

- PDF
- Word-compatible HTML
- CSV
- JSON

## Platform and Simulator Parity

This feature is implemented for both systems:

- Platform uses `public` schema data.
- Simulator uses `sim` schema data.
- Menu paths and route bases are domain-specific and isolated.

## Troubleshooting Quick Tips

- If a form is not visible, confirm role permissions.
- If data is missing, verify project context and selected route domain.
- If save fails, retry and verify form status is still editable.
- If approvals are unavailable, confirm approver-level permission.
