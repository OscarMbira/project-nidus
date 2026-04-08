# Issue Register User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Issue Types](#issue-types)
4. [Creating Issues](#creating-issues)
5. [Managing Issues](#managing-issues)
6. [Issue Workflows](#issue-workflows)
7. [Exporting and Reporting](#exporting-and-reporting)
8. [Best Practices](#best-practices)

## Introduction

The Issue Register is a formal project control document that captures and tracks all issues requiring management attention. Unlike risks (uncertain events that might happen), issues are events or situations that have already happened or are certain to happen, and require resolution.

### Key Features

- **Three Issue Types**: Request for Change (RFC), Off-specification, Problem/Concern
- **Formal Control**: Issues formally logged, assessed, and resolved
- **Priority & Severity**: Dual assessment using project-defined scales
- **Clear Accountability**: Distinct roles: Raised By, Author, Owner
- **Lifecycle Tracking**: From raised to closed with full audit trail
- **Risk Integration**: Issues that are actually risks can be transferred to Risk Register
- **Change Integration**: RFCs link to formal change control process

## Getting Started

### Accessing the Issue Register

1. Navigate to your project from the Projects page
2. Click on the **"Issue Register"** button in the Universal Modules section
3. The Issue Register will automatically be created for your project if it doesn't exist

### Understanding the Interface

The Issue Register view displays:
- **Summary Statistics**: Total issues, open issues, critical issues, overdue actions
- **Type Tabs**: Filter issues by type (All, RFC, Off-spec, Problem)
- **Issue List**: Table view of all issues with key information
- **Filters**: Filter by status, priority, severity, owner, or search

## Issue Types

### Request for Change (RFC)

An RFC is a proposal to change a baseline (scope, cost, time, quality).

**When to use**: When a stakeholder requests a change to the project scope, timeline, budget, or quality standards.

**Example**: "Client requests additional reporting feature"

**Workflow**: Assess → Decide → Change Request or Reject

### Off-Specification

An Off-specification issue occurs when a product does not meet its specification or quality criteria.

**When to use**: When a deliverable fails to meet acceptance criteria or quality standards.

**Example**: "Module fails 3 of 15 acceptance tests"

**Workflow**: Assess → Concession or Fix

### Problem/Concern

A Problem/Concern is any other issue requiring resolution.

**When to use**: For any issue that doesn't fit into RFC or Off-specification categories.

**Example**: "Key team member resigned unexpectedly"

**Workflow**: Assess → Resolve

## Creating Issues

### Step-by-Step Guide

1. **Click "Log Issue"** button in the Issue Register view
2. **Fill in Required Fields**:
   - **Title** (minimum 10 characters): Brief summary of the issue
   - **Description** (minimum 30 characters): Detailed description
   - **Issue Type**: Select RFC, Off-specification, or Problem/Concern
   - **Impact Description** (minimum 20 characters): Describe the impact on the project
   - **Priority**: Critical, High, Medium, or Low
   - **Severity**: Critical, Major, Moderate, or Minor
   - **Date Raised**: Defaults to today
   - **Raised By**: Person who identified the issue

3. **Fill in Optional Fields**:
   - **Category**: Scope, Schedule, Cost, Quality, Resource, Technical, Process, Stakeholder, External, Other
   - **Cause Description**: Root cause (especially for Off-specifications)
   - **Cost Impact**: Estimated cost impact in dollars
   - **Schedule Impact**: Estimated delay in days
   - **Quality/Scope Impact**: Description of quality or scope impacts
   - **Owner**: Person responsible for resolution
   - **Related Product**: Link to product/deliverable (for Off-specifications)
   - **Tags**: Custom tags for categorization

4. **Type-Specific Fields**:
   - **RFC**: Must specify scope of change, cost/schedule impact
   - **Off-spec**: Must link to product/specification
   - **Problem**: Must describe impact

5. **Click "Save"** to create the issue

### Validation Rules

- Title must be at least 10 characters
- Description must be at least 30 characters
- Impact description must be at least 20 characters
- Issue type, priority, and severity are required
- Owner must be assigned for issues in progress
- Off-specifications must link to a product
- RFCs should specify cost or schedule impact

## Managing Issues

### Viewing Issue Details

1. Click on any issue in the list to view full details
2. The Issue Detail view shows:
   - **Overview**: Complete issue information
   - **Actions**: Resolution actions
   - **Decisions**: Decisions made on the issue
   - **Comments**: Discussion thread
   - **History**: Status change timeline

### Editing Issues

1. Click the **"Edit"** button on the issue detail page
2. Modify the fields as needed
3. Click **"Save"** to update

**Note**: Status transitions are validated - you can only transition to valid next statuses.

### Status Management

#### Valid Status Transitions

- `draft` → `raised` (Issue formally logged)
- `raised` → `under_assessment` (Being analyzed)
- `under_assessment` → `awaiting_decision` (Needs decision)
- `awaiting_decision` → `approved` | `rejected` | `deferred`
- `approved` → `in_progress` (Work started)
- `in_progress` → `resolved` (Resolution implemented)
- `resolved` → `closed` (Verified and closed)
- `deferred` → `raised` (Reactivated)
- Any → `cancelled` (Issue no longer valid)
- `closed` → `reopened` → `raised` (If issue recurs)

### Adding Resolution Actions

1. Navigate to the **"Actions"** tab on the issue detail page
2. Click **"Add Action"**
3. Fill in:
   - **Description** (minimum 20 characters)
   - **Action Type**: Investigation, Corrective, Preventive, Workaround, Escalation, Communication, Other
   - **Assigned To**: Person responsible for the action
   - **Target Date**: When the action should be completed
   - **Estimated Effort**: Hours required
   - **Estimated Cost**: Cost of the action

4. Click **"Save"**

### Recording Decisions

1. Navigate to the **"Decisions"** tab on the issue detail page
2. Click **"Record Decision"**
3. Fill in:
   - **Decision Type**: Approve, Reject, Defer, Escalate, Accept Concession, Request More Info
   - **Decision Maker**: Name and role of decision maker
   - **Decision Date**: Date of decision
   - **Rationale** (minimum 20 characters): Why this decision was made
   - **Conditions**: Any conditions attached to the decision
   - **Review Date**: For deferred items

4. Click **"Save"**

### Linking Related Issues

1. Navigate to the **"Overview"** tab on the issue detail page
2. Scroll to **"Related Issues"** section
3. Click **"Add Link"**
4. Select:
   - **Link Type**: Related, Blocks, Blocked By, Duplicate
   - **Issue**: Select the related issue
5. Click **"Add Link"**

### Adding Watchers

1. Navigate to the **"Overview"** tab on the issue detail page
2. Scroll to **"Watchers"** section
3. Click **"Add Watcher"**
4. Select a user from the project team
5. Click **"Add Watcher"**

## Issue Workflows

### RFC Workflow

1. **Raised**: RFC is logged
2. **Under Assessment**: PM analyzes the change request
3. **Awaiting Decision**: Change Authority reviews and decides
4. **Approved**: Decision to proceed with change
5. **In Progress**: Change request created and work started
6. **Resolved**: Change implemented
7. **Closed**: Change verified and closed

**Alternative Paths**:
- **Rejected**: Change request denied → Closed
- **Deferred**: Decision postponed → Raised (when reactivated)

### Off-Specification Workflow

1. **Raised**: Off-spec identified
2. **Under Assessment**: PM analyzes the deviation
3. **Awaiting Decision**: Decision on concession or fix
4. **Approved**: Decision to fix the issue
5. **In Progress**: Corrective actions implemented
6. **Resolved**: Issue fixed
7. **Closed**: Verified and closed

**Alternative Paths**:
- **Resolved** (from Under Assessment): Concession accepted → Closed
- **Rejected**: Fix not required → Closed

### Problem/Concern Workflow

1. **Raised**: Problem identified
2. **Under Assessment**: PM analyzes the problem
3. **In Progress**: Resolution actions implemented
4. **Resolved**: Problem resolved
5. **Closed**: Verified and closed

**Alternative Paths**:
- **Resolved** (from Under Assessment): Quick resolution without actions

## Exporting and Reporting

### Export Options

The Issue Register provides several export options:

1. **CSV Export**: Export all issues to CSV format
   - Click **"CSV"** button in the export menu
   - Opens in Excel or any spreadsheet application

2. **Excel Export**: Export to Excel format
   - Click **"Excel"** button in the export menu
   - Currently exports as CSV (full Excel support coming soon)

3. **PDF Export**: Export register or individual issue to PDF
   - Click **"PDF"** button for register export
   - Click **"Issue PDF"** button for individual issue export
   - Requires jsPDF and html2canvas libraries

4. **Print**: Print-friendly view
   - Click **"Print"** button for register
   - Click **"Print Issue"** button for individual issue
   - Opens print dialog with formatted content

### Reports Available

- **Issue Register Report**: Complete register with all issues
- **Issue Summary Report**: Statistics by type, priority, severity
- **RFC Report**: All RFCs with outcomes and linked change requests
- **Analytics Dashboard**: Charts and metrics (accessible via Analytics tab)

## Best Practices

### When Creating Issues

1. **Be Specific**: Use clear, descriptive titles and descriptions
2. **Provide Context**: Include background information and impact
3. **Set Appropriate Priority/Severity**: Use the priority × severity matrix
4. **Link Related Items**: Link to products, risks, or other issues
5. **Assign Ownership**: Assign an owner early for accountability

### Priority × Severity Matrix

| Priority | Severity | Response |
|----------|----------|----------|
| Critical + Critical/Major | Very High | Immediate action, escalate to Project Board |
| Critical + Moderate/Minor | High | Action within 24 hours, PM involved |
| High + Critical/Major | Very High | Immediate action, escalate to Project Board |
| High + Moderate | High | Action within 24 hours |
| Medium + Critical/Major | High | Action within 1 week |
| Medium + Moderate/Minor | Medium | Action within 1 week, track progress |
| Low | Low | Action when resources available, monitor |

### Managing Issues

1. **Regular Updates**: Update issue status regularly
2. **Track Actions**: Ensure all actions have target dates
3. **Record Decisions**: Document all decisions with rationale
4. **Close Properly**: Provide resolution description when closing
5. **Capture Lessons**: Mark lessons_captured when appropriate

### Quality Checks

The system provides warnings for:
- High priority/severity issues without actions
- Overdue actions
- Issues open too long (30+ days)
- RFCs without decisions
- Off-specs without resolution plans

## Troubleshooting

### Issue Register Not Found

If you see "Issue register not found":
- The register should be created automatically when the project is created
- Contact your PMO Admin if the register is missing

### Cannot Change Status

If you cannot change an issue status:
- Check that the transition is valid (see Status Management section)
- Ensure you have appropriate permissions
- Some statuses cannot be changed (e.g., cancelled)

### Export Not Working

If PDF export fails:
- Ensure jsPDF and html2canvas libraries are installed
- Check browser console for errors
- Try CSV export as an alternative

## Support

For additional help:
- Review the Technical Documentation
- Contact your PMO Admin
- Check the Issue Register Analytics for insights
