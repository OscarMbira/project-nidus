# Homepage reference copy (v1241, owner request)

Verbatim source of the Platform and Simulator homepages **before** the v1241 "Nidus family" bar
was added, kept for reference after launch.

- Source commit: `633d34e` (pushed 2026-10-11), also tagged `v1241-homepages-before`.
- Saved as `.jsx.txt` so they are never built, linted or imported.
- Files:
  - `platform_PlatformHomepage.jsx.txt`: `apps/platform/src/pages/PlatformHomepage.jsx` (served at `/` on the Platform)
  - `simulator_SimulatorHomepage.jsx.txt`: `apps/simulator/src/pages/SimulatorHomepage.jsx` (served at `/` on the Simulator)
  - `platform_SimulatorHomepage.jsx.txt`, `simulator_PlatformHomepage.jsx.txt`: the cross-app copies that exist in each app's `pages/` folder
- To view the old page live: `git checkout v1241-homepages-before` in a separate worktree and run the app.
- Screenshots (light/dark × desktop/mobile) for `Design Images/v1241_homepage_snapshots/` were not
  captured automatically (no browser automation in this repo). Take them from the tagged commit if needed.
