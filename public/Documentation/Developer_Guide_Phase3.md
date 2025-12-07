# Developer Guide - Phase 3

## Overview

This guide provides information for developers working on Phase 3 features, including architecture, component structure, coding standards, and development workflows.

## Project Structure

```
project-nidus/
├── src/
│   ├── components/          # Reusable components
│   │   ├── structured/      # Structured PM components
│   │   ├── scrum/          # Scrum components
│   │   ├── kanban/         # Kanban components
│   │   └── __tests__/      # Component tests
│   ├── pages/              # Page components
│   │   ├── structured/     # Structured PM pages
│   │   ├── scrum/          # Scrum pages
│   │   └── kanban/         # Kanban pages
│   ├── services/           # Service layer
│   │   └── supabaseClient.js
│   ├── utils/              # Utility functions
│   │   ├── flowMetricsCalculator.js
│   │   └── inputValidation.js
│   ├── hooks/              # Custom React hooks
│   │   └── useDebounce.js
│   ├── context/            # React context providers
│   │   └── ThemeContext.jsx
│   ├── test/               # Test setup
│   │   ├── setup.js
│   │   └── utils/
│   └── App.jsx             # Main app component
├── SQL/                    # Database migrations
│   ├── v22_scrum_events.sql
│   ├── v23_structured_pm_cs.sql
│   ├── v24_structured_pm_mp.sql
│   ├── v25_issue_management.sql
│   └── v26_risk_management.sql
└── Documentation/          # Documentation files
```

## Component Architecture

### Component Types

#### Page Components
Located in `src/pages/`, these are top-level route components:
- Handle data fetching
- Manage page-level state
- Compose multiple components
- Handle navigation

Example:
```jsx
// src/pages/Risks.jsx
export default function Risks() {
  const { projectId } = useParams()
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchRisks()
  }, [projectId])
  
  return (
    <div>
      <RiskList risks={risks} />
    </div>
  )
}
```

#### Feature Components
Located in `src/components/`, these are reusable feature components:
- Encapsulate specific functionality
- Accept props for configuration
- Handle their own state
- Emit events via callbacks

Example:
```jsx
// src/components/RiskForm.jsx
export default function RiskForm({ risk, projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({})
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    // Save logic
    onSave()
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

#### Utility Components
Reusable UI components:
- `ErrorBoundary.jsx` - Error handling
- `Pagination.jsx` - Pagination controls
- `Tooltip.jsx` - Tooltip display

## Coding Standards

### Naming Conventions

**Components**: PascalCase
```jsx
// ✅ Good
export default function RiskForm() { }

// ❌ Bad
export default function riskForm() { }
```

**Files**: Match component name
```jsx
// RiskForm.jsx
export default function RiskForm() { }
```

**Variables/Functions**: camelCase
```jsx
const riskScore = calculateRiskScore()
const fetchRisks = async () => { }
```

**Constants**: UPPER_SNAKE_CASE
```jsx
const MAX_RISK_SCORE = 25
const ITEMS_PER_PAGE = 20
```

### File Organization

1. **Imports**: Group by type
   ```jsx
   // React imports
   import { useState, useEffect } from 'react'
   
   // Third-party imports
   import { useParams } from 'react-router-dom'
   
   // Local imports
   import { supabase } from '../services/supabaseClient'
   import RiskForm from '../components/RiskForm'
   ```

2. **Component Structure**:
   ```jsx
   // 1. Imports
   // 2. Component definition
   // 3. State declarations
   // 4. Effects
   // 5. Event handlers
   // 6. Render
   ```

### State Management

**Local State**: Use `useState` for component-specific state
```jsx
const [risks, setRisks] = useState([])
const [loading, setLoading] = useState(true)
```

**Form State**: Use single state object for forms
```jsx
const [formData, setFormData] = useState({
  risk_title: '',
  probability: 3,
  impact: 3
})
```

**Derived State**: Calculate from props/state
```jsx
const riskScore = formData.probability * formData.impact
```

### Error Handling

**API Calls**: Always handle errors
```jsx
try {
  const { data, error } = await supabase.from('risks').select('*')
  if (error) throw error
  setRisks(data)
} catch (error) {
  console.error('Error:', error)
  alert('Error loading risks: ' + error.message)
}
```

**Form Validation**: Validate before submission
```jsx
if (!formData.risk_title || !formData.description) {
  setErrors({ submit: 'Please fill in all required fields' })
  return
}
```

### Async Operations

**Use async/await**: Prefer async/await over promises
```jsx
// ✅ Good
const fetchRisks = async () => {
  try {
    const { data } = await supabase.from('risks').select('*')
    setRisks(data)
  } catch (error) {
    console.error(error)
  }
}

