# Work Authorisation System — User Guide

## Purpose

Use **Work Authorisations** to request, review, and record decisions for governed actions across the project lifecycle (stage gates, closure, intake, high-impact changes, and similar).

## Platform

- **List:** `/platform/work-authorisations`
- **Draft queue:** `/platform/work-authorisations/drafts`
- **New request:** `/platform/work-authorisations/new`

Save a **draft** at any time; open it later from **Work Authorisation Drafts** in the sidebar. Submit when ready; reviewers can **approve**, **reject**, **defer**, **suspend**, or **resume** per your organisation’s rules. After approval, mark **executed** then **closed** when work is done.

## Simulator (practice)

- **List:** `/simulator/pm/controls/work-authorisations`
- **Drafts:** `/simulator/pm/controls/work-authorisations/drafts`

Behaviour mirrors the Platform for practice projects.

## Permissions

Your project role must include the relevant codes, for example `work_authorisation.request`, `work_authorisation.approve`, and `work_authorisation.suspend`. Administrators configure these in role management.

## Lifecycle checks

Other features can require an approved authorisation before proceeding. Technical integration uses the database helpers `work_authorisation_has_approved_action` (Platform) and `work_authorisation_has_approved_action` (Simulator) with your chosen `action_type` value.
