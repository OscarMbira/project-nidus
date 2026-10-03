# Team Change History (v1082)

## Purpose

Keep an append-only audit of team and team-member field changes (allocation %, dates, role,
skills, add/remove, team name/type/size/active/lead) and expose them on a dedicated history page.

## Where to look

| Surface | Path |
|--------|------|
| History page | `/platform/teams/:teamCode/allocation-history` |
| Entry point | Edit/View team → **Members** tab → **View allocation history** |
| Mandatory reason | Edit team → save (Details / Members / Roles) → **Change reason *** |

Simulator practice teams use the same pattern under the practice-teams routes when wired.

## Data

- `public.team_change_history` — triggers on `teams`, `team_members`
- `sim.team_change_history` — triggers on `practice_teams`, `practice_team_members`
- Optional reason: RPC `set_team_change_reason(p_reason text)` → pending row read by triggers.
  The Edit Team UI requires a non-empty reason for every save (all roles).

## Operator notes

- History starts from the moment the migration is applied; past edits are not backfilled.
- One save with several field changes produces **one** history row with a JSON `changes` array.
- No new sidebar menu leaf in v1082.
