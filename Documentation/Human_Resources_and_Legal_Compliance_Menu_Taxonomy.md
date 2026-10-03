# Project Nidus — Human Resources & Legal/Compliance Menu Taxonomy

> **Purpose:** Define deep, project-management-oriented menu structures for:
>
> 1. Human Resources
> 2. Legal & Compliance
>
> These structures are intended for Project Nidus SaaS and should be implemented as configurable, database-driven capability/menu packs.
>
> This document does **not** override `CLAUDE.md`, `ROADMAP.md`, or `REVIEW.md`.
>
> Claude/Cursor must inspect the existing menu architecture, routes, modules, database tables, permissions, shared components, and Admin configuration before creating new capabilities.

---

# 1. Core Design Principle

Human Resources and Legal/Compliance should operate as domain capability packs on top of the generic Project Nidus PMIS.

Preferred architecture:

```text
Generic Project Management
        +
Human Resources Capability Pack
        +
Legal & Compliance Capability Pack
        +
Organisation Configuration
        +
Subscription / Feature Entitlements
        +
Role / Permission Filtering
```

Do not create separate PMIS applications for these domains.

Reuse generic Project Nidus capabilities wherever practical.

Examples:

```text
HR Risks
→ Reuse generic Risk Management

Legal Issues
→ Reuse generic Issue Management

Contract Approvals
→ Reuse generic Approval / Governance engine

HR Budget
→ Reuse generic Cost Management

HR Resources
→ Reuse generic Resource Management

Compliance Actions
→ Reuse generic Action Management

Legal Documents
→ Reuse generic Document Management

HR / Legal Dashboards
→ Reuse generic Reporting framework
```

---

# 2. Suggested Domain Codes

| Code | Domain |
|---|---|
| HRM | Human Resources Management |
| LCO | Legal & Compliance |

These codes are suggestions only.

Claude should first inspect existing Admin/domain coding standards before creating new codes.

---

# 3. Human Resources Menu Structure

