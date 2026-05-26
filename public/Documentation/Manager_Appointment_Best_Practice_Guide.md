# Manager Appointment — Best Practice Guide

## Purpose

Formal **manager appointments** (Project / Programme / Portfolio Manager) are governance acts, not casual team invites. The system stores a durable `manager_appointment_records` row linked to `project_invitations`, with separate fields for the appointer (PMO) and appointee (manager).

## PMO workflow

1. Open **People & Resources → Manager Assignments** (or **Appointment Tracker**).
2. Choose entity and manager; complete **Formal appointment terms** (dates, commitment %, reporting line, budget authority, constraints, message).
3. Submit **Send appointment** — creates invitation + appointment record and sends email.
4. Track status in **Appointment Tracker** (Pending / Active / Declined / Ended). Use **Remind** or **Withdraw** on pending rows.

## Appointee workflow

1. Open invitation link (or **My Appointments**).
2. Review **Appointment terms** (read-only).
3. Complete acceptance fields: availability, COI, capability acknowledgement, conditions, observations.
4. **Accept** runs `accept_manager_appointment` (updates record, invitation, and entity manager assignment).

## Decline

Decline uses a category (unavailable, skills mismatch, COI, overloaded, other) plus optional note. Runs `decline_manager_appointment`.

## Database (run in order)

- `SQL/v606_manager_appointment_records.sql`
- `SQL/v607_manager_appointment_accept_rpc.sql`
- `SQL/v608_manager_appointment_decline_rpc.sql`
- `SQL/v609_sim_manager_appointment_records.sql`
- `SQL/v614_appointment_tracker_menu.sql`

## Simulator

Use **Simulator → Appointment Tracker** and **My Appointments** with `sim.sim_manager_appointment_records` (practice data only).
