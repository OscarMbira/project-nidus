# apps/site — Nidus brand site (v1241)

| Item | Value |
|---|---|
| Package | `@nidus/site-app` |
| Dev server | `pnpm turbo dev --filter=@nidus/site-app` → http://localhost:5177 |
| Build | `pnpm turbo build --filter=@nidus/site-app` (client build + SSR build + prerender) |
| Tests | `pnpm turbo test --filter=@nidus/site-app` |
| CI | `.github/workflows/app-site.yml` |
| Data | `public.site_products`, `public.site_content` (`SQL/v1241_*.sql`), edited in Admin → Public site products |

- The build **needs the v1241 SQL** in the target database. Without it, prerender stops with
  "relation public.site_products does not exist". That is intentional: no fallback content (rule 26).
- No sign-in, no Supabase client: data is read through the REST endpoint with the anon key.
- `?ref=<code>` is passed through to product links. The product's own landing page records the click.
- The Admin app is never listed.
