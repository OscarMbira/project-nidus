/**
 * Issue Register Export Utilities
 * Provides export functionality for issues (PDF, CSV, Excel)
 */

import * as XLSX from 'xlsx-js-style'
import { addCanvasImagePages } from './pdfCanvasPagination.js'

const ISSUE_EXCEL_HEADERS = [
  '#',
  'Issue Identifier',
  'Type',
  'Title',
  'Status',
  'Priority',
  'Severity',
  'Raised By',
  'Raised Date',
  'Age',
  'Due Date',
  'Owner',
  'Cost Impact',
  'Schedule Impact (Days)',
  'Description',
]

const TYPE_ORDER = [
  'request_for_change',
  'off_specification',
  'problem_concern',
  'bug',
  'enhancement',
  'task',
  'question',
  'blocker',
  'risk',
  'other',
]

/**
 * Normalize text for Excel/CSV so punctuation stays readable.
 * Fancy Unicode dashes/quotes often show as mojibake (e.g. â€") when Excel
 * opens UTF-8 CSV as Windows-1252 — replace with plain ASCII equivalents.
 */
export function sanitizeExportText(value) {
  if (value == null) return ''
  let text = String(value)

  // Already-garbled UTF-8 read as Windows-1252 (e.g. â€" for an en-dash)
  text = text
    .replace(/\u00E2\u20AC\u201D/g, '-') // em dash  E2 80 94 → â€
    .replace(/\u00E2\u20AC\u201C/g, '-') // en dash  E2 80 93 → â€œ
    .replace(/\u00E2\u20AC\u2122/g, "'") // right single quote E2 80 99 → â€™
    .replace(/\u00E2\u20AC\u02DC/g, "'") // left single quote  E2 80 98 → â€˜
    .replace(/\u00E2\u20AC\u0153/g, '"') // left double quote  E2 80 9C → â€œ
    .replace(/\u00E2\u20AC\u009D/g, '"') // right double quote E2 80 9D (if present)
    .replace(/\u00E2\u20AC\u00A6/g, '...') // ellipsis E2 80 A6 → â€¦
    .replace(/\u00C2\u00A0/g, ' ') // Â + nbsp
    .replace(/\u00C2/g, '')

  // Proper Unicode punctuation → plain ASCII (readable in every Excel locale)
  text = text
    .replace(/[\u2013\u2014\u2015\u2212]/g, '-') // en/em/horizontal/minus
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // double quotes
    .replace(/\u2026/g, '...') // ellipsis
    .replace(/\u00A0/g, ' ') // nbsp
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width

  return text
}

/** Compact aging — days since date_raised (fallback created_at). */
function formatIssueAgeCompact(issue) {
  const raw = issue?.date_raised || issue?.created_at
  if (!raw) return '—'
  const start = new Date(raw)
  if (Number.isNaN(start.getTime())) return '—'
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.max(0, Math.round((todayDay - startDay) / 86400000))
  return `${days}d`
}

