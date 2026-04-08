# Project Product Description - Technical Documentation

## Overview

This document provides technical details for developers working with the Project Product Description (PPD) module.

## Architecture

The PPD module follows a standard three-tier architecture:
- **Database Layer**: PostgreSQL tables and functions
- **Service Layer**: JavaScript service modules
- **Presentation Layer**: React components and pages

## Database Schema

### Main Tables

#### project_product_descriptions
Main table storing PPD documents (one per project).

**Key Fields**:
- `id` (UUID, PK)
- `project_id` (UUID, FK, UNIQUE) - One PPD per project
- `ppd_reference` (VARCHAR, UNIQUE) - Auto-generated reference (PPD-YYYY-NNN)
- `status` (ENUM) - draft, under_review, approved, superseded
- Core content fields (product_title, purpose, composition, etc.)
- Quality fields (customer_quality_expectations, etc.)
- Acceptance fields (acceptance_method, acceptance_responsibilities, etc.)

**Indexes**:
- `idx_ppd_project_id` on project_id
- `idx_ppd_status` on status
- `idx_ppd_ppd_reference` on ppd_reference

#### ppd_composition_items
Major products/deliverables that make up the project product.

**Key Fields**:
- `id` (UUID, PK)
- `ppd_id` (UUID, FK)
- `item_number` (INTEGER) - Display order
- `product_name` (VARCHAR)
- `product_type` (ENUM) - deliverable, service, capability, document, system, process, other
- `linked_product_id` (UUID, FK to product_deliverables) - Link to detailed product

**Constraints**:
- UNIQUE(ppd_id, item_number)

#### ppd_acceptance_criteria
Acceptance criteria that must be met for project product acceptance.

**Key Fields**:
- `id` (UUID, PK)
- `ppd_id` (UUID, FK)
- `criteria_reference` (VARCHAR) - Auto-generated (AC-NNN)
- `criteria_title` (VARCHAR)
- `criteria_description` (TEXT)
- `criteria_category` (ENUM) - functional, performance, quality, etc.
- `priority` (ENUM) - must_have, should_have, could_have, wont_have
- `measurement_method` (TEXT)
- `target_value` (VARCHAR)
- `acceptance_status` (ENUM) - pending, passed, failed, waived, deferred

**Constraints**:
- UNIQUE(ppd_id, criteria_number)

#### Other Tables
- `ppd_derivations` - Source products/documents
- `ppd_quality_expectations` - Detailed quality expectations
- `ppd_skills_required` - Development skills needed
- `ppd_acceptance_responsibilities` - Who accepts what
- `ppd_revision_history` - Version history
- `ppd_approvals` - Approval records
- `ppd_distribution` - Distribution list

### Database Functions

#### generate_ppd_reference()
Generates unique PPD reference in format PPD-YYYY-NNN.

**Usage**:
```sql
SELECT generate_ppd_reference();
-- Returns: PPD-2026-001
```

#### generate_criteria_reference(p_ppd_id UUID)
Generates acceptance criteria reference in format AC-NNN.

**Usage**:
```sql
SELECT generate_criteria_reference('ppd-id-here');
-- Returns: AC-001
```

#### create_ppd_from_mandate(p_mandate_id UUID, p_project_id UUID, p_user_id UUID)
Creates PPD pre-populated from project mandate.

**Returns**: UUID of created PPD

**Process**:
1. Copies mandate title and description
2. Creates derivation link
3. Copies deliverables to composition items

#### validate_acceptance_criteria(p_ppd_id UUID)
Validates all acceptance criteria for a PPD.

**Returns**: Table with validation results:
- `criteria_id` (UUID)
- `is_valid` (BOOLEAN)
- `issues` (TEXT[])
- `recommendations` (TEXT)

**Validation Checks**:
- Measurability (has measurement method and target)
- Provability (can test within project or has proxy)
- Completeness (description length)

#### check_criteria_consistency(p_ppd_id UUID)
Checks for conflicts between criteria.

**Returns**: Table with conflicts:
- `conflict_type` (VARCHAR)
- `criteria_1_id` (UUID)
- `criteria_2_id` (UUID)
- `conflict_description` (TEXT)

**Conflict Detection**:
- Time-Cost-Quality triangle conflicts
- Scope-Budget conflicts

#### get_acceptance_status(p_project_id UUID)
Returns overall acceptance status for a project.

