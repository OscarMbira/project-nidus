# Simulator Team Seats Guide

**Feature plan:** `projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md`
**Audience:** the training coordinator / manager buying a Team subscription for their organisation, not individual learners.

## What a Team subscription is

Where a Professional subscription licenses one individual to practice any of the three roles (Portfolio, Programme, Project Manager) solo, a **Team** subscription licenses a fixed number of *seats* under one organisational purchase — by default 25, with additional seats available beyond that. Each seat, once claimed, behaves exactly like an individual Professional subscription for solo play, and additionally unlocks Collaborative sessions (see the Collaborative Team Mode Guide) for whoever holds it.

## Managing seats

Go to **Simulator → Team → Dashboard** (`/simulator/team/dashboard`). This page is only useful if you own a Team subscription — if you don't, it tells you to upgrade rather than showing an empty seat list.

- **Seat usage** — shown as "N of {limit} seats used" at the top.
- **Inviting a seat** — enter a colleague's email and select **Invite seat**. This sends them an email with a claim link. The invite is capped by your subscription's seat limit; once you've used all your seats, you'll need to revoke an unused one or upgrade your seat limit before inviting anyone else.
- **Seat status**:
  - *Invited* — sent, not yet claimed.
  - *Claimed* — the invited person has clicked the link and is now using the seat.
  - *Revoked* — you removed access. The email can be re-invited later if needed.
- **Revoking a seat** — click **Revoke** next to any non-revoked seat. This immediately cancels that person's simulator access (their synthesized subscription entitlement is cancelled at the same time, not just the seat record).

## Claiming an invite (for the invited person)

The invite email contains a **Claim your seat** link (`/simulator/team/claim?token=...`). Clicking it while logged in claims the seat immediately and grants full access. If you're not logged in yet, you'll be prompted to log in or create an account first, then returned to complete the claim.

Invites expire 14 days after being sent. An expired, unclaimed invite shows a clear error on the claim page — ask your team coordinator to re-invite you.

## What a claimed seat unlocks

Once claimed, a seat holder can:

- Play any of the three roles solo, with no scenario-count limit (unlike the Free Trial's 2-scenario cap).
- Create or join **Collaborative** sessions with other Team seat holders (their own org's seats, or any Team seat holder who has the session link — see the Collaborative Team Mode Guide's note on invite scope).

## Known limitations (not yet built)

- No visibility into *what* a seat holder has done beyond claim/revoke status — there's no per-seat "scenarios completed" or "current score" summary on the dashboard yet.
- No self-service seat-limit upgrade flow — increasing your seat limit beyond the plan's default requires going through the standard subscription change process, not a button on this page.
