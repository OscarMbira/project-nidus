# Risk Register Technical Documentation

## Overview

The Risk Register module provides comprehensive risk management functionality following structured project management methodology. It tracks both threats and opportunities, manages pre/post response assessments, response actions, and provides analytics and reporting.

## Database Schema

### Main Tables

#### 1. `risk_registers`
One risk register per project.

**Key Fields**:
- `id` (UUID, PK)
- `project_id` (UUID, UNIQUE, FK to projects)
- `register_reference` (VARCHAR, UNIQUE) - e.g., RR-2026-001
- `version_number` (VARCHAR) - Default '1.0'
- `risk_tolerance_statement` (TEXT)
- `probability_scale` (JSONB)
- `impact_scale` (JSONB)
- `risk_matrix_config` (JSONB)
- `review_frequency` (VARCHAR)
- `last_review_date` (DATE)
- `next_review_date` (DATE)
- `is_active` (BOOLEAN)

**Constraints**:
- UNIQUE on `project_id`
- UNIQUE on `register_reference`

#### 2. `risks`
Individual risk entries with Cause-Event-Effect structure.

**Key Fields**:
- `id` (UUID, PK)
- `risk_register_id` (UUID, FK to risk_registers)
- `risk_identifier` (VARCHAR, UNIQUE) - e.g., R-2026-001
- `risk_number` (INTEGER) - Sequential within register
- `risk_title` (VARCHAR) - Brief title
- `risk_type` (ENUM: 'threat', 'opportunity')
- `cause_description` (TEXT)
- `event_description` (TEXT)
- `effect_description` (TEXT)
- `risk_category` (ENUM)
- **Pre-Response Assessment**:
  - `pre_probability` (INTEGER, 1-5)
  - `pre_impact` (INTEGER, 1-5)
  - `pre_expected_value` (DECIMAL, GENERATED) - P × I
  - `pre_risk_score` (VARCHAR, GENERATED) - Low/Medium/High/Very High
  - `pre_cost_impact` (DECIMAL)
  - `pre_schedule_impact_days` (INTEGER)
- **Post-Response Assessment**:
  - `post_probability` (INTEGER)
  - `post_impact` (INTEGER)
  - `post_expected_value` (DECIMAL, GENERATED)
  - `post_risk_score` (VARCHAR, GENERATED)
- `proximity` (ENUM: 'imminent', 'within_stage', 'within_project', 'beyond_project')
- `response_category` (ENUM)
- `response_strategy` (TEXT)
- `risk_author_id` (UUID, FK to users)
- `risk_owner_id` (UUID, FK to users)
- `risk_actionee_id` (UUID, FK to users)
- `status_enum` (ENUM: 'identified', 'assessing', 'responding', 'monitoring', 'occurred', 'closed', 'expired')

#### 3. `risk_responses`
Response actions for risks.

**Key Fields**:
- `id` (UUID, PK)
- `risk_id` (UUID, FK to risks)
- `response_number` (INTEGER)
- `action_description` (TEXT)
- `action_type` (ENUM: 'preventive', 'corrective', 'contingency', 'fallback')
- `assigned_to_id` (UUID, FK to users)
- `target_date` (DATE)
- `estimated_cost` (DECIMAL)
- `actual_cost` (DECIMAL)
- `status` (ENUM: 'planned', 'in_progress', 'completed', 'cancelled')
- `effectiveness_rating` (ENUM)

#### 4. `risk_assessments`
Assessment history tracking.

**Key Fields**:
- `id` (UUID, PK)
- `risk_id` (UUID, FK to risks)
- `assessment_date` (DATE)
- `assessment_type` (ENUM: 'initial', 'periodic_review', 'post_response', 'closure')
- `assessed_by` (UUID, FK to users)
- `probability` (INTEGER)
- `impact` (INTEGER)
- `expected_value` (DECIMAL)
- `risk_score` (VARCHAR)
- `notes` (TEXT)

