# v225 – Programme Full CRUD Implementation (Portfolio-style)

## Summary
Implemented full CRUD for Programme records on the Platform list page (`/platform/programme`), aligned with the existing Portfolio list behaviour: View, Edit, Delete on each card, Export list, success/error toasts, and correct platform routes from detail/edit/create.

## Changes

### 1. Programme list page (`src/pages/platform-app/Programme.jsx`)
- **View / Edit / Delete on cards:** Each programme card now has three action buttons (View, Edit, Delete) with `stopPropagation` so card click still goes to view. View → `/platform/programme/:id`, Edit → `/platform/programme/:id/edit`, Delete → confirm then `deleteProgramme(id)`, then success toast and list refresh.
- **Toasts:** Added `toast` and `deletingId` state; toast is read from `location.state?.toast` and cleared via `replace`. Success toast after delete; error toast on delete failure.
- **Export:** Added `ExportListMenu` with columns: programme_name, programme_code, programme_type, programme_status, programme_description; base filename `Programme-List`.
- **List refresh:** When navigating back to the list with a success toast (e.g. after create or edit), the list is refreshed so the new/updated programme appears.

### 2. Programme edit page (`src/pages/programme/ProgrammeEdit.jsx`)
- **Platform routes:** Uses `useLocation` to detect `/platform` and sets `basePath` to `/platform/programme` or `/programme`. All navigations (back, cancel, error “Back to Programmes”) use `basePath` or `basePath/:id`.
- **Success toast on save:** After save, navigates to `/platform/programme` (list) with `state: { toast: { type: 'success', message: 'Programme updated. Record ID: ...' } }`.
- **Cancel:** Navigates to detail `basePath/:id` instead of list.

### 3. Programme detail page (`src/pages/programme/ProgrammeDetail.jsx`)
- **Delete success toast:** After successful delete, navigates to list with `state: { toast: { type: 'success', message: 'Programme "..." (code) deleted successfully.' } }`.

### 4. Programme form (`src/components/programme/ProgrammeForm.jsx`)
- **onSave payload:** Form now passes the saved record to `onSave(saved)` so the edit page can show the record ID in the success toast.

### 5. Programme create page (`src/pages/platform-app/ProgrammeCreatePage.jsx`)
- **Success toast on create:** After successful create, navigates to `/platform/programme` with `state: { toast: { type: 'success', message: 'Programme created. Record ID: ...' } }`. Uses returned `saved` from `saveProgramme` for the ID.

## Routes (unchanged)
- List: `/platform/programme`
- Create: `/platform/programme/create`
- View: `/platform/programme/:id`
- Edit: `/platform/programme/:id/edit`

## Files modified
- `src/pages/platform-app/Programme.jsx`
- `src/pages/programme/ProgrammeEdit.jsx`
- `src/pages/programme/ProgrammeDetail.jsx`
- `src/components/programme/ProgrammeForm.jsx`
- `src/pages/platform-app/ProgrammeCreatePage.jsx`

## Review
- Programme list now matches Portfolio CRUD: View, Edit, Delete on each card; Export; toasts on create/update/delete; list refresh when returning with success toast.
- Edit and Detail use platform base path when under `/platform` so back/cancel and delete redirect correctly to the list with toast.
