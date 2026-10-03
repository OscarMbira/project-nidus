export const COMMUNICATION_OPTION_KINDS = [
  { value: 'format', label: 'Format' },
  { value: 'detail_level', label: 'Level of detail' },
]

export function communicationOptionKindLabel(kind) {
  return COMMUNICATION_OPTION_KINDS.find((row) => row.value === kind)?.label || kind || ''
}

export function communicationOptionsBasePath(pathname) {
  return String(pathname || '').startsWith('/simulator')
    ? '/simulator/stakeholders/communication-options'
    : '/platform/stakeholders/communication-options'
}

export function communicationOptionPath(basePath, row, mode) {
  const kind = encodeURIComponent(row.option_kind || '')
  const code = encodeURIComponent(row.option_code || '')
  if (mode === 'edit') return `${basePath}/${kind}/${code}/edit`
  return `${basePath}/${kind}/${code}`
}
