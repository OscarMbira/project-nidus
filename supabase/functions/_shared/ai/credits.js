/**
 * v1272 — AI credits and gate decisions (pure; used by edge functions and unit tests).
 *
 * Credits (D6): 1 credit = ai_platform_settings.credit_unit_usd of model cost. Token prices are
 * USD per 1M tokens, read from ai_platform_settings.model_prices — no prices in code.
 */

/** Add two usage objects (Anthropic `usage` shape). */
export function addUsage(a = {}, b = {}) {
  return {
    input_tokens: (a.input_tokens || 0) + (b.input_tokens || 0),
    output_tokens: (a.output_tokens || 0) + (b.output_tokens || 0),
    cache_read_input_tokens: (a.cache_read_input_tokens || 0) + (b.cache_read_input_tokens || 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens || 0) + (b.cache_creation_input_tokens || 0),
  }
}

/**
 * Model cost in USD for one usage object.
 * @param {object} usage   Anthropic usage
 * @param {object} price   { input, output, cache_read, cache_write } USD per 1M tokens
 */
export function usageCostUsd(usage = {}, price = {}) {
  const m = 1_000_000
  return (
    ((usage.input_tokens || 0) * (price.input || 0)) / m +
    ((usage.output_tokens || 0) * (price.output || 0)) / m +
    ((usage.cache_read_input_tokens || 0) * (price.cache_read ?? (price.input || 0) * 0.1)) / m +
    ((usage.cache_creation_input_tokens || 0) * (price.cache_write ?? (price.input || 0) * 1.25)) / m
  )
}

/**
 * Credits for usage spread across models.
 * @param {Array<{model: string, usage: object}>} parts
 * @param {object} settings  { model_prices, credit_unit_usd }
 * @returns {number} credits rounded up to 3 decimals
 */
export function computeCredits(parts, settings) {
  const prices = settings?.model_prices || {}
  const unit = Number(settings?.credit_unit_usd) || 0.001
  let usd = 0
  for (const p of parts || []) {
    const price = prices[p.model]
    if (!price) throw new Error(`No price configured for model ${p.model}`)
    usd += usageCostUsd(p.usage, price)
  }
  return Math.ceil((usd / unit) * 1000) / 1000
}

/**
 * Gate decision from public.ai_org_status (+ optional app-level checks).
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function evaluateGate(status) {
  if (!status) return { allowed: false, reason: 'no_account' }
  if (status.allowed === true) return { allowed: true, reason: null }
  return { allowed: false, reason: status.reason || 'not_enabled' }
}

/** True when the 80% (warn_percent) email should be sent for this period. */
export function shouldSendWarning(status) {
  if (!status || !['warn', 'blocked'].includes(status.warning_level)) return false
  if (!status.period_start) return false
  if (!status.last_warning_period_start) return true
  return new Date(status.last_warning_period_start) < new Date(status.period_start)
}

/** Fill {placeholders} in a fixed AI UI message. */
export function fillMessage(text, values = {}) {
  return String(text || '').replace(/\{(\w+)\}/g, (_, k) => (values[k] ?? `{${k}}`))
}

/** Language code → the base language used by ai_ui_messages ('pt-BR' → 'pt'). Callers fall back to 'en'. */
export function messageLanguage(code) {
  return String(code || 'en').toLowerCase().split(/[-_]/)[0] || 'en'
}
