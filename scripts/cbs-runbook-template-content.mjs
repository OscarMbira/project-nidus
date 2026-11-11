/**
 * Core Banking System Data Migration Runbook — generic, vendor-neutral step list (v1337 plan, slice 5).
 * Built from a real go-live monitoring workbook with every bank, vendor, product code, routine name and
 * person removed (rule 26). Used by scripts/build-cbs-runbook-template.mjs (system template SQL) and
 * the v1337 seed builder.
 *
 * Each step: [window, batch, stepType, title, loadObject | instruction, agents, parallel]
 *   window: preparation | static | financial | post_migration
 *   batch:  pre_migration | static_data | balance_sheet | conventional_products | islamic_products |
 *           internal_nostro | trade_finance | dynamic_data | post_migration
 *   stepType: load | transformation | configuration_change | backup | extract_report | validation |
 *             checkpoint | service
 */

const L = (w, b, title, obj, agents = null, parallel = false) => ({ window: w, batch: b, step_type: 'load', title, load_object: obj, agents, parallel })
const T = (w, b, title, obj, instruction, agents = null) => ({ window: w, batch: b, step_type: 'transformation', title, load_object: obj, instruction, agents })
const C = (w, b, title, instruction) => ({ window: w, batch: b, step_type: 'configuration_change', title, instruction })
const B = (w, b, title, instruction) => ({ window: w, batch: b, step_type: 'backup', title, instruction })
const X = (w, b, title, instruction) => ({ window: w, batch: b, step_type: 'extract_report', title, instruction })
const V = (w, b, title, instruction) => ({ window: w, batch: b, step_type: 'validation', title, instruction })
const K = (w, b, title, instruction) => ({ window: w, batch: b, step_type: 'checkpoint', title, instruction })
const S = (w, b, title, instruction) => ({ window: w, batch: b, step_type: 'service', title, instruction })

const SUSPENSE = (what) => `Point the ${what} balance class at its migration suspense category before the balance upload starts. Record the old and new category in Reference.`

