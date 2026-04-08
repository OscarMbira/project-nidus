# Project Product Description - User Guide

## Overview

The Project Product Description (PPD) is a fundamental document that describes what your project will deliver as its final output. It defines the purpose, composition, quality expectations, and acceptance criteria for the overall project product - essentially defining what "done" looks like for the entire project.

## Accessing Project Product Description

1. Navigate to your project from the **Projects** page
2. Click on the project name to open the project detail page
3. Scroll to the **Universal Modules** section
4. Click on **"Project Product Description"**

## Creating a Project Product Description

### Step 1: Initial Creation

1. If no PPD exists, you'll see a message prompting you to create one
2. Click **"Create PPD"** button
3. A 6-step wizard will open to guide you through the process

### Step 2: Wizard Steps

#### Step 1: Title & Purpose
- **Product Title**: Enter the name by which the project is known (minimum 10 characters)
- **Purpose**: Describe the purpose the project product will fulfill and who will use it (minimum 50 characters)
- **Composition**: Provide a high-level description of major products to be delivered
- **Derivation**: List source products/documents from which this is derived

#### Step 2: Composition
- Add major products/deliverables that make up the project product
- Click **"Add Item"** to add a new composition item
- For each item:
  - Product name (required)
  - Product type (deliverable, service, capability, document, system, process, other)
  - Description
  - Mark as mandatory if required
  - Link to detailed product description if available
  - Planned delivery stage

#### Step 3: Skills
- List development skills required to build the product
- Specify which resource areas should supply resources

#### Step 4: Quality
- **Customer Quality Expectations**: Describe quality expected and standards/processes (minimum 50 characters)
- **Quality Characteristics**: Key quality characteristics (fast/slow, large/small, etc.)
- **Quality Management System**: Customer's QMS elements to use
- **Applicable Standards**: Other standards to apply
- **Satisfaction Targets**: Customer/staff satisfaction targets
- **Project Quality Tolerances**: Tolerances for acceptance criteria

#### Step 5: Acceptance
- **Acceptance Method**: How acceptance will be confirmed (minimum 30 characters)
- **Acceptance Responsibilities**: Who confirms acceptance
- **Handover Arrangements**: Complex handover details if applicable
- **Phased Handover**: Check if phased handover is planned
- **Ownership**: Assign Author, Owner, and Client from project team members

#### Step 6: Review
- Review all entries
- Check completeness indicators
- Click **"Save PPD"** to create the PPD

### Step 3: Create from Mandate

If your project has an approved mandate, you can pre-populate the PPD:
1. The system will automatically copy:
   - Mandate title as product title
   - Mandate description as purpose
   - Mandate deliverables as composition items
   - Link derivation to the mandate

## Managing Acceptance Criteria

### Adding Acceptance Criteria

1. Open the PPD view
2. Navigate to the **"Acceptance Criteria"** tab
3. Click **"Add Criterion"** button
4. Fill in the criterion details:
   - **Title**: Brief title (minimum 10 characters)
   - **Description**: Full description (minimum 30 characters)
   - **Category**: Functional, Performance, Quality, Usability, Security, Compliance, Operational, Maintenance, Other
   - **Stakeholder Group**: Users, Operations, Maintenance, Management, Regulatory, All
   - **Priority**: Must Have, Should Have, Could Have, Won't Have
   - **Measurement Method**: How it will be measured (required for Must Have criteria)
   - **Target Value**: Quantifiable target
   - **Unit of Measure**: e.g., seconds, %, count
   - **Tolerances**: Lower and upper tolerance limits
   - **Provability**: Can be proven during project, or specify proxy measure

5. Click **"Save Criterion"**

### Quality Criteria for Acceptance Criteria

Acceptance criteria must be:
- **Measurable**: Can be objectively measured/verified
- **Individually Realistic**: Each criterion is achievable on its own
- **Consistent as a Set**: Criteria don't conflict (e.g., high quality + low cost + fast)
- **Provable**: Can be proven within project life or by proxy measures
- **Complete**: Cover all key stakeholder requirements

### Validating Criteria

The system automatically validates criteria:
- Checks measurability (has measurement method and target)
- Checks provability (can test within project or has proxy measure)
- Checks for conflicts between criteria
- Provides recommendations for improvement

