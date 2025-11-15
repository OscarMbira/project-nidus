# Copyright-Safe Naming Strategy
**Date:** 2025-11-15
**Status:** Confirmed and Implemented

---

## ⚠️ Copyright/Trademark Concerns Addressed

To avoid potential copyright and trademark issues, we have adopted a **copyright-safe naming strategy** for all **code, folders, components, and file names** throughout the project.

---

## 🎯 Key Principle

**We can SUPPORT methodologies, but we CANNOT use trademarked names in our CODE.**

### What This Means:

✅ **Allowed:** Reference methodology names in:
- Documentation (PRD, user guides)
- Database data (methodology names as values)
- User-facing labels and text
- Feature descriptions

❌ **Not Allowed:** Use trademarked names in:
- **Folder names** (e.g., `/src/components/prince2/`)
- **Component names** (e.g., `Prince2Dashboard.jsx`)
- **File names** (e.g., `prince2-utils.js`)
- **Class names** (e.g., `class Prince2Controller`)
- **Function names** (e.g., `function initPrince2()`)
- **Variable names** (e.g., `const prince2Config`)

---

## 📋 Methodology Name Replacements

### PRINCE2 → "Structured PM" or "Traditional PM"

**Trademarked Name:** PRINCE2 (owned by AXELOS Limited)

**Copyright-Safe Alternatives:**
- **"Structured PM"** - For structured project management approach
- **"Traditional PM"** - For traditional project management
- **"Governance PM"** - For governance-based approach
- **"Staged PM"** - For stage-gate approach

**We chose:** **"Structured"** as the primary term

#### Code Usage:
```javascript
// ❌ BAD - Trademark violation
/src/components/prince2/
const prince2Config = {...}
class Prince2Dashboard extends Component

// ✅ GOOD - Copyright-safe
/src/components/structured/
const structuredConfig = {...}
class StructuredPMDashboard extends Component
```

#### Documentation/Data Usage:
```sql
-- ✅ GOOD - Just storing supported methodology names
INSERT INTO methodologies (name, display_name) VALUES
  ('structured', 'PRINCE2-Based Structured PM');

-- ✅ GOOD - User-facing text can reference PRINCE2
UPDATE system_settings SET description =
  'This system supports PRINCE2 methodology';
```

---

### Scrum → "Agile Scrum"

**Status:** Scrum is an open framework (Scrum Guide is open)

**Why we're changing anyway:**
- For consistency across all methodologies
- To clearly distinguish Scrum components from generic agile

**Copyright-Safe Term:** **"Agile Scrum"**

#### Code Usage:
```javascript
// ✅ ACCEPTABLE - Scrum is open
/src/components/scrum/

// ✅ BETTER - More descriptive and consistent
/src/components/agile-scrum/
```

---

### Kanban → "Kanban"

**Status:** Kanban is a general method (not trademarked for software)

**Term:** **"Kanban"** (no change needed)

#### Code Usage:
```javascript
// ✅ GOOD - Kanban is safe to use
/src/components/kanban/
const kanbanBoard = {...}
```

---

## 📁 Updated Folder Structure

### Before (Copyright Risk):
```
/src/
  /components/
    /prince2/          ❌ Trademark risk
    /scrum/            ⚠️ Could be clearer
    /kanban/           ✅ OK
```

### After (Copyright-Safe):
```
/src/
  /components/
    /structured/       ✅ Copyright-safe (Traditional/Structured PM)
    /agile-scrum/      ✅ Clear and consistent
    /kanban/           ✅ Safe to use
```

---

## 📄 Updated File Naming Conventions

### SQL Files

**Before:**
```
v02_prince2_tables.sql              ❌ Trademark in filename
v03_scrum_tables.sql                ⚠️ Could be clearer
```

**After:**
```
v02_structured_pm_tables.sql        ✅ Copyright-safe
v03_agile_scrum_tables.sql          ✅ Clear and safe
v04_kanban_tables.sql               ✅ Safe
```

### Component Files

**Before:**
```
Prince2Dashboard.jsx                ❌ Trademark in component name
Prince2ProcessFlow.jsx              ❌ Trademark in component name
usePrince2Logic.js                  ❌ Trademark in hook name
```

**After:**
```
StructuredDashboard.jsx             ✅ Copyright-safe
StructuredProcessFlow.jsx           ✅ Copyright-safe
useStructuredLogic.js               ✅ Copyright-safe
```

---

## 🗄️ Database Naming Strategy

### Table Names

**Copyright-safe table names:**

```sql
-- ✅ GOOD - Generic, descriptive names
CREATE TABLE project_mandates
CREATE TABLE project_initiation_documents  -- NOT "prince2_pids"
CREATE TABLE business_cases
CREATE TABLE stage_reports
CREATE TABLE stage_boundaries
CREATE TABLE work_packages
CREATE TABLE product_deliverables

-- ✅ GOOD - Agile/Scrum tables
CREATE TABLE sprints                -- Generic enough
CREATE TABLE sprint_backlogs
CREATE TABLE retrospectives
CREATE TABLE velocity_metrics

-- ✅ GOOD - Kanban tables
CREATE TABLE kanban_boards
CREATE TABLE kanban_cards
CREATE TABLE flow_metrics
```

### Column Names

**Use generic, methodology-agnostic terms:**

```sql
-- ✅ GOOD
process_type VARCHAR(50)           -- Not "prince2_process"
methodology_phase VARCHAR(50)       -- Not "prince2_stage"
governance_level VARCHAR(50)        -- Not "prince2_board_level"
```

---

## 🎨 UI/Component Naming

### Component Hierarchy

