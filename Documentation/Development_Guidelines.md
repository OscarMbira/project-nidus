# Development Guidelines
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0

---

## 📋 Overview

This document outlines the coding standards, naming conventions, and best practices for Project Nidus development.

---

## 🎯 Core Principles

### 1. Simplicity First
- Write simple, readable code over clever code
- Minimize complexity - every change should impact as little code as possible
- Avoid massive or complex changes
- Break down large tasks into smaller, manageable pieces

### 2. Copyright Safety
- **NEVER** use trademarked names in code (folders, files, components, variables)
- Use copyright-safe alternatives (`structured` not `prince2`)
- See `projectplan/Copyright_Safe_Naming_Strategy.md` for details

### 3. Documentation
- Document as you code
- Every significant change gets documented
- Create separate documentation files where applicable
- Prepare content for future blog posts about features

### 4. Testing
- Write unit tests for every new feature/functionality
- Aim for >80% code coverage
- Test edge cases and error scenarios

---

## 📁 Folder & File Naming

### Component Folders
```
/src/components/
  /common/          # Shared components
  /structured/      # Traditional/Structured PM (NOT /prince2/)
  /agile-scrum/     # Scrum framework
  /kanban/          # Kanban method
  /planning/        # Universal planning
```

### File Naming Conventions

#### React Components
```javascript
// ✅ CORRECT - PascalCase
Button.jsx
ProjectCard.jsx
StructuredDashboard.jsx
AgileScrumBoard.jsx

// ❌ WRONG
button.jsx
project-card.jsx
Prince2Dashboard.jsx  // Trademark violation
```

#### Utility Files
```javascript
// ✅ CORRECT - camelCase
formatDate.js
validators.js
apiHelpers.js

// ❌ WRONG
FormatDate.js
Validators.js
```

#### Hooks
```javascript
// ✅ CORRECT - camelCase with 'use' prefix
useAuth.js
useProjects.js
useStructuredPM.js

// ❌ WRONG
Auth.js
projects.js
use-auth.js
```

#### Constants
```javascript
// ✅ CORRECT - UPPER_CASE
API_ENDPOINTS.js
CONSTANTS.js

// ❌ WRONG
apiEndpoints.js
constants.js
```

#### SQL Files
```sql
-- ✅ CORRECT - Versioned with description
v01_core_tables.sql
v02_structured_pm_tables.sql
v03_agile_scrum_tables.sql

-- ❌ WRONG
core_tables.sql          # Missing version
v01_prince2_tables.sql   # Trademark
tables.sql               # Not descriptive
```

---

## 🎨 Code Style

### React Components

#### Functional Components (Preferred)
```javascript
// ✅ GOOD
import React from 'react';
import PropTypes from 'prop-types';

function Button({ variant, children, onClick, disabled }) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary']).isRequired,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
};

Button.defaultProps = {
  onClick: () => {},
  disabled: false,
};

export default Button;
```

#### Component Structure
```javascript
// Recommended order:
// 1. Imports
// 2. Constants/Helpers (if any)
// 3. Component definition
// 4. PropTypes
// 5. DefaultProps
// 6. Export
```

### Naming Conventions in Code

#### Variables
```javascript
// ✅ GOOD - camelCase, descriptive
const projectList = [];
const userName = 'John';
const isActive = true;

// ❌ BAD
const pl = [];                    // Not descriptive
const user_name = 'John';        // snake_case
const ProjectList = [];          // PascalCase for non-components
```

#### Functions
```javascript
// ✅ GOOD - camelCase, verb-based
function fetchProjects() { }
function calculateTotal() { }
function handleSubmit() { }

// ❌ BAD
function projects() { }          // Not verb-based
function FetchProjects() { }     // PascalCase
function fetch_projects() { }    // snake_case
```

#### Constants
```javascript
// ✅ GOOD - UPPER_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// ❌ BAD
const apiBaseUrl = 'https://api.example.com';  // camelCase
const max_retries = 3;                         // lowercase
```

#### CSS Classes
```css
/* ✅ GOOD - kebab-case */
.project-card { }
.structured-dashboard { }
.agile-scrum-board { }

/* ❌ BAD */
.projectCard { }        /* camelCase */
.prince2_dashboard { }  /* Trademark + snake_case */
.Project-Card { }       /* PascalCase */
```

---

## 🗄️ Database Naming

