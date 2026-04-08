/**
 * testImportService.js
 * Parses CSV, Excel, JSON, and XML files into test case records
 * ready for batch insert via testCaseService.batchCreateTestCases()
 *
 * Dependencies (already in project):
 *   - papaparse  (CSV parsing)
 *   - xlsx / sheetjs  (Excel parsing)
 */

// ─── Field Mapping ────────────────────────────────────────────────────────────

export const IMPORT_FIELD_LABELS = {
  title:              'Title *',
  description:        'Description',
  preconditions:      'Preconditions',
  expected_result:    'Expected Result',
  test_type:          'Test Type (manual/automated/exploratory)',
  priority:           'Priority (critical/high/medium/low)',
  status:             'Status (draft/active)',
  module_area:        'Module / Area',
  requirement_ref:    'Requirement Ref',
  tags:               'Tags (comma-separated)',
  suite_name:         'Suite Name (optional)',
  estimated_duration_minutes: 'Estimated Duration (minutes)',
}

export const REQUIRED_FIELDS = ['title']

export const VALID_VALUES = {
  test_type: ['manual', 'automated', 'exploratory'],
  priority:  ['critical', 'high', 'medium', 'low'],
  status:    ['draft', 'active', 'deprecated', 'archived'],
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

export async function parseCSV(file) {
  const Papa = (await import('papaparse')).default
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: result => resolve({ rows: result.data, errors: result.errors }),
      error: err => reject(err),
    })
  })
}

// ─── Excel Parser ─────────────────────────────────────────────────────────────

export async function parseExcel(file) {
  const XLSX = (await import('xlsx')).default
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  // Normalise headers
  const normalised = rows.map(row => {
    const normRow = {}
    Object.keys(row).forEach(key => {
      normRow[key.trim().toLowerCase().replace(/\s+/g, '_')] = row[key]
    })
    return normRow
  })
  return { rows: normalised, errors: [] }
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

export async function parseJSON(file) {
  const text = await file.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return { rows: [], errors: [{ message: 'Invalid JSON: ' + e.message }] }
  }
  const rows = Array.isArray(parsed) ? parsed : parsed.test_cases || parsed.data || []
  return { rows, errors: [] }
}

// ─── XML Parser ───────────────────────────────────────────────────────────────

export async function parseXML(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    return { rows: [], errors: [{ message: 'Invalid XML: ' + parseError.textContent }] }
  }

  const items = Array.from(doc.querySelectorAll('test_case, testCase, TestCase, item'))
  const rows = items.map(el => {
    const row = {}
    Array.from(el.children).forEach(child => {
      row[child.tagName.toLowerCase().replace(/-/g, '_')] = child.textContent.trim()
    })
    return row
  })
  return { rows, errors: [] }
}

// ─── Auto-detect format and parse ────────────────────────────────────────────

export async function parseImportFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv'))                       return parseCSV(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcel(file)
  if (name.endsWith('.json'))                      return parseJSON(file)
  if (name.endsWith('.xml'))                       return parseXML(file)
  throw new Error(`Unsupported file format. Please use CSV, Excel (.xlsx), JSON, or XML.`)
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateImportRows(rows, projectId, suiteMap = {}, options = {}) {
  const projectKey = options.projectKey || 'project_id'
  const validRows   = []
  const invalidRows = []

  rows.forEach((raw, index) => {
    const errors = []

    // Required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!raw[field] || String(raw[field]).trim() === '') {
        errors.push(`"${field}" is required`)
      }
    })

    // Enum validation
    Object.entries(VALID_VALUES).forEach(([field, valid]) => {
      if (raw[field] && !valid.includes(String(raw[field]).trim().toLowerCase())) {
        errors.push(`"${field}" must be one of: ${valid.join(', ')}`)
      }
    })

    // Numeric fields
    if (raw.estimated_duration_minutes && isNaN(Number(raw.estimated_duration_minutes))) {
      errors.push('"estimated_duration_minutes" must be a number')
    }

    const mapped = {
      [projectKey]: projectId,
      title:       String(raw.title || '').trim(),
      description: String(raw.description || '').trim() || null,
      preconditions:      String(raw.preconditions || '').trim() || null,
      expected_result:    String(raw.expected_result || '').trim() || null,
      test_type:          String(raw.test_type || 'manual').trim().toLowerCase(),
      priority:           String(raw.priority || 'medium').trim().toLowerCase(),
      status:             String(raw.status || 'active').trim().toLowerCase(),
      module_area:        String(raw.module_area || '').trim() || null,
      requirement_ref:    String(raw.requirement_ref || '').trim() || null,
      estimated_duration_minutes: raw.estimated_duration_minutes
        ? Number(raw.estimated_duration_minutes) : null,
      tags: raw.tags
        ? JSON.stringify(String(raw.tags).split(',').map(t => t.trim()).filter(Boolean))
        : '[]',
      // Resolve suite_name → suite_id if provided
      suite_id: raw.suite_name && suiteMap[raw.suite_name.trim()]
        ? suiteMap[raw.suite_name.trim()]
        : null,
    }

    if (errors.length > 0) {
      invalidRows.push({ rowIndex: index + 2, raw, errors })  // +2: header row + 1-based
    } else {
      validRows.push(mapped)
    }
  })

  return { validRows, invalidRows }
}

// ─── Template Generators ─────────────────────────────────────────────────────

export function downloadCSVTemplate() {
  const headers = Object.keys(IMPORT_FIELD_LABELS).join(',')
  const example = [
    '"Login with valid credentials","Test that a user can log in","User must be registered","Login page loads","manual","high","active","Authentication","REQ-001","login,auth","","5"'
  ].join('\n')
  const content = `${headers}\n${example}`
  triggerDownload(content, 'test_cases_template.csv', 'text/csv')
}

export function downloadJSONTemplate() {
  const template = JSON.stringify([{
    title:              'Login with valid credentials',
    description:        'Test that a user can log in',
    preconditions:      'User must be registered',
    expected_result:    'Login page loads successfully',
    test_type:          'manual',
    priority:           'high',
    status:             'active',
    module_area:        'Authentication',
    requirement_ref:    'REQ-001',
    tags:               'login,auth',
    suite_name:         'Smoke Tests',
    estimated_duration_minutes: 5,
  }], null, 2)
  triggerDownload(template, 'test_cases_template.json', 'application/json')
}

export function downloadXMLTemplate() {
  const template = `<?xml version="1.0" encoding="UTF-8"?>
<test_cases>
  <test_case>
    <title>Login with valid credentials</title>
    <description>Test that a user can log in</description>
    <preconditions>User must be registered</preconditions>
    <expected_result>Login page loads successfully</expected_result>
    <test_type>manual</test_type>
    <priority>high</priority>
    <status>active</status>
    <module_area>Authentication</module_area>
    <requirement_ref>REQ-001</requirement_ref>
    <tags>login,auth</tags>
    <suite_name>Smoke Tests</suite_name>
    <estimated_duration_minutes>5</estimated_duration_minutes>
  </test_case>
</test_cases>`
  triggerDownload(template, 'test_cases_template.xml', 'application/xml')
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
