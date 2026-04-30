# Testing & Diagnostics Centre — Admin Guide

1. **Apply SQL** in order: `v493_testing_centre_foundation.sql` through `v498_testing_centre_seed_data.sql` on Supabase (Postgres 15+).
2. **Create** private Storage bucket `testing-centre-evidence` (authenticated read/write for users with run permission).
3. **Assign** `testing_centre.*` permissions to appropriate roles in `role_permissions` (v493 inserts baseline grants).
4. **Retention:** optional scheduled job to call `cleanup_expired_evidence(retention_days)` (v497).

## Environment safety

The seed includes `production_readonly` — the runner and UI must respect `safe_mode_production` in `tc_settings` (see `testingCentreService` + future runner integration).
