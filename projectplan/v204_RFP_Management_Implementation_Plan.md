# v204 - RFP (Request for Proposal) Document Register Implementation Plan

**Version:** v204
**Created:** 2026-02-17
**Updated:** 2026-02-18
**Status:** Approved
**Implementation Status:** Complete (Phases 1–11, 13 done; Phase 12 service tests done, component tests deferred)
**Estimated Complexity:** Medium (Multi-phase)
**Target Users:** PMO Administrators (full access), all other roles (read-only)

---

## 1. Overview

This plan implements an **RFP Document Register** feature for the PMO module. The PMO's role is **not procurement** - the service provider has already been selected. The PMO simply needs to:

1. **Load/capture the RFP details** (header information + line items) for an already-selected service provider
2. **Bulk upload RFP line items** from an existing Excel/CSV file
3. **Record the selected service provider's responses/comments** against each line item
4. **Maintain a register** of all RFP documents for reference and tracking

### What This Feature Is NOT

- **Not a procurement tool** - No vendor bidding, no RFP issuance to vendors, no tender process
- **Not an evaluation tool** - No scoring, no criteria weighting, no vendor comparison
- **Not a clarification system** - No Q&A workflow between vendors and PMO
- The service provider has already been chosen before the RFP is loaded into the system

### Role-Based Access Summary

| Capability | PMO Admin | All Other Roles |
|------------|-----------|-----------------|
| Create new RFP record | Yes | No |
| Edit/Update RFP record | Yes | No |
| Delete RFP record (soft) | Yes | No |
| Bulk upload line items (CSV/Excel) | Yes | No |
| Record service provider details | Yes | No |
| Record vendor responses/comments | Yes | No |
| Change RFP status | Yes | No |
| View RFP list & details | Yes | Yes (read-only) |
| View line items | Yes | Yes (read-only) |
| View vendor responses/comments | Yes | Yes (read-only) |
| Export/Print RFP | Yes | Yes |

**All Other Roles** (Project Manager, Team Member, Stakeholder, etc.) have **strictly read-only** access. No create, edit, delete, upload, or status change capabilities.

### Reference Image Analysis

The uploaded RFP Excel file (`PMO RFP Docs.png`) contains the following columns:

| Column | Description | Data Type |
|--------|-------------|-----------|
| S/No | Sequential item number | Integer (auto-generated) |
| Delta ID / Reference No. | External reference identifier (e.g., CR22045, TPH_0177) | Text |
| Scope/Entity | Organisational scope (e.g., "2. DRC Only") | Dropdown/Text |
| Business Area | Functional area (e.g., "05. Credit", "Trade Finance", "Corporate Banking") | Dropdown/Text |
| Description | Detailed requirement description | Long Text |
| Vendor Response/Comments | Selected vendor's response, approach, effort estimates | Long Text |

---

## 2. Best Practices for RFP Document Registration

### 2.1 When Loading RFP Details for an Already-Selected Provider

1. **Structured RFP Header**: Every RFP record should capture:
   - RFP Reference Number (auto-generated or from original document)
   - RFP Title and Description
   - Issuing Organisation
   - Original Issue Date (when the RFP was originally issued)
   - RFP Category (IT, Construction, Consulting, etc.)
   - **Selected Service Provider** name and contact details

2. **Complete Line Item Capture**: Each requirement row should include:
   - Sequential number (S/No)
   - External reference number (Delta ID)
   - Scope/Entity classification
   - Business area classification
   - Full requirement description
   - The selected vendor's response/comments (as-is from their submission)

3. **Vendor Response Preservation**: Record the vendor's responses exactly as submitted:
   - Effort estimates (e.g., "Review of requirements (2 days), Update Design (2 days), Build & Test (5 days)")
   - Technical approach notes
   - Any assumptions or dependencies noted by the vendor
   - Compliance declarations

4. **Document Attachments**: Allow attaching the original RFP file (Excel/PDF) and any supporting documents for reference

5. **Audit Trail**: Track who loaded the RFP, when, and any subsequent edits

### 2.2 RFP Record Lifecycle

Since procurement is already complete, the lifecycle is simple:

```
Draft -> Active -> Closed
          \-> On Hold (from Active, resume to Active)
```

- **Draft**: PMO is still loading/entering the RFP details
- **Active**: RFP details fully loaded and available for reference
- **Closed**: Project complete or RFP no longer relevant
- **On Hold**: Temporarily paused (e.g., project paused)

---

## 3. Database Design

### 3.1 Tables Overview

