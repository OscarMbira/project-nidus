/**
 * Admin moratorium expiry cron — daily check for system testers approaching moratorium_end.
 * Deploy in project-nidus (shared Supabase). Invoke via pg_cron or Supabase scheduled function.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const WINDOWS = [
  { days: 90, event: 'moratorium_expiry_90d', type: '90d' },
  { days: 30, event: 'moratorium_expiry_30d', type: '30d' },
  { days: 7, event: 'moratorium_expiry_7d', type: '7d' },
]

async function dispatchEmail(supabaseUrl, key, to, subject, html) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, html }),
  })
  return res.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !key) {
    return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), { status: 500 })
  }

  const db = createClient(supabaseUrl, key, { auth: { persistSession: false }, db: { schema: 'admin' } })
  const publicDb = createClient(supabaseUrl, key, { auth: { persistSession: false } })
  const results = []

  for (const win of WINDOWS) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + win.days)
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    const { data: testers, error } = await publicDb
      .from('system_testers')
      .select('id, user_id, moratorium_end')
      .eq('status', 'active')
      .gte('moratorium_end', dayStart.toISOString())
      .lte('moratorium_end', dayEnd.toISOString())

    if (error) {
      results.push({ window: win.type, error: error.message })
      continue
    }

    for (const tester of testers || []) {
      const { data: existing } = await publicDb
        .from('tester_expiry_notification_log')
        .select('id')
        .eq('tester_id', tester.id)
        .eq('notification_type', win.type)
        .maybeSingle()

      if (existing) continue

      const { data: user } = await publicDb.from('users').select('email, full_name').eq('id', tester.user_id).maybeSingle()
      const email = user?.email
      if (!email) continue

      const context = {
        first_name: user?.full_name?.split(' ')[0] || 'Tester',
        platform_name: 'Project Nidus',
        expiry_date: new Date(tester.moratorium_end).toLocaleDateString(),
        plans_url: 'https://projectnidus.com/pricing',
      }

      const { data: logId, error: triggerError } = await db.rpc('trigger_email_event', {
        p_event_type: win.event,
        p_recipient_email: email,
        p_context_data: context,
        p_admin_user_id: null,
      })

      if (triggerError) {
        results.push({ tester_id: tester.id, window: win.type, error: triggerError.message })
        continue
      }

      if (logId) {
        const { data: logRow } = await db.from('email_send_log').select('subject, metadata').eq('id', logId).maybeSingle()
        const sendRes = await dispatchEmail(supabaseUrl, key, email, logRow?.subject || 'Tester access expiring', logRow?.metadata?.body_html || '')
        await db.rpc('update_email_send_status', {
          p_log_id: logId,
          p_status: sendRes?.success ? 'sent' : 'failed',
          p_message_id: sendRes?.message_id || null,
          p_error_message: sendRes?.error || null,
        })
      }

      await publicDb.from('tester_expiry_notification_log').insert({
        tester_id: tester.id,
        user_id: tester.user_id,
        notification_type: win.type,
      })

      results.push({ tester_id: tester.id, window: win.type, log_id: logId })
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