```text
HUMAN RESOURCES
│
├── HR Portfolio
│   ├── HR Overview
│   ├── HR Project Portfolio
│   ├── HR Transformation Roadmap
│   ├── Strategic HR Initiatives
│   ├── HR Milestones
│   ├── HR Programme Health
│   └── HR Executive Dashboard
│
├── HR Strategy & Planning
│   ├── HR Strategy
│   │   ├── Strategic Objectives
│   │   ├── HR Priorities
│   │   ├── Target Operating Model
│   │   ├── Strategic Initiatives
│   │   └── Strategic Measures
│   │
│   ├── Workforce Strategy
│   │   ├── Workforce Demand
│   │   ├── Workforce Supply
│   │   ├── Skills Demand
│   │   ├── Capacity Gaps
│   │   ├── Workforce Scenarios
│   │   └── Workforce Forecast
│   │
│   ├── HR Operating Model
│   │   ├── HR Structure
│   │   ├── HR Service Model
│   │   ├── Shared Services
│   │   ├── Centres of Excellence
│   │   ├── HR Business Partners
│   │   └── HR Governance
│   │
│   └── HR Annual Plan
│       ├── Annual Priorities
│       ├── HR Calendar
│       ├── HR Projects
│       ├── HR Budget
│       └── HR Performance Targets
│
├── Organisation Design
│   ├── Organisation Structure
│   │   ├── Current Structure
│   │   ├── Proposed Structure
│   │   ├── Business Units
│   │   ├── Departments
│   │   ├── Teams
│   │   └── Reporting Lines
│   │
│   ├── Organisation Design Requests
│   ├── Role Design
│   │   ├── Role Catalogue
│   │   ├── Job Families
│   │   ├── Job Levels
│   │   ├── Role Profiles
│   │   └── Role Changes
│   │
│   ├── Position Management
│   │   ├── Position Register
│   │   ├── Vacant Positions
│   │   ├── Filled Positions
│   │   ├── New Positions
│   │   └── Position Closure
│   │
│   ├── Span of Control
│   ├── Organisation Design Impact
│   └── Organisation Design Approval
│
├── Workforce Planning
│   ├── Workforce Plan
│   ├── Headcount Plan
│   ├── Current Headcount
│   ├── Forecast Headcount
│   ├── Critical Roles
│   ├── Skills Inventory
│   ├── Skills Gap Analysis
│   ├── Resource Demand
│   ├── Resource Supply
│   ├── Succession Risks
│   └── Workforce Scenarios
│
├── Recruitment & Talent Acquisition
│   ├── Recruitment Plan
│   ├── Vacancy Register
│   ├── Recruitment Requests
│   ├── Job Descriptions
│   ├── Candidate Pipeline
│   │   ├── Applied
│   │   ├── Screening
│   │   ├── Shortlisted
│   │   ├── Interview
│   │   ├── Offer
│   │   └── Hired
│   │
│   ├── Interview Planning
│   ├── Interview Assessments
│   ├── Reference Checks
│   ├── Background Checks
│   ├── Offers
│   ├── Recruitment Approvals
│   ├── Recruitment Vendors
│   ├── Recruitment Costs
│   └── Recruitment Performance
│
├── Onboarding
│   ├── New Joiner Register
│   ├── Pre-Employment Requirements
│   ├── Contracts
│   ├── Documentation
│   ├── Equipment / Access Requests
│   ├── Induction
│   ├── Mandatory Training
│   ├── Manager Checklist
│   ├── Employee Checklist
│   ├── Probation
│   ├── Onboarding Feedback
│   └── Onboarding Completion
│
├── Employee Records
│   ├── Employee Directory
│   ├── Personal Information
│   ├── Employment Information
│   ├── Contact Information
│   ├── Employment History
│   ├── Role History
│   ├── Department History
│   ├── Contract History
│   ├── Qualification Records
│   ├── Certifications
│   ├── Emergency Contacts
│   └── Employee Documents
│
├── Employment Contracts
│   ├── Contract Register
│   ├── Permanent Contracts
│   ├── Fixed-Term Contracts
│   ├── Temporary Contracts
│   ├── Consultant Agreements
│   ├── Contract Amendments
│   ├── Contract Renewals
│   ├── Contract Expiry
│   ├── Contract Approval
│   └── Contract Archive
│
├── Performance Management
│   ├── Performance Cycle
│   ├── Objectives
│   ├── KPIs
│   ├── Goal Setting
│   ├── Mid-Year Review
│   ├── Year-End Review
│   ├── Performance Ratings
│   ├── Calibration
│   ├── Performance Improvement Plans
│   ├── Manager Feedback
│   ├── Employee Feedback
│   └── Performance History
│
├── Learning & Development
│   ├── Learning Strategy
│   ├── Training Needs Analysis
│   ├── Skills Gaps
│   ├── Learning Catalogue
│   ├── Training Calendar
│   ├── Training Requests
│   ├── Training Enrolment
│   ├── Attendance
│   ├── Assessments
│   ├── Certifications
│   ├── Mandatory Training
│   ├── Leadership Development
│   ├── Professional Development
│   ├── Training Vendors
│   ├── Training Costs
│   └── Training Effectiveness
│
├── Talent Management
│   ├── Talent Pool
│   ├── High Potential Employees
│   ├── Critical Talent
│   ├── Talent Reviews
│   ├── Career Paths
│   ├── Development Plans
│   ├── Mobility
│   ├── Retention Risks
│   └── Talent Actions
│
├── Succession Planning
│   ├── Critical Positions
│   ├── Successor Candidates
│   ├── Readiness Assessment
│   ├── Succession Risk
│   ├── Development Actions
│   ├── Emergency Succession
│   └── Succession Review
│
├── Compensation & Benefits
│   ├── Compensation Strategy
│   ├── Salary Structures
│   ├── Salary Bands
│   ├── Salary Review
│   ├── Promotions
│   ├── Bonuses
│   ├── Allowances
│   ├── Benefits
│   ├── Benefits Eligibility
│   ├── Benefits Providers
│   ├── Compensation Approvals
│   └── Compensation Analysis
│
├── Payroll Readiness
│   ├── Payroll Calendar
│   ├── Payroll Inputs
│   ├── New Joiners
│   ├── Leavers
│   ├── Salary Changes
│   ├── Allowances
│   ├── Deductions
│   ├── Exceptions
│   ├── Payroll Validation
│   └── Payroll Sign-Off
│
├── Time & Attendance
│   ├── Working Calendars
│   ├── Attendance
│   ├── Timesheets
│   ├── Overtime
│   ├── Absence
│   ├── Exceptions
│   └── Attendance Reports
│
├── Leave Management
│   ├── Leave Types
│   ├── Leave Entitlements
│   ├── Leave Requests
│   ├── Approvals
│   ├── Leave Calendar
│   ├── Leave Balances
│   ├── Absence Trends
│   └── Leave Reports
│
├── Employee Relations
│   ├── Employee Relations Register
│   ├── Grievances
│   ├── Disciplinary Cases
│   ├── Investigations
│   ├── Hearings
│   ├── Appeals
│   ├── Workplace Conflicts
│   ├── Mediation
│   ├── Resolutions
│   └── Case Closure
│
├── Employee Engagement
│   ├── Engagement Strategy
│   ├── Engagement Surveys
│   ├── Pulse Surveys
│   ├── Employee Feedback
│   ├── Engagement Scores
│   ├── Culture Initiatives
│   ├── Recognition
│   ├── Engagement Actions
│   └── Engagement Trends
│
├── Culture & Change
│   ├── Culture Assessment
│   ├── Target Culture
│   ├── Change Impact
│   ├── Change Readiness
│   ├── Change Champions
│   ├── Communication
│   ├── Adoption
│   ├── Resistance
│   └── Culture / Change Actions
│
├── Diversity, Equity & Inclusion
│   ├── DEI Strategy
│   ├── Representation
│   ├── Inclusion Initiatives
│   ├── Accessibility
│   ├── Equal Opportunity
│   ├── DEI Risks
│   ├── DEI Actions
│   └── DEI Reporting
│
├── Health, Safety & Wellbeing
│   ├── Employee Wellbeing
│   ├── Occupational Health
│   ├── Workplace Safety
│   ├── Health Assessments
│   ├── Employee Assistance
│   ├── Wellbeing Initiatives
│   ├── Workplace Incidents
│   ├── Return to Work
│   └── Wellbeing Reporting
│
├── HR Policies
│   ├── Policy Register
│   ├── Draft Policies
│   ├── Policy Reviews
│   ├── Policy Approvals
│   ├── Published Policies
│   ├── Employee Acknowledgement
│   ├── Policy Exceptions
│   └── Policy Review Calendar
│
├── HR Compliance
│   ├── Employment Law Requirements
│   ├── Labour Compliance
│   ├── Mandatory Records
│   ├── Statutory Reporting
│   ├── Compliance Reviews
│   ├── Compliance Findings
│   ├── Corrective Actions
│   └── Compliance Evidence
│
├── HR Projects
│   ├── HR Transformation
│   ├── HRIS Implementation
│   ├── Payroll Implementation
│   ├── Organisation Restructure
│   ├── Talent Programme
│   ├── Culture Programme
│   ├── Learning Programme
│   ├── Workforce Optimisation
│   └── HR Project Dashboard
│
├── HR Technology
│   ├── HR Systems Register
│   ├── HRIS
│   ├── Payroll Systems
│   ├── Recruitment Systems
│   ├── Learning Systems
│   ├── Performance Systems
│   ├── Integrations
│   ├── HR Data Migration
│   ├── Testing
│   └── System Readiness
│
├── HR Data & Analytics
│   ├── Headcount
│   ├── Turnover
│   ├── Attrition
│   ├── Recruitment Metrics
│   ├── Performance Metrics
│   ├── Learning Metrics
│   ├── Engagement Metrics
│   ├── Diversity Metrics
│   ├── Absence Metrics
│   ├── Workforce Cost
│   └── HR Trends
│
├── HR Budget & Cost
│   ├── HR Budget
│   ├── Recruitment Cost
│   ├── Training Cost
│   ├── Compensation Cost
│   ├── Benefits Cost
│   ├── Contractor Cost
│   ├── HR Project Cost
│   ├── Forecast
│   └── Variance
│
├── HR Risks & Issues
│   ├── Workforce Risks
│   ├── Talent Risks
│   ├── Compliance Risks
│   ├── Employee Relations Risks
│   ├── Change Risks
│   ├── HR Technology Risks
│   ├── HR Issues
│   └── Escalations
│
├── HR Governance
│   ├── HR Governance Structure
│   ├── HR Committee
│   ├── Remuneration Committee
│   ├── Talent Committee
│   ├── HR Decisions
│   ├── HR Actions
│   ├── HR Approvals
│   └── Governance Calendar
│
├── Offboarding
│   ├── Leaver Register
│   ├── Resignations
│   ├── Retirement
│   ├── Termination
│   ├── Exit Checklist
│   ├── Knowledge Transfer
│   ├── Asset Return
│   ├── Access Removal
│   ├── Exit Interview
│   ├── Final Payroll Inputs
│   └── Offboarding Completion
│
└── HR Knowledge & Lessons
    ├── HR Lessons Learned
    ├── HR Best Practices
    ├── HR Templates
    ├── HR Playbooks
    ├── Workforce Insights
    ├── Policy Guidance
    └── HR Case Studies
```

