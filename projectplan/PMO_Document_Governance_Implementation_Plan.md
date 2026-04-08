# PMO Document Governance Module - Implementation Plan

## Document Information
- **Plan Name**: PMO Document Governance Module Implementation (with File Storage)
- **Version**: 2.0
- **Date**: 2026-01-08
- **Last Updated**: 2026-01-08
- **Status**: PENDING APPROVAL
- **Author**: Claude (Senior Full-Stack Engineer)
- **Change Summary**: Added full file upload/download/versioning capabilities using Supabase Storage

---

## Executive Summary

This plan outlines the complete implementation of the **PMO Document Governance & Compliance Module** as specified in the PRD. The module will enable the PMO to:
- Track mandatory and optional governance documents at each project stage
- Enforce stage gate compliance (blocking gates if mandatory documents are missing/unapproved)
- Provide programme-level document compliance rollups
- Maintain full audit trail of all governance actions
- Integrate with existing PMO dashboard and stage gate systems

**Key Principle**: This is a **document storage and governance** system with full file upload/download capabilities. Documents can be:
- Uploaded directly to Supabase Storage (docx, xlsx, pdf, md, png, jpeg, tiff, etc.)
- Linked from external sources (SharePoint, Google Drive, etc.)
- Version-controlled with full history tracking
- Previewed in-app for supported formats

---

## A. Assessment of Existing Implementation

### ✅ What EXISTS (Can be leveraged)
1. **Stage Gate System** (`SQL/v10_stage_gates_tables.sql`):
   - `stage_boundaries` table with approval workflow
   - `stage_approvals` table for tracking approvals
   - `stage_approval_checklists` table for checklist items
   - Status field supports blocking logic

2. **PMO Dashboard Foundation** (`SQL/v145_pmo_dashboard_enhancements.sql`):
   - `project_assignments` table (Executive/PM/Board tracking)
   - `exceptions` table for compliance violations
   - `audit_trails` table for logging (mentioned in code)
   - PMO control strip view

3. **Governance Service** (`src/services/governanceService.js`):
   - Stub functions for framework, policies, compliance
   - `getAuditLog()` function exists and queries `audit_trails`

4. **PMO Admin Service** (`src/services/pmoAdminService.js`):
   - PMO role checking (`isPMOAdmin()`)
   - Project listing functions
   - Dashboard data aggregation

5. **Menu Configuration** (`src/config/pmMenuConfig.js`):
   - Governance section exists (Framework, Policies, Compliance, Decision Log, Audit Trail)
   - PMO Admin section exists
   - Permission-based filtering ready

6. **Dashboard Components** (`src/components/app/dashboard/`):
   - PMOControlStrip
   - ExceptionManagement
   - StageGateOversight
   - ProgrammeOverview

### ❌ What is MISSING (Must be implemented)
1. **Document Governance Tables**:
   - `document_types` (define document types per stage)
   - `project_documents` (track documents for each project)
   - `document_versions` (version history for uploaded files)
   - `programme_documents` (track programme-level documents)
   - `document_governance_stages` (lookup table for stages)

2. **Supabase Storage Setup**:
   - Create `project-documents` storage bucket
   - Create `programme-documents` storage bucket
   - Configure RLS policies for file access
   - Configure file size limits and allowed MIME types

3. **File Upload/Download Service**:
   - File upload to Supabase Storage
   - File download from Supabase Storage
   - File version management
   - File preview/rendering for supported formats
   - File validation (size, type, virus scan)

4. **Stage Gate Integration**:
   - Document compliance check function
   - Automatic gate blocking when mandatory docs missing
   - Exception raising when compliance violated

5. **Frontend Components**:
   - Document Register (PMO view) with file upload
   - Document compliance dashboard
   - Stage-based document grouping
   - Programme document rollup view
   - Document status management UI
   - File upload/drag-drop component
   - File preview component (PDF, images, markdown)
   - Version history viewer

6. **Service Layer**:
   - `documentGovernanceService.js` (CRUD for documents)
   - `documentStorageService.js` (file upload/download/versioning)
   - Integration with `stageGateService.js`
   - Programme rollup calculations

7. **Menu Integration**:
   - Add "Document Governance" submenu to Governance section
   - Update PMO Admin menu with Document Governance link

---

## B. Gap Analysis: Existing vs PRD Requirements

