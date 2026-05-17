/**
 * Email Configuration Service
 * Manages email provider settings in email_configurations (Resend API, SMTP).
 * Only PMO Admins may read or write these settings.
 */

import { appDb } from './supabase/supabaseClient'

const TABLE = 'email_configurations'
const CONFIG_NAME_SMTP = 'Primary SMTP'
const CONFIG_NAME_RESEND = 'Primary Resend'

const MASKED_SECRET = '••••••••'

const DB_TIMEOUT_MS = 12_000
const SAVE_RPC_TIMEOUT_MS = 15_000
const SEND_EMAIL_TIMEOUT_MS = 15_000

const SAVE_EMAIL_RPC = 'save_email_configuration_as_admin'

/** Verified Resend sending domain for Project Astute updates */
export const RESEND_DEFAULT_FROM_EMAIL = 'noreply@updates.projectastute.com'
export const RESEND_DEFAULT_FROM_DOMAIN = 'updates.projectastute.com'

export { MASKED_SECRET }

function withTimeout(promise, ms, label = 'Request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    }),
  ])
}

function isSaveEmailRpcUnavailable(error) {
  const msg = String(error?.message || '').toLowerCase()
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  )
}

/** Deactivate the other provider row (legacy fallback when v578 RPC is not deployed). */
async function deactivateSiblingProvider(activeConfigName) {
  const sibling =
    activeConfigName === CONFIG_NAME_RESEND ? CONFIG_NAME_SMTP : CONFIG_NAME_RESEND
  const { error } = await withTimeout(
    appDb
      .from(TABLE)
      .update({ is_active: false, is_default: false, updated_at: new Date().toISOString() })
      .eq('config_name', sibling)
      .eq('is_deleted', false),
    DB_TIMEOUT_MS,
    'Deactivate sibling email provider',
  )
  if (error) console.warn('deactivateSiblingProvider:', error.message)
}

async function fetchConfigByName(configName) {
  const { data, error } = await withTimeout(
    appDb
      .from(TABLE)
      .select('id, api_key, smtp_config')
      .eq('config_name', configName)
      .eq('is_deleted', false)
      .maybeSingle(),
    DB_TIMEOUT_MS,
    'Load email configuration row',
  )
  if (error) throw error
  return data
}

const RESULT_COLUMNS =
  'id, config_name, service_provider, from_email, from_name, reply_to_email, is_active, is_default, updated_at'

async function upsertConfigDirect(payload) {
  const { data, error } = await withTimeout(
    appDb.from(TABLE).upsert(payload, { onConflict: 'config_name' }).select(RESULT_COLUMNS).single(),
    DB_TIMEOUT_MS,
    'Save email configuration',
  )
  if (error) throw error
  return data
}

async function upsertConfigViaRpc(payload) {
  const { data, error } = await withTimeout(
    appDb.rpc(SAVE_EMAIL_RPC, {
      p_config_name: payload.config_name,
      p_service_provider: payload.service_provider,
      p_from_email: payload.from_email,
      p_from_name: payload.from_name ?? null,
      p_reply_to_email: payload.reply_to_email ?? null,
      p_api_key: payload.api_key ?? null,
      p_smtp_config: payload.smtp_config ?? null,
    }),
    SAVE_RPC_TIMEOUT_MS,
    'Save email configuration',
  )
  if (error) throw error
  if (!data?.id) {
    throw new Error('Save email configuration returned no row — check Supabase function logs.')
  }
  return data
}

/** Prefer v578 RPC (bypasses RLS); fall back to direct upsert + sibling deactivate. */
async function upsertConfig(payload) {
  try {
    return await upsertConfigViaRpc(payload)
  } catch (error) {
    if (!isSaveEmailRpcUnavailable(error)) throw error
    console.warn(
      `${SAVE_EMAIL_RPC} unavailable — using direct upsert. Run SQL/v578_save_email_configuration_rpc.sql in Supabase.`,
      error?.message,
    )
    const result = await upsertConfigDirect(payload)
    await deactivateSiblingProvider(payload.config_name)
    return result
  }
}