### Database Functions

#### `create_risk_register_for_project(p_project_id UUID, p_user_id UUID)`
Creates a risk register when a project is initiated.
- Automatically generates unique reference
- Returns register ID

#### `generate_risk_identifier(p_risk_register_id UUID)`
Generates unique risk identifier (e.g., R-2026-001).

#### `calculate_risk_score(p_probability INTEGER, p_impact INTEGER)`
Calculates expected value and risk level.
Returns: expected_value, risk_level, color_code

#### `get_risk_matrix(p_risk_register_id UUID)`
Returns risk matrix data with risks positioned by probability and impact.
Returns: probability, impact, risk_count, risks (JSONB)

#### `get_top_risks(p_project_id UUID, p_limit INTEGER)`
Returns top risks by expected value.

#### `get_risk_summary(p_project_id UUID)`
Returns summary statistics for a project's risks.
Returns: total_risks, active_risks, threats_count, opportunities_count, high_risks, medium_risks, low_risks, overdue_responses, risks_by_category

#### `escalate_risk_to_issue(p_risk_id UUID, p_user_id UUID)`
Converts a materialized risk to an issue.
Returns new issue ID

#### `create_risk_from_issue(p_issue_id UUID, p_user_id UUID)`
Creates a risk from an issue (for tracking potential recurrence).
Returns new risk ID

## Service Layer

### riskRegisterService.js
- `createRiskRegister(projectId)` - Create register for project
- `getRiskRegisterByProject(projectId)` - Get register by project
- `getRiskRegisterById(registerId)` - Get register by ID
- `updateRiskRegister(registerId, updates)` - Update register
- `configureScales(registerId, scales)` - Configure scales

### riskService.js
- `createRisk(riskData)` - Create new risk
- `getRisksByProject(projectId, filters)` - Get risks with filters
- `getRiskById(riskId)` - Get single risk
- `updateRisk(riskId, updates)` - Update risk
- `deleteRisk(riskId)` - Delete risk
- `closeRisk(riskId, reason, notes)` - Close risk
- `getRiskSummary(projectId)` - Get summary statistics
- `getTopRisks(projectId, limit)` - Get top risks

### riskResponseService.js
- `createResponse(responseData)` - Create response action
- `getResponsesByRisk(riskId)` - Get all responses for risk
- `updateResponse(responseId, updates)` - Update response
- `deleteResponse(responseId)` - Delete response
- `completeResponse(responseId, notes)` - Complete response
- `assessEffectiveness(responseId, rating)` - Rate effectiveness
- `getPendingResponses(projectId)` - Get pending responses
- `getOverdueResponses(projectId)` - Get overdue responses

### riskAssessmentService.js
- `assessRisk(riskId, assessmentData)` - Record assessment
- `updatePreResponse(riskId, assessment)` - Update pre-response assessment
- `updatePostResponse(riskId, assessment)` - Update post-response assessment
- `getAssessmentHistory(riskId)` - Get assessment history
- `calculateRiskScore(probability, impact)` - Calculate score

### riskAnalyticsService.js
- `getRiskMatrix(projectIdOrRegisterId)` - Get matrix data
- `getTopRisks(projectId, limit)` - Get top risks
- `getRiskExposure(projectId)` - Get total exposure
- `getRisksByProximity(projectId)` - Get by proximity

## UI Components

### Core Components
- **EnhancedRiskForm.jsx** - Multi-step wizard for creating/editing risks
  - Step 1: Cause-Event-Effect description
  - Step 2: Pre-response assessment
  - Step 3: Proximity & response strategy
  - Step 4: Ownership (Author, Owner, Actionee)
  - Step 5: Review & save

- **RiskCard.jsx** - Display individual risk
- **RisksList.jsx** - List of risks with filters
- **RisksFilters.jsx** - Filter by type, category, status, owner, score

