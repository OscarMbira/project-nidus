/**
 * v1272 — the one Anthropic client for every AI edge function (PRD D1).
 *
 * Model IDs are never hard-coded here: they come from public.ai_platform_settings
 * (model_routing / model_quick / model_agent), editable in Admin > AI Centre > Models & Routing.
 * Settings are cached for 30 seconds, so the kill switch takes effect within a minute (story 5).
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { HttpError } from './http.ts'

export type ModelTier = 'routing' | 'quick' | 'agent'

export interface PlatformSettings {
  kill_switch: boolean
  model_routing: string
  model_quick: string
  model_agent: string
  model_prices: Record<string, { input: number; output: number; cache_read?: number; cache_write?: number }>
  credit_unit_usd: number
  warn_percent: number
  max_agent_iterations: number
  query_row_cap: number
}

let client: Anthropic | null = null

export function anthropic(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new HttpError(503, 'not_configured', 'AI is not configured on the server yet.')
  return (client ??= new Anthropic({ apiKey, maxRetries: 2 }))
}

let cached: { at: number; value: PlatformSettings } | null = null

export async function platformSettings(adminPublic: SupabaseClient): Promise<PlatformSettings> {
  if (cached && Date.now() - cached.at < 30_000) return cached.value
  const { data, error } = await adminPublic.from('ai_platform_settings').select('*').eq('id', true).single()
  if (error || !data) throw new HttpError(503, 'not_configured', 'AI settings are missing. Ask the administrator to run the AI setup.')
  cached = { at: Date.now(), value: data as PlatformSettings }
  return cached.value
}

export function modelFor(settings: PlatformSettings, tier: ModelTier): string {
  if (tier === 'agent') return settings.model_agent
  if (tier === 'routing') return settings.model_routing
  return settings.model_quick
}

/** Text of a Messages API response. */
export function responseText(message: { content?: Array<{ type: string; text?: string }> }): string {
  return (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n')
    .trim()
}

/** Pull the first JSON object out of a model reply (models sometimes add a sentence around it). */
export function parseJsonReply<T = unknown>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new HttpError(502, 'bad_model_output', 'The AI reply could not be read. Please try again.')
  try {
    return JSON.parse(match[0]) as T
  } catch {
    throw new HttpError(502, 'bad_model_output', 'The AI reply could not be read. Please try again.')
  }
}

export { Anthropic }