| Table | Purpose | SQL File |
|-------|---------|----------|
| `rfp_documents` | Master RFP header/metadata + selected service provider | v258 |
| `rfp_line_items` | Individual requirement items (rows from Excel) | v258 |
| `rfp_business_areas` | Lookup: Business area categories | v258 |
| `rfp_scope_entities` | Lookup: Scope/entity options | v258 |
| `rfp_attachments` | File attachments linked to RFP | v258 |
| Simulator mirrors (`sim.rfp_*`) | All above in `sim` schema | v259 |

### 3.2 Table: `rfp_documents` (Master RFP Record)

```sql
CREATE TABLE IF NOT EXISTS rfp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organisation & Project Context
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,

    -- RFP Identity
    rfp_reference VARCHAR(50) NOT NULL,         -- Auto-generated: RFP-ORG-YYYY-NNN
    rfp_title VARCHAR(500) NOT NULL,
    rfp_description TEXT,
    rfp_category VARCHAR(100),                  -- IT, Construction, Consulting, etc.

    -- Selected Service Provider (already chosen - not a bidding process)
    service_provider_name VARCHAR(300),
    service_provider_code VARCHAR(50),
    service_provider_contact_person VARCHAR(200),
    service_provider_email VARCHAR(200),
    service_provider_phone VARCHAR(50),

    -- Financial
    contract_value NUMERIC(15,2),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Lifecycle (simple: draft -> active -> closed)
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
        -- CHECK: draft, active, closed, on_hold

    -- Key Dates
    original_issue_date DATE,                   -- When the RFP was originally issued
    provider_selected_date DATE,                -- When the service provider was selected
    contract_start_date DATE,
    contract_end_date DATE,
    loaded_date DATE DEFAULT CURRENT_DATE,      -- When PMO loaded it into the system

    -- Document Info
    original_document_ref VARCHAR(200),          -- Reference from original RFP document
    total_line_items INTEGER DEFAULT 0,          -- Denormalised count for display
    notes TEXT,

    -- Document Governance
    document_state VARCHAR(20) DEFAULT 'draft',
    version_number INTEGER DEFAULT 1,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);
```

### 3.3 Table: `rfp_line_items` (Individual Requirements)

This maps directly to the rows in the Excel/CSV file:

```sql
CREATE TABLE IF NOT EXISTS rfp_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,

    -- From Excel Columns (matching the reference image)
    item_number INTEGER NOT NULL,                  -- S/No
    reference_number VARCHAR(100),                 -- Delta ID / Reference No.
    scope_entity VARCHAR(200),                     -- Scope/Entity
    business_area VARCHAR(200),                    -- Business Area
    description TEXT NOT NULL,                     -- Description
    vendor_response TEXT,                          -- Vendor Response/Comments

    -- Extended Fields (best practice additions)
    priority VARCHAR(20) DEFAULT 'must_have',
        -- CHECK: must_have, should_have, nice_to_have, future_consideration
    requirement_type VARCHAR(50) DEFAULT 'functional',
        -- CHECK: functional, non_functional, technical, operational, compliance, integration
    is_mandatory BOOLEAN DEFAULT TRUE,
    acceptance_criteria TEXT,
    estimated_effort VARCHAR(200),                 -- Vendor's effort estimate
    dependency_notes TEXT,

    -- Ordering & Grouping
    sort_order INTEGER,
    group_name VARCHAR(200),                       -- For grouping related items by section

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);
```

### 3.4 Table: `rfp_business_areas` (Lookup)

```sql
CREATE TABLE IF NOT EXISTS rfp_business_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    area_code VARCHAR(20),            -- e.g., "05"
    area_name VARCHAR(200) NOT NULL,  -- e.g., "Credit"
    display_name VARCHAR(200),        -- e.g., "05. Credit"
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Table: `rfp_scope_entities` (Lookup)

```sql
CREATE TABLE IF NOT EXISTS rfp_scope_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    entity_code VARCHAR(20),          -- e.g., "2"
    entity_name VARCHAR(200) NOT NULL,-- e.g., "DRC Only"
    display_name VARCHAR(200),        -- e.g., "2. DRC Only"
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.6 Table: `rfp_attachments`

```sql
CREATE TABLE IF NOT EXISTS rfp_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfp_documents(id) ON DELETE CASCADE,

    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    attachment_category VARCHAR(50) DEFAULT 'general',
        -- CHECK: general, original_rfp, vendor_submission, contract, supporting_doc
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);
```

---

## 4. Implementation Phases

