# Hold/Draft Queue System - Technical Documentation

**Version:** v201
**Created:** 2026-01-31
**Last Updated:** 2026-01-31

---

## Architecture Overview

The Hold/Draft Queue system provides a way for users to save incomplete form data and resume editing later. It consists of:

1. **Database Layer** - PostgreSQL tables with RLS policies
2. **Service Layer** - Draft queue service functions
3. **Hook Layer** - React custom hook for state management
4. **UI Components** - Reusable buttons, modals, and indicators
5. **Edge Functions** - Scheduled tasks for expiration management

---

## Database Schema

### Platform Schema (public)

#### draft_queue Table

```sql
CREATE TABLE draft_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    form_data JSONB NOT NULL DEFAULT '{}',
    entity_title VARCHAR(500),
    hold_reason TEXT,
    completion_percentage INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### draft_expiry_config Table

```sql
CREATE TABLE draft_expiry_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    entity_type VARCHAR(100),
    project_type_id UUID REFERENCES project_types(id),
    default_expiry_days INTEGER DEFAULT 14,
    warning_days INTEGER DEFAULT 3,
    max_drafts_per_user INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_entity_project UNIQUE (organisation_id, entity_type, project_type_id)
);
```

### Simulator Schema (sim)

Identical structure exists in the `sim` schema for simulator drafts:
- `sim.draft_queue`
- `sim.draft_expiry_config`

---

## Row Level Security (RLS) Policies

### User Own Drafts Policy

```sql
CREATE POLICY "Users can manage own drafts"
ON draft_queue FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### PMO Admin Organisation View Policy

```sql
CREATE POLICY "PMO Admin can view org drafts"
ON draft_queue FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN accounts a ON a.owner_user_id = auth.uid()
        WHERE ur.user_id = auth.uid()
            AND r.role_name = 'pmo_admin'
            AND ur.is_active = TRUE
            AND a.id = draft_queue.organisation_id
    )
);
```

---

## Database Functions

### expire_old_drafts()

Expires drafts that have passed their expiry date.

```sql
CREATE OR REPLACE FUNCTION expire_old_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE draft_queue
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at < NOW()
      AND is_deleted = FALSE;

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;
```

### get_expiring_drafts(p_warning_days)

Returns drafts expiring within the specified warning period.

```sql
CREATE OR REPLACE FUNCTION get_expiring_drafts(p_warning_days INTEGER DEFAULT 3)
RETURNS TABLE (
    draft_id UUID,
    user_id UUID,
    entity_type VARCHAR,
    entity_title VARCHAR,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dq.id AS draft_id,
        dq.user_id,
        dq.entity_type,
        dq.entity_title,
        dq.expires_at,
        EXTRACT(DAY FROM dq.expires_at - NOW())::INTEGER AS days_remaining
    FROM draft_queue dq
    WHERE dq.status = 'active'
      AND dq.is_deleted = FALSE
      AND dq.expires_at BETWEEN NOW() AND NOW() + (p_warning_days || ' days')::INTERVAL
      AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.data->>'draft_id' = dq.id::TEXT
            AND n.type = 'draft_expiry_warning'
            AND n.created_at > NOW() - INTERVAL '1 day'
      );
END;
$$;
```

### get_user_draft_count(p_user_id)

Returns the count of active drafts for a user.

```sql
CREATE OR REPLACE FUNCTION get_user_draft_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM draft_queue
    WHERE user_id = p_user_id
      AND status = 'active'
      AND is_deleted = FALSE;
$$;
```

---

## Service Layer

### draftQueueService.js

Located at: `src/services/draftQueueService.js`

#### Key Functions

```javascript
// Save draft to queue
export async function saveDraft({
  entityType,
  entityId,
  formData,
  entityTitle,
  holdReason,
  completionPercentage
}) { ... }

// Resume draft (mark as resumed and return data)
export async function resumeDraft(draftId) { ... }

// Delete draft (soft delete)
export async function deleteDraft(draftId) { ... }

// Get user's drafts for entity type
export async function getUserDrafts(entityType) { ... }

// Get user's draft count
export async function getUserDraftCount() { ... }

// Get expiry config for entity
export async function getExpiryConfig(entityType, projectTypeId) { ... }
```

---

## React Hook

### useDraftQueue Hook

Located at: `src/hooks/useDraftQueue.js`

#### Usage

