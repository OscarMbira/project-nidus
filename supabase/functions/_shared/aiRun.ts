/**
 * v1272 — one AI run: gate → model calls → audit + credits (PRD D6, D7, D8, stories 4, 5, 10).
 *
 *   const run = await startAiRun(req, { app, agent, projectId })
 *   if (run.blocked) return json(req, 403, run.blocked)
 *   const msg = await run.call({ tier: 'quick', max_tokens: 1024, messages })   // usage recorded
 *   await run.finish({ answer })                                                   // audit row + ledger
 *
 * The gate uses public.ai_org_status (kill switch, admin disable, consent, planner read-only,
 * credits). Audit rows go to <schema>.agent_runs / agent_steps; credits to public.ai_credit_ledger.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { requireUser, schemaForApp, type AiApp, type DbSchema, type UserContext } from './auth.ts'
import { anthropic, modelFor, platformSettings, type ModelTier, type PlatformSettings } from './anthropic.ts'
import { computeCredits, evaluateGate, fillMessage, messageLanguage, shouldSendWarning } from './ai/credits.js'

export interface AiRunOptions {
  app: AiApp
  agent: string
  projectId?: string | null
  conversationId?: string | null
  question?: string | null
}

export interface BlockedResult {
  error: string
  code: string
  reason: string
}

export interface AiRun {
  blocked: BlockedResult | null
  user: UserContext
  app: AiApp
  schema: DbSchema
  db: SupabaseClient          // user session, app schema
  publicDb: SupabaseClient    // user session, public
  settings: PlatformSettings
  status: Record<string, unknown>
  accountId: string | null
  edition: string
  languageCode: string
  userName: string | null
  runId: string | null
  call: (params: Record<string, unknown> & { tier: ModelTier }) => Promise<any>
  addSteps: (steps: Array<Record<string, unknown>>) => void
  setConversation: (id: string | null) => void
  finish: (result: { answer?: string | null; error?: string | null; status?: 'succeeded' | 'failed' }) => Promise<{ credits: number }>
}

async function uiMessage(admin: SupabaseClient, key: string, lang: string, values: Record<string, string>) {
  const { data } = await admin.from('ai_ui_messages').select('language_code, message_text')
    .eq('message_key', key).in('language_code', [lang, 'en'])
  const row = (data || []).find((r) => r.language_code === lang) || (data || []).find((r) => r.language_code === 'en')
  return fillMessage(row?.message_text || 'AI is not available right now.', values)
}

export async function startAiRun(req: Request, opts: AiRunOptions): Promise<AiRun> {
  const user = await requireUser(req)
  const schema = schemaForApp(opts.app)
  const adminPublic = user.adminDb('public')
  const adminSchema = user.adminDb(schema)
  const publicDb = user.userDb('public')
  const db = user.userDb(schema)

  const [settings, statusRes, profileRes] = await Promise.all([
    platformSettings(adminPublic),
    publicDb.rpc('ai_org_status'),
    adminPublic.from('users').select('id, full_name, display_name, language_code').eq('auth_user_id', user.userId).maybeSingle(),
  ])
  const status = (statusRes.data || {}) as Record<string, any>
  const accountId = (status.account_id as string) || null
  // A Planner-edition account always gets the Planner scope (D16); the Simulator uses the full sim catalogue.
  const edition = opts.app !== 'simulator' && (opts.app === 'planner' || status.edition === 'planner') ? 'planner' : 'platform'
  const languageCode = (profileRes.data?.language_code as string) || 'en-GB'
  const userName = (profileRes.data?.full_name || profileRes.data?.display_name || null) as string | null

  const parts: Array<{ model: string; usage: any }> = []
  const steps: Array<Record<string, unknown>> = []
  let conversationId = opts.conversationId ?? null
  const started = Date.now()

  // Gate --------------------------------------------------------------------------
  let gate = evaluateGate(statusRes.error ? null : status)
  if (gate.allowed && settings.kill_switch) gate = { allowed: false, reason: 'kill_switch' }
  let blocked: BlockedResult | null = null
  let runId: string | null = null

  if (!gate.allowed) {
    const message = await uiMessage(adminPublic, gate.reason || 'not_enabled', messageLanguage(languageCode), {
      owner: String(status.owner_name || 'your Account Owner'),
      renews: status.period_end ? new Date(String(status.period_end)).toLocaleDateString('en-GB') : 'the next billing date',
      percent: String(status.percent ?? ''),
    })
    blocked = { error: message, code: 'ai_blocked', reason: gate.reason || 'not_enabled' }
    await adminSchema.from('agent_runs').insert({
      account_id: accountId, user_id: user.userId, project_id: opts.projectId ?? null, app: opts.app, agent: opts.agent,
      status: 'blocked', block_reason: gate.reason, finished_at: new Date().toISOString(), duration_ms: 0,
    })
  } else {
    const { data } = await adminSchema.from('agent_runs').insert({
      account_id: accountId, user_id: user.userId, project_id: opts.projectId ?? null, conversation_id: conversationId,
      app: opts.app, agent: opts.agent, status: 'running', language_code: languageCode,
      question_text: opts.question ? String(opts.question).slice(0, 8000) : null,
    }).select('id').single()
    runId = data?.id ?? null
  }

  const run: AiRun = {
    blocked, user, app: opts.app, schema, db, publicDb, settings, status, accountId, edition, languageCode, userName, runId,

    async call(params) {
      const { tier, ...rest } = params
      const model = (rest.model as string) || modelFor(settings, tier)
      const t0 = Date.now()
      const message = await anthropic().messages.create({ ...rest, model } as any)
      parts.push({ model, usage: message.usage })
      steps.push({ step_type: 'model', input_tokens: message.usage?.input_tokens || 0, output_tokens: message.usage?.output_tokens || 0, duration_ms: Date.now() - t0 })
      return message
    },

    addSteps(more) {
      steps.push(...more)
    },

    setConversation(id) {
      conversationId = id
    },

    async finish({ answer = null, error = null, status: outcome }) {
      if (blocked || !runId) return { credits: 0 }
      let credits = 0
      try {
        credits = computeCredits(parts, settings)
      } catch (e) {
        console.error('[ai] credit calculation failed', e)
      }
      const totals = parts.reduce((acc, p) => ({
        input_tokens: acc.input_tokens + (p.usage?.input_tokens || 0),
        output_tokens: acc.output_tokens + (p.usage?.output_tokens || 0),
        cache_read_tokens: acc.cache_read_tokens + (p.usage?.cache_read_input_tokens || 0),
        cache_write_tokens: acc.cache_write_tokens + (p.usage?.cache_creation_input_tokens || 0),
      }), { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 })

      await adminSchema.from('agent_runs').update({
        status: outcome || (error ? 'failed' : 'succeeded'),
        model: parts.length ? parts[parts.length - 1].model : null,
        ...totals,
        credits,
        tool_calls: steps.filter((s) => s.step_type === 'tool').length,
        conversation_id: conversationId,
        answer_text: answer ? String(answer).slice(0, 16000) : null,
        error_text: error ? String(error).slice(0, 2000) : null,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
      }).eq('id', runId)

      if (steps.length) {
        await adminSchema.from('agent_steps').insert(steps.map((s, i) => ({ run_id: runId, step_no: i + 1, ...pickStep(s) })))
      }
      if (credits > 0 && accountId) {
        await adminPublic.from('ai_credit_ledger').insert({
          account_id: accountId, entry_type: 'usage', credits, app: opts.app, agent: opts.agent, agent_run_id: runId,
          created_by: profileRes.data?.id ?? null,
        })
        await maybeSendWarning(adminPublic, accountId, publicDb)
      }
      return { credits }
    },
  }
  return run
}

function pickStep(s: Record<string, unknown>) {
  return {
    step_type: s.step_type,
    tool_name: s.tool_name ?? null,
    tool_input: s.tool_input ?? null,
    tool_output_summary: s.tool_output_summary ?? null,
    is_error: Boolean(s.is_error),
    input_tokens: Number(s.input_tokens || 0),
    output_tokens: Number(s.output_tokens || 0),
    duration_ms: s.duration_ms == null ? null : Number(s.duration_ms),
  }
}

/** Story 10 / D6: email the Account Owner once per period when usage passes warn_percent. */
async function maybeSendWarning(adminPublic: SupabaseClient, accountId: string, publicDb: SupabaseClient) {
  try {
    const { data: status } = await publicDb.rpc('ai_org_status', { p_account_id: accountId })
    if (!shouldSendWarning(status)) return
    const { data: owner } = await adminPublic.from('accounts').select('account_name, users:owner_user_id (email, full_name, language_code)')
      .eq('id', accountId).single()
    const ownerRow = Array.isArray(owner?.users) ? owner?.users[0] : owner?.users
    await adminPublic.from('ai_settings').update({ last_warning_period_start: status.period_start }).eq('organisation_id', accountId)
    if (!ownerRow?.email) return
    const text = await uiMessage(adminPublic, status.warning_level === 'blocked' ? 'quota_blocked' : 'quota_warning',
      messageLanguage(ownerRow.language_code), {
        percent: String(Math.round(Number(status.percent) || 0)),
        owner: ownerRow.full_name || 'you',
        renews: status.period_end ? new Date(status.period_end).toLocaleDateString('en-GB') : 'the next billing date',
      })
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        to: ownerRow.email,
        subject: `AI credits: ${owner?.account_name || 'your organisation'}`,
        html: `<p>${text}</p><p>You can see AI usage in Account / Organisation Settings → AI Settings.</p>`,
        text,
      }),
    })
  } catch (e) {
    console.error('[ai] warning email failed', e)
  }
}
