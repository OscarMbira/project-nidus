# Gantt Chart - Technical Design Document
**Date:** 2025-11-16
**Phase:** Phase 3 - Day 85
**Status:** Planning

---

## 1. Executive Summary

This document outlines the technical design for implementing a basic Gantt chart visualization in Project Nidus as part of Phase 3. The Gantt chart will provide interactive timeline visualization for tasks with dependencies, critical path highlighting, and basic project planning capabilities.

---

## 2. Library Evaluation

### Options Considered

#### Option 1: SVAR React Gantt ⭐ (New in 2024)
- **License:** GPLv3 (Open source)
- **Cost:** FREE
- **Pros:**
  - Built specifically for React 19 and TypeScript
  - Modern, actively maintained (released Oct 2024)
  - Drag-and-drop, dependencies, tree view
  - No licensing costs
  - Good performance
- **Cons:**
  - Very new (limited community/examples)
  - GPLv3 may have restrictions for commercial use
  - Less battle-tested than alternatives

#### Option 2: Frappe Gantt ⭐⭐ (RECOMMENDED)
- **License:** MIT (Completely open, no restrictions)
- **Cost:** FREE
- **Pros:**
  - MIT license (use anywhere, no restrictions)
  - Lightweight and simple
  - 5.3K GitHub stars, 3,800+ weekly downloads
  - Multiple React wrappers available
  - Good for basic-to-intermediate needs
  - Easy to integrate and customize
  - Works with any frontend stack
- **Cons:**
  - Fewer advanced features than DHTMLX
  - Designed for straightforward timelines, not enterprise-scale
  - Limited built-in features (but extensible)

#### Option 3: DHTMLX Gantt
- **License:** GPL 2.0 (free) / Commercial (~$6,100)
- **Cost:** FREE for GPL projects, ~$6,100+ for commercial
- **Pros:**
  - Most feature-rich option
  - Enterprise-grade
  - Excellent React integration
  - Advanced features: auto-scheduling, resource management, critical path
  - Perpetual license (lifetime use)
  - 30-day free trial
- **Cons:**
  - Expensive for commercial use
  - GPL license may have restrictions
  - Overkill for Phase 3 (basic Gantt)
  - Heavier library

### Recommendation: **Frappe Gantt**

**Rationale:**
1. **Perfect for Phase 3 scope** - We only need basic Gantt features
2. **MIT License** - Complete freedom, no restrictions
3. **Cost** - Completely free
4. **Community support** - 5.3K stars, active community
5. **Simplicity** - Easy to integrate and customize
6. **Future-proof** - Can upgrade to DHTMLX in Phase 4 if needed for advanced features

**React Wrapper:** `frappe-gantt-react` or `react-frappe-gantt`

---

## 3. Feature Requirements (Phase 3 - Basic Gantt)

### Must-Have Features
- ✅ Interactive timeline visualization
- ✅ Task bars with start/end dates
- ✅ Task dependencies (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish)
- ✅ Critical path calculation and highlighting
- ✅ Drag-and-drop to adjust dates
- ✅ Zoom controls (Day, Week, Month, Quarter views)
- ✅ Today marker
- ✅ Milestone markers (diamond shapes)
- ✅ Progress indicators on task bars
- ✅ Task tooltips with details
- ✅ Dark/Light theme support

### Nice-to-Have Features (Phase 3)
- ⭕ Resource names on task bars
- ⭕ Baseline comparison (planned vs actual)
- ⭕ Export to PDF/PNG
- ⭕ Auto-scheduling (recalculate dates on dependency changes)

### Future Features (Phase 4 - Advanced Gantt)
- ⏭️ Resource leveling
- ⏭️ Earned Value Management (EVM)
- ⏭️ Multiple baselines
- ⏭️ Resource loading charts
- ⏭️ Network diagram view
- ⏭️ Microsoft Project import/export

---

## 4. Component Architecture

### Component Hierarchy

```
GanttChart.jsx (Main Container)
├── GanttToolbar.jsx (Zoom, view mode, export controls)
├── GanttTimeline.jsx (Wrapper for Frappe Gantt)
├── GanttLegend.jsx (Critical path, milestones legend)
└── GanttSettings.jsx (Settings panel - optional)
```

### Component Details

#### GanttChart.jsx
**Purpose:** Main container component
**Props:**
- `projectId` - Project to display tasks for
- `tasks` - Array of tasks (optional, fetched if not provided)
- `viewMode` - Default view mode ('Day' | 'Week' | 'Month' | 'Quarter')
- `onTaskUpdate` - Callback when task dates change
- `onDependencyCreate` - Callback when dependency created
- `showCriticalPath` - Boolean to highlight critical path

**State:**
- `tasks` - Task data
- `dependencies` - Dependency data
- `viewMode` - Current view mode
- `loading` - Loading state
- `error` - Error state

#### GanttToolbar.jsx
**Purpose:** Toolbar with controls
**Features:**
- View mode selector (Day/Week/Month/Quarter)
- Zoom in/out buttons
- Export button (PDF/PNG)
- Refresh button
- Settings button