export const RUNBOOK_STEPS = [
  // ── Preparation ──────────────────────────────────────────────────────────
  K('preparation', 'pre_migration', 'Environment prerequisite checks complete', 'Confirm the target environment build, parameters, interfaces off, users locked and disk space. Proceed only when every check is green.'),
  S('preparation', 'pre_migration', 'Stop interfaces and channels to the target environment', 'Stop inbound and outbound interfaces, channel connections and scheduled jobs that could post during migration.'),
  X('preparation', 'pre_migration', 'Extract all accounts before upload (baseline)', 'Extract every account already in the target system so that reconciliation can exclude pre-existing records.'),
  X('preparation', 'pre_migration', 'Extract the exception enquiry baseline', 'Run the exception enquiry and keep the file as the pre-load baseline.'),
  B('preparation', 'pre_migration', 'Pre-migration backup of the target environment', 'Full database and file-system backup. Record the backup reference and confirm a restore point.'),

  // ── Static window (batch 1) ──────────────────────────────────────────────
  L('static', 'static_data', 'Customers', 'Customer DMS', 20),
  L('static', 'static_data', 'Customer identification documents', 'Customer ID DMS', 5),
  V('static', 'static_data', 'Customer duplicate checks', 'Run the duplicate-customer check load and resolve every match before relationships are loaded.'),
  L('static', 'static_data', 'Customer relationships', 'Customer relationship DMS', 1),
  L('static', 'static_data', 'Nostro bank customers', 'Nostro customer DMS', null),
  L('static', 'static_data', 'Custodial customers', 'Custodial customer DMS', 5),
  L('static', 'static_data', 'Overdraft limits', 'Overdraft limit DMS', 20),
  L('static', 'static_data', 'Internal accounts (static details)', 'Internal account DMS', 1),
  L('static', 'static_data', 'Nostro and other non-arrangement accounts (static details)', 'Nostro account DMS'),
  L('static', 'static_data', 'Teller cash accounts', 'Teller cash account DMS', null, true),
  L('static', 'static_data', 'Teller cash portal accounts', 'Teller cash account DMS', null, true),
  L('static', 'static_data', 'Vault accounts', 'Teller cash account DMS', null, true),
  L('static', 'static_data', 'Cheque clearing accounts', 'Teller cash account DMS', null, true),
  C('static', 'static_data', 'Internal account statement frequency update', 'Extract the internal accounts to the statement update file, then run the statement-frequency update job.'),
  L('static', 'static_data', 'Current accounts (static details)', 'Current account DMS', 25),
  L('static', 'static_data', 'Current accounts – special segment (static details)', 'Current account DMS', 30),
  L('static', 'static_data', 'Savings accounts (static details)', 'Savings account DMS', 20),
  L('static', 'static_data', 'Islamic savings accounts (static details)', 'Islamic savings account DMS', 10),
  L('static', 'static_data', 'Islamic current accounts (static details)', 'Islamic current account DMS', 10),
  L('static', 'static_data', 'Customer occupation', 'Customer occupation DMS', 10),
  L('static', 'static_data', 'Correspondence addresses', 'Correspondence address DMS'),
  L('static', 'static_data', 'Correspondence product preferences', 'Correspondence product DMS'),
  C('static', 'static_data', 'Update channel parameters', 'Load the channel parameter file supplied by the integration team and verify a sample of channel profiles.'),
  L('static', 'static_data', 'Customer relationships (second pass after accounts)', 'Customer relationship DMS', 1),
  L('static', 'static_data', 'Temporary overdraft limits', 'Temporary overdraft limit DMS'),
  T('static', 'static_data', 'Limit sub-allocation', 'Limit sub-allocation DMS', 'Run the limit transformation first, then load the sub-allocations.'),
  T('static', 'static_data', 'Limit sharing groups', 'Limit sharing group DMS', 'Load the sharing groups, then run the job that updates customer relationship groups. Keep the extracted file name in Reference.'),
  L('static', 'static_data', 'Users', 'User DMS', null, true),
  L('static', 'static_data', 'Teller IDs', 'Teller ID DMS', null, true),
  L('static', 'static_data', 'User browser and print preferences', 'User preference DMS', null, true),
  L('static', 'static_data', 'Overdraft limit charge accounts', 'Limit charge account DMS'),
  L('static', 'static_data', 'Signatures and photos (images)', 'Image DMS', 20),
  L('static', 'static_data', 'Signatures and photos (document upload)', 'Image upload DMS', 20),
  S('static', 'static_data', 'Start the document-management update service', 'Start the service that links mandates, images and notifications to accounts. Stop it when the queue is empty.'),
  L('static', 'static_data', 'Point-of-sale terminals', 'Terminal account DMS', null, true),
  L('static', 'static_data', 'ATM terminals', 'Terminal account DMS', null, true),
  L('static', 'static_data', 'Affiliate terminals', 'Terminal account DMS', null, true),
  L('static', 'static_data', 'Finance profit-and-loss budget', 'Budget DMS'),
  C('static', 'static_data', 'Clear customer and account activity tables', 'Empty the customer and account activity work tables (and their history) left by the static loads before the financial window.'),
  K('static', 'static_data', 'Delta fix deployments checkpoint (static window)', 'Confirm every fix deployed during the static window is recorded and approved.'),
  V('static', 'static_data', 'Static data validation and reconciliation', 'Record counts per object against the mapping sheets, mandatory-field checks and the sample verification.'),
  K('static', 'static_data', 'Static data sign-off', 'Business and data owners sign off the static data before the financial window starts.'),
  B('static', 'static_data', 'Static backup 1', 'Full backup after the static window. Record the reference — this is the rollback point for the financial window.'),

  // ── Financial window: arrangement static details ─────────────────────────
  L('financial', 'conventional_products', 'Product limits (for example loans)', 'Product limit DMS', 10),
  T('financial', 'conventional_products', 'Collateral rights', 'Collateral right DMS', 'Run the collateral transformation, then load the collateral rights.', 1),
  L('financial', 'conventional_products', 'Term deposits (static details)', 'Term deposit DMS', 10),
  L('financial', 'islamic_products', 'Islamic term deposits (static details)', 'Islamic term deposit DMS', 5),
  L('financial', 'conventional_products', 'Loans (static details)', 'Loan DMS', 20),
  L('financial', 'islamic_products', 'Islamic financing (static details)', 'Islamic financing DMS', 20),
  L('financial', 'conventional_products', 'Collateral values', 'Collateral DMS', 20),

  // ── Batch 2: balance sheet ───────────────────────────────────────────────
  L('financial', 'balance_sheet', 'Currencies and rates', 'Currency DMS'),
  L('financial', 'balance_sheet', 'Internal take-over accounts (static details)', 'Internal take-over account DMS'),
  L('financial', 'balance_sheet', 'Trial balance – balance sheet', 'General ledger capture DMS', 1),
  X('financial', 'balance_sheet', 'Extract position account balances', 'Extract the currency position account balances for the finance team.'),
  L('financial', 'balance_sheet', 'Trial balance – profit and loss balances', 'Profit and loss balance DMS', 20),
  L('financial', 'balance_sheet', 'Trial balance – profit and loss capture', 'Profit and loss capture DMS'),
  V('financial', 'balance_sheet', 'Balance sheet post-validation', 'Trial balance in the target ties to the legacy trial balance per currency and ledger line.'),
  K('financial', 'balance_sheet', 'Balance sheet sign-off', 'Finance signs off the balance sheet before product balances are loaded.'),

  // ── Batch 3: conventional products ──────────────────────────────────────
  C('financial', 'conventional_products', 'Relax the minimum balance fee', 'Relax the minimum balance fee charge, then proof and publish the change before account balances are uploaded.'),
  L('financial', 'conventional_products', 'Savings accounts – suspend for credit balance upload', 'Account suspend DMS'),
  C('financial', 'conventional_products', 'Savings credit balances – suspense category', SUSPENSE('savings credit')),
  L('financial', 'conventional_products', 'Savings account credit balances', 'Savings credit balance DMS', 20),
  L('financial', 'conventional_products', 'Savings account lowest balances (credit)', 'Savings lowest balance DMS', 20),
  L('financial', 'conventional_products', 'Savings accounts – suspend for debit balance upload', 'Account suspend DMS'),
  C('financial', 'conventional_products', 'Savings debit balances – suspense category', SUSPENSE('savings debit')),
  L('financial', 'conventional_products', 'Savings account debit balances', 'Savings debit balance DMS', 2),
  C('financial', 'conventional_products', 'Savings accruals – suspense category', SUSPENSE('savings accrual')),
  L('financial', 'conventional_products', 'Savings account lowest balances (debit)', 'Savings lowest balance DMS', 5),
  L('financial', 'conventional_products', 'Savings accrued interest', 'Savings accrual DMS'),
  L('financial', 'conventional_products', 'Current accounts – suspend for balance upload', 'Account suspend DMS', 5),
  C('financial', 'conventional_products', 'Current account balances – suspense category', SUSPENSE('current account')),
  L('financial', 'conventional_products', 'Current account balances', 'Current account balance DMS', 30),
  C('financial', 'conventional_products', 'Current account accruals – suspense category', SUSPENSE('current account accrual')),
  L('financial', 'conventional_products', 'Current account accrued interest', 'Current account accrual DMS', 30),
  B('financial', 'conventional_products', 'Backup after account balances', 'Backup after current and savings balances. Record the reference.'),
  C('financial', 'conventional_products', 'Confirm deposit interest allocation rules', 'Confirm the deposit interest allocation rules post credit-due adjustments to the migration suspense target. If not, change them, then proof and publish.'),
  C('financial', 'conventional_products', 'Term deposit balances and interest – suspense categories', SUSPENSE('term deposit principal and interest')),
  L('financial', 'conventional_products', 'Term deposit balances and accrued interest', 'Term deposit balance DMS', 30),
  L('financial', 'conventional_products', 'Term deposit balance adjustments', 'Term deposit adjustment DMS', 30),
  B('financial', 'conventional_products', 'Backup after deposits', 'Backup after term deposit balances. Record the reference.'),
  C('financial', 'conventional_products', 'Loan capture, interest and suspended interest – suspense categories', SUSPENSE('loan principal, interest and suspended interest')),
  L('financial', 'conventional_products', 'Loans – manual suspension of interest', 'Loan suspension DMS', 10),
  L('financial', 'conventional_products', 'Loan past dues (bills)', 'Loan past due DMS', 10),
  L('financial', 'conventional_products', 'Loan principal balances', 'Loan balance DMS', 10),
  L('financial', 'conventional_products', 'Loan accrual balances', 'Loan accrual DMS'),
  L('financial', 'conventional_products', 'Loan balance adjustments', 'Loan adjustment DMS'),
  L('financial', 'conventional_products', 'Loan undrawn commitments', 'Loan commitment DMS'),

  // ── Batch 4: Islamic products ────────────────────────────────────────────
  L('financial', 'islamic_products', 'Islamic accounts – suspend for balance upload', 'Account suspend DMS'),
  C('financial', 'islamic_products', 'Islamic current and savings balances – suspense category', SUSPENSE('Islamic current and savings')),
  L('financial', 'islamic_products', 'Islamic current account balances', 'Islamic current balance DMS', 30),
  L('financial', 'islamic_products', 'Islamic savings credit balances', 'Islamic savings balance DMS', 10),
  L('financial', 'islamic_products', 'Islamic savings debit balances', 'Islamic savings balance DMS', 1),
  L('financial', 'islamic_products', 'Islamic savings lowest balances (credit)', 'Islamic savings lowest balance DMS', 20),
  L('financial', 'islamic_products', 'Islamic savings lowest balances (debit)', 'Islamic savings lowest balance DMS', 1),
  C('financial', 'islamic_products', 'Islamic accruals – suspense category', SUSPENSE('Islamic accrual')),
  L('financial', 'islamic_products', 'Islamic savings accrued profit', 'Islamic accrual DMS'),
  L('financial', 'islamic_products', 'Islamic current account accrued profit', 'Islamic accrual DMS'),
  C('financial', 'islamic_products', 'Islamic term deposits – suspense categories', SUSPENSE('Islamic term deposit principal and profit')),
  L('financial', 'islamic_products', 'Islamic term deposit balances and accrued profit', 'Islamic term deposit balance DMS', 20),
  L('financial', 'islamic_products', 'Islamic term deposit balance adjustments', 'Islamic term deposit adjustment DMS', 20),
  C('financial', 'islamic_products', 'Islamic financing – suspense categories', SUSPENSE('Islamic financing principal, profit and suspended profit')),
  L('financial', 'islamic_products', 'Islamic financing – manual suspension of profit', 'Islamic financing suspension DMS', 10),
  L('financial', 'islamic_products', 'Islamic financing past dues', 'Islamic financing past due DMS', 10),
  L('financial', 'islamic_products', 'Islamic financing principal balances', 'Islamic financing balance DMS', 10),
  L('financial', 'islamic_products', 'Islamic financing accrual balances', 'Islamic financing accrual DMS', 10),
  L('financial', 'islamic_products', 'Islamic financing balance adjustments', 'Islamic financing adjustment DMS'),
  L('financial', 'islamic_products', 'Islamic financing undrawn commitments', 'Islamic financing commitment DMS'),

  // ── Internal and nostro balances ─────────────────────────────────────────
  L('financial', 'internal_nostro', 'Internal and non-arrangement account balances', 'Cleared balance DMS'),
  L('financial', 'internal_nostro', 'Cash cover balances', 'Cleared balance DMS'),
  L('financial', 'internal_nostro', 'Government borrower balances', 'Cleared balance DMS'),

  // ── Batch 5: trade finance ───────────────────────────────────────────────
  L('financial', 'trade_finance', 'Import letter of credit limits', 'Trade limit DMS', null, true),
  L('financial', 'trade_finance', 'Export letter of credit limits', 'Trade limit DMS', null, true),
  L('financial', 'trade_finance', 'Guarantees', 'Guarantee DMS'),
  L('financial', 'trade_finance', 'Guarantee account amendments', 'Guarantee amendment DMS'),
  L('financial', 'trade_finance', 'Import documentary collections', 'Letter of credit DMS'),
  L('financial', 'trade_finance', 'Import letters of credit', 'Letter of credit DMS'),
  L('financial', 'trade_finance', 'Export letters of credit', 'Letter of credit DMS'),
  L('financial', 'trade_finance', 'Export documentary collections', 'Letter of credit DMS'),
  L('financial', 'trade_finance', 'Letter of credit account amendments', 'Letter of credit amendment DMS'),
  L('financial', 'trade_finance', 'Drawings under letters of credit', 'Drawings DMS'),
  L('financial', 'trade_finance', 'Letter of credit amortised charges', 'Trade charge DMS'),
  L('financial', 'trade_finance', 'Guarantee amortised charges', 'Trade charge DMS'),
  L('financial', 'trade_finance', 'Past due capture', 'Past due DMS'),
  T('financial', 'trade_finance', 'Past due maintenance', 'Past due payment DMS', 'Extract the past dues to file, then update payment due dates from the extracted file.'),

  // ── Batch 6: dynamic data ────────────────────────────────────────────────
  L('financial', 'dynamic_data', 'Issued cheques', 'Cheque issue DMS', 20, true),
  L('financial', 'dynamic_data', 'Presented cheques', 'Cheque presented DMS', 40, true),
  L('financial', 'dynamic_data', 'Stopped cheques', 'Payment stop DMS', 1, true),
  L('financial', 'dynamic_data', 'Bankers cheques issued, not presented', 'Bankers cheque DMS', null, true),
  L('financial', 'dynamic_data', 'Sweeps', 'Sweep DMS'),
  L('financial', 'dynamic_data', 'Standing orders', 'Standing order DMS', 1),
  L('financial', 'dynamic_data', 'Blocked funds', 'Blocked funds DMS'),
  T('financial', 'dynamic_data', 'Overdue service fees', 'Overdue fee DMS', 'Run the service fee transformation, then load the overdue fees.'),
  T('financial', 'dynamic_data', 'Overdrawn accounts', 'Overdrawn account DMS', 'Run the service fee transformation, then load the overdrawn accounts.'),
  T('financial', 'dynamic_data', 'Overdraft classification – inactive days', 'Inactive days DMS', 'Run the service fee transformation, then load the inactive-day counts.'),

  // ── Close of the financial window ───────────────────────────────────────
  X('financial', 'post_migration', 'Extract the exception enquiry', 'Run the exception enquiry and compare it with the baseline; every new exception is raised as a migration defect.'),
  X('financial', 'post_migration', 'Extract all take-on balances before end of day', 'Extract every take-on balance for the finance reconciliation.'),
  K('financial', 'post_migration', 'Delta fix deployments checkpoint (financial window)', 'Confirm every fix deployed during the financial window is recorded and approved.'),
  V('financial', 'post_migration', 'Financial post-validation', 'Balances per product and currency tie to the legacy system; suspense accounts net to zero.'),
  K('financial', 'post_migration', 'Financial data sign-off', 'Finance and product owners sign off the financial data.'),
  B('financial', 'post_migration', 'Financial backup', 'Full backup after the financial window. Record the reference.'),
  V('financial', 'post_migration', 'Pre-migration end-of-day checklist', 'Dates, holidays, rates, batch jobs and interfaces ready for the first end of day.'),
  B('financial', 'post_migration', 'Full backup before the first end of day', 'Full backup immediately before the first end of day. Record the reference.'),
  S('financial', 'post_migration', 'Run the first end of day on the target system', 'Run the end-of-day batch. Record start, end and any job that failed or was restarted.'),
  B('financial', 'post_migration', 'Backup after the first end of day', 'Backup after the first end of day. Record the reference.'),
  V('financial', 'post_migration', 'Financial validation and reconciliation after end of day', 'Re-run the balance reconciliation after interest, charges and accruals have been applied.'),
  K('financial', 'post_migration', 'Go / no-go decision', 'Steering decides go, go with conditions or no-go (roll back to the last good backup).'),
  S('financial', 'post_migration', 'Connect channels for offline transactions', 'On a go decision, connect channels and post the transactions held offline during the cutover.'),

  // ── Post-migration ───────────────────────────────────────────────────────
  V('post_migration', 'post_migration', 'Post end-of-day checklist', 'Business verification on the first business day: branches, channels, statements, interest and charges.'),
]

