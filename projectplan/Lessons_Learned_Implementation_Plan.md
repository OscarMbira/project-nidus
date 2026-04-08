# Lessons Learned Implementation Plan

## Overview
Implementation of comprehensive Lessons Learned (Lessons Log) module based on structured project management methodology. This system enables organizations to capture, store, search, and apply lessons from previous projects to improve future project outcomes and avoid repeating mistakes.

## Key Characteristics

- **Continuous Capture** - Lessons recorded throughout project lifecycle, not just at closure
- **Organizational Learning** - Share knowledge across projects, programmes, and corporate
- **Searchable Repository** - Find relevant lessons from similar projects
- **Actionable Insights** - Track which lessons were applied and their effectiveness
- **Quality Controlled** - Approval process for sharing lessons organization-wide
- **Access Controlled** - Secure storage with role-based permissions
- **Status Tracking** - Monitor whether action has been taken on lessons

## Relationship Design: One-to-Many (Project → Lessons)

**Approach**: Each project can have **multiple lessons learned** captured throughout its lifecycle. Lessons can also exist at organizational/programme level (not tied to specific project).

**Key Principles**:
- Multiple lessons per project
- Lessons can be project-specific OR corporate/programme-wide
- Each lesson uniquely identified
- Lessons can be applied to multiple future projects
- Full audit trail of lesson application and effectiveness

## Database Schema Design

### Main Tables

#### 1. `lessons_learned` (Main Lessons Table)
- `id` (UUID, PK)
- `lesson_reference` (VARCHAR, UNIQUE) - Unique identifier (e.g., LESSON-2026-001)
- `project_id` (UUID, FK to projects, NULLABLE) - Project where lesson originated (NULL for corporate lessons)
- `programme_id` (UUID, FK to programmes, NULLABLE) - Programme context if applicable
- `organisation_id` (UUID, FK to organisations) - Organisation owning the lesson
- `lesson_type` (ENUM: 'project', 'corporate', 'programme', 'both_project_and_corporate')
- `lesson_title` (VARCHAR) - Short descriptive title
- `lesson_category` (ENUM: 'success', 'challenge', 'risk_realized', 'opportunity_realized', 'process_improvement', 'technical', 'team', 'stakeholder', 'communication', 'planning', 'quality', 'procurement', 'other')
- `event_description` (TEXT) - What happened
- `effect_description` (TEXT) - Impact (positive/negative)
- `financial_impact` (DECIMAL, NULLABLE) - Monetary impact if quantifiable
- `impact_type` (ENUM: 'positive', 'negative', 'neutral')
- `causes_triggers` (TEXT) - Root causes or triggers
- `early_warning_indicators` (TEXT, NULLABLE) - Warning signs that preceded the event
- `recommendations` (TEXT) - What should be done differently
- `was_identified_as_risk` (BOOLEAN) - Was this previously in the risk register?
- `related_risk_id` (UUID, FK to risks table, NULLABLE)
- `product_reference` (VARCHAR, NULLABLE) - Which product/deliverable this relates to
- `project_phase` (VARCHAR, NULLABLE) - When in project lifecycle this occurred
- `priority` (ENUM: 'low', 'medium', 'high', 'critical')
- `severity` (ENUM: 'low', 'medium', 'high', 'critical') - Severity of impact
- `applicability` (TEXT) - Types of projects/scenarios where this lesson applies
- `tags` (JSONB) - Keywords for searching (e.g., ["agile", "vendor-management", "scope-creep"])
- `date_logged` (DATE)
- `logged_by` (UUID, FK to users)
- `status` (ENUM: 'draft', 'pending_review', 'approved', 'rejected', 'archived')
- `action_taken` (TEXT, NULLABLE) - What action was taken in response
- `action_date` (DATE, NULLABLE)
- `action_owner` (UUID, FK to users, NULLABLE)
- `is_actionable` (BOOLEAN) - Can this be applied to future projects?
- `is_approved_for_sharing` (BOOLEAN) - PMO approved for organization-wide sharing
- `approved_by` (UUID, FK to users, NULLABLE)
- `approved_date` (DATE, NULLABLE)
- `document_ref` (VARCHAR, NULLABLE) - External document reference
- `version_number` (VARCHAR, default '1.0')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `lesson_reference` (UNIQUE)
- `project_id`, `programme_id`, `organisation_id`
- `lesson_type`, `lesson_category`, `priority`
- `status`, `is_approved_for_sharing`
- `tags` (GIN index for JSONB searching)

