/**
 * aiInsightsService.js (Phase 6)
 * Proactive dashboard insights — default rule-based (no external API).
 * Optional Gemini narrative when org insights_mode = 'gemini'.
 * Stores in ai_insights_cache (expires 24h).
 */

import { platformDb } from './supabase/supabaseClient'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** Fetch data for rule-based insight categories (RLS applies) */
async function fetchInsightData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 86400000).toISOString()

  const [risksRes, issuesRes, mandatesRes] = await Promise.all([
    platformDb
      .from('risks')
      .select('id, risk_reference, risk_title, risk_score, risk_owner_id, project:project_id(project_name)')
      .eq('is_deleted', false)
      .limit(100),
    platformDb
      .from('issues')
      .select('id, issue_reference, issue_title, status_enum, created_at, project:project_id(project_name)')
      .eq('is_deleted', false)
      .neq('status_enum', 'Closed')
      .limit(100),
    platformDb
      .from('project_mandates')
      .select('id, mandate_reference, project_name, approval_status, created_at')
      .eq('is_deleted', false)
      .limit(50),
  ])

  const risks = risksRes.data || []
  const issues = issuesRes.data || []
  const mandates = mandatesRes.data || []

  const risksNoOwner = risks.filter((r) => !r.risk_owner_id)
  const issuesUnresolved21 = issues.filter((i) => new Date(i.created_at) <= new Date(twentyOneDaysAgo))
  const mandatesPending7 = mandates.filter(
    (m) =>
      (m.approval_status === 'Pending' || m.approval_status === 'Submitted') &&
      new Date(m.created_at) <= new Date(sevenDaysAgo)
  )

  return {
    risksNoOwner,
    issuesUnresolved21,
    mandatesPending7,
    risks,
    issues,
    mandates,
  }
}

/** Build rule-based insight items (no external API) */
function buildRuleBasedInsights(data) {
  const items = []

  if (data.risksNoOwner.length > 0) {
    const n = data.risksNoOwner.length
    const severity = n >= 5 ? 'critical' : n >= 2 ? 'warning' : 'info'
    items.push({
      text: `${n} risk(s) have no owner assigned. Consider assigning owners to track accountability.`,
      severity,
      module: 'risks',
    })
  }

  if (data.mandatesPending7.length > 0) {
    const n = data.mandatesPending7.length
    items.push({
      text: `${n} mandate(s) have been pending approval for more than 7 days. Review to avoid delays.`,
      severity: n >= 3 ? 'warning' : 'info',
      module: 'mandates',
    })
  }

  if (data.issuesUnresolved21.length > 0) {
    const n = data.issuesUnresolved21.length
    items.push({
      text: `${n} issue(s) have been unresolved for more than 21 days. Consider prioritising or escalating.`,
      severity: n >= 5 ? 'critical' : n >= 2 ? 'warning' : 'info',
      module: 'issues',
    })
  }

  if (items.length === 0) {
    items.push({
      text: 'No urgent insights from your data. Keep reviewing risks, issues, and mandates regularly.',
      severity: 'info',
      module: 'general',
    })
  }

  return items
}

/** Optional: send aggregated rule-based text to Gemini for a short narrative (Phase 6.2) */
async function generateGeminiNarrative(ruleBasedText) {
  if (!GEMINI_KEY || !ruleBasedText) return null
  try {
    const model = 'gemini-1.5-flash'
    const res = await fetch(
      `${GEMINI_BASE}/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `Based on these project management data points, write 2 to 4 very short bullet-point insights for the dashboard. No preamble. Bullets only.\n\n${ruleBasedText}`,
            }],
          }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
        }),
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text.trim()) return null
    return text.trim().split(/\n+/).filter(Boolean).slice(0, 5).map((line) => ({
      text: line.replace(/^[-*•]\s*/, '').trim(),
      severity: 'info',
      module: 'general',
    }))
  } catch {
    return null
  }
}

/** Get org insights_mode (template | gemini) */
async function getOrgInsightsMode(orgId) {
  if (!orgId) return 'template'
  try {
    const { data } = await platformDb
      .from('ai_settings')
      .select('insights_mode')
      .eq('organisation_id', orgId)
      .maybeSingle()
    return data?.insights_mode === 'gemini' ? 'gemini' : 'template'
  } catch {
    return 'template'
  }
}

/** Get cached insights if still valid */
export async function getCachedInsights(userId) {
  try {
    const { data } = await platformDb
      .from('ai_insights_cache')
      .select('insights, expires_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data) return null
    if (new Date(data.expires_at) < new Date()) return null

    return data.insights
  } catch {
    return null
  }
}

/** Generate fresh insights (rule-based, optional Gemini) and cache (Phase 6.1, 6.2) */
export async function generateInsights(userId, orgId = null) {
  try {
    const data = await fetchInsightData()
    let insights = buildRuleBasedInsights(data)

    const mode = await getOrgInsightsMode(orgId)
    if (mode === 'gemini' && insights.length > 0) {
      const aggregated = insights.map((i) => i.text).join('\n')
      const geminiInsights = await generateGeminiNarrative(aggregated)
      if (Array.isArray(geminiInsights) && geminiInsights.length > 0) {
        insights = geminiInsights
      }
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await platformDb
      .from('ai_insights_cache')
      .upsert(
        {
          user_id: userId,
          organisation_id: orgId || null,
          insights,
          generated_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'user_id' }
      )

    return insights
  } catch (e) {
    console.warn('[aiInsights] generateInsights error:', e)
    return buildRuleBasedInsights({
      risksNoOwner: [],
      issuesUnresolved21: [],
      mandatesPending7: [],
    })
  }
}

/** Get cached or generate; respects org insights_enabled (Phase 6.5: caller can hide panel if disabled) */
export async function getOrGenerateInsights(userId, orgId = null) {
  const cached = await getCachedInsights(userId)
  if (cached) return cached
  return generateInsights(userId, orgId)
}

/** Force refresh (ignore cache) */
export async function refreshInsights(userId, orgId = null) {
  return generateInsights(userId, orgId)
}

/** Check if org has insights enabled (for panel visibility) */
export async function getOrgInsightsEnabled(orgId) {
  if (!orgId) return true
  try {
    const { data } = await platformDb
      .from('ai_settings')
      .select('insights_enabled')
      .eq('organisation_id', orgId)
      .maybeSingle()
    return data?.insights_enabled !== false
  } catch {
    return true
  }
}
