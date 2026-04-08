# AI Documentation Index — Seed Guide (Phase 1.5)

The AI "docs" query path answers "how do I" and guide questions using chunked documentation stored in `ai_docs_index`.

## Step 1 — Run the SQL migration

In the **Supabase Dashboard** → **SQL Editor**, run the contents of:

- `SQL/v331_ai_docs_index.sql`

This creates the `ai_docs_index` table and RLS.

## Step 2 — Populate the docs index

### 2.1 Get your Supabase credentials

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Project Settings** (gear icon) → **API**.
3. Copy:
   - **Project URL** → you will use this as `SUPABASE_URL` (or you may already have it as `VITE_SUPABASE_URL`).
   - **Project API keys** → under "Project API keys", copy the **`service_role`** key (secret). This is `SUPABASE_SERVICE_ROLE_KEY`. Do not commit it or share it.

### 2.2 Set the environment variables

Create or edit a **`.env`** file in the **project root** (same folder as `package.json`). Add:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- Replace `SUPABASE_URL` with your actual Project URL from step 2.1.
- Replace `SUPABASE_SERVICE_ROLE_KEY` with your actual `service_role` key.
- If you already have `VITE_SUPABASE_URL` in `.env`, the script will use that when `SUPABASE_URL` is not set. You still must add `SUPABASE_SERVICE_ROLE_KEY` for the seed (the anon key cannot insert into `ai_docs_index` because of RLS).

**Important:** Add `.env` to `.gitignore` if it is not already there, so the service role key is never committed.

### 2.3 Run the seed command

From the project root in a terminal:

```bash
npm run seed:ai-docs
```

The script loads variables from `.env`, reads all `.md` files under `Documentation/`, chunks them, and upserts into `ai_docs_index`. You should see output listing each file and chunk count.

If you see "Missing env", double-check that `.env` exists in the project root and contains `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`.

## When to re-seed

- After adding new markdown files to `Documentation/`
- After editing existing guides (so the AI returns up-to-date excerpts)
