/**
 * v1353 — client billing reads and writes. Platform uses public; Simulator uses sim.
 * Draft lines are priced here with the same rules as packages/planning/src/engine/billing.js.
 * Issue, payment and credit go through the database functions.
 */
import { platformDb, simDb } from '@nidus/supabase'
import { resolveRate, taxForLine, withMarkup, roundMoney, projectFigures, scheduleAmount, exchangeRateFor, billableDefault, dueReminder } from '../engine/billing.js'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { loadResolvedRegionalFormatSettings } from '@nidus/shared/services/regionalFormatSettingsService'
import { REGIONAL_FORMAT_DEFAULTS } from '@nidus/shared/utils/regionalFormatConstants'

/**
 * v1359 (B9): one entry per scope holding the lines of EVERY card in that scope (the rate engine reads one entry per
 * scope), each line carrying its card's dates — so a dated replacement card (next year's rates) is used on its dates.
 */
export function groupCardsByScope(cards, scopeOf) {
  const byScope = new Map()
  for (const card of cards || []) {
    const scope = scopeOf(card)
    if (!scope) continue
    if (!byScope.has(scope)) byScope.set(scope, [])
    byScope.get(scope).push(...cardLinesWithDates(card))
  }
  return [...byScope].map(([scope, lines]) => ({ scope, lines }))
}

/** v1359 (B9): a card's dates apply to each of its lines (the rate engine reads dates per line). */
export function cardLinesWithDates(card) {
  return (card.rate_card_lines || []).map((l) => ({
    ...l,
    effective_from: l.effective_from || card.effective_from || null,
    effective_to: l.effective_to || card.effective_to || null,
  }))
}

