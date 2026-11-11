/**
 * Requirements register categories (values match the requirements_register.category CHECK constraint).
 * Used by the register list filter and the IT → Requirements menu links (`?category=`, v1338).
 */
export const REQUIREMENT_CATEGORIES = [
  { value: 'business', label: 'Business' },
  { value: 'functional', label: 'Functional' },
  { value: 'non_functional', label: 'Non-functional' },
  { value: 'technical', label: 'Technical' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'other', label: 'Other' },
]

export function requirementCategoryLabel(value) {
  return REQUIREMENT_CATEGORIES.find((c) => c.value === value)?.label || ''
}

/** A `?category=` value the register understands, or ''. */
export function requirementCategoryFromQuery(value) {
  return REQUIREMENT_CATEGORIES.some((c) => c.value === value) ? value : ''
}

/** Page heading for a filtered list, e.g. "Functional requirements". */
export function requirementListTitle(category) {
  const label = requirementCategoryLabel(category)
  return label ? `${label} requirements` : 'Requirements register'
}
