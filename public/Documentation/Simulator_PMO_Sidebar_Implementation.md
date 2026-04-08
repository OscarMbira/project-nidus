# Simulator PMO Sidebar and Features

**Date:** 2026-03-12  
**Related plan:** Same pattern as v219 Quality Module (Platform–Simulator parity).

## Goal

Bring PMO features and sidebar visibility to the Simulator so that when users are in simulator context (`/simulator/*`), they can open the Simulator PMO section from the main sidebar (same as Platform shows "PMO Admin" when on `/platform/*` or `/pmo/*`).

## What Was Already in Place

- **Simulator PMO routes and pages:** All `/simulator/pmo/*` routes and components (Dashboard, Governance, Initiation, Oversight, Procurement, Reporting, RFP CRUD) were already implemented.
- **SimulatorPMOLayout and SimulatorPMOSidebar:** Used when the user is already inside `/simulator/pmo/*` (shows the full PMO sub-menu from `simulatorPMOMenuConfig.js`).

## What Was Missing

1. **Main sidebar in simulator:** The main app Sidebar is driven by `menu_items` (DB). There were no menu items with `route_path` starting with `/simulator/pmo`, so when the user was on e.g. `/simulator/dashboard` or `/simulator/practice-projects`, the sidebar did not show a "PMO" entry to open the Simulator PMO Dashboard.
2. **simulatorMenuConfig:** No top-level "PMO" entry for consistency with other config consumers.
3. **Route:** `simulator/pmo/rfp/on-hold` was referenced in `simulatorPMOMenuConfig` but had no route in `App.jsx`.

## Changes Made

### 1. SQL: `SQL/v300_simulator_pmo_sidebar_menu.sql`

- Inserts **Simulator PMO** menu structure into `menu_items`:
  - Parent: `sim_pmo` – label "PMO", `route_path` = `/simulator/pmo/dashboard`, icon `shield`.
  - Children: PMO Dashboard, PMO Governance, Initiation & Business, Practice Oversight, Procurement, Reporting & Assurance (each with correct `route_path` to the existing simulator PMO pages).
- Grants access in `role_menu_items` to:
  - Roles that already have platform PMO menu access (`pmo_admin_section`, `pmo_oversight`, or `pmo_dashboard`).
  - Roles by name: `pmo_admin`, `PMO Admin`, `system_admin`, `System Admin`.

After running this migration, when the user is on any `/simulator/*` path, the main sidebar shows "PMO" (and its children) and links to the Simulator PMO Dashboard and sections.

### 2. Config: `src/config/simulatorMenuConfig.js`

- Added a top-level **PMO** entry with `path: '/simulator/pmo/dashboard'` and children aligned with the DB menu (Dashboard, Governance, Initiation, Oversight, Procurement, Reporting) so the simulator menu config matches the sidebar and any other consumers.

### 3. Route: `src/App.jsx`

- Added a route for **RFP Drafts (on-hold):**
  - `path="simulator/pmo/rfp/on-hold"`
  - Renders `SimulatorPMORFPOnHold` inside `SimulatorPMOLayout` and `ProtectedRoute requiredPlatform="simulator"`.

## How to Enable

1. Run the migration in Supabase (SQL Editor):
   - `SQL/v300_simulator_pmo_sidebar_menu.sql`
2. No frontend deploy change is required beyond the existing codebase; the new route and config are already in place.

## Result

- In simulator context, the main sidebar shows **PMO** with sub-items (Dashboard, Governance, Initiation, Oversight, Procurement, Reporting).
- Clicking **PMO** (or any sub-item) goes to the corresponding Simulator PMO page; the PMO sub-sidebar (`SimulatorPMOSidebar`) appears when inside `/simulator/pmo/*`.
- **RFP Drafts** from the PMO menu (`/simulator/pmo/rfp/on-hold`) now resolves to the correct page.

This aligns Simulator PMO with the Platform PMO pattern (sidebar entry + full feature set and routes).
