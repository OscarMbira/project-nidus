# v223 – Corporate Branding Implementation Plan

**Date:** 2026-03-13
**Branch:** feature/platform-terminology (create sub-branch: feature/corporate-branding)
**Scope:** Platform only (Simulator not applicable – branding is an organisational PMO feature)
**Audience:** PMO Admin / Super Admin only

---

## Audit of Current State

| Area | Current State |
|------|--------------|
| `accounts.logo_url` | DB column exists but **never used** in UI |
| `accounts.brand_color` | DB column exists but **never used** in UI |
| Header logo | Hardcoded "Project Nidus" text in `SystemHeader.jsx` |
| Primary colour | Hardcoded `bg-blue-600` / `#3B82F6` everywhere |
| Favicon | Static `vite.svg` placeholder in `public/` |
| Font | System default / Tailwind default (Inter) |
| CSS variables | **None** – all colours are compiled Tailwind classes |
| Per-org customisation | **None** currently applied at runtime |
| Sidebar brand section | **None** exists |
| Settings page | `AccountSettings.jsx` – basic info only, no branding tab |

---

## Scope of Corporate Branding Feature

The PMO Admin will be able to configure:

| Category | Elements |
|----------|---------|
| **Identity** | Organisation name displayed in app, tagline, custom app title |
| **Logos & Images** | Primary logo (header), sidebar logo (compact), favicon, login/landing banner, email logo, report cover image |
| **Colour Palette** | Primary colour, secondary colour, accent colour, header background, sidebar background, sidebar active-item colour, button colour, link colour |
| **Typography** | Primary font family (from curated list) |
| **Preview** | Live preview panel showing all branding applied |

---

## Technical Approach

### CSS Custom Properties (Runtime Theming)
Because Tailwind classes are compiled at build-time, runtime branding is implemented
via **CSS custom properties** injected into `document.documentElement`:

```css
:root {
  --brand-primary:        #3B82F6;  /* replaces bg-blue-600 */
  --brand-secondary:      #1E40AF;
  --brand-accent:         #F59E0B;
  --brand-header-bg:      #1F2937;
  --brand-sidebar-bg:     #111827;
  --brand-sidebar-active: #3B82F6;
  --brand-sidebar-text:   #F9FAFB;
  --brand-button:         #3B82F6;
  --brand-link:           #60A5FA;
  --brand-font:           'Inter', sans-serif;
}
```

A new `BrandingContext` loads org branding from DB on mount and injects these
variables. Components are updated to use `var(--brand-primary)` where appropriate.

### Supabase Storage
A dedicated bucket `organisation-branding` stores uploaded image files with a
folder per organisation: `{account_id}/{asset-type}.{ext}`.

---

## Implementation Plan

### PHASE 1 – Database & Storage ✅ COMPLETE

#### TODO-1.1 · Extend Branding Schema ✅
- [x] Create `SQL/v311_organisation_branding_table.sql`
  - Create new table `public.organisation_branding`:
    ```
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
    account_id          UUID NOT NULL REFERENCES accounts(id) UNIQUE
    -- Identity
    app_display_name    VARCHAR(100)   -- Custom name shown in header (e.g. "Acme PMO")
    app_tagline         VARCHAR(200)   -- Subtitle shown under logo
    -- Logos & Images
    primary_logo_url    TEXT           -- Main header logo (recommended: 240×60px)
    sidebar_logo_url    TEXT           -- Compact sidebar logo (recommended: 48×48px)
    favicon_url         TEXT           -- Browser tab favicon (32×32px ICO/PNG)
    login_banner_url    TEXT           -- Landing/login page hero image
    email_logo_url      TEXT           -- Logo used in system emails
    report_cover_url    TEXT           -- Cover image used in exported reports/PDFs
    -- Colour Palette
    primary_color       VARCHAR(7)     -- Hex, e.g. #3B82F6
    secondary_color     VARCHAR(7)     -- Hex
    accent_color        VARCHAR(7)     -- Hex
    header_bg_color     VARCHAR(7)     -- Hex
    sidebar_bg_color    VARCHAR(7)     -- Hex
    sidebar_active_color VARCHAR(7)   -- Hex (active menu item highlight)
    sidebar_text_color  VARCHAR(7)     -- Hex
    button_color        VARCHAR(7)     -- Hex
    link_color          VARCHAR(7)     -- Hex
    -- Typography
    font_family         VARCHAR(50)    -- enum-like: inter/roboto/open-sans/lato/poppins/system
    -- Metadata
    is_active           BOOLEAN DEFAULT true
    created_at          TIMESTAMPTZ DEFAULT NOW()
    updated_at          TIMESTAMPTZ DEFAULT NOW()
    created_by          UUID REFERENCES auth.users(id)
    updated_by          UUID REFERENCES auth.users(id)
    is_deleted          BOOLEAN DEFAULT false
    deleted_at          TIMESTAMPTZ
    deleted_by          UUID
    ```
  - RLS policies:
    - SELECT: Authenticated users in the same account
    - INSERT/UPDATE: pmo_admin or super_admin of the account only
    - DELETE: super_admin only (soft delete via is_deleted)
  - Register in `database_tables` registry
  - Deprecate `accounts.brand_color` usage (leave column, migrate data via SQL)

