# v820 — Public Homepage Header: Stop Nav/Action Text Wrapping

## Goal
On the public marketing homepage (`localhost:5173/`, Platform's `PlatformHeader.jsx`), the
"Become an Affiliate", "Request Demo", and "Sign Up" controls were wrapping onto two lines
each ("Become an" / "Affiliate", "Request" / "Demo", "Sign" / "Up") instead of sitting in one
row. User asked for the circled controls to render on one row by tightening the other header
links, rather than shrinking the browser or removing links.

## Root cause
The header's `<nav>` (7 links: Home, Features, Blog, Resources, Pricing, Documentation, Become
an Affiliate) used `gap-10` (40px) at 16px font, and the actions group (Request Demo, theme
toggle, Login, Sign Up) used `gap-3` with full-size buttons — combined intrinsic width exceeded
the `max-w-7xl` container's available space. None of the links/buttons had `whitespace-nowrap`,
so instead of the row overflowing, individual flex items shrank and their text wrapped onto a
second line (the default flex behaviour: a text node's min-content width is only as wide as its
longest word unless `whitespace-nowrap` forces the full-string width to be respected).

## Fix
`apps/platform/src/components/homepage/PlatformHeader.jsx` and `SimulatorHeader.jsx`, plus the
duplicated copies in `apps/simulator/src/components/homepage/` (both apps keep local copies of
these marketing headers per the cross-domain import ban, rule 46 — no shared import, so each
needed the same edit applied directly):
- Added `whitespace-nowrap` to every nav link/button and every action link/button, so text can
  never wrap onto a second line — the direct fix for the reported visual defect.
- Nav gap: `gap-10` → `gap-4 lg:gap-5` (24px). Nav font size: `16px` → `14px`.
- Actions gap: `gap-3` → `gap-2`. "Request Demo"/"Log in" padding: `px-4 py-2` → `px-3 py-1.5`.
- Login/Sign Up (`Sign Up`/`Signup`) `<Button>`: added `size="sm"` (Button's `sm` size is
  `h-8 px-3 text-sm`, vs the default `h-10 px-4 py-2`) for a more compact, still-legible button.

Combined, this frees roughly 250–300px of row width at the `max-w-7xl` breakpoint the user was
testing at (desktop, wide enough for the `md:flex` nav to show) — comfortably closing the gap
that caused wrapping, while `whitespace-nowrap` guarantees no individual item can wrap again
even if a future link is added.

## Explicitly out of scope
- Responsive behaviour below `md`/`lg` breakpoints (nav already hides under `md` via
  `hidden md:flex`) — not part of what was reported, and would need a hamburger/mobile-menu
  redesign rather than a spacing tweak.
- Reconciling the pre-existing content mismatch between the two apps' copies of these headers
  (`apps/platform`'s `SimulatorHeader.jsx` and `apps/simulator`'s `PlatformHeader.jsx` are both
  missing the "Become an Affiliate" link that their same-named sibling file has) — a real
  inconsistency, but unrelated to the wrapping bug reported here.

## Todo
- [x] `apps/platform/src/components/homepage/PlatformHeader.jsx`
- [x] `apps/platform/src/components/homepage/SimulatorHeader.jsx`
- [x] `apps/simulator/src/components/homepage/PlatformHeader.jsx`
- [x] `apps/simulator/src/components/homepage/SimulatorHeader.jsx`
- [x] Syntax-check all four files (esbuild compile, no errors)
- [ ] Manual verification in browser: confirm "Become an Affiliate", "Request Demo", and
      "Sign Up" each render on one line at normal desktop width, in both light and dark mode

## Review
Kept every existing link and button — no content was removed to make room, per the user's
"move other header-links to the left" framing (tighten spacing, don't cut links). Used
`whitespace-nowrap` as the actual fix for the visual defect (it directly prevents the wrap that
was reported); the gap/font/padding reductions are what make room for that guarantee to hold
without the row overflowing the container instead.

**Left for the user:** visual confirmation in the browser at the width they were testing at —
this session could not drive a browser to verify pixel widths directly.