#### GanttTimeline.jsx
**Purpose:** Wrapper for Frappe Gantt library
**Responsibilities:**
- Render Frappe Gantt instance
- Handle drag events
- Handle click events
- Update task dates
- Manage dependencies
- Apply theme colors

---

## 5. Data Model

### Task Data Structure (for Gantt)

```javascript
{
  id: 'uuid',
  name: 'Task Name',
  start: '2025-01-15', // YYYY-MM-DD
  end: '2025-01-20',
  progress: 75, // 0-100
  dependencies: 'task-id-1, task-id-2', // Comma-separated
  custom_class: 'critical-path', // CSS class for styling
  is_milestone: false
}
```

### Dependency Data Structure

```javascript
{
  id: 'uuid',
  source_task_id: 'uuid',
  target_task_id: 'uuid',
  dependency_type: 'FS', // FS, SS, FF, SF
  lag_days: 0
}
```

### Critical Path Data

```javascript
{
  task_id: 'uuid',
  is_critical: true,
  slack_days: 0, // Float/slack time
  earliest_start: '2025-01-15',
  earliest_finish: '2025-01-20',
  latest_start: '2025-01-15',
  latest_finish: '2025-01-20'
}
```

---

## 6. Database Schema Enhancements

### New Fields for Existing Tables

#### tasks table (enhancements)
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_critical_path BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slack_days INTEGER DEFAULT 0;
```

### New Tables

#### project_milestones
```sql
CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_date DATE NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  milestone_type VARCHAR(50), -- 'project_start', 'project_end', 'phase_gate', 'deliverable', 'custom'

  -- Standard audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);
```

#### gantt_settings (user preferences)
```sql
CREATE TABLE gantt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  default_view_mode VARCHAR(20) DEFAULT 'Week', -- 'Day', 'Week', 'Month', 'Quarter'
  show_critical_path BOOLEAN DEFAULT TRUE,
  show_baselines BOOLEAN DEFAULT FALSE,
  show_progress BOOLEAN DEFAULT TRUE,
  show_resources BOOLEAN DEFAULT TRUE,

  -- Standard audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),

  UNIQUE(user_id, project_id)
);
```

---

## 7. Critical Path Calculation

### Algorithm: Critical Path Method (CPM)

**Steps:**
1. **Forward Pass** - Calculate earliest start/finish times
2. **Backward Pass** - Calculate latest start/finish times
3. **Slack Calculation** - Slack = Latest Start - Earliest Start
4. **Identify Critical Path** - Tasks with slack = 0

**Implementation:**
- Server-side calculation (PostgreSQL function) for accuracy
- Client-side for real-time updates during drag operations
- Recalculate on dependency changes

### PostgreSQL Function (Example)

```sql
CREATE OR REPLACE FUNCTION calculate_critical_path(p_project_id UUID)
RETURNS TABLE (
  task_id UUID,
  is_critical BOOLEAN,
  slack_days INTEGER
) AS $$
BEGIN
  -- Implementation of CPM algorithm
  -- This is a placeholder - actual implementation is more complex
  RETURN QUERY
  SELECT
    t.id as task_id,
    (t.slack_days = 0) as is_critical,
    t.slack_days
  FROM tasks t
  WHERE t.project_id = p_project_id
  AND t.is_deleted = FALSE
  ORDER BY t.start_date;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. API Services

### Gantt API Services (`src/services/gantt.js`)

```javascript
// Fetch Gantt data for a project
export async function fetchGanttData(projectId)

// Update task dates from drag operation
export async function updateTaskDates(taskId, startDate, endDate)

// Create task dependency
export async function createDependency(sourceTaskId, targetTaskId, type, lag)

// Delete task dependency
export async function deleteDependency(dependencyId)

// Calculate and update critical path
export async function updateCriticalPath(projectId)

// Export Gantt to PDF/PNG
export async function exportGantt(projectId, format)

// Save Gantt settings
export async function saveGanttSettings(userId, projectId, settings)

// Load Gantt settings
export async function loadGanttSettings(userId, projectId)
```

---

## 9. Theme Support

### Dark Mode Colors
```css
.gantt-container.dark {
  --gantt-bg: #1a1a1a;
  --gantt-bar: #3b82f6;
  --gantt-bar-critical: #ef4444;
  --gantt-bar-milestone: #f59e0b;
  --gantt-text: #e5e7eb;
  --gantt-grid: #374151;
  --gantt-today: #10b981;
}
```

### Light Mode Colors
```css
.gantt-container.light {
  --gantt-bg: #ffffff;
  --gantt-bar: #2563eb;
  --gantt-bar-critical: #dc2626;
  --gantt-bar-milestone: #f59e0b;
  --gantt-text: #1f2937;
  --gantt-grid: #e5e7eb;
  --gantt-today: #059669;
}
```

---

## 10. Performance Considerations