#### 2. `lesson_revision_history`
- `id` (UUID, PK)
- `lesson_id` (UUID, FK to lessons_learned)
- `revision_date` (DATE)
- `previous_revision_date` (DATE, NULLABLE)
- `summary_of_changes` (TEXT)
- `changes_marked` (TEXT, NULLABLE)
- `revised_by` (UUID, FK to users)
- `created_at` (TIMESTAMPTZ)

#### 3. `lesson_approvals`
- `id` (UUID, PK)
- `lesson_id` (UUID, FK to lessons_learned)
- `approver_id` (UUID, FK to users)
- `approver_name` (VARCHAR)
- `approver_title` (VARCHAR)
- `approval_date` (DATE)
- `approval_status` (ENUM: 'pending', 'approved', 'rejected')
- `signature_data` (TEXT, NULLABLE) - Digital signature
- `comments` (TEXT, NULLABLE)
- `version_approved` (VARCHAR)
- `created_at` (TIMESTAMPTZ)

#### 4. `lesson_distribution`
- `id` (UUID, PK)
- `lesson_id` (UUID, FK to lessons_learned)
- `recipient_id` (UUID, FK to users)
- `recipient_name` (VARCHAR)
- `recipient_title` (VARCHAR)
- `date_of_issue` (DATE)
- `version_distributed` (VARCHAR)
- `distribution_method` (ENUM: 'email', 'portal', 'training', 'workshop', 'other')
- `acknowledgement_status` (ENUM: 'sent', 'read', 'acknowledged')
- `created_at` (TIMESTAMPTZ)

#### 5. `project_lessons_applied`
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects) - Project applying the lesson
- `lesson_id` (UUID, FK to lessons_learned) - Lesson from previous project
- `applied_during_phase` (VARCHAR) - When was it applied (initiation, planning, execution, etc.)
- `how_applied` (TEXT) - Description of how lesson was applied
- `preventive_action` (TEXT, NULLABLE) - If lesson was negative, what was done to prevent it
- `implementation_notes` (TEXT)
- `applied_date` (DATE)
- `applied_by` (UUID, FK to users)
- `effectiveness_rating` (ENUM: 'very_effective', 'effective', 'somewhat_effective', 'not_effective', 'too_early_to_tell', 'not_rated')
- `effectiveness_notes` (TEXT, NULLABLE)
- `effectiveness_assessed_date` (DATE, NULLABLE)
- `effectiveness_assessed_by` (UUID, FK to users, NULLABLE)
- `would_recommend` (BOOLEAN, NULLABLE) - Would you recommend this lesson to others?
- `cost_impact` (DECIMAL, NULLABLE) - Cost savings or costs incurred
- `time_impact` (DECIMAL, NULLABLE) - Time saved or lost (in days)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 6. `lesson_attachments`
- `id` (UUID, PK)
- `lesson_id` (UUID, FK to lessons_learned)
- `attachment_type` (ENUM: 'document', 'image', 'spreadsheet', 'presentation', 'video', 'link', 'other')
- `file_name` (VARCHAR)
- `file_path` (VARCHAR, NULLABLE) - Internal storage path
- `file_url` (VARCHAR, NULLABLE) - External URL
- `file_size` (BIGINT, NULLABLE) - In bytes
- `mime_type` (VARCHAR, NULLABLE)
- `description` (TEXT, NULLABLE)
- `uploaded_by` (UUID, FK to users)
- `created_at` (TIMESTAMPTZ)

#### 7. `lesson_comments`
- `id` (UUID, PK)
- `lesson_id` (UUID, FK to lessons_learned)
- `comment_text` (TEXT)
- `comment_type` (ENUM: 'question', 'clarification', 'additional_insight', 'correction', 'support', 'other')
- `parent_comment_id` (UUID, FK to lesson_comments, NULLABLE) - For threaded discussions
- `commented_by` (UUID, FK to users)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 8. `lesson_search_history`
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `search_query` (TEXT)
- `filters_applied` (JSONB) - Search filters used
- `results_count` (INTEGER)
- `lessons_viewed` (JSONB) - Array of lesson IDs viewed
- `search_date` (TIMESTAMPTZ)