| PRD Requirement | Status | Gap |
|----------------|--------|-----|
| **1. Document Register (PMO-Owned)** | ❌ Missing | Need full implementation |
| - Document Type | ❌ | Need `document_types` table |
| - Stage/Phase | ❌ | Need stage mapping |
| - Mandatory Flag | ❌ | Need boolean field + enforcement |
| - Status tracking | ❌ | Need status enum + workflow |
| - Owner/Approver | ❌ | Need user references |
| - External Link | ❌ | Need URL field |
| - **File Upload** | ❌ | Need Supabase Storage integration |
| - **File Download** | ❌ | Need download service |
| - **Version Control** | ❌ | Need `document_versions` table |
| - **File Preview** | ❌ | Need preview components for PDF, images, markdown |
| **2. Stage Gate Enforcement** | ⚠️ Partial | Stage gates exist, need document integration |
| - Block gate if docs missing | ❌ | Need compliance check function |
| - Auto-raise exception | ⚠️ | Exception table exists, need trigger |
| **3. Document Types by Stage** | ❌ Missing | Need seed data for all 7 stages |
| - Pre-Project/Concept | ❌ | Need document type definitions |
| - Initiation | ❌ | Need document type definitions |
| - Planning | ❌ | Need document type definitions |
| - Delivery/Execution | ❌ | Need document type definitions |
| - Stage Boundary | ❌ | Need document type definitions |
| - Closure | ❌ | Need document type definitions |
| - Post-Project/Benefits | ❌ | Need document type definitions |
| **4. Programme-Level Governance** | ❌ Missing | Need aggregation views |
| - Roll-up compliance | ❌ | Need SQL view/function |
| - Cross-project gaps | ❌ | Need query logic |
| - Audit readiness | ❌ | Need compliance calculation |
| **5. Audit & Compliance** | ⚠️ Partial | Audit table exists, need logging hooks |
| - Document status changes | ❌ | Need triggers |
| - Approvals/rejections | ❌ | Need triggers |
| - Stage gate blocks | ❌ | Need triggers |
| - Escalations | ⚠️ | Exception table exists |

**Summary**: ~90% of the Document Governance functionality is missing and must be built from scratch.

---

## C. Implementation Plan (Incremental, Commit-Friendly)

### Phase 1: Database Foundation (SQL)
**Goal**: Create all required tables, views, and functions for document governance

#### Step 1.1: Create Core Document Tables
- Create `document_governance_stages` lookup table (7 stages)
- Create `document_types` table with mandatory flag
- Create `project_documents` table with full metadata (including file storage fields)
- Create `document_versions` table for version history
- Create `programme_documents` table (optional extension)
- Add indexes for performance
- Add RLS policies (PMO admin only can modify)

#### Step 1.2: Seed Document Types
- Insert mandatory document types for Pre-Project/Concept stage (4 docs)
- Insert optional document types for Pre-Project/Concept stage (3 docs)
- Insert mandatory document types for Initiation stage (4 docs)
- Insert optional document types for Initiation stage (2 docs)
- Insert mandatory document types for Planning stage (4 docs)
- Insert optional document types for Planning stage (2 docs)
- Insert mandatory document types for Delivery stage (3 docs)
- Insert optional document types for Delivery stage (3 docs)
- Insert mandatory document types for Stage Boundary stage (3 docs)
- Insert optional document types for Stage Boundary stage (1 doc)
- Insert mandatory document types for Closure stage (4 docs)
- Insert optional document types for Closure stage (1 doc)
- Insert mandatory document types for Post-Project stage (2 docs)
- Insert optional document types for Post-Project stage (1 doc)

#### Step 1.3: Create Compliance Check Functions
- Function: `check_project_document_compliance(project_id, stage)` - Returns missing mandatory docs
- Function: `check_stage_gate_document_requirements(stage_boundary_id)` - Validates gate can be approved
- Function: `get_programme_document_compliance(programme_id)` - Roll up across projects
- Trigger: Auto-update stage_boundaries status when docs change

#### Step 1.4: Create Database Views
- View: `pmo_document_compliance_view` - Project-level compliance summary
- View: `programme_document_rollup_view` - Programme-level aggregation
- View: `overdue_document_approvals_view` - Documents pending approval

#### Step 1.5: Setup Supabase Storage
- Create `project-documents` storage bucket with public/private access control
- Create `programme-documents` storage bucket
- Configure bucket RLS policies:
  - PMO Admin: full access (upload, download, delete)
  - Project Manager: upload/download own project documents only
  - Executive: download assigned project documents only
- Configure allowed MIME types:
  - Documents: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx), `text/markdown`
  - Images: `image/png`, `image/jpeg`, `image/tiff`, `image/gif`
  - Others: `application/zip`, `text/plain`
- Set file size limits (50MB per file, 500MB per project)
- Create folder structure: `{project_id}/{document_type_id}/{version}/filename.ext`

**Deliverables**:
- `SQL/v146_document_governance_tables.sql`
- `SQL/v147_document_types_seed_data.sql`
- `SQL/v148_document_compliance_functions.sql`
- `SQL/v149_document_governance_views.sql`
- `SQL/v150_supabase_storage_setup.sql` (Storage bucket creation + RLS policies)

---

### Phase 2: Backend Service Layer
**Goal**: Implement JavaScript service functions for document CRUD and compliance checks

#### Step 2.1: Create Document Storage Service
- Create `src/services/documentStorageService.js`
- Implement `uploadDocument(file, projectId, documentTypeId)` - Upload file to Supabase Storage
- Implement `downloadDocument(documentId)` - Generate signed URL for download
- Implement `deleteDocument(documentId, version)` - Soft delete document version
- Implement `createDocumentVersion(documentId, file)` - Upload new version
- Implement `getDocumentVersions(documentId)` - Fetch version history
- Implement `getDocumentPreviewUrl(documentId)` - Generate preview URL for supported formats
- Implement `validateFile(file)` - Validate file type, size, and name
- Implement `calculateStorageUsage(projectId)` - Calculate total storage used by project