---

# 4. Legal & Compliance Menu Structure

```text
LEGAL & COMPLIANCE
│
├── Legal & Compliance Portfolio
│   ├── Legal Overview
│   ├── Compliance Overview
│   ├── Legal Project Portfolio
│   ├── Compliance Programme Portfolio
│   ├── Regulatory Change Portfolio
│   ├── Key Legal Milestones
│   └── Executive Dashboard
│
├── Legal Strategy
│   ├── Legal Strategy
│   ├── Legal Priorities
│   ├── Legal Operating Model
│   ├── Legal Service Delivery
│   ├── External Counsel Strategy
│   └── Legal Performance Measures
│
├── Compliance Strategy
│   ├── Compliance Framework
│   ├── Compliance Objectives
│   ├── Compliance Operating Model
│   ├── Three Lines Model
│   ├── Compliance Calendar
│   ├── Compliance Plan
│   └── Compliance KPIs
│
├── Legal Matter Management
│   ├── Matter Register
│   ├── New Matters
│   ├── Open Matters
│   ├── Matter Classification
│   ├── Matter Owners
│   ├── Matter Deadlines
│   ├── Matter Actions
│   ├── Matter Documents
│   ├── Matter Costs
│   ├── Matter Status
│   └── Closed Matters
│
├── Contract Management
│   ├── Contract Register
│   ├── Contract Requests
│   ├── Contract Drafting
│   ├── Contract Review
│   ├── Negotiations
│   ├── Contract Approval
│   ├── Contract Execution
│   ├── Active Contracts
│   ├── Obligations
│   ├── Renewals
│   ├── Expiries
│   ├── Termination
│   └── Contract Archive
│
├── Contract Obligations
│   ├── Obligation Register
│   ├── Deliverables
│   ├── Payment Obligations
│   ├── Reporting Obligations
│   ├── Notice Requirements
│   ├── Compliance Dates
│   ├── Obligation Owners
│   ├── Overdue Obligations
│   └── Obligation Closure
│
├── Legal Review
│   ├── Review Requests
│   ├── Commercial Review
│   ├── Project Document Review
│   ├── Procurement Review
│   ├── Marketing Review
│   ├── HR Review
│   ├── Technology Review
│   ├── Regulatory Review
│   ├── Legal Opinion
│   └── Review Closure
│
├── Regulatory Compliance
│   ├── Regulatory Register
│   ├── Regulators
│   ├── Applicable Regulations
│   ├── Regulatory Obligations
│   ├── Regulatory Approvals
│   ├── Regulatory Submissions
│   ├── Regulatory Reporting
│   ├── Regulatory Correspondence
│   ├── Regulatory Findings
│   └── Regulatory Evidence
│
├── Regulatory Change
│   ├── Regulatory Change Register
│   ├── New Regulations
│   ├── Regulatory Updates
│   ├── Impact Assessment
│   ├── Gap Assessment
│   ├── Implementation Plan
│   ├── Business Actions
│   ├── Technology Actions
│   ├── Policy Changes
│   ├── Training
│   ├── Compliance Testing
│   └── Implementation Closure
│
├── Compliance Obligations
│   ├── Obligation Register
│   ├── Legal Obligations
│   ├── Regulatory Obligations
│   ├── Contractual Obligations
│   ├── Internal Policy Obligations
│   ├── Obligation Owners
│   ├── Due Dates
│   ├── Evidence
│   ├── Breaches
│   └── Obligation Closure
│
├── Compliance Risk
│   ├── Compliance Risk Register
│   ├── Risk Identification
│   ├── Risk Assessment
│   ├── Inherent Risk
│   ├── Controls
│   ├── Residual Risk
│   ├── Risk Treatment
│   ├── Risk Owners
│   └── Risk Monitoring
│
├── Compliance Monitoring
│   ├── Monitoring Plan
│   ├── Monitoring Reviews
│   ├── Testing Procedures
│   ├── Sample Testing
│   ├── Findings
│   ├── Exceptions
│   ├── Corrective Actions
│   └── Monitoring Reports
│
├── Compliance Testing
│   ├── Testing Plan
│   ├── Test Universe
│   ├── Test Cases
│   ├── Test Execution
│   ├── Evidence
│   ├── Findings
│   ├── Retesting
│   └── Sign-Off
│
├── Policies & Standards
│   ├── Policy Register
│   ├── Draft Policies
│   ├── Legal Review
│   ├── Compliance Review
│   ├── Policy Approval
│   ├── Published Policies
│   ├── Standards
│   ├── Procedures
│   ├── Employee Acknowledgement
│   ├── Policy Exceptions
│   └── Review Calendar
│
├── Controls Management
│   ├── Control Register
│   ├── Preventive Controls
│   ├── Detective Controls
│   ├── Manual Controls
│   ├── Automated Controls
│   ├── Control Owners
│   ├── Control Testing
│   ├── Control Failures
│   ├── Remediation
│   └── Control Effectiveness
│
├── Compliance Findings
│   ├── Finding Register
│   ├── Internal Findings
│   ├── Regulatory Findings
│   ├── Audit Findings
│   ├── Compliance Testing Findings
│   ├── Severity
│   ├── Root Cause
│   ├── Management Response
│   ├── Remediation Actions
│   └── Closure
│
├── Legal Risks & Issues
│   ├── Legal Risk Register
│   ├── Contract Risks
│   ├── Litigation Risks
│   ├── Regulatory Risks
│   ├── Compliance Risks
│   ├── Legal Issues
│   ├── Escalations
│   └── Closed Risks / Issues
│
├── Litigation & Disputes
│   ├── Litigation Register
│   ├── Claims
│   ├── Disputes
│   ├── Court Matters
│   ├── Arbitration
│   ├── Mediation
│   ├── Hearings
│   ├── Legal Strategy
│   ├── Legal Counsel
│   ├── Court Dates
│   ├── Evidence
│   ├── Legal Costs
│   ├── Settlements
│   └── Matter Closure
│
├── Claims Management
│   ├── Claims Register
│   ├── Claims Received
│   ├── Claims Submitted
│   ├── Claim Assessment
│   ├── Evidence
│   ├── Negotiation
│   ├── Settlement
│   ├── Claim Payment
│   └── Claim Closure
│
├── Legal Opinions
│   ├── Opinion Requests
│   ├── Legal Research
│   ├── Draft Opinions
│   ├── Review
│   ├── Approved Opinions
│   └── Opinion Archive
│
├── Corporate Governance
│   ├── Governance Framework
│   ├── Board Matters
│   ├── Board Committees
│   ├── Delegated Authorities
│   ├── Governance Decisions
│   ├── Resolutions
│   ├── Conflicts of Interest
│   ├── Governance Actions
│   └── Governance Calendar
│
├── Company Secretariat
│   ├── Entity Register
│   ├── Directors
│   ├── Officers
│   ├── Shareholders
│   ├── Board Meetings
│   ├── Agendas
│   ├── Minutes
│   ├── Resolutions
│   ├── Statutory Filings
│   └── Corporate Records
│
├── Entity Management
│   ├── Legal Entities
│   ├── Subsidiaries
│   ├── Branches
│   ├── Joint Ventures
│   ├── Licences
│   ├── Registrations
│   ├── Directors / Officers
│   ├── Filing Calendar
│   └── Entity Documents
│
├── Licences & Permits
│   ├── Licence Register
│   ├── Permit Register
│   ├── Applications
│   ├── Approvals
│   ├── Conditions
│   ├── Renewal Dates
│   ├── Expiries
│   ├── Compliance Evidence
│   └── Licence Closure
│
├── Data Privacy
│   ├── Privacy Framework
│   ├── Data Inventory
│   ├── Processing Activities
│   ├── Privacy Assessments
│   ├── Consent
│   ├── Data Subject Requests
│   ├── Data Sharing
│   ├── Data Retention
│   ├── Privacy Breaches
│   ├── Privacy Actions
│   └── Privacy Reporting
│
├── Ethics & Conduct
│   ├── Code of Conduct
│   ├── Ethics Programme
│   ├── Ethics Declarations
│   ├── Conflicts of Interest
│   ├── Gifts & Hospitality
│   ├── Outside Interests
│   ├── Ethics Breaches
│   ├── Investigations
│   └── Ethics Reporting
│
├── Whistleblowing
│   ├── Whistleblowing Register
│   ├── Reports Received
│   ├── Triage
│   ├── Investigation
│   ├── Evidence
│   ├── Findings
│   ├── Remediation
│   ├── Confidentiality
│   └── Case Closure
│
├── Investigations
│   ├── Investigation Register
│   ├── Investigation Plan
│   ├── Investigators
│   ├── Allegations
│   ├── Interviews
│   ├── Evidence
│   ├── Findings
│   ├── Recommendations
│   ├── Management Actions
│   └── Closure
│
├── Anti-Bribery & Corruption
│   ├── ABC Framework
│   ├── Risk Assessments
│   ├── Gifts & Hospitality
│   ├── Third-Party Due Diligence
│   ├── Political / Charitable Contributions
│   ├── Training
│   ├── Breaches
│   └── Monitoring
│
├── AML / Financial Crime
│   ├── AML Framework
│   ├── Customer Risk
│   ├── KYC
│   ├── Sanctions
│   ├── Transaction Monitoring
│   ├── Alerts
│   ├── Investigations
│   ├── Suspicious Activity
│   ├── Regulatory Reporting
│   └── AML Assurance
│
├── Sanctions Compliance
│   ├── Sanctions Framework
│   ├── Sanctions Lists
│   ├── Screening
│   ├── Alerts
│   ├── Investigations
│   ├── Escalations
│   ├── Licensing
│   └── Reporting
│
├── Third-Party Compliance
│   ├── Third-Party Register
│   ├── Due Diligence
│   ├── Risk Classification
│   ├── Contract Requirements
│   ├── Compliance Certifications
│   ├── Monitoring
│   ├── Issues
│   └── Offboarding
│
├── Competition / Antitrust
│   ├── Competition Requirements
│   ├── Competition Reviews
│   ├── Market Conduct
│   ├── Agreements
│   ├── Investigations
│   ├── Breaches
│   └── Training
│
├── Consumer Protection
│   ├── Consumer Requirements
│   ├── Product Reviews
│   ├── Marketing Reviews
│   ├── Disclosure Requirements
│   ├── Complaints
│   ├── Conduct Risks
│   └── Consumer Remediation
│
├── Intellectual Property
│   ├── IP Register
│   ├── Trademarks
│   ├── Copyright
│   ├── Patents
│   ├── Designs
│   ├── Domain Names
│   ├── Licensing
│   ├── Renewals
│   ├── Infringement
│   └── IP Disputes
│
├── Legal Document Management
│   ├── Legal Documents
│   ├── Templates
│   ├── Precedents
│   ├── Opinions
│   ├── Contracts
│   ├── Court Documents
│   ├── Regulatory Documents
│   ├── Evidence
│   ├── Version History
│   └── Archive
│
├── Legal Holds & Records
│   ├── Legal Hold Register
│   ├── Hold Notices
│   ├── Custodians
│   ├── Preserved Records
│   ├── Release of Hold
│   └── Legal Hold Audit
│
├── External Counsel
│   ├── Law Firm Register
│   ├── Panel Firms
│   ├── Engagements
│   ├── Matter Assignments
│   ├── Rates
│   ├── Budgets
│   ├── Invoices
│   ├── Performance
│   └── Firm Reviews
│
├── Legal Budget & Spend
│   ├── Legal Budget
│   ├── Matter Budgets
│   ├── External Counsel Spend
│   ├── Litigation Spend
│   ├── Compliance Programme Cost
│   ├── Actuals
│   ├── Forecast
│   └── Variance
│
├── Compliance Training
│   ├── Training Requirements
│   ├── Mandatory Training
│   ├── Target Population
│   ├── Training Schedule
│   ├── Completion
│   ├── Assessments
│   ├── Exceptions
│   └── Training Evidence
│
├── Audit & Assurance
│   ├── Audit Universe
│   ├── Assurance Plan
│   ├── Reviews
│   ├── Findings
│   ├── Recommendations
│   ├── Management Actions
│   ├── Follow-Up
│   └── Closure
│
├── Regulatory Reporting
│   ├── Reporting Obligations
│   ├── Reporting Calendar
│   ├── Data Collection
│   ├── Draft Returns
│   ├── Review
│   ├── Approval
│   ├── Submission
│   ├── Regulator Queries
│   └── Submission Archive
│
├── Compliance Breaches
│   ├── Breach Register
│   ├── New Breaches
│   ├── Materiality Assessment
│   ├── Root Cause
│   ├── Remediation
│   ├── Regulatory Notification
│   ├── Customer Remediation
│   └── Breach Closure
│
├── Remediation Programmes
│   ├── Remediation Portfolio
│   ├── Regulatory Remediation
│   ├── Audit Remediation
│   ├── Compliance Remediation
│   ├── Customer Remediation
│   ├── Actions
│   ├── Evidence
│   ├── Validation
│   └── Closure
│
├── Legal & Compliance Projects
│   ├── Regulatory Change Projects
│   ├── Compliance Transformation
│   ├── Contract Transformation
│   ├── Privacy Projects
│   ├── Legal Technology
│   ├── Remediation Projects
│   ├── Governance Projects
│   └── Project Dashboard
│
├── Legal Technology
│   ├── Legal Systems
│   ├── Contract Systems
│   ├── Matter Management
│   ├── Compliance Systems
│   ├── Regulatory Systems
│   ├── eDiscovery
│   ├── Integrations
│   ├── Data Migration
│   ├── Testing
│   └── Technology Readiness
│
├── Legal & Compliance Analytics
│   ├── Open Matters
│   ├── Contract Metrics
│   ├── Regulatory Obligations
│   ├── Compliance Findings
│   ├── Breach Trends
│   ├── Litigation Exposure
│   ├── Legal Spend
│   ├── Control Effectiveness
│   ├── Training Completion
│   └── Risk Trends
│
├── Legal & Compliance Governance
│   ├── Legal Committee
│   ├── Compliance Committee
│   ├── Risk Committee
│   ├── Ethics Committee
│   ├── Privacy Committee
│   ├── Decisions
│   ├── Actions
│   ├── Approvals
│   └── Governance Calendar
│
└── Legal & Compliance Knowledge
    ├── Legal Precedents
    ├── Legal Opinions
    ├── Regulatory Guidance
    ├── Compliance Guidance
    ├── Templates
    ├── Playbooks
    ├── Lessons Learned
    ├── Case Studies
    └── Best Practices
```

