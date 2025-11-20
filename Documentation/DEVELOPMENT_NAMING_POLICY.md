# Development Naming Policy

## Copyright/Trademark Avoidance

**IMPORTANT:** Do not use or name any component, file, variable, or database object with the word "PRINCE2" due to copyright sensitivity.

### Naming Conventions

#### ✅ Allowed Terms:
- **"structured"** - Preferred term for structured/traditional project management
- **"traditional"** - Alternative term for traditional project management
- **"Structured PM"** - Display name for structured project management
- **"Traditional PM"** - Display name for traditional project management

#### ❌ Prohibited Terms:
- **"PRINCE2"** - Copyright/trademark protected
- **"prince2"** (lowercase) - Still copyright/trademark protected
- Any variation of PRINCE2

### File Naming Rules

1. **Directory Names:**
   - ✅ `src/pages/structured/` 
   - ❌ `src/pages/prince2/`

2. **File Names:**
   - ✅ `v07_structured_tables.sql`
   - ✅ `StartingUpProject.jsx`
   - ✅ `InitiatingProject.jsx`
   - ❌ `v07_prince2_tables.sql`
   - ❌ `PRINCE2StartingUp.jsx`

3. **Component Names:**
   - ✅ `StartingUpProject`
   - ✅ `InitiatingProject`
   - ✅ `StructuredPMDashboard`
   - ❌ `PRINCE2StartingUp`
   - ❌ `PRINCE2Initiating`

### Database Naming Rules

1. **Table Names:**
   - ✅ `structured_process_steps`
   - ✅ `project_mandates`
   - ✅ `business_cases`
   - ❌ `prince2_process_steps`
   - ❌ `prince2_mandates`

2. **Table Categories:**
   - ✅ `'structured'`
   - ❌ `'prince2'`

3. **Comments/Descriptions:**
   - ✅ "Structured PM process"
   - ✅ "Traditional project management"
   - ❌ "PRINCE2 process"
   - ❌ "PRINCE2 methodology"

### Route/URL Naming

1. **Routes:**
   - ✅ `/projects/:projectId/structured/starting-up`
   - ✅ `/projects/:projectId/structured/initiating`
   - ❌ `/projects/:projectId/prince2/starting-up`

### Display Text Rules

1. **User-Facing Text:**
   - ✅ "Structured PM: Starting Up a Project"
   - ✅ "Structured Project Management Processes"
   - ✅ "Traditional Project Management"
   - ❌ "PRINCE2: Starting Up a Project"
   - ❌ "PRINCE2 Processes"

2. **Comments in Code:**
   - ✅ "// Structured PM process"
   - ✅ "// Traditional project management"
   - ❌ "// PRINCE2 process"

### Database Compatibility Note

- The database may still contain `methodology_code = 'prince2'` for backward compatibility
- Code should check for both `'prince2'` and `'structured_pm'` but display as "Structured PM"
- Internal references can use `'prince2'` for database queries, but never in user-facing text

### Examples

**✅ Good:**
```javascript
// Component name
export default function StartingUpProject() { ... }

// Route
<Route path="projects/:projectId/structured/starting-up" />

// Display text
<h1>Structured PM: Starting Up a Project</h1>

// Database table
CREATE TABLE structured_process_steps (...)
```

**❌ Bad:**
```javascript
// Component name
export default function PRINCE2StartingUp() { ... }

// Route
<Route path="projects/:projectId/prince2/starting-up" />

// Display text
<h1>PRINCE2: Starting Up a Project</h1>

// Database table
CREATE TABLE prince2_process_steps (...)
```

### Enforcement

- All new code must follow this policy
- Code reviews should check for PRINCE2 references
- Linting rules should flag PRINCE2 usage
- Database migrations should use "structured" naming

---

**Last Updated:** 2025-01-XX
**Policy Version:** 1.0