const OWNER = {
  load: 'Data load team',
  transformation: 'Data load team',
  configuration_change: 'Target system configuration team',
  backup: 'Infrastructure team',
  extract_report: 'Data migration analyst',
  validation: 'Finance validation team',
  checkpoint: 'Cutover manager',
  service: 'Infrastructure team',
}

function budgetMinutes(s) {
  if (s.title.startsWith('Run the first end of day')) return 240
  switch (s.step_type) {
    case 'load': return s.agents >= 20 ? 60 : s.agents >= 5 ? 30 : 20
    case 'transformation': return 30
    case 'configuration_change': return 10
    case 'backup': return 45
    case 'extract_report': return 20
    case 'validation': return 60
    case 'checkpoint': return 15
    default: return 15
  }
}

/** Field values of one template step (runbook reference left as the {{parent}} token). */
export function stepFieldValues(s, index) {
  const fv = {
    runbook: [{ id: '{{parent}}', label: '{{parent_label}}' }],
    window: s.window,
    batch: s.batch,
    sequence: index + 1,
    step_type: s.step_type,
    owner: OWNER[s.step_type],
    can_run_in_parallel: Boolean(s.parallel),
    budget_minutes: budgetMinutes(s),
  }
  if (s.step_type === 'load' || s.step_type === 'transformation') {
    fv.data_set = s.title
    fv.load_object = s.load_object
    if (s.agents) fv.agents = s.agents
  }
  if (s.instruction) fv.instruction = s.instruction
  if (s.step_type === 'checkpoint') fv.checkpoint_decision = 'pending'
  return fv
}

