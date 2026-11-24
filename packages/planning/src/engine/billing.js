/**
 * v1353 — client billing calculations (pure).
 * Rate precedence: a person line, then the project card, then the client card, then the
 * organisation card. Within a card, a role and a work category together beat either one alone.
 * Money is rounded to cents (half up).
 */

export function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function active(line, onDate) {
  const from = line.effectiveFrom || line.effective_from || '0000-01-01'
  const to = line.effectiveTo || line.effective_to || '9999-12-31'
  return from <= onDate && to >= onDate
}

function specificity(line) {
  let score = 0
  if (line.role) score += 2
  if (line.workCategory || line.work_category) score += 1
  return score
}

function lineRole(line) { return line.role || line.role_name || '' }
function lineCategory(line) { return line.workCategory || line.work_category || '' }
function linePerson(line) { return line.personId || line.user_id || null }

function matches(line, { role, workCategory, unit }) {
  if (line.unit && unit && line.unit !== unit) return false
  const roleOk = !lineRole(line) || lineRole(line) === role
  const catOk = !lineCategory(line) || lineCategory(line) === workCategory
  if (lineRole(line) && lineRole(line) !== role) return false
  if (lineCategory(line) && lineCategory(line) !== workCategory) return false
  return roleOk && catOk && (lineRole(line) || lineCategory(line) || !linePerson(line))
}

/**
 * cards: [{ scope: 'project'|'client'|'organisation', lines: [{ personId, role, workCategory, unit, rate, effectiveFrom, effectiveTo }] }]
 */
export function resolveRate({ personId, role, workCategory, unit = 'hour', onDate, cards = [] }) {
  const order = ['project', 'client', 'organisation']
  for (const scope of order) {
    const card = cards.find((c) => c.scope === scope)
    const hit = (card?.lines || []).find((line) => active(line, onDate) && linePerson(line) && linePerson(line) === personId && (!line.unit || line.unit === unit))
    if (hit) return { rate: Number(hit.rate), source: 'person', unit: hit.unit || unit }
  }
  for (const scope of order) {
    const card = cards.find((c) => c.scope === scope)
    const lines = (card?.lines || [])
      .filter((line) => active(line, onDate) && !linePerson(line) && matches(line, { role, workCategory, unit }))
      .sort((a, b) => specificity(b) - specificity(a))
    if (lines[0]) return { rate: Number(lines[0].rate), source: scope, unit: lines[0].unit || unit }
  }
  return null
}

/** Category default wins, then the project default, then time-and-materials is billable. */
export function billableDefault({ billingType, categoryDefault, projectDefault }) {
  if (categoryDefault === true || categoryDefault === false) return categoryDefault
  if (projectDefault === true || projectDefault === false) return projectDefault
  return billingType === 'time_and_material'
}

export function withMarkup(amount, percent) {
  return roundMoney(Number(amount) * (1 + (Number(percent) || 0) / 100))
}

/** Internal clients and exempt / reverse-charge codes add no tax. */
export function taxForLine(net, code, { internal = false } = {}) {
  const base = roundMoney(net)
  const kind = String(code?.kind || '').toLowerCase()
  const rate = internal || !code || kind === 'exempt' || kind === 'reverse_charge' || kind === 'reverse charge' ? 0 : Number(code.ratePercent ?? code.rate_percent) || 0
  const tax = roundMoney(base * rate / 100)
  return { net: base, tax, gross: roundMoney(base + tax), rate }
}

export function scheduleLineDue(line, today) {
  if (line.status === 'invoiced' || line.status === 'cancelled') return false
  if (line.basis === 'milestone') return !!line.milestoneComplete
  if (line.basis === 'date') return !!line.dueDate && line.dueDate <= today
  if (line.basis === 'recurring') return !!line.nextDue && line.nextDue <= today
  return false
}

export function scheduleAmount(line, contractValue) {
  if (line.percent != null && line.percent !== '') return roundMoney(Number(contractValue) * Number(line.percent) / 100)
  return roundMoney(line.amount)
}

export function convert(amount, exchangeRate) {
  return roundMoney(Number(amount) * (Number(exchangeRate) || 1))
}

const ISSUED = new Set(['issued', 'part_paid', 'paid'])

/** Revenue is issued invoices net of credit notes, in the organisation currency. WIP is approved work not yet invoiced. */
export function projectFigures({ invoices = [], credits = [], wipAmounts = [], cost = 0 }) {
  const revenue = roundMoney(
    invoices.filter((i) => ISSUED.has(i.status)).reduce((s, i) => s + convert(i.net, i.exchangeRate ?? i.exchange_rate), 0)
    - credits.reduce((s, c) => s + convert(c.net, c.exchangeRate ?? c.exchange_rate ?? 1), 0)
  )
  const wip = roundMoney(wipAmounts.reduce((s, n) => s + Number(n || 0), 0))
  const costRounded = roundMoney(cost)
  return { revenue, wip, cost: costRounded, margin: roundMoney(revenue - costRounded) }
}

/** Organisation currency per invoice currency on a date. Same currency is 1. Otherwise the latest rate on or before that date. */
export function exchangeRateFor({ invoiceCurrency, orgCurrency, onDate, rates = [] }) {
  const from = String(invoiceCurrency || orgCurrency || 'USD').toUpperCase()
  const to = String(orgCurrency || from).toUpperCase()
  if (from === to) return 1
  const hit = rates
    .filter((r) => String(r.from || r.from_currency).toUpperCase() === from && String(r.to || r.to_currency).toUpperCase() === to && (r.effectiveDate || r.effective_date) <= onDate)
    .sort((a, b) => String(b.effectiveDate || b.effective_date).localeCompare(String(a.effectiveDate || a.effective_date)))[0]
  return hit ? Number(hit.rate) : 1
}

