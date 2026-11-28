/**
 * v1354 — Portfolio selection (D8, D11). Exact branch-and-bound up to 40 candidates.
 * Above that, or if the search is still running after the node cap, a ranked greedy
 * result is returned and labelled `greedy`.
 *
 * A project uses its cost and demand in the period it starts. It may start later by
 * up to maxShift period steps. Rules: mandatory, excluded, requires, exclusive.
 */
export const EXACT_LIMIT = 40
const NODE_LIMIT = 400000

function prepare(input) {
  const periods = (input.periods || []).map((p) => ({
    id: p.id,
    label: p.label || p.id,
    budget: Number(p.budget) || 0,
    capacity: Number(p.capacity) || 0,
  }))
  const maxShift = Math.max(0, Math.min(Number(input.maxShift) || 0, Math.max(0, periods.length - 1)))
  const rules = input.rules || []
  const excluded = new Set(rules.filter((r) => r.type === 'excluded').map((r) => r.projectId))
  const mandatory = new Set(rules.filter((r) => r.type === 'mandatory' && !excluded.has(r.projectId)).map((r) => r.projectId))
  const requires = rules.filter((r) => r.type === 'requires')
  const exclusive = rules.filter((r) => r.type === 'exclusive')
  const projects = (input.projects || [])
    .map((p) => ({
      id: p.id,
      name: p.name || p.id,
      score: Number(p.score) || 0,
      cost: Number(p.cost) || 0,
      demand: Number(p.demand) || 0,
    }))
    .filter((p) => !excluded.has(p.id))
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id)))
  return { periods, maxShift, mandatory, excluded, requires, exclusive, projects, all: input.projects || [] }
}

function fitsShift(project, shift, usedBudget, usedCapacity, periods) {
  if (shift < 0 || shift >= periods.length) return false
  return usedBudget[shift] + project.cost <= periods[shift].budget + 1e-6
    && usedCapacity[shift] + project.demand <= periods[shift].capacity + 1e-6
}

function breaksRules(id, chosenIds, requires, exclusive) {
  for (const r of requires) {
    if (r.projectId === id && !chosenIds.has(r.otherId)) return true
  }
  for (const r of exclusive) {
    if ((r.projectId === id && chosenIds.has(r.otherId)) || (r.otherId === id && chosenIds.has(r.projectId))) return true
  }
  return false
}

// v1359 (L7): "exclusive" can be checked as projects are added; "requires" only on the finished set, because
// projects are tried in score order and a high-scoring project may need a lower-scoring one added after it.
function breaksExclusive(id, chosenIds, exclusive) {
  for (const r of exclusive) {
    if ((r.projectId === id && chosenIds.has(r.otherId)) || (r.otherId === id && chosenIds.has(r.projectId))) return true
  }
  return false
}

function requiresMet(chosenIds, requires) {
  for (const r of requires) {
    if (chosenIds.has(r.projectId) && !chosenIds.has(r.otherId)) return false
  }
  return true
}

function scoreOf(chosen) {
  return Math.round(chosen.reduce((s, c) => s + c.score, 0) * 100) / 100
}

function pack(chosen, periods) {
  return {
    chosen: chosen.map((c) => ({ projectId: c.id, name: c.name, score: c.score, shift: c.shift, cost: c.cost, demand: c.demand })),
    totalScore: scoreOf(chosen),
    budgetUsed: periods.map((_, i) => Math.round(chosen.filter((c) => c.shift === i).reduce((s, c) => s + c.cost, 0) * 100) / 100),
    capacityUsed: periods.map((_, i) => Math.round(chosen.filter((c) => c.shift === i).reduce((s, c) => s + c.demand, 0) * 100) / 100),
  }
}