function formatIssueTypeLabel(type) {
  const labels = {
    request_for_change: 'Request for Change',
    off_specification: 'Off-Specification',
    problem_concern: 'Problem/Concern',
    bug: 'Bug',
    enhancement: 'Enhancement',
    task: 'Task',
    question: 'Question',
    blocker: 'Blocker',
    risk: 'Risk',
    other: 'Other',
  }
  if (!type) return 'Unspecified'
  return labels[type] || String(type).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatFieldLabel(field, key) {
  if (key === 'unspecified' || !key) return field === 'issue_type' ? 'Unspecified' : 'Unset'
  if (field === 'issue_type') return formatIssueTypeLabel(key)
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function countByField(issues, field) {
  const counts = {}
  for (const issue of issues || []) {
    const key = issue?.[field] || 'unspecified'
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
}

/** @returns {{ total: number, typeRows: Array, priorityRows: Array, statusRows: Array }} */
function buildIssueBreakdown(issues) {
  const list = Array.isArray(issues) ? issues : []
  const total = list.length

  const rawTypeCounts = countByField(list, 'issue_type')
  const typeCountMap = Object.fromEntries(rawTypeCounts)
  const typeRows = []
  for (const key of TYPE_ORDER) {
    if (typeCountMap[key]) {
      typeRows.push({ key, label: formatIssueTypeLabel(key), count: typeCountMap[key], field: 'issue_type' })
      delete typeCountMap[key]
    }
  }
  for (const [key, count] of Object.entries(typeCountMap).sort((a, b) => b[1] - a[1])) {
    typeRows.push({
      key,
      label: formatFieldLabel('issue_type', key === 'unspecified' ? '' : key),
      count,
      field: 'issue_type',
    })
  }

  const priorityRows = countByField(list, 'priority').map(([key, count]) => ({
    key,
    label: formatFieldLabel('priority', key),
    count,
    field: 'priority',
  }))
  const statusRows = countByField(list, 'status').map(([key, count]) => ({
    key,
    label: formatFieldLabel('status', key),
    count,
    field: 'status',
  }))

  return { total, typeRows, priorityRows, statusRows }
}

function issueToExcelRow(issue, index) {
  return [
    index + 1,
    sanitizeExportText(issue.issue_identifier || `ISS-${issue.issue_number || ''}`),
    sanitizeExportText((issue.issue_type || '').replace(/_/g, ' ')),
    sanitizeExportText(issue.issue_title || ''),
    sanitizeExportText(issue.status || ''),
    sanitizeExportText(issue.priority || ''),
    sanitizeExportText(issue.severity || ''),
    sanitizeExportText(issue.raised_by?.full_name || issue.raised_by_name || ''),
    issue.date_raised || '',
    formatIssueAgeCompact(issue),
    issue.due_date || '',
    sanitizeExportText(issue.owner?.full_name || issue.owner_name || ''),
    issue.cost_impact || '',
    issue.schedule_impact_days || '',
    sanitizeExportText(issue.issue_description || ''),
  ]
}

function makeExcelSheetName(prefix, label, used) {
  const cleaned = String(label || 'Item')
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let base = `${prefix}-${cleaned}`.slice(0, 31)
  if (!base || base === `${prefix}-`) base = `${prefix}-Item`
  let name = base
  let i = 2
  while (used.has(name)) {
    const suffix = `-${i}`
    name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
    i += 1
  }
  used.add(name)
  return name
}

function styleHeaderRow(ws, colCount) {
  for (let C = 0; C < colCount; C += 1) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[ref]) continue
    ws[ref].s = {
      fill: { fgColor: { rgb: '1D4ED8' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { wrapText: true },
    }
  }
}

function addIssuesDataSheet(wb, sheetName, issues, { backToSummary = false } = {}) {
  const aoa = [ISSUE_EXCEL_HEADERS, ...(issues || []).map((issue, i) => issueToExcelRow(issue, i))]
  let ws
  if (backToSummary) {
    const withNav = [
      ['← Back to Summary'],
      [`Filtered issues: ${issues.length}`],
      [],
      ...aoa,
    ]
    ws = XLSX.utils.aoa_to_sheet(withNav)
    ws.A1 = {
      t: 's',
      v: '← Back to Summary',
      l: { Target: "#'Summary'!A1", Tooltip: 'Return to summary' },
      s: { font: { color: { rgb: '0563C1' }, underline: true, bold: true } },
    }
    // Header row is at index 3
    for (let C = 0; C < ISSUE_EXCEL_HEADERS.length; C += 1) {
      const ref = XLSX.utils.encode_cell({ r: 3, c: C })
      if (!ws[ref]) continue
      ws[ref].s = {
        fill: { fgColor: { rgb: '1D4ED8' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
      }
    }
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 3, c: 0 },
        e: { r: 3 + issues.length, c: ISSUE_EXCEL_HEADERS.length - 1 },
      }),
    }
  } else {
    ws = XLSX.utils.aoa_to_sheet(aoa)
    styleHeaderRow(ws, ISSUE_EXCEL_HEADERS.length)
    if (issues.length > 0) {
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: issues.length, c: ISSUE_EXCEL_HEADERS.length - 1 },
        }),
      }
    }
  }
  ws['!cols'] = ISSUE_EXCEL_HEADERS.map((h) => ({
    wch: h === 'Description' ? 40 : h === 'Title' ? 28 : h === '#' || h === 'Age' ? 6 : 14,
  }))
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
}