### Table Names
```sql
-- ✅ GOOD - snake_case, plural, descriptive
projects
user_roles
project_initiation_documents
sprint_backlogs
kanban_boards

-- ❌ BAD
Project                        -- PascalCase
prince2_pids                   -- Trademark
pid                            -- Not descriptive
```

### Column Names
```sql
-- ✅ GOOD - snake_case, descriptive
project_id
created_at
is_active
user_name

-- ❌ BAD
ProjectId                      -- PascalCase
createdAt                      -- camelCase
active                         -- boolean should have "is_" prefix
```

### Standard Audit Fields
All tables must include:
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
created_at TIMESTAMP DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_at TIMESTAMP DEFAULT NOW(),
updated_by UUID REFERENCES users(id),
is_deleted BOOLEAN DEFAULT FALSE,
deleted_at TIMESTAMP,
deleted_by UUID REFERENCES users(id)
```

### Table Registration
Every new table MUST be registered:
```sql
-- At end of table creation SQL file
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('table_name', 'Clear description', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
```

---

## 📝 Commenting & Documentation

### File Headers
```javascript
/**
 * Button Component
 *
 * A reusable button component with multiple variants and states.
 *
 * @component
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   Click Me
 * </Button>
 */
```

### Function Documentation
```javascript
/**
 * Fetches projects from the API
 *
 * @param {Object} filters - Filter criteria
 * @param {string} filters.status - Project status
 * @param {number} filters.limit - Number of results
 * @returns {Promise<Array>} Array of project objects
 * @throws {Error} If API request fails
 */
async function fetchProjects(filters) {
  // Implementation
}
```

### Inline Comments
```javascript
// ✅ GOOD - Explain WHY, not WHAT
// Calculate total with discount because of seasonal promotion
const total = subtotal * 0.9;

// ❌ BAD - States the obvious
// Set total to subtotal times 0.9
const total = subtotal * 0.9;
```

### Copyright-Safe Comments
```javascript
// ✅ GOOD - Can explain PRINCE2 in comments
/* This component implements PRINCE2 stage-gate process */
function StructuredStageGate() {
  // Component code
}

// ❌ BAD - Using trademark in code names
function Prince2StageGate() {  // Trademark violation
  // Component code
}
```

---

## 🔒 Security Best Practices

### Environment Variables
```javascript
// ✅ GOOD - Use environment variables for sensitive data
const apiUrl = import.meta.env.VITE_API_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ❌ BAD - Hardcoded sensitive data
const apiUrl = 'https://api.example.com';
const supabaseKey = 'eyJhbGci...';  // NEVER do this!
```

### Input Validation
```javascript
// ✅ GOOD - Always validate user input
function createProject(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid project name');
  }
  if (name.length < 3 || name.length > 100) {
    throw new Error('Project name must be 3-100 characters');
  }
  // Proceed with creation
}
```

### SQL Injection Prevention
```javascript
// ✅ GOOD - Use parameterized queries (Supabase handles this)
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('name', userInput);

// ❌ BAD - Never construct raw SQL with user input
// (Supabase doesn't allow this, but never do it elsewhere)
const query = `SELECT * FROM projects WHERE name = '${userInput}'`;
```

### XSS Prevention
```javascript
// ✅ GOOD - React escapes by default
<div>{userContent}</div>

// ❌ BAD - dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ IF YOU MUST - Sanitize first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userContent);
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

---

## 🧪 Testing Guidelines

### Unit Tests
```javascript
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDisabled();
  });
});
```

### Test Coverage Goals
- **Minimum:** 80% overall coverage
- **Critical paths:** 100% coverage
- **New features:** Must include tests
- **Bug fixes:** Add test to prevent regression

---

## 🔄 Git Workflow

### Branch Naming
```bash
# Feature branches
feature/user-authentication
feature/structured-pm-module
feature/kanban-board

# Bug fixes
fix/login-error
fix/dashboard-loading

# Documentation
docs/api-documentation
docs/setup-guide

# Refactoring
refactor/auth-service
refactor/api-client
```

### Commit Messages
```bash
# Format
type: brief description (max 72 chars)

- Detailed explanation point 1
- Detailed explanation point 2
- Reference to issue if applicable

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>

# Types
feat     # New feature
fix      # Bug fix
docs     # Documentation only
style    # Formatting, missing semi-colons, etc.
refactor # Code change that neither fixes a bug nor adds a feature
test     # Adding or updating tests
chore    # Updating build tasks, package manager configs, etc.
```