#### Step 2.2: Create Document Governance Service
- Create `src/services/documentGovernanceService.js`
- Implement `getDocumentTypes(stage, isMandatory)` - Fetch document types
- Implement `getProjectDocuments(projectId, stage)` - Fetch project documents with file metadata
- Implement `createProjectDocument(documentData, file)` - Add new document with optional file upload
- Implement `updateProjectDocument(documentId, updates)` - Update document metadata
- Implement `updateDocumentStatus(documentId, newStatus)` - Change document status with audit log
- Implement `submitDocumentForApproval(documentId)` - Submit document to approver
- Implement `approveDocument(documentId, approverId, comments)` - Approve document
- Implement `rejectDocument(documentId, approverId, reason)` - Reject document
- Implement `getDocumentComplianceStatus(projectId, stage)` - Check compliance
- Implement `getProgrammeDocumentCompliance(programmeId)` - Programme rollup

#### Step 2.3: Enhance Stage Gate Service
- Update `src/services/stageGateService.js` (if not exists, create it)
- Add `checkStageGateDocumentCompliance(stageGateId)` - Validate documents before approval
- Add `blockStageGate(stageGateId, reason)` - Block gate if docs missing
- Add `raiseDocumentComplianceException(projectId, details)` - Auto-raise exception

#### Step 2.4: Add Audit Logging Hooks
- Update `src/services/governanceService.js`
- Add `logDocumentStatusChange(documentId, oldStatus, newStatus, actorUserId)`
- Add `logDocumentApproval(documentId, approverUserId, decision)`
- Add `logDocumentUpload(documentId, fileName, fileSize, actorUserId)`
- Add `logDocumentDownload(documentId, actorUserId)`
- Add `logDocumentVersionCreated(documentId, version, actorUserId)`
- Add `logStageGateBlock(stageGateId, reason, actorUserId)`

**Deliverables**:
- `src/services/documentStorageService.js` (new)
- `src/services/documentGovernanceService.js` (new)
- `src/services/stageGateService.js` (new or enhanced)
- Updated `src/services/governanceService.js`

---

### Phase 3: Frontend Components
**Goal**: Build UI components for PMO document register and compliance tracking

#### Step 3.1: File Upload Components
- Create `src/components/app/dashboard/FileUploadDropzone.jsx`
- Drag-and-drop file upload area
- Support multiple file selection
- Real-time upload progress indicator
- File type validation (client-side)
- File size validation (max 50MB)
- Preview thumbnail for images before upload
- Cancel upload functionality

#### Step 3.2: Document Register Component
- Create `src/components/app/dashboard/DocumentRegister.jsx`
- Display documents grouped by stage
- Show mandatory vs optional indicators
- Display status badges (Not Started, Draft, Submitted, Approved, Rejected)
- Show owner and approver columns
- Show file size and file type icons
- Add "Upload" button with file picker
- Add "Download" button for each document
- Add "View Versions" button to see version history
- Add filter by stage, status, mandatory flag
- Add search functionality (by document name, owner, approver)
- Support sorting by stage, status, approval date, upload date

#### Step 3.3: Document Compliance Dashboard
- Create `src/components/app/dashboard/DocumentComplianceDashboard.jsx`
- Show overall compliance percentage
- Display missing mandatory documents (RED alert)
- Display pending approvals (AMBER warning)
- Display overdue documents
- Show compliance breakdown by stage
- Add "Quick Actions" for PMO (raise exception, contact PM)
- Show storage usage per project

#### Step 3.4: Stage-Based Document Grouping
- Create `src/components/app/dashboard/StageDocumentGroup.jsx`
- Group documents by stage (accordion or tabs)
- Show stage compliance status (Green/Amber/Red)
- Display document checklist for each stage
- Highlight missing mandatory documents
- Show upload count vs required count

#### Step 3.5: Programme Document Rollup
- Create `src/components/app/dashboard/ProgrammeDocumentCompliance.jsx`
- Show programme-level compliance summary
- List all projects in programme with compliance status
- Highlight cross-project document gaps
- Display audit readiness indicator
- Show total storage usage for programme

#### Step 3.6: Document Preview Component
- Create `src/components/app/dashboard/DocumentPreview.jsx`
- Preview PDF files inline (using react-pdf or pdf.js)
- Preview images (PNG, JPEG, TIFF) with zoom/pan
- Preview Markdown files with rendered HTML
- Show "Download" button for non-previewable formats (docx, xlsx)
- Support full-screen preview mode

#### Step 3.7: Version History Component
- Create `src/components/app/dashboard/DocumentVersionHistory.jsx`
- List all versions of a document (newest first)
- Show version number, upload date, uploaded by user
- Show file size for each version
- Allow download of any previous version
- Highlight current/active version
- Show diff/changes between versions (if applicable)

