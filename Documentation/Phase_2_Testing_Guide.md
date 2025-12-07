# Phase 2 Testing Guide
**AI Event Engine Quality Testing**

**Version:** 1.0  
**Date:** 2025-01-21  
**Status:** Ready for Testing

---

## Overview

This guide provides comprehensive testing procedures for validating AI event quality, difficulty calibration, and collecting user feedback for the Simulator Phase 2 features.

---

## Table of Contents

1. [AI Event Quality Testing](#ai-event-quality-testing)
2. [Difficulty Calibration](#difficulty-calibration)
3. [User Testing Program](#user-testing-program)
4. [Feedback Collection](#feedback-collection)
5. [Quality Metrics](#quality-metrics)

---

## AI Event Quality Testing

### Prerequisites

1. OpenAI API key configured in `.env`
2. Access to simulator database
3. Test user accounts created
4. Sample scenarios available

### Test Procedure

#### Step 1: Generate Test Events

**Objective:** Validate AI event generation quality across different scenarios and difficulty levels.

**Process:**

1. **Create Test Simulation Runs**
   ```sql
   -- Create test runs for each scenario type
   INSERT INTO sim.simulation_runs (user_id, scenario_id, status)
   SELECT 
     (SELECT id FROM auth.users LIMIT 1),
     id,
     'in_progress'
   FROM sim.scenarios
   WHERE difficulty_level = 'intermediate'
   LIMIT 20;
   ```

2. **Generate Events via API**
   - Use the simulator interface or API to trigger events
   - Generate 5-10 events per scenario
   - Document each event generated

3. **Collect Event Data**
   ```sql
   -- Query generated events
   SELECT 
     e.id,
     e.event_type,
     e.event_category,
     e.event_name,
     e.event_description,
     e.severity,
     e.event_data->>'isAIGenerated' as is_ai_generated,
     s.name as scenario_name,
     s.difficulty_level
   FROM sim.ai_events e
   JOIN sim.simulation_runs r ON e.run_id = r.id
   JOIN sim.scenarios s ON r.scenario_id = s.id
   WHERE e.triggered_at > NOW() - INTERVAL '7 days'
   ORDER BY e.triggered_at DESC;
   ```

#### Step 2: Quality Assessment Criteria

**Rate each event on a 1-5 scale:**

1. **Realism (1-5)**
   - Does the event feel realistic for the scenario?
   - Would this happen in a real project?
   - Score: 1=Unrealistic, 5=Highly Realistic

2. **Relevance (1-5)**
   - Is the event relevant to the current phase?
   - Does it fit the scenario context?
   - Score: 1=Irrelevant, 5=Highly Relevant

3. **Challenge Level (1-5)**
   - Is the difficulty appropriate?
   - Does it match the scenario difficulty?
   - Score: 1=Too Easy/Hard, 5=Perfectly Balanced

4. **Educational Value (1-5)**
   - Does it teach PM principles?
   - Is the feedback helpful?
   - Score: 1=No Learning, 5=Highly Educational

5. **Option Quality (1-5)**
   - Are all options plausible?
   - Is the optimal choice clear but not obvious?
   - Score: 1=Poor Options, 5=Excellent Options

**Target Scores:**
- Average across all criteria: **4.0+**
- Minimum acceptable: **3.5**
- Individual criteria: **3.0+**

#### Step 3: Automated Quality Checks

**Create Quality Check Script:**

```sql
-- Quality check: Events should have 4 options
SELECT 
  e.id,
  e.event_name,
  jsonb_array_length(e.event_data->'options') as option_count,
  CASE 
    WHEN jsonb_array_length(e.event_data->'options') = 4 THEN 'PASS'
    ELSE 'FAIL'
  END as quality_check
FROM sim.ai_events e
WHERE e.event_data->>'isAIGenerated' = 'true'
  AND e.triggered_at > NOW() - INTERVAL '7 days';
```

**Quality Checks:**
- ✅ All events have exactly 4 options
- ✅ Each option has feedback text
- ✅ Each option has impact scores
- ✅ One option marked as optimal
- ✅ Event has NPC or description
- ✅ Severity matches difficulty level

#### Step 4: Comparison Testing

**Template vs AI Events:**

1. Generate 10 template-based events
2. Generate 10 AI-based events
3. Compare quality scores
4. Document differences

**Expected Results:**
- AI events should score 0.5+ points higher on average
- AI events should have more variety
- AI events should be more contextually relevant

---

## Difficulty Calibration

### Calibration Process

#### Step 1: Collect Performance Data

**Query user performance by difficulty:**

```sql
-- Performance by difficulty level
SELECT 
  s.difficulty_level,
  COUNT(DISTINCT r.id) as total_runs,
  COUNT(DISTINCT r.user_id) as unique_users,
  AVG(r.total_score::numeric / NULLIF(r.max_possible_score, 0) * 100) as avg_score_percentage,
  AVG(r.time_spent_minutes) as avg_time_minutes,
  COUNT(DISTINCT CASE WHEN e.is_optimal = true THEN e.id END) as optimal_responses,
  COUNT(DISTINCT e.id) as total_responses,
  ROUND(
    COUNT(DISTINCT CASE WHEN e.is_optimal = true THEN e.id END)::numeric / 
    NULLIF(COUNT(DISTINCT e.id), 0) * 100, 
    2
  ) as optimal_rate_percentage
FROM sim.scenarios s
JOIN sim.simulation_runs r ON s.id = r.scenario_id
LEFT JOIN sim.ai_events e ON r.id = e.run_id
WHERE r.status = 'completed'
  AND r.completed_at > NOW() - INTERVAL '30 days'
GROUP BY s.difficulty_level
ORDER BY 
  CASE s.difficulty_level
    WHEN 'beginner' THEN 1
    WHEN 'intermediate' THEN 2
    WHEN 'advanced' THEN 3
    WHEN 'expert' THEN 4
  END;
```

#### Step 2: Define Target Metrics

**Target Performance by Difficulty:**

| Difficulty | Target Avg Score | Target Optimal Rate | Target Completion Time |
|------------|------------------|---------------------|------------------------|
| Beginner   | 75-85%          | 60-70%              | 30-45 min              |
| Intermediate | 65-75%          | 50-60%              | 45-60 min              |
| Advanced   | 55-65%          | 40-50%              | 60-90 min              |
| Expert     | 45-55%          | 30-40%              | 90-120 min             |

#### Step 3: Adjust Difficulty Modifiers

**If scores are too high:**
- Increase event severity
- Add more challenging options
- Reduce optimal option scores
- Increase negative impacts

**If scores are too low:**
- Decrease event severity
- Add easier options
- Increase optimal option scores
- Reduce negative impacts

**Update Difficulty Modifiers:**

```sql
-- Adjust scenario difficulty modifiers
UPDATE sim.scenarios
SET scenario_data = jsonb_set(
  scenario_data,
  '{difficulty_modifier}',
  '1.1'::jsonb  -- Increase difficulty by 10%
)
WHERE difficulty_level = 'intermediate'
  AND average_score > 80;  -- If too easy
```

#### Step 4: Event-Specific Calibration

**Identify problematic events:**

```sql
-- Events with consistently low scores
SELECT 
  e.event_type,
  e.event_category,
  COUNT(*) as occurrences,
  AVG(e.response_score) as avg_score,
  COUNT(CASE WHEN e.is_optimal = true THEN 1 END) as optimal_count,
  COUNT(*) as total_count,
  ROUND(
    COUNT(CASE WHEN e.is_optimal = true THEN 1 END)::numeric / 
    COUNT(*) * 100, 
    2
  ) as optimal_rate
FROM sim.ai_events e
WHERE e.triggered_at > NOW() - INTERVAL '30 days'
  AND e.user_response IS NOT NULL
GROUP BY e.event_type, e.event_category
HAVING AVG(e.response_score) < 50  -- Low average score
   OR COUNT(CASE WHEN e.is_optimal = true THEN 1 END)::numeric / COUNT(*) < 0.3  -- Low optimal rate
ORDER BY avg_score ASC;
```

**Action Items:**
- Review low-performing events
- Adjust option difficulty
- Update feedback quality
- Re-test after adjustments

---

## User Testing Program

### Beta User Recruitment

**Target Users:**
- 50-100 beta testers
- Mix of experience levels
- Various industries
- Different roles (PM, Team Lead, etc.)

**Recruitment Channels:**
- Internal team members
- PM communities
- LinkedIn groups
- Educational institutions

### Testing Phases

#### Phase 1: Internal Testing (Week 1)
- **Participants:** 5-10 internal team members
- **Focus:** Bug identification, basic functionality
- **Duration:** 1 week
- **Deliverables:** Bug report, initial feedback

#### Phase 2: Closed Beta (Weeks 2-3)
- **Participants:** 20-30 selected users
- **Focus:** Feature completeness, user experience
- **Duration:** 2 weeks
- **Deliverables:** Feature feedback, UX improvements

#### Phase 3: Open Beta (Weeks 4-6)
- **Participants:** 50-100 users
- **Focus:** Scale testing, performance, quality metrics
- **Duration:** 3 weeks
- **Deliverables:** Performance data, quality metrics

### Testing Tasks

**For Each Beta User:**

1. **Complete Skill Assessment**
   - Verify assessment accuracy
   - Check role recommendations

2. **Complete 3 Beginner Scenarios**
   - Document experience
   - Rate event quality
   - Note any issues

3. **Complete 2 Intermediate Scenarios**
   - Compare to beginner experience
   - Validate difficulty progression
   - Test AI event quality

4. **Provide Feedback**
   - Complete feedback survey
   - Rate overall experience
   - Suggest improvements

---

## Feedback Collection

### Feedback Survey

**Create feedback collection form:**

```sql
-- Feedback table (if not exists)
CREATE TABLE IF NOT EXISTS sim.user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  simulation_run_id UUID REFERENCES sim.simulation_runs(id),
  scenario_id UUID REFERENCES sim.scenarios(id),
  
  -- Event Quality Ratings
  event_realism_rating INTEGER CHECK (event_realism_rating BETWEEN 1 AND 5),
  event_relevance_rating INTEGER CHECK (event_relevance_rating BETWEEN 1 AND 5),
  event_challenge_rating INTEGER CHECK (event_challenge_rating BETWEEN 1 AND 5),
  event_educational_rating INTEGER CHECK (event_educational_rating BETWEEN 1 AND 5),
  option_quality_rating INTEGER CHECK (option_quality_rating BETWEEN 1 AND 5),
  
  -- Overall Experience
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  difficulty_appropriate BOOLEAN,
  feedback_helpful BOOLEAN,
  
  -- Open Feedback
  positive_feedback TEXT,
  negative_feedback TEXT,
  suggestions TEXT,
  
  -- Metadata
  feedback_type VARCHAR(50), -- event, scenario, overall
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Feedback Queries

**Average Ratings:**

```sql
SELECT 
  AVG(event_realism_rating) as avg_realism,
  AVG(event_relevance_rating) as avg_relevance,
  AVG(event_challenge_rating) as avg_challenge,
  AVG(event_educational_rating) as avg_educational,
  AVG(option_quality_rating) as avg_option_quality,
  AVG(overall_rating) as avg_overall,
  COUNT(*) as total_responses
FROM sim.user_feedback
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Feedback by Scenario:**

```sql
SELECT 
  s.name as scenario_name,
  s.difficulty_level,
  AVG(f.overall_rating) as avg_rating,
  COUNT(*) as feedback_count,
  COUNT(CASE WHEN f.would_recommend = true THEN 1 END) as recommend_count
FROM sim.user_feedback f
JOIN sim.scenarios s ON f.scenario_id = s.id
GROUP BY s.id, s.name, s.difficulty_level
ORDER BY avg_rating DESC;
```

---

## Quality Metrics

### Key Performance Indicators

**Event Quality KPIs:**
- Average realism rating: **≥ 4.0**
- Average relevance rating: **≥ 4.0**
- Average educational rating: **≥ 4.0**
- Option quality rating: **≥ 4.0**

**Difficulty Calibration KPIs:**
- Beginner avg score: **75-85%**
- Intermediate avg score: **65-75%**
- Advanced avg score: **55-65%**
- Expert avg score: **45-55%**

**User Satisfaction KPIs:**
- Overall rating: **≥ 4.0**
- Recommendation rate: **≥ 70%**
- Difficulty appropriate: **≥ 80%**
- Feedback helpful: **≥ 80%**

### Reporting Dashboard

**Create quality dashboard query:**

```sql
-- Quality Dashboard Data
WITH event_stats AS (
  SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_data->>'isAIGenerated' = 'true' THEN 1 END) as ai_events,
    AVG(response_score) as avg_score
  FROM sim.ai_events
  WHERE triggered_at > NOW() - INTERVAL '30 days'
),
feedback_stats AS (
  SELECT 
    AVG(overall_rating) as avg_rating,
    COUNT(*) as total_feedback,
    COUNT(CASE WHEN would_recommend = true THEN 1 END) as recommend_count
  FROM sim.user_feedback
  WHERE created_at > NOW() - INTERVAL '30 days'
),
performance_stats AS (
  SELECT 
    s.difficulty_level,
    AVG(r.total_score::numeric / NULLIF(r.max_possible_score, 0) * 100) as avg_score
  FROM sim.simulation_runs r
  JOIN sim.scenarios s ON r.scenario_id = s.id
  WHERE r.status = 'completed'
    AND r.completed_at > NOW() - INTERVAL '30 days'
  GROUP BY s.difficulty_level
)
SELECT 
  es.total_events,
  es.ai_events,
  ROUND(es.ai_events::numeric / NULLIF(es.total_events, 0) * 100, 2) as ai_percentage,
  ROUND(es.avg_score, 2) as avg_event_score,
  ROUND(fs.avg_rating, 2) as avg_user_rating,
  fs.total_feedback,
  ROUND(fs.recommend_count::numeric / NULLIF(fs.total_feedback, 0) * 100, 2) as recommend_rate
FROM event_stats es
CROSS JOIN feedback_stats fs;
```

---

## Testing Checklist

### Pre-Testing
- [ ] OpenAI API key configured
- [ ] Test user accounts created
- [ ] Sample scenarios available
- [ ] Database access verified
- [ ] Feedback collection system ready

### During Testing
- [ ] Generate 100+ AI events
- [ ] Collect quality ratings for each event
- [ ] Track user performance metrics
- [ ] Collect user feedback
- [ ] Monitor API costs and performance

### Post-Testing
- [ ] Analyze quality metrics
- [ ] Calibrate difficulty levels
- [ ] Adjust problematic events
- [ ] Generate quality report
- [ ] Plan improvements

---

## Next Steps

1. **Run Initial Tests** - Generate and rate 50 events
2. **Collect Beta Users** - Recruit 20-30 testers
3. **Run Beta Program** - 2-3 weeks of testing
4. **Analyze Results** - Review all metrics
5. **Calibrate System** - Adjust based on data
6. **Re-test** - Validate improvements

---

**Last Updated:** 2025-01-21  
**Status:** Ready for Testing

