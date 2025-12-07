# API Documentation - Phase 3

## Overview

This document describes the API endpoints and database operations added in Phase 3. The application uses Supabase (PostgreSQL) as the backend, accessed through the Supabase JavaScript client library.

## Authentication

All API calls require authentication via Supabase Auth. The authentication token is automatically included in requests through the Supabase client.

```javascript
import { supabase } from '../services/supabaseClient'

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

## Database Tables - Phase 3

### New Tables Added

#### Scrum Events
- `sprint_reviews` - Sprint review records
- `sprint_review_feedback` - Stakeholder feedback
- `sprint_retrospectives` - Retrospective records
- `retrospective_items` - Retrospective items (what went well, improvements, actions)
- `daily_scrums` - Daily standup records
- `daily_scrum_answers` - Individual standup answers

#### Structured PM - Controlling a Stage
- `work_packages` - Work package definitions
- `checkpoint_reports` - Regular stage progress reports
- `highlight_reports` - Summary reports for Project Board
- `stage_tolerances` - Stage tolerance monitoring

#### Structured PM - Managing Product Delivery
- `product_deliverables` - Product definitions
- `quality_criteria` - Quality criteria for products
- `acceptance_records` - Product acceptance records
- `product_handover` - Product handover records

#### Issue Management
- `issues` - Issue records
- `issue_comments` - Issue comments
- `issue_attachments` - Issue file attachments
- `issue_history` - Issue status change history

#### Risk Management
- `risks` - Risk records
- `risk_assessments` - Risk assessment history
- `risk_mitigations` - Risk mitigation plans
- `risk_monitoring` - Risk monitoring records
- `assumptions` - Project assumptions
- `dependencies_register` - Project dependencies

## Common Query Patterns

### Basic CRUD Operations

#### Create Record

```javascript
const { data, error } = await supabase
  .from('table_name')
  .insert({
    field1: 'value1',
    field2: 'value2',
    created_by: user.id
  })
```

#### Read Records

```javascript
// Get all records
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('project_id', projectId)
  .eq('is_deleted', false)

// Get single record
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', recordId)
  .single()
```

#### Update Record

```javascript
const { data, error } = await supabase
  .from('table_name')
  .update({
    field1: 'new_value',
    updated_by: user.id
  })
  .eq('id', recordId)
```

#### Delete Record (Soft Delete)

```javascript
const { data, error } = await supabase
  .from('table_name')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: user.id
  })
  .eq('id', recordId)
```

### Advanced Queries

#### Filtering

```javascript
// Multiple filters
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('status', 'active')
  .eq('priority', 'high')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

#### Searching

```javascript
// Text search (case-insensitive)
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
```

#### Sorting

```javascript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .order('created_at', { ascending: false })
  .order('priority', { ascending: false })
```

#### Pagination

```javascript
const pageSize = 20
const page = 1
const from = (page - 1) * pageSize
const to = from + pageSize - 1

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .range(from, to)
```

#### Joins and Relations

```javascript
// Select with related data
const { data, error } = await supabase
  .from('issues')
  .select(`
    *,
    reported_by:reported_by_user_id (id, email, full_name),
    assigned_to:assigned_to_user_id (id, email, full_name)
  `)
```

#### Count Queries

```javascript
// Get count only
const { count, error } = await supabase
  .from('table_name')
  .select('id', { count: 'exact', head: true })
  .eq('project_id', projectId)
```

## Module-Specific APIs

### Issue Management

#### Create Issue

```javascript
const { data, error } = await supabase
  .from('issues')
  .insert({
    issue_title: 'Issue title',
    issue_description: 'Description',
    issue_type: 'bug',
    priority: 'high',
    severity: 'high',
    project_id: projectId,
    reported_by_user_id: user.id,
    created_by: user.id
  })
```

#### Get Issues with Filters

```javascript
let query = supabase
  .from('issues')
  .select(`
    *,
    reported_by:reported_by_user_id (id, email, full_name),
    assigned_to:assigned_to_user_id (id, email, full_name)
  `)
  .eq('project_id', projectId)
  .eq('is_deleted', false)

if (status) query = query.eq('status', status)
if (priority) query = query.eq('priority', priority)
if (search) query = query.or(`issue_title.ilike.%${search}%,issue_description.ilike.%${search}%`)

const { data, error } = await query.order('created_at', { ascending: false })
```

### Risk Management

#### Create Risk