**Returns**: Table with:
- `total_criteria` (INTEGER)
- `passed_criteria` (INTEGER)
- `failed_criteria` (INTEGER)
- `pending_criteria` (INTEGER)
- `acceptance_percentage` (DECIMAL)
- `can_close_project` (BOOLEAN)

#### record_criteria_acceptance(p_criteria_id UUID, p_status VARCHAR, p_user_id UUID, p_notes TEXT)
Records acceptance result for a criterion.

**Status Values**: passed, failed, waived, deferred

**Returns**: BOOLEAN

### Triggers

#### trg_project_product_descriptions_generate_reference
Auto-generates `ppd_reference` on INSERT if not provided.

#### trg_ppd_acceptance_criteria_generate_reference
Auto-generates `criteria_reference` on INSERT based on `criteria_number`.

#### trg_ppd_update_timestamp
Updates `updated_at` timestamp on UPDATE.

#### trg_ppd_set_created_fields
Sets `created_by` and `created_at` on INSERT.

## Service Layer

### projectProductDescriptionService.js

**Key Functions**:
- `createPPD(projectId, ppdData)` - Create new PPD
- `createPPDFromMandate(mandateId, projectId)` - Create from mandate
- `getPPDById(ppdId)` - Get single PPD
- `getPPDByProject(projectId)` - Get PPD for project (or null)
- `updatePPD(ppdId, updates)` - Update PPD
- `deletePPD(ppdId)` - Soft delete (draft only)
- `submitForApproval(ppdId, approverIds)` - Submit for approval
- `approvePPD(approvalId, approverId, comments)` - Approve PPD
- `getRevisionHistory(ppdId)` - Get version history
- `validatePPD(ppdId)` - Validate completeness
- `getOrCreatePPD(projectId)` - Get existing or create draft

**Error Handling**:
- All functions throw errors that should be caught by callers
- User authentication checked in all write operations
- Validation errors include descriptive messages

### ppdCompositionService.js

**Key Functions**:
- `addCompositionItem(ppdId, itemData)` - Add composition item
- `updateCompositionItem(itemId, updates)` - Update item
- `deleteCompositionItem(itemId)` - Soft delete item
- `getCompositionItems(ppdId)` - Get all items for PPD
- `linkToProduct(itemId, productId)` - Link to product_deliverables
- `reorderItems(ppdId, orderedIds)` - Reorder items

### ppdAcceptanceCriteriaService.js

**Key Functions**:
- `addCriteria(ppdId, criteriaData)` - Add acceptance criterion
- `updateCriteria(criteriaId, updates)` - Update criterion
- `deleteCriteria(criteriaId)` - Soft delete criterion
- `getCriteria(ppdId, filters)` - Get criteria with optional filters
- `validateCriteria(criteriaId)` - Validate single criterion
- `validateAllCriteria(ppdId)` - Validate all criteria
- `checkConsistency(ppdId)` - Check for conflicts
- `recordAcceptance(criteriaId, status, notes)` - Record test result
- `getAcceptanceStatus(projectId)` - Get acceptance summary

**Filter Options**:
- `category` - Filter by criteria category
- `stakeholder_group` - Filter by stakeholder group
- `priority` - Filter by priority
- `acceptance_status` - Filter by acceptance status

### Other Services
- `ppdQualityExpectationsService.js` - Quality expectations management
- `ppdSkillsService.js` - Skills management
- `ppdAcceptanceResponsibilitiesService.js` - Responsibilities management

## Presentation Layer

### Pages

#### PPDView.jsx
Main page for viewing and managing PPD.

**Features**:
- Tabbed interface (Overview, Composition, Criteria, etc.)
- Display PPD information
- Edit button for draft PPDs
- Export menu
- Link to acceptance testing

**State Management**:
- Fetches PPD and related data on mount
- Manages modals for forms
- Refreshes data after updates

#### AcceptanceTestingPage.jsx
Page for conducting acceptance testing.

**Features**:
- Progress summary dashboard
- Filterable criteria list
- Record acceptance results
- Export acceptance report

### Components

#### PPDForm.jsx
Wizard form for creating/editing PPD.

**Features**:
- 6-step wizard
- Step-by-step validation
- Pre-population from mandate
- Auto-save capability

**Steps**:
1. Title & Purpose
2. Composition
3. Skills
4. Quality
5. Acceptance
6. Review