### Optimization Strategies
1. **Lazy Loading** - Only load visible tasks (virtualization for 1000+ tasks)
2. **Memoization** - Use React.memo for expensive components
3. **Debouncing** - Debounce drag operations and recalculations
4. **Client-side Caching** - Cache Gantt data in React state/context
5. **Progressive Enhancement** - Load basic view first, add features progressively

### Performance Targets
- Initial render: < 1 second (for 1000 tasks)
- Drag operation: < 100ms response time
- Critical path calculation: < 2 seconds
- Zoom change: < 500ms

---

## 11. User Interactions

### Drag & Drop
- **Task bar drag** - Change start/end dates
- **Validation** - Prevent invalid dates (weekends, holidays - optional)
- **Auto-scheduling** - Recalculate dependent tasks
- **Feedback** - Show new dates in tooltip during drag

### Click Interactions
- **Single click on task** - Show task details tooltip
- **Double click on task** - Open task detail page
- **Click on dependency line** - Show dependency details (type, lag)
- **Right-click** - Context menu (optional)

### Keyboard Navigation
- **Arrow keys** - Navigate between tasks
- **+/-** - Zoom in/out
- **Space** - Toggle task selection
- **Delete** - Delete selected dependency

---

## 12. Integration Points

### With Existing Modules
- **Tasks Module** - Fetch tasks from tasks table
- **Projects Module** - Link to project context
- **Users Module** - Show assigned users on bars
- **Navigation** - Add Gantt view to project detail page

### Navigation Menu
- Add "Gantt Chart" link under Projects submenu
- Add "Timeline View" tab on Project Detail page

---

## 13. Testing Strategy

### Unit Tests
- Critical path calculation algorithm
- Date manipulation functions
- Dependency validation
- Task data transformation

### Integration Tests
- Gantt data fetching
- Task update operations
- Dependency CRUD operations
- Critical path calculation

### Performance Tests
- Load test with 1000 tasks
- Drag operation responsiveness
- Zoom change performance

### User Acceptance Tests
- Create task dependencies
- Drag tasks to change dates
- View critical path
- Change view modes
- Export Gantt chart

---

## 14. Implementation Plan (Week 13)

### Day 85: ✅ Planning & Research (COMPLETE)
- Library evaluation
- Technical design
- Architecture planning

### Day 86: Database Schema
- Create v18_gantt_enhancements.sql
- Add new fields to tasks table
- Create project_milestones table
- Create gantt_settings table
- Register tables

### Day 87: Component Setup
- Install frappe-gantt-react
- Create GanttChart.jsx component
- Create GanttToolbar.jsx component
- Basic rendering with mock data
- Theme support

### Day 88: Dependencies & Critical Path
- Implement dependency rendering
- Critical path calculation (basic)
- Highlight critical path
- Dependency creation UI

### Day 89: Milestones & Progress
- Add milestone markers
- Progress bars on tasks
- Resource display
- Tooltips

### Day 90: API & Integration
- Create Gantt API services
- Integrate with tasks API
- Task update from drag
- Auto-scheduling (basic)

### Day 91: Polish & Testing
- Bug fixes
- Export functionality
- User guide
- Integration with project page

---

## 15. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Frappe Gantt limitations | Medium | Medium | Keep design flexible, can swap library later |
| Critical path complexity | Medium | High | Start with simple implementation, enhance in Phase 4 |
| Performance with 1000+ tasks | Low | High | Implement virtualization if needed |
| Dependency circular validation | Low | Medium | Add validation before creating dependencies |
| Theme integration issues | Low | Low | Test both themes early |

---

## 16. Future Enhancements (Phase 4)

### Advanced Features (Not in Phase 3)
- Resource leveling and allocation
- Multiple baselines comparison
- Earned Value Management (EVM)
- Network diagram view
- Resource histogram
- Microsoft Project import/export
- Advanced auto-scheduling
- What-if scenario planning
- Constraint-based scheduling
- Custom calendars (holidays, working hours)

---

## 17. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-16 | Use Frappe Gantt | MIT license, lightweight, perfect for Phase 3 basic needs |
| 2025-11-16 | Critical path in PostgreSQL | Accuracy and consistency, avoid client-side calculation errors |
| 2025-11-16 | Minimal new tables | Reuse existing tasks table, only add settings and milestones |
| 2025-11-16 | React wrapper: frappe-gantt-react | Most popular, actively maintained, good documentation |

---

## 18. References

### Documentation
- [Frappe Gantt GitHub](https://github.com/frappe/gantt)
- [frappe-gantt-react npm](https://www.npmjs.com/package/frappe-gantt-react)
- [Critical Path Method (CPM)](https://en.wikipedia.org/wiki/Critical_path_method)

### Examples
- [Frappe Gantt Demo](https://frappe.io/gantt)
- [React Gantt CodeSandbox](https://codesandbox.io/examples/package/frappe-gantt-react)

---

## 19. Approval

**Status:** ⏳ Pending Approval

**Approvers:**
- [ ] Product Owner
- [ ] Technical Lead
- [ ] Project Manager

**Approved on:** _________________

---

**End of Gantt Chart Technical Design Document**
