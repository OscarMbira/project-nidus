/**
 * PMO Overview dashboard — derive Red / Amber / Green for Portfolio / Programme / Project metric tiles.
 * Rules are conservative defaults: align with executive alert severity (danger→red, warning→amber).
 */

/** @typedef {'red'|'amber'|'green'} Rag */

/**
 * True when the displayed metric has no captured value (dash / empty / null).
 * Does not treat numeric 0 or $0 as missing.
 */
export function isMetricValueMissing(value) {
  if (value == null) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '' || s === '—' || s === '-' || s === '–' || s === '--') return true;
    const lower = s.toLowerCase();
    if (lower === 'n/a' || lower === 'na') return true;
  }
  return false;
}

/**
 * Tile RAG: uncaptured / missing metrics default to Red until data exists (per PMO policy).
 * When not missing, use provided `rag`, else Green (informational / OK snapshot).
 *
 * @param {Rag|null|undefined} rag
 * @param {{ missing: boolean }} opts
 * @returns {Rag}
 */
export function resolveMetricTileRag(rag, { missing }) {
  if (missing) return 'red';
  if (rag !== undefined && rag !== null) return rag;
  return 'green';
}

/**
 * Worst RAG from a list (red > amber > green).
 * @param {(Rag|null|undefined)[]} rags
 * @returns {Rag}
 */
export function worstRagFromList(rags) {
  const list = (rags || []).filter(Boolean);
  if (list.includes('red')) return 'red';
  if (list.includes('amber')) return 'amber';
  return 'green';
}

/**
 * Percent 0–100 where higher is better (health, compliance, coverage).
 * @param {number|null|undefined} pct
 * @param {{ good?: number, warn?: number, ifNull?: Rag }} [opts]
 * @returns {Rag}
 */
export function ragPctHigherIsBetter(pct, opts = {}) {
  const { good = 75, warn = 50, ifNull = 'green' } = opts;
  if (pct == null || Number.isNaN(Number(pct))) return ifNull;
  const n = Number(pct);
  if (n >= good) return 'green';
  if (n >= warn) return 'amber';
  return 'red';
}

/** Any positive count is a warning (alignment / drift). */
export function ragCountPositiveWarning(n) {
  return Number(n) > 0 ? 'amber' : 'green';
}

/** Any positive count is critical. */
export function ragCountPositiveDanger(n) {
  return Number(n) > 0 ? 'red' : 'green';
}

/** Positive count → amber unless over redAt, then red. */
export function ragCountThreshold(n, redAt = 10) {
  const v = Number(n) || 0;
  if (v <= 0) return 'green';
  if (v >= redAt) return 'red';
  return 'amber';
}

/**
 * Org budget utilization (%). Over 100% = overspend (red). 80–100 green, below 80 amber.
 * @param {number|null|undefined} pct
 * @returns {Rag}
 */
export function ragBudgetUtilizationPct(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return 'green';
  const n = Number(pct);
  if (n > 100) return 'red';
  if (n >= 80) return 'green';
  return 'amber';
}

/**
 * Signed budget variance % — large absolute variance is worse.
 * @param {number|null|undefined} pct
 * @returns {Rag}
 */
export function ragBudgetVariancePct(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return 'green';
  const a = Math.abs(Number(pct));
  if (a <= 5) return 'green';
  if (a <= 15) return 'amber';
  return 'red';
}

/**
 * EVM indices CPI/SPI: &lt; 0.85 red, &lt; 1 amber, else green.
 * @param {number|null|undefined} idx
 * @returns {Rag}
 */
export function ragEvmIndex(idx) {
  if (idx == null || Number.isNaN(Number(idx))) return 'green';
  const n = Number(idx);
  if (n < 0.85) return 'red';
  if (n < 1) return 'amber';
  return 'green';
}

/** Alert ids whose count is “projects affected” in the org portfolio */
const EXEC_ALERT_PROJECT_SCOPED = new Set([
  'no_baseline',
  'gov_missing',
  'evm_none',
  'unlinked_projects',
  'behind_schedule',
  'stale_projects',
]);

/** Alert ids whose count is “programmes affected” among org-linked programmes */
const EXEC_ALERT_PROGRAMME_SCOPED = new Set(['stale_programmes', 'unlinked_programmes']);

/**
 * Executive alert strip — derive RAG so widespread issues escalate to Red (not all Amber).
 * - `danger` → red; `ok` / zero count → green.
 * - `warning`: amber for limited drift; red when penetration or absolute scale is high.
 *
 * @param {{ id: string, count?: number, severity?: string }} row
 * @param {{ totalProjects?: number, totalProgrammes?: number }} [ctx]
 * @returns {Rag}
 */
export function executiveAlertRagFromRow(row, ctx = {}) {
  const count = Number(row.count) || 0;
  if (count <= 0) return 'green';

  const severity = String(row.severity || '').toLowerCase();
  if (severity === 'danger') return 'red';
  if (severity === 'ok') return 'green';

  const totalProjects = Math.max(0, Number(ctx.totalProjects) || 0);
  const totalProgrammes = Math.max(0, Number(ctx.totalProgrammes) || 0);
  const id = row.id;

  if (EXEC_ALERT_PROJECT_SCOPED.has(id) && totalProjects > 0) {
    const penetration = count / totalProjects;
    if (penetration >= 0.5 || count >= 15) return 'red';
    return 'amber';
  }

  if (EXEC_ALERT_PROGRAMME_SCOPED.has(id) && totalProgrammes > 0) {
    const penetration = count / totalProgrammes;
    if (penetration >= 0.45 || count >= 6) return 'red';
    return 'amber';
  }

  if (count >= 15) return 'red';
  return 'amber';
}
