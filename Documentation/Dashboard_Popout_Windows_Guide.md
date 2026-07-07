# Dashboard Pop-out Windows Guide

**Version:** v753
**Date:** 2026-07-07

## Overview

Every page header across Platform and Simulator has a **Detach** button (the ⤢ icon next to Notifications). Clicking it opens the current page in its own separate browser window, without the header or sidebar — useful for keeping a dashboard visible on a second monitor while continuing other work, or while running a live simulation/test scenario.

## How it works

- The detached window is an **independent copy** of the page — it fetches its own data and does not stay live-synced with the original tab (e.g. filters selected in the original tab are not mirrored).
- It reuses your existing logged-in session automatically — no separate login is required.
- It applies to any page in either app, including all current and future dashboards — there is nothing to configure per page.
- Close the detached window like any other browser window when you're done.

## Where it's implemented

The Detach button (`@nidus/ui`'s `DetachButton`) is wired once into each app's shared header component (`SystemHeader.jsx`, used by both `PlatformAppHeader` and `SimulatorAppHeader`). Each app's `Layout.jsx` recognises a `?popout=1` query parameter on the URL and renders the page without header/sidebar/floating widgets when present — no new routes were added.

See also: the equivalent feature in the Admin app, `project-nidus-admin/projectplans/v20.0_dashboard_popout_windows_plan.md`.
