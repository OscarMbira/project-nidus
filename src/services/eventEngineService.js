/**
 * AI Event Engine Service
 *
 * Handles dynamic event generation, triggering, and response evaluation
 * during simulations. Supports both template-based and AI-generated events.
 */

import { simDb } from './supabase/supabaseClient';
import { generateAIEvent, generateAIFeedback } from './openaiService';

// =============================================
// EVENT CATEGORIES & TYPES
// =============================================

export const EVENT_CATEGORIES = {
  STAKEHOLDER: 'stakeholder',
  RISK: 'risk',
  TEAM: 'team',
  RESOURCE: 'resource',
  SCOPE: 'scope',
  QUALITY: 'quality',
  COMMUNICATION: 'communication',
  SCHEDULE: 'schedule',
  BUDGET: 'budget',
};

export const EVENT_TYPES = {
  // Stakeholder Events
  STAKEHOLDER_REQUEST: 'stakeholder_request',
  STAKEHOLDER_COMPLAINT: 'stakeholder_complaint',
  STAKEHOLDER_ESCALATION: 'stakeholder_escalation',
  EXECUTIVE_INQUIRY: 'executive_inquiry',

  // Risk Events
  RISK_IDENTIFIED: 'risk_identified',
  RISK_MATERIALIZED: 'risk_materialized',
  RISK_MITIGATED: 'risk_mitigated',

  // Team Events
  TEAM_CONFLICT: 'team_conflict',
  TEAM_MEMBER_ABSENT: 'team_member_absent',
  TEAM_MORALE_LOW: 'team_morale_low',
  SKILL_GAP: 'skill_gap',

  // Resource Events
  RESOURCE_UNAVAILABLE: 'resource_unavailable',
  BUDGET_OVERRUN: 'budget_overrun',
  EQUIPMENT_FAILURE: 'equipment_failure',

  // Scope Events
  SCOPE_CREEP: 'scope_creep',
  REQUIREMENT_CHANGE: 'requirement_change',
  PRIORITY_SHIFT: 'priority_shift',

  // Quality Events
  DEFECT_FOUND: 'defect_found',
  QUALITY_CONCERN: 'quality_concern',
  COMPLIANCE_ISSUE: 'compliance_issue',

  // Communication Events
  MISCOMMUNICATION: 'miscommunication',
  MEETING_REQUEST: 'meeting_request',
  STATUS_UPDATE_NEEDED: 'status_update_needed',

  // Schedule Events
  DELAY_WARNING: 'delay_warning',
  DEPENDENCY_BLOCKED: 'dependency_blocked',
  DEADLINE_APPROACHING: 'deadline_approaching',
};

export const EVENT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// =============================================
// EVENT TEMPLATES
// =============================================