function branchAndBound(model) {
  const { projects, periods, maxShift, mandatory, requires, exclusive } = model
  const usedBudget = periods.map(() => 0)
  const usedCapacity = periods.map(() => 0)
  const chosen = []
  const chosenIds = new Set()
  let best = []
  let bestScore = -1
  let nodes = 0
  let exhausted = false

  const suffix = []
  for (let i = projects.length - 1; i >= 0; i--) suffix[i] = (suffix[i + 1] || 0) + projects[i].score

  function search(index) {
    if (exhausted) return
    nodes += 1
    if (nodes > NODE_LIMIT) { exhausted = true; return }
    if (scoreOf(chosen) + (suffix[index] || 0) <= bestScore + 1e-9) return
    if (index >= projects.length) {
      for (const id of mandatory) if (!chosenIds.has(id)) return
      if (!requiresMet(chosenIds, requires)) return
      const s = scoreOf(chosen)
      if (s > bestScore + 1e-9) { bestScore = s; best = chosen.map((c) => ({ ...c })) }
      return
    }
    const project = projects[index]
    const must = mandatory.has(project.id)
    if (!must) search(index + 1)
    if (exhausted) return
    if (!breaksExclusive(project.id, chosenIds, exclusive)) {
      for (let shift = 0; shift <= maxShift; shift++) {
        if (!fitsShift(project, shift, usedBudget, usedCapacity, periods)) continue
        usedBudget[shift] += project.cost
        usedCapacity[shift] += project.demand
        chosen.push({ ...project, shift })
        chosenIds.add(project.id)
        search(index + 1)
        chosen.pop()
        chosenIds.delete(project.id)
        usedBudget[shift] -= project.cost
        usedCapacity[shift] -= project.demand
        if (exhausted) return
      }
    }
    if (must && !chosenIds.has(project.id)) return
  }
  search(0)
  return { result: pack(best, periods), exhausted }
}

function greedy(model) {
  const { projects, periods, maxShift, mandatory, requires, exclusive } = model
  const usedBudget = periods.map(() => 0)
  const usedCapacity = periods.map(() => 0)
  const chosen = []
  const chosenIds = new Set()
  const order = [
    ...projects.filter((p) => mandatory.has(p.id)),
    ...projects.filter((p) => !mandatory.has(p.id)),
  ]
  const pendingRequires = [...requires]
  function tryAdd(project) {
    if (chosenIds.has(project.id)) return true
    if (breaksRules(project.id, chosenIds, pendingRequires.filter((r) => chosenIds.has(r.otherId) || r.projectId !== project.id), exclusive)
      && requires.some((r) => r.projectId === project.id && !chosenIds.has(r.otherId))) {
      const need = requires.find((r) => r.projectId === project.id && !chosenIds.has(r.otherId))
      const other = projects.find((p) => p.id === need.otherId)
      if (!other || !tryAdd(other)) return false
    }
    if (breaksRules(project.id, chosenIds, requires, exclusive)) return false
    for (let shift = 0; shift <= maxShift; shift++) {
      if (!fitsShift(project, shift, usedBudget, usedCapacity, periods)) continue
      usedBudget[shift] += project.cost
      usedCapacity[shift] += project.demand
      chosen.push({ ...project, shift })
      chosenIds.add(project.id)
      return true
    }
    return false
  }
  for (const project of order) tryAdd(project)
  return pack(chosen, periods)
}

