/**
 * v1239 Slice 4.4 — schedule import / export (replaces the unused apps/*\/services/msProjectService.js).
 *
 * Formats (neutral names in the UI):
 *   - XML: the common project-schedule exchange XML (<Project><Tasks><Task> with UID, Name,
 *     Duration, Start, Finish, Milestone, PercentComplete, PredecessorLink), read by most
 *     desktop scheduling tools.
 *   - Spreadsheet (XLSX) and CSV: one row per task, columns in TEMPLATE_COLUMNS.
 * Every downloadable file carries a legend / data dictionary (rule 71): XLSX → Instructions +
 * Legend sheets; CSV → a `#` DATA DICTIONARY block at the top; XML → a leading comment block.
 *
 * Everything here is pure (no database). Saving goes through scheduleData.importPlan().
 */

export const TEMPLATE_COLUMNS = [
  { key: 'id', label: 'ID', required: true, type: 'Whole number', max: '6 digits', format: 'Unique row number in this file, used by Predecessors.', aliases: ['UID', 'Row', '#'] },
  { key: 'name', label: 'Task name', required: true, type: 'Text', max: '200 characters', format: 'What the work is.', aliases: ['Name', 'Task', 'Activity'] },
  { key: 'duration', label: 'Duration (days)', required: false, type: 'Whole number', max: '0–3650', format: 'Working days. 0 means a milestone. Leave blank to use Start/Finish.', aliases: ['Duration', 'Days'] },
  { key: 'start', label: 'Start', required: false, type: 'Date', max: '', format: 'YYYY-MM-DD. Fixes the start (manual task) when set.', aliases: ['Start date', 'Planned start'] },
  { key: 'finish', label: 'Finish', required: false, type: 'Date', max: '', format: 'YYYY-MM-DD. Used with Start to work out the duration.', aliases: ['Finish date', 'End', 'End date'] },
  { key: 'milestone', label: 'Milestone', required: false, type: 'Yes/No', max: '', format: 'Yes, No, true, false, 1 or 0.', aliases: ['Is milestone'] },
  { key: 'percent', label: '% done', required: false, type: 'Number', max: '0–100', format: 'Progress so far.', aliases: ['% complete', 'Percent complete', 'Progress'] },
  { key: 'predecessors', label: 'Predecessors', required: false, type: 'Text', max: '', format: 'IDs this task comes after, comma separated, with optional type and lag: 3, 5SS, 7FF+2, 9FS-1. Types: FS (default), SS, FF, SF. Lag is in working days.', aliases: ['Depends on', 'Links'] },
  { key: 'estimated_hours', label: 'Estimated hours', required: false, type: 'Number', max: '0–99999', format: 'Effort, for the Workload view.', aliases: ['Work', 'Effort', 'Hours'] },
]

const TYPE_FROM_XML = { 0: 'FF', 1: 'FS', 2: 'SF', 3: 'SS' }
const TYPE_TO_XML = { FF: 0, FS: 1, SF: 2, SS: 3 }
export const TYPE_TO_DB = { FS: 'finish_to_start', SS: 'start_to_start', FF: 'finish_to_finish', SF: 'start_to_finish' }
const DB_TO_TYPE = Object.fromEntries(Object.entries(TYPE_TO_DB).map(([k, v]) => [v, k]))

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9%#]+/g, ' ').trim()
const isoDate = (v) => {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined // undefined = present but unreadable
}
const yes = (v) => /^(y|yes|true|1)$/i.test(String(v ?? '').trim())

/** "3, 5SS, 7FF+2, 9fs-1" → [{ ref, type, lag }] (null on a bad token). */
export function parsePredecessors(text) {
  const out = []
  for (const raw of String(text ?? '').split(/[,;]/).map((t) => t.trim()).filter(Boolean)) {
    const m = raw.match(/^(\w+?)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+)?\s*(d|days?)?$/i)
    if (!m) return null
    out.push({ ref: m[1], type: (m[2] || 'FS').toUpperCase(), lag: m[3] ? Number(m[3].replace(/\s/g, '')) : 0 })
  }
  return out
}

/** ISO-8601 duration from schedule XML (PT40H0M0S, P5D…) → working days (8 h/day). */
export function xmlDurationToDays(text, hoursPerDay = 8) {
  const m = String(text ?? '').match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/)
  if (!m) return null
  const hours = Number(m[1] || 0) * hoursPerDay + Number(m[2] || 0) + Number(m[3] || 0) / 60 + Number(m[4] || 0) / 3600
  return Math.round(hours / hoursPerDay)
}