## Conducting Acceptance Testing

### Accessing Acceptance Testing

1. Open the PPD view
2. Click **"Acceptance Testing"** button in the header

### Acceptance Testing Interface

The interface shows:
- **Progress Summary**: Total criteria, passed, failed, pending, and acceptance percentage
- **Can Close Project**: Indicator if all acceptance criteria are met
- **Filters**: Filter by All, Pending, Must Have, Passed, or Failed

### Recording Results

For each criterion:
1. Review the criterion details and measurement method
2. Conduct the test or review
3. Click one of the action buttons:
   - **Pass**: Criterion meets the requirement
   - **Fail**: Criterion does not meet the requirement
   - **Waive**: Criterion is waived (with justification)
   - **Defer**: Testing deferred to later date
4. Enter notes explaining the result
5. Click OK to save

### Viewing Progress

- The progress bar shows overall acceptance percentage
- Summary cards show counts for passed, failed, and pending criteria
- Individual criteria show their current status with color coding:
  - Green: Passed
  - Red: Failed
  - Yellow: Waived
  - Blue: Deferred
  - Gray: Pending

## Exporting and Reporting

### Export Options

From the PPD view, use the export menu:
- **CSV**: Export PPD data to CSV format
- **PDF**: Export PPD to PDF document
- **Print**: Open printable view in new window

From the Acceptance Testing page:
- **Export Report**: Export acceptance test report to CSV

### Export Formats

**CSV Export** includes:
- PPD basic information
- Composition items table
- Acceptance criteria table

**PDF Export** includes:
- Complete PPD document
- All composition items
- All acceptance criteria with details
- Formatted for professional presentation

**Acceptance Report** includes:
- Summary statistics
- Detailed criteria results
- Acceptance dates and notes

## Best Practices

### Writing Effective Acceptance Criteria

1. **Be Specific**: Use clear, unambiguous language
2. **Make it Measurable**: Define how you'll measure success
3. **Set Realistic Targets**: Ensure targets are achievable
4. **Consider Stakeholders**: Address needs of all stakeholder groups
5. **Avoid Conflicts**: Ensure criteria don't conflict with each other

### Composition Items

1. **Be Comprehensive**: List all major deliverables
2. **Be Specific**: Clearly name each item
3. **Link Details**: Link to detailed product descriptions when available
4. **Mark Mandatory**: Clearly identify required vs. optional items

### Quality Expectations

1. **Reference Standards**: Cite specific standards and requirements
2. **Set Targets**: Define measurable quality targets
3. **Consider All Aspects**: Cover performance, reliability, usability, security, etc.

## Status and Workflow

### PPD Statuses

- **Draft**: Initial creation, can be edited freely
- **Under Review**: Submitted for approval, limited editing
- **Approved**: Finalized, changes require change control
- **Superseded**: Replaced by newer version

### Workflow

1. Create PPD in **Draft** status
2. Add composition items and acceptance criteria
3. Complete all required sections
4. Submit for approval (status changes to **Under Review**)
5. Once approved (status changes to **Approved**), use for acceptance testing
6. Record acceptance results as project progresses
7. Review acceptance status before project closure

## Troubleshooting

### Common Issues

**Issue**: Cannot edit PPD
- **Solution**: Only PPDs in Draft or Under Review status can be edited. Approved PPDs require change control.

**Issue**: Cannot delete PPD
- **Solution**: Only Draft PPDs can be deleted. Other statuses require change control.

**Issue**: Validation errors when adding criteria
- **Solution**: Ensure all required fields are filled, especially measurement method for Must Have criteria.

**Issue**: Cannot record acceptance
- **Solution**: Ensure you have appropriate permissions. Check that the PPD is approved.

### Getting Help

For additional assistance:
- Check the technical documentation
- Contact your project administrator
- Review the project management methodology guidelines

## Summary

The Project Product Description is a critical document that:
- Defines what "done" looks like for your project
- Sets clear acceptance criteria for stakeholders
- Provides a basis for acceptance testing
- Supports project closure decisions

Take time to create a comprehensive and well-thought-out PPD - it will serve as a valuable reference throughout your project lifecycle.
