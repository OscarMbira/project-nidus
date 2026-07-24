# Simulator Collaborative Team Mode Guide

**Feature plan:** `projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md`
**Builds on:** `Simulator_5_Role_System_Guide.md` (individual role play, turns, scoring)

## What this is

Three real people — one playing Portfolio Manager, one Programme Manager, one Project Manager — practice the same scenario together, at the same time, instead of each training solo against AI. The AI still plays every *other* character (sponsor, team members, quality assurance, etc.) — it just no longer plays the two management roles a human isn't occupying.

This is the differentiator of the **Team** subscription tier. An individual Professional subscriber can play any of the three roles solo (Use Case 1 in the plan); Collaborative sessions require an active Team seat (Use Case 2's org licensing) specifically — see "Access requirements" below.

## Forming a session

1. Go to **Simulator → Collaborative → Lobby** (`/simulator/collaborative/lobby`).
2. Pick a scenario and select **Convene a session**. This creates a session in `forming` status — nobody is playing yet.
3. You land on the session's **Room** page (`/simulator/collaborative/session/:sessionId`), showing three role slots: Portfolio Manager, Programme Manager, Project Manager.
4. For each open role, the session creator has two choices:
   - **Claim it themselves** if they're playing too.
   - **Invite a teammate** — opens a picker listing your organisation's other Team seat holders who aren't already in this session. Pick one and send the invite; that role is now reserved for them specifically, and nobody else can claim it (they'll see "Reserved for a teammate" instead of a claim button).
   - Leave it open — any Team seat holder with the session link can then **claim it** themselves, first-come-first-served. This is still the default and still works exactly as before for roles nobody has specifically invited someone to.
5. An invited teammate sees **Accept** / **Decline** on their reserved role instead of a generic claim button. Declining reopens the role (to open-claim, or a fresh invite). The creator can also **cancel** a pending invite before it's accepted, which does the same thing.
6. Once all three roles are actually joined (accepted invites count; pending invites don't), the session creator sees a **Start session** button. All three roles must be filled — there's no "start with 2 of 3" option today.

## Playing

Once the creator starts the session, each participant independently clicks **Begin your scenario** on the Room page. This creates their own solo-style simulation run (same turn engine, same NPCs, same scoring as Use Case 1) — but tagged to the shared session.

Two things differ from solo play once you're in a collaborative run's turn view:

- **Fellow roles panel** — a compact card showing which turn the other two participants are currently on, or whether they've finished. Useful for pacing; nobody is forced to move in lockstep (see "Async, not lockstep" below).
- **"Waiting on you" panel** — appears when a fellow participant has escalated an issue to your role. Resolve it directly from this panel; you don't need to navigate to their run.

### Escalating an issue

If an event is beyond what your role can resolve, escalate it up the hierarchy: Project Manager → Programme Manager → Portfolio Manager. Portfolio Manager is the top of the chain and can't escalate further. Escalating doesn't remove the event from your own turn history — it makes it visible and actionable to the next role up, in addition.

### Async, not lockstep

Collaborative sessions do **not** require all three participants to be online at the same time. Each person advances their own turns at their own pace — there is no "waiting for everyone to act before the turn advances." Escalations queue for the target role's attention whenever they next check in, rather than blocking in real time. (This was a deliberate design decision — see the plan's Phase D — over a synchronous "everyone must be present" alternative, since scheduling three people to be online simultaneously is a real adoption barrier for a training tool.)

## Session completion and debrief

A session isn't complete until **all three** participants' individual runs finish. Once they do, the session automatically flips to `completed`, and a **Team Debrief** becomes available (`/simulator/collaborative/session/:sessionId/debrief`), showing:

- Each role's individual competency scores, same framework as solo play.
- A **team coordination score** (0–100) based on how many escalations were raised and resolved, and how quickly. A session where nobody escalated anything shows no score — there's nothing to measure, not a fabricated "perfect" or "neutral" number.
- The full escalation history for the session (who raised what, to whom, resolved or not).
- **PMO Collaborative Practice** certificate eligibility — requires a completed session with a coordination score of at least 70.

## Access requirements

Creating or joining a collaborative session requires an **active Team subscription seat** (see the Team Seats Guide) — not just any paid plan. A Free Trial user, or an individual Professional subscriber without a Team seat, will see an upgrade prompt instead of the lobby. This is enforced both in the UI and server-side (a claimed Team seat is checked before session creation and before any role claim goes through), so it can't be bypassed by calling the underlying API directly.

## Who you can invite

The teammate picker only shows people who hold a **claimed seat on the same Team subscription** as the session — resolved automatically from either the session itself (if it was created with a team subscription attached) or from your own claimed seat, whichever applies. You can't invite someone by typing an arbitrary email here — unlike Team seat invites, a collaborative session invite can only target someone who already has an account and an active seat, since the role reservation is tied to their real user ID, not an email address. If the person you want to invite doesn't have a Team seat yet, invite their seat first (Team Seats Guide), then invite them to the role once they've claimed it.

## Known limitations (not yet built)

- **Open-claim isn't scoped to "my team."** A role left open (not specifically invited) can be claimed by *any* Team seat holder who reaches the session link — not just seat holders on the same Team subscription as the session. Targeted invites are correctly scoped to your own team; open slots are not. If you want a role kept within your organisation, invite a specific teammate to it rather than leaving it open.
- **Escalation scoring is a first-pass heuristic**, not a fully tuned rubric. It measures resolution rate and response speed from timestamps; it does not yet assess *whether* an escalation was actually the right call (too early, too late, or should have been handled without escalating at all). That needs real scenario-content design, tracked separately from the mechanics.
- **All 3 roles required to start** — there's no "start with 2 filled, backfill the third later" option.
