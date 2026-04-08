# Document Governance Technical Guide

## Overview

This technical guide provides detailed information about the PMO Document Governance module architecture, database schema, API functions, and integration points for developers and system administrators.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Storage Architecture](#storage-architecture)
4. [Service Layer](#service-layer)
5. [RLS Policies](#rls-policies)
6. [API Functions](#api-functions)
7. [Integration Points](#integration-points)
8. [Performance Considerations](#performance-considerations)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Document Governance module consists of:

1. **Database Layer**: PostgreSQL tables, views, and functions
2. **Storage Layer**: Supabase Storage buckets for file storage
3. **Service Layer**: JavaScript services for business logic
4. **Frontend Layer**: React components for UI
5. **RLS Layer**: Row-level security policies for access control

### Component Diagram

```
┌─────────────────┐
│  Frontend UI    │
│  (React)        │
└────────┬────────┘
         │
┌────────▼────────┐
│  Service Layer  │
│  (JavaScript)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│  DB   │ │ Storage │
│(PostgreSQL)│(Supabase)│
└───────┘ └─────────┘
```

---

## Database Schema

### Core Tables

#### `document_governance_stages`

Lookup table for project stages.

```sql
CREATE TABLE document_governance_stages (
    id UUID PRIMARY KEY,
    stage_code VARCHAR(50) UNIQUE,
    stage_name VARCHAR(200),
    stage_description TEXT,
    stage_order INTEGER,
    is_active BOOLEAN,
    is_deleted BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Stages:**
- `pre_project` - Pre-Project/Concept
- `initiation` - Initiation
- `planning` - Planning
- `delivery` - Delivery/Execution
- `stage_boundary` - Stage Boundary
- `closure` - Closure
- `post_project` - Post-Project/Benefits

#### `document_types`

Defines document types for each stage.

```sql
CREATE TABLE document_types (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    stage_code VARCHAR(50) REFERENCES document_governance_stages(stage_code),
    is_mandatory BOOLEAN,
    description TEXT,
    category VARCHAR(100),
    template_url TEXT,
    is_active BOOLEAN,
    is_deleted BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `project_documents`

Tracks document metadata for projects.

```sql
CREATE TABLE project_documents (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    document_type_id UUID REFERENCES document_types(id),
    status VARCHAR(50), -- 'not_started', 'draft', 'submitted', 'approved', 'rejected'
    owner_user_id UUID REFERENCES users(id),
    approver_user_id UUID REFERENCES users(id),
    approval_date TIMESTAMP,
    submission_date TIMESTAMP,
    rejection_date TIMESTAMP,
    rejection_reason TEXT,
    
    -- File Storage Fields
    storage_type VARCHAR(20) DEFAULT 'supabase', -- 'supabase' or 'external_link'
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    file_extension VARCHAR(10),
    external_url TEXT,
    current_version INTEGER DEFAULT 1,
    
    -- Metadata
    document_version VARCHAR(50),
    comments TEXT,
    notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP,
    updated_by UUID,
    is_deleted BOOLEAN,
    deleted_at TIMESTAMP
);
```

#### `document_versions`

Tracks version history for documents.

```sql
CREATE TABLE document_versions (
    id UUID PRIMARY KEY,
    project_document_id UUID REFERENCES project_documents(id),
    version_number INTEGER NOT NULL,
    version_label VARCHAR(50),
    
    -- File Storage Fields
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    file_extension VARCHAR(10),
    
    -- Version Metadata
    upload_date TIMESTAMP DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    change_summary TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    
    -- Audit Fields
    created_at TIMESTAMP,
    created_by UUID,
    is_deleted BOOLEAN,
    deleted_at TIMESTAMP,
    
    UNIQUE(project_document_id, version_number)
);
```

#### `programme_documents`

Tracks programme-level documents.

```sql
CREATE TABLE programme_documents (
    id UUID PRIMARY KEY,
    programme_id UUID REFERENCES programmes(id),
    document_type_id UUID REFERENCES document_types(id),
    status VARCHAR(50),
    owner_user_id UUID,
    approver_user_id UUID,
    approval_date TIMESTAMP,
    document_url TEXT,
    comments TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN
);
```

### Database Views

#### `pmo_document_compliance_view`

Project-level compliance summary.

```sql
CREATE VIEW pmo_document_compliance_view AS
SELECT 
    p.id AS project_id,
    p.project_name,
    COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE) AS total_mandatory,
    COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status = 'approved') AS approved_mandatory,
    COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status != 'approved') AS unapproved_mandatory,
    COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.id IS NULL) AS missing_mandatory
FROM projects p
CROSS JOIN document_types dt
LEFT JOIN project_documents pd ON p.id = pd.project_id AND dt.id = pd.document_type_id
WHERE p.is_deleted = FALSE
  AND dt.is_deleted = FALSE
GROUP BY p.id, p.project_name;
```

#### `programme_document_rollup_view`

Programme-level compliance aggregation.

#### `overdue_document_approvals_view`

Documents pending approval past due date.

### Database Functions

#### `check_project_document_compliance(project_id, stage_code)`

Returns missing or unapproved mandatory documents for a project/stage.

**Returns:**
- `document_type_id`
- `document_type_name`
- `stage_code`
- `is_mandatory`
- `document_status`
- `is_missing`
- `is_not_approved`

#### `check_stage_gate_document_requirements(stage_boundary_id)`

Validates if a stage gate can be approved based on document compliance.

**Returns:**
- `can_approve` (BOOLEAN)
- `blocking_reason` (TEXT)
- `missing_documents_count` (INTEGER)
- `unapproved_documents_count` (INTEGER)
- `missing_documents` (JSONB)
- `unapproved_documents` (JSONB)

#### `get_programme_document_compliance(programme_id)`

Returns programme-level compliance rollup.

---

## Storage Architecture

### Supabase Storage Buckets

#### `project-documents`

- **Type**: Private bucket
- **Purpose**: Store project document files
- **RLS**: Enabled with role-based policies
- **File Size Limit**: 50MB per file
- **Total Limit**: 500MB per project

#### `programme-documents`

- **Type**: Private bucket
- **Purpose**: Store programme-level document files
- **RLS**: Enabled with role-based policies
- **File Size Limit**: 50MB per file
- **Total Limit**: 5GB per programme

### Folder Structure

```
project-documents/
  {project_id}/
    {document_type_id}/
      {version}/
        {uuid}_{filename}
```

**Example:**
```
project-documents/
  abc123-def456/
    type789-xyz012/
      1/
        a1b2c3d4_PID_Final.pdf
      2/
        e5f6g7h8_PID_v2_Revised.pdf
```

### File Naming Convention

- Original filename preserved in `file_name` field
- Storage path uses UUID prefix to prevent collisions
- Format: `{uuid}_{sanitized_filename}`

### Signed URLs

- **Expiry**: 1 hour (3600 seconds)
- **Access**: Private files require signed URLs for download
- **Generation**: Via `storage.from(bucket).createSignedUrl(path, expiresIn)`

---

## Service Layer

### `documentStorageService.js`

Handles file operations.

**Key Functions:**
- `uploadProjectDocument(file, projectId, documentTypeId, version)`
- `downloadProjectDocument(documentId, filePath)`
- `deleteProjectDocument(documentId, version)`
- `createDocumentVersion(documentId, file)`
- `getDocumentVersions(documentId)`
- `validateFile(file)`
- `getProjectStorageUsage(projectId)`
- `checkProjectStorageLimit(projectId)`

### `documentGovernanceService.js`

Handles document metadata and business logic.

**Key Functions:**
- `getDocumentTypes(stageCode, mandatoryOnly)`
- `getProjectDocuments(projectId, stageCode)`
- `createProjectDocument(documentData, file)`
- `updateDocumentStatus(documentId, newStatus)`
- `submitDocumentForApproval(documentId, approverId)`
- `approveDocument(documentId, approverId, comments)`
- `rejectDocument(documentId, approverId, reason)`
- `checkProjectCompliance(projectId, stageCode)`
- `getProgrammeCompliance(programmeId)`
- `checkStageGateRequirements(stageBoundaryId)`

### `stageGateService.js`

Enhanced with document compliance checks.

**Key Functions:**
- `checkGateDocumentCompliance(gateId)`
- `blockStageGate(gateId, reason, actorUserId)`
- `raiseDocumentComplianceException(projectId, details, actorUserId)`

---

## RLS Policies

### Table Policies

All document governance tables have RLS enabled with policies for:

1. **PMO Admin**: Full access (SELECT, INSERT, UPDATE, DELETE)
2. **Project Manager**: Read/Write for own projects
3. **Executive**: Read for assigned projects
4. **Team Members**: Read for assigned projects
5. **Programme Manager**: Read/Write for own programmes

### Storage Policies

Storage buckets have RLS policies for:

1. **PMO Admin**: Full access
2. **Project Manager**: Upload/Download for own projects
3. **Executive**: Download for assigned projects
4. **Team Members**: Download for assigned projects

**Policy File**: `SQL/v151_document_governance_rls_policies.sql`

---

## API Functions

### Database RPC Functions

#### `check_project_document_compliance`

```sql
SELECT * FROM check_project_document_compliance(
    'project-uuid'::UUID,
    'initiation'::VARCHAR  -- optional stage filter
);
```

#### `check_stage_gate_document_requirements`

```sql
SELECT * FROM check_stage_gate_document_requirements(
    'stage-boundary-uuid'::UUID
);
```

#### `get_programme_document_compliance`

```sql
SELECT * FROM get_programme_document_compliance(
    'programme-uuid'::UUID
);
```

---

## Integration Points

### Stage Gate System

The document governance module integrates with the stage gate system:

1. **Compliance Check**: Before approving a stage gate, the system checks document compliance
2. **Gate Blocking**: If mandatory documents are missing/unapproved, the gate is blocked
3. **Exception Raising**: Non-compliance automatically raises an exception

**Integration Code**: `src/services/stageGateService.js`

### PMO Dashboard

Document compliance metrics are displayed on the PMO Dashboard:

- Missing mandatory documents count
- Pending approvals count
- Overdue documents count
- Projects with compliance issues

**Integration Component**: `src/components/app/dashboard/DocumentComplianceWidget.jsx`

### Stage Gate Oversight

The Stage Gate Oversight component shows document compliance status:

- Green checkmark = Compliant
- Red indicator = Non-compliant (shows count)

**Integration Component**: `src/components/app/dashboard/StageGateOversight.jsx`

---

## Performance Considerations

### Database Indexes

Key indexes for performance:

```sql
CREATE INDEX idx_project_documents_project_type ON project_documents(project_id, document_type_id);
CREATE INDEX idx_project_documents_status ON project_documents(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_document_types_stage_mandatory ON document_types(stage_code, is_mandatory);
CREATE INDEX idx_document_versions_document ON document_versions(project_document_id, version_number);
```

### Query Optimization

- Use views for complex aggregations
- Materialized views for programme rollups (refresh on document status change)
- Pagination for document lists (50 documents per page)
- Cached document types (localStorage, 1 hour TTL)

### Storage Optimization

- File deduplication via SHA256 hash
- Compression for large files (future enhancement)
- CDN for file delivery (future enhancement)

---

## Security

### File Validation

- **Extension Whitelist**: Only allowed file types
- **Size Limits**: 50MB per file, 500MB per project
- **MIME Type Validation**: Server-side validation
- **Filename Sanitization**: Remove special characters

### Access Control

- **RLS Policies**: Database-level access control
- **Storage Policies**: Bucket-level access control
- **Signed URLs**: Time-limited download links (1 hour)
- **Audit Trail**: All actions logged to `audit_trails` table

### Data Protection

- **Soft Deletes**: Documents are soft-deleted, not permanently removed
- **Version Retention**: All versions retained for audit
- **Encryption**: Files encrypted at rest (Supabase default)
- **HTTPS**: All transfers over HTTPS

---

## Troubleshooting

### Common Issues

#### Database Errors

**Error**: `column does not exist`

**Solution**: Ensure all SQL migrations are run in order:
- `v146_document_governance_tables.sql`
- `v147_document_types_seed_data.sql`
- `v148_document_compliance_functions.sql`
- `v149_document_governance_views.sql`
- `v150_supabase_storage_setup.sql`
- `v151_document_governance_rls_policies.sql`

#### Storage Errors

**Error**: `Bucket not found`

**Solution**: Create buckets in Supabase Dashboard:
1. Go to Storage → Buckets
2. Create `project-documents` bucket (private)
3. Create `programme-documents` bucket (private)

**Error**: `Permission denied` on upload

**Solution**: Check storage RLS policies in `v150_supabase_storage_setup.sql`

#### RLS Policy Errors

**Error**: `Policy creation failed`

**Solution**: 
1. Drop existing policies: `DROP POLICY IF EXISTS ...`
2. Re-run `v151_document_governance_rls_policies.sql`
3. Verify `is_pmo_admin()` function exists

---

## Testing

### Unit Tests

- `src/services/__tests__/documentStorageService.test.js`
- `src/services/__tests__/documentGovernanceService.test.js`

### Integration Tests

- `src/test/integration/documentGovernanceFlow.test.js`

### Running Tests

```bash
npm run test
```

---

## Deployment Checklist

- [ ] Run all SQL migrations in order
- [ ] Create Supabase Storage buckets
- [ ] Verify RLS policies are active
- [ ] Test file upload/download
- [ ] Test document compliance checks
- [ ] Test stage gate blocking
- [ ] Verify audit logging
- [ ] Test with different user roles
- [ ] Monitor storage usage
- [ ] Set up backup strategy

---

**Last Updated**: January 2026  
**Version**: 1.0
