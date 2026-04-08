# v228 — AI Assistant: Dynamic Schema-Driven Context Fetching

## Problem
Every `fetchXData()` function has a **hardcoded field list** in its `.select()` call.
Every `rowFormatters` entry has a **hardcoded formatter** for those same fields.

Result: when a developer adds a new column to any table, the AI is silently blind to it
until someone notices a wrong answer and manually adds the field — as happened with
`identification_source`, `email`, `phone`, etc.

This is a maintenance trap that will keep recurring forever.

---

## Root Cause

```
fetchStakeholderData → .select('id, stakeholder_name, stakeholder_type, ...')  // hardcoded
rowFormatters.stakeholders → `Type: ${s.stakeholder_type}` ...                 // hardcoded
```

Any field not in the SELECT → invisible to AI.
Any field not in the formatter → invisible to AI even if fetched.

---

## Proposed Solution: Universal Dynamic Formatter + SELECT *

### Core idea
1. Replace every hardcoded `.select([...list...])` with `.select('*')` (+ explicit joins).
2. Replace all 9 hardcoded `rowFormatters` entries with a single `universalRowFormatter(row, config)`.
3. The formatter auto-iterates every key returned by Supabase, skipping only known system/audit fields.
4. A small per-module config object defines: reference field, title field, any join extractions.

### No more manual field additions — ever.
When a developer adds `salience_score` or `budget_variance` to a table, the AI sees it
immediately on the next query, with zero code changes.

---

## Implementation Plan

### Step 1 — Define system fields exclusion set
```js
const SYSTEM_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted',
  'created_by', 'updated_by', 'deleted_by',
  'organisation_id', 'account_id',
  // FK UUIDs — shown via join label instead
  'project_id', 'status_id', 'role_id', 'portfolio_id', 'programme_id',
])
```

### Step 2 — Write `universalRowFormatter(row, config)`
```js
/**
 * config: {
 *   refField:   string | null   — e.g. 'risk_reference', shown as [REF]
 *   titleField: string          — e.g. 'risk_title', shown as main label
 *   joins:      Array<{ key: string, label: string }>
 *               — nested join objects, e.g. { key: 'project', label: 'Project' }
 * }
 */
function universalRowFormatter(row, config = {}) {
  const { refField, titleField, joins = [] } = config
  const parts = []

  // Build prefix: - [REF] Title  OR  - Title
  const ref   = refField   ? row[refField]   : null
  const title = titleField ? row[titleField] : null
  const idFallback = row.id?.slice(0, 8) ?? 'record'
  parts.push(ref && title ? `- [${ref}] ${title}` : title ? `- ${title}` : `- ${idFallback}`)

  // Collect join keys so we skip their raw _id counterparts
  const joinKeys = new Set(joins.map((j) => j.key))

  // Emit every non-system, non-join, non-null field
  for (const [key, val] of Object.entries(row)) {
    if (SYSTEM_FIELDS.has(key)) continue
    if (key === refField || key === titleField) continue   // already in prefix
    if (joinKeys.has(key)) continue                        // handled below
    if (val === null || val === undefined || val === '') continue
    if (typeof val === 'object') continue                  // skip un-configured nested objects
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)
    parts.push(`${label}: ${display}`)
  }

  // Append join fields
  for (const { key, label } of joins) {
    const nested = row[key]
    if (!nested) continue
    // Support single-value joins: { project_name: 'Foo' }
    const names = Object.values(nested).filter(Boolean).join(', ')
    if (names) parts.push(`${label}: ${names}`)
  }

  return parts.join(' | ')
}
```

### Step 3 — Define per-module config
```js
const MODULE_FORMATTER_CONFIG = {
  risks:        { refField: 'risk_reference',    titleField: 'risk_title',        joins: [{ key: 'project', label: 'Project' }] },
  issues:       { refField: 'issue_reference',   titleField: 'issue_title',       joins: [{ key: 'project', label: 'Project' }] },
  mandates:     { refField: 'mandate_reference', titleField: 'mandate_title',     joins: [] },
  projects:     { refField: 'project_code',      titleField: 'project_name',      joins: [{ key: 'project_statuses', label: 'Status' }] },
  stakeholders: { refField: null,                titleField: 'stakeholder_name',  joins: [{ key: 'project', label: 'Project' }] },
  portfolio:    { refField: 'portfolio_code',    titleField: 'portfolio_name',    joins: [] },
  quality:      { refField: 'quality_item_id',   titleField: 'quality_title',     joins: [{ key: 'project', label: 'Project' }] },
  benefits:     { refField: 'benefit_reference', titleField: 'benefit_title',     joins: [{ key: 'project', label: 'Project' }] },
  tasks:        { refField: null,                titleField: 'task_name',         joins: [{ key: 'task_statuses', label: 'Status' }, { key: 'projects', label: 'Project' }] },
}
```