/**
 * Validate parsed rows into a preview: { tasks, links, errors, warnings }.
 * tasks: [{ ref, task_name, estimated_duration_days, is_milestone, planned_start_date,
 *           planned_end_date, schedule_mode, percentage_complete, estimated_hours }]
 * links: [{ fromRef, toRef, type, lag }]
 */
export function buildPreview(rows) {
  const errors = []
  const warnings = []
  const tasks = []
  const refs = new Set()
  rows.forEach((r, i) => {
    const line = `Row ${i + 1}`
    const ref = String(r.id ?? '').trim()
    const name = String(r.name ?? '').trim()
    if (!ref && !name) return // blank line
    if (!ref) { errors.push(`${line}: ID is missing.`); return }
    if (refs.has(ref)) { errors.push(`${line}: ID ${ref} is used twice.`); return }
    if (!name) { errors.push(`${line}: Task name is missing.`); return }
    if (name.length > 200) { errors.push(`${line}: Task name is longer than 200 characters.`); return }
    refs.add(ref)
    const start = isoDate(r.start)
    const finish = isoDate(r.finish)
    if (start === undefined) errors.push(`${line}: Start "${r.start}" is not a YYYY-MM-DD date.`)
    if (finish === undefined) errors.push(`${line}: Finish "${r.finish}" is not a YYYY-MM-DD date.`)
    if (start && finish && finish < start) errors.push(`${line}: Finish is before Start.`)
    let duration = r.duration === '' || r.duration === null || r.duration === undefined ? null : Number(r.duration)
    if (duration !== null && (!Number.isFinite(duration) || duration < 0 || duration > 3650)) { errors.push(`${line}: Duration must be 0–3650 days.`); duration = null }
    const milestone = yes(r.milestone) || duration === 0
    const pct = r.percent === '' || r.percent === undefined || r.percent === null ? 0 : Number(r.percent)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) errors.push(`${line}: % done must be 0–100.`)
    const hours = r.estimated_hours === '' || r.estimated_hours == null ? null : Number(r.estimated_hours)
    if (hours !== null && (!Number.isFinite(hours) || hours < 0)) errors.push(`${line}: Estimated hours must be a positive number.`)
    if (duration === null && !milestone && !(start && finish)) warnings.push(`${line}: no duration or dates — it will be 1 day long.`)
    tasks.push({
      ref,
      task_name: name,
      estimated_duration_days: milestone ? 0 : duration ?? null,
      is_milestone: milestone,
      planned_start_date: start || null,
      planned_end_date: finish || null,
      schedule_mode: start && !r.predecessors ? 'manual' : 'auto',
      percentage_complete: Number.isFinite(pct) ? pct : 0,
      estimated_hours: hours,
      _predecessors: r.predecessors,
      _line: line,
    })
  })
  const links = []
  for (const t of tasks) {
    const preds = parsePredecessors(t._predecessors)
    if (preds === null) { errors.push(`${t._line}: Predecessors "${t._predecessors}" could not be read (example: 3, 5SS, 7FF+2).`); continue }
    for (const p of preds) {
      if (!refs.has(p.ref)) { errors.push(`${t._line}: Predecessor ${p.ref} is not an ID in this file.`); continue }
      if (p.ref === t.ref) { errors.push(`${t._line}: a task cannot come after itself.`); continue }
      links.push({ fromRef: p.ref, toRef: t.ref, type: p.type, lag: p.lag })
    }
  }
  for (const t of tasks) { delete t._predecessors; delete t._line }
  if (!tasks.length && !errors.length) errors.push('The file has no tasks.')
  return { tasks, links, errors, warnings }
}

// ── Readers ────────────────────────────────────────────────────────────────

/** Map a header row (any case/alias) to TEMPLATE_COLUMNS keys. */
export function mapHeaders(headers) {
  const lookup = new Map()
  for (const c of TEMPLATE_COLUMNS) for (const n of [c.label, c.key, ...c.aliases]) lookup.set(norm(n), c.key)
  return headers.map((h) => lookup.get(norm(h)) || null)
}