export const RUNBOOK_RECORD = {
  title: 'Data Migration Runbook – [Bank Name] Core Banking Replacement',
  description: 'Step-by-step runbook for one migration run (mock, dress rehearsal or go-live): preparation, static window, financial window in batches, end of day, reconciliation and the go / no-go decision.',
  field_values: {
    run_reference: '[Run Reference]',
    run_type: 'mock',
    migration_window: 'full',
    environment: 'pre_production',
    migration_lead: '[Migration Lead]',
    cutover_manager: '[Cutover Manager]',
    runbook_version: '1.0',
    static_budget_minutes: 1440,
    financial_budget_minutes: 2160,
    go_no_go_points: [
      'Environment ready\t[Planned Time]\tPending\tCutover manager',
      'Static data signed off\t[Planned Time]\tPending\tData owners',
      'Balance sheet signed off\t[Planned Time]\tPending\tFinance lead',
      'Financial data signed off\t[Planned Time]\tPending\tFinance lead',
      'Go / no-go after first end of day\t[Planned Time]\tPending\tSteering committee',
    ].join('\n'),
    backups: [
      'Pre-migration backup\t\t\tNot tested',
      'Static backup 1\t\t\tNot tested',
      'Backup after account balances\t\t\tNot tested',
      'Backup after deposits\t\t\tNot tested',
      'Financial backup\t\t\tNot tested',
      'Full backup before the first end of day\t\t\tNot tested',
      'Backup after the first end of day\t\t\tNot tested',
    ].join('\n'),
    rollback_trigger: [
      'Static or financial sign-off refused and the fix cannot be made inside the window',
      'Reconciliation difference above the agreed tolerance',
      'First end of day fails and cannot be completed before [Business Resumption Time]',
      'A critical migration defect with no workaround',
    ].join('\n'),
    rollback_point: 'Latest verified backup before the failed step',
    final_decision: 'pending',
  },
}