### Phase 1: Database Foundation (SQL v258) - COMPLETED
- [x] Create `rfp_documents` table with RLS policies
- [x] Create `rfp_line_items` table with RLS policies
- [x] Create `rfp_business_areas` lookup table
- [x] Create `rfp_scope_entities` lookup table
- [x] Create `rfp_attachments` table
- [x] Create indexes for performance
- [x] Register all tables in `database_tables`
- [x] Grant permissions to `authenticated` role
- [x] Create RLS policies:
  - `SELECT`: All authenticated users within same organisation (read-only for all roles)
  - `INSERT`: PMO admin role only (organisation-scoped)
  - `UPDATE`: PMO admin role only (organisation-scoped)
  - `DELETE`: PMO admin role only (organisation-scoped)
  - Helper function: `is_pmo_admin_user()` reusable SECURITY DEFINER function
- [x] Auto-update trigger for `total_line_items` count
- [x] Auto-update trigger for `updated_at` timestamps

### Phase 2: Simulator Mirror Tables (SQL v259) - COMPLETED
- [x] Create all `sim.rfp_*` tables mirroring public schema
- [x] Apply appropriate RLS policies for sim context
- [x] Register sim tables in `database_tables`

### Phase 3: Service Layer - COMPLETED
- [x] Create `src/services/rfpService.js` - Core CRUD for RFP documents and line items
  - All read functions: available to all authenticated users (no role check)
  - All write functions (create, update, delete): PMO admin role check via `enforcePMOAdmin()`
  - Helper function `checkPMOAdminRole()` exported for use by other modules
  - Status transition validation in `updateRFPStatus()`
  - Auto-generated RFP reference numbers (RFP-YYYY-NNN)
  - `batchCreateLineItems()` for bulk import support
  - Lookup table CRUD for business areas and scope entities
  - Attachment CRUD with PMO admin enforcement
  - `getRFPStats()` for dashboard statistics
- [x] Create `src/services/rfpBulkImportService.js` - CSV/Excel parsing and bulk import
  - Custom CSV parser with BOM stripping, quoted fields, embedded commas
  - `autoDetectColumnMapping()` with alias matching for flexible header detection
  - Row-level validation with error/warning separation
  - `mapRowToDBFormat()` with priority/type/boolean normalisation
  - Batch import (50 rows per batch) with progress callback and fallback to individual inserts
  - Template and sample file generation with Excel-compatible BOM
  - Download helpers for template and sample files
- [x] Create unit tests for all services (implemented in Phase 12)

### Phase 4: RFP List Page (Frontend) - COMPLETED
- [x] Create `src/components/rfp/RFPList.jsx` - Filterable, sortable list of all RFPs
  - Accepts `readOnly` prop to hide action buttons (Create, Edit, Delete) for non-PMO users
  - PMO Admin sees: Create button, Edit/Delete row actions
  - All Other Roles see: View and Export row actions only
- [x] Create `src/components/rfp/RFPStatusBadge.jsx` - Colour-coded status badges (Draft/Active/Closed/On Hold)
- [x] Create `src/components/rfp/RFPStats.jsx` - Summary cards (total RFPs, by status, total line items)
- [x] Create `src/pages/pmo/PMOProcurementRFP.jsx` - PMO wrapper page (passes `readOnly` based on role)
- [x] Register route: `/pmo/procurement/rfp`

### Phase 5: RFP Create/Edit Form (Single Record) - **PMO Admin Only** - COMPLETED
- [x] Create `src/components/rfp/RFPForm.jsx` - Form with RFP Details and Service Provider sections
  - Step 1: **RFP Details** - Title, category, description, original reference, original issue date
  - Step 2: **Service Provider** - Provider name, code, contact person, email, phone, contract value, dates
  - Step 3 (Edit mode): **Line Items** - RFPLineItemEditor with Add Item, Bulk Import, Edit/Delete per row
- [x] Create `src/components/rfp/RFPLineItemForm.jsx` - Modal form for add/edit single line item
- [x] Create `src/components/rfp/RFPLineItemEditor.jsx` - Manages line items with Add, Import, Edit, Delete
- [x] Create `src/pages/pmo/PMORFPCreate.jsx` - Create page (**PMO Admin role guard**)
- [x] Create `src/pages/pmo/PMORFPEdit.jsx` - Edit page (**PMO Admin role guard**)
- [x] Register routes: `/pmo/rfp/create`, `/pmo/rfp/:id/edit`
- [x] Non-PMO users navigating to these routes are redirected to list/view with warning toast

### Phase 6: RFP View & Details (All Roles - Read-Only for Non-PMO) - COMPLETED
- [x] Create `src/components/rfp/RFPDetailView.jsx` - Detail view with `readOnly` prop
  - PMO Admin: sees Edit, Delete, Status Change buttons in the header
  - All Other Roles: sees only Export/Print buttons; all data displayed as read-only text
  - Sections: RFP Details, Service Provider Info, Line Items Table (with Bulk Import link for PMO), Attachments