#### Step 3.8: Document Status Management Modal
- Create `src/components/app/dashboard/DocumentStatusModal.jsx`
- Allow PMO to update document status
- Add comments field for status changes
- Validate status transitions (e.g., can't go from Rejected to Approved without re-submission)
- Show audit trail for document
- Allow uploading new version when status changes

**Deliverables**:
- `src/components/app/dashboard/FileUploadDropzone.jsx`
- `src/components/app/dashboard/DocumentRegister.jsx`
- `src/components/app/dashboard/DocumentComplianceDashboard.jsx`
- `src/components/app/dashboard/StageDocumentGroup.jsx`
- `src/components/app/dashboard/ProgrammeDocumentCompliance.jsx`
- `src/components/app/dashboard/DocumentPreview.jsx`
- `src/components/app/dashboard/DocumentVersionHistory.jsx`
- `src/components/app/dashboard/DocumentStatusModal.jsx`

---

### Phase 4: Integration & Routing
**Goal**: Wire up components to routes and integrate with existing PMO dashboard

#### Step 4.1: Create Document Governance Pages
- Create `src/pages/platform-app/DocumentGovernance.jsx` - Main page
- Create `src/pages/platform-app/DocumentRegister.jsx` - Full register view
- Create `src/pages/platform-app/DocumentCompliance.jsx` - Compliance dashboard
- Create `src/pages/platform-app/ProgrammeDocuments.jsx` - Programme rollup

#### Step 4.2: Update Menu Configuration
- Update `src/config/pmMenuConfig.js`
- Add "Document Governance" submenu under "Governance" section:
  - Document Register
  - Compliance Dashboard
  - Programme Documents
- Add "Document Governance" link to "PMO Admin" section

#### Step 4.3: Update PMO Dashboard
- Update `src/pages/Dashboard.jsx` (PMO role)
- Add "Document Compliance" widget to PMO control strip
- Show count of:
  - Missing mandatory documents
  - Pending approvals
  - Overdue documents
  - Projects with compliance issues

#### Step 4.4: Integrate with Stage Gate Oversight
- Update `src/components/app/dashboard/StageGateOversight.jsx`
- Add "Document Compliance" column to stage gate list
- Show RED indicator if mandatory docs missing
- Add click action to view document checklist
- Block gate approval button if compliance check fails

**Deliverables**:
- 4 new page files in `src/pages/platform-app/`
- Updated `src/config/pmMenuConfig.js`
- Updated `src/pages/Dashboard.jsx`
- Updated `src/components/app/dashboard/StageGateOversight.jsx`

---

### Phase 5: RLS Policies & Security
**Goal**: Ensure role-based access control for document governance

#### Step 5.1: Create RLS Policies
- Policy: PMO Admin can SELECT, INSERT, UPDATE on `document_types`
- Policy: PMO Admin can SELECT, INSERT, UPDATE on `project_documents`
- Policy: Project Manager can SELECT on `project_documents` (own projects only)
- Policy: Executive can SELECT on `project_documents` (assigned projects only)
- Policy: PMO Admin can SELECT, INSERT on `programme_documents`
- Policy: Programme Manager can SELECT on `programme_documents` (own programme only)

#### Step 5.2: Add Frontend Permission Checks
- Add permission check in `ProtectedRoute` for document governance routes
- Require `governance.admin` or `pmo.admin` permission
- Hide document governance menu items if user lacks permission

**Deliverables**:
- `SQL/v150_document_governance_rls_policies.sql`
- Updated `src/components/ProtectedRoute.jsx`

---

### Phase 6: Testing & Documentation
**Goal**: Ensure quality and provide user/developer documentation

#### Step 6.1: Unit Tests
- Test `documentGovernanceService.js` functions
- Test compliance check functions
- Test stage gate blocking logic
- Test programme rollup calculations

#### Step 6.2: Integration Tests
- Test full document lifecycle (create → submit → approve)
- Test stage gate blocking when docs missing
- Test exception auto-raising
- Test programme rollup accuracy

#### Step 6.3: User Documentation
- Create `Documentation/PMO_Document_Governance_User_Guide.md`
- Document workflow for:
  - Adding documents to projects
  - Updating document status
  - Approving documents
  - Viewing compliance dashboard
  - Programme-level reporting

#### Step 6.4: Developer Documentation
- Create `Documentation/Document_Governance_Technical_Guide.md`
- Document database schema
- Document service functions
- Document RLS policies
- Document integration points

**Deliverables**:
- `src/services/__tests__/documentGovernanceService.test.js`
- `src/test/integration/documentGovernanceFlow.test.js`
- `Documentation/PMO_Document_Governance_User_Guide.md`
- `Documentation/Document_Governance_Technical_Guide.md`

---

## D. Todo Checklist

### Phase 1: Database Foundation ✅
- [x] Create `document_governance_stages` lookup table
- [x] Create `document_types` table
- [x] Create `project_documents` table with file storage fields
- [x] Create `document_versions` table for version history
- [x] Create `programme_documents` table
- [x] Add indexes for performance (including file_path, storage_type)
- [x] Seed document types for all 7 stages (35+ document types)
- [x] Create `check_project_document_compliance()` function
- [x] Create `check_stage_gate_document_requirements()` function
- [x] Create `get_programme_document_compliance()` function
- [x] Create `pmo_document_compliance_view` view
- [x] Create `programme_document_rollup_view` view
- [x] Create `overdue_document_approvals_view` view
- [x] Setup Supabase Storage buckets (project-documents, programme-documents)
- [x] Configure Storage RLS policies for file access control
- [x] Configure allowed MIME types and file size limits

### Phase 2: Backend Service Layer ✅
- [x] Create `documentStorageService.js`
- [x] Implement `uploadDocument()` - Upload file to Supabase Storage
- [x] Implement `downloadDocument()` - Generate signed URL
- [x] Implement `deleteDocument()` - Soft delete document version
- [x] Implement `createDocumentVersion()` - Upload new version
- [x] Implement `getDocumentVersions()` - Fetch version history
- [x] Implement `getDocumentPreviewUrl()` - Generate preview URL
- [x] Implement `validateFile()` - Validate file type and size
- [x] Implement `calculateStorageUsage()` - Calculate storage used
- [x] Create `documentGovernanceService.js`
- [x] Implement `getDocumentTypes()`
- [x] Implement `getProjectDocuments()` with file metadata
- [x] Implement `createProjectDocument()` with optional file upload
- [x] Implement `updateProjectDocument()`
- [x] Implement `updateDocumentStatus()`
- [x] Implement `submitDocumentForApproval()`
- [x] Implement `approveDocument()`
- [x] Implement `rejectDocument()`
- [x] Implement `getDocumentComplianceStatus()`
- [x] Implement `getProgrammeDocumentCompliance()`
- [x] Create/enhance `stageGateService.js`
- [x] Implement `checkStageGateDocumentCompliance()`
- [x] Implement `blockStageGate()`
- [x] Implement `raiseDocumentComplianceException()`
- [x] Add audit logging hooks to `governanceService.js` (including file operations)

### Phase 3: Frontend Components ✅
- [x] Create `FileUploadDropzone.jsx` component (drag-and-drop upload)
- [x] Create `DocumentRegister.jsx` component with file upload/download
- [x] Create `DocumentComplianceDashboard.jsx` component with storage usage
- [x] Create `StageDocumentGroup.jsx` component with upload count
- [x] Create `ProgrammeDocumentCompliance.jsx` component with total storage
- [x] Create `DocumentPreview.jsx` component (PDF, images, markdown preview)
- [x] Create `DocumentVersionHistory.jsx` component (version list with download)
- [x] Create `DocumentStatusModal.jsx` component with version upload capability

### Phase 4: Integration & Routing ✅
- [x] Create `DocumentGovernance.jsx` page
- [x] Create `DocumentRegister.jsx` page
- [x] Create `DocumentCompliance.jsx` page
- [x] Create `ProgrammeDocuments.jsx` page
- [x] Update `pmMenuConfig.js` with Document Governance menu
- [x] Update PMO Dashboard with compliance widget
- [x] Integrate with `StageGateOversight.jsx`

### Phase 5: RLS Policies & Security ✅
- [x] Create RLS policies for `document_types` table
- [x] Create RLS policies for `project_documents` table
- [x] Create RLS policies for `document_versions` table
- [x] Create RLS policies for `programme_documents` table
- [x] Create Storage RLS policies for `project-documents` bucket
- [x] Create Storage RLS policies for `programme-documents` bucket
- [x] Add permission checks in frontend routes (via existing ProtectedRoute component)
- [ ] Add file upload virus scanning (optional - out of scope for MVP)

### Phase 6: Testing & Documentation ✅
- [x] Write unit tests for `documentStorageService.js` (upload, download, version)
- [x] Write unit tests for `documentGovernanceService.js`
- [x] Write integration tests for document lifecycle (create → upload → submit → approve)
- [x] Write integration tests for version control (upload v1 → upload v2 → rollback)
- [x] Write integration tests for file preview (PDF, images, markdown)
- [x] Create user documentation with file upload/download guide
- [x] Create technical documentation with Storage architecture

---

## E. File Storage & Supported Formats

### Supabase Storage Architecture
- **Bucket**: `project-documents` (private with RLS)
- **Bucket**: `programme-documents` (private with RLS)
- **Folder Structure**: `{project_id}/{document_type_id}/{version}/filename.ext`
- **File Size Limits**: 50MB per file, 500MB per project, 5GB per programme
- **Total Storage**: Configured based on Supabase plan (25GB default, expandable)

### Supported File Types

#### Document Formats
| File Type | MIME Type | Extension | Preview Support |
|-----------|-----------|-----------|-----------------|
| PDF | `application/pdf` | `.pdf` | ✅ Yes (in-app preview) |
| Word Document | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` | ❌ Download only |
| Word (Legacy) | `application/msword` | `.doc` | ❌ Download only |
| Excel Spreadsheet | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` | ❌ Download only |
| Excel (Legacy) | `application/vnd.ms-excel` | `.xls` | ❌ Download only |
| Markdown | `text/markdown` | `.md` | ✅ Yes (rendered HTML) |
| Plain Text | `text/plain` | `.txt` | ✅ Yes |

#### Image Formats
| File Type | MIME Type | Extension | Preview Support |
|-----------|-----------|-----------|-----------------|
| PNG | `image/png` | `.png` | ✅ Yes (zoom/pan) |
| JPEG | `image/jpeg` | `.jpg`, `.jpeg` | ✅ Yes (zoom/pan) |
| TIFF | `image/tiff` | `.tiff`, `.tif` | ✅ Yes (zoom/pan) |
| GIF | `image/gif` | `.gif` | ✅ Yes |
| SVG | `image/svg+xml` | `.svg` | ✅ Yes |

#### Archive Formats
| File Type | MIME Type | Extension | Preview Support |
|-----------|-----------|-----------|-----------------|
| ZIP | `application/zip` | `.zip` | ❌ Download only |
| RAR | `application/x-rar-compressed` | `.rar` | ❌ Download only |

#### Other Formats
| File Type | MIME Type | Extension | Preview Support |
|-----------|-----------|-----------|-----------------|
| PowerPoint | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `.pptx` | ❌ Download only |
| CSV | `text/csv` | `.csv` | ✅ Yes (table view) |
| JSON | `application/json` | `.json` | ✅ Yes (formatted) |

### File Validation Rules
1. **File Size**: Max 50MB per file (frontend + backend validation)
2. **File Type**: Only allowed MIME types (whitelist approach)
3. **File Name**: Max 255 characters, no special characters except `-`, `_`, `.`
4. **Virus Scan**: Optional integration with ClamAV or VirusTotal API
5. **Duplicate Detection**: Check MD5/SHA256 hash to prevent duplicate uploads

### File Naming Convention
- Original filename is preserved in `file_name` field
- Storage path follows: `{project_id}/{document_type_id}/{version}/{uuid}_{filename}`
- UUID prefix prevents filename collisions
- Example: `abc123/def456/1/550e8400-e29b-41d4-a716-446655440000_PID_Final.pdf`

### Version Control Strategy
1. **Auto-versioning**: Every file upload creates a new version (v1, v2, v3, ...)
2. **Version Retention**: All versions are retained indefinitely (soft delete only)
3. **Current Version**: Latest uploaded version is marked as `is_current = TRUE`
4. **Rollback**: Users can "activate" any previous version (copies to new version)
5. **Storage Optimization**: Duplicate file detection prevents redundant storage

---

## F. Data Model

### Table: `document_governance_stages`
```sql
id UUID PRIMARY KEY
stage_code VARCHAR(50) UNIQUE -- 'pre_project', 'initiation', 'planning', 'delivery', 'stage_boundary', 'closure', 'post_project'
stage_name VARCHAR(200)
stage_description TEXT
stage_order INTEGER
is_active BOOLEAN
```

### Table: `document_types`
```sql
id UUID PRIMARY KEY
name VARCHAR(255) -- 'Project Initiation Document (PID)'
stage_code VARCHAR(50) REFERENCES document_governance_stages(stage_code)
is_mandatory BOOLEAN -- TRUE for mandatory, FALSE for optional
description TEXT
category VARCHAR(100) -- 'governance', 'planning', 'delivery', 'quality', 'closure'
template_url TEXT -- Optional: link to document template
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Table: `project_documents`
```sql
id UUID PRIMARY KEY
project_id UUID REFERENCES projects(id) ON DELETE CASCADE
document_type_id UUID REFERENCES document_types(id)
status VARCHAR(50) -- 'not_started', 'draft', 'submitted', 'approved', 'rejected'
owner_user_id UUID REFERENCES users(id) -- Document owner (usually PM)
approver_user_id UUID REFERENCES users(id) -- Document approver (usually Executive/Board)
approval_date TIMESTAMP
submission_date TIMESTAMP
rejection_date TIMESTAMP
rejection_reason TEXT

-- File Storage Fields (NEW)
storage_type VARCHAR(20) DEFAULT 'supabase' -- 'supabase', 'external_link'
file_path TEXT -- Path in Supabase Storage: {project_id}/{document_type_id}/{version}/filename.ext
file_name VARCHAR(255) -- Original filename
file_size BIGINT -- File size in bytes
file_type VARCHAR(100) -- MIME type (e.g., 'application/pdf')
file_extension VARCHAR(10) -- File extension (e.g., 'pdf', 'docx')
external_url TEXT -- External link (if storage_type = 'external_link')
current_version INTEGER DEFAULT 1 -- Current version number

document_version VARCHAR(50) -- Optional version label (e.g., 'v1.0', 'Final')
comments TEXT -- PMO comments
notes TEXT -- Internal notes
created_at TIMESTAMP
created_by UUID REFERENCES users(id)
updated_at TIMESTAMP
updated_by UUID REFERENCES users(id)
is_deleted BOOLEAN
deleted_at TIMESTAMP
deleted_by UUID REFERENCES users(id)
```

### Table: `document_versions` (NEW)
```sql
id UUID PRIMARY KEY
project_document_id UUID REFERENCES project_documents(id) ON DELETE CASCADE
version_number INTEGER NOT NULL -- Version sequence (1, 2, 3, ...)
version_label VARCHAR(50) -- Optional label (e.g., 'Draft', 'v1.0', 'Final')

-- File Storage Fields
file_path TEXT NOT NULL -- Path in Supabase Storage
file_name VARCHAR(255) NOT NULL -- Original filename
file_size BIGINT NOT NULL -- File size in bytes
file_type VARCHAR(100) -- MIME type
file_extension VARCHAR(10) -- File extension

-- Version Metadata
upload_date TIMESTAMP DEFAULT NOW()
uploaded_by UUID REFERENCES users(id)
change_summary TEXT -- Summary of changes in this version
is_current BOOLEAN DEFAULT FALSE -- TRUE for current/active version

-- Audit Fields
created_at TIMESTAMP DEFAULT NOW()
created_by UUID REFERENCES users(id)
is_deleted BOOLEAN DEFAULT FALSE
deleted_at TIMESTAMP
deleted_by UUID REFERENCES users(id)

-- Constraints
UNIQUE(project_document_id, version_number)
```

### Table: `programme_documents` (Optional Extension)
```sql
id UUID PRIMARY KEY
programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE
document_type_id UUID REFERENCES document_types(id)
status VARCHAR(50)
owner_user_id UUID
approver_user_id UUID
approval_date TIMESTAMP
document_url TEXT
comments TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
is_deleted BOOLEAN
```

---

## F. Acceptance Criteria (Mapped to PRD)

### 1. Document Register (PMO-Owned) ✅
- [x] PMO can view all documents for all projects
- [x] Documents are grouped by stage
- [x] Mandatory flag is clearly visible
- [x] Status is displayed with color coding
- [x] Owner and approver are shown
- [x] Approval date is tracked
- [x] External document link is captured (optional)
- [x] **File upload to Supabase Storage is supported**
- [x] **File download with signed URLs works**
- [x] **File type icons are displayed (PDF, Word, Excel, etc.)**
- [x] **File size is shown for each document**
- [x] **Version history is accessible for each document**
- [x] **Current version is clearly indicated**
- [x] Comments field is available
- [x] PMO can filter by stage, status, project, file type
- [x] PMO can search documents by name, owner, approver

### 2. Stage Gate Enforcement ✅
- [x] Stage gate approval checks for mandatory documents
- [x] Gate is BLOCKED if mandatory documents are missing
- [x] Gate is BLOCKED if mandatory documents are not approved
- [x] Compliance exception is auto-raised when gate is blocked
- [x] Exception includes details of missing/unapproved documents
- [x] PMO receives notification of blocked gate

### 3. Document Types by Stage ✅
- [x] All 7 stages are supported
- [x] Pre-Project/Concept: 4 mandatory + 3 optional docs defined
- [x] Initiation: 4 mandatory + 2 optional docs defined
- [x] Planning: 4 mandatory + 2 optional docs defined
- [x] Delivery: 3 mandatory + 3 optional docs defined
- [x] Stage Boundary: 3 mandatory + 1 optional doc defined
- [x] Closure: 4 mandatory + 1 optional doc defined
- [x] Post-Project: 2 mandatory + 1 optional doc defined

### 4. Programme-Level Governance ✅
- [x] PMO can view document compliance by programme
- [x] Programme rollup shows compliance across all projects
- [x] Cross-project document gaps are highlighted
- [x] Programme audit readiness indicator is displayed
- [x] Programme manager can view own programme's documents

### 5. Audit & Compliance ✅
- [x] Document status changes are logged to `audit_trails`
- [x] Approvals are logged with approver ID and timestamp
- [x] Rejections are logged with reason
- [x] Stage gate blocks are logged
- [x] Escalations/exceptions are logged
- [x] **File uploads are logged with filename and size**
- [x] **File downloads are logged with user ID**
- [x] **Version creations are logged**
- [x] PMO can view audit trail filtered by document

### 6. File Storage & Version Control ✅
- [x] Files can be uploaded via drag-and-drop or file picker
- [x] File upload shows real-time progress indicator
- [x] File type validation prevents invalid formats
- [x] File size validation prevents files over 50MB
- [x] Files are stored in Supabase Storage with proper folder structure
- [x] File download generates time-limited signed URLs (1 hour expiry)
- [x] Version history shows all versions with metadata
- [x] Users can download any previous version
- [x] Current version is clearly marked
- [x] New versions auto-increment (v1, v2, v3, ...)
- [x] File preview works for supported formats (PDF, images, markdown)
- [x] Storage usage is tracked per project and programme
- [x] Storage limits are enforced (50MB per file, 500MB per project)

---

## G. Performance Requirements

### Query Performance
- Document register query: < 2 seconds for 1000+ documents
- Compliance check query: < 1 second per project
- Programme rollup query: < 3 seconds for 100+ projects
- Audit log query: < 2 seconds for 10000+ entries

### Database Optimization
- Index on `project_documents(project_id, document_type_id, status)`
- Index on `project_documents(status)` for compliance queries
- Index on `document_types(stage_code, is_mandatory)` for stage filtering
- Materialized view for programme rollup (refresh on document status change)

### Frontend Optimization
- Pagination for document register (50 documents per page)
- Lazy loading for programme rollup
- Debounced search (300ms delay)
- Cached document types (localStorage, 1 hour TTL)

---

## H. Non-Functional Requirements

### Security
- All document tables protected by RLS
- PMO Admin required for write operations
- Audit trail is immutable (INSERT only, no UPDATE/DELETE)
- Document URLs are validated (no script injection)

### Usability
- Mobile-responsive design (PWA-optimized)
- Dark mode support (default)
- Keyboard navigation support
- Screen reader friendly (ARIA labels)

### Reliability
- Database constraints prevent orphaned documents
- Foreign key cascades handle project/programme deletion
- Soft deletes preserve audit trail
- Transaction support for multi-table updates

---

## I. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing stage gates don't support blocking | High | Add `is_blocked` field and `blocked_reason` to `stage_boundaries` table |
| Performance degradation with many documents | Medium | Implement pagination, indexing, and caching |
| Users bypass system by manually approving gates | High | Enforce compliance checks in backend, not just frontend |
| Document URLs become invalid over time | Low | Add validation check and warning system |
| RLS policies too restrictive | Medium | Implement role-based policies with proper testing |

---

## J. Dependencies

### External Dependencies
- No external document storage (metadata only)
- External document links (SharePoint, Google Drive, etc.) - user-provided

### Internal Dependencies
- Existing `stage_boundaries` table (v10)
- Existing `projects` table
- Existing `programmes` table (v37)
- Existing `users` table
- Existing `audit_trails` table
- Existing `exceptions` table (v145)

---

## K. Rollout Strategy

### Phase 1 (Week 1): Database + Backend
- Deploy database tables and functions
- Deploy service layer
- Test compliance checks manually

### Phase 2 (Week 2): Frontend Components
- Deploy UI components
- Wire up to routes
- Test with real data

### Phase 3 (Week 3): Integration + Testing
- Integrate with PMO dashboard
- Integrate with stage gate system
- Run full end-to-end tests

### Phase 4 (Week 4): Documentation + Training
- Complete user documentation
- Complete technical documentation
- Train PMO team on new features

---

## L. Success Metrics

### Adoption Metrics
- 100% of projects have document register populated within 1 month
- 90% of mandatory documents are tracked
- 80% of stage gates have document compliance checks enabled

### Quality Metrics
- Zero stage approvals without mandatory documents (enforced)
- 50% reduction in audit findings related to missing documents
- 100% of document status changes are logged

### Performance Metrics
- Document register loads in < 2 seconds
- Compliance checks complete in < 1 second
- Programme rollup loads in < 3 seconds

---

## M. Review & Sign-Off

### Implementation Review
- [ ] Database schema approved
- [ ] Service layer design approved
- [ ] UI/UX design approved
- [ ] RLS policies reviewed
- [ ] Performance benchmarks met

### User Acceptance Testing
- [ ] PMO team completes UAT
- [ ] Document register is usable
- [ ] Stage gate blocking works correctly
- [ ] Programme rollup is accurate
- [ ] Audit trail is complete

### Production Deployment
- [ ] Database migrations run successfully
- [ ] Frontend deployed to production
- [ ] No breaking changes to existing features
- [ ] Rollback plan tested

---

## N. Appendices

### Appendix A: Document Type Mapping
See PRD Section 4 for complete list of document types by stage.

### Appendix B: Status Workflow
```
not_started → draft → submitted → approved
                              ↓
                          rejected → draft (re-submit)
```

### Appendix C: Compliance Rules
1. Mandatory document missing = Gate BLOCKED
2. Mandatory document not approved = Gate BLOCKED
3. Optional document missing = Gate OK (warning only)
4. Optional document rejected = Gate OK (no impact)

---

## O. Notes & Assumptions

### Assumptions
1. Documents are stored externally (SharePoint, Google Drive, etc.)
2. PMO is responsible for metadata capture, not document authoring
3. Stage gate system already exists and is functional
4. Audit trail table exists and is working
5. Programme table exists (from v37)

### Out of Scope
- Document content editing (in-app word processor/editor)
- Real-time collaboration on documents (Google Docs-style)
- Document templates/generation (auto-creating documents from templates)
- Automated document parsing/data extraction
- Advanced version comparison (text-level diff for Word/Excel documents)

---

**END OF IMPLEMENTATION PLAN**