### Database Functions

#### `generate_lesson_reference()`
Generates unique lesson reference number.
```sql
RETURNS VARCHAR -- Returns reference like 'LESSON-2026-001'
```

#### `search_lessons(p_search_params JSONB)`
Advanced search function for finding relevant lessons.
```sql
RETURNS TABLE (
  lesson_id UUID,
  lesson_reference VARCHAR,
  lesson_title VARCHAR,
  relevance_score DECIMAL,
  ...
)
```
Searches across:
- Lesson title, description, recommendations
- Tags and categories
- Project type, phase, applicability
- Priority and severity

#### `get_similar_lessons(p_project_id UUID, p_limit INTEGER)`
Finds lessons from similar projects based on project attributes.
```sql
RETURNS TABLE (lesson_id UUID, similarity_score DECIMAL, ...)
```
Uses project attributes:
- Project type, size, industry
- Technologies used
- Team size
- Delivery approach

#### `get_effectiveness_statistics(p_lesson_id UUID)`
Calculates effectiveness statistics for a lesson across all applications.
```sql
RETURNS TABLE (
  total_applications INTEGER,
  avg_effectiveness_rating DECIMAL,
  total_cost_savings DECIMAL,
  total_time_savings DECIMAL,
  recommendation_percentage DECIMAL
)
```

#### `get_trending_lessons(p_organisation_id UUID, p_period VARCHAR)`
Returns most frequently accessed/applied lessons in a period.
```sql
RETURNS TABLE (lesson_id UUID, access_count INTEGER, application_count INTEGER, ...)
```

#### `suggest_lessons_for_project(p_project_id UUID)`
AI-powered suggestion of relevant lessons for a project.
```sql
RETURNS TABLE (lesson_id UUID, relevance_score DECIMAL, reason TEXT, ...)
```

## Implementation Phases

### Phase 1: Database Setup
- [ ] Create database migration file (v161_lessons_learned_tables.sql)
- [ ] Define all 8 tables with proper RLS policies
- [ ] Create UNIQUE index on lesson_reference
- [ ] Create GIN index on tags JSONB field for full-text search
- [ ] Create indexes for performance:
  * lesson_id on all child tables
  * project_id, programme_id, organisation_id on lessons_learned
  * status, priority, lesson_category on lessons_learned
  * tags, applicability for search optimization
- [ ] Add foreign key constraints with ON DELETE CASCADE for child tables
- [ ] Register all 8 tables in database_tables registry
- [ ] Create database functions:
  * generate_lesson_reference()
  * search_lessons(search_params)
  * get_similar_lessons(project_id, limit)
  * get_effectiveness_statistics(lesson_id)
  * get_trending_lessons(organisation_id, period)
  * suggest_lessons_for_project(project_id)
- [ ] Create triggers:
  * Auto-generate lesson_reference on INSERT
  * Audit trail trigger for all tables
  * Update search index on lesson changes
  * Notification trigger when lesson is approved

### Phase 2: Service Layer
- [ ] Create `lessonsLearnedService.js` with CRUD operations:
  * createLesson(lessonData)
  * getLessonById(lessonId)
  * getLessonsByProject(projectId)
  * getLessonsByOrganisation(organisationId)
  * updateLesson(lessonId, updates)
  * deleteLesson(lessonId)
  * archiveLesson(lessonId)
- [ ] Create `lessonSearchService.js` for advanced search:
  * searchLessons(searchParams, filters)
  * getSimilarLessons(projectId)
  * suggestLessonsForProject(projectId)
  * getTrendingLessons(organisationId, period)
  * searchByTags(tags)
  * searchByCategory(category)
- [ ] Create `lessonApplicationService.js` for tracking application:
  * applyLessonToProject(projectId, lessonId, applicationData)
  * trackEffectiveness(applicationId, effectivenessData)
  * getApplicationHistory(lessonId)
  * getEffectivenessStatistics(lessonId)
- [ ] Create `lessonApprovalService.js` for approval workflow:
  * submitForApproval(lessonId, approverIds)
  * approveLesson(approvalId, approverId, comments)
  * rejectLesson(approvalId, approverId, reason)
  * getApprovalStatus(lessonId)
- [ ] Implement validation functions
- [ ] Add error handling and logging

