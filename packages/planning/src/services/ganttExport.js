/**
 * v1265 — export the Plan Sheet's Gantt chart: task names + bars only (owner request
 * 2026-10-13). buildGanttSvg() is pure (tested); the export helpers turn that one SVG into PNG,
 * PDF, PowerPoint, SVG or a print page, so every format shows the same picture.
 *
 * The export is print-friendly (white background) whatever the screen theme. Bars follow the
 * screen: blue tasks with the done part darker, red on the critical path, dark brackets for
 * summaries, diamonds for milestones, an amber line for today.
 */

const DAY = 86400000
const PX = { day: 24, week: 9, month: 3.2 }
const ROW = 26
const HEAD = 46
const NAME_W = 340
const PAD = 16
const FONT = "Inter, 'Segoe UI', Arial, sans-serif"

const toMs = (d) => {
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * rows: [{ outline, name, depth, summary, milestone, critical, start, finish, percent }]
 * options: { zoom: 'day'|'week'|'month', title, subtitle, today ('YYYY-MM-DD'), showOutline,
 *            heading (false = no title / subtitle in the picture, e.g. the preview shows them itself) }
 * Returns { svg, width, height, names, timeline }: svg is the whole standalone picture; names and
 * timeline are the same picture cut into the task-name column and the bars, same height, so a
 * preview can keep the names frozen while the timeline scrolls.
 */
export function buildGanttSvg(rows, { zoom = 'week', title = 'Plan', subtitle = '', today = null, showOutline = true, heading = true } = {}) {
  const px = PX[zoom] || PX.week
  const dated = rows.filter((r) => r.start)
  const all = dated.flatMap((r) => [toMs(r.start), toMs(r.finish || r.start)])
  const startMs = (all.length ? Math.min(...all) : Date.now()) - 3 * DAY
  const endMs = (all.length ? Math.max(...all) : Date.now()) + 7 * DAY
  const chartW = Math.max(200, Math.round(((endMs - startMs) / DAY) * px))
  const top = heading ? PAD + (subtitle ? 44 : 30) : PAD
  const width = PAD * 2 + NAME_W + chartW
  const height = top + HEAD + rows.length * ROW + PAD
  const x = (d) => NAME_W + PAD + ((toMs(d) - startMs) / DAY) * px

  const parts = []
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`)
  if (heading) parts.push(`<text x="${PAD}" y="${PAD + 16}" font-size="16" font-weight="700" fill="#111827">${esc(title)}</text>`)
  if (heading && subtitle) parts.push(`<text x="${PAD}" y="${PAD + 34}" font-size="11" fill="#4b5563">${esc(subtitle)}</text>`)

  // Timeline header: months on top, then days / week starts / month starts.
  const headY = top
  parts.push(`<rect x="${PAD}" y="${headY}" width="${width - PAD * 2}" height="${HEAD}" fill="#f3f4f6"/>`)
  parts.push(`<text x="${PAD + 8}" y="${headY + 29}" font-size="11" font-weight="600" fill="#374151">Task</text>`)
  for (let ms = startMs; ms <= endMs; ms += DAY) {
    const d = new Date(ms)
    const xx = NAME_W + PAD + ((ms - startMs) / DAY) * px
    if (d.getUTCDate() === 1 || ms === startMs) {
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      parts.push(`<text x="${xx + 3}" y="${headY + 15}" font-size="10" font-weight="600" fill="#374151">${esc(label)}</text>`)
      parts.push(`<line x1="${xx}" y1="${headY}" x2="${xx}" y2="${height - PAD}" stroke="#d1d5db" stroke-width="1"/>`)
    }
    const tick = zoom === 'day' || (zoom === 'week' && d.getUTCDay() === 1)
    if (tick) {
      parts.push(`<text x="${xx + 2}" y="${headY + 36}" font-size="9" fill="#6b7280">${d.getUTCDate()}</text>`)
      parts.push(`<line x1="${xx}" y1="${headY + HEAD}" x2="${xx}" y2="${height - PAD}" stroke="#eef0f3" stroke-width="1"/>`)
    }
    if (zoom === 'day' && (d.getUTCDay() === 0 || d.getUTCDay() === 6)) {
      parts.push(`<rect x="${xx}" y="${headY + HEAD}" width="${px}" height="${rows.length * ROW}" fill="#f9fafb"/>`)
    }
  }
  parts.push(`<line x1="${NAME_W + PAD}" y1="${headY}" x2="${NAME_W + PAD}" y2="${height - PAD}" stroke="#9ca3af" stroke-width="1"/>`)

  // Rows
  rows.forEach((r, i) => {
    const y = headY + HEAD + i * ROW
    if (i % 2 === 1) parts.push(`<rect x="${PAD}" y="${y}" width="${width - PAD * 2}" height="${ROW}" fill="#fafafa"/>`)
    parts.push(`<line x1="${PAD}" y1="${y + ROW}" x2="${width - PAD}" y2="${y + ROW}" stroke="#eef0f3" stroke-width="1"/>`)
    const label = `${showOutline && r.outline ? `${r.outline}  ` : ''}${r.name}`
    const indent = Math.min(r.depth || 0, 8) * 12
    parts.push(`<text x="${PAD + 8 + indent}" y="${y + 17}" font-size="11" ${r.summary ? 'font-weight="700"' : ''} fill="${r.critical && !r.summary ? '#b91c1c' : '#111827'}">${esc(clip(label, Math.floor((NAME_W - 16 - indent) / 6.2)))}</text>`)
    if (!r.start) return
    const left = x(r.start)
    const w = Math.max(px, x(r.finish || r.start) - left + px)
    const tone = r.critical ? '#dc2626' : '#3b82f6'
    const done = r.critical ? '#991b1b' : '#1d4ed8'
    if (r.milestone) {
      const cx = left + px / 2
      const cy = y + ROW / 2
      parts.push(`<path d="M${cx},${cy - 7} L${cx + 7},${cy} L${cx},${cy + 7} L${cx - 7},${cy} Z" fill="${r.critical ? '#dc2626' : '#7c3aed'}"/>`)
    } else if (r.summary) {
      const col = r.critical ? '#991b1b' : '#1f2937'
      parts.push(`<rect x="${left}" y="${y + 9}" width="${w}" height="5" fill="${col}"/>`)
      parts.push(`<rect x="${left}" y="${y + 9}" width="3" height="10" fill="${col}"/><rect x="${left + w - 3}" y="${y + 9}" width="3" height="10" fill="${col}"/>`)
    } else {
      const pct = Math.min(100, Math.max(0, Number(r.percent || 0)))
      parts.push(`<rect x="${left}" y="${y + 6}" width="${w}" height="${ROW - 12}" rx="3" fill="${tone}" fill-opacity="0.85"/>`)
      if (pct > 0) parts.push(`<rect x="${left}" y="${y + 6}" width="${(w * pct) / 100}" height="${ROW - 12}" rx="3" fill="${done}"/>`)
    }
  })

  if (today && toMs(today) >= startMs && toMs(today) <= endMs) {
    const tx = x(today)
    parts.push(`<line x1="${tx}" y1="${headY + HEAD}" x2="${tx}" y2="${height - PAD}" stroke="#f59e0b" stroke-width="2"/>`)
  }

  const body = parts.join('')
  const cut = (x0, w) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="${x0} 0 ${w} ${height}" font-family="${FONT}">${body}</svg>`
  const split = PAD + NAME_W
  return { svg: cut(0, width), width, height, names: cut(0, split), timeline: cut(split, width - split), namesWidth: split }
}

/** Plan Sheet rows (buildOutline rows with rolled-up tasks) → export rows. */
export function ganttRowsFromOutline(rows, projectRow = null) {
  const out = []
  if (projectRow) {
    out.push({ outline: '', name: projectRow.task_name, depth: 0, summary: true, milestone: false, critical: !!projectRow.is_critical_path,
      start: projectRow.planned_start_date, finish: projectRow.planned_end_date, percent: projectRow.percentage_complete })
  }
  for (const r of rows) {
    const t = r.task
    out.push({
      outline: r.outline, name: t.task_name, depth: r.depth + (projectRow ? 1 : 0), summary: !!t.is_summary,
      milestone: !!t.is_milestone && !t.is_summary, critical: !!t.is_critical_path,
      start: t.planned_start_date, finish: t.planned_end_date || t.planned_start_date, percent: t.percentage_complete,
    })
  }
  return out
}

const fileStamp = () => new Date().toISOString().slice(0, 10)
const safeName = (s) => String(s || 'Plan').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '_') || 'Plan'

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** SVG → PNG data URL at `scale` (2 = sharp on screens and in documents). */
export function svgToPngDataUrl({ svg, width, height }, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Could not draw the Gantt chart.'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

export async function exportGanttSvg(chart, name) {
  download(new Blob([chart.svg], { type: 'image/svg+xml' }), `${safeName(name)}_Gantt_${fileStamp()}.svg`)
}

export async function exportGanttPng(chart, name) {
  const dataUrl = await svgToPngDataUrl(chart)
  const blob = await (await fetch(dataUrl)).blob()
  download(blob, `${safeName(name)}_Gantt_${fileStamp()}.png`)
}

/** A3 landscape PDF; a tall chart continues on further pages (same width, sliced by height). */
export async function exportGanttPdf(chart, name) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 24
  const scale = Math.min(1, (pageW - margin * 2) / chart.width)
  const sliceH = Math.floor((pageH - margin * 2) / scale) // chart px per page
  const pages = Math.max(1, Math.ceil(chart.height / sliceH))
  const png = await svgToPngDataUrl(chart, 2)
  const img = await new Promise((res, rej) => { const i = new window.Image(); i.onload = () => res(i); i.onerror = rej; i.src = png })
  for (let p = 0; p < pages; p += 1) {
    if (p > 0) doc.addPage()
    const h = Math.min(sliceH, chart.height - p * sliceH)
    const c = document.createElement('canvas')
    c.width = chart.width * 2
    c.height = h * 2
    c.getContext('2d').drawImage(img, 0, p * sliceH * 2, chart.width * 2, h * 2, 0, 0, chart.width * 2, h * 2)
    doc.addImage(c.toDataURL('image/png'), 'PNG', margin, margin, chart.width * scale, h * scale)
  }
  doc.save(`${safeName(name)}_Gantt_${fileStamp()}.pdf`)
}