/** CSV text → row objects. `#` lines (the data dictionary) and blank lines are skipped. */
export function readCsv(text) {
  const lines = []
  let row = []
  let cell = ''
  let quoted = false
  const src = String(text).replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); lines.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); lines.push(row) }
  const data = lines.filter((l) => !(l.length === 1 && l[0].trim() === '') && !String(l[0]).trim().startsWith('#'))
  if (!data.length) return []
  return toObjects(data[0], data.slice(1))
}

export function toObjects(headerRow, bodyRows) {
  const keys = mapHeaders(headerRow)
  if (!keys.includes('id') || !keys.includes('name')) throw new Error('The file needs at least the columns "ID" and "Task name". Download the template to see the layout.')
  return bodyRows.map((cells) => Object.fromEntries(keys.map((k, i) => [k, cells[i]]).filter(([k]) => k)))
}

/** Schedule exchange XML text → row objects (same shape as the spreadsheet rows). */
export function readXml(text, DOMParserImpl = globalThis.DOMParser) {
  const doc = new DOMParserImpl().parseFromString(String(text), 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('This XML file could not be read.')
  const child = (el, name) => {
    for (const c of Array.from(el.childNodes)) if (c.nodeType === 1 && c.localName === name) return c.textContent
    return null
  }
  const out = []
  for (const t of Array.from(doc.getElementsByTagNameNS('*', 'Task'))) {
    const uid = child(t, 'UID')
    const name = child(t, 'Name')
    if (uid === null || !name || child(t, 'Summary') === '1' || uid === '0') continue // summary/project rows
    const preds = Array.from(t.childNodes)
      .filter((c) => c.nodeType === 1 && c.localName === 'PredecessorLink')
      .map((l) => {
        const lagDays = Math.round(Number(child(l, 'LinkLag') || 0) / 4800) // tenths of a minute → 8 h days
        return `${child(l, 'PredecessorUID')}${TYPE_FROM_XML[Number(child(l, 'Type') ?? 1)] || 'FS'}${lagDays ? (lagDays > 0 ? `+${lagDays}` : lagDays) : ''}`
      })
    out.push({
      id: uid,
      name,
      duration: xmlDurationToDays(child(t, 'Duration')),
      start: isoDate(child(t, 'Start')) || '',
      finish: isoDate(child(t, 'Finish')) || '',
      milestone: child(t, 'Milestone') === '1' ? 'Yes' : 'No',
      percent: child(t, 'PercentComplete') || 0,
      predecessors: preds.join(', '),
      estimated_hours: (() => { const w = xmlDurationToDays(child(t, 'Work'), 1); return w || '' })(),
    })
  }
  return out
}

// ── Writers ────────────────────────────────────────────────────────────────

/** DB tasks + dependencies → template rows (IDs 1..n in date order). */
export function toExportRows(tasks, dependencies) {
  const ordered = [...tasks].sort((a, b) => String(a.planned_start_date || '9999').localeCompare(String(b.planned_start_date || '9999')) || String(a.task_name).localeCompare(String(b.task_name)))
  const num = new Map(ordered.map((t, i) => [t.id, i + 1]))
  return ordered.map((t) => ({
    id: num.get(t.id),
    name: t.task_name,
    duration: t.is_milestone ? 0 : t.estimated_duration_days ?? '',
    start: t.planned_start_date || '',
    finish: t.planned_end_date || '',
    milestone: t.is_milestone ? 'Yes' : 'No',
    percent: Number(t.percentage_complete || 0),
    predecessors: dependencies
      .filter((d) => d.successor_task_id === t.id && num.has(d.predecessor_task_id))
      .map((d) => {
        const type = DB_TO_TYPE[d.dependency_type] || 'FS'
        const lag = Number(d.lag_days || 0)
        return `${num.get(d.predecessor_task_id)}${type === 'FS' && !lag ? '' : type}${lag ? (lag > 0 ? `+${lag}` : lag) : ''}`
      })
      .join(', '),
    estimated_hours: t.estimated_hours ?? '',
  }))
}

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV with a `#` DATA DICTIONARY block (rule 71). rows = [] gives the blank template. */
export function buildCsv(rows = []) {
  const dict = [
    '# DATA DICTIONARY — schedule import file. Lines starting with # are ignored on import.',
    '# Column | Required | Type | Limit | Notes | Also accepted as',
    ...TEMPLATE_COLUMNS.map((c) => `# ${c.label} | ${c.required ? 'Yes' : 'No'} | ${c.type} | ${c.max || '-'} | ${c.format} | ${c.aliases.join(' / ')}`),
    '#',
  ]
  const header = TEMPLATE_COLUMNS.map((c) => csvCell(c.label)).join(',')
  const body = rows.map((r) => TEMPLATE_COLUMNS.map((c) => csvCell(r[c.key])).join(','))
  return [...dict, header, ...body].join('\r\n') + '\r\n'
}

/** XLSX workbook (Instructions, Legend, Tasks). `XLSX` is the SheetJS module, passed in. */
export function buildWorkbook(XLSX, rows = []) {
  const wb = XLSX.utils.book_new()
  const instructions = [
    ['Schedule import file'],
    [''],
    ['1. Fill in one row per task on the Tasks sheet. Keep the header row.'],
    ['2. ID must be unique in the file. Predecessors refer to these IDs.'],
    ['3. Give either a Duration (working days) or Start and Finish dates. Duration 0 makes a milestone.'],
    ['4. Import it from Planning > Schedule > Import / export. You will see a preview before anything is saved.'],
    ['5. Imported tasks are added to the chosen project; nothing already in the plan is changed.'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), 'Instructions')
  const legend = [['Column', 'Required', 'Type', 'Limit', 'Notes', 'Also accepted as'],
    ...TEMPLATE_COLUMNS.map((c) => [c.label, c.required ? 'Yes' : 'No', c.type, c.max || '', c.format, c.aliases.join(', ')])]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(legend), 'Legend')
  const data = [TEMPLATE_COLUMNS.map((c) => c.label), ...rows.map((r) => TEMPLATE_COLUMNS.map((c) => r[c.key] ?? ''))]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Tasks')
  return wb
}