#### CompositionItemForm.jsx
Form for adding/editing composition items.

**Features**:
- Product name and description
- Product type selection
- Link to product_deliverables
- Mandatory flag

#### AcceptanceCriteriaForm.jsx
Form for adding/editing acceptance criteria.

**Features**:
- Comprehensive criterion fields
- Validation for must-have criteria
- Measurement method and targets
- Provability options

#### PPDExportMenu.jsx
Export options menu.

**Features**:
- CSV export
- PDF export (using jsPDF)
- Print view
- Acceptance report export

## Row Level Security (RLS)

### Policies

**View Access**:
- Project team members can view PPDs for their projects
- PMO Admins can view all PPDs in their organization

**Edit Access**:
- Project Manager can edit PPDs in draft/under_review status
- PMO Admins can edit any PPD

**Create Access**:
- Project Manager can create PPDs for their projects
- PMO Admins can create PPDs for any project

**Delete Access**:
- Only draft PPDs can be deleted (soft delete)
- Project Manager or PMO Admin can delete drafts

### Helper Function

`check_ppd_access(p_ppd_id UUID)` - SECURITY DEFINER function to check access to PPD.

## Integration Points

### With Projects
- One PPD per project (enforced at database level)
- PPD accessible from project detail page
- Project closure can check PPD acceptance status

### With Project Mandates
- Can create PPD from mandate
- Links derivation to mandate
- Copies mandate deliverables to composition

### With Products
- Composition items can link to product_deliverables
- Cascades acceptance to product level (future enhancement)

### With Change Control
- PPD changes tracked in revision_history
- Can link revisions to change_requests (future enhancement)

## Testing

### Unit Tests

**Service Tests**:
- `src/services/__tests__/projectProductDescriptionService.test.js`
- `src/services/__tests__/ppdAcceptanceCriteriaService.test.js`

**Test Framework**: Vitest

**Coverage**:
- CRUD operations
- Validation logic
- Error handling
- Filtering

### Integration Tests

**Database Functions**:
- Test reference generation
- Test validation functions
- Test acceptance status calculation

**Service Integration**:
- Test PPD creation from mandate
- Test approval workflow
- Test acceptance recording

### Component Tests

**Components to Test**:
- PPDForm validation
- AcceptanceCriteriaForm validation
- Export functionality

## Performance Considerations

### Database
- Indexes on frequently queried fields
- Efficient RLS policies
- Cached user lookups where possible

### Frontend
- Lazy loading of pages
- Efficient data fetching (parallel requests)
- Pagination for large lists (future enhancement)

## Security

### Authentication
- All service functions check user authentication
- Supabase RLS provides database-level security

### Authorization
- Role-based access control
- Project membership checks
- Status-based edit restrictions

### Data Validation
- Client-side validation for UX
- Server-side validation for security
- Database constraints for data integrity

## Future Enhancements

1. **Advanced Validation**:
   - AI-powered criteria measurability analysis
   - Automated consistency checking with ML

2. **Export Enhancements**:
   - Word document export
   - Custom report templates

3. **Integration**:
   - Automated acceptance testing for technical criteria
   - Customer portal for acceptance sign-off

4. **Analytics**:
   - Historical criteria analysis
   - Criteria library from successful projects
   - Predictive acceptance analysis

## Deployment

### Database Migrations
1. Run `v177_project_product_description_tables.sql`
2. Run `v178_project_product_description_rls_policies.sql`

### Dependencies
- jsPDF (for PDF export)
- html2canvas (for PDF export)
- date-fns (for date formatting)

### Environment Variables
No additional environment variables required.

## Maintenance

### Common Issues

**Issue**: RLS policy errors
- **Solution**: Check user_projects membership and role assignments

**Issue**: Reference generation conflicts
- **Solution**: Ensure proper isolation by year and sequence

**Issue**: Validation function errors
- **Solution**: Check function dependencies and table structure

### Monitoring
- Monitor acceptance criteria completion rates
- Track PPD approval times
- Review validation errors

## API Reference

See individual service files for detailed function signatures and usage examples.

## Summary

The PPD module provides a comprehensive solution for managing project product descriptions with:
- Robust database schema
- Comprehensive service layer
- User-friendly interface
- Strong validation and security
- Integration with other modules

For questions or issues, refer to the implementation summary or contact the development team.