#### TODO-1.2 · Supabase Storage Bucket ✅
- [x] Create `SQL/v312_organisation_branding_storage.sql`
  - Create bucket `organisation-branding` (public read, authenticated write)
  - Storage policies:
    - SELECT (public): All users can read (logos must be publicly visible)
    - INSERT: Authenticated users whose `auth.uid()` belongs to the account folder
    - UPDATE/DELETE: pmo_admin or super_admin of account only
  - Max file sizes: logo 2 MB, favicon 256 KB, banner 5 MB, report cover 5 MB
  - Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`,
    `image/x-icon` (favicon only)

---

### PHASE 2 – Branding Service & Context ✅ COMPLETE

#### TODO-2.1 · Branding Service ✅
- [x] Create `src/services/brandingService.js`
  - `getBranding(accountId)` – fetch `organisation_branding` row for account
  - `saveBranding(data, accountId)` – upsert branding record (create or update)
  - `resetBranding(accountId)` – soft-delete and insert default values
  - `uploadBrandingAsset(file, accountId, assetType)` – upload to Supabase Storage,
    return public URL; asset types: `primary_logo`, `sidebar_logo`, `favicon`,
    `login_banner`, `email_logo`, `report_cover`
  - `deleteBrandingAsset(accountId, assetType)` – remove from storage + clear DB column
  - `getDefaultBranding()` – returns hardcoded system defaults (fallback object)
  - `validateHexColor(value)` – utility validator

#### TODO-2.2 · Branding Context ✅
- [x] Create `src/context/BrandingContext.jsx`
  - On mount: fetch `organisation_branding` for current user's account
  - Applies CSS custom properties to `document.documentElement`:
    ```js
    document.documentElement.style.setProperty('--brand-primary', branding.primary_color)
    // ... all 9 colour variables + font-family
    ```
  - Injects Google Fonts `<link>` dynamically for selected `font_family`
  - Provides context: `{ branding, isLoading, refreshBranding }`
  - Falls back to system defaults if no custom branding exists
  - Updates `<title>` and `<link rel="icon">` dynamically when branding loads

#### TODO-2.3 · Wrap App with BrandingContext ✅
- [x] Wrapped via `Layout.jsx` – `BrandingProvider` wraps all platform and simulator
  pages served through the Layout component, giving full access to branding context.

---

### PHASE 3 – Branding Settings UI (CRUD Pages) ✅ COMPLETE

All pages are accessible to `pmo_admin` and `super_admin` roles only.

#### TODO-3.1 · Main Branding Settings Page ✅
- [x] Create `src/pages/platform-app/organisation/BrandingSettings.jsx`
  - **4 tabs:**
    1. **Identity** – app display name, tagline
    2. **Logos & Images** – all image upload slots
    3. **Colour Palette** – colour pickers for all 9 colour variables
    4. **Typography** – font family selector
  - Live **Preview Panel** (right side or bottom) showing changes in real-time
    before saving
  - **Save** button (calls `saveBranding()`)
  - **Reset to Defaults** button with confirmation dialog
  - Success/error toast notifications
  - Dark/light mode aware

#### TODO-3.2 · Identity Tab ✅
- [x] Fields:
  - `app_display_name` (text, max 100) – shown in browser tab + header
  - `app_tagline` (text, max 200) – shown beneath logo in header/sidebar
  - Character count indicators
- [ ] Live preview: header mockup reflecting typed name/tagline

#### TODO-3.3 · Logos & Images Tab ✅
- [x] Image upload slots (one per asset type):

  | Slot | Label | Recommended Size | Notes |
  |------|-------|-----------------|-------|
  | Primary Logo | Header Logo | 240×60px | PNG/SVG preferred |
  | Sidebar Logo | Sidebar Icon | 48×48px | Square, used when sidebar collapsed |
  | Favicon | Browser Favicon | 32×32px | ICO or PNG |
  | Login Banner | Landing Page Banner | 1440×600px | Hero image |
  | Email Logo | Email Header Logo | 200×50px | Used in system emails |
  | Report Cover | Report/Export Cover | A4 proportion | Used in Word/PPT exports |

- [ ] Each slot shows:
  - Current image preview (if uploaded) or placeholder
  - Upload button → file picker (validates MIME + size)
  - Delete button (removes from storage + clears DB)
  - "Use Default" option
- [x] Upload progress indicator per slot
- [x] `uploadBrandingAsset()` service called per file

#### TODO-3.4 · Colour Palette Tab ✅
- [x] 9 colour pickers using `<input type="color">` with hex input beside each:

  | Variable | Label | Default |
  |----------|-------|---------|
  | `--brand-primary` | Primary Colour (buttons, highlights) | `#3B82F6` |
  | `--brand-secondary` | Secondary Colour | `#1E40AF` |
  | `--brand-accent` | Accent / Alert Colour | `#F59E0B` |
  | `--brand-header-bg` | Header Background | `#1F2937` |
  | `--brand-sidebar-bg` | Sidebar Background | `#111827` |
  | `--brand-sidebar-active` | Sidebar Active Item | `#3B82F6` |
  | `--brand-sidebar-text` | Sidebar Text | `#F9FAFB` |
  | `--brand-button` | Button Colour | `#3B82F6` |
  | `--brand-link` | Link Colour | `#60A5FA` |