export function createBillingData(isSim) {
  const db = isSim ? simDb : platformDb
  const ownerColumn = isSim ? 'user_id' : 'account_id'

  async function ownerScope() {
    const { data: auth } = await db.auth.getUser()
    const authId = auth?.user?.id || null
    if (!authId) return { authId: null, ownerId: null }
    if (isSim) return { authId, ownerId: authId }
    const { data } = await platformDb.from('users').select('account_id').eq('auth_user_id', authId).maybeSingle()
    return { authId, ownerId: data?.account_id || null }
  }

  async function canIssue(accountId) {
    if (isSim) return true
    const { data: auth } = await platformDb.auth.getUser()
    const authId = auth?.user?.id
    if (!authId) return false
    const { data: user, error: userError } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle()
    if (userError || !user?.id) return false
    const { data: roles, error: roleError } = await platformDb.from('user_roles').select('roles(role_name)').eq('user_id', user.id).eq('is_active', true)
    if (roleError) return true
    const names = (roles || []).map((r) => r.roles?.role_name)
    if (names.includes('pmo_admin') || names.includes('system_admin')) return true
    if (!accountId) return false
    const { data: acct } = await platformDb.from('accounts').select('owner_user_id').eq('id', accountId).maybeSingle()
    return acct?.owner_user_id === user.id
  }

  async function listClients() {
    const { data, error } = await db.from('clients').select('*').eq('is_deleted', false).order('name')
    if (error) throw new Error(error.message)
    return data || []
  }

  async function saveClient(row) {
    const scope = await ownerScope()
    const payload = { ...row, [ownerColumn]: row[ownerColumn] || scope.ownerId, updated_at: new Date().toISOString() }
    const { data, error } = row.id
      ? await db.from('clients').update(payload).eq('id', row.id).select().single()
      : await db.from('clients').insert({ ...payload, client_reference: '' }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function listContacts(clientId) {
    const { data, error } = await db.from('client_contacts').select('*').eq('client_id', clientId).order('name')
    if (error) throw new Error(error.message)
    return data || []
  }

  async function saveContact(row) {
    const { data, error } = row.id
      ? await db.from('client_contacts').update(row).eq('id', row.id).select().single()
      : await db.from('client_contacts').insert(row).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function listTax() {
    const { data, error } = await db.from('tax_codes').select('*').order('code')
    if (error) throw new Error(error.message)
    return data || []
  }

  async function saveTax(row) {
    const scope = await ownerScope()
    const payload = { ...row, [ownerColumn]: row[ownerColumn] || scope.ownerId }
    const { data, error } = row.id
      ? await db.from('tax_codes').update(payload).eq('id', row.id).select().single()
      : await db.from('tax_codes').insert(payload).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function listProjects() {
    const table = isSim ? 'practice_projects' : 'projects'
    const { data, error } = await db.from(table).select('id, project_name').order('project_name').limit(200)
    if (error) return []
    return data || []
  }

  async function listCards() {
    const { data, error } = await db.from('rate_cards').select('*, rate_card_lines(*)').order('name')
    if (error) throw new Error(error.message)
    return data || []
  }

  async function saveCard(row, lines) {
    const scope = await ownerScope()
    const payload = { ...row, [ownerColumn]: row[ownerColumn] || scope.ownerId, updated_at: new Date().toISOString() }
    delete payload.rate_card_lines
    const { data, error } = row.id
      ? await db.from('rate_cards').update(payload).eq('id', row.id).select().single()
      : await db.from('rate_cards').insert(payload).select().single()
    if (error) throw new Error(error.message)
    if (lines) {
      await db.from('rate_card_lines').delete().eq('rate_card_id', data.id)
      if (lines.length) {
        const { error: lineError } = await db.from('rate_card_lines').insert(lines.map((l) => ({ ...l, rate_card_id: data.id })))
        if (lineError) throw new Error(lineError.message)
      }
    }
    return data
  }

  async function loadSettings(projectId) {
    const { data, error } = await db.from('project_billing_settings').select('*').eq('project_id', projectId).maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async function saveSettings(row) {
    const { data, error } = await db.from('project_billing_settings').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'project_id' }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function cardsFor(projectId, clientId) {
    const all = await listCards()
    const scopeOf = (card) => (card.project_id === projectId ? 'project' : card.client_id && card.client_id === clientId ? 'client' : !card.project_id && !card.client_id ? 'organisation' : null)
    return groupCardsByScope(all, scopeOf)
  }

  // v1359 (B9): each person's role on the project, so role lines on a rate card can apply. Simulator practice
  // projects have no project roles; their role lines never match (person and work-category lines still do).
  async function projectRoles(projectId) {
    if (isSim) return new Map()
    const { data, error } = await platformDb.from('user_roles').select('user_id, roles(role_name)')
      .eq('project_id', projectId).eq('is_active', true)
    if (error) return new Map()
    const map = new Map()
    for (const r of data || []) if (r.roles?.role_name && !map.has(r.user_id)) map.set(r.user_id, r.roles.role_name)
    return map
  }

  /** Roles a rate-card line can name (B3): the system roles and this organisation's own. */
  async function listRoles() {
    if (isSim) return []
    const scope = await ownerScope()
    const { data, error } = await platformDb.from('roles').select('role_name, role_display_name, account_id').eq('is_active', true)
      .order('role_display_name')
    if (error) return []
    return (data || []).filter((r) => !r.account_id || r.account_id === scope.ownerId)
      .map((r) => ({ value: r.role_name, label: r.role_display_name || r.role_name }))
  }

  /** People a rate-card line can name (B3): everyone with a role on the organisation's projects. */
  async function listPeople() {
    if (isSim) return []
    const projects = await listProjects()
    const ids = projects.map((p) => p.id)
    if (!ids.length) return []
    const { data: roles, error } = await platformDb.from('user_roles').select('user_id').in('project_id', ids).eq('is_active', true)
    if (error) return []
    const userIds = [...new Set((roles || []).map((r) => r.user_id).filter(Boolean))]
    if (!userIds.length) return []
    const { data: users } = await platformDb.from('users').select('id, full_name, display_name, email').in('id', userIds)
    return (users || []).map((u) => ({ value: u.id, label: u.display_name || u.full_name || u.email }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)))
  }

  async function draftInvoice(projectId, periodStart, periodEnd) {
    const settings = await loadSettings(projectId)
    if (!settings?.client_id) throw new Error('Choose a client on the project billing settings first.')
    const { data: client, error: clientError } = await db.from('clients').select('*').eq('id', settings.client_id).single()
    if (clientError) throw new Error(clientError.message)
    const tax = client.default_tax_code_id
      ? (await listTax()).find((t) => t.id === client.default_tax_code_id)
      : null
    const cards = await cardsFor(projectId, client.id)
    const roleOf = await projectRoles(projectId)
    const { data: time, error: timeError } = await db.from('timesheet_entries').select('id, hours_worked, entry_date, work_category, user_id, description')
      .eq('project_id', projectId).eq('status', 'approved').eq('is_billable', true).eq('is_deleted', false).is('client_invoice_line_id', null)
      .gte('entry_date', periodStart).lte('entry_date', periodEnd)
    if (timeError) throw new Error(timeError.message)
    const scope = await ownerScope()
    const currency = settings.currency || client.currency || await orgCurrency(scope.ownerId)
    const invoiceDate = new Date().toISOString().slice(0, 10)
    const rate = await rateFor(currency, invoiceDate, scope.ownerId)
    const { data: invoice, error } = await db.from('client_invoices').insert({
      [ownerColumn]: scope.ownerId, client_id: client.id, project_id: projectId, invoice_reference: '', status: 'draft',
      invoice_date: invoiceDate,
      due_date: new Date(Date.now() + (client.payment_terms_days || 30) * 86400000).toISOString().slice(0, 10),
      period_start: periodStart, period_end: periodEnd, currency, exchange_rate: rate,
    }).select().single()
    if (error) throw new Error(error.message)

    const lines = []
    for (const entry of time || []) {
      const found = resolveRate({ personId: entry.user_id, role: roleOf.get(entry.user_id) || '', workCategory: entry.work_category, onDate: entry.entry_date, cards })
      const amount = roundMoney(Number(entry.hours_worked) * (found?.rate || 0))
      const taxed = taxForLine(amount, tax, { internal: client.kind === 'internal' })
      lines.push({ invoice_id: invoice.id, source: 'time', source_id: entry.id, description: entry.description || entry.work_category || 'Time', quantity: entry.hours_worked, unit: 'hour', rate: found?.rate || 0, amount: taxed.net, tax_code_id: tax?.id || null, tax_amount: taxed.tax })
    }
    const projectColumn = isSim ? 'practice_project_id' : 'project_id'
    const { data: expenses, error: expenseError } = await db.from('project_expense_claim_items').select(`id, amount, description, expense_claim_id, project_expense_claims!inner(${projectColumn}, claim_status)`)
      .eq('is_rechargeable', true).is('client_invoice_line_id', null).eq(`project_expense_claims.${projectColumn}`, projectId).eq('project_expense_claims.claim_status', 'approved')
    if (expenseError && !/relation|does not exist|schema cache/i.test(expenseError.message)) throw new Error(expenseError.message)
    const markup = settings.markup_percent ?? client.markup_percent ?? 0
    for (const item of expenses || []) {
      const amount = withMarkup(item.amount, markup)
      const taxed = taxForLine(amount, tax, { internal: client.kind === 'internal' })
      lines.push({ invoice_id: invoice.id, source: 'expense', source_id: item.id, description: item.description || 'Expense', quantity: 1, unit: 'each', rate: amount, amount: taxed.net, tax_code_id: tax?.id || null, tax_amount: taxed.tax })
    }
    const dueLines = await listSchedule(projectId)
    for (const line of dueLines.filter((l) => l.status === 'open' && (l.basis === 'date' && l.due_date && l.due_date <= periodEnd))) {
      const amount = scheduleAmount({ amount: line.amount, percent: line.percent_of_contract }, settings.contract_value)
      const taxed = taxForLine(amount, tax, { internal: client.kind === 'internal' })
      lines.push({ invoice_id: invoice.id, source: 'schedule', source_id: line.id, description: line.description, quantity: 1, unit: 'each', rate: amount, amount: taxed.net, tax_code_id: tax?.id || null, tax_amount: taxed.tax })
    }
    if (lines.length) {
      const { data: saved, error: lineError } = await db.from('client_invoice_lines').insert(lines).select()
      if (lineError) throw new Error(lineError.message)
      for (const savedLine of saved || []) {
        if (savedLine.source === 'time') await db.from('timesheet_entries').update({ client_invoice_line_id: savedLine.id }).eq('id', savedLine.source_id)
        if (savedLine.source === 'expense') await db.from('project_expense_claim_items').update({ client_invoice_line_id: savedLine.id }).eq('id', savedLine.source_id)
        if (savedLine.source === 'schedule') await db.from('billing_schedule_lines').update({ status: 'invoiced' }).eq('id', savedLine.source_id)
      }
    }
    const net = roundMoney(lines.reduce((s, l) => s + Number(l.amount), 0))
    const taxAmount = roundMoney(lines.reduce((s, l) => s + Number(l.tax_amount), 0))
    const { data: updated, error: totalError } = await db.from('client_invoices').update({ net_amount: net, tax_amount: taxAmount, gross_amount: roundMoney(net + taxAmount) }).eq('id', invoice.id).select().single()
    if (totalError) throw new Error(totalError.message)
    return updated
  }

  async function listInvoices(projectId) {
    let q = db.from('client_invoices').select('*, clients(name, kind)').order('created_at', { ascending: true })
    if (projectId) q = q.eq('project_id', projectId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data || []
  }

  async function loadInvoice(id) {
    const { data, error } = await db.from('client_invoices').select('*, clients(name, kind, billing_address, currency, payment_terms_days), client_invoice_lines(*)').eq('id', id).single()
    if (error) throw new Error(error.message)
    return data
  }

  async function addManualLine(invoiceId, line) {
    const { error } = await db.from('client_invoice_lines').insert({ ...line, invoice_id: invoiceId, source: 'manual' })
    if (error) throw new Error(error.message)
    return retotal(invoiceId)
  }

  async function updateLine(invoiceId, lineId, patch) {
    const { error } = await db.from('client_invoice_lines').update(patch).eq('id', lineId).eq('invoice_id', invoiceId)
    if (error) throw new Error(error.message)
    return retotal(invoiceId)
  }

  async function removeLine(invoiceId, line) {
    if (line.source === 'time' && line.source_id) await db.from('timesheet_entries').update({ client_invoice_line_id: null }).eq('id', line.source_id)
    if (line.source === 'expense' && line.source_id) await db.from('project_expense_claim_items').update({ client_invoice_line_id: null }).eq('id', line.source_id)
    if (line.source === 'schedule' && line.source_id) await db.from('billing_schedule_lines').update({ status: 'open' }).eq('id', line.source_id)
    const { error } = await db.from('client_invoice_lines').delete().eq('id', line.id).eq('invoice_id', invoiceId)
    if (error) throw new Error(error.message)
    return retotal(invoiceId)
  }

  async function retotal(invoiceId) {
    const { data: lines, error } = await db.from('client_invoice_lines').select('amount, tax_amount, voided').eq('invoice_id', invoiceId)
    if (error) throw new Error(error.message)
    const live = (lines || []).filter((l) => !l.voided)
    const net = roundMoney(live.reduce((s, l) => s + Number(l.amount), 0))
    const taxAmount = roundMoney(live.reduce((s, l) => s + Number(l.tax_amount), 0))
    const { data, error: updateError } = await db.from('client_invoices').update({ net_amount: net, tax_amount: taxAmount, gross_amount: roundMoney(net + taxAmount), updated_at: new Date().toISOString() }).eq('id', invoiceId).select().single()
    if (updateError) throw new Error(updateError.message)
    return data
  }

  async function updateDraft(id, patch) {
    const { data, error } = await db.from('client_invoices').update(patch).eq('id', id).eq('status', 'draft').select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function submitInvoice(id) {
    const { data, error } = await db.from('client_invoices').update({ status: 'pending_approval' }).eq('id', id).eq('status', 'draft').select().single()
    if (error) throw new Error(error.message)
    return data
  }

  function raise(error) {
    const message = error?.message || 'The invoice could not be updated.'
    if (message.includes('BILLING_NOTES')) throw new Error('A justification is required.')
    if (message.includes('BILLING_STATE')) throw new Error('That invoice is not in the right state for this step.')
    if (message.includes('BILLING_LOCKED') || message.includes('BILLING_IMMUTABLE')) throw new Error('An issued invoice is locked. Raise a credit note to change it.')
    throw new Error(message)
  }

  async function issueInvoice(id, notes) {
    const { error } = await db.rpc('issue_client_invoice', { p_invoice_id: id, p_notes: notes })
    if (error) raise(error)
  }

  async function recordPayment(id, amount, date, method, reference) {
    const { error } = await db.rpc('record_client_payment', { p_invoice_id: id, p_amount: amount, p_date: date, p_method: method, p_reference: reference })
    if (error) raise(error)
  }

  async function creditInvoice(id, lineIds, reason) {
    const { error } = await db.rpc('credit_client_invoice', { p_invoice_id: id, p_line_ids: lineIds, p_reason: reason })
    if (error) raise(error)
  }

  async function accountingBundle(projectId) {
    const invoices = await listInvoices(projectId)
    const ids = invoices.map((i) => i.id)
    let credits = []
    let payments = []
    if (ids.length) {
      const [creditRes, paymentRes] = await Promise.all([
        db.from('client_credit_notes').select('*').in('invoice_id', ids),
        db.from('client_payments').select('*').in('invoice_id', ids),
      ])
      if (creditRes.error) throw new Error(creditRes.error.message)
      if (paymentRes.error) throw new Error(paymentRes.error.message)
      credits = creditRes.data || []
      payments = paymentRes.data || []
    }
    return accountingRows({
      invoices,
      credits,
      payments,
      clients: invoices.map((r) => ({ id: r.client_id, kind: r.clients?.kind })),
    })
  }

  async function sendDueReminders() {
    const invoices = await listInvoices()
    const today = new Date().toISOString().slice(0, 10)
    const ids = invoices.map((i) => i.id)
    const sentRows = ids.length
      ? await db.from('client_invoice_sends').select('invoice_id, step').in('invoice_id', ids)
      : { data: [] }
    if (sentRows.error) throw new Error(sentRows.error.message)
    let sent = 0
    for (const invoice of invoices) {
      const due = dueReminder(invoice, sentRows.data || [], today)
      if (!due) continue
      const { data: contacts } = await db.from('client_contacts').select('email').eq('client_id', invoice.client_id).eq('is_billing_contact', true)
      const to = (contacts || []).map((c) => c.email).filter(Boolean).join(', ')
      if (!to) continue
      const { error } = await db.functions.invoke('send-email', { body: { to, subject: due.subject, html: due.html } })
      if (error) throw new Error(error.message)
      const { error: logError } = await db.from('client_invoice_sends').insert({ invoice_id: invoice.id, recipients: to, kind: 'reminder', step: due.step, sent_at: new Date().toISOString() })
      if (logError) throw new Error(logError.message)
      sent += 1
    }
    return sent
  }

  async function logSend(invoiceId, recipients) {
    const { error } = await db.from('client_invoice_sends').insert({ invoice_id: invoiceId, recipients, kind: 'invoice', sent_at: new Date().toISOString() })
    if (error) throw new Error(error.message)
  }

  async function listSchedule(projectId) {
    const { data, error } = await db.from('billing_schedule_lines').select('*').eq('project_id', projectId).order('due_date')
    if (error) throw new Error(error.message)
    return data || []
  }

  async function saveScheduleLine(row) {
    const { data, error } = row.id
      ? await db.from('billing_schedule_lines').update(row).eq('id', row.id).select().single()
      : await db.from('billing_schedule_lines').insert(row).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function runDueJobs() {
    const due = await db.rpc('billing_schedule_due', { p_context: {} })
    const recurring = await db.rpc('billing_recurring_drafts', { p_context: {} })
    if (due.error) throw new Error(due.error.message)
    if (recurring.error) throw new Error(recurring.error.message)
    return { due: due.data, recurring: recurring.data }
  }

  // v1359 (B1): the organisation's currency from Regional & Format Settings (rule 68). Simulator practice uses the
  // learner's organisation settings; the system default applies only when nothing is set.
  async function orgCurrency(ownerId) {
    try {
      const accountId = !isSim && ownerId ? ownerId : await getCurrentUserAccountId()
      if (accountId) {
        const resolved = await loadResolvedRegionalFormatSettings(accountId, null)
        if (resolved?.settings?.currency_code) return String(resolved.settings.currency_code).toUpperCase()
      }
    } catch { /* fall through to the system default */ }
    return REGIONAL_FORMAT_DEFAULTS.currency_code
  }

  async function listRates() {
    const { data, error } = await db.from('currency_exchange_rates').select('*').order('effective_date', { ascending: false })
    if (error) return []
    return data || []
  }

  async function saveRate(row) {
    const scope = await ownerScope()
    const { data, error } = await db.from('currency_exchange_rates').insert({
      ...row, [ownerColumn]: scope.ownerId, from_currency: String(row.from_currency || '').toUpperCase(), to_currency: String(row.to_currency || '').toUpperCase(),
    }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function rateFor(currency, onDate, ownerId) {
    const org = await orgCurrency(ownerId)
    const rates = await listRates()
    return exchangeRateFor({ invoiceCurrency: currency, orgCurrency: org, onDate, rates })
  }

  async function billableDefaultFor(projectId, categoryCode) {
    const settings = await loadSettings(projectId).catch(() => null)
    const projectTable = isSim ? 'practice_projects' : 'projects'
    const { data: project } = await db.from(projectTable).select('billing_type').eq('id', projectId).maybeSingle()
    let categoryDefault = null
    if (categoryCode) {
      const { data: cat } = await db.from('timesheet_work_categories').select('billable_default').eq('code', categoryCode).maybeSingle()
      if (cat && cat.billable_default !== null && cat.billable_default !== undefined) categoryDefault = cat.billable_default
    }
    return billableDefault({
      billingType: project?.billing_type,
      categoryDefault,
      projectDefault: settings?.billable_default,
    })
  }

  async function projectMoney(projectId) {
    let cost = 0
    const costs = await db.from('project_cost_entries').select('amount').eq('project_id', projectId).eq('is_deleted', false)
    if (!costs.error) cost += (costs.data || []).reduce((s, r) => s + Number(r.amount || 0), 0)
    const time = await db.from('timesheet_entries').select('hours_worked, user_id').eq('project_id', projectId).eq('status', 'approved').eq('is_deleted', false)
    const people = await db.from('resources').select('user_id, hourly_rate')
    const rateOf = new Map((people.data || []).map((r) => [r.user_id, Number(r.hourly_rate) || 0]))
    if (!time.error) cost += (time.data || []).reduce((s, r) => s + Number(r.hours_worked || 0) * (rateOf.get(r.user_id) || 0), 0)

    const settings = await loadSettings(projectId).catch(() => null)
    const cards = settings ? await cardsFor(projectId, settings.client_id) : []
    const openTime = await db.from('timesheet_entries').select('id, hours_worked, entry_date, work_category, user_id').eq('project_id', projectId).eq('status', 'approved').eq('is_billable', true).eq('is_deleted', false).is('client_invoice_line_id', null)
    let wip = 0
    if (!openTime.error) {
      for (const entry of openTime.data || []) {
        const found = resolveRate({ personId: entry.user_id, role: '', workCategory: entry.work_category, onDate: entry.entry_date, cards })
        wip += Number(entry.hours_worked) * (found?.rate || 0)
      }
    }
    const projectColumn = isSim ? 'practice_project_id' : 'project_id'
    const expenses = await db.from('project_expense_claim_items').select(`amount, project_expense_claims!inner(${projectColumn})`).eq('is_rechargeable', true).is('client_invoice_line_id', null).eq(`project_expense_claims.${projectColumn}`, projectId)
    if (!expenses.error) wip += (expenses.data || []).reduce((s, r) => s + Number(r.amount || 0), 0)
    const schedule = await listSchedule(projectId).catch(() => [])
    for (const line of schedule.filter((l) => l.status === 'open')) wip += scheduleAmount({ amount: line.amount, percent: line.percent_of_contract }, settings?.contract_value)
    return { cost: roundMoney(cost), wip: roundMoney(wip) }
  }

  async function figuresFor(projectIds) {
    const { data, error } = await db.from('billing_project_figures').select('*').in('project_id', projectIds)
    if (error) throw new Error(error.message)
    const out = []
    for (const row of data || []) {
      const money = await projectMoney(row.project_id).catch(() => ({ cost: 0, wip: 0 }))
      out.push({
        projectId: row.project_id,
        ...projectFigures({
          invoices: [{ status: 'issued', net: Number(row.revenue), exchangeRate: 1 }],
          wipAmounts: [money.wip],
          cost: money.cost,
        }),
        unbilledHours: Number(row.unbilled_hours) || 0,
      })
    }
    return out
  }

  async function loadDocumentSettings() {
    const scope = await ownerScope()
    let q = db.from('invoice_document_settings').select('*')
    if (scope.ownerId) q = q.eq(ownerColumn, scope.ownerId)
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async function saveDocumentSettings(row) {
    const scope = await ownerScope()
    const existing = await loadDocumentSettings()
    const payload = { ...row, [ownerColumn]: scope.ownerId, updated_at: new Date().toISOString() }
    const query = existing?.id
      ? db.from('invoice_document_settings').update(payload).eq('id', existing.id)
      : db.from('invoice_document_settings').insert(payload)
    const { data, error } = await query.select().single()
    if (error) throw new Error(error.message)
    return data
  }

  return {
    listClients, saveClient, listContacts, saveContact, listTax, saveTax, listCards, saveCard,
    loadSettings, saveSettings, draftInvoice, listInvoices, loadInvoice, addManualLine, updateLine, removeLine, submitInvoice, accountingBundle, sendDueReminders,
    issueInvoice, recordPayment, creditInvoice, logSend, listSchedule, saveScheduleLine, runDueJobs, canIssue,
    figuresFor, loadDocumentSettings, saveDocumentSettings, listRates, saveRate, rateFor, billableDefaultFor, updateDraft, listProjects,
    orgCurrency, listRoles, listPeople, projectRoles,
  }
}

/** Rows for the accounting file. Internal clients are journal lines; others are invoices, credits and payments. */
export function accountingRows({ invoices, credits, payments, clients }) {
  const kindOf = new Map((clients || []).map((c) => [c.id, c.kind]))
  const rows = []
  for (const invoice of invoices) {
    const internal = kindOf.get(invoice.client_id) === 'internal'
    rows.push({
      type: internal ? 'journal' : 'invoice',
      reference: invoice.invoice_reference,
      date: invoice.invoice_date,
      client: invoice.clients?.name || '',
      currency: invoice.currency,
      net: invoice.net_amount,
      tax: internal ? 0 : invoice.tax_amount,
      gross: invoice.gross_amount,
      exchange_rate: invoice.exchange_rate,
    })
  }
  for (const credit of credits || []) {
    rows.push({ type: 'credit_note', reference: credit.credit_note_reference, date: credit.created_at?.slice?.(0, 10), net: credit.net_amount, tax: credit.tax_amount })
  }
  for (const payment of payments || []) {
    rows.push({ type: 'payment', reference: payment.reference, date: payment.paid_on, net: payment.amount, method: payment.method })
  }
  return rows
}

export const ACCOUNTING_DICTIONARY = [
  { field: 'type', required: 'Yes', type: 'text', max: '20', allowed: 'invoice, credit_note, payment, journal', notes: 'journal is an internal client' },
  { field: 'reference', required: 'No', type: 'text', max: '40', allowed: '', notes: 'Display id or the payment reference' },
  { field: 'date', required: 'No', type: 'date', max: '10', allowed: 'YYYY-MM-DD', notes: '' },
  { field: 'client', required: 'No', type: 'text', max: '200', allowed: '', notes: '' },
  { field: 'currency', required: 'No', type: 'text', max: '3', allowed: 'ISO code', notes: '' },
  { field: 'net', required: 'Yes', type: 'number', max: '18,2', allowed: '', notes: 'In the invoice currency' },
  { field: 'tax', required: 'No', type: 'number', max: '18,2', allowed: '', notes: 'Zero for internal clients' },
  { field: 'gross', required: 'No', type: 'number', max: '18,2', allowed: '', notes: '' },
  { field: 'exchange_rate', required: 'No', type: 'number', max: '18,6', allowed: '', notes: 'Invoice currency to organisation currency' },
]

export function accountingCsv(rows) {
  const legend = ['# DATA DICTIONARY', ...ACCOUNTING_DICTIONARY.map((d) => `# ${d.field} | required ${d.required} | ${d.type} | max ${d.max} | ${d.allowed} | ${d.notes}`), '#']
  const header = 'type,reference,date,client,currency,net,tax,gross,exchange_rate'
  const body = rows.map((r) => [r.type, r.reference, r.date, r.client, r.currency, r.net, r.tax, r.gross, r.exchange_rate].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  return [...legend, header, ...body].join('\n')
}

export const CLIENT_TEMPLATE = [
  '# DATA DICTIONARY',
  '# name | required Yes | text | 200 | | The organisation you bill',
  '# kind | required Yes | text | 10 | external or internal | Internal clients are not taxed',
  '# currency | required Yes | text | 3 | ISO code | Invoice currency',
  '# payment_terms_days | required No | number | 3 | 0 to 365 | Days until payment is due',
  '# billing_address | required No | text | 500 | | Printed on the invoice',
  '#',
  'name,kind,currency,payment_terms_days,billing_address',
  'Example Freight Ltd,external,USD,30,"1 Example Wharf, London"',
].join('\n')