function reasonFor(project, model, chosenIds, chosen) {
  if (model.excluded.has(project.id)) return 'Excluded by a rule'
  const nameOf = (id) => model.all.find((p) => p.id === id)?.name || id
  for (const r of model.exclusive) {
    if (r.projectId === project.id && chosenIds.has(r.otherId)) return `Cannot be in with ${nameOf(r.otherId)}`
    if (r.otherId === project.id && chosenIds.has(r.projectId)) return `Cannot be in with ${nameOf(r.projectId)}`
  }
  for (const r of model.requires) {
    if (r.projectId === project.id && !chosenIds.has(r.otherId)) return `Needs ${nameOf(r.otherId)}, which is out`
  }
  const usedBudget = model.periods.map((_, i) => chosen.filter((c) => c.shift === i).reduce((s, c) => s + c.cost, 0))
  const usedCapacity = model.periods.map((_, i) => chosen.filter((c) => c.shift === i).reduce((s, c) => s + c.demand, 0))
  let budget = false
  let capacity = false
  let any = false
  for (let shift = 0; shift <= model.maxShift; shift++) {
    any = true
    const overBudget = usedBudget[shift] + project.cost > model.periods[shift].budget + 1e-6
    const overCapacity = usedCapacity[shift] + project.demand > model.periods[shift].capacity + 1e-6
    if (!overBudget && !overCapacity) return 'A higher-scoring set was chosen'
    if (overBudget) budget = true
    if (overCapacity) capacity = true
  }
  if (!any) return 'No period to start in'
  if (budget && capacity) return 'Over the budget or the capacity in every period it could start'
  if (budget) return 'Over the budget in every period it could start'
  return 'Over the capacity in every period it could start'
}

function withReasons(model, packed, method) {
  const chosenIds = new Set(packed.chosen.map((c) => c.projectId))
  const chosen = packed.chosen.map((c) => ({ ...c, id: c.projectId }))
  const leftOut = (model.all || []).filter((p) => !chosenIds.has(p.id)).map((p) => ({
    projectId: p.id,
    name: p.name || p.id,
    reason: reasonFor(
      { id: p.id, name: p.name, score: Number(p.score) || 0, cost: Number(p.cost) || 0, demand: Number(p.demand) || 0 },
      model,
      chosenIds,
      chosen,
    ),
  }))
  return { ...packed, leftOut, method }
}

/** Every feasible subset for a small set. Used to check the exact search. */
export function bruteForcePortfolio(input) {
  const model = prepare(input)
  if (model.projects.length > 12) throw new Error('Brute force is limited to 12 projects')
  const n = model.projects.length
  let best = []
  let bestScore = -1
  const shifts = model.maxShift + 1
  const total = shifts ** n
  for (let mask = 0; mask < (2 ** n); mask++) {
    for (let s = 0; s < (mask === 0 ? 1 : total); s++) {
      const chosen = []
      const chosenIds = new Set()
      const usedBudget = model.periods.map(() => 0)
      const usedCapacity = model.periods.map(() => 0)
      let ok = true
      let shiftCursor = s
      for (let i = 0; i < n; i++) {
        if ((mask & (1 << i)) === 0) continue
        const shift = shiftCursor % shifts
        shiftCursor = Math.floor(shiftCursor / shifts)
        const project = model.projects[i]
        if (!fitsShift(project, shift, usedBudget, usedCapacity, model.periods)
          || breaksExclusive(project.id, chosenIds, model.exclusive)) { ok = false; break }
        usedBudget[shift] += project.cost
        usedCapacity[shift] += project.demand
        chosen.push({ ...project, shift })
        chosenIds.add(project.id)
      }
      if (!ok) continue
      for (const id of model.mandatory) if (!chosenIds.has(id)) { ok = false; break }
      if (!ok || !requiresMet(chosenIds, model.requires)) continue
      const sc = scoreOf(chosen)
      if (sc > bestScore + 1e-9) { bestScore = sc; best = chosen }
    }
  }
  return withReasons(model, pack(best, model.periods), 'exact')
}

export function optimisePortfolio(input) {
  const model = prepare(input)
  if (!model.periods.length) {
    return withReasons(model, { chosen: [], totalScore: 0, budgetUsed: [], capacityUsed: [] }, 'exact')
  }
  if (model.projects.length > EXACT_LIMIT) return withReasons(model, greedy(model), 'greedy')
  const exact = branchAndBound(model)
  if (exact.exhausted) return withReasons(model, greedy(model), 'greedy')
  return withReasons(model, exact.result, 'exact')
}