---

# 5. Project Management Integration

Human Resources and Legal/Compliance menus must integrate with the generic PMIS rather than becoming isolated operational systems.

Examples:

## Human Resources

```text
HR Transformation Project
        │
        ├── Generic Project Schedule
        ├── Generic Risks / Issues
        ├── Generic Budget
        ├── Generic Stakeholders
        ├── Generic Change Control
        └── HR-Specific Workstreams
             ├── Organisation Design
             ├── Recruitment
             ├── Training
             ├── HR Technology
             └── Change / Engagement
```

## Legal & Compliance

```text
Regulatory Change Project
        │
        ├── Generic Project Schedule
        ├── Generic Risks / Issues
        ├── Generic Actions
        ├── Generic Governance
        ├── Generic Documents
        └── Legal/Compliance Workstreams
             ├── Regulatory Analysis
             ├── Impact Assessment
             ├── Policy Changes
             ├── Control Changes
             ├── Training
             └── Compliance Testing
```

---

# 6. Reuse Matrix

Claude should prefer the following mappings.

| Domain capability | Reuse / Extend |
|---|---|
| HR Risks & Issues | Generic RAID |
| HR Budget & Cost | Generic Cost Management |
| HR Governance | Generic Governance |
| HR Projects | Generic Project / Programme capability |
| Recruitment Projects | Generic planning + HR-specific records |
| HR Training | Shared training capability if one exists |
| Legal Risks & Issues | Generic RAID |
| Compliance Actions | Generic Action Register |
| Legal Approvals | Generic Approval engine |
| Contract Documents | Generic Document Management |
| Contract Dates | Generic Milestones / Calendar where appropriate |
| External Counsel Cost | Generic Cost Management |
| Legal Projects | Generic Project / Programme capability |
| Compliance Testing | Shared Testing capability where suitable |
| Regulatory Change | Generic Change engine plus regulatory-specific extension |
| Compliance Findings | Shared Issue/Finding/remediation model where appropriate |
| Audit & Assurance | Shared quality/testing/action capabilities where practical |

