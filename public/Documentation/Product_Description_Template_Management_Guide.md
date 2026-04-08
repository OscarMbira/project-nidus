# Product Description Template Management Guide

## Overview

Product Description templates allow PMO Admins to create reusable templates for Product Descriptions. Templates can include pre-populated acceptance criteria, quality expectations, skills, derivations, composition items, and acceptance responsibilities. This streamlines the creation of Product Descriptions for similar products across projects.

## Access

**Role Required**: PMO Admin

**Navigation**: 
- PMO Admin → Product Descriptions → Templates
- Direct URL: `/platform/pmo-admin/product-description-templates`

## Creating Templates

### Step 1: Access Template Management

1. Navigate to PMO Admin section
2. Click on "Product Descriptions" → "Templates"
3. Click "Create Template" button

### Step 2: Fill Template Details

**Basic Information**:
- **Template Name**: Descriptive name (e.g., "Software Product Template", "Document Template")
- **Template Description**: Brief description of when to use this template
- **Template Category**: 
  - `default` - Default template for organization
  - `industry` - Industry-specific template
  - `product_type` - Product type-specific template
  - `custom` - Custom template

**Template Content**:
- **Product Title**: Default product title (can be overridden)
- **Purpose**: Default purpose statement
- **Composition**: Default composition description
- **Derivation**: Default derivation information
- **Development Skills Required**: Default skills description
- **Resource Areas**: Default resource areas
- **Customer Quality Expectations**: Default quality expectations
- **Quality Characteristics**: Default quality characteristics
- **Quality Management System**: Default QMS reference
- **Applicable Standards**: Default standards
- **Satisfaction Targets**: Default satisfaction targets
- **Product Quality Tolerances**: Default tolerances
- **Acceptance Method**: Default acceptance method
- **Acceptance Responsibilities**: Default responsibilities
- **Handover Arrangements**: Default handover details
- **Phased Handover**: Whether phased handover is default

### Step 3: Add Acceptance Criteria

1. Click "Add Acceptance Criterion"
2. Fill in:
   - **Title**: Brief title
   - **Description**: Full description
   - **Category**: Functional, Performance, Quality, etc.
   - **Stakeholder Group**: Users, Operations, Maintenance, etc.
   - **Priority**: Must Have, Should Have, Could Have, Won't Have
   - **Measurement Method**: How it will be measured
   - **Target Value**: Quantifiable target
   - **Unit of Measure**: e.g., seconds, %, count
   - **Tolerances**: Lower and upper limits
   - **Validation Flags**: Measurable, Realistic, Provable
3. Click "Save"

### Step 4: Add Quality Expectations

1. Click "Add Quality Expectation"
2. Fill in:
   - **Category**: Performance, Reliability, Usability, etc.
   - **Description**: Expectation description
   - **Priority**: Critical, High, Medium, Low
   - **Source**: Who/what is the source
   - **Standard Reference**: Related standard if any
3. Click "Save"

### Step 5: Add Skills Required

1. Click "Add Skill"
2. Fill in:
   - **Skill Name**: Name of skill
   - **Description**: Skill description
   - **Category**: Technical, Management, Domain, etc.
   - **Proficiency Level**: Basic, Intermediate, Advanced, Expert
   - **Required For**: Which parts need this skill
   - **Resource Area**: Which area should provide
   - **Is Critical**: Whether critical skill
3. Click "Save"

### Step 6: Add Derivations

1. Click "Add Derivation"
2. Fill in:
   - **Type**: Existing Product, Design Specification, etc.
   - **Title**: Derivation title
   - **Description**: Derivation description
   - **Reference**: External reference
3. Click "Save"

### Step 7: Add Composition Items (if composite product)

1. Click "Add Composition Item"
2. Fill in:
   - **Sub-Product Name**: Name of sub-product
   - **Description**: Sub-product description
   - **Type**: Component, Module, Feature, etc.
   - **Is Mandatory**: Whether mandatory
