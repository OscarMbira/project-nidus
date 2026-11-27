/**
 * v1359 (gap B1) — active currencies for a currency picker, and the organisation's own currency (rule 68) as the
 * default for new records. The list barely changes, so it is cached in sessionStorage for the tab (rule 66,
 * same shape as the nidus:acct:* caches). `currencies` is a shared public lookup, read through platformDb in every
 * app. Returns { options: [{ value: 'GBP', label: 'GBP — Pound Sterling' }], orgCurrency: 'GBP' | null, loading }.
 */
import { useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import { useRegionalFormatSettings } from './useRegionalFormatSettings.js'

export const CURRENCY_CACHE_KEY = 'nidus:currencies:v1'

function readCache() {
  try {
    const raw = globalThis.sessionStorage?.getItem(CURRENCY_CACHE_KEY)
    const list = raw ? JSON.parse(raw) : null
    return Array.isArray(list) && list.length ? list : null
  } catch { return null }
}

export function toCurrencyOptions(rows) {
  return (rows || [])
    .filter((c) => c?.code)
    .map((c) => ({ value: String(c.code).toUpperCase(), label: `${String(c.code).toUpperCase()} — ${c.name || c.code}` }))
}

export async function loadCurrencyOptions(db = platformDb) {
  const cached = readCache()
  if (cached) return cached
  const { data, error } = await db.from('currencies').select('code, name')
    .eq('is_active', true).eq('is_deleted', false).order('name', { ascending: true })
  if (error) throw new Error(error.message)
  const options = toCurrencyOptions(data)
  try { globalThis.sessionStorage?.setItem(CURRENCY_CACHE_KEY, JSON.stringify(options)) } catch { /* private window */ }
  return options
}

export function useCurrencyOptions() {
  const settings = useRegionalFormatSettings()
  const [options, setOptions] = useState(() => readCache() || [])
  const [loading, setLoading] = useState(options.length === 0)
  useEffect(() => {
    let cancelled = false
    loadCurrencyOptions()
      .then((list) => { if (!cancelled) setOptions(list) })
      .catch(() => { /* the picker shows no options; the record keeps its value */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])
  const orgCurrency = settings?.currency_code ? String(settings.currency_code).toUpperCase() : null
  return { options, orgCurrency, loading }
}