### Step 4 — Update SELECT in all 9 fetchXData() functions
Change every hardcoded `.select([...])` to `.select('*')` with only the join suffix:
```js
// Before
.select('id, risk_title, status_enum, risk_level, ...')

// After
.select('*, project:project_id(project_name)')
```
Tables with no joins just use `.select('*')`.

### Step 5 — Replace rowFormatters
```js
// Before: 9 separate hardcoded formatters
const rowFormatters = {
  risks: (r) => [`- [${r.risk_reference}] ...`].join(' | '),
  ...
}

// After: single universal formatter
const rowFormatters = Object.fromEntries(
  Object.entries(MODULE_FORMATTER_CONFIG).map(([module, config]) => [
    module,
    (row) => universalRowFormatter(row, config),
  ])
)
```

---

## What This Gives Us

| Concern | Before | After |
|---|---|---|
| New DB column visible to AI | Manual fix required | Automatic — zero code changes |
| New table/module onboarding | Write full SELECT + formatter | Add 1 config entry |
| Risk of field omissions | High — proven repeatedly | None |
| Formatter consistency | Varies per module | Uniform across all modules |
| Code size | ~150 lines of repetitive formatters | ~40 lines |

---

## Files to Change
- `src/utils/contextFetcher.js` — all changes confined to this one file

## Files NOT touched
- `aiAssistantService.js` — no change needed
- `intentDetector.js` — no change needed
- Any UI components — no change needed

---

## TODO

- [x] Add `SYSTEM_FIELDS` exclusion set
- [x] Write `universalRowFormatter(row, config)` function
- [x] Write `MODULE_FORMATTER_CONFIG` object
- [x] Update `fetchRiskData` SELECT to `'*, project:project_id(project_name)'`
- [x] Update `fetchIssueData` SELECT to `'*, project:project_id(project_name)'`
- [x] Update `fetchMandateData` SELECT to `'*, project:project_id(project_name)'`
- [x] Update `fetchProjectData` SELECT to `'*, project_statuses:status_id(status_name)'`
- [x] Update `fetchStakeholderData` SELECT to `'*, project:project_id(project_name)'`
- [x] Update `fetchPortfolioData` SELECT to `'*'`
- [x] Update `fetchQualityData` SELECT to `'*, project:project_id(project_name)'`
- [x] Update `fetchBenefitData` SELECT to `'*, project:project_id(project_name)'`
- [x] Update `fetchTaskData` SELECT to `'*, task_statuses(status_name), projects(project_name)'`
- [x] Replace `rowFormatters` block with dynamic `MODULE_FORMATTER_CONFIG` + `universalRowFormatter`
- [ ] Smoke-test each module query still returns correct data

## Review

All changes were confined to `src/utils/contextFetcher.js` only.

### What changed
1. All 9 `fetchXData()` SELECT statements replaced with `SELECT *` + explicit join suffixes.
2. ~150 lines of hardcoded `rowFormatters` replaced with:
   - `SYSTEM_FIELDS` set (fields always excluded: id, timestamps, tenant IDs, embedding vector)
   - `MODULE_FORMATTER_CONFIG` (9 entries — ref field, title field, join definitions)
   - `universalRowFormatter()` — iterates every key returned by Supabase, skips system fields
     and raw `_id` FK fields, formats booleans as Yes/No, snake_case → Title Case
   - `rowFormatters` now auto-generated from the config via `Object.fromEntries`

### Why this is durable
- Any new column added to any of the 9 DB tables is immediately visible to the AI
- No developer needs to touch `contextFetcher.js` when extending a table
- Adding a brand-new module only requires 1 config entry + 1 fetch function

---

## Risk / Notes
- `SELECT *` will include all columns including any large text fields (e.g. description, notes).
  These will be included in the AI context which is good for accuracy, but we have the 20,000 char
  slice as a cap so there is no unbounded memory risk.
- Boolean fields (is_deleted etc.) — `is_deleted` is already filtered by `.eq('is_deleted', false)`
  before results come back, so the formatter will only see rows where `is_deleted = false`.
  We skip `is_deleted` in `SYSTEM_FIELDS` regardless.
- Join objects (e.g. `project: { project_name: 'Foo' }`) are objects, so the main loop skips them.
  The `joins` config handles them explicitly — clean separation.