```
/src/components/
  /common/
    - Button.jsx
    - Card.jsx
    - Table.jsx

  /structured/                      ← Traditional/Structured PM
    - StructuredDashboard.jsx
    - MandateForm.jsx
    - InitiationDocumentForm.jsx
    - StageGateView.jsx
    - BusinessCaseBuilder.jsx
    - GovernanceBoard.jsx

  /agile-scrum/                     ← Scrum Framework
    - ScrumDashboard.jsx
    - ProductBacklog.jsx
    - SprintBoard.jsx
    - RetrospectiveView.jsx

  /kanban/                          ← Kanban Method
    - KanbanBoard.jsx
    - KanbanCard.jsx
    - FlowMetrics.jsx

  /planning/                        ← Universal Planning
    - GanttChart.jsx
    - Timeline.jsx
    - ResourceView.jsx
```

---

## 📊 User-Facing Text

### How to Reference Methodologies in UI

**User-facing text CAN reference trademarked methodologies:**

```jsx
// ✅ GOOD - Display text can mention PRINCE2
<h1>Welcome to PRINCE2 Module</h1>
<p>This system supports PRINCE2, Scrum, and Kanban methodologies</p>
<Button>Create PRINCE2 Project</Button>

// ✅ GOOD - Component names are copyright-safe
function StructuredDashboard() {
  return (
    <div className="structured-dashboard">
      <h1>PRINCE2 Project Dashboard</h1>  {/* ✅ Text is fine */}
    </div>
  );
}
```

**Database values can store methodology names:**

```sql
-- ✅ GOOD - Storing methodology names as data
INSERT INTO methodologies (code, name, description) VALUES
  ('structured', 'PRINCE2', 'PRINCE2-based structured project management'),
  ('scrum', 'Scrum', 'Scrum framework for agile development'),
  ('kanban', 'Kanban', 'Kanban method for continuous flow');
```

---

## 🔄 Migration Guide

### For Existing Code References

If you see PRINCE2 in code, replace according to context:

**Folder/File Names:**
- `prince2/` → `structured/`
- `prince2-utils.js` → `structured-utils.js`
- `Prince2Component.jsx` → `StructuredComponent.jsx`

**Function/Variable Names:**
- `prince2Config` → `structuredConfig`
- `initPrince2()` → `initStructured()`
- `usePrince2()` → `useStructured()`

**CSS Classes:**
- `.prince2-dashboard` → `.structured-dashboard`
- `.prince2-component` → `.structured-component`

**Comments:**
```javascript
// ✅ GOOD - Comments can explain
/* This component implements PRINCE2 stage-gate process */
function StructuredStageGate() { ... }
```

---

## 📚 Documentation Guidelines

### In Technical Documentation

**PRD, Design Docs, User Guides:**
- ✅ Can freely reference "PRINCE2" as a supported methodology
- ✅ Can explain PRINCE2 processes and principles
- ✅ Can use official PRINCE2 terminology
- ✅ Should include disclaimer: "PRINCE2 is a registered trademark of AXELOS Limited"

**Code Documentation:**
```javascript
/**
 * Structured PM Dashboard
 *
 * Implements dashboard for PRINCE2-based structured project management.
 * Supports all 7 PRINCE2 processes and themes.
 *
 * Note: PRINCE2 is a registered trademark of AXELOS Limited.
 */
function StructuredDashboard() { ... }
```

---

## ⚖️ Legal Disclaimer

### Add to Documentation

Include this disclaimer in all user-facing documentation:

```
PRINCE2® is a registered trademark of AXELOS Limited, used under permission.
All rights reserved. The Swirl logo™ is a trademark of AXELOS Limited, used
under permission. All rights reserved.

This software supports the PRINCE2 methodology but is not affiliated with,
endorsed by, or certified by AXELOS Limited.
```

---

## ✅ Updated Documentation

The following documents have been updated with copyright-safe naming:

### Updated Files:
1. ✅ `projectplan/PRD_Review_Summary.md`
   - Folder structure updated
   - SQL file names updated
   - Database table categories updated

2. ✅ `projectplan/Phase_1_Implementation_Plan.md`
   - Component folder structure updated (Day 29)
   - File naming conventions updated

3. ✅ `Documentation/PRD_Multi_Methodology_PM_System.md`
   - Can still reference PRINCE2 in documentation text
   - Technical architecture updated

4. ✅ `projectplan/Admin_Project_Separation_Confirmed.md`
   - References updated if needed

---

## 🎯 Summary

### Safe to Use in Code:
- ✅ `structured/` - for traditional/structured PM (PRINCE2-like)
- ✅ `agile-scrum/` - for Scrum framework
- ✅ `kanban/` - for Kanban method
- ✅ Generic terms: `mandate`, `initiation`, `stage`, `business_case`, etc.

### NOT Safe in Code:
- ❌ `prince2/` - folder names
- ❌ `Prince2` - component names
- ❌ `prince2` - variable/function names
- ❌ `prince2-` - CSS class prefixes

### Always Safe:
- ✅ User-facing text (labels, descriptions, help text)
- ✅ Database string values (methodology names)
- ✅ Documentation (with proper trademark acknowledgment)
- ✅ Comments explaining implementation

---

## 🚀 Action Items

When implementing Phase 1:

1. ✅ Create `/src/components/structured/` (NOT `/prince2/`)
2. ✅ Create `/src/components/agile-scrum/` (NOT `/scrum/`)
3. ✅ Name SQL files: `v02_structured_pm_tables.sql`
4. ✅ Use generic table names: `project_mandates`, `initiation_documents`
5. ✅ Component names: `StructuredDashboard`, `MandateForm`, etc.
6. ✅ Include trademark disclaimer in user documentation

---

**Status:** ✅ **Implemented and Documented**

**Date:** 2025-11-15

---

*This naming strategy protects the project from copyright/trademark issues while still fully supporting all methodologies including PRINCE2.*