- [x] Create `src/components/rfp/RFPPrintView.jsx` - Print-friendly RFP layout
- [x] Create `src/components/rfp/RFPLineItemsTable.jsx` - Items table with vendor responses
  - Columns: S/No, Reference, Scope/Entity, Business Area, Description, Vendor Response
- [x] Create `src/pages/pmo/PMORFPView.jsx` - View page (passes `readOnly={!isPMO}`)
- [x] Register route: `/pmo/rfp/:id/view`

### Phase 7: Bulk Upload Feature (CSV/Excel) - **PMO Admin Only** - COMPLETED
- [x] Create `src/components/rfp/RFPBulkImport.jsx` - 3-stage import flow (**PMO Admin role guard**):
  - Stage 1: Template download + file upload drag-and-drop zone
  - Stage 2: Auto-validation with row-level error/warning display + column mapping
  - Stage 3: Import execution with progress bar and results summary
- [x] Create `src/components/rfp/RFPColumnMapper.jsx` - Column mapping UI for non-standard files
- [x] Create `src/pages/pmo/PMORFPBulkImport.jsx` - Standalone import page (renders RFPBulkImport)
- [x] Register route: `/pmo/rfp/:id/import`

### Phase 8: Draft Queue & On-Hold - **PMO Admin Only** - COMPLETED
- [x] Register `rfp` entity type in `draftQueueConfig.js` with `roles: ['pmo_admin']`
- [x] Create `src/pages/pmo/PMORFPOnHold.jsx` - On-hold queue page (**PMO Admin role guard**)
  - Non-PMO users redirected to RFP list with warning toast
- [x] Register route: `/pmo/rfp/on-hold`

### Phase 9: Menu & Navigation Integration - COMPLETED
- [x] Add "Procurement" section to `pmoMenuConfig.js` (PMO Admin - full menu):
  ```javascript
  {
    id: 'pmo-procurement',
    label: 'Procurement',
    path: null,
    icon: ShoppingCart,
    section: 'Procurement',
    order: 7,
    children: [
      { id: 'pmo-proc-rfp', label: 'RFP Register', path: '/pmo/procurement/rfp', icon: FileSpreadsheet, order: 1 },
      { id: 'pmo-proc-rfp-create', label: 'Load RFP', path: '/pmo/rfp/create', icon: FilePlus, order: 2, permission: 'pmo_admin' },
      { id: 'pmo-proc-rfp-on-hold', label: 'RFP Drafts', path: '/pmo/rfp/on-hold', icon: Pause, order: 3, permission: 'pmo_admin' },
    ]
  }
  ```
- [ ] Add corresponding **read-only** menu items to `pmMenuConfig.js` for all other roles:
  ```javascript
  {
    id: 'pm-procurement',
    label: 'Procurement',
    path: null,
    icon: 'ShoppingCart',
    section: 'Procurement',
    order: 12,
    children: [
      { id: 'pm-proc-rfp', label: 'RFP Documents', path: '/pmo/procurement/rfp', icon: 'FileSpreadsheet', order: 1 },
      // NOTE: No "Load RFP", "Edit", "Import", or "Drafts" links for non-PMO roles
    ]
  }
  ```
- [x] Use `permission: 'pmo_admin'` field on menu items that should only be visible to PMO Admin

### Phase 10: Simulator Mirror (Frontend) - COMPLETED
- [x] Simulator RFP via reusable platform components (`basePath`, `rfpService` props) + `simRfpService.js`, `simRfpBulkImportService.js`
- [x] Create `src/pages/simulator/pmo/` RFP pages: SimulatorPMOProcurementRFP, SimulatorPMORFPView, SimulatorPMORFPCreate, SimulatorPMORFPEdit, SimulatorPMORFPBulkImport, SimulatorPMORFPPrint, SimulatorPMORFPOnHold
- [x] Add Procurement section to `simulatorPMOMenuConfig.js`
- [x] Register simulator routes: `/simulator/pmo/procurement/rfp`, `/simulator/pmo/rfp/create`, `/simulator/pmo/rfp/:id/view`, `/simulator/pmo/rfp/:id/edit`, `/simulator/pmo/rfp/:id/import`, `/simulator/pmo/rfp/:id/print`, `/simulator/pmo/rfp/on-hold`

### Phase 11: Exports & Reports - COMPLETED
- [x] Export RFP line items to CSV (matching original import format, including vendor responses) via `downloadRFPLineItemsCSV`, Export CSV button in RFPDetailView
- [x] Print-friendly RFP view (for physical distribution) via `RFPPrintView`, `PMORFPPrint`, route `/pmo/rfp/:id/print`