/** Words that must never appear in the template (rule 26: vendor-neutral, no people). */
export const BANNED = [
  'LISCO', 'T24', 'Temenos', 'Transact', 'AA ', 'AA.', 'AAAR', 'ACCOUNT.CLASS', 'AC.ALLOCATION', 'DME', 'DSC', 'COB', 'ENQ',
  'FBNK', 'DE.ADDRESS', 'DE.PRODUCT', 'MD.DEAL', 'LETTER.OF.CREDIT', 'PD.PAYMENT', 'BNK/', 'EDMS', 'Tanapa',
  'Maria', 'Onesmo', 'Shafil', 'Sabari', 'Jessica', 'Alex', 'Baraka',
]

export function contentProblems() {
  const text = JSON.stringify({ RUNBOOK_RECORD, steps: RUNBOOK_STEPS.map(stepFieldValues), titles: RUNBOOK_STEPS.map((s) => s.title) })
  const problems = BANNED.filter((w) => text.includes(w)).map((w) => `banned word: ${w}`)
  const windows = ['preparation', 'static', 'financial', 'post_migration']
  RUNBOOK_STEPS.forEach((s, i) => {
    if (!windows.includes(s.window)) problems.push(`step ${i + 1}: bad window ${s.window}`)
    if (!s.title) problems.push(`step ${i + 1}: no title`)
  })
  return problems
}