function hyperlinkCountCell(count, sheetName) {
  const safe = String(sheetName).replace(/'/g, "''")
  return {
    t: 'n',
    v: count,
    l: { Target: `#'${safe}'!A1`, Tooltip: `Open filtered list (${count})` },
    s: {
      font: { color: { rgb: '0563C1' }, underline: true, bold: true },
      alignment: { horizontal: 'right' },
    },
  }
}

function buildSummarySheet(breakdown, sheetLinks) {
  const { total, typeRows, priorityRows, statusRows } = breakdown
  const maxRows = Math.max(typeRows.length, priorityRows.length, statusRows.length, 1)

  // Columns: Type label | Type count | spacer | Priority label | Priority count | spacer | Status label | Status count
  const aoa = [
    ['Issue Register — Summary'],
    ['Click a count to open the matching filtered issue list.'],
    [`Total issues: ${total}`, '', '', `Generated: ${new Date().toLocaleString()}`],
    [],
    ['By Type', '', '', 'By Priority', '', '', 'By Status', ''],
    ['All Types', total, '', 'All Priorities', total, '', 'All Statuses', total],
  ]

  for (let i = 0; i < maxRows; i += 1) {
    const t = typeRows[i]
    const p = priorityRows[i]
    const s = statusRows[i]
    aoa.push([
      t ? t.label : '',
      t ? t.count : '',
      '',
      p ? p.label : '',
      p ? p.count : '',
      '',
      s ? s.label : '',
      s ? s.count : '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 3 },
    { wch: 16 }, { wch: 10 }, { wch: 3 },
    { wch: 16 }, { wch: 10 },
  ]

  // Title / instruction styles
  if (ws.A1) ws.A1.s = { font: { bold: true, sz: 14, color: { rgb: '111827' } } }
  if (ws.A2) ws.A2.s = { font: { italic: true, color: { rgb: '4B5563' } } }

  // Section headers
  ;['A5', 'D5', 'G5'].forEach((ref) => {
    if (ws[ref]) ws[ref].s = { font: { bold: true, color: { rgb: '1D4ED8' } } }
  })

  // Total row hyperlinks → All Issues
  const allSheet = sheetLinks.all
  ws.B6 = hyperlinkCountCell(total, allSheet)
  ws.E6 = hyperlinkCountCell(total, allSheet)
  ws.H6 = hyperlinkCountCell(total, allSheet)
  ;['A6', 'D6', 'G6'].forEach((ref) => {
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: 'EEF2FF' } },
        font: { bold: true },
      }
    }
  })

  // Category count hyperlinks (data starts at row index 6 = Excel row 7)
  for (let i = 0; i < typeRows.length; i += 1) {
    const row = 6 + i
    const link = sheetLinks.type[typeRows[i].key]
    if (link) {
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = hyperlinkCountCell(typeRows[i].count, link)
    }
  }
  for (let i = 0; i < priorityRows.length; i += 1) {
    const row = 6 + i
    const link = sheetLinks.priority[priorityRows[i].key]
    if (link) {
      ws[XLSX.utils.encode_cell({ r: row, c: 4 })] = hyperlinkCountCell(priorityRows[i].count, link)
    }
  }
  for (let i = 0; i < statusRows.length; i += 1) {
    const row = 6 + i
    const link = sheetLinks.status[statusRows[i].key]
    if (link) {
      ws[XLSX.utils.encode_cell({ r: row, c: 7 })] = hyperlinkCountCell(statusRows[i].count, link)
    }
  }

  return ws
}

/**
 * Export issues to CSV format
 * @param {Array} issues - Array of issue objects
 * @param {string} filename - Output filename
 */