/** XLSX → row objects from the "Tasks" sheet (or the first sheet with an ID column). */
export function readWorkbook(XLSX, arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const names = wb.SheetNames.includes('Tasks') ? ['Tasks', ...wb.SheetNames.filter((n) => n !== 'Tasks')] : wb.SheetNames
  for (const n of names) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })
    if (!aoa.length) continue
    const keys = mapHeaders(aoa[0])
    if (keys.includes('id') && keys.includes('name')) return toObjects(aoa[0], aoa.slice(1))
  }
  throw new Error('No sheet with "ID" and "Task name" columns was found. Download the template to see the layout.')
}

const xmlEsc = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))

/** Schedule exchange XML, with a leading comment explaining the fields (rule 71). */
export function buildXml(rows, projectName = 'Project') {
  const tasks = rows.map((r) => {
    const preds = (parsePredecessors(r.predecessors) || []).map((p) =>
      `      <PredecessorLink><PredecessorUID>${xmlEsc(p.ref)}</PredecessorUID><Type>${TYPE_TO_XML[p.type] ?? 1}</Type><LinkLag>${p.lag * 4800}</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`).join('\n')
    const days = Number(r.duration) || 0
    return [
      '    <Task>',
      `      <UID>${xmlEsc(r.id)}</UID>`,
      `      <ID>${xmlEsc(r.id)}</ID>`,
      `      <Name>${xmlEsc(r.name)}</Name>`,
      r.start ? `      <Start>${r.start}T08:00:00</Start>` : '',
      r.finish ? `      <Finish>${r.finish}T17:00:00</Finish>` : '',
      `      <Duration>PT${days * 8}H0M0S</Duration>`,
      `      <Milestone>${r.milestone === 'Yes' ? 1 : 0}</Milestone>`,
      `      <PercentComplete>${Math.round(Number(r.percent) || 0)}</PercentComplete>`,
      r.estimated_hours ? `      <Work>PT${Number(r.estimated_hours)}H0M0S</Work>` : '',
      preds,
      '    </Task>',
    ].filter(Boolean).join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<!-- Schedule exchange file. Fields per Task: UID/ID (row id), Name, Start/Finish (date-time),',
    '     Duration (ISO-8601, 8 hours = 1 working day), Milestone (1/0), PercentComplete (0-100),',
    '     Work (estimated effort), PredecessorLink (PredecessorUID, Type 0=FF 1=FS 2=SF 3=SS,',
    '     LinkLag in tenths of a minute: 4800 = 1 working day). -->',
    '<Project xmlns="http://schemas.microsoft.com/project">',
    `  <Name>${xmlEsc(projectName)}</Name>`,
    '  <Tasks>',
    ...tasks,
    '  </Tasks>',
    '</Project>',
    '',
  ].join('\n')
}

/** Browser download helper. */
export function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