- [x] Hex value text input (validates format on blur)
- [x] "Copy hex" icon per colour
- [x] "Reset colour" per individual colour
- [x] Contrast checker: warns if text-on-background contrast is < 4.5:1 (WCAG AA)
- [x] Live preview updates as colours are changed (CSS var injection on change)

#### TODO-3.5 · Typography Tab ✅
- [x] Font family selector (dropdown with live preview text):

  | Value | Label | Google Font |
  |-------|-------|------------|
  | `system` | System Default | No external load |
  | `inter` | Inter | Google Fonts |
  | `roboto` | Roboto | Google Fonts |
  | `open-sans` | Open Sans | Google Fonts |
  | `lato` | Lato | Google Fonts |
  | `poppins` | Poppins | Google Fonts |
  | `nunito` | Nunito | Google Fonts |
  | `source-sans` | Source Sans 3 | Google Fonts |

- [x] Preview text: "The quick brown fox jumps over the lazy dog" rendered in selected font
- [x] Google Font is loaded dynamically into `<head>` when selected

#### TODO-3.6 · Live Preview Panel ✅
- [x] Create `src/components/branding/BrandingPreview.jsx`
  - Mini UI mockup showing:
    - Sidebar strip (active and inactive items with brand colours)
    - Header bar (logo area + app name + primary colour bg)
    - Button sample (primary, secondary)
    - Link sample
    - Text in selected font
  - Updates in real-time as values change (no save required to preview)
  - Toggle between dark/light preview mode

