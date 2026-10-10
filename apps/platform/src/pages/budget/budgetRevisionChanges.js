const amountOf = (line) => Number(line?.budget_amount) || 0
const fundingOf = (line) => line?.funding_source_id ?? null

export function totalOf(lines = []) {
  return lines.reduce((sum, line) => sum + amountOf(line), 0)
}

function compareLine(name, from, to, changes) {
  if (amountOf(from) !== amountOf(to)) {
    changes.push({ type: 'changed', name, from: amountOf(from), to: amountOf(to) })
  }
  if (fundingOf(from) !== fundingOf(to)) {
    changes.push({ type: 'funding', name, from: fundingOf(from), to: fundingOf(to) })
  }
}

export function describeRevisionChanges(before, after) {
  const beforeLines = before || []
  const afterLines = after || []
  const afterNames = new Set(afterLines.map((line) => line.category_name))
  const beforeNames = new Set(beforeLines.map((line) => line.category_name))
  const changes = []

  const unmatchedBefore = beforeLines.filter((line) => !afterNames.has(line.category_name))
  const unmatchedAfter = afterLines.filter((line) => !beforeNames.has(line.category_name))

  for (const line of afterLines) {
    const previous = beforeLines.find((b) => b.category_name === line.category_name)
    if (previous) compareLine(line.category_name, previous, line, changes)
  }

  const removed = []
  for (const oldLine of unmatchedBefore) {
    const index = unmatchedAfter.findIndex((n) => n.display_order != null && n.display_order === oldLine.display_order)
    if (index >= 0) {
      const [newLine] = unmatchedAfter.splice(index, 1)
      changes.push({ type: 'renamed', from: oldLine.category_name, to: newLine.category_name })
      compareLine(newLine.category_name, oldLine, newLine, changes)
    } else {
      removed.push({ type: 'removed', name: oldLine.category_name, from: amountOf(oldLine) })
    }
  }

  for (const newLine of unmatchedAfter) {
    changes.push({ type: 'added', name: newLine.category_name, to: amountOf(newLine) })
  }

  return [...changes, ...removed]
}