### Phase 12: Unit Tests - COMPLETED
- [x] `src/services/__tests__/rfpService.test.js`
  - Test: getRFPList, getRFPById, getLineItems
  - Test: checkPMOAdminRole
- [x] `src/services/__tests__/rfpBulkImportService.test.js`
  - Test: parseRFPCSV, autoDetectColumnMapping, validateRFPLineItem, validateAllRows, mapRowToDBFormat
  - Test: exportRFPLineItemsToCSV
- [x] Component tests for role-based UI rendering:
  - Test: RFPList renders Create button for PMO admin, hides it for other roles
  - Test: RFPDetailView hides Edit/Delete buttons for non-PMO roles
  - Test: PMORFPCreate redirects non-PMO users to list page
  - Test: PMORFPBulkImport redirects non-PMO users to view page

### Phase 13: Documentation - COMPLETED
- [x] `Documentation/RFP_Register_Technical_Documentation.md`
- [x] `Documentation/RFP_Register_User_Guide.md`
- [x] `Documentation/RFP_Bulk_Import_Guide.md`

---

## 5. CSV/Excel Import Template Specification

### 5.1 Template Columns (Matching Image)

The downloadable CSV template will have these columns:

| Column Header | Required | Maps To | Validation |
|---------------|----------|---------|------------|
| S/No | Yes | `item_number` | Must be a positive integer |
| Delta ID / Reference No. | No | `reference_number` | Max 100 chars |
| Scope/Entity | No | `scope_entity` | Free text or lookup match |
| Business Area | No | `business_area` | Free text or lookup match |
| Description | Yes | `description` | Min 10 chars, max 5000 chars |
| Vendor Response/Comments | No | `vendor_response` | Max 5000 chars |
| Priority | No | `priority` | Must be: Must-Have, Should-Have, Nice-to-Have, Future |
| Requirement Type | No | `requirement_type` | Functional, Non-Functional, Technical, Operational, Compliance, Integration |
| Is Mandatory | No | `is_mandatory` | Yes/No/TRUE/FALSE |
| Acceptance Criteria | No | `acceptance_criteria` | Free text |

### 5.2 Import Validation Rules

1. **Header detection**: Auto-detect column positions by matching header text (case-insensitive, partial match)
2. **Duplicate detection**: Warn if duplicate `S/No` or `Reference No.` found
3. **Row validation**: Each row validated independently; errors don't block other rows
4. **Preview mode**: Show parsed data in table before committing import
5. **Conflict resolution**: If line items with same `item_number` already exist, offer: Skip / Overwrite / Create New
6. **Encoding support**: Handle UTF-8 with BOM, UTF-8, and Windows-1252 (common Excel encodings)

### 5.3 Column Mapping UI

For files that don't exactly match the template (common with real-world RFP documents):

1. Auto-detect columns by header name similarity
2. Show mapping UI: each detected column -> dropdown to select target field
3. User confirms mapping before import proceeds
4. Save mapping profile for reuse with similar files

---

## 6. RFP Record Lifecycle

### 6.1 Status Transitions

```
Draft
  -> Active     (PMO confirms all details are loaded)

Active
  -> Closed     (Project complete or RFP no longer relevant)
  -> On Hold    (Temporarily paused)

On Hold
  -> Active     (Resume)

Closed
  (Terminal state - no further transitions, read-only archive)
```

### 6.2 Status-Based Permissions

**Only PMO Admin has write access. All other roles are strictly read-only.**

| Status | PMO Admin | All Other Roles |
|--------|-----------|-----------------|
| Draft | Full Edit, Create, Delete, Bulk Upload | **Read-Only** |
| Active | Edit, Status Change | **Read-Only** |
| On Hold | Edit, Resume to Active | **Read-Only** |
| Closed | No Edit (archived) | **Read-Only** |
| **All States** | **Export/Print** | **Export/Print** |

### 6.3 Access Control Enforcement Points

Access control is enforced at **three levels**:

1. **Database (RLS Policies)**:
   - `SELECT`: All authenticated users within the same organisation can read
   - `INSERT / UPDATE / DELETE`: Only users with the `pmo_admin` role
   - Organisation-scoped: Users can only see RFPs from their own organisation

2. **Service Layer (rfpService.js)**:
   - Every write operation (create, update, delete, bulk import) checks `isPMOAdmin()` before executing
   - Returns a clear error message: "Only PMO Administrators can perform this action"
   - Read operations are available to all authenticated users