```javascript
import { useDraftQueue } from '../hooks/useDraftQueue';

function MyForm() {
  const {
    isDraft,
    draftId,
    lastSaved,
    saveStatus,
    draftCount,
    canCreateDraft,
    autoSave,
    resumeDraft,
    deleteDraft
  } = useDraftQueue('project', existingDraftId);

  // Auto-save form data with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData && Object.keys(formData).length > 0) {
        autoSave(formData, formTitle, calculateCompletion(formData));
      }
    }, 60000); // 60 second debounce
    return () => clearTimeout(timer);
  }, [formData]);

  return (
    <form>
      {/* Form fields */}
      <HoldButton
        onHold={handlePutOnHold}
        disabled={!canCreateDraft}
        draftCount={draftCount}
      />
    </form>
  );
}
```

#### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `isDraft` | boolean | Whether form is in draft mode |
| `draftId` | string | Current draft ID if exists |
| `lastSaved` | Date | Last auto-save timestamp |
| `saveStatus` | string | 'idle', 'saving', 'saved', 'error' |
| `draftCount` | number | User's active draft count |
| `canCreateDraft` | boolean | Whether user can create more drafts |

#### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `autoSave` | (formData, title, completion) | Auto-save current form state |
| `resumeDraft` | (draftId) | Resume editing a draft |
| `deleteDraft` | (draftId) | Delete a draft |
| `putOnHold` | (formData, title, reason, completion) | Explicitly save and exit |

---

## UI Components

### HoldButton

Location: `src/components/ui/HoldButton.jsx`

```jsx
<HoldButton
  onHold={(reason) => handlePutOnHold(reason)}
  disabled={!canCreateDraft}
  draftCount={draftCount}
  maxDrafts={15}
/>
```

### HoldModal

Location: `src/components/ui/HoldModal.jsx`

```jsx
<HoldModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={(reason) => saveDraft(reason)}
  entityTitle="Project Alpha"
/>
```

### AutoSaveIndicator

Location: `src/components/ui/AutoSaveIndicator.jsx`

```jsx
<AutoSaveIndicator
  status={saveStatus}
  lastSaved={lastSaved}
/>
```

### DraftStatusBadge

Location: `src/components/ui/DraftStatusBadge.jsx`

```jsx
<DraftStatusBadge
  status="active"
  expiresAt={expiryDate}
  completionPercentage={75}
/>
```

### DraftLimitWarning

Location: `src/components/ui/DraftLimitWarning.jsx`

```jsx
<DraftLimitWarning
  currentCount={14}
  maxCount={15}
/>
```

### EntityHoldQueue

Location: `src/components/ui/EntityHoldQueue.jsx`

Reusable component for displaying entity-specific hold queues.

```jsx
<EntityHoldQueue
  entityType="project"
  title="Projects On Hold"
/>
```

---

## Edge Functions

### expire-drafts

Location: `supabase/functions/expire-drafts/index.ts`

**Schedule:** Daily at midnight UTC

**Operations:**
1. Call `expire_old_drafts()` for platform drafts
2. Call `sim.expire_old_drafts()` for simulator drafts
3. Send warning notifications via `get_expiring_drafts(3)`
4. Cleanup deleted drafts older than 30 days

**Triggering:**

Via Supabase Dashboard Cron:
```sql
SELECT cron.schedule(
  'expire-drafts-daily',
  '0 0 * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/expire-drafts',
    headers := '{"Authorization": "Bearer your-anon-key"}'::jsonb
  )$$
);
```

---

## Entity Configuration

### draftQueueConfig.js

Location: `src/config/draftQueueConfig.js`

Defines supported entity types with their configuration:

```javascript
export const DRAFT_ENTITY_TYPES = {
  project: {
    label: 'Project',
    pluralLabel: 'Projects',
    icon: 'FolderKanban',
    listRoute: '/projects',
    createRoute: '/projects/create',
    editRoute: '/projects/:id/edit',
    holdQueueRoute: '/projects/on-hold',
    defaultExpiryDays: 14,
    requiredFields: ['name', 'description'],
    allowedRoles: ['pmo_admin', 'project_manager']
  },
  // ... more entity types
};
```

### Supported Entity Types

**Platform Entities:**
- project, benefit, issue, risk, quality_activity
- project_mandate, project_brief, business_case
- daily_log, lessons_log, lessons_report
- risk_register, issue_register, issue_report
- quality_management_strategy, risk_management_strategy
- communication_management_strategy, configuration_management_strategy
- product_description, product_status_account
- project_initiation_document, work_package
- checkpoint_report, highlight_report
- end_stage_report, end_project_report, exception_report
- plan

**Simulator Entities:**
- sim_project, sim_risk, sim_issue, sim_task

---

## Menu Integration

### Adding Hold Queue to Entity Menu

In `pmMenuConfig.js`, add a submenu item:

```javascript
{
  id: 'entity-on-hold',
  label: 'On Hold',
  icon: 'Pause',
  route: '/entity-type/on-hold',
  badge: 'draftCount', // Dynamic badge showing draft count
  requiredRoles: ['pmo_admin', 'project_manager']
}
```