// ❌ Avoid
supabase.from('risks').select('*').then(({ data }) => {
  setRisks(data)
})
```

**Loading States**: Always show loading indicators
```jsx
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch data
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```

## Database Patterns

### Table Structure

All tables follow standard pattern:
- `id` (UUID, primary key)
- `created_at`, `created_by`
- `updated_at`, `updated_by`
- `is_deleted`, `deleted_at`, `deleted_by`
- Project-specific fields

### Soft Deletes

Always use soft deletes:
```jsx
await supabase
  .from('risks')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: user.id
  })
  .eq('id', riskId)
```

### Filtering

Always filter out deleted records:
```jsx
const { data } = await supabase
  .from('risks')
  .select('*')
  .eq('project_id', projectId)
  .eq('is_deleted', false)  // Always include this
```

## Component Patterns

### Form Components

```jsx
export default function RiskForm({ risk, projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  
  useEffect(() => {
    if (risk) {
      setFormData({ ...risk })
    }
  }, [risk])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    
    try {
      // Validation
      if (!formData.risk_title) {
        setErrors({ risk_title: 'Required' })
        return
      }
      
      // Save
      if (risk) {
        await supabase.from('risks').update(formData).eq('id', risk.id)
      } else {
        await supabase.from('risks').insert(formData)
      }
      
      onSave()
    } catch (error) {
      setErrors({ submit: error.message })
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### List Components

```jsx
export default function RiskList({ risks, onEdit, onRefresh, projectId }) {
  if (risks.length === 0) {
    return <div>No risks yet</div>
  }
  
  return (
    <div>
      {risks.map(risk => (
        <RiskCard
          key={risk.id}
          risk={risk}
          onEdit={() => onEdit(risk)}
        />
      ))}
    </div>
  )
}
```

### Modal Components

```jsx
export default function RiskForm({ onSave, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
        {/* Modal content */}
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onSave}>Save</button>
      </div>
    </div>
  )
}
```

## Testing

### Component Testing

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RiskList from '../RiskList'

describe('RiskList', () => {
  it('renders risks', () => {
    const risks = [
      { id: '1', risk_title: 'Test Risk', risk_score: 15 }
    ]
    render(<RiskList risks={risks} />)
    expect(screen.getByText('Test Risk')).toBeInTheDocument()
  })
})
```

### Utility Testing

```jsx
import { describe, it, expect } from 'vitest'
import { calculateFlowMetrics } from '../flowMetricsCalculator'

describe('flowMetricsCalculator', () => {
  it('calculates metrics correctly', () => {
    const cards = [/* test data */]
    const metrics = calculateFlowMetrics(cards)
    expect(metrics.cycleTimeDays).toBeGreaterThan(0)
  })
})
```

## Performance Optimization

### Pagination

Always use pagination for large lists:
```jsx
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = 20

const from = (currentPage - 1) * itemsPerPage
const to = from + itemsPerPage - 1

const { data } = await supabase
  .from('risks')
  .select('*')
  .range(from, to)
```

### Debouncing

Use debounce for search inputs:
```jsx
import { useDebounce } from '../hooks/useDebounce'

const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)

useEffect(() => {
  if (debouncedSearch) {
    fetchRisks(debouncedSearch)
  }
}, [debouncedSearch])
```

### Memoization

Use `useMemo` for expensive calculations:
```jsx
const riskScore = useMemo(() => {
  return probability * impact
}, [probability, impact])
```

## Security

### Input Validation

Always validate inputs:
```jsx
import { sanitizeInput, validateTextLength } from '../utils/inputValidation'

const title = sanitizeInput(formData.title)
if (!validateTextLength(title, 1, 200)) {
  setErrors({ title: 'Title must be 1-200 characters' })
  return
}
```

### Authentication

Always check authentication:
```jsx
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  throw new Error('User not authenticated')
}
```

## Common Patterns

### Fetching Data

```jsx
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('table')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      
      if (error) throw error
      setData(data || [])
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  if (projectId) {
    fetchData()
  }
}, [projectId])
```

### Updating Data

```jsx
const handleUpdate = async (id, updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    
    const { error } = await supabase
      .from('table')
      .update({
        ...updates,
        updated_by: user.id
      })
      .eq('id', id)
    
    if (error) throw error
    onRefresh()
  } catch (error) {
    console.error('Error:', error)
    alert('Error: ' + error.message)
  }
}
```

## Debugging

### Console Logging

Use console.log for debugging (remove in production):
```jsx
console.log('Risk data:', risks)
console.error('Error:', error)
```

### React DevTools

Use React DevTools to inspect component state and props.

### Supabase Dashboard

Use Supabase dashboard to:
- View database tables
- Check RLS policies
- Monitor API calls
- View logs

## Resources

- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)

---

*Last updated: January 2025*

