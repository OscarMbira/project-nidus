# RFP Bulk Import Guide

**Version:** 1.0  
**Last Updated:** 2026-02-18

## 1. Overview

Bulk import allows you to add many RFP line items at once from a CSV or Excel file. This is useful when you have requirements in a spreadsheet.

## 2. Before You Start

- You must be a PMO Administrator
- Create or open an RFP document first
- Prepare your data in CSV format (or save Excel as CSV)

## 3. Step-by-Step Process

### Step 1: Prepare Your File

1. Click **Bulk Import** on the RFP (from Edit or View)
2. Download the **Template** (headers only) or **Sample** (with example rows)
3. Populate your CSV with your requirement rows

**Required columns:**

| Column | Description |
|--------|-------------|
| S/No | Item number (positive integer) |
| Description | Requirement text (min 10 characters) |

**Optional columns:**

| Column | Description |
|--------|-------------|
| Delta ID / Reference No. | External reference (e.g., CR22045) |
| Scope/Entity | Scope or entity classification |
| Business Area | Business area (e.g., Credit, Trade Finance) |
| Vendor Response/Comments | Vendor’s response or comments |
| Priority | Must-Have, Should-Have, Nice-to-Have, Future |
| Requirement Type | Functional, Technical, Compliance, etc. |
| Is Mandatory | Yes or No |
| Acceptance Criteria | Text |
| Estimated Effort | e.g. 5 days |

### Step 2: Upload and Map

1. Upload your CSV (drag and drop or click to select)
2. The system will auto-detect columns from your headers
3. If your headers differ, use the column mapping grid to map each CSV column to the correct field
4. Ensure at least **S/No** and **Description** are mapped

### Step 3: Validate and Import

1. Click **Validate & Preview**
2. Review:
   - Valid rows (green)
   - Invalid rows (red, with errors)
   - Warnings (yellow)
3. Fix errors in your CSV if needed, then re-upload
4. Click **Import** to add the valid rows

## 4. Validation Rules

- **S/No**: Must be a positive integer
- **Description**: Required, minimum 10 characters
- Duplicate S/No in the same file will generate a warning but are still imported
- Reference number: max 100 characters
- Vendor response: max 5000 characters

## 5. Supported File Types

- CSV (UTF-8, with or without BOM)
- XLS, XLSX (saved as CSV for best compatibility)

**Limits:**

- Max file size: 10 MB
- Max rows: 5000

## 6. Troubleshooting

**"S/No and Description columns must be mapped"**

- Map at least these two columns in the column mapping step.

**"No valid rows to import"**

- Check that S/No is numeric and Description has at least 10 characters for each row.

**"Access denied"**

- Only PMO Administrators can run bulk import. Contact your admin if you need access.