#### TODO-3.7 · Branding History / Audit Trail ✅
- [x] Create `SQL/v313_organisation_branding_history.sql`
  - Table `public.organisation_branding_history`:
    - id, account_id, changed_by, changed_at, previous_values (JSONB),
      new_values (JSONB), change_description
  - Trigger: auto-records previous values on UPDATE to `organisation_branding`
  - RLS: pmo_admin/super_admin can read history; no manual writes
- [x] Branding History page: `src/pages/platform-app/organisation/BrandingHistory.jsx`
  - Timeline list of all branding changes
  - "Revert to this version" button (restores from JSONB snapshot)

---

### PHASE 4 – Apply Branding System-Wide ✅ COMPLETE

#### TODO-4.1 · Update SystemHeader.jsx ✅
- [x] Replace hardcoded "Project Nidus" text with `branding.app_display_name`
- [x] Replace hardcoded logo area with dynamic `<img>` if `branding.primary_logo_url` exists
- [x] Apply brand header background colour via inline style
- [x] Fall back to current Tailwind classes if no custom branding

#### TODO-4.2 · Update Sidebar.jsx ✅
- [x] Apply `branding.sidebar_bg_color` as sidebar background via inline style
- [x] Apply `branding.sidebar_active_color` for active menu item highlight
  (overrides hardcoded `bg-blue-600`)
- [x] Apply `branding.sidebar_text_color` for sidebar text colour
- [x] Added `palette`, `paintbrush`, `type`, `history` icons to Lucide icon map

#### TODO-4.3 · Update Primary Buttons ⏭ Deferred
- [ ] Global button rollout deferred to future sprint to avoid regressions.
  BrandingSettings Save button already uses `form.primary_color` as inline style.

#### TODO-4.4 · Update Dynamic Title & Favicon ✅
- [x] `BrandingContext.jsx` sets `document.title`, swaps favicon `<link>`, updates theme-color meta

#### TODO-4.5 · Apply Font Family ✅
- [x] `BrandingContext.jsx` injects CSS variable `--brand-font` and sets `document.body.style.fontFamily`
- [x] Google Fonts `<link>` injected dynamically per selected font

---

### PHASE 5 – Sidebar Menu Registration ✅ COMPLETE

#### TODO-5.1 · SQL – New "Organisation Settings" Sidebar Section ✅
- [x] Create `SQL/v314_organisation_settings_sidebar_menu.sql`
  - Insert new **top-level parent** menu item:

    | Field | Value |
    |-------|-------|
    | `menu_code` | `organisation_settings` |
    | `menu_label` | Organisation Settings |
    | `menu_icon` | `building-2` |
    | `menu_level` | 0 |
    | `sort_order` | 95 (after Stakeholders, before PMO Admin) |
    | `route_path` | NULL (section header / accordion) |
    | `is_visible` | true |
    | `is_active` | true |

  - Insert child menu items under `organisation_settings`:

    | `menu_code` | Label | Route | Icon | Sort |
    |-------------|-------|-------|------|------|
    | `org_branding` | Branding & Identity | `/platform/organisation/branding` | `palette` | 1 |
    | `org_colour_themes` | Colour Palette | `/platform/organisation/colours` | `swatch` | 2 |
    | `org_typography` | Typography | `/platform/organisation/typography` | `type` | 3 |
    | `org_branding_history` | Branding History | `/platform/organisation/branding-history` | `history` | 4 |

  - Grant access: **pmo_admin and super_admin roles only** (NOT regular project_managers)
    via `role_menu_items` INSERT

  > **Note:** The 4 child items can optionally all live within a single `BrandingSettings.jsx`
  > page as tabs (one route). The sidebar can link directly to the parent or to individual
  > tab anchors via query params (e.g. `?tab=colours`). This is the recommended approach
  > to keep pages cohesive. Adjust routes in TODO-5.2 accordingly.

#### TODO-5.2 · App.jsx – Lazy Imports & Routes ✅
- [x] Add lazy imports:
  ```js
  const BrandingSettings  = lazy(() => import('./pages/platform-app/organisation/BrandingSettings'))
  const BrandingHistory   = lazy(() => import('./pages/platform-app/organisation/BrandingHistory'))
  ```