function maskSecret(value) {
  return value ? MASKED_SECRET : ''
}

function formatSaveError(error, fallback) {
  const msg = error?.message || fallback
  if (error?.code === '42501' || /forbidden|not authorized/i.test(msg)) {
    return 'You do not have permission to manage email settings. A PMO or system admin role is required.'
  }
  if (/timed out/i.test(msg)) {
    return `${msg} If this persists, run SQL/v578_save_email_configuration_rpc.sql in the Supabase SQL Editor, wait ~30s for schema reload, then retry.`
  }
  return msg
}

/**
 * Fetch the active email configuration.
 * Secrets (SMTP password, Resend API key) are masked before returning to the UI.
 */
export async function getEmailConfig() {
  try {
    const { data, error } = await withTimeout(
      appDb
        .from(TABLE)
        .select(
          'id, config_name, service_provider, api_key, smtp_config, from_email, from_name, reply_to_email, is_active, is_default, updated_at',
        )
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      DB_TIMEOUT_MS,
      'Load email settings',
    )

    if (error) throw error

    if (!data) return { success: true, data: null, error: null }

    const provider = (data.service_provider || 'smtp').toLowerCase()
    const smtpSafe = data.smtp_config
      ? { ...data.smtp_config, password: maskSecret(data.smtp_config.password) }
      : null

    return {
      success: true,
      data: {
        ...data,
        service_provider: provider,
        api_key: provider === 'resend' ? maskSecret(data.api_key) : null,
        smtp_config: smtpSafe,
      },
      error: null,
    }
  } catch (error) {
    console.error('getEmailConfig:', error)
    return { success: false, data: null, error: error.message || 'Failed to load email configuration' }
  }
}

/**
 * Save Resend API configuration.
 * @param {object} cfg - { api_key, from_email, from_name, reply_to_email }
 * @param {boolean} apiKeyChanged - false to keep existing API key
 */
export async function saveResendConfig(cfg, apiKeyChanged = true) {
  try {
    const { api_key, from_email, from_name, reply_to_email } = cfg

    if (!from_email) {
      return { success: false, data: null, error: 'From email is required.' }
    }

    const fromDomain = String(from_email).split('@')[1]?.toLowerCase()
    if (fromDomain && fromDomain !== RESEND_DEFAULT_FROM_DOMAIN) {
      console.warn(
        `Resend from_email domain "${fromDomain}" differs from verified domain "${RESEND_DEFAULT_FROM_DOMAIN}"`,
      )
    }

    const needsExistingKey = !apiKeyChanged || api_key === MASKED_SECRET || !api_key
    const existingRow = needsExistingKey ? await fetchConfigByName(CONFIG_NAME_RESEND) : null

    let finalApiKey = api_key
    if (needsExistingKey) {
      finalApiKey = existingRow?.api_key ?? ''
    }

    if (!finalApiKey || !String(finalApiKey).startsWith('re_')) {
      return { success: false, data: null, error: 'A valid Resend API key (starts with re_) is required.' }
    }

    const payload = {
      config_name: CONFIG_NAME_RESEND,
      service_provider: 'resend',
      api_key: String(finalApiKey).trim(),
      smtp_config: null,
      from_email: String(from_email).trim().toLowerCase(),
      from_name: String(from_name || 'Project Nidus').trim(),
      reply_to_email: reply_to_email ? String(reply_to_email).trim().toLowerCase() : null,
      is_active: true,
      is_default: true,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    }

    const result = await upsertConfig(payload)

    return { success: true, data: result, error: null }
  } catch (error) {
    console.error('saveResendConfig:', error)
    return {
      success: false,
      data: null,
      error: formatSaveError(error, 'Failed to save Resend configuration'),
    }
  }
}

