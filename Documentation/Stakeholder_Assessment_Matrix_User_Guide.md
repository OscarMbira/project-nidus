# Stakeholder Assessment Matrix — User Guide

## Purpose

The **Stakeholder Assessment Matrix** (SEAM) records, per stakeholder and project:

- **Current (C)** engagement level — where they are today  
- **Desired (D)** engagement level — where the project needs them  

Levels use the five-point scale: **Unaware → Resistant → Neutral → Supportive → Leading**.

## Access

- **Platform:** Sidebar → **Stakeholders** → **Stakeholder Assessment Matrix**  
  Route: `/platform/stakeholders/assessment-matrix`
- **Simulator:** Practice Stakeholders → **Stakeholder Assessment Matrix**  
  Route: `/simulator/practice-stakeholders/assessment-matrix`  
  (Legacy `/seam` redirects here.)

## Create or update

1. Select a **project** (or practice project in the simulator).  
2. Click **Add Assessment**.  
3. Choose stakeholder, assessment date, **Current (C)** and **Desired (D)** levels, optional notes.  
4. Save — one active assessment exists per stakeholder per project (re-saving updates the same row).

## Views

- **Matrix** — SEAM grid with C/D markers; gap rows highlighted in amber.  
- **List** — sortable table, search, card/table toggle (preference saved in the browser).

## Delete

From **List** view, use **Delete** on a row (soft delete).

## Drafts (on hold)

- **Save as Draft** on the form, or use **On hold** from the page header.  
- Resume from the on-hold queue; drafts expire per organisation draft settings (default 14 days).

## Export

Use the export menu (Excel, Word, PowerPoint, CSV, XML, JSON, Print) from the page header or matrix toolbar.

## Database setup

Apply in Supabase SQL Editor (in order):

1. `SQL/v603_stakeholder_assessment_matrix.sql`  
2. `SQL/v604_stakeholder_assessment_matrix_menu.sql`

## Related features

- **Stakeholder Analysis** — power/interest and attitude (separate from SEAM levels).  
- **Engagement Planning** — engagement strategies and plans.