```javascript
const riskScore = probability * impact
const riskLevel = riskScore >= 20 ? 'critical' : 
                  riskScore >= 12 ? 'high' : 
                  riskScore >= 6 ? 'medium' : 'low'

const { data, error } = await supabase
  .from('risks')
  .insert({
    risk_title: 'Risk title',
    risk_description: 'Description',
    risk_type: 'threat',
    probability: 4,
    impact: 5,
    risk_score: riskScore,
    risk_level: riskLevel,
    project_id: projectId,
    identified_by_user_id: user.id,
    created_by: user.id
  })
```

#### Get Risks with Assessment

```javascript
const { data, error } = await supabase
  .from('risks')
  .select(`
    *,
    identified_by:identified_by_user_id (id, email, full_name),
    risk_owner:risk_owner_user_id (id, email, full_name)
  `)
  .eq('project_id', projectId)
  .eq('is_deleted', false)
  .order('risk_score', { ascending: false })
```

### Work Packages (Structured PM CS)

#### Create Work Package

```javascript
const { data, error } = await supabase
  .from('work_packages')
  .insert({
    work_package_name: 'Work Package Name',
    work_package_code: 'WP-001',
    description: 'Description',
    stage_id: stageId,
    project_id: projectId,
    assigned_to_user_id: userId,
    planned_start_date: startDate,
    planned_end_date: endDate,
    created_by: user.id
  })
```

### Product Deliverables (Structured PM MP)

#### Create Product Deliverable

```javascript
const { data, error } = await supabase
  .from('product_deliverables')
  .insert({
    product_name: 'Product Name',
    product_code: 'PROD-001',
    product_type: 'specialist',
    description: 'Description',
    project_id: projectId,
    product_owner_user_id: userId,
    planned_delivery_date: deliveryDate,
    created_by: user.id
  })
```

### Daily Scrum

#### Create Daily Scrum

```javascript
const { data, error } = await supabase
  .from('daily_scrums')
  .insert({
    sprint_id: sprintId,
    scrum_date: new Date().toISOString().split('T')[0],
    created_by: user.id
  })
  .select()
  .single()

// Add answers
await supabase
  .from('daily_scrum_answers')
  .insert({
    daily_scrum_id: data.id,
    user_id: user.id,
    yesterday_work: 'What I did yesterday',
    today_work: 'What I will do today',
    blockers: 'Any blockers'
  })
```

## File Storage (Supabase Storage)

### Upload File

```javascript
const file = event.target.files[0]
const fileExt = file.name.split('.').pop()
const fileName = `${Math.random()}.${fileExt}`
const filePath = `project-${projectId}/${fileName}`

const { error: uploadError } = await supabase.storage
  .from('attachments')
  .upload(filePath, file)

if (uploadError) throw uploadError

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('attachments')
  .getPublicUrl(filePath)
```

### Download File

```javascript
const { data, error } = await supabase.storage
  .from('attachments')
  .download(filePath)
```

### Delete File

```javascript
const { error } = await supabase.storage
  .from('attachments')
  .remove([filePath])
```

## Real-time Subscriptions

### Subscribe to Changes

```javascript
const subscription = supabase
  .channel('table_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'issues',
    filter: `project_id=eq.${projectId}`
  }, (payload) => {
    console.log('Change received!', payload)
    // Update UI
  })
  .subscribe()

// Unsubscribe
subscription.unsubscribe()
```

## Error Handling

### Standard Error Pattern

```javascript
try {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')

  if (error) throw error
  
  // Use data
} catch (error) {
  console.error('Error:', error)
  alert('Error: ' + error.message)
}
```

## Best Practices

1. **Always Check Errors**: Check for errors after every Supabase call
2. **Use Transactions**: For related operations, use transactions when possible
3. **Soft Deletes**: Use soft deletes (is_deleted flag) instead of hard deletes
4. **Pagination**: Use pagination for large datasets
5. **Filtering**: Apply filters on the database side, not client side
6. **Indexing**: Ensure database indexes exist for frequently queried fields
7. **Error Messages**: Provide user-friendly error messages
8. **Loading States**: Show loading indicators during API calls

## Rate Limiting

Supabase has rate limits based on your plan. For production:
- Monitor API usage
- Implement client-side caching where appropriate
- Use pagination to reduce data transfer
- Batch operations when possible

## Security Considerations

1. **Row Level Security (RLS)**: All tables should have RLS policies
2. **Input Validation**: Validate all inputs before sending to API
3. **Authentication**: Ensure user is authenticated before operations
4. **Authorization**: Check user permissions before operations
5. **SQL Injection**: Supabase client handles this, but be careful with dynamic queries

## Testing

### Mock Supabase for Testing

```javascript
// In test setup
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))
```

## References

- [Supabase JavaScript Client Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)

---

*Last updated: January 2025*

