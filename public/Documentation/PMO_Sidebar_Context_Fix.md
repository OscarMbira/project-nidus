# PMO Sidebar Context Fix

## Problem

When a PMO user was on the PMO Dashboard (`/pmo/dashboard`) and clicked on menu items like "Edit Mandate", they were redirected to `/platform/mandates/:id/edit` which uses the Platform layout with the Platform sidebar instead of staying within the PMO context.

## Root Cause

Shared components (like `MandateList`, `ProjectMandateEdit`, etc.) had hardcoded navigation paths pointing to `/platform/*` routes, regardless of which context (PMO or Platform) the user was currently in.

## Solution

Implemented **Route Context-Aware Navigation** by:

1. Adding `useLocation` hook to detect current route context
2. Computing the base path dynamically based on whether the route starts with `/pmo`
3. Updating all navigation calls to use the context-aware paths

## Files Modified

### 1. `src/pages/mandate/MandateList.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated `handleCreateClick`, `handleViewClick`, `handleEditClick` to use `basePath`

### 2. `src/pages/mandate/ProjectMandateCreate.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext`, `basePath`, `listPath`
- Updated navigation to view page after creation
- Updated cancel navigation
- Updated HoldButton's onHoldComplete callback

### 3. `src/pages/mandate/ProjectMandateView.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated "Back to List" navigation
- Updated "Edit" button navigation

### 4. `src/pages/mandate/ProjectMandateEdit.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated all navigation calls (back to view, back to list, HoldButton)

### 5. `src/pages/mandate/MandateApprovalDashboard.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated view mandate navigation

### 6. `src/pages/mandate/MandateObjectivesSearch.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated `handleViewMandate` callback

### 7. `src/pages/mandate/MandateSearch.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated `handleViewMandate` callback

### 8. `src/pages/mandate/UnlinkedMandatesList.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated create mandate navigation
- Updated view mandate navigation

### 9. `src/pages/mandate/ProjectCreationWizard.jsx`
- Added `useLocation` import
- Added context detection: `isPMOContext` and `basePath`
- Updated all navigate calls to view mandate

### 10. `src/App.jsx`
Added new PMO mandate routes that use `PMOLayout`:
- `pmo/mandates/create`
- `pmo/mandates/:mandateId/view`
- `pmo/mandates/:mandateId/edit`

## Pattern for Context-Aware Navigation

```javascript
import { useLocation, useNavigate } from 'react-router-dom'

function MyComponent() {
  const navigate = useNavigate()
  const location = useLocation()

  // Detect context from current route
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'
  const listPath = isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list'

  // Use in navigation
  const handleView = (id) => navigate(`${basePath}/${id}/view`)
  const handleBack = () => navigate(listPath)
}
```

## All Mandate Files Now Context-Aware

All mandate-related files have been updated to be context-aware:

- `MandateList.jsx` ✅
- `ProjectMandateCreate.jsx` ✅
- `ProjectMandateView.jsx` ✅
- `ProjectMandateEdit.jsx` ✅
- `MandateApprovalDashboard.jsx` ✅
- `MandateObjectivesSearch.jsx` ✅
- `MandateSearch.jsx` ✅
- `UnlinkedMandatesList.jsx` ✅
- `ProjectCreationWizard.jsx` ✅

## Testing

1. Navigate to PMO Dashboard (`/pmo/dashboard`)
2. Go to PMO Governance > Project Mandate
3. Click "Create Mandate" - should stay in PMO context
4. Click "View" on a mandate - should stay in PMO context
5. Click "Edit" on a mandate - should stay in PMO context
6. Click "Back" buttons - should return to PMO mandate list

## Date

2026-02-06