3. **Frontend UI (Components)**:
   - `useUserRole()` hook determines the current user's role
   - Non-PMO users see:
     - **No** "Load RFP" / "Create" button
     - **No** "Edit" button on list rows or detail view
     - **No** "Delete" button
     - **No** "Import CSV" / "Bulk Upload" button
     - **No** inline editing on line items table
     - **No** status change dropdown
     - All data displayed as **read-only text**
   - PMO users see all action buttons and editable forms
   - The detail view component accepts a `readOnly` prop that controls all interactivity

---

## 7. UI/UX Design Specifications

### 7.1 RFP List Page

- **Header**: "RFP Document Register" with "Load RFP" button **(PMO Admin only)**
- **Stats Row**: Cards showing Total RFPs, Draft, Active, Closed
- **Filter Bar**: Status, Category, Date Range, Search
- **Table Columns**: Reference, Title, Category, Service Provider, Status, Line Items Count, Loaded Date, Actions
- **Row Actions (PMO Admin)**: View, Edit, Delete
- **Row Actions (All Other Roles)**: View, Export only
- **Role detection**: Use `useUserRole()` to conditionally render action buttons

### 7.2 RFP Form (Create/Edit) - **PMO Admin Only**

> **Access restriction**: The Create and Edit routes are only accessible to PMO Admin users.
> Non-PMO users attempting to navigate to `/pmo/rfp/create` or `/pmo/rfp/:id/edit` will be
> redirected to the read-only view page with a toast notification:
> *"You do not have permission to create or edit RFP documents."*

**Step 1 - RFP Details**:
- RFP Title (required)
- RFP Category (searchable dropdown: IT, Construction, Consulting, Financial Services, etc.)
- Description (text area)
- Original Document Reference (text - the reference from the source RFP document)
- Original Issue Date (date picker - when the RFP was originally issued)
- Linked Project (optional, searchable)
- Linked Programme (optional, searchable)
- Notes (text area)

**Step 2 - Selected Service Provider**:
- Provider Name (required)
- Provider Code (optional)
- Contact Person
- Contact Email
- Contact Phone
- Contract Value (SmartAmountInput with currency)
- Provider Selected Date (date picker)
- Contract Start Date (date picker)
- Contract End Date (date picker)

**Step 3 - Line Items (Requirements)**:
- **Single Entry**: "Add Item" button -> modal form with fields matching the Excel columns
- **Bulk Import**: "Import from CSV/Excel" button -> bulk upload flow (see Phase 7)
- **Inline Table**: Editable data grid showing all items
  - Drag-and-drop reordering
  - Inline edit for quick changes
  - Row actions: Edit, Duplicate, Delete
- **Columns**: S/No (auto), Reference No., Scope/Entity, Business Area, Description, Vendor Response

**Step 4 - Attachments & Notes**:
- Upload original RFP file (Excel/PDF)
- Upload vendor submission document
- Upload contract or supporting documents
- Attachment category selector per file
- Drag-and-drop upload zone

**Step 5 - Review & Save**:
- Full read-only summary of all steps
- Completeness checklist (title filled, at least 1 line item, provider name filled)
- Action buttons: Save as Draft, Mark as Active

### 7.3 Bulk Import Flow - **PMO Admin Only**

> **Access restriction**: Only accessible to PMO Admin users.

**Stage 1 - Upload**:
- Large dashed-border drop zone with icon
- "Download Template" button (CSV with correct headers matching the image)
- "Download Sample File" button (CSV with 5 example rows)
- Supported formats text: "CSV, XLS, XLSX (max 10MB, max 5000 rows)"
- File selection via click or drag-and-drop