/**
 * Save (upsert) an SMTP email configuration.
 * @param {boolean} passwordChanged - whether the user typed a new password
 */
export async function saveEmailConfig(cfg, passwordChanged = true) {
  try {
    const { host, port, username, password, tls, from_email, from_name, reply_to_email } = cfg

    if (!host || !port || !from_email) {
      return { success: false, data: null, error: 'Host, port and from_email are required.' }
    }

    const needsExistingPassword = !passwordChanged || password === MASKED_SECRET || !password
    const existingRow = needsExistingPassword ? await fetchConfigByName(CONFIG_NAME_SMTP) : null

    let finalPassword = password
    if (needsExistingPassword) {
      finalPassword = existingRow?.smtp_config?.password ?? ''
    }

    const smtpConfig = {
      host: String(host).trim(),
      port: parseInt(port, 10) || 587,
      username: String(username || '').trim(),
      password: finalPassword,
      tls: tls === true || tls === 'true',
    }

    const payload = {
      config_name: CONFIG_NAME_SMTP,
      service_provider: 'smtp',
      api_key: null,
      smtp_config: smtpConfig,
      from_email: String(from_email).trim().toLowerCase(),
      from_name: String(from_name || 'Project Nidus').trim(),
      reply_to_email: reply_to_email ? String(reply_to_email).trim().toLowerCase() : null,
      is_active: true,
      is_default: true,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    }

    const result = await upsertConfig(payload)

    return { success: true, data: result, error: null }
  } catch (error) {
    console.error('saveEmailConfig:', error)
    return {
      success: false,
      data: null,
      error: formatSaveError(error, 'Failed to save email configuration'),
    }
  }
}

/**
 * Send a test email via the send-email Edge Function.
 */
export async function sendTestEmail(toEmail) {
  try {
    if (!toEmail) return { success: false, error: 'No recipient email provided.' }

    const { data, error } = await withTimeout(
      appDb.functions.invoke('send-email', {
        body: {
          to: toEmail,
          subject: 'Project Nidus — Email Configuration Test',
          html: [
            '<div style="font-family:sans-serif;padding:32px;max-width:480px;">',
            '<h2 style="color:#1e40af;">Email Configuration Test</h2>',
            '<p>This test email confirms your email provider is working correctly in <strong>Project Nidus</strong>.</p>',
            `<p style="color:#6b7280;font-size:13px;">Sent at ${new Date().toUTCString()}</p>`,
            '</div>',
          ].join(''),
          text: `Email Configuration Test\n\nThis test email confirms your email provider is working correctly in Project Nidus.\n\nSent at ${new Date().toUTCString()}`,
          template_id: 'email_config_test',
        },
      }),
      SEND_EMAIL_TIMEOUT_MS,
      'Send test email',
    )

    if (error) {
      let detail = error.message || 'Edge Function error'
      try {
        if (error.context && typeof error.context.text === 'function') {
          const raw = await error.context.text()
          if (raw) {
            try {
              const json = JSON.parse(raw)
              detail = json?.error || json?.message || detail
            } catch {
              detail = raw.length < 300 ? raw : detail
            }
          }
        }
      } catch {
        /* response body already consumed or unavailable */
      }
      console.error('sendTestEmail:', detail)
      return { success: false, error: detail }
    }

    if (data && data.success === false) {
      return { success: false, error: data.error || 'Test email failed' }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('sendTestEmail:', error)
    return { success: false, error: error.message || 'Test email failed' }
  }
}

/**
 * Delete (soft-delete) the active email configuration.
 */
export async function deleteEmailConfig(id) {
  try {
    const { error } = await withTimeout(
      appDb
        .from(TABLE)
        .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id),
      DB_TIMEOUT_MS,
      'Remove email configuration',
    )
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteEmailConfig:', error)
    return { success: false, error: error.message || 'Failed to delete configuration' }
  }
}