### Phase 3: UI Components - Form Sections
- [ ] Create `LessonForm.jsx` - Main form container
- [ ] Create `LessonMetadataSection.jsx` - Reference, type, category, priority
- [ ] Create `EventDescriptionSection.jsx` - What happened, when, where
- [ ] Create `EffectAnalysisSection.jsx` - Impact (positive/negative), financial impact
- [ ] Create `CauseAnalysisSection.jsx` - Root causes, triggers, early warnings
- [ ] Create `RecommendationsSection.jsx` - What to do differently, actionable advice
- [ ] Create `ApplicabilitySection.jsx` - Where this lesson applies, tags, keywords
- [ ] Create `RiskLinkageSection.jsx` - Link to risk register if applicable

### Phase 4: UI Components - Supporting Components
- [ ] Create `LessonCard.jsx` - Display lesson summary in list/grid view
- [ ] Create `LessonDetailView.jsx` - Full lesson details display
- [ ] Create `LessonSearchBar.jsx` - Advanced search with filters
- [ ] Create `LessonFilters.jsx` - Filter by category, type, priority, tags
- [ ] Create `LessonTagInput.jsx` - Tag management with autocomplete
- [ ] Create `LessonApprovalWorkflow.jsx` - Approval process display
- [ ] Create `LessonApplicationTracker.jsx` - Track where lesson was applied
- [ ] Create `LessonEffectivenessRating.jsx` - Rate effectiveness of applied lesson
- [ ] Create `SimilarLessonsWidget.jsx` - Show similar lessons sidebar
- [ ] Create `LessonTimeline.jsx` - Visual timeline of lesson history
- [ ] Create `LessonStatistics.jsx` - Statistics dashboard for a lesson
- [ ] Create `LessonComments.jsx` - Threaded comment discussion
- [ ] Create `LessonAttachments.jsx` - File attachments management
- [ ] Create `LessonSuggestions.jsx` - AI-powered lesson suggestions for project
- [ ] Create `QuickLessonCapture.jsx` - Quick capture modal during project execution

### Phase 5: Pages
- [ ] Create `LessonsRepository.jsx` - Main repository/library view
- [ ] Create `LessonCreate.jsx` - Create new lesson
- [ ] Create `LessonEdit.jsx` - Edit existing lesson
- [ ] Create `LessonView.jsx` - View lesson details
- [ ] Create `MyLessons.jsx` - Lessons I created/own
- [ ] Create `PendingApprovals.jsx` - Lessons awaiting my approval
- [ ] Create `AppliedLessons.jsx` - Lessons applied to current project
- [ ] Create `LessonsAnalytics.jsx` - Organization-wide analytics dashboard
- [ ] Create `LessonSearch.jsx` - Advanced search page

### Phase 6: Routing and Navigation
- [ ] Add routes to App.jsx:
  * /app/lessons - Repository home
  * /app/lessons/search - Advanced search
  * /app/lessons/create - Create new lesson
  * /app/lessons/:lessonId/view - View lesson
  * /app/lessons/:lessonId/edit - Edit lesson
  * /app/lessons/my-lessons - My lessons
  * /app/lessons/approvals - Pending approvals
  * /app/lessons/analytics - Analytics dashboard
  * /app/projects/:projectId/lessons - Project-specific lessons
  * /app/projects/:projectId/lessons/applied - Applied lessons
  * /app/projects/:projectId/lessons/suggested - Suggested lessons
- [ ] Create breadcrumb navigation
- [ ] Add menu items to PMO Admin sidebar:
  * "Lessons Learned"
  * "Lessons Repository"
  * "Pending Approvals"
  * "Lessons Analytics"
- [ ] Add menu items to Project Manager sidebar:
  * "Project Lessons"
  * "Applied Lessons"
  * "Suggested Lessons"
  * "Capture Lesson"
- [ ] Implement role-based access control

### Phase 7: Search and Discovery
- [ ] Implement full-text search across all lesson fields
- [ ] Implement tag-based search with autocomplete
- [ ] Implement category and filter-based search
- [ ] Implement similarity matching algorithm:
  * Compare project attributes (type, size, industry, technology)
  * Compare lesson tags and keywords
  * Calculate relevance score
- [ ] Implement AI-powered lesson suggestions:
  * Analyze project characteristics
  * Find lessons from similar past projects
  * Rank by relevance
  * Explain why each lesson is relevant