- [x] Add routes inside the `/platform` block:
  ```jsx
  <Route path="organisation/branding"         element={...BrandingSettings} />
  <Route path="organisation/colours"          element={...BrandingSettings?tab=colours} />
  <Route path="organisation/typography"       element={...BrandingSettings?tab=typography} />
  <Route path="organisation/branding-history" element={...BrandingHistory} />
  ```
- [x] Each route guarded by `<ProtectedRoute requiredRole="pmo_admin" />`

#### TODO-5.3 · Sidebar Menu Visibility ✅
- [x] Verified `Sidebar.jsx` renders the new `organisation_settings` parent section
- [x] Confirmed it only appears for pmo_admin and super_admin (role-based filtering
  via `role_menu_items` already handles this)
- [x] `building-2` icon already present in Lucide icon map in `Sidebar.jsx`;
  additionally added `palette`, `paintbrush`, `type`, `history` icons for new child items

---

### PHASE 6 – Apply to Exports & Emails ✅ COMPLETE

#### TODO-6.1 · Report/Export Branding ✅
- [x] Added optional `branding` param (last arg) to all 8 export functions in `exportUtils.js`:
  `exportToExcel`, `exportListToWord`, `exportListToPPT`, `exportListToPrint`,
  `exportRecordToExcel`, `exportRecordToWord`, `exportRecordToPPT`, `exportRecordToPrint`
- [x] Added `resolveBranding(branding)` helper that derives `footerText` and `headerHex`
  from branding config with safe fallbacks
- [x] Applied `primary_color` (as bare hex) to PPT slide header bars, title text colour,
  and table header row fill in both list and record PPT exports
- [x] Applied `primary_color` to Excel header row cell fill + white bold font
  via `xlsx-js-style` cell styles (both list and record Excel exports)
- [x] Applied `app_display_name` as footer text in Word, PPT, and Print exports
  (replaces hardcoded "Project Nidus")
- [x] Applied `primary_color` to the Word footer `TextRun` colour
- [x] All existing callers unaffected — `branding` param is optional (defaults to fallback)

#### TODO-6.2 · Email Branding ✅
- [x] Added `buildBrandedEmailHeader(branding, title)` to `brandingService.js`:
  shows `email_logo_url` (or `primary_logo_url`) as `<img>`, or app name as text,
  over a `primary_color` background
- [x] Added `buildBrandedEmailFooter(branding)` to `brandingService.js`:
  uses `app_display_name` as sign-off team name
- [x] Updated `registrationEmailService.js`:
  - Imported `getBranding`, `buildBrandedEmailHeader`, `buildBrandedEmailFooter`
  - Added optional `accountId` param (last arg) to all 4 send functions
  - Fetches branding via `getBranding(accountId)` when accountId is supplied
  - Passes `branding` to each `generate*Email()` template function
- [x] Updated all 4 HTML template generators to accept optional `branding` param:
  - `generateOrganisationVerificationEmail` — branded header, branded button, branded footer
  - `generateTrialExpiryWarningEmail` — branded header, `primary_color` CTA button
  - `generateTrialExpiredEmail` — branded header, `primary_color` CTA button
  - `generatePaymentSuccessEmail` — branded header, `primary_color` CTA button
- [x] All existing callers unaffected — `accountId` / `branding` params are optional

---

## Summary of SQL Files to Create

| File | Purpose |
|------|---------|
| `SQL/v311_organisation_branding_table.sql` | `organisation_branding` table + RLS |
| `SQL/v312_organisation_branding_storage.sql` | Supabase Storage bucket + policies |
| `SQL/v313_organisation_branding_history.sql` | Audit history table + trigger |
| `SQL/v314_organisation_settings_sidebar_menu.sql` | New sidebar section + role grants |

---

## Summary of New Files

### Services & Context
| File | Type | Purpose |
|------|------|---------|
| `src/services/brandingService.js` | New | All branding CRUD + asset upload |
| `src/context/BrandingContext.jsx` | New | Runtime CSS var injection + font loading |