---

# 7. Recommended Navigation Depth

The menu taxonomy is intentionally deep.

Do not display every node directly in the left sidebar.

Recommended UX mapping:

```text
Level 1 → Domain / sidebar heading
Level 2 → Expandable module
Level 3 → Primary page
Level 4+ → Tabs, filters, sub-navigation, workflows, or record sections
```

Example:

```text
Contract Management
    ↓
Contract Register
    ↓
Selected Contract
       ├── Details
       ├── Parties
       ├── Terms
       ├── Obligations
       ├── Milestones
       ├── Documents
       ├── Approvals
       ├── Risks
       ├── Costs
       └── Audit
```

---

# 8. Role-Based Access Examples

## Human Resources

Potential professional/security personas:

```text
HR Director
HR Manager
HR Business Partner
Recruiter
Learning Administrator
Talent Manager
Payroll Administrator
Employee Relations Officer
HR Analyst
Project Manager
PMO
```

Sensitive employee information must be more restricted than ordinary project information.

## Legal & Compliance

Potential personas:

```text
General Counsel
Legal Counsel
Contract Manager
Company Secretary
Compliance Officer
Compliance Manager
Privacy Officer
Financial Crime Officer
Regulatory Affairs Officer
Legal Operations
Project Manager
PMO
```

Do not infer authorization solely from professional role labels.

