# PROJECT MANAGEMENT SYSTEM – REGISTRATION & SUBSCRIPTION FLOW
## Version: 2.0 (Updated to include Free Trial OR Paid Subscription option per project)

---

# 1. SYSTEM OVERVIEW

This document defines the complete registration and project subscription workflow for the Project Management System.

The system contains **two major subsystems**:
- **Project Management Platform**
- **Project Management Simulation Module**

Users may register for **one or both** subsystems.

The registration flow includes:
1. User account creation  
2. Organisation creation and activation  
3. Project creation (with an option for Free Trial or Paid Subscription)  
4. Dashboard assignment based on subscription mode  
5. Upgrade logic and lifecycle management  

---

# 2. CORE PRINCIPLES

## 2.1 One Email = One Organisation
- Users register with a unique email.
- A user account (email) belongs to **exactly one** organisation.
- To belong to another organisation, user must use a different email.

## 2.2 Organisation Setup is Mandatory
- After signup, users must create their organisation (individual, freelancer, company).
- Organisation becomes active only after email verification.

## 2.3 Projects Are Subscription-Based
Each project must be created under one of two modes:

### **Option A — Free Trial Project**
- 1 project only  
- Max 5 team members  
- Basic task management  
- Simple Gantt charts  
- Community support  
- Expires after 10 days  
- Upgrade available anytime  
- **Only one free trial project allowed per organisation**

### **Option B — Paid Subscription Project**
- Requires selecting a subscription plan  
- Requires immediate payment  
- Full feature set unlocked  
- Member limit starts at 20 (with add-ons for more)

## 2.4 No Downgrade to Free Plan
- Once any paid project exists, the organisation cannot return to trial mode.
- Free Trial Dashboard is removed permanently.

## 2.5 Additional Projects Require Paid Subscription
- Only the **first** project may be a trial project.
- All additional projects must be paid.

## 2.6 Subsystem Access Selection
Users may enable:
- Project Management Platform  
- Project Management Simulation  
- Or both  
during registration or later via subscription.

---

# 3. REGISTRATION FLOW BREAKDOWN

---

# STEP 1 — Account Signup

Fields:
- Full Name  
- Email  
- Password  
- Select subsystem(s):  
  - ☐ Project Management Platform  
  - ☐ Project Management Simulation  

System Actions:
- Store user record as `pending_verification`
- Send email verification link
- Redirect user to “Verify your email" screen

---

# STEP 2 — Organisation Creation (Mandatory)

Fields:
- Organisation Name  
- Organisation Type (Individual, Freelancer, Business, Company)  
- Country  
- Phone  
- Industry  
- Organisation Size (optional)

System Actions:
- Create organisation with status `pending_activation`
- Link user as organisation owner

---

# STEP 3 — Email Verification

User clicks verification link.

System:
- Activates user account
- Activates organisation
- Redirects to **Project Type Selection Page**

---

# STEP 4 — Project Type Selection (NEW — IMPORTANT)

After organisation activation, user must choose how to create their **first project**.

## OPTION 1 — Create Free Trial Project

The system shows:
- ✔ 1 Project limit  
- ✔ 5 Members  
- ✔ Basic features  
- ✔ 10-Day trial  
- ✔ Upgrade anytime  

System:
- Create project with mode = `trial`
- Set `trial_expiry_date`
- Redirect to Free Trial Project Setup
- Load Free Trial Dashboard once setup is complete

## OPTION 2 — Create Paid Subscription Project

The system shows:
- Subscription plan options  
- Pricing  
- Member limits  
- Payment gateway  

System:
- Create subscription record
- Process payment
- Create project with mode = `paid`
- Redirect to Paid Project Setup
- Load Paid Dashboard

---

# 5. FREE TRIAL PROJECT FLOW

## Trial Project Setup
User enters:
- Project Name  
- Project Type  
- Description  
- Start/End Dates  
- Subsystem selection  

System:
- Assign trial limitations (1 project, 5 members)
- Show upgrade CTA
- Redirect to **Free Trial Dashboard**

## Free Trial Dashboard
Features:
- Trial countdown timer  
- Basic task management  
- Basic Gantt  
- Team limit = 5  
- Option to upgrade project anytime  

## Trial Expiration
At expiration:
- Project becomes locked  
- Team access disabled  
- System forces upgrade

---

# 6. PAID SUBSCRIPTION PROJECT FLOW

## Paid Project Setup
User enters:
- Project Name  
- Type  
- Description  
- Dates  
- Subsystem selection  

System:
- Assign paid subscription configuration
- Redirect to **Paid Dashboard**

## Paid Dashboard Features
- Full-suite task management  
- Advanced Gantt charts  
- Project roles & permissions  
- Unlimited projects (subject to plan)  
- Team member extension purchases  
- Access to simulation module  

---

# 7. LOGIC FOR MULTIPLE PROJECTS

- Organisation can only have **one** trial project.
- Any **additional projects must be paid**.
- System displays modal:
  > “Additional projects require a paid subscription. Proceed to subscribe?”

---

# 8. SYSTEM STATES

## State 1: Unverified User
- No access to organisation or dashboard.

## State 2: Organisation Activated — Pre-Project
- User must choose Trial or Paid for first project.

## State 3: Trial Mode
- One project  
- Free Trial Dashboard active  
- Upgrade anytime  

## State 4: Paid Mode
- Full features  
- No free dashboard  
- No downgrade allowed  

## State 5: Mixed Mode
- Trial project + one or more paid projects  
- Free dashboard accessible *only* for trial project  

---

# 9. AUTOMATED RULE ENFORCEMENT

System must enforce:

- Only first project can be trial  
- No downgrade to trial after paid project exists  
- Trial expiration after 10 days  
- Trial project lock until upgrade  
- Subscription tied per project  
- Member limits strictly enforced  

---

# 10. DATABASE FIELDS (RECOMMENDED)

## Table: organisations
Fields:
- id  
- name  
- status: `pending_activation | active | trial | paid | expired`  
- has_paid_project: boolean  
- created_at  

## Table: projects
Fields:
- id  
- organisation_id  
- project_mode: `trial | paid`  
- trial_expiry_date (nullable)  
- subscription_id  
- subsystem_flags (JSON)  
- created_at  

## Table: subscriptions
Fields:
- id  
- plan_type  
- member_limit  
- price  
- renewal_date  
- is_active  
- project_id  

## Table: users
- id  
- email  
- organisation_id  
- status: `pending_verification | active`  

---