**Stage 2 - Validate & Map**:
- Column mapping grid (if headers don't auto-match)
- Validation results:
  - Green check for valid rows
  - Yellow warning for rows with warnings
  - Red cross for invalid rows (with specific error message per field)
- Summary: "245 of 258 rows valid, 10 warnings, 3 errors"
- Option: "Import valid rows only" or "Fix errors first"
- Preview table showing first 20 parsed rows

**Stage 3 - Import**:
- Progress bar with row counter
- Real-time status: Importing row X of Y
- Results summary:
  - Imported: N rows
  - Skipped: N rows (with reasons)
  - Failed: N rows (with errors downloadable as CSV)
- "View Imported Items" button to navigate back to Line Items step

### 7.4 RFP Detail View (All Roles)

- **Header**: RFP title, reference, status badge
  - PMO Admin: Edit, Delete, Change Status buttons
  - All Other Roles: Export/Print buttons only
- **Section 1 - RFP Details**: Category, description, original reference, dates, linked project
- **Section 2 - Service Provider**: Provider name, contact info, contract value, dates
- **Section 3 - Line Items Table**: Full table with all columns from the Excel, including vendor response
  - Expandable rows for long descriptions/responses
  - Search/filter within line items
  - PMO Admin: inline edit actions
  - All Other Roles: read-only
- **Section 4 - Attachments**: List of uploaded files with download links
- **Section 5 - Audit Info**: Created by, created date, last modified by, last modified date

### 7.5 Theme Support

All components must support dark/light mode:
- Use `dark:` Tailwind prefix classes throughout
- Use `useTheme()` context where conditional logic is needed
- Default to dark theme as per CLAUDE.md rule 28

---

## 8. File/Folder Structure

```
src/
  components/
    rfp/
      RFPList.jsx
      RFPForm.jsx
      RFPDetailView.jsx
      RFPStatusBadge.jsx
      RFPStats.jsx
      RFPLineItemEditor.jsx
      RFPLineItemForm.jsx
      RFPLineItemsTable.jsx
      RFPBulkImport.jsx
      RFPColumnMapper.jsx
      RFPPrintView.jsx
    sim/
      rfp/
        SimRFPList.jsx
        SimRFPForm.jsx
        SimRFPDetailView.jsx
        ... (mirrors platform components using simDb)
  services/
    rfpService.js
    rfpBulkImportService.js
    __tests__/
      rfpService.test.js
      rfpBulkImportService.test.js
  pages/
    pmo/
      PMOProcurementRFP.jsx
      PMORFPCreate.jsx
      PMORFPEdit.jsx
      PMORFPView.jsx
      PMORFPBulkImport.jsx
      PMORFPOnHold.jsx
    simulator/
      SimRFPList.jsx
      SimRFPCreate.jsx
      SimRFPView.jsx

SQL/
  v258_rfp_document_register_tables.sql
  v259_sim_rfp_tables.sql

Documentation/
  RFP_Register_Technical_Documentation.md
  RFP_Register_User_Guide.md
  RFP_Bulk_Import_Guide.md
```

---

## 9. Route Registration Plan

### 9.1 Route Access Matrix

| Route | PMO Admin | All Other Roles |
|-------|-----------|-----------------|
| `/pmo/procurement/rfp` (list) | Full access | Read-only (no action buttons) |
| `/pmo/rfp/create` | Full access | **Blocked** - redirect to list |
| `/pmo/rfp/:id/view` | Full access + edit button | Read-only view |
| `/pmo/rfp/:id/edit` | Full access | **Blocked** - redirect to view |
| `/pmo/rfp/:id/import` | Full access | **Blocked** - redirect to view |
| `/pmo/rfp/on-hold` | Full access | **Blocked** - redirect to list |

### 9.2 Route Definitions

```jsx
// PMO RFP Routes (in App.jsx)
// Read-only routes - accessible to ALL authenticated roles
<Route path="pmo/procurement/rfp" element={<PMOLayout><PMOProcurementRFP /></PMOLayout>} />
<Route path="pmo/rfp/:id/view" element={<PMOLayout><PMORFPView /></PMOLayout>} />

// Write routes - PMO Admin ONLY (role guard inside each component)
<Route path="pmo/rfp/create" element={<PMOLayout><PMORFPCreate /></PMOLayout>} />
<Route path="pmo/rfp/:id/edit" element={<PMOLayout><PMORFPEdit /></PMOLayout>} />
<Route path="pmo/rfp/:id/import" element={<PMOLayout><PMORFPBulkImport /></PMOLayout>} />
<Route path="pmo/rfp/on-hold" element={<PMOLayout><PMORFPOnHold /></PMOLayout>} />

// Simulator RFP Routes (same access pattern)
<Route path="simulator/pmo/procurement/rfp" element={<SimulatorLayout><SimRFPList /></SimulatorLayout>} />
<Route path="simulator/pmo/rfp/create" element={<SimulatorLayout><SimRFPCreate /></SimulatorLayout>} />
<Route path="simulator/pmo/rfp/:id/view" element={<SimulatorLayout><SimRFPView /></SimulatorLayout>} />
```

### 9.3 Role Guard Implementation

Each write-only page (Create, Edit, Import, On-Hold) will include a role check at the top:

```jsx
function PMORFPCreate() {
  const { userRole } = useUserRole()
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => {
    if (userRole && userRole !== 'pmo_admin') {
      addToast('You do not have permission to load RFP documents.', 'warning')
      navigate('/pmo/procurement/rfp', { replace: true })
    }
  }, [userRole])

  if (!userRole || userRole !== 'pmo_admin') return <LoadingSpinner />

  return <RFPForm mode="create" />
}
```

Read-only pages (List, View) will pass a `readOnly` prop based on role:

```jsx
function PMORFPView() {
  const { userRole } = useUserRole()
  const isPMO = userRole === 'pmo_admin'

  return <RFPDetailView readOnly={!isPMO} />
}
```

---

## 10. Technical Considerations

### 10.1 Performance
- Paginate line items (default 50 per page) for RFPs with 500+ items
- Virtual scrolling for the inline table editor when items > 100
- Index all foreign keys and frequently filtered columns

### 10.2 Data Integrity
- Unique constraint on (rfp_id, item_number) for line items
- Soft deletes everywhere (no hard deletes)
- `total_line_items` on `rfp_documents` updated via trigger on line item insert/delete

### 10.3 Security & Role-Based Access Control

**Core Principle: PMO Admin = Full Access, Everyone Else = Read-Only**

- Organisation-scoped RLS: Users can only see RFPs from their own organisation
- **PMO Admin**: Full CRUD on all RFP entities (create, edit, delete, bulk upload, status changes)
- **All Other Roles**: **Strictly read-only** across all RFP entities

**RLS Policy Pattern for all RFP tables:**
```sql
-- READ: All authenticated users in the same organisation
CREATE POLICY "rfp_select_policy" ON rfp_documents
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM user_organisations
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- WRITE (INSERT/UPDATE/DELETE): PMO Admin only
CREATE POLICY "rfp_insert_policy" ON rfp_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name = 'pmo_admin'
        AND ur.organisation_id = organisation_id
    )
  );
-- Same pattern for UPDATE and DELETE policies
```

### 10.4 CSV Parsing
- Custom parser (no external libraries) matching existing `qualityActivityBulkImportService.js` pattern
- Handle: quoted fields, embedded commas, newlines within quotes, UTF-8 BOM
- Max file size: 10MB
- Max rows: 5,000

---

## 11. Success Criteria

**PMO Admin Capabilities:**
1. PMO admin can create a new RFP record with details and selected service provider info
2. PMO admin can manually add individual line items matching the Excel column structure
3. PMO admin can bulk upload a CSV/Excel file matching the reference image format
4. PMO admin can record the selected vendor's response/comments per line item
5. PMO admin can edit, delete, and change status of any RFP record
6. Column mapping handles variations in header names during bulk import
7. Validation catches errors before import and provides clear feedback

**Read-Only Access for All Other Roles:**
8. Non-PMO users can view the RFP list with all RFP records
9. Non-PMO users can view RFP details, line items, and vendor responses in read-only mode
10. Non-PMO users **cannot** see Create, Edit, Delete, Import, or Status Change buttons
11. Non-PMO users are **redirected** if they navigate directly to create/edit/import URLs
12. Non-PMO users can export and print RFP data
13. RLS policies at the database level enforce read-only for non-PMO users (defence in depth)

**General:**
14. All data is organisation-scoped and RLS-protected
15. Feature works in both Platform and Simulator contexts
16. Dark/light theme support throughout
17. Draft/hold queue integration for saving incomplete work (PMO admin only)
18. All changes are audited with user and timestamp

---

## 12. Dependencies & Assumptions

### Dependencies
- Existing `organisations` table and context
- Existing `projects` / `programmes` tables for optional linking
- Existing `auth.users` for user references
- Existing `useDraftQueue` hook and `draftQueueConfig.js`
- Existing `DocumentGovernanceContext` for governance integration
- Existing `SmartAmountInput` for contract value field
- Existing `SearchableSelect` for dropdown fields

### Assumptions
- The service provider has already been selected before the RFP is loaded into the system
- The PMO is not running any procurement process - they are documenting/registering an existing RFP
- Vendor responses/comments are loaded as-is from the original document (not captured via a bidding process)
- CSV is the primary bulk import format (Excel files are saved-as CSV first)
- The image format represents a typical but not rigid structure (column mapping handles variations)

---

## 13. Implementation Priority

| Priority | Phase | Description |
|----------|-------|-------------|
| P0 | Phase 1 | Database tables (core) |
| P0 | Phase 3 | Service layer (CRUD + bulk import) |
| P0 | Phase 5 | RFP Create/Edit form |
| P0 | Phase 7 | Bulk CSV import |
| P0 | Phase 9 | Menu & navigation |
| P1 | Phase 4 | RFP List page |
| P1 | Phase 6 | RFP Detail View |
| P1 | Phase 8 | Draft Queue |
| P2 | Phase 2, 10 | Simulator mirror |
| P2 | Phase 11 | Exports & Print |
| P2 | Phase 12-13 | Tests & Documentation |

---

## Review Section

*(To be completed after implementation)*

---

**Plan Status:** Awaiting Approval
**Next Step:** User review and approval before implementation begins
