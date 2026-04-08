# PMO Document Governance User Guide

## Overview

The PMO Document Governance module enables organizations to track, manage, and ensure compliance of project documents throughout the project lifecycle. This system helps PMO administrators maintain governance standards by tracking mandatory documents at each project stage and enforcing stage gate compliance.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Document Register](#document-register)
3. [Uploading Documents](#uploading-documents)
4. [Document Status Workflow](#document-status-workflow)
5. [Document Approval Process](#document-approval-process)
6. [Version Control](#version-control)
7. [Compliance Dashboard](#compliance-dashboard)
8. [Programme-Level Documents](#programme-level-documents)
9. [Stage Gate Integration](#stage-gate-integration)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing Document Governance

1. Log in to the Platform as a PMO Admin or Project Manager
2. Navigate to **Governance** → **Document Governance** in the sidebar menu
3. You will see the Document Governance dashboard

### Required Permissions

- **PMO Admin**: Full access to all document governance features
- **Project Manager**: Can upload and manage documents for their projects
- **Executive**: Can view and approve documents for assigned projects
- **Team Members**: Can view documents for their assigned projects

---

## Document Register

The Document Register is the central view for all project documents. It displays:

- **Document Name**: Name of the document type (e.g., "Project Initiation Document")
- **Stage**: Project stage where the document is required
- **Mandatory Flag**: Indicates if the document is mandatory (red badge) or optional (gray badge)
- **Status**: Current status (Not Started, Draft, Submitted, Approved, Rejected)
- **Owner**: Person responsible for the document
- **Approver**: Person who approves the document
- **File Information**: File name, size, and type
- **Version**: Current version number

### Filtering Documents

You can filter documents by:
- **Stage**: Filter by project stage (Pre-Project, Initiation, Planning, etc.)
- **Status**: Filter by document status
- **Mandatory**: Show only mandatory documents
- **Project**: Filter by specific project

### Searching Documents

Use the search bar to find documents by:
- Document name
- Owner name
- Approver name
- File name

---

## Uploading Documents

### Method 1: Drag and Drop

1. Navigate to the Document Register
2. Find the document you want to upload
3. Click the **Upload** button or drag a file onto the upload area
4. Select your file (max 50MB)
5. The file will upload automatically

### Method 2: File Picker

1. Click the **Upload** button next to a document
2. Select **Choose File** from your computer
3. Select the file and click **Open**
4. The upload will begin automatically

### Supported File Types

**Documents:**
- PDF (`.pdf`)
- Word Documents (`.docx`, `.doc`)
- Excel Spreadsheets (`.xlsx`, `.xls`)
- Markdown (`.md`)
- Plain Text (`.txt`)

**Images:**
- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- TIFF (`.tiff`, `.tif`)
- GIF (`.gif`)
- SVG (`.svg`)

**Other:**
- ZIP Archives (`.zip`)
- PowerPoint (`.pptx`)
- CSV (`.csv`)
- JSON (`.json`)

### File Size Limits

- **Maximum file size**: 50MB per file
- **Project limit**: 500MB total per project
- **Programme limit**: 5GB total per programme

### File Validation

The system automatically validates:
- File type (only allowed extensions)
- File size (must be under 50MB)
- File name (no special characters except `-`, `_`, `.`)

If validation fails, you'll see an error message explaining the issue.

---

## Document Status Workflow

Documents follow this status workflow:

```
not_started → draft → submitted → approved
                              ↓
                          rejected → draft (re-submit)
```

### Status Descriptions

- **Not Started**: Document has not been created yet
- **Draft**: Document is being prepared (not ready for review)
- **Submitted**: Document has been submitted for approval
- **Approved**: Document has been approved by the approver
- **Rejected**: Document was rejected and needs revision

### Changing Document Status

1. Open the document from the Document Register
2. Click **Change Status** or use the status dropdown
3. Select the new status
4. Add comments if required
5. Click **Save**

**Note**: Only document owners can change status from "draft" to "submitted". Only approvers can change status from "submitted" to "approved" or "rejected".

---

## Document Approval Process

### Submitting for Approval

1. Ensure your document is in **Draft** status
2. Click **Submit for Approval**
3. Select the approver (if not pre-assigned)
4. Add any comments
5. Click **Submit**

The document status will change to **Submitted** and the approver will be notified.

### Approving Documents

1. Navigate to documents pending your approval (filter by status: "Submitted")
2. Click on the document to open it
3. Review the document (download if needed)
4. Click **Approve** or **Reject**
5. Add approval comments
6. Click **Confirm**

**Approved**: Document status changes to "Approved" and is marked as compliant.

**Rejected**: Document status changes to "Rejected" with your rejection reason. The owner can revise and re-submit.

---

## Version Control

### Uploading New Versions

1. Open the document from the Document Register
2. Click **Upload New Version**
3. Select the new file
4. Add a change summary (optional)
5. Click **Upload**

The system automatically:
- Increments the version number (v1 → v2 → v3, etc.)
- Marks the new version as current
- Keeps all previous versions for history

### Viewing Version History

1. Open the document
2. Click **View Versions** or **Version History**
3. You'll see a list of all versions with:
   - Version number
   - Upload date
   - Uploaded by
   - File size
   - Change summary

### Downloading Previous Versions

1. Open the version history
2. Click **Download** next to any version
3. The file will download to your computer

### Current Version

The current/active version is marked with a green badge. Only the current version is considered for compliance checks.

---

## Compliance Dashboard

The Compliance Dashboard provides an overview of document compliance across all projects.

### Key Metrics

- **Missing Mandatory Documents**: Count of mandatory documents that haven't been uploaded
- **Pending Approvals**: Count of documents awaiting approval
- **Overdue Documents**: Count of documents past their due date
- **Projects with Issues**: Number of projects with compliance problems

### Compliance Status Indicators

- **Green**: All mandatory documents are present and approved
- **Amber**: Some mandatory documents are pending approval
- **Red**: Mandatory documents are missing or rejected

### Viewing Compliance by Project

1. Navigate to **Document Compliance** dashboard
2. Click on a project to see detailed compliance status
3. View compliance breakdown by stage

### Viewing Compliance by Programme

1. Navigate to **Programme Documents**
2. Select a programme
3. View compliance rollup across all projects in the programme

---

## Programme-Level Documents

Programme-level documents are documents that apply to an entire programme rather than individual projects.

### Viewing Programme Documents

1. Navigate to **Governance** → **Programme Documents**
2. Select a programme from the dropdown
3. View all programme-level documents

### Uploading Programme Documents

1. Navigate to Programme Documents
2. Click **Upload Document**
3. Select document type
4. Upload file
5. Set status and assign approver

---

## Stage Gate Integration

### Document Compliance Checks

When a stage gate is ready for approval, the system automatically checks:

1. **Mandatory Documents**: All mandatory documents for the stage must be present
2. **Document Approval**: All mandatory documents must be approved
3. **Document Status**: Documents cannot be in "rejected" or "not_started" status

### Blocked Stage Gates

If mandatory documents are missing or not approved, the stage gate will be **blocked** and cannot be approved until compliance is met.

**What happens when a gate is blocked:**

1. The gate status changes to "BLOCKED"
2. A blocking reason is displayed (e.g., "Missing 2 mandatory documents")
3. An exception is automatically raised
4. The PMO is notified

**To unblock a gate:**

1. Upload all missing mandatory documents
2. Ensure all mandatory documents are approved
3. The gate will automatically become unblocked
4. You can then proceed with approval

### Viewing Gate Compliance

1. Navigate to **PMO Dashboard** → **Stage Gate Oversight**
2. View the **Document Compliance** column
3. Green checkmark = Compliant
4. Red indicator = Non-compliant (shows missing/unapproved count)

---

## Troubleshooting

### Upload Issues

**Problem**: File upload fails with "Permission denied"

**Solution**: 
- Check that you have PM or PMO Admin permissions
- Verify the storage bucket exists in Supabase
- Contact your system administrator

**Problem**: File upload fails with "File too large"

**Solution**:
- Ensure file is under 50MB
- Compress large files or split into multiple documents
- Contact PMO if you need to upload larger files

**Problem**: "File type not allowed" error

**Solution**:
- Check that your file extension is in the allowed list
- Convert file to a supported format (e.g., convert .doc to .docx)

### Download Issues

**Problem**: Cannot download document

**Solution**:
- Check that you have access to the project
- Verify the document file still exists
- Try refreshing the page
- Contact document owner if issue persists

### Status Issues

**Problem**: Cannot change document status

**Solution**:
- Verify you are the document owner (for draft → submitted)
- Verify you are the approver (for submitted → approved/rejected)
- Check document is not already in the target status

### Compliance Issues

**Problem**: Stage gate shows as non-compliant but documents are uploaded

**Solution**:
- Verify documents are in "approved" status (not just "submitted")
- Check that all mandatory documents for the stage are present
- Ensure documents are assigned to the correct stage

---

## Best Practices

1. **Upload Early**: Upload documents as soon as they're ready, don't wait until stage gate
2. **Use Clear Names**: Use descriptive file names (e.g., "PID_v2_Final.pdf" not "document1.pdf")
3. **Version Control**: Always upload new versions rather than replacing files
4. **Regular Reviews**: Check compliance dashboard regularly to catch issues early
5. **Communication**: Add comments when submitting for approval to help approvers
6. **Storage Management**: Monitor storage usage to avoid hitting project limits

---

## Support

For additional help:
- Check the **Technical Documentation** for system administrators
- Contact your PMO Administrator
- Submit a support ticket through the platform

---

**Last Updated**: January 2026  
**Version**: 1.0