- [ ] Implement trending lessons calculation
- [ ] Implement search history tracking
- [ ] Create saved searches feature

### Phase 8: Application Tracking
- [ ] Implement "Apply Lesson to Project" workflow:
  * Select lesson from repository
  * Document how it will be applied
  * Assign owner for implementation
  * Set reminder to assess effectiveness
- [ ] Create effectiveness rating system:
  * Prompt after X days/weeks
  * Capture quantitative metrics (cost/time savings)
  * Capture qualitative feedback
  * Track recommendations
- [ ] Implement lesson impact dashboard:
  * Total lessons applied
  * Average effectiveness rating
  * Total cost/time savings
  * Most effective lessons
- [ ] Create lesson application reports

### Phase 9: Approval and Quality Control
- [ ] Implement approval workflow:
  * Submit lesson for review
  * PMO/Senior Manager reviews
  * Request changes or approve
  * Mark as "approved for sharing"
- [ ] Implement quality criteria validation:
  * Status indicates action taken
  * Lesson uniquely identified
  * Product/deliverable reference included
  * Update process defined
  * Access controlled
- [ ] Create approval dashboard for reviewers
- [ ] Implement notification system for approvals
- [ ] Create approval audit trail

### Phase 10: Integration Points
- [ ] Integrate with Project Mandate creation:
  * Show "Relevant Lessons" section
  * Suggest lessons from similar projects
  * Allow marking lessons as "reviewed"
- [ ] Integrate with Project Brief:
  * Include lessons reviewed in References section
  * Auto-populate from mandate
- [ ] Integrate with Project Initiation:
  * Checklist item: "Lessons from similar projects reviewed"
  * Link to lessons applied
- [ ] Integrate with Risk Management:
  * Link lessons to risks
  * Show "Was this previously a risk?" flag
  * Auto-suggest lessons when creating risks
- [ ] Integrate with Project Closure:
  * Prompt to capture lessons during closure
  * Closure checklist includes lesson capture
  * Generate closure lessons report
- [ ] Integrate with Retrospectives:
  * Capture lessons during sprint/phase retrospectives
  * Link to specific iterations/phases

### Phase 11: Analytics and Reporting
- [ ] Create lessons analytics dashboard:
  * Total lessons captured
  * Lessons by category
  * Lessons by project/programme
  * Approval rate
  * Application rate
  * Effectiveness statistics
- [ ] Create lessons impact reports:
  * Cost savings from applied lessons
  * Time savings from applied lessons
  * ROI of lessons program
- [ ] Create trending lessons reports:
  * Most accessed lessons
  * Most applied lessons
  * Highest rated lessons
- [ ] Create organizational learning reports:
  * Lessons capture rate by project
  * Common challenges across projects
  * Best practices emerging
- [ ] Create executive summary reports

### Phase 12: Testing
- [ ] Create unit tests for all services
- [ ] Create integration tests for CRUD operations
- [ ] Test search functionality:
  * Full-text search accuracy
  * Tag-based search
  * Filter combinations
  * Similarity matching algorithm
- [ ] Test lesson application workflow:
  * Apply lesson to project
  * Track effectiveness
  * Calculate statistics
- [ ] Test approval workflow end-to-end
- [ ] Test lesson suggestions algorithm
- [ ] Test analytics calculations
- [ ] Test export functionality
- [ ] Test role-based access control

### Phase 13: Documentation
- [ ] Create user guide for capturing lessons
- [ ] Create user guide for searching lessons
- [ ] Create user guide for applying lessons
- [ ] Create PMO guide for approving lessons
- [ ] Create best practices guide for writing effective lessons
- [ ] Create analytics user guide
- [ ] Document API endpoints
- [ ] Create video tutorials

## Technical Specifications

### Service Methods

#### lessonsLearnedService.js
```javascript
// CRUD Operations
- createLesson(lessonData)
- getLessonById(lessonId)
- getLessonsByProject(projectId)
- getLessonsByProgramme(programmeId)
- getLessonsByOrganisation(organisationId, filters)
- updateLesson(lessonId, updates)
- deleteLesson(lessonId)
- archiveLesson(lessonId)

// Attachments
- addAttachment(lessonId, attachmentData)
- removeAttachment(attachmentId)
- getAttachments(lessonId)

// Comments
- addComment(lessonId, commentData)
- replyToComment(commentId, replyData)
- getComments(lessonId)

// Versioning
- createRevision(lessonId, changesSummary)
- getRevisionHistory(lessonId)

// Status Management
- updateStatus(lessonId, newStatus)
- markActionTaken(lessonId, actionDetails)
```

