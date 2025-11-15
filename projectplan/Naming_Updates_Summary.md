# Copyright-Safe Naming - Updates Summary
**Date:** 2025-11-15
**Status:** Complete

---

## ✅ What Was Changed

To avoid copyright/trademark issues, all **code-level references** to trademarked methodology names have been replaced with generic, copyright-safe alternatives.

---

## 📋 Quick Reference

### Methodology Code Names (for folders, files, components):

| Methodology | Trademarked Name | Copyright-Safe Code Name | Usage |
|-------------|------------------|--------------------------|-------|
| **Traditional PM** | PRINCE2® | `structured` | All code, folders, components |
| **Agile Framework** | Scrum | `agile-scrum` | All code, folders, components |
| **Flow Method** | Kanban | `kanban` | Safe to use as-is |

---

## 📁 Folder Structure Changes

### OLD (Copyright Risk):
```
/src/components/
  /prince2/          ❌ Trademark violation
  /scrum/            ⚠️ Unclear
  /kanban/           ✅ OK
```

### NEW (Copyright-Safe):
```
/src/components/
  /structured/       ✅ For traditional/structured PM (PRINCE2-like)
  /agile-scrum/      ✅ For Scrum framework
  /kanban/           ✅ For Kanban method
```

---

## 📄 File Naming Changes

### SQL Files:

| OLD Name | NEW Name | Status |
|----------|----------|--------|
| `v02_prince2_tables.sql` | `v02_structured_pm_tables.sql` | ✅ Updated |
| `v03_scrum_tables.sql` | `v03_agile_scrum_tables.sql` | ✅ Updated |
| `v04_kanban_tables.sql` | `v04_kanban_tables.sql` | ✅ No change needed |

### Component Files (when created):

| OLD Name | NEW Name |
|----------|----------|
| `Prince2Dashboard.jsx` | `StructuredDashboard.jsx` |
| `Prince2ProcessFlow.jsx` | `StructuredProcessFlow.jsx` |
| `ScrumBoard.jsx` | `AgileScrumBoard.jsx` |
| `KanbanBoard.jsx` | `KanbanBoard.jsx` (no change) |

---

## 🗄️ Database Naming

### Table Names (Generic, Copyright-Safe):

```sql
-- ✅ GOOD - No trademark references
project_mandates                    -- Not "prince2_mandates"
project_initiation_documents        -- Not "prince2_pids"
business_cases
stage_reports
stage_boundaries
work_packages

-- ✅ GOOD - Agile tables
sprints
sprint_backlogs
retrospectives
velocity_metrics

-- ✅ GOOD - Kanban tables
kanban_boards
kanban_cards
flow_metrics
```

---

## 📚 What Can STILL Use Trademarked Names

### ✅ User-Facing Text (UI Labels, Help Text):
```jsx
<h1>Welcome to PRINCE2 Module</h1>
<p>Create a new PRINCE2 project</p>
<Button>Start PRINCE2 Process</Button>
```

### ✅ Database String Values:
```sql
INSERT INTO methodologies (name, display_name) VALUES
  ('structured', 'PRINCE2-Based Structured PM'),
  ('scrum', 'Scrum'),
  ('kanban', 'Kanban');
```

### ✅ Documentation (with disclaimer):
- PRD can reference "PRINCE2 methodology"
- User guides can explain "PRINCE2 processes"
- Help docs can mention "PRINCE2 principles"

### ✅ Code Comments:
```javascript
// This implements PRINCE2 stage-gate process
function StructuredStageGate() { ... }
```

---

## 📊 Documents Updated

### 1. PRD Review Summary ✅
**File:** `projectplan/PRD_Review_Summary.md`

**Changes:**
- Folder structure: `prince2/` → `structured/`
- SQL files: `v02_prince2_tables.sql` → `v02_structured_pm_tables.sql`
- Database categories: "PRINCE2 Tables" → "Structured PM Tables"

### 2. Phase 1 Implementation Plan ✅
**File:** `projectplan/Phase_1_Implementation_Plan.md`

**Changes:**
- Day 29 folder structure: `/src/components/prince2/` → `/src/components/structured/`
- Added clarification: "(Traditional/Structured PM)"

### 3. Copyright-Safe Naming Strategy ✅
**File:** `projectplan/Copyright_Safe_Naming_Strategy.md`

**New document created with:**
- Complete naming guidelines
- Examples of safe vs unsafe usage
- Migration guide
- Legal disclaimer template
- Component naming conventions

---

## 🎯 Key Principles Going Forward

### 1. Code Level (Strict):
```javascript
// ❌ NEVER use trademarked names in:
/prince2/                    // Folders
Prince2Component            // Component names
prince2Config               // Variables
initPrince2()              // Functions
.prince2-class             // CSS classes

// ✅ ALWAYS use generic names:
/structured/               // Folders
StructuredComponent        // Component names
structuredConfig           // Variables
initStructured()          // Functions
.structured-class         // CSS classes
```

### 2. User Level (Flexible):
```jsx
// ✅ CAN use trademarked names in:
<h1>PRINCE2 Dashboard</h1>           // UI text
const label = "PRINCE2 Process";     // Display strings
description: "Supports PRINCE2"      // Database values
/* Implements PRINCE2 logic */       // Comments
```

### 3. Documentation (With Disclaimer):
```
PRINCE2® is a registered trademark of AXELOS Limited.
This software supports PRINCE2 methodology but is not
affiliated with, endorsed by, or certified by AXELOS Limited.
```

---

## ✅ Verification Checklist

Before writing any code, verify:

- [ ] Folder names use `structured/`, `agile-scrum/`, `kanban/`
- [ ] File names avoid trademarked terms
- [ ] Component names use generic terms
- [ ] Variable/function names are copyright-safe
- [ ] CSS class names don't include trademarks
- [ ] Database table names are generic
- [ ] SQL file names are copyright-safe
- [ ] User-facing text can reference methodologies
- [ ] Documentation includes trademark disclaimer

---

## 🚀 Ready to Implement

All planning documents are now **copyright-safe** and ready for implementation.

When Phase 1 begins:
- ✅ Create `/src/components/structured/` (NOT `/prince2/`)
- ✅ Create `/src/components/agile-scrum/`
- ✅ Use SQL file names: `v02_structured_pm_tables.sql`
- ✅ Name components: `StructuredDashboard.jsx`, `MandateForm.jsx`
- ✅ Include trademark disclaimer in user documentation

---

**Status:** ✅ **All Updates Complete**

**Next Step:** Begin Phase 1 Development with copyright-safe naming

---
