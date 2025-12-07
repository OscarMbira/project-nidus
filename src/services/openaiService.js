/**
 * OpenAI Service
 * 
 * Handles AI-powered event generation and feedback for the simulator
 * Falls back to template-based events if API is unavailable
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Generate an AI-powered event based on simulation context
 * @param {Object} context - Simulation context (scenario, phase, difficulty, previousEvents, projectHealth)
 * @returns {Promise<Object>} Generated event with title, description, options, and feedback
 */
export async function generateAIEvent(context = {}) {
  const {
    scenario,
    phase,
    difficulty = 'intermediate',
    previousEvents = [],
    projectHealth = {},
    eventCategory = null,
  } = context;

  // Check if OpenAI API key is configured
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenAI API key not configured. Falling back to template-based events.');
    return null; // Return null to indicate fallback needed
  }

  try {
    // Build prompt for event generation
    const prompt = buildEventGenerationPrompt(context);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using cost-effective model
        messages: [
          {
            role: 'system',
            content: `You are an expert project management simulation event generator. Create realistic, challenging events that test PM skills. Events should have 4 response options with varying quality levels.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8, // Creative but consistent
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    // Transform AI response into event format
    return transformAIResponseToEvent(content, context);
  } catch (error) {
    console.error('Error generating AI event:', error);
    return null; // Fallback to templates
  }
}

/**
 * Build the prompt for event generation
 */
function buildEventGenerationPrompt(context) {
  const {
    scenario,
    phase,
    difficulty,
    previousEvents = [],
    projectHealth = {},
    eventCategory = null,
  } = context;

  const scenarioInfo = scenario
    ? `Scenario: ${scenario.name} (${scenario.industry}, ${scenario.methodology}, ${scenario.difficulty_level})`
    : 'General project management scenario';

  const phaseInfo = phase ? `Current Phase: ${phase.name || phase} - ${phase.description || ''}` : 'Mid-project phase';

  const healthStatus = Object.entries(projectHealth)
    .map(([key, value]) => `${key}: ${value}%`)
    .join(', ');

  const recentEvents = previousEvents.slice(-3).map(e => e.type).join(', ');

  return `Generate a realistic project management event for a simulation.

${scenarioInfo}
${phaseInfo}
Difficulty Level: ${difficulty}
Project Health: ${healthStatus}
${recentEvents ? `Recent Events: ${recentEvents}` : ''}
${eventCategory ? `Event Category: ${eventCategory}` : ''}

Create an event with:
1. A realistic title (max 60 chars)
2. A detailed description (2-3 sentences) that sets the scene
3. An NPC character (name, role, avatar path)
4. Four response options with:
   - Option text (clear action description)
   - Impact scores (scope, schedule, budget, quality, team_morale, stakeholder_satisfaction) - values between -20 and +20
   - Feedback text (explaining why this is good/bad)
   - Score (0-100, where 90+ is optimal)
   - isOptimal flag (true for best option, false for others)

Return JSON in this exact format:
{
  "title": "Event Title",
  "description": "Event description...",
  "npc": {
    "name": "Character Name",
    "role": "Character Role",
    "avatar": "/npcs/character.png"
  },
  "category": "stakeholder|risk|team|resource|scope|quality|communication|schedule|budget",
  "severity": "low|medium|high|critical",
  "options": [
    {
      "text": "Option 1 description",
      "impact": {
        "scope": 0,
        "schedule": -5,
        "budget": 0,
        "quality": 0,
        "team_morale": 5,
        "stakeholder_satisfaction": 0
      },
      "feedback": "Why this option is good or bad...",
      "score": 85,
      "isOptimal": false
    }
  ]
}

Make the event realistic, challenging, and educational. Ensure one option is clearly optimal (score 90-100) and others have varying quality.`;
}

/**
 * Transform AI response into event format
 */
function transformAIResponseToEvent(aiResponse, context) {
  const { difficulty = 'intermediate' } = context;

  // Map difficulty to severity
  const severityMap = {
    beginner: 'low',
    intermediate: 'medium',
    advanced: 'high',
    expert: 'critical',
  };

  return {
    id: `ai_evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: `ai_${aiResponse.category || 'custom'}`,
    category: aiResponse.category || 'stakeholder',
    severity: aiResponse.severity || severityMap[difficulty] || 'medium',
    title: aiResponse.title,
    description: aiResponse.description,
    npc: aiResponse.npc || {
      name: 'Project Stakeholder',
      role: 'Stakeholder',
      avatar: '/npcs/stakeholder.png',
    },
    options: aiResponse.options || [],
    timestamp: new Date().toISOString(),
    isAIGenerated: true,
  };
}

/**
 * Generate AI-powered feedback for a user's decision
 * @param {Object} decision - User's decision context
 * @returns {Promise<string>} Enhanced feedback text
 */
export async function generateAIFeedback(decision) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return decision.feedback; // Return original feedback if no API
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a project management mentor providing constructive feedback. Be encouraging but honest.',
          },
          {
            role: 'user',
            content: `Provide enhanced feedback for this decision:
Event: ${decision.eventTitle}
Selected Option: ${decision.selectedOption}
Current Feedback: ${decision.feedback}
Score: ${decision.score}/100
Is Optimal: ${decision.isOptimal}

Provide 2-3 sentences of constructive feedback that explains the reasoning and suggests improvement if needed.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return decision.feedback; // Fallback to original
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI feedback:', error);
    return decision.feedback; // Fallback to original
  }
}

/**
 * Generate contextual hints for the current simulation state
 * @param {Object} context - Current simulation context
 * @returns {Promise<string>} Hint text
 */
export async function generateAIHint(context) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return null; // No hints without API
  }

  try {
    const { scenario, phase, currentEvent, projectHealth, difficulty } = context;

    const prompt = `You are a helpful project management mentor. Provide a subtle hint (1-2 sentences) to guide the user without giving away the answer.

Scenario: ${scenario?.name || 'Project Management'}
Phase: ${phase?.name || 'Current Phase'}
Current Challenge: ${currentEvent?.title || 'Decision point'}
Project Health: ${JSON.stringify(projectHealth)}
Difficulty: ${difficulty}

Provide a hint that:
- Guides thinking without revealing the answer
- References PM best practices
- Is encouraging and educational
- Is concise (1-2 sentences max)`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a supportive PM mentor providing subtle guidance.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI hint:', error);
    return null;
  }
}

export default {
  generateAIEvent,
  generateAIFeedback,
  generateAIHint,
};