#### lessonSearchService.js
```javascript
- searchLessons(searchQuery, filters) - Full-text and filtered search
- searchByTags(tags) - Tag-based search
- searchByCategory(category) - Category filtering
- getSimilarLessons(projectId, limit) - Find similar project lessons
- suggestLessonsForProject(projectId) - AI-powered suggestions
- getTrendingLessons(organisationId, period) - Most accessed/applied
- getRecentLessons(organisationId, limit) - Latest lessons
- advancedSearch(criteria) - Complex multi-criteria search
- saveSearch(userId, searchCriteria) - Save search for reuse
- getSavedSearches(userId) - Get user's saved searches
```

#### lessonApplicationService.js
```javascript
- applyLessonToProject(projectId, lessonId, applicationData)
- getAppliedLessons(projectId)
- getLessonApplications(lessonId) - Where has this lesson been applied?
- updateApplication(applicationId, updates)
- trackEffectiveness(applicationId, effectivenessData)
- getEffectivenessStatistics(lessonId)
- calculateImpact(lessonId) - Cost/time savings
- recommendLesson(applicationId, recommendation)
```

#### lessonApprovalService.js
```javascript
- submitForApproval(lessonId, approverIds)
- approveLesson(approvalId, approverId, comments)
- rejectLesson(approvalId, approverId, reason)
- requestChanges(approvalId, approverId, changes)
- getApprovalStatus(lessonId)
- getPendingApprovals(userId)
- sendApprovalNotifications(lessonId)
```

### Form Validation Rules

#### Required Fields (Draft)
- Lesson title (min 10 characters)
- Lesson type (project/corporate/programme/both)
- Event description (min 50 characters)
- Logged by (auto-populated)
- Date logged (auto-populated)

#### Required Fields (Approval Submission)
- All draft fields
- Lesson category
- Effect description (min 50 characters)
- Recommendations (min 100 characters)
- Priority
- Applicability statement
- At least 2 tags

#### Optional Fields
- Financial impact
- Causes/triggers
- Early warning indicators
- Risk linkage
- Product reference
- Attachments

### Quality Criteria Validation

Automated checks before approval:
1. ✓ Status indicates action taken (if applicable)
2. ✓ Lesson has unique identifier (lesson_reference)
3. ✓ Product/deliverable reference included (if project-specific)
4. ✓ Lesson type specified (project/corporate/both)
5. ✓ Recommendations are actionable
6. ✓ Applicability clearly stated
7. ✓ Proper categorization

### RLS Policies
- All users can view approved lessons in their organisation
- Users can create/edit their own lessons
- Users can view draft lessons for their projects
- PMO Admins can view all lessons (draft and approved)
- Only PMO Admins and designated approvers can approve lessons
- Lesson creators can edit until submitted for approval
- Approved lessons are read-only (new version required for changes)

## UI/UX Design Considerations

### Lesson Capture Moments
**During Project**:
- Ad-hoc capture via "Capture Lesson" button
- Prompted during milestone completion
- Prompted during phase gate reviews
- Prompted during retrospectives

**At Project Closure**:
- Closure checklist includes lesson capture
- Structured closure lesson template
- Interview guide for stakeholders

**Continuous**:
- Quick capture widget always accessible
- Mobile app for on-the-go capture

### Search Experience
**Simple Search**:
- Single search box
- Auto-suggest as user types
- Quick filters (category, type, priority)

**Advanced Search**:
- Multi-field search
- Boolean operators
- Date ranges
- Tag combinations
- Save search functionality

**Discovery**:
- "Lessons for You" personalized recommendations
- "Trending Now" most popular lessons
- "Similar to This Project" automatic suggestions
- "Recently Added" latest lessons

### Lesson Display
**List View**:
- Card-based layout
- Preview of event and recommendations
- Key metadata badges (category, priority, impact)
- Quick actions (view, apply, share)

**Detail View**:
- Full lesson content
- Related lessons sidebar
- Application history
- Effectiveness statistics
- Comments thread
- Attachments

