# Team Member Appointment — Best Practice Guide

## Purpose

Team-level invites (developer, analyst, team member, etc.) can include a formal **`team_member_appointment_records`** row with role title, responsibilities, skills, and working arrangement — linked to the same `project_invitations` email/token flow.

## Team Manager / PM workflow

1. **Team & Members → Send Role Invitation** (or project invite form).
2. Select a **team-level role** — the **Team assignment terms** panel appears.
3. Complete role title, dates, commitment %, reporting to, responsibilities, skills, arrangement, location, message.
4. Submit invite — creates invitation + team appointment record.

## Team member workflow

1. Open invitation link (or **My Assignment** under Team & Members).
2. Review **Assignment terms** (`TeamMemberTermsCard`).
3. Accept with availability, COI, skills acknowledgement, conditions, observations — via `accept_team_member_appointment`.

## Decline

Same categories as manager appointments; uses `decline_team_member_appointment`.

## Database (run after manager SQL)

- `SQL/v610_team_member_appointment_records.sql`
- `SQL/v611_team_member_appointment_accept_rpc.sql`
- `SQL/v612_team_member_appointment_decline_rpc.sql`
- `SQL/v613_sim_team_member_appointment_records.sql`

## Routes

- Team dashboard: `/platform/app/team-appointments`
- My assignments: `/platform/my-team-appointments`
