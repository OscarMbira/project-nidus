# RFP Document Register - User Guide

**Version:** 1.0  
**Last Updated:** 2026-02-18

## 1. Introduction

The RFP Document Register lets the PMO load and manage RFP (Request for Proposal) documents for service providers that have already been selected. It is **not** a tool for running a tender or bidding process.

**Who can use it:**

- **PMO Administrators**: Create, edit, delete, bulk import, and change status
- **Other roles (Project Managers, Team Members, etc.)**: View only and export

## 2. Accessing the RFP Register

1. Go to **PMO** → **Procurement** → **RFP Register**
2. You will see a list of all RFP documents (if any exist)

**Practice mode (Simulator):**

- Go to **Simulator** → **PMO** → **Procurement** → **Practice RFP Register**

## 3. Loading a New RFP (PMO Admin Only)

1. Click **Load RFP**
2. Fill in:
   - **RFP Details**: Title, category, description, original reference, issue date
   - **Service Provider**: Name, contact, contract value, dates
3. Click **Save**
4. You will be taken to the RFP view where you can add line items

## 4. Adding Line Items

### Option A: Add One by One

1. Open the RFP and click **Edit**
2. In the **Line Items** section, click **Add Item**
3. Fill in:
   - S/No (required)
   - Reference No.
   - Scope/Entity, Business Area
   - Description (required)
   - Vendor Response/Comments
   - Priority, Requirement Type, Mandatory
4. Click **Save**

### Option B: Bulk Import from CSV

1. Open the RFP and click **Edit**
2. In the Line Items section, click **Bulk Import** (or use **Import** from the view page)
3. Download the template or sample file
4. Upload your CSV file
5. Adjust column mapping if needed, then click **Validate & Preview**
6. Review validation results and click **Import**

## 5. Editing an RFP

1. Open the RFP list
2. Click **Edit** on the row (or open the RFP and click **Edit** in the header)
3. Change the details and/or line items
4. Click **Save**

## 6. Viewing and Exporting

- **View**: Open an RFP to see all details and line items
- **Print**: Click **Print** to open a print-friendly page in a new tab
- **Export CSV**: Click **Export CSV** to download line items as CSV

## 7. Changing RFP Status (PMO Admin Only)

In the RFP view, use the status dropdown to change:

- **Draft** → **Active** (when ready)
- **Active** → **Closed** or **On Hold**
- **On Hold** → **Active**

## 8. RFP Drafts (On Hold)

- Use **RFP Drafts** in the Procurement menu to see RFPs on hold
- This section integrates with the draft queue when configured

## 9. CSV Import Format

Required columns:

- **S/No** – Item number
- **Description** – Requirement description (min 10 characters)

Optional columns:

- Delta ID / Reference No.
- Scope/Entity
- Business Area
- Vendor Response/Comments
- Priority, Requirement Type, Is Mandatory
- Acceptance Criteria, Estimated Effort

Use the template and sample files from the bulk import screen to ensure correct formatting.