### Application Workflow
1. Browse/search lessons
2. Click "Apply to My Project"
3. Describe how you'll apply it
4. Assign implementation owner
5. Set effectiveness review date
6. Track implementation
7. Rate effectiveness after application

### Theme Support
- Dark/light mode toggle
- Theme-aware charts and graphs
- Print-friendly styling
- Accessible color contrasts

### Mobile Responsiveness (PWA)
- Mobile-optimized search
- Quick capture from mobile
- Offline access to downloaded lessons
- Push notifications for lesson suggestions

## Success Criteria

### User Confirmation Messages
After each operation:
- Created: "Lesson [Reference] created successfully. Submit for approval to share organization-wide."
- Updated: "Lesson [Reference] updated successfully."
- Approved: "Lesson [Reference] approved and available in organization repository."
- Applied: "Lesson [Reference] applied to [Project Name]. Effectiveness review scheduled for [Date]."

### Metrics to Track
**Adoption Metrics**:
- % of projects capturing lessons
- Average lessons per project
- Lesson capture rate over time

**Quality Metrics**:
- Approval rate
- Time from capture to approval
- Lesson completeness score

**Impact Metrics**:
- Lessons applied per new project
- Effectiveness ratings
- Cost savings from applied lessons
- Time savings from applied lessons
- ROI of lessons program

**Engagement Metrics**:
- Search frequency
- Most searched categories
- Most applied lessons
- User ratings and recommendations

## Integration Points

### With Project Mandate
- Show "Relevant Lessons" during mandate creation
- "Lessons Reviewed" checkbox
- Link lessons in Associated Documents

### With Project Brief
- Include lessons in References section
- Auto-populate from mandate
- Show applied lessons summary

### With Risk Management
- Link lessons to risk register
- Show "Previously identified as risk?" flag
- Suggest lessons when creating new risks

### With Project Closure
- Closure checklist: "Capture lessons learned"
- Structured lesson capture template
- Generate closure lessons report

## Dependencies
- Existing projects table
- Programmes table
- Organisations table
- Users table
- Risks table (for linkage)
- Role-based access control system
- Notification system
- Email service integration
- Document storage service (for attachments)
- Search engine (PostgreSQL full-text search or Elasticsearch)

## Best Practices

### Writing Effective Lessons
**Template**:
- **What happened**: Clear description of the event
- **Why it happened**: Root cause analysis
- **Impact**: What was the effect (quantify if possible)
- **What to do**: Actionable recommendations
- **When to apply**: Context and applicability

**Good Example**:
```
Title: "Weekly stakeholder demos reduced scope creep by 40%"
Event: Implemented weekly 30-min demos for key stakeholders
Effect: Reduced change requests by 40%, improved satisfaction scores
Causes: Previously monthly demos led to misunderstandings accumulating
Recommendations: Schedule weekly demos from project start,
  keep to 30 minutes max, focus on working functionality
Applicability: All projects with external stakeholders,
  especially Agile/iterative projects
```

**Bad Example**:
```
Title: "Meetings are important"
Event: Had meetings
Effect: Good
Recommendations: Have more meetings
```

### Lesson Categorization Best Practices
- Use specific categories (not just "Other")
- Add 3-5 relevant tags minimum
- Include project type in applicability
- Specify project phase where relevant

### Approval Best Practices
- Review within 5 business days
- Provide constructive feedback if rejecting
- Check for duplicate lessons before approving
- Verify recommendations are actionable

## Future Enhancements (Post-MVP)
- AI-powered lesson analysis and clustering
- Automatic lesson extraction from project documents
- Integration with external knowledge bases
- Gamification (badges for lesson contributors)
- Lesson effectiveness prediction
- Natural language processing for better search
- Voice-to-text lesson capture
- Video lesson capture and storage
- Cross-organization lesson sharing (anonymized)
- Machine learning for auto-categorization
- Sentiment analysis on lessons

## Review Section
*To be completed after implementation*

### Changes Made
- [List of all changes]

### Challenges Encountered
- [Issues and resolutions]

### Testing Results
- [Test coverage and results]

### Performance Metrics
- [Load times, search performance]

### User Feedback
- [User adoption and satisfaction]

---

**Plan Created**: 2026-01-16
**Status**: Pending Approval
**Estimated Complexity**: Medium-High
**Estimated Tables**: 8
**Estimated Components**: ~30
**Priority**: HIGH
