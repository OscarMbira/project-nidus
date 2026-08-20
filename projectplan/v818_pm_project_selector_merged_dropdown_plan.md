# v818 — PM Project Selector: Merge Name/Code Toggle Into Dropdown

## Goal
Follow-up UX fix to the [[v817]] project selector. User flagged the dropdown + separate
"Name"/"Code" toggle buttons (`PMProjectSelector.jsx`) as reading like three disconnected
controls rather than one. User picked the "merged single dropdown" option: drop the toggle,
show both name and code together in every option.

## Change
- `apps/platform/src/components/pm/PMProjectSelector.jsx` and the byte-identical
  `apps/simulator/src/components/pm/PMProjectSelector.jsx` (parity, rule 34.1):
  - Removed the `displayMode` state, `readDisplayMode()`/`changeDisplayMode()` helpers, the
    `nidus_pm_project_selector_display_mode` localStorage key, and the two toggle buttons.
  - `labelFor(p)` now always renders `"{name} · {code} — {role}"` (falls back to name-only if
    a project has no code), so both are visible without switching modes.
  - Widened the `<select>` max-width (`16rem` → `24rem`) to fit the longer combined label.

## Follow-up: code search regression
User caught a real gap after the merge landed: a native `<select>`'s built-in "type to jump"
only matches the **start** of each option's text. Since the merged label is
`"Name · Code — Role"`, typing a project code no longer jumps anywhere — code search, which the
old toggle provided by flipping the primary field, was silently lost.

**Fix:** added a small filter `<input>` above the `<select>` in both
`apps/platform/src/components/pm/PMProjectSelector.jsx` and the Simulator copy. Typing filters
the option list by substring match against **either** `projectName` or `projectCode`
(case-insensitive). The currently-selected project is always pinned into the rendered options
even if it doesn't match the current filter text, so narrowing the list can never make the
`<select>` silently point at a different project than what's displayed.

## Follow-up: duplicate project entries in the dropdown
User then reported the `<select>` "showing 3 records" for an account that only has **one**
real project. Root cause: `CurrentProjectContext.jsx` (both apps) mapped every row returned by
`getUserProjectRoles()` straight into the selector's `projects` list with no de-duplication —
if the same user has more than one active `project_memberships` row on the same project
(duplicate invite, re-added with a second role, ...), each row became its own dropdown option
for what is visually the same project.

**Fix:** `apps/{platform,simulator}/src/context/CurrentProjectContext.jsx` now groups the
`getUserProjectRoles()` rows by `project_id` in a `Map` before building the `projects` list,
merging any distinct role names found for that project (joined with `" / "`) rather than
silently dropping the extra membership's role. `PMProjectSelector.jsx` itself needed no change —
it already just renders whatever `projects` the context gives it.

## Follow-up: closed select truncates the merged label
Turned out the account genuinely has 3 distinct projects (Velocity Freight, Compass Telecom,
Cedar Trust Schools) — not duplicates, so the de-dupe above was a correct no-op safeguard, not
the actual issue. The real bug: at `max-w-[24rem]` (384px), the merged `"Name · Code — Role"`
label (often 70+ characters) doesn't fit the **closed** `<select>` box, so it silently clips to
just the start of the project name — while the **open** dropdown list renders each `<option>`
at its own natural width (standard native-`<select>` behaviour across browsers), so the two
states showed different amounts of text and looked broken/inconsistent.

**Fix:** in both `apps/{platform,simulator}/src/components/pm/PMProjectSelector.jsx`:
- Widened the wrapping container from `max-w-[24rem]` to `max-w-[40rem]` (plus `min-w-0` so it
  can still shrink inside the flex-wrap header on narrow viewports) — fits the common case
  without text clipping.
- Added Tailwind's `truncate` to the `<select>` so on the rare label that's still too long, it
  clips with a `…` ellipsis instead of an abrupt hard cut.
- Added `title={labelFor(currentProject)}` so hovering the closed select shows the full label
  as a native tooltip regardless of available width.

## Follow-up: redesigned as a single searchable combobox
Even after the width/truncate fix, the user reported the filter box "still not helping to
search." Root cause of the *pattern*, not just sizing: a filter `<input>` sitting above a
native `<select>` never visibly reacts to typing until the user separately opens the (still
native, un-styleable) dropdown — from the user's point of view, typing appeared to do nothing.
This was exactly the tradeoff flagged when the two options were first presented; three rounds
of patching the two-control layout confirmed the simpler option wasn't enough here.

**Fix:** replaced the filter-input-plus-`<select>` pair with a single custom combobox in both
`apps/{platform,simulator}/src/components/pm/PMProjectSelector.jsx`:
- One `<input role="combobox">`. Closed, it displays the current project's full
  `"Name · Code — Role"` label. Focusing it clears the field and opens a live results list
  (`isOpen` state); typing filters that list on every keystroke by substring match against
  `projectName` or `projectCode`.
- Results render in an absolutely-positioned `<ul role="listbox">` directly under the field —
  visible immediately, no second control to open. Clicking a row calls `setCurrentProject` and
  closes the list.
- List items use `onMouseDown` + `preventDefault()` (not `onClick`) so the click registers
  before the input's `onBlur` would otherwise close the list first — the standard fix for this
  exact race in a manually-built combobox.
- The native `<select>`/`<option>` markup, the standalone filter `<input>`, and the
  "pin current project into the option list" logic from the previous iteration are all gone —
  this component owns its own filtering and selection now, so none of that was still needed.

## Todo
- [x] Platform: simplify `PMProjectSelector.jsx` (merge name/code label, drop toggle)
- [x] Simulator: mirror the same change (parity)
- [x] Confirm no other file references the removed localStorage key
- [x] Platform: de-dupe `projects` list by `project_id` in `CurrentProjectContext.jsx`
- [x] Simulator: mirror the de-dupe (parity) — confirmed byte-identical via `diff -B -w`
- [x] Platform: replace filter-input + `<select>` with a single searchable combobox
- [x] Simulator: mirror the combobox rewrite (parity) — confirmed byte-identical
- [x] Syntax-check all touched files (esbuild compile, no errors)
- [ ] Manual verification in browser: focusing the field shows all projects, typing narrows
      the list live, clicking a row switches the project, dark/light mode both readable

## Review
Went through two intermediate designs (toggle removal, then a separate filter input) before
landing on a single combobox — each prior step was a reasonable minimal patch for the problem
as understood at the time, but repeated user feedback ("still not helping to search") showed
the *pattern* itself (search box separate from the value it controls) was the actual issue, not
a sizing or matching-logic detail. Kept the component self-contained (no new dependency, no
external combobox library) since the interaction needed — filter, list, click-to-select,
click-away-to-close — is small enough to hand-roll without adding a package.

The filter/search text is intentionally local component state (not persisted to
`localStorage`) — it's a transient search aid, not a preference worth remembering across
visits.

**Left for the user:** exercise `/pm/dashboard` (Platform) and its Simulator equivalent —
confirm focusing the field opens the full project list, typing narrows it live, clicking a
row switches the current project and closes the list, and the field reads clearly in both
light and dark mode.