export function applyInvoiceFilters(rows, { status = 'all', clientId = '' } = {}) {
  return rows.filter((row) => {
    const statusOk = status === 'all' || row.shown === status || row.status === status
    const clientOk = !clientId || row.client_id === clientId
    return statusOk && clientOk
  })
}

/** Branded invoice layout: header facts, a line table, tax by code, then the organisation's text. */
export function buildInvoiceDocument({ invoice, lines = [], instructions = '', footer = '', organisation = '' }) {
  const live = lines.filter((l) => !l.voided)
  const tax = {}
  for (const line of live) {
    const key = line.tax_label || 'Tax'
    tax[key] = roundMoney((tax[key] || 0) + Number(line.tax_amount || 0))
  }
  return {
    sections: [
      { title: 'Invoice', fields: [
        { key: 'organisation', label: 'Organisation', fact: true },
        { key: 'number', label: 'Invoice number', fact: true },
        { key: 'client', label: 'Client', fact: true },
        { key: 'address', label: 'Billing address', fact: true },
        { key: 'invoice_date', label: 'Invoice date', fact: true },
        { key: 'due_date', label: 'Due date', fact: true },
        { key: 'terms', label: 'Payment terms', fact: true },
        { key: 'currency', label: 'Currency', fact: true },
        { key: 'status', label: 'Status', fact: true },
      ] },
      { title: 'Lines', fields: [{
        key: 'lines', label: 'Lines',
        table: {
          headers: ['Description', 'Quantity', 'Rate', 'Amount', 'Tax'],
          rows: live.map((l) => [l.description, String(l.quantity), String(l.rate), String(l.amount), String(l.tax_amount)]),
        },
      }] },
      { title: 'Tax', fields: [{
        key: 'tax', label: 'Tax by code',
        table: { headers: ['Tax code', 'Tax'], rows: Object.entries(tax).map(([code, amount]) => [code, String(amount)]) },
      }] },
      { title: 'Totals', fields: [
        { key: 'net', label: 'Net', fact: true },
        { key: 'tax_total', label: 'Tax', fact: true },
        { key: 'gross', label: 'Total', fact: true },
      ] },
      { title: 'Payment', fields: [
        { key: 'instructions', label: 'Payment instructions', fact: true },
        { key: 'footer', label: 'Footer', fact: true },
      ] },
    ],
    record: {
      organisation: organisation || '',
      number: invoice.invoice_reference || '',
      client: invoice.clients?.name || '',
      address: invoice.clients?.billing_address || '',
      invoice_date: invoice.invoice_date || '',
      due_date: invoice.due_date || '',
      terms: invoice.clients?.payment_terms_days != null && invoice.clients?.payment_terms_days !== '' ? `${invoice.clients.payment_terms_days} days` : '',
      currency: invoice.currency || '',
      status: invoice.status || '',
      net: String(invoice.net_amount ?? ''),
      tax_total: String(invoice.tax_amount ?? ''),
      gross: String(invoice.gross_amount ?? ''),
      instructions: instructions || '',
      footer: footer || '',
    },
  }
}

export function parseRateCardCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l && !l.startsWith('#'))
  const header = (lines.shift() || '').split(',').map((h) => h.trim())
  return lines.map((line) => {
    const cells = line.split(',')
    const row = Object.fromEntries(header.map((h, i) => [h, (cells[i] || '').replace(/^"|"$/g, '').trim()]))
    return {
      role_name: row.role_name || null,
      work_category: row.work_category || null,
      unit: row.unit === 'day' ? 'day' : 'hour',
      rate: Number(row.rate) || 0,
    }
  }).filter((r) => r.rate >= 0 && (r.role_name || r.work_category))
}

/** Reminder step once an invoice is 7, 14 or 30 days past its due date. */
export function reminderStep(dueDate, today) {
  if (!dueDate || !today || today <= dueDate) return null
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86400000)
  if (days >= 30) return '30'
  if (days >= 14) return '14'
  if (days >= 7) return '7'
  return null
}

/** One overdue reminder that has not already been sent for this step. */
export function dueReminder(invoice, sends, today) {
  if (!['issued', 'part_paid'].includes(invoice.status)) return null
  if (paymentStatus(Number(invoice.gross_amount), Number(invoice.amount_paid), invoice.due_date, today) !== 'overdue') return null
  const step = reminderStep(invoice.due_date, today)
  if (!step) return null
  if ((sends || []).some((s) => s.invoice_id === invoice.id && s.step === step)) return null
  const ref = invoice.invoice_reference || 'Invoice'
  return {
    step,
    subject: `Invoice ${ref} is overdue`,
    html: `<p>Invoice ${ref} was due on ${invoice.due_date}.</p>`,
  }
}

export function paymentStatus(net, paid, dueDate, today) {
  const owing = roundMoney(net - paid)
  if (owing <= 0) return 'paid'
  if (paid > 0) return dueDate && dueDate < today ? 'overdue' : 'part_paid'
  return dueDate && dueDate < today ? 'overdue' : 'issued'
}