/** One wide slide per ~18 rows, each with the timeline header, so every row stays readable. */
export async function exportGanttPptx(rows, options, name) {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  const PER = 18
  const chunks = []
  for (let i = 0; i < Math.max(rows.length, 1); i += PER) chunks.push(rows.slice(i, i + PER))
  for (const [i, chunk] of chunks.entries()) {
    const chart = buildGanttSvg(chunk, { ...options, subtitle: `${options.subtitle || ''}${chunks.length > 1 ? `  ·  Part ${i + 1} of ${chunks.length}` : ''}` })
    const png = await svgToPngDataUrl(chart, 2)
    const slide = pptx.addSlide()
    const maxW = 12.8
    const maxH = 7.0
    const ratio = Math.min(maxW / (chart.width / 96), maxH / (chart.height / 96))
    slide.addImage({ data: png, x: 0.27, y: 0.25, w: (chart.width / 96) * ratio, h: (chart.height / 96) * ratio })
  }
  await pptx.writeFile({ fileName: `${safeName(name)}_Gantt_${fileStamp()}.pptx` })
}

/**
 * Open the chart in its own browser window (task names frozen on the left, timeline scrolls),
 * so it can be resized or moved to a second screen. `chart` comes from buildGanttSvg with
 * heading: false; the title and subtitle are shown above it.
 */
