# Directing a Project (DP) Module - Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Directing a Project module functionality.

## Prerequisites
1. Database setup complete (v28_directing_project.sql executed)
2. Menu items configured (v36_phase5_menu_items.sql executed - optional)
3. At least one active project in the system
4. At least one active user account for testing

---

## Test Scenarios

### 1. Project Board Creation

**Test Case 1.1: Create a Project Board**
- **Steps:**
  1. Navigate to a project: `/projects/:projectId`
  2. Access Directing a Project page: `/projects/:projectId/structured/directing`
  3. Should see "No Project Board Established" message
  4. Click "Create Project Board" button

- **Expected Results:**
  - ✅ Board is created with auto-generated name
  - ✅ Redirected to board dashboard
  - ✅ Dashboard shows empty statistics (0 members, 0 meetings, etc.)

**Test Case 1.2: Project Board Persistence**
- **Steps:**
  1. Refresh the page after creating a board
  2. Navigate away and return to the directing page

- **Expected Results:**
  - ✅ Board remains created
  - ✅ No duplicate boards are created
  - ✅ Board data persists across sessions

---

### 2. Board Member Management

**Test Case 2.1: Add Board Member**
- **Steps:**
  1. Navigate to "Board Members" tab
  2. Click "Add Member" button
  3. Fill in the form:
     - User: Select from dropdown
     - Role: Select "Executive", "Senior User", etc.
     - Appointment Date: Today's date
     - Responsibilities: Enter description
     - Active: Checked
  4. Click "Add Member"

- **Expected Results:**
  - ✅ Form modal appears
  - ✅ User dropdown is populated with active users
  - ✅ Member is created successfully
  - ✅ Member appears in the list
  - ✅ Form closes after submission
  - ✅ Dashboard updates with new member count

**Test Case 2.2: Edit Board Member**
- **Steps:**
  1. Click edit icon on an existing member
  2. Modify responsibilities field
  3. Change "Active" status
  4. Click "Update Member"

- **Expected Results:**
  - ✅ Form pre-fills with existing data
  - ✅ User field is disabled (cannot change user)
  - ✅ Changes are saved
  - ✅ List updates with new information

**Test Case 2.3: Remove Board Member**
- **Steps:**
  1. Click delete icon on a member
  2. Confirm deletion in alert dialog

- **Expected Results:**
  - ✅ Confirmation dialog appears
  - ✅ Member is removed from list (soft delete)
  - ✅ Dashboard count decreases
  - ✅ Member can still be queried from database (is_deleted = true)

**Test Case 2.4: Role Badge Display**
- **Steps:**
  1. Create members with different roles
  2. Observe badge colors

- **Expected Results:**
  - ✅ Executive: Purple badge
  - ✅ Senior User: Green badge
  - ✅ Senior Supplier: Blue badge
  - ✅ Project Assurance: Yellow badge
  - ✅ Change Authority: Orange badge

---

### 3. Board Meeting Management

**Test Case 3.1: Schedule Board Meeting**
- **Steps:**
  1. Navigate to "Meetings" tab
  2. Click "Schedule Meeting" button
  3. Fill in the form:
     - Meeting Title: "Q1 Board Review"
     - Meeting Type: "Regular"
     - Status: "Scheduled"
     - Date: Future date
     - Start/End Time: 09:00 - 10:00
     - Location: "Conference Room A"
     - Purpose: Brief description
     - Agenda Items: List of topics
  4. Click "Schedule Meeting"

- **Expected Results:**
  - ✅ Form appears with all fields
  - ✅ Date picker works correctly
  - ✅ Time fields default to 09:00 and 10:00
  - ✅ Meeting is created
  - ✅ Meeting appears in list with correct badges
  - ✅ Dashboard shows updated meeting count

**Test Case 3.2: Edit Board Meeting**
- **Steps:**
  1. Click edit icon on a scheduled meeting
  2. Add meeting minutes and action items
  3. Change status to "Completed"
  4. Click "Update Meeting"

- **Expected Results:**
  - ✅ Form pre-fills with existing data
  - ✅ Minutes and action items fields are visible for existing meetings
  - ✅ Changes save successfully
  - ✅ Status badge updates to "Completed" (green)

**Test Case 3.3: View Meeting Details**
- **Steps:**
  1. Click "View Details" button on a meeting

- **Expected Results:**
  - ✅ Opens meeting form in view/edit mode
  - ✅ All meeting data is displayed
  - ✅ Attendees count is shown (if any)

**Test Case 3.4: Meeting Type Colors**
- **Steps:**
  1. Create meetings with different types
  2. Observe badge colors

- **Expected Results:**
  - ✅ Regular: Blue badge
  - ✅ Ad Hoc: Purple badge
  - ✅ Emergency: Red badge

---

### 4. Dashboard Functionality

**Test Case 4.1: Dashboard Statistics**
- **Steps:**
  1. Navigate to "Dashboard" tab
  2. Observe stat cards

- **Expected Results:**
  - ✅ Board Members card shows total and active count
  - ✅ Meetings card shows total and upcoming count
  - ✅ Decisions card shows total and pending count
  - ✅ Authorizations card shows total and active count
  - ✅ Each card has appropriate icon and color

**Test Case 4.2: Dashboard Refresh**
- **Steps:**
  1. Note current statistics
  2. Click "Refresh" button
  3. Add a new member in another tab
  4. Click "Refresh" again