const EVENT_TEMPLATES = {
  [EVENT_TYPES.STAKEHOLDER_REQUEST]: {
    category: EVENT_CATEGORIES.STAKEHOLDER,
    templates: [
      {
        title: 'Feature Addition Request',
        description: 'The marketing director has requested a new feature be added to the current sprint.',
        npc: { name: 'Sarah Chen', role: 'Marketing Director', avatar: '/npcs/marketing-director.png' },
        options: [
          {
            text: 'Accept the request and add it to the current sprint',
            impact: { scope: 10, schedule: -15, stakeholder_satisfaction: 5 },
            feedback: 'Adding features mid-sprint disrupts team flow and risks deadline. Consider the impact on existing commitments.',
            score: 40,
            isOptimal: false,
          },
          {
            text: 'Document the request and add it to the product backlog for prioritization',
            impact: { scope: 0, schedule: 0, stakeholder_satisfaction: -5 },
            feedback: 'Good process discipline. The request is captured without disrupting current work. The slight stakeholder disappointment is manageable.',
            score: 90,
            isOptimal: true,
          },
          {
            text: 'Reject the request as out of scope',
            impact: { scope: 0, schedule: 0, stakeholder_satisfaction: -20 },
            feedback: 'While protecting scope, outright rejection damages relationships. Always capture requests for future consideration.',
            score: 50,
            isOptimal: false,
          },
          {
            text: 'Schedule a meeting to discuss the request and its priority',
            impact: { scope: 0, schedule: -5, stakeholder_satisfaction: 0 },
            feedback: 'Good approach to balance stakeholder needs with process. This shows respect while maintaining control.',
            score: 85,
            isOptimal: false,
          },
        ],
      },
    ],
  },

  [EVENT_TYPES.TEAM_CONFLICT]: {
    category: EVENT_CATEGORIES.TEAM,
    templates: [
      {
        title: 'Team Disagreement',
        description: 'Two senior developers are in heated disagreement about the technical approach for a critical component.',
        npc: { name: 'Team', role: 'Development Team', avatar: '/npcs/team.png' },
        options: [
          {
            text: 'Make the decision yourself to end the conflict quickly',
            impact: { team_morale: -10, quality: 5, schedule: 5 },
            feedback: 'Quick decisions can damage team ownership and morale. Technical decisions should involve the experts.',
            score: 45,
            isOptimal: false,
          },
          {
            text: 'Facilitate a technical discussion to evaluate both approaches objectively',
            impact: { team_morale: 5, quality: 10, schedule: -5 },
            feedback: 'Excellent leadership! Facilitating constructive dialogue leads to better solutions and stronger team dynamics.',
            score: 95,
            isOptimal: true,
          },
          {
            text: 'Ask them to work it out themselves',
            impact: { team_morale: -15, quality: -5, schedule: -10 },
            feedback: 'Unresolved conflicts escalate and affect team productivity. Leaders should help facilitate resolution.',
            score: 30,
            isOptimal: false,
          },
          {
            text: 'Escalate to the technical lead for a decision',
            impact: { team_morale: -5, quality: 5, schedule: 0 },
            feedback: 'Escalation is appropriate for complex technical decisions, but try facilitation first.',
            score: 65,
            isOptimal: false,
          },
        ],
      },
    ],
  },

  [EVENT_TYPES.RISK_MATERIALIZED]: {
    category: EVENT_CATEGORIES.RISK,
    templates: [
      {
        title: 'Vendor Delivery Delay',
        description: 'Your key vendor has just informed you that a critical component will be delivered 2 weeks late.',
        npc: { name: 'Alex Rodriguez', role: 'Vendor Account Manager', avatar: '/npcs/vendor.png' },
        options: [
          {
            text: 'Immediately escalate to senior management',
            impact: { schedule: 0, budget: -5, stakeholder_satisfaction: -10 },
            feedback: 'Escalation without analysis or options wastes leadership time. Assess impact first.',
            score: 40,
            isOptimal: false,
          },
          {
            text: 'Analyze impact, identify mitigation options, then communicate with stakeholders',
            impact: { schedule: -5, budget: -5, stakeholder_satisfaction: 5 },
            feedback: 'Perfect approach! Analyzing impact and presenting options demonstrates strong PM skills.',
            score: 100,
            isOptimal: true,
          },
          {
            text: 'Accept the delay and adjust the project schedule',
            impact: { schedule: -20, budget: 0, stakeholder_satisfaction: -15 },
            feedback: 'Passive acceptance misses opportunities to mitigate. Always explore alternatives first.',
            score: 35,
            isOptimal: false,
          },
          {
            text: 'Demand the vendor meet the original deadline with penalties',
            impact: { schedule: -10, budget: 5, stakeholder_satisfaction: 0 },
            feedback: 'Contractual enforcement is one option, but may not be realistic and damages relationships.',
            score: 55,
            isOptimal: false,
          },
        ],
      },
    ],
  },

  [EVENT_TYPES.SCOPE_CREEP]: {
    category: EVENT_CATEGORIES.SCOPE,
    templates: [
      {
        title: 'Expanding Requirements',
        description: 'The product owner wants to add "just a few small enhancements" to a completed feature.',
        npc: { name: 'Michael Park', role: 'Product Owner', avatar: '/npcs/product-owner.png' },
        options: [
          {
            text: 'Accept the enhancements since they seem small',
            impact: { scope: 15, schedule: -10, budget: -5 },
            feedback: 'Small changes add up quickly. Always evaluate impact before accepting scope changes.',
            score: 35,
            isOptimal: false,
          },
          {
            text: 'Evaluate the impact and go through the change control process',
            impact: { scope: 5, schedule: -5, budget: -3 },
            feedback: 'Excellent! Using change control ensures all changes are properly evaluated and approved.',
            score: 100,
            isOptimal: true,
          },
          {
            text: 'Refuse any changes to completed features',
            impact: { scope: 0, schedule: 0, stakeholder_satisfaction: -15 },
            feedback: 'Rigid refusal damages relationships. Use change control to properly evaluate requests.',
            score: 45,
            isOptimal: false,
          },
          {
            text: 'Add them to the backlog for a future release',
            impact: { scope: 0, schedule: 0, stakeholder_satisfaction: -5 },
            feedback: 'Good alternative, but evaluate impact first. Some enhancements may be genuinely critical.',
            score: 75,
            isOptimal: false,
          },
        ],
      },
    ],
  },

  [EVENT_TYPES.BUDGET_OVERRUN]: {
    category: EVENT_CATEGORIES.RESOURCE,
    templates: [
      {
        title: 'Budget Warning',
        description: 'Your project is tracking 15% over budget with 60% of work completed.',
        npc: { name: 'Finance Team', role: 'Finance Department', avatar: '/npcs/finance.png' },
        options: [
          {
            text: 'Continue as planned and request additional budget at the end',
            impact: { budget: -20, stakeholder_satisfaction: -15, quality: 0 },
            feedback: 'Delaying bad news makes it worse. Proactive communication is always better.',
            score: 25,
            isOptimal: false,
          },
          {
            text: 'Analyze root causes and present options to stakeholders immediately',
            impact: { budget: -5, stakeholder_satisfaction: 5, quality: 0 },
            feedback: 'Excellent! Early warning with analysis and options is professional PM practice.',
            score: 100,
            isOptimal: true,
          },
          {
            text: 'Cut features to stay within budget',
            impact: { budget: 5, stakeholder_satisfaction: -10, scope: -15 },
            feedback: 'Scope reduction is one option but should be a stakeholder decision, not unilateral.',
            score: 50,
            isOptimal: false,
          },
          {
            text: 'Reduce quality testing to save costs',
            impact: { budget: 5, quality: -20, stakeholder_satisfaction: -5 },
            feedback: 'Never compromise quality to save budget. Technical debt costs more in the long run.',
            score: 20,
            isOptimal: false,
          },
        ],
      },
    ],
  },

  [EVENT_TYPES.DEADLINE_APPROACHING]: {
    category: EVENT_CATEGORIES.SCHEDULE,
    templates: [
      {
        title: 'Milestone at Risk',
        description: 'A key milestone is 3 days away but the team estimates 5 days of work remaining.',
        npc: { name: 'Project Sponsor', role: 'Executive Sponsor', avatar: '/npcs/sponsor.png' },
        options: [
          {
            text: 'Ask the team to work overtime to meet the deadline',
            impact: { schedule: 10, team_morale: -15, quality: -10 },
            feedback: 'Overtime helps short-term but burns out the team and increases defects.',
            score: 45,
            isOptimal: false,
          },
          {
            text: 'Negotiate scope reduction for this milestone',
            impact: { schedule: 5, scope: -10, stakeholder_satisfaction: -5 },
            feedback: 'Good option if done properly. Focus on delivering the highest value items first.',
            score: 75,
            isOptimal: false,
          },
          {
            text: 'Communicate the delay early with a recovery plan',
            impact: { schedule: -5, stakeholder_satisfaction: 5, quality: 5 },
            feedback: 'Excellent! Early communication with a plan maintains trust and allows stakeholders to adjust.',
            score: 95,
            isOptimal: true,
          },
          {
            text: 'Add more resources to accelerate delivery',
            impact: { schedule: 5, budget: -15, quality: -5 },
            feedback: 'Adding people late rarely helps (Brooks\' Law). Consider other options first.',
            score: 40,
            isOptimal: false,
          },
        ],
      },
    ],
  },
};