---

## API Endpoints

### REST API (via Supabase)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rest/v1/draft_queue?user_id=eq.{id}` | Get user's drafts |
| POST | `/rest/v1/draft_queue` | Create draft |
| PATCH | `/rest/v1/draft_queue?id=eq.{id}` | Update draft |
| DELETE | `/rest/v1/draft_queue?id=eq.{id}` | Delete draft |

### RPC Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `expire_old_drafts` | none | Expire overdue drafts |
| `get_expiring_drafts` | warning_days | Get drafts expiring soon |
| `get_user_draft_count` | user_id | Get user's draft count |

---

## Performance Considerations

### Auto-Save Debouncing

Auto-save uses a 60-second debounce to prevent excessive API calls:

```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    if (formDirty && formData) {
      autoSave(formData, title, completion);
    }
  }, 60000);
  return () => clearTimeout(timer);
}, [formData]);
```

### Draft Count Caching

The `useDraftQueue` hook caches draft count to minimize database queries:

```javascript
const [draftCount, setDraftCount] = useState(0);

useEffect(() => {
  const fetchCount = async () => {
    const count = await getUserDraftCount();
    setDraftCount(count);
  };
  fetchCount();
}, [isDraft]); // Only refetch when draft state changes
```

### Lazy Loading Hold Queue Pages

Hold queue pages are lazy-loaded to reduce initial bundle size:

```javascript
const ProjectsOnHold = lazy(() => import('./pages/projects/ProjectsOnHold'));
```

---

## Error Handling

### Draft Creation Errors

```javascript
try {
  await saveDraft(formData);
} catch (error) {
  if (error.code === 'DRAFT_LIMIT_EXCEEDED') {
    showError('Maximum draft limit reached. Please delete or resume existing drafts.');
  } else if (error.code === 'PERMISSION_DENIED') {
    showError('You do not have permission to create drafts.');
  } else {
    showError('Failed to save draft. Please try again.');
  }
}
```

### Auto-Save Error Recovery

```javascript
const handleAutoSaveError = (error) => {
  setSaveStatus('error');
  // Retry after 30 seconds
  setTimeout(() => {
    autoSave(formData, title, completion);
  }, 30000);
};
```

---

## Testing

### Unit Tests

Location: `src/hooks/__tests__/useDraftQueue.test.js`

```javascript
describe('useDraftQueue', () => {
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useDraftQueue('project'));
    expect(result.current.isDraft).toBe(false);
    expect(result.current.saveStatus).toBe('idle');
  });

  it('should respect draft limit', async () => {
    // Mock 15 existing drafts
    mockSupabase.rpc.mockResolvedValue({ data: 15 });
    const { result } = renderHook(() => useDraftQueue('project'));
    await waitFor(() => {
      expect(result.current.canCreateDraft).toBe(false);
    });
  });
});
```

### Integration Tests

Location: `src/services/__tests__/draftQueueService.test.js`

```javascript
describe('draftQueueService', () => {
  it('should save and retrieve draft', async () => {
    const draft = await saveDraft({
      entityType: 'project',
      formData: { name: 'Test Project' },
      entityTitle: 'Test Project'
    });
    expect(draft.id).toBeDefined();

    const retrieved = await getDraft(draft.id);
    expect(retrieved.form_data.name).toBe('Test Project');
  });
});
```

---

## Deployment Checklist

1. **Database Migration**
   - [ ] Run `v254_draft_queue_tables.sql` on platform
   - [ ] Run `v255_sim_draft_queue_tables.sql` on simulator

2. **Edge Function Deployment**
   - [ ] Deploy `expire-drafts` function
   - [ ] Configure cron schedule
   - [ ] Set environment variables (SITE_URL)

3. **Frontend Deployment**
   - [ ] Build and deploy updated frontend
   - [ ] Verify lazy loading works
   - [ ] Test on mobile devices

4. **Configuration**
   - [ ] Set default expiry days in database
   - [ ] Configure warning notification days
   - [ ] Set max drafts per user limit

5. **Monitoring**
   - [ ] Monitor Edge Function logs
   - [ ] Track draft creation/expiry metrics
   - [ ] Set up alerts for function failures

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Drafts not saving | RLS policy blocking | Check user authentication |
| Drafts not expiring | Cron not running | Verify cron schedule |
| Draft count incorrect | Cache stale | Force refresh hook state |
| Form data lost | JSON serialization | Check for circular references |

### Debug Logging

Enable debug mode in development:

```javascript
const DEBUG_DRAFT_QUEUE = process.env.NODE_ENV === 'development';

if (DEBUG_DRAFT_QUEUE) {
  console.log('[DraftQueue]', action, data);
}
```

---

*Last updated: 2026-01-31*