### Response Components
- **RiskResponsesPanel.jsx** - Manage response actions
- **ResponseForm.jsx** - Add/edit response action
- **ResponseCard.jsx** - Display response action
- **ResponseStatusBadge.jsx** - Status indicator
- **EffectivenessRating.jsx** - Rate effectiveness

### Assessment Components
- **PrePostAssessmentPanel.jsx** - Side-by-side comparison
- **RiskAssessmentHistory.jsx** - Assessment history display

### Visualization Components
- **RiskMatrixChart.jsx** - 5x5 interactive risk matrix
- **TopRisksWidget.jsx** - Top risks display
- **RisksByCategoryChart.jsx** - Category distribution chart
- **RisksByStatusChart.jsx** - Status distribution chart
- **RiskExposureChart.jsx** - Total exposure chart

### Supporting Components
- **RiskTypeBadge.jsx** - Threat/Opportunity indicator
- **RiskScoreBadge.jsx** - Score level indicator
- **RiskStatusBadge.jsx** - Status indicator
- **ProximityBadge.jsx** - Proximity indicator
- **RiskAlerts.jsx** - Alert notifications
- **RiskExportMenu.jsx** - Export options
- **ProjectRiskSummary.jsx** - Summary widget for project page

## Pages

### RiskRegisterView.jsx
Main risk register page with three view modes:
- **List View**: Table/list of risks with filters
- **Matrix View**: Interactive 5x5 risk matrix
- **Analytics View**: Charts and statistics

Features:
- Auto-create register if missing
- Risk alerts display
- Export functionality
- Integrated EnhancedRiskForm

### RiskDetail.jsx
Full risk detail page with tabs:
- **Overview**: Cause-Event-Effect, pre/post assessment, ownership
- **Response Actions**: Manage response actions
- **Assessment History**: Track assessment changes over time

Features:
- Pre/post assessment comparison
- Response management
- Assessment history
- Edit functionality

## Utilities

### riskExport.js
- `exportRiskRegisterToPDF(register, risks, filename)` - Export to PDF
- `exportRiskRegisterToCSV(register, risks, filename)` - Export to CSV
- Uses jsPDF and html2canvas for PDF generation

### riskValidation.js
- `validateRisk(formData)` - Validate risk form
- `validateResponse(responseData)` - Validate response form
- `getRiskCompleteness(risk)` - Get completeness status
- `needsImmediateAttention(risk)` - Check if risk needs attention

## Integration Points

### With Project
- Auto-create register on first access
- Risk summary widget on project detail page
- Risk count in project health indicators

### With Issues Register
- `escalateRiskToIssue()` function to convert risk to issue
- `createRiskFromIssue()` function to create risk from issue
- Two-way linkage via `escalated_from_issue_id` and `escalated_to_issue_id`

### With Risk Management Strategy (RMS)
- Risk Register uses scales and matrix from RMS
- Integration via `apply_rms_to_risk_register()` function

## RLS Policies

- Project team members can view risks for their projects
- Only Project Manager, Team Managers can add risks
- Risk owners can edit their owned risks
- Risk actionees can update response status
- PMO Admins can view and manage all risks in their organization
- High risks automatically visible to project board

## Performance Considerations

- Indexes on:
  - `risk_register_id` on risks
  - `risk_type`, `status_enum`, `risk_category` on risks
  - `pre_expected_value`, `post_expected_value` on risks
  - `proximity`, `proximity_date` on risks
  - `risk_owner_id`, `risk_actionee_id` on risks

- Database functions use SECURITY DEFINER for efficiency
- Generated columns for calculated fields (expected_value, risk_score)

## Error Handling

- Service functions return `{ success: boolean, data?: any, error?: string }`
- Components handle loading and error states
- Validation errors displayed inline
- User-friendly error messages

## Future Enhancements

- Risk matrix drag-and-drop reassessment
- Risk trend charts over time
- Monte Carlo simulation
- Risk interdependencies visualization
- AI-powered risk identification
- Integration with external risk feeds
- Quantitative risk analysis module
