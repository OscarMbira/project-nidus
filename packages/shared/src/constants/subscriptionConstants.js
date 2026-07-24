export function formatPlanLabel(planType) {
  if (!planType) return '—'
  return planType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Parse feature strings from subscription_plans.features */
export function parseSubscriptionFeatures(record) {
  if (!record) return []

  if (Array.isArray(record.features)) {
    return record.features.map((item) => String(item ?? '').trim()).filter(Boolean)
  }

  if (typeof record.features === 'string') {
    try {
      const parsed = JSON.parse(record.features)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? '').trim()).filter(Boolean)
      }
    } catch {
      return record.features.trim() ? [record.features.trim()] : []
    }
  }

  const custom = record.custom_features
  if (Array.isArray(custom)) {
    return custom.map((item) => String(item ?? '').trim()).filter(Boolean)
  }
  if (custom?.features && Array.isArray(custom.features)) {
    return custom.features.map((item) => String(item ?? '').trim()).filter(Boolean)
  }

  return []
}

export function normalizeFeatureEditorRows(features) {
  const cleaned = (features || []).map((item) => String(item ?? '').trim())
  return cleaned.length > 0 ? cleaned : ['']
}