Actual access must use the existing role/permission architecture.

---

# 9. Sensitive Data Requirement

Both packs contain potentially sensitive information.

Claude must perform a DEEP security review for capabilities involving:

## HR

- employee personal information
- compensation
- disciplinary matters
- grievances
- health information
- background checks
- performance information
- payroll
- diversity information

## Legal & Compliance

- privileged legal advice
- investigations
- litigation
- whistleblowing
- regulatory findings
- sanctions / AML investigations
- personal data
- legal holds
- confidential contracts

Access should use least privilege, appropriate RLS, and auditable authorization.

Do not expose these records merely because a user can see the menu.

---

# 10. Claude Mapping Requirement

Before building menus or pages, create a mapping matrix:

| Taxonomy Path | Existing Module/Page/Table | Reuse | Extend | New | Permission Impact | Notes |
|---|---|---|---|---|---|---|
| HR > Recruitment > Vacancy Register | ... | ... | ... | ... | ... | ... |
| HR > HR Risks | Generic Risk module | Yes | Context | No | HR/project scope | ... |
| Legal > Contracts | ... | ... | ... | ... | ... | ... |
| Compliance > Testing | Shared Testing | Yes | Compliance templates | No | Compliance role | ... |

Do not create empty pages simply because a taxonomy item exists.