### Commit Examples
```bash
# ✅ GOOD
feat: add user authentication with MFA

- Implement Supabase Auth integration
- Add MFA enrollment flow
- Create login and signup pages
- Add session management

# ❌ BAD
Update files               # Not descriptive
Added stuff                # Too vague
fixed bug                  # No type prefix, not descriptive
```

---

## 🎨 Theme Support

### All Components Must Be Theme-Aware
```javascript
// ✅ GOOD - Uses theme-aware classes
function Card({ children }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </div>
  );
}

// ❌ BAD - Hardcoded colors
function Card({ children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-gray-900">
        {children}
      </div>
    </div>
  );
}
```

---

## 📊 Performance Best Practices

### Lazy Loading
```javascript
// ✅ GOOD - Lazy load heavy components
import { lazy, Suspense } from 'react';

const GanttChart = lazy(() => import('./components/planning/GanttChart'));

function PlanningPage() {
  return (
    <Suspense fallback={<Loading />}>
      <GanttChart />
    </Suspense>
  );
}
```

### Memoization
```javascript
// ✅ GOOD - Memoize expensive computations
import { useMemo } from 'react';

function ProjectList({ projects, filters }) {
  const filteredProjects = useMemo(() => {
    return projects.filter(p =>
      p.status === filters.status
    );
  }, [projects, filters.status]);

  return <div>{/* Render filtered projects */}</div>;
}
```

### Avoid Unnecessary Re-renders
```javascript
// ✅ GOOD - Use React.memo for pure components
import { memo } from 'react';

const ProjectCard = memo(function ProjectCard({ project }) {
  return <div>{project.name}</div>;
});
```

---

## 🚫 Common Pitfalls to Avoid

### 1. Trademark Violations
```javascript
// ❌ NEVER
/src/components/prince2/
const prince2Config = {};
class Prince2Dashboard extends Component {}

// ✅ ALWAYS
/src/components/structured/
const structuredConfig = {};
class StructuredDashboard extends Component {}
```

### 2. Hardcoded Values
```javascript
// ❌ BAD
if (user.role === 'admin') { }
const timeout = 30000;

// ✅ GOOD
import { USER_ROLES } from './constants';
if (user.role === USER_ROLES.ADMIN) { }

const timeout = import.meta.env.VITE_SESSION_TIMEOUT;
```

### 3. Prop Drilling
```javascript
// ❌ BAD - Passing props through many levels
<Parent user={user}>
  <Child user={user}>
    <Grandchild user={user}>
      <GreatGrandchild user={user} />

// ✅ GOOD - Use Context
const UserContext = createContext();
// Provider at top level, useContext in components that need it
```

### 4. Ignoring Errors
```javascript
// ❌ BAD
try {
  await fetchData();
} catch (error) {
  // Silent failure
}

// ✅ GOOD
try {
  await fetchData();
} catch (error) {
  console.error('Failed to fetch data:', error);
  setError(error.message);
  // Maybe show toast notification
}
```

---

## ✅ Code Review Checklist

Before submitting code for review:

- [ ] Code follows naming conventions (copyright-safe)
- [ ] All new components are theme-aware
- [ ] Unit tests written and passing (>80% coverage)
- [ ] No hardcoded sensitive data
- [ ] No trademark violations in code
- [ ] Input validation implemented
- [ ] Error handling in place
- [ ] Comments explain complex logic
- [ ] PropTypes defined for components
- [ ] No console.logs in production code
- [ ] SQL files are versioned and include table registration
- [ ] Documentation updated
- [ ] README updated if needed
- [ ] Commit message follows format

---

## 📚 Required Reading

Before starting development:

1. ✅ This document (Development_Guidelines.md)
2. ✅ `Repository_Structure.md` - Understand folder structure
3. ✅ `Copyright_Safe_Naming_Strategy.md` - Avoid trademark issues
4. ✅ `Supabase_Setup_Guide.md` - Database setup
5. ✅ `PRD_Multi_Methodology_PM_System.md` - Understand requirements

---

## 🆘 Getting Help

### Documentation Issues
- Check `Documentation/` folder first
- Review this guide
- Check README.md

### Technical Issues
- Search existing issues
- Check Supabase docs
- Check React/Vite docs
- Ask team members

### Code Review
- Request review from team lead
- Address all comments
- Update code accordingly

---

## 📝 Updates to This Document

This document is a living guide and will be updated as the project evolves.

**To suggest changes:**
1. Discuss with team
2. Update document
3. Commit with message: `docs: update development guidelines`

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team

---

**Remember: Simple, Clean, Copyright-Safe Code! 🚀**