export function openGanttWindow(chart, title, subtitle = '') {
  const w = window.open('', '_blank')
  if (!w) throw new Error('Allow pop-ups to open the Gantt chart in a new window.')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(title)} · Gantt chart</title>
    <style>
      html,body{margin:0;height:100%;background:#fff;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#111827}
      header{padding:12px 16px;border-bottom:1px solid #e5e7eb}
      h1{margin:0;font-size:18px} p{margin:2px 0 0;font-size:12px;color:#6b7280}
      .scroll{position:absolute;top:64px;left:0;right:0;bottom:0;overflow:auto}
      .row{display:flex;width:max-content}
      .names{position:sticky;left:0;z-index:1;background:#fff;box-shadow:2px 0 4px rgba(0,0,0,.08)}
    </style></head>
    <body><header><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</header>
    <div class="scroll"><div class="row"><div class="names">${chart.names}</div><div>${chart.timeline}</div></div></div></body></html>`)
  w.document.close()
}

export function printGantt(chart, title) {
  // No 'noopener': with it the browser returns no window to write the chart into.
  const w = window.open('', '_blank')
  if (!w) throw new Error('Allow pop-ups to print the Gantt chart.')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>@page{size:landscape;margin:10mm}body{margin:0}svg{width:100%;height:auto}</style></head>
    <body>${chart.svg}<script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
}