---

# 11. Implementation Guidance for Claude

Before implementation:

1. Read `CLAUDE.md`.
2. Read `ROADMAP.md`.
3. Read `REVIEW.md`.
4. Read the SaaS Industry/Tenant Provisioning brief.
5. Read the Core PM & Industry Menu Taxonomy.
6. Audit existing HR/legal/compliance features.
7. Audit current generic PM capabilities.
8. Audit role/permission/RLS models.
9. Audit current Admin menu/configuration architecture.
10. Map taxonomy → existing capability.
11. Identify genuine gaps.
12. Create/update the PRD.
13. Conduct required decision interview.
14. Create the approved implementation plan.
15. Implement in vertical slices.
16. Run appropriate tests.
17. Apply `REVIEW.md`.

---

# 12. Recommended Initial Delivery Order

## Human Resources

```text
1. HR Portfolio / Dashboard
2. Organisation Design
3. Workforce Planning
4. Recruitment
5. Onboarding
6. Employee Records
7. Performance Management
8. Learning & Development
9. HR Projects
10. HR Analytics
```

Add the remaining specialised HR capabilities progressively.

## Legal & Compliance

```text
1. Legal / Compliance Portfolio
2. Legal Matter Management
3. Contract Management
4. Regulatory Compliance
5. Compliance Obligations
6. Compliance Risk
7. Policies & Controls
8. Compliance Findings / Remediation
9. Regulatory Change
10. Legal / Compliance Analytics
```

Add specialist capabilities such as litigation, privacy, AML, sanctions, whistleblowing, IP, and entity management progressively based on organisation needs and entitlement.

---

# 13. Final Principle

> **Human Resources and Legal/Compliance should extend the Project Nidus PMIS, not duplicate it.**

Use:

```text
Generic PM Controls
+
Domain-Specific Data
+
Domain-Specific Workflows
+
Domain Templates
+
Domain Reporting
+
Strict Role/RLS Controls
```

This creates an integrated enterprise PMIS in which HR, Legal, Compliance, IT, Banking, Construction, Marketing, and other industry/domain projects can all use the same governed project-management backbone.