// =============================================
// EVENT GENERATION
// =============================================

/**
 * Generate a random event based on simulation context
 * Tries AI generation first, falls back to templates
 */
export const generateEvent = async (context = {}) => {
  const { phase, difficulty, previousEvents = [], projectHealth = {}, scenario, useAI = true } = context;

  // Try AI generation if enabled and API key is available
  if (useAI && import.meta.env.VITE_OPENAI_API_KEY) {
    try {
      const aiEvent = await generateAIEvent({
        scenario,
        phase,
        difficulty,
        previousEvents,
        projectHealth,
      });

      if (aiEvent) {
        return aiEvent;
      }
    } catch (error) {
      console.warn('AI event generation failed, falling back to templates:', error);
    }
  }

  // Fallback to template-based generation
  return generateTemplateEvent(context);
};

/**
 * Generate event from templates (fallback method)
 */
const generateTemplateEvent = (context = {}) => {
  const { phase, difficulty, previousEvents = [], projectHealth = {} } = context;

  // Get available event types based on context
  const availableTypes = Object.keys(EVENT_TEMPLATES);

  // Filter out recently used event types
  const recentTypes = previousEvents.slice(-3).map(e => e.type);
  const eligibleTypes = availableTypes.filter(t => !recentTypes.includes(t));

  // Select random event type
  const selectedType = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)] || availableTypes[0];

  // Get template for selected type
  const typeConfig = EVENT_TEMPLATES[selectedType];
  const template = typeConfig.templates[Math.floor(Math.random() * typeConfig.templates.length)];

  // Apply difficulty modifiers
  const severityMap = {
    beginner: EVENT_SEVERITY.LOW,
    intermediate: EVENT_SEVERITY.MEDIUM,
    advanced: EVENT_SEVERITY.HIGH,
    expert: EVENT_SEVERITY.CRITICAL,
  };

  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: selectedType,
    category: typeConfig.category,
    severity: severityMap[difficulty] || EVENT_SEVERITY.MEDIUM,
    ...template,
    timestamp: new Date().toISOString(),
    isAIGenerated: false,
  };
};