3. Click "Save"

### Step 8: Add Acceptance Responsibilities

1. Click "Add Responsibility"
2. Fill in:
   - **Responsibility Type**: Accepts Product, Signs Off, etc.
   - **Role Name**: e.g., "Product Owner"
   - **Role Description**: Description of role
3. Click "Save"

### Step 9: Save Template

1. Review all sections
2. Click "Save Template"
3. Template is now available for use

## Managing Templates

### Setting Default Template

1. Find the template you want to set as default
2. Click the star icon (⭐) next to the template
3. Only one template can be default per organization
4. Previous default is automatically unset

### Editing Templates

1. Click the edit icon (✏️) next to the template
2. Make changes to any section
3. Click "Save Template"
4. Changes apply to new Product Descriptions created from template

### Deleting Templates

1. Click the delete icon (🗑️) next to the template
2. Confirm deletion
3. Template is soft-deleted (can be restored if needed)
4. Default templates cannot be deleted (unset default first)

### Making Templates Public

1. Edit template
2. Set "Is Public" to true
3. Template can be shared with other organizations
4. Public templates are visible to all users

## Using Templates

### When Creating Product Description

1. Navigate to project → Product Descriptions → Create
2. Template selector appears at the top
3. Select a template (or choose "Create from Scratch")
4. Product Description is created with template data pre-filled
5. Edit as needed for the specific product

### Template Selection

- **Default Template**: Automatically selected (can be changed)
- **All Templates**: Browse all available templates
- **Filter by Category**: Filter templates by category
- **Search**: Search templates by name or description

## Best Practices

### Template Design

1. **Keep Templates Generic**: Don't include project-specific details
2. **Use Placeholders**: Use placeholders like "[Product Name]" that users can replace
3. **Include Common Criteria**: Add acceptance criteria that apply to most products of this type
4. **Document Standards**: Include applicable standards and quality expectations
5. **Define Skills**: Specify common skills required for this product type

### Template Maintenance

1. **Review Regularly**: Review templates quarterly for relevance
2. **Update Standards**: Update when standards change
3. **Gather Feedback**: Collect feedback from users on template effectiveness
4. **Version Control**: Consider creating new templates for major changes rather than editing existing ones

### Template Organization

1. **Use Categories**: Organize templates by category (industry, product type)
2. **Clear Naming**: Use descriptive names that indicate when to use the template
3. **Documentation**: Add descriptions explaining when to use each template
4. **Default Template**: Set a comprehensive default template for general use

## Integration with Product Descriptions

### Template Data Mapping

When a Product Description is created from a template:

- **Main Fields**: All template fields are copied to Product Description
- **Acceptance Criteria**: All criteria are copied (can be edited)
- **Quality Expectations**: All expectations are copied
- **Skills**: All skills are copied
- **Derivations**: All derivations are copied
- **Composition Items**: All items are copied
- **Responsibilities**: All responsibilities are copied

### Post-Creation

After creating from template:

1. Review all sections
2. Customize for specific product
3. Add product-specific criteria
4. Remove irrelevant items
5. Update references and links
6. Complete validation

## Troubleshooting

### Template Not Appearing

- **Check Permissions**: Ensure you have PMO Admin role
- **Check Organization**: Templates are organization-specific
- **Check Active Status**: Inactive templates don't appear in selector

### Template Data Not Copying

- **Check Template Content**: Ensure template has data in relevant sections
- **Check Template Status**: Only active templates can be used
- **Check Permissions**: Ensure you can create Product Descriptions

### Default Template Not Working

- **Check Default Status**: Only one template can be default
- **Check Active Status**: Default template must be active
- **Check Organization**: Default is organization-specific

## Support

For issues or questions:
1. Check this guide
2. Contact PMO Admin
3. Review Product Description documentation
4. Submit support ticket

---

**Last Updated**: 2026-01-20
**Version**: 1.0
