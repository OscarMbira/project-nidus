# One fix, every app: how Project Nidus consolidated its shared code

Project Nidus runs three products from one monorepo: the Platform, the Simulator and, soon, the
standalone Project Planner. They share their buttons, tables, forms, formatters and hooks through
common packages, so a fix should only ever be made once.

Until this release, that was not quite true. Each app quietly kept its own copy of the shared
components, and the build pointed at those copies. A fix had to be repeated three times, and a fix
made only in the shared package never reached users at all.

## What we changed

- Every app and module now reads shared code from one place.
- Changing a shared package automatically rebuilds and retests every app that uses it.
- A check in the build fails if a private copy ever creeps back.

## What users will notice

Mostly nothing, which is the point. A few fixes that had been written but never reached users are
now live:

- Checkpoint Report links open the right page again.
- The card/table view switch reads properly in light mode.
- The PMO sidebar shows Dashboard at the top level, without an empty "Executive Overview" group.
- Pages loaded as separate modules share the same theme and unsaved-changes protection as the rest
  of the app.

## Why it matters

The Project Planner is built from the same shared screens as the Platform. Consolidating first means
a fix to a planning screen will reach both products in the same release.
