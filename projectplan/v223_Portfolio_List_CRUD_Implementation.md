# v223 Portfolio List CRUD Implementation

## Summary
Full CRUD for the Platform Portfolio list at `/platform/portfolio`: list → view → edit → delete, plus Create and Export.

## Changes Made

### 1. Routes (App.jsx)
- **New route:** `portfolio/edit/:portfolioId` → `PortfolioFormPage` (view/edit/delete for one portfolio).
- Existing: `portfolio` (list), `portfolio/create` (create).

### 2. New Page: PortfolioFormPage (`src/pages/platform-app/PortfolioFormPage.jsx`)
- Loads portfolio by `portfolioId`; supports `location.state.viewOnly` for read-only view.
- **View mode:** Form in read-only; header shows "Edit" and "Delete".
- **Edit mode:** Form editable; header shows "Delete"; form shows "Update Portfolio" and "Cancel".
- **Delete:** Confirmation then `deletePortfolio(id)`; redirect to list with success toast (record ID and name).
- **Save (create/update):** Redirect to list with success toast including record ID and name.

### 3. PortfolioForm (`src/components/portfolio/PortfolioForm.jsx`)
- **`readOnly` prop:** When true, form content is in `<fieldset disabled={readOnly}>`; Submit button hidden; Cancel shows as "Back".
- Tab bar kept outside fieldset so section switching works in view mode.
- **onSave:** Now called with the saved record: `onSave(saved)` so callers can show record-specific success (e.g. ID).

### 4. Portfolio List Page (`src/pages/platform-app/Portfolio.jsx`)
- **Card click:** Navigate to `/platform/portfolio/edit/:id` with `state: { viewOnly: true }` (open in view mode).
- **Toast:** Show success/error from `location.state.toast` after create/update/delete, then clear state.
- **Export:** Added `ExportListMenu` (Excel/Word/PPT/CSV/XML/JSON/Print) for columns: Name, Code, Description, Type, Status.
- **Loading:** Portfolios load after org check; if no org is found, portfolios still load (list works without organization).

### 5. PortfolioCreatePage
- **Success message:** After create, navigate to list with toast: "Portfolio created successfully. Record ID: \<id\> (\<name\>)."
- **handleSaved:** Accepts `saved` from form and uses it for the message.

## User Flow
1. **List** (`/platform/portfolio`): Grid of cards, search, Export dropdown, "Create Portfolio".
2. **Click card** → View portfolio at `/platform/portfolio/edit/:id` (read-only). Actions: Edit, Delete, Back.
3. **Edit** → Same URL, form editable; Update / Delete / Cancel.
4. **Create** → `/platform/portfolio/create` → Form → Save → Redirect to list with success toast.
5. **Delete** → Confirm → Soft delete → Redirect to list with success toast.

## Files Touched
- `src/App.jsx` – lazy import and route for `PortfolioFormPage`.
- `src/pages/platform-app/PortfolioFormPage.jsx` – new.
- `src/pages/platform-app/Portfolio.jsx` – navigation, toast, Export, load without org.
- `src/pages/platform-app/PortfolioCreatePage.jsx` – success toast with record ID.
- `src/components/portfolio/PortfolioForm.jsx` – `readOnly`, `onSave(saved)`.

## Review
- CRUD is complete: Create (existing create page), Read (list + view mode), Update (edit mode), Delete (with confirm).
- Success messages include record ID and name where applicable (workspace rule 16).
- Export list added per workspace rule 37.
- Theme: List and form remain dark (gray-900, purple accents).
