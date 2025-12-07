/**
 * AI Event Generator Service
 *
 * Uses OpenAI API to generate dynamic, contextual events
 * for PM simulations based on scenario context and user performance
 */

import { EVENT_CATEGORIES, EVENT_TYPES, EVENT_SEVERITY } from './eventEngineService';

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4';

/**
 * Generate a dynamic event using OpenAI
 */
export const generateAIEvent = async (context) => {
  const {
    scenario,
    phase,
    difficulty,
    projectHealth,
    previousEvents = [],
    userPerformance = {},
  } = context;

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not configured, using fallback event generation');
    return null;
  }

  const prompt = buildEventPrompt(context);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const eventData = parseAIResponse(data.choices[0].message.content);

    return {
      id: `ai_evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...eventData,
      timestamp: new Date().toISOString(),
      isAIGenerated: true,
    };
  } catch (error) {
    console.error('Error generating AI event:', error);
    return null;
  }
};

/**
 * Get the system prompt for event generation
 */
const getSystemPrompt = () => {
  return `You are an expert project management simulation event generator. Your role is to create realistic, educational project management scenarios that test and teach best practices.

When generating events:
1. Create realistic situations that project managers face
2. Include 4 response options ranging from poor to optimal choices
3. Provide constructive feedback that teaches PM principles
4. Consider the current project health metrics
5. Make events appropriate for the difficulty level
6. Include an NPC (stakeholder) who presents the situation

Always respond in valid JSON format with the following structure:
{
  "type": "event_type",
  "category": "category",
  "severity": "low|medium|high|critical",
  "title": "Event Title",
  "description": "Detailed situation description",
  "npc": {
    "name": "NPC Name",
    "role": "Their Role"
  },
  "options": [
    {
      "text": "Response option text",
      "feedback": "Educational feedback explaining why this choice is good/bad",
      "score": 0-100,
      "isOptimal": boolean,
      "impact": {
        "scope": -20 to 20,
        "schedule": -20 to 20,
        "budget": -20 to 20,
        "quality": -20 to 20,
        "team_morale": -20 to 20,
        "stakeholder_satisfaction": -20 to 20
      }
    }
  ]
}`;
};

/**
 * Build the user prompt based on context
 */
const buildEventPrompt = (context) => {
  const {
    scenario,
    phase,
    difficulty,
    projectHealth,
    previousEvents,
    userPerformance,
  } = context;

  const recentEventTypes = previousEvents.slice(-3).map(e => e.type).join(', ');

  return `Generate a project management event for the following context:

SCENARIO: ${scenario?.name || 'IT Project'}
INDUSTRY: ${scenario?.industry || 'IT/Software'}
METHODOLOGY: ${scenario?.methodology || 'Agile'}
CURRENT PHASE: ${phase?.name || 'Project Execution'}
DIFFICULTY: ${difficulty || 'intermediate'}

PROJECT HEALTH METRICS:
- Scope: ${projectHealth?.scope || 100}%
- Schedule: ${projectHealth?.schedule || 100}%
- Budget: ${projectHealth?.budget || 100}%
- Quality: ${projectHealth?.quality || 100}%
- Team Morale: ${projectHealth?.team_morale || 100}%
- Stakeholder Satisfaction: ${projectHealth?.stakeholder_satisfaction || 100}%

USER PERFORMANCE:
- Average Score: ${userPerformance?.averageScore || 'N/A'}
- Optimal Response Rate: ${userPerformance?.optimalRate || 'N/A'}

RECENT EVENT TYPES (avoid repeating): ${recentEventTypes || 'None'}

Generate an event that:
1. Is appropriate for the ${difficulty} difficulty level
2. Relates to the current phase and methodology
3. Addresses any concerning project health metrics (below 70%)
4. Is different from recent event types
5. Teaches an important PM concept

Respond with only the JSON object, no additional text.`;
};

/**
 * Parse the AI response into an event object
 */
const parseAIResponse = (content) => {
  try {
    // Clean the response (remove markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    const event = JSON.parse(jsonStr);

    // Validate and normalize the event
    return {
      type: event.type || EVENT_TYPES.STAKEHOLDER_REQUEST,
      category: event.category || EVENT_CATEGORIES.STAKEHOLDER,
      severity: event.severity || EVENT_SEVERITY.MEDIUM,
      title: event.title || 'Project Event',
      description: event.description || 'A situation requires your attention.',
      npc: event.npc || { name: 'Stakeholder', role: 'Team Member' },
      options: normalizeOptions(event.options),
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI-generated event');
  }
};

/**
 * Normalize and validate options
 */
const normalizeOptions = (options) => {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('Invalid options array');
  }

  return options.map((option, index) => ({
    text: option.text || `Option ${index + 1}`,
    feedback: option.feedback || 'Consider the impact of your decision.',
    score: Math.min(100, Math.max(0, option.score || 50)),
    isOptimal: option.isOptimal || false,
    impact: {
      scope: clampImpact(option.impact?.scope),
      schedule: clampImpact(option.impact?.schedule),
      budget: clampImpact(option.impact?.budget),
      quality: clampImpact(option.impact?.quality),
      team_morale: clampImpact(option.impact?.team_morale),
      stakeholder_satisfaction: clampImpact(option.impact?.stakeholder_satisfaction),
    },
  }));
};

/**
 * Clamp impact values to valid range
 */
const clampImpact = (value) => {
  if (typeof value !== 'number') return 0;
  return Math.min(20, Math.max(-20, value));
};

/**
 * Generate hints based on event and user's hesitation
 */
export const generateHint = async (event, hintLevel = 1) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return getDefaultHint(event, hintLevel);
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful project management mentor providing hints without giving away the answer directly.',
          },
          {
            role: 'user',
            content: `Provide a level ${hintLevel} hint (1=subtle, 2=moderate, 3=direct) for this PM scenario:

Event: ${event.title}
Situation: ${event.description}

Options:
${event.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.text}`).join('\n')}

Give a brief hint that helps the user think through the decision without directly revealing the answer.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return getDefaultHint(event, hintLevel);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating hint:', error);
    return getDefaultHint(event, hintLevel);
  }
};

/**
 * Get default hints without API
 */
const getDefaultHint = (event, hintLevel) => {
  const hints = {
    1: [
      'Consider the long-term impact of your decision.',
      'Think about stakeholder relationships.',
      'What would a seasoned PM do here?',
    ],
    2: [
      'Focus on communication and transparency.',
      'Consider following established processes.',
      'Think about team dynamics and morale.',
    ],
    3: [
      'The best PMs analyze before acting.',
      'Collaboration often leads to better outcomes.',
      'Process discipline prevents future problems.',
    ],
  };

  const levelHints = hints[hintLevel] || hints[1];
  return levelHints[Math.floor(Math.random() * levelHints.length)];
};

/**
 * Generate feedback summary after simulation
 */
export const generateFeedbackSummary = async (simulationData) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return getDefaultFeedbackSummary(simulationData);
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a project management coach providing constructive feedback on simulation performance.',
          },
          {
            role: 'user',
            content: `Provide a brief performance summary for this PM simulation:

Score: ${simulationData.score}%
Optimal Decisions: ${simulationData.optimalDecisions}/${simulationData.totalDecisions}

Final Project Health:
${Object.entries(simulationData.projectHealth).map(([k, v]) => `- ${k}: ${v}%`).join('\n')}

Provide:
1. One key strength demonstrated
2. One area for improvement
3. One specific tip for next time

Keep it brief and encouraging.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return getDefaultFeedbackSummary(simulationData);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating feedback summary:', error);
    return getDefaultFeedbackSummary(simulationData);
  }
};

/**
 * Get default feedback summary without API
 */
const getDefaultFeedbackSummary = (simulationData) => {
  const score = simulationData.score;

  if (score >= 90) {
    return `Excellent performance! You demonstrated strong PM skills with ${simulationData.optimalDecisions} optimal decisions. Your strength lies in making well-informed choices. Keep practicing to maintain this level.`;
  } else if (score >= 70) {
    return `Good job! You scored ${score}% with solid decision-making. Focus on considering all stakeholder impacts before deciding. Try to improve in areas where project health dropped below 70%.`;
  } else if (score >= 50) {
    return `Decent effort with room for growth. Review the feedback on each decision to understand better approaches. Focus on proactive communication and following established processes.`;
  } else {
    return `This simulation highlighted some learning opportunities. Review each decision's feedback carefully. Remember: analyze before acting, communicate proactively, and consider long-term impacts.`;
  }
};

export default {
  generateAIEvent,
  generateHint,
  generateFeedbackSummary,
};
