# Module Documentation

Place `.md` documentation files for this module in this folder.

On every push to `master`, the CI/CD workflow automatically syncs all `.md` files here
to Supabase Storage at `documentation/simulator/<module-name>/`.

The live documentation page picks up changes immediately — no app redeploy needed.

## Adding a new guide
1. Create your `.md` file in this folder.
2. Insert a row in the `documentation_guides` table (or use the in-app editor at `/app/admin/documentation`).
3. Push to `master` — CI syncs the file to Storage automatically.