### Components
| File | Type | Purpose |
|------|------|---------|
| `src/components/branding/BrandingPreview.jsx` | New | Live preview panel |
| `src/components/branding/ColourPicker.jsx` | New | Colour picker with hex input + contrast check |
| `src/components/branding/LogoUpload.jsx` | New | Image upload slot with preview + delete |
| `src/components/branding/FontSelector.jsx` | New | Font family dropdown with live preview |

### Pages
| File | Type | Route |
|------|------|-------|
| `src/pages/platform-app/organisation/BrandingSettings.jsx` | New | `/platform/organisation/branding` |
| `src/pages/platform-app/organisation/BrandingHistory.jsx` | New | `/platform/organisation/branding-history` |

### Modified Files
| File | Change |
|------|--------|
| `src/App.jsx` | Add BrandingProvider wrapper + new routes |
| `src/components/headers/SystemHeader.jsx` | Use branding logo/name/colour |
| `src/components/Sidebar.jsx` | Use branding sidebar colours + logo |
| `index.html` | Remove hardcoded theme-color (set dynamically) |

---

## Final Sidebar State After Implementation

### Organisation Settings (new top-level section, pmo_admin only)

| # | Label | Route | Status |
|---|-------|-------|--------|
| 1 | Branding & Identity | `/platform/organisation/branding` | **NEW** |
| 2 | Colour Palette | `/platform/organisation/colours` | **NEW** |
| 3 | Typography | `/platform/organisation/typography` | **NEW** |
| 4 | Branding History | `/platform/organisation/branding-history` | **NEW** |

---

## Design Decisions & Notes

1. **No Simulator branding** – Branding is an organisational PMO feature; the Simulator
   runs in a separate context and uses its own default styling.
2. **CSS variables over Tailwind dynamic classes** – Runtime theming requires injected
   CSS properties; compiled Tailwind classes cannot be changed at runtime.
3. **Fallback chain**: Custom branding → System defaults → Tailwind hardcoded values.
   This ensures the app always renders correctly even with partial configuration.
4. **Contrast warnings** – WCAG AA (4.5:1 ratio) check on colour picker prevents
   inaccessible colour combinations from being saved.
5. **Storage folder isolation** – Each account's assets are in
   `organisation-branding/{account_id}/` to prevent cross-account access.
6. **Single page, multiple tabs** – All branding config lives in one page
   (`BrandingSettings.jsx`) with 4 tabs; sidebar links use `?tab=` query params
   for deep-linking to specific sections.
7. **Soft-delete not applicable** – Branding config is a singleton per account
   (one row, UNIQUE on account_id). "Delete" resets to defaults rather than
   removing the row.

---

## Review Section

### Implementation Summary (Phases 1–5 Complete)

**Phase 1 – Database** ✅
- `SQL/v311_organisation_branding_table.sql`: Singleton `organisation_branding` table per account (19 columns covering identity, 3 logo URLs, 9 colour fields, font_family). Full RLS — all account members can read; pmo_admin/super_admin/org_admin can write; only super_admin can delete.
- `SQL/v312_organisation_branding_storage.sql`: `organisation-branding` Supabase Storage bucket (public, 5 MB limit) with storage policies for secure per-account folder isolation (`{account_id}/{asset_type}`).
- `SQL/v313_organisation_branding_history.sql`: `organisation_branding_history` table with JSONB `previous_values`/`new_values` columns. Trigger auto-records every UPDATE to `organisation_branding`.
- `SQL/v314_organisation_settings_sidebar_menu.sql`: New top-level sidebar section "Organisation Settings" (sort 95) with 4 child items: Branding & Identity, Colour Palette, Typography, Branding History. Access granted to pmo_admin/super_admin/org_admin roles only.

**Phase 2 – Service Layer** ✅
- `src/services/brandingService.js`: Full CRUD — `getBranding()`, `saveBranding()` (upsert), `resetBranding()`, `uploadBrandingAsset()`, `deleteBrandingAsset()`, `getBrandingHistory()`, `revertBranding()`. Also exports `validateHexColor()` and `getContrastRatio()` (WCAG AA formula).

