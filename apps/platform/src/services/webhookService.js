/**
 * v1356 — Compatibility bridge for notification rules that used the retired v43
 * webhook tables. New integrations use Organisation › Webhooks (webhook_endpoints /
 * webhook_outbox). This module only enqueues an outbox row for active endpoints
 * that subscribe to the event type.
 */
import { platformDb } from '@nidus/supabase'

/**
 * Enqueue a webhook outbox event for organisation endpoints matching eventType.
 */
export async function triggerWebhookEvent(eventType, eventData = {}, projectId = null) {
  try {
    let accountId = eventData.account_id || null
    if (!accountId && projectId) {
      const { data: project } = await platformDb
        .from('projects')
        .select('account_id')
        .eq('id', projectId)
        .maybeSingle()
      accountId = project?.account_id || null
    }
    if (!accountId) {
      return { success: false, message: 'No organisation found for this webhook event.' }
    }

    const { data: endpoints, error } = await platformDb
      .from('webhook_endpoints')
      .select('id, events, account_id')
      .eq('account_id', accountId)
      .eq('status', 'active')
    if (error) throw error

    const matched = (endpoints || []).filter((ep) =>
      Array.isArray(ep.events) && ep.events.includes(eventType),
    )
    if (!matched.length) {
      return { success: true, data: { queued: 0 }, message: 'No matching webhook endpoints.' }
    }

    const rows = matched.map((ep) => ({
      account_id: accountId,
      endpoint_id: ep.id,
      event_type: eventType,
      resource_type: eventData.resource_type || null,
      resource_id: eventData.resource_id || eventData.id || null,
      payload: eventData,
    }))
    const { error: insertError } = await platformDb.from('webhook_outbox').insert(rows)
    if (insertError) throw insertError

    return { success: true, data: { queued: rows.length }, message: `Queued ${rows.length} webhook(s).` }
  } catch (error) {
    console.error('triggerWebhookEvent', error)
    return { success: false, message: error.message }
  }
}