/**
 * Generate multiple events for a simulation phase
 * Supports async AI generation
 */
export const generatePhaseEvents = async (phaseConfig, difficulty = 'intermediate', scenario = null, useAI = true) => {
  const eventCount = {
    beginner: 2,
    intermediate: 3,
    advanced: 4,
    expert: 5,
  }[difficulty] || 3;

  const events = [];
  for (let i = 0; i < eventCount; i++) {
    const event = await generateEvent({
      scenario,
      phase: phaseConfig,
      difficulty,
      previousEvents: events,
      useAI,
    });
    events.push(event);
  }

  return events;
};

// =============================================
// EVENT EVALUATION
// =============================================

/**
 * Evaluate user's response to an event
 * Optionally enhances feedback with AI
 */
export const evaluateResponse = async (event, selectedOptionIndex, enhanceFeedback = false) => {
  const option = event.options[selectedOptionIndex];

  if (!option) {
    throw new Error('Invalid option selected');
  }

  let feedback = option.feedback;

  // Enhance feedback with AI if requested and available
  if (enhanceFeedback && import.meta.env.VITE_OPENAI_API_KEY) {
    try {
      const enhancedFeedback = await generateAIFeedback({
        eventTitle: event.title,
        selectedOption: option.text,
        feedback: option.feedback,
        score: option.score,
        isOptimal: option.isOptimal,
      });
      if (enhancedFeedback) {
        feedback = enhancedFeedback;
      }
    } catch (error) {
      console.warn('AI feedback enhancement failed:', error);
    }
  }

  return {
    score: option.score,
    maxScore: 100,
    percentage: option.score,
    isOptimal: option.isOptimal,
    feedback,
    impact: option.impact,
    selectedOption: option,
  };
};