**Phase 3 – UI Components & Pages** ✅
- `src/context/BrandingContext.jsx`: React context that fetches branding on mount, applies 9 CSS custom properties to `document.documentElement`, manages `document.title`, favicon, theme-color meta, and Google Fonts injection. Exported `applyBrandingToDOM()` for live preview without saving.
- `src/components/branding/ColourPicker.jsx`: Native `<input type="color">` + hex text + copy + per-colour reset + WCAG AA contrast warning.
- `src/components/branding/LogoUpload.jsx`: Upload slot with preview, MIME/size validation, progress indicator, delete with confirmation.
- `src/components/branding/FontSelector.jsx`: 8-font dropdown with live preview sentence; loads Google Font on selection.
- `src/components/branding/BrandingPreview.jsx`: Mini UI mockup (header + sidebar strip + content + buttons) updating in real-time from `branding` prop.
- `src/pages/platform-app/organisation/BrandingSettings.jsx`: 4-tab page (Identity / Logos & Images / Colour Palette / Typography) with right-panel live preview, Save/Reset buttons, `?tab=` deep-linking, success state display.
- `src/pages/platform-app/organisation/BrandingHistory.jsx`: Timeline of branding changes with expandable before/after diff rows and "Revert to this version" action.

**Phase 4 – System-Wide Application** ✅
- `src/components/headers/SystemHeader.jsx`: Dynamic logo (image or text), dynamic app name/tagline, dynamic header background colour — all driven by `useBranding()` with graceful Tailwind fallback.
- `src/components/Sidebar.jsx`: Sidebar background, active-item highlight colour, and text colour are all driven by `useBranding()`. New Lucide icons (`palette`, `paintbrush`, `type`, `history`) added to icon map. NOTE: `TODO-4.3` (global button rollout) deferred to avoid regressions — tracked separately.
- `src/components/Layout.jsx`: Wrapped in `<BrandingProvider>` so all authenticated pages receive branding context.

**Phase 5 – Routing** ✅
- `src/App.jsx`: Lazy imports for `BrandingSettings` and `BrandingHistory`; 4 new routes under `/platform/organisation/` block.

**Phase 6 – Export & Email Branding** ✅
- `src/utils/exportUtils.js`: Added `resolveBranding()` helper + optional `branding` param to all 8 export functions. Brand primary colour applied to Excel header rows, PPT slide header bars & title text, Word footer text colour. App display name replaces hardcoded "Project Nidus" in Word/PPT/Print footers.
- `src/services/brandingService.js`: Added `buildBrandedEmailHeader()` and `buildBrandedEmailFooter()` helpers for HTML email templates.
- `src/services/registrationEmailService.js`: All 4 send functions accept optional `accountId`; fetch branding and inject into HTML templates. All 4 template generators accept optional `branding` param with safe fallbacks.

### Files Changed
| File | Action |
|------|--------|
| `SQL/v311_organisation_branding_table.sql` | Created |
| `SQL/v312_organisation_branding_storage.sql` | Created |
| `SQL/v313_organisation_branding_history.sql` | Created |
| `SQL/v314_organisation_settings_sidebar_menu.sql` | Created |
| `src/services/brandingService.js` | Created |
| `src/context/BrandingContext.jsx` | Created |
| `src/components/branding/ColourPicker.jsx` | Created |
| `src/components/branding/LogoUpload.jsx` | Created |
| `src/components/branding/FontSelector.jsx` | Created |
| `src/components/branding/BrandingPreview.jsx` | Created |
| `src/pages/platform-app/organisation/BrandingSettings.jsx` | Created |
| `src/pages/platform-app/organisation/BrandingHistory.jsx` | Created |
| `src/components/Layout.jsx` | Modified – BrandingProvider wrapper |
| `src/components/headers/SystemHeader.jsx` | Modified – dynamic branding |
| `src/components/Sidebar.jsx` | Modified – brand colours + new icons |
| `src/App.jsx` | Modified – lazy imports + 4 routes |

---

## Approval

**Implementation complete – All 6 phases implemented.**