export function exportToCSV(issues, filename = 'issue_register.csv') {
  if (!issues || issues.length === 0) {
    alert('No issues to export')
    return
  }

  // Define CSV headers
  const headers = [
    'Issue ID',
    'Issue Identifier',
    'Type',
    'Title',
    'Status',
    'Priority',
    'Severity',
    'Raised By',
    'Raised Date',
    'Age',
    'Due Date',
    'Owner',
    'Cost Impact',
    'Schedule Impact (Days)',
    'Description'
  ]

  // Convert issues to CSV rows
  const rows = issues.map(issue => [
    issue.id || '',
    sanitizeExportText(issue.issue_identifier || `ISS-${issue.issue_number || ''}`),
    sanitizeExportText(issue.issue_type?.replace(/_/g, ' ') || ''),
    sanitizeExportText(issue.issue_title || ''),
    sanitizeExportText(issue.status || ''),
    sanitizeExportText(issue.priority || ''),
    sanitizeExportText(issue.severity || ''),
    sanitizeExportText(issue.raised_by?.full_name || issue.raised_by_name || ''),
    issue.date_raised || '',
    formatIssueAgeCompact(issue),
    issue.due_date || '',
    sanitizeExportText(issue.owner?.full_name || issue.owner_name || ''),
    issue.cost_impact || '',
    issue.schedule_impact_days || '',
    sanitizeExportText(issue.issue_description || '').replace(/"/g, '""').replace(/\n/g, ' '),
  ])

  // Combine headers and rows (UTF-8 BOM so Excel on Windows detects encoding)
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export issues to Excel with Summary pivot links.
 * Summary counts hyperlink to filtered sheets (By Type / Priority / Status).
 * @param {Array} issues - Array of issue objects
 * @param {string} filename - Output filename
 */
export function exportToExcel(issues, filename = 'issue_register.xlsx') {
  if (!issues || issues.length === 0) {
    alert('No issues to export')
    return
  }

  const list = Array.isArray(issues) ? issues : []
  const breakdown = buildIssueBreakdown(list)
  const wb = XLSX.utils.book_new()
  const usedNames = new Set(['Summary', 'All Issues'])
  const sheetLinks = {
    all: 'All Issues',
    type: {},
    priority: {},
    status: {},
  }

  // Create filtered sheets first so Summary can link to them
  const filterSheets = []

  for (const row of breakdown.typeRows) {
    const name = makeExcelSheetName('T', row.label, usedNames)
    sheetLinks.type[row.key] = name
    const filtered = list.filter((i) => (i.issue_type || 'unspecified') === row.key)
    filterSheets.push({ name, rows: filtered })
  }
  for (const row of breakdown.priorityRows) {
    const name = makeExcelSheetName('P', row.label, usedNames)
    sheetLinks.priority[row.key] = name
    const filtered = list.filter((i) => (i.priority || 'unspecified') === row.key)
    filterSheets.push({ name, rows: filtered })
  }
  for (const row of breakdown.statusRows) {
    const name = makeExcelSheetName('S', row.label, usedNames)
    sheetLinks.status[row.key] = name
    const filtered = list.filter((i) => (i.status || 'unspecified') === row.key)
    filterSheets.push({ name, rows: filtered })
  }

  const summaryWs = buildSummarySheet(breakdown, sheetLinks)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
  addIssuesDataSheet(wb, 'All Issues', list, { backToSummary: true })

  for (const { name, rows } of filterSheets) {
    addIssuesDataSheet(wb, name, rows, { backToSummary: true })
  }

  const outName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  XLSX.writeFile(wb, outName)
}

/**
 * Export issue to PDF format
 * @param {Object} issue - Issue object
 * @param {string} filename - Output filename
 */
export async function exportIssueToPDF(issue, filename = 'issue.pdf') {
  try {
    // Dynamic import of jsPDF and html2canvas
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    // Create a temporary container for the issue content
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '800px'
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.color = 'black'
    
    container.innerHTML = generateIssueHTML(issue)
    document.body.appendChild(container)

    // Generate PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    addCanvasImagePages(pdf, imgData, { imgWidth, imgHeight, pageHeight })

    pdf.save(filename)
    
    // Cleanup
    document.body.removeChild(container)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    alert('Error exporting to PDF. Please ensure jsPDF and html2canvas are installed.')
  }
}

/**
 * Export issue register to PDF
 * @param {Array} issues - Array of issue objects
 * @param {Object} register - Issue register object
 * @param {string} filename - Output filename
 */
export async function exportRegisterToPDF(issues, register, filename = 'issue_register.pdf') {
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.width = '800px'
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.color = 'black'
    
    container.innerHTML = generateRegisterHTML(issues, register)
    document.body.appendChild(container)

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    addCanvasImagePages(pdf, imgData, { imgWidth, imgHeight, pageHeight })

    pdf.save(filename)
    
    document.body.removeChild(container)
  } catch (error) {
    console.error('Error exporting register to PDF:', error)
    alert('Error exporting to PDF. Please ensure jsPDF and html2canvas are installed.')
  }
}

/**
 * Generate HTML for a single issue (for PDF export)
 */
function generateIssueHTML(issue) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  return `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        Issue: ${issue.issue_identifier || `ISS-${issue.issue_number || ''}`}
      </h1>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #374151; margin-top: 20px;">Basic Information</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold; width: 200px;">Title</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.issue_title || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Type</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${(issue.issue_type || '').replace('_', ' ')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Status</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.status || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Priority</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.priority || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Severity</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.severity || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Raised By</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.raised_by?.full_name || issue.raised_by_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Raised Date</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${formatDate(issue.date_raised)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Owner</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.owner?.full_name || issue.owner_name || 'Unassigned'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px;">
        <h2 style="color: #374151; margin-top: 20px;">Description</h2>
        <div style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f9fafb; margin-top: 10px; white-space: pre-wrap;">
          ${issue.issue_description || 'No description provided'}
        </div>
      </div>

      ${issue.impact_description ? `
      <div style="margin-top: 30px;">
        <h2 style="color: #374151; margin-top: 20px;">Impact Analysis</h2>
        <div style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f9fafb; margin-top: 10px; white-space: pre-wrap;">
          ${issue.impact_description}
        </div>
        ${issue.cost_impact || issue.schedule_impact_days ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          ${issue.cost_impact ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold; width: 200px;">Cost Impact</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">$${parseFloat(issue.cost_impact).toLocaleString()}</td>
          </tr>
          ` : ''}
          ${issue.schedule_impact_days ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold;">Schedule Impact</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${issue.schedule_impact_days} days</td>
          </tr>
          ` : ''}
        </table>
        ` : ''}
      </div>
      ` : ''}

      ${issue.resolution_description ? `
      <div style="margin-top: 30px;">
        <h2 style="color: #374151; margin-top: 20px;">Resolution</h2>
        <div style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f0fdf4; margin-top: 10px; white-space: pre-wrap;">
          ${issue.resolution_description}
        </div>
        ${issue.resolution_date ? `
        <p style="margin-top: 10px; color: #6b7280;">Resolved: ${formatDate(issue.resolution_date)}</p>
        ` : ''}
      </div>
      ` : ''}
    </div>
  `
}

/**
 * Generate HTML for issue register (for PDF export)
 */
function renderSummaryCountTable(rows, totalLabel, totalValue) {
  const summaryCellLabel =
    'padding: 5px 10px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold; white-space: nowrap; font-size: 11px;'
  const summaryCellValue =
    'padding: 5px 10px; border: 1px solid #e5e7eb; text-align: right; white-space: nowrap; width: 3rem; font-size: 11px;'
  const totalLabelStyle =
    'padding: 5px 10px; border: 1px solid #e5e7eb; background-color: #eef2ff; font-weight: bold; white-space: nowrap; font-size: 11px;'
  const totalValueStyle =
    'padding: 5px 10px; border: 1px solid #e5e7eb; background-color: #eef2ff; text-align: right; white-space: nowrap; width: 3rem; font-weight: bold; font-size: 11px;'

  return `
    <table style="width: auto; border-collapse: collapse;">
      <tr>
        <td style="${totalLabelStyle}">${totalLabel}</td>
        <td style="${totalValueStyle}">${totalValue}</td>
      </tr>
      ${rows
        .map(
          ([label, count]) => `
      <tr>
        <td style="${summaryCellLabel}">${label}</td>
        <td style="${summaryCellValue}">${count}</td>
      </tr>`
        )
        .join('')}
    </table>
  `
}

function generateRegisterHTML(issues, register) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString()
  }

  const generatedAt = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const list = Array.isArray(issues) ? issues : []
  const { total, typeRows, priorityRows, statusRows } = buildIssueBreakdown(list)
  const orderedTypeRows = typeRows.map((r) => [r.label, r.count])
  const orderedPriorityRows = priorityRows.map((r) => [r.label, r.count])
  const orderedStatusRows = statusRows.map((r) => [r.label, r.count])
  const typeSum = typeRows.reduce((sum, r) => sum + r.count, 0)

  return `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        Issue Register: ${register?.register_reference || 'N/A'}
      </h1>
      
      <div style="margin-top: 16px;">
        <h2 style="color: #374151; margin: 0 0 8px 0; font-size: 16px;">Summary</h2>
        <p style="margin: 0 0 10px 0; font-size: 11px; color: #4b5563;">
          Total issues in this export: <strong>${total}</strong>
          ${typeSum === total ? '' : ` <span style="color:#b45309;">(type breakdown sums to ${typeSum})</span>`}
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start;">
          <div>
            <div style="font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 4px;">By Type</div>
            ${renderSummaryCountTable(orderedTypeRows, 'All Types', total)}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 4px;">By Priority</div>
            ${renderSummaryCountTable(orderedPriorityRows, 'All Priorities', total)}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 4px;">By Status</div>
            ${renderSummaryCountTable(orderedStatusRows, 'All Statuses', total)}
          </div>
        </div>
      </div>

      <div style="margin-top: 24px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
          <h2 style="color: #374151; margin: 0; font-size: 16px;">Issues</h2>
          <p style="margin: 0; font-size: 11px; color: #374151; text-align: right; white-space: nowrap;">
            <strong>Generated:</strong> ${generatedAt}
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: center; width: 28px;">#</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">ID</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Title</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Type</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Status</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Priority</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Severity</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Raised</th>
              <th style="padding: 4px 2px; border: 1px solid #e5e7eb; text-align: center; width: 36px;">Age</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Due</th>
              <th style="padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left;">Owner</th>
            </tr>
          </thead>
          <tbody>
            ${issues.map((issue, index) => `
              <tr>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${index + 1}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb;">${issue.issue_identifier || `ISS-${issue.issue_number || ''}`}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb;">${(issue.issue_title || '').substring(0, 50)}${(issue.issue_title || '').length > 50 ? '...' : ''}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb;">${(issue.issue_type || '').replace(/_/g, ' ')}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb;">${issue.status || 'N/A'}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb;">${issue.priority || 'N/A'}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb;">${issue.severity || 'N/A'}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb; white-space: nowrap;">${formatDate(issue.date_raised)}</td>
                <td style="padding: 4px 2px; border: 1px solid #e5e7eb; text-align: center; white-space: nowrap; font-weight: 600; width: 36px;">${formatIssueAgeCompact(issue)}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb; white-space: nowrap;">${formatDate(issue.due_date)}</td>
                <td style="padding: 5px 4px; border: 1px solid #e5e7eb;">${issue.owner?.full_name || issue.owner_name || 'Unassigned'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `
}

/**
 * Generate printable HTML for an issue
 */
export function generatePrintableHTML(issue) {
  return generateIssueHTML(issue)
}

/**
 * Generate printable HTML for issue register
 */
export function generateRegisterPrintableHTML(issues, register) {
  return generateRegisterHTML(issues, register)
}
