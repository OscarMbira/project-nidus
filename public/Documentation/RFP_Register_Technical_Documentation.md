# RFP Document Register - Technical Documentation

**Version:** 1.0  
**Last Updated:** 2026-02-18

## 1. Overview

The RFP (Request for Proposal) Document Register allows PMO administrators to load, capture, and manage RFP details for already-selected service providers. This is **not** a procurement or vendor bidding tool—it is a document registration and tracking system.

### 1.1 Key Capabilities

- **RFP Details**: Title, category, description, original reference, issue date
- **Service Provider**: Name, code, contact details, contract value, dates
- **Line Items**: Individual requirements with vendor responses
- **Bulk Import**: CSV/Excel upload with column mapping and validation
- **Export**: CSV export of line items, print-friendly view
- **Role-Based Access**: PMO Admin (full), all other roles (read-only)

## 2. Architecture

### 2.1 Database Schema

- `rfp_documents` – Master RFP header
- `rfp_line_items` – Individual requirement items
- `rfp_business_areas`, `rfp_scope_entities` – Lookups
- `rfp_attachments` – File attachments
- Simulator: `sim.rfp_documents`, `sim.rfp_line_items`

### 2.2 Services

- `rfpService.js` – Platform CRUD
- `simRfpService.js` – Simulator CRUD
- `rfpBulkImportService.js` – Platform bulk import
- `simRfpBulkImportService.js` – Simulator bulk import

### 2.3 Components

- RFPList, RFPForm, RFPDetailView, RFPLineItemsTable, RFPLineItemEditor
- RFPLineItemForm, RFPBulkImport, RFPColumnMapper, RFPPrintView
- RFPStatusBadge, RFPStats

### 2.4 Routes

Platform: `/pmo/procurement/rfp`, `/pmo/rfp/create`, `/pmo/rfp/:id/view`, `/pmo/rfp/:id/edit`, `/pmo/rfp/:id/import`, `/pmo/rfp/:id/print`, `/pmo/rfp/on-hold`

Simulator: Same paths under `/simulator/pmo/`

## 3. Role-Based Access

PMO Admin: Full access. Other roles: Read-only (view, export, print).

## 4. Status Lifecycle

Draft → Active. Active → Closed | On Hold. On Hold → Active. Closed = terminal.

## 5. References

- Implementation plan: `projectplan/v204_RFP_Management_Implementation_Plan.md`
- User guide: `Documentation/RFP_Register_User_Guide.md`
- Bulk import: `Documentation/RFP_Bulk_Import_Guide.md`
