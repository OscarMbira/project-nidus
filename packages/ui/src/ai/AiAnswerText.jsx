/**
 * v1272 — renders an Ask Nidus answer: paragraphs, "-"/"•"/"1." lists and **bold**.
 * Deliberately small (no HTML from the model is ever rendered).
 */
function inline(text, keyBase) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4
      ? <strong key={`${keyBase}-${i}`} className="font-semibold">{p.slice(2, -2)}</strong>
      : <span key={`${keyBase}-${i}`}>{p}</span>
  )
}

export function answerBlocks(text) {
  const blocks = []
  let list = null
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (bullet) {
      const ordered = /^\s*\d/.test(line)
      if (!list || list.ordered !== ordered) {
        list = { type: 'list', ordered, items: [] }
        blocks.push(list)
      }
      list.items.push(bullet[1])
      continue
    }
    list = null
    if (!line.trim()) continue
    const heading = line.match(/^#{1,4}\s+(.*)$/)
    blocks.push(heading ? { type: 'heading', text: heading[1] } : { type: 'p', text: line })
  }
  return blocks
}

export default function AiAnswerText({ text }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-800 dark:text-gray-100">
      {answerBlocks(text).map((b, i) => {
        if (b.type === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul'
          return (
            <Tag key={i} className={`${b.ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
              {b.items.map((item, j) => <li key={j}>{inline(item, `${i}-${j}`)}</li>)}
            </Tag>
          )
        }
        if (b.type === 'heading') return <p key={i} className="font-semibold">{inline(b.text, i)}</p>
        return <p key={i}>{inline(b.text, i)}</p>
      })}
    </div>
  )
}