/**
 * Calculate cumulative impact on project metrics
 */
export const calculateCumulativeImpact = (responses) => {
  const impact = {
    scope: 0,
    schedule: 0,
    budget: 0,
    quality: 0,
    team_morale: 0,
    stakeholder_satisfaction: 0,
  };

  responses.forEach(response => {
    if (response.impact) {
      Object.keys(response.impact).forEach(key => {
        impact[key] = (impact[key] || 0) + (response.impact[key] || 0);
      });
    }
  });

  return impact;
};

// =============================================
// DATABASE OPERATIONS
// =============================================

/**
 * Save event to simulation run
 */
export const saveEvent = async (runId, event, response) => {
  const { data, error } = await simDb
    .from('ai_events')
    .insert({
      run_id: runId,
      event_type: event.type,
      event_data: event,
      user_response: response,
      score: response.score,
      is_optimal: response.isOptimal,
      triggered_at: event.timestamp,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get events for a simulation run
 */
export const getRunEvents = async (runId) => {
  const { data, error } = await simDb
    .from('ai_events')
    .select('*')
    .eq('run_id', runId)
    .order('triggered_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get event statistics for a user
 */
export const getUserEventStats = async (userId) => {
  const { data, error } = await simDb
    .from('ai_events')
    .select(`
      event_type,
      score,
      is_optimal,
      simulation_runs!inner(user_id)
    `)
    .eq('simulation_runs.user_id', userId);

  if (error) throw error;

  // Calculate stats
  const stats = {
    totalEvents: data.length,
    optimalResponses: data.filter(e => e.is_optimal).length,
    averageScore: data.length > 0
      ? Math.round(data.reduce((sum, e) => sum + e.score, 0) / data.length)
      : 0,
    byCategory: {},
  };

  // Group by event type
  data.forEach(event => {
    if (!stats.byCategory[event.event_type]) {
      stats.byCategory[event.event_type] = {
        count: 0,
        optimal: 0,
        totalScore: 0,
      };
    }
    stats.byCategory[event.event_type].count++;
    if (event.is_optimal) stats.byCategory[event.event_type].optimal++;
    stats.byCategory[event.event_type].totalScore += event.score;
  });

  return stats;
};

// =============================================
// ADAPTIVE DIFFICULTY
// =============================================

/**
 * Adjust event difficulty based on user performance
 */
export const getAdaptiveDifficulty = (userStats, baseDifficulty) => {
  const { averageScore, optimalRate } = userStats;

  const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const currentIndex = difficultyLevels.indexOf(baseDifficulty);

  // Increase difficulty if performing well
  if (averageScore >= 85 && optimalRate >= 0.7) {
    return difficultyLevels[Math.min(currentIndex + 1, 3)];
  }

  // Decrease difficulty if struggling
  if (averageScore < 50 || optimalRate < 0.3) {
    return difficultyLevels[Math.max(currentIndex - 1, 0)];
  }

  return baseDifficulty;
};

export default {
  EVENT_CATEGORIES,
  EVENT_TYPES,
  EVENT_SEVERITY,
  generateEvent,
  generatePhaseEvents,
  evaluateResponse,
  calculateCumulativeImpact,
  saveEvent,
  getRunEvents,
  getUserEventStats,
  getAdaptiveDifficulty,
};