- **Expected Results:**
  - ✅ Refresh button triggers data reload
  - ✅ Statistics update to reflect new data
  - ✅ No page reload occurs

**Test Case 4.3: Activity Summary**
- **Steps:**
  1. Schedule upcoming meetings
  2. Create pending decisions
  3. Check activity summary section

- **Expected Results:**
  - ✅ Shows upcoming meetings alert (blue)
  - ✅ Shows pending decisions alert (yellow)
  - ✅ Shows active authorizations alert (green)
  - ✅ Alerts only appear when relevant

---

### 5. Dark Mode Support

**Test Case 5.1: Dark Mode Toggle**
- **Steps:**
  1. View Directing Project page in light mode
  2. Toggle to dark mode (system preference or app toggle)
  3. Check all components

- **Expected Results:**
  - ✅ Dashboard cards adapt to dark mode
  - ✅ Member list cards have dark backgrounds
  - ✅ Meeting list cards have dark backgrounds
  - ✅ Forms have dark backgrounds and borders
  - ✅ Text is readable in dark mode
  - ✅ Icons maintain visibility
  - ✅ Badge colors remain distinguishable

---

### 6. Navigation and Routing

**Test Case 6.1: Tab Navigation**
- **Steps:**
  1. Click through all tabs: Dashboard, Members, Meetings, Decisions
  2. Use browser back/forward buttons

- **Expected Results:**
  - ✅ Active tab is highlighted
  - ✅ Content updates when switching tabs
  - ✅ No unnecessary API calls on tab switch
  - ✅ Browser navigation works correctly

**Test Case 6.2: Back to Project**
- **Steps:**
  1. Click "Back to Project" button

- **Expected Results:**
  - ✅ Navigates to project detail page
  - ✅ Correct project is displayed

---

### 7. Error Handling

**Test Case 7.1: Form Validation**
- **Steps:**
  1. Try to submit member form without selecting a user
  2. Try to submit meeting form without a title

- **Expected Results:**
  - ✅ Browser validation prevents submission
  - ✅ Required fields are marked with *
  - ✅ Helpful error messages appear

**Test Case 7.2: API Error Handling**
- **Steps:**
  1. Temporarily disable internet connection
  2. Try to load the page or submit a form

- **Expected Results:**
  - ✅ Error message displays
  - ✅ User is informed of the issue
  - ✅ Application doesn't crash

**Test Case 7.3: Project Not Found**
- **Steps:**
  1. Navigate to `/projects/invalid-uuid/structured/directing`

- **Expected Results:**
  - ✅ Error page displays
  - ✅ User can navigate back to projects

---

### 8. Permissions and Security

**Test Case 8.1: Row Level Security**
- **Steps:**
  1. Create board as User A
  2. Try to access/edit as User B

- **Expected Results:**
  - ✅ RLS policies are enforced
  - ✅ Users can only see boards for projects they have access to
  - ✅ Unauthorized actions are blocked

---

### 9. Performance

**Test Case 9.1: Load Time**
- **Steps:**
  1. Measure initial page load time
  2. Measure tab switch time

- **Expected Results:**
  - ✅ Initial load < 2 seconds
  - ✅ Tab switches feel instant
  - ✅ No unnecessary re-renders

**Test Case 9.2: Large Data Sets**
- **Steps:**
  1. Create 10+ board members
  2. Create 20+ meetings
  3. Check rendering performance

- **Expected Results:**
  - ✅ Lists render smoothly
  - ✅ No lag when scrolling
  - ✅ Forms remain responsive

---

## SQL Verification Queries

### Check Board Creation
```sql
SELECT * FROM project_boards WHERE project_id = 'your-project-id' AND is_deleted = false;
```

### Check Board Members
```sql
SELECT bm.*, u.full_name, u.email
FROM board_members bm
JOIN users u ON bm.user_id = u.id
WHERE bm.board_id = 'your-board-id' AND bm.is_deleted = false;
```

### Check Board Meetings
```sql
SELECT * FROM board_meetings
WHERE board_id = 'your-board-id' AND is_deleted = false
ORDER BY meeting_date DESC;
```

### Check Soft Deletes
```sql
SELECT * FROM board_members WHERE is_deleted = true;
SELECT * FROM board_meetings WHERE is_deleted = true;
```

---

## Known Issues / Limitations

1. **Decisions Tab**: Decision form not yet implemented (placeholder)
2. **Attendance Tracking**: Meeting attendance must be added manually after meeting creation
3. **Email Notifications**: Not yet implemented for meeting invites
4. **File Attachments**: Not yet supported for meeting agendas/minutes

---

## Next Steps for Full Testing

1. Execute `v36_phase5_menu_items.sql` to test menu integration
2. Test with real user data and permissions
3. Test on mobile devices (responsive design)
4. Test with screen readers (accessibility)
5. Load test with multiple concurrent users

---

## Bug Reporting

When reporting bugs, please include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/console errors
- User role and permissions

---

**Testing Checklist:**
- [ ] Project board creation
- [ ] Board member CRUD operations
- [ ] Board meeting CRUD operations
- [ ] Dashboard statistics accuracy
- [ ] Dark mode support
- [ ] Tab navigation
- [ ] Form validation
- [ ] Error handling
- [ ] SQL data verification
- [ ] Performance under load

---

Last Updated: 2025-01-17
Module Version: 1.0
