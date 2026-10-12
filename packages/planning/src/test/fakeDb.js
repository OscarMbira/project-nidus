/**
 * Test helper: a fake Supabase client. Every query chain is recorded as
 * { table, ops: [[method, ...args], ...] } and resolves with whatever `respond(query)` returns
 * ({ data, error }). `rpc(name, args)` goes through the same `respond` with table = `rpc:<name>`.
 */
export function makeFakeDb(respond = () => ({ data: null, error: null })) {
  const calls = []
  const builder = (table) => {
    const query = { table, ops: [] }
    calls.push(query)
    const settle = () => Promise.resolve(respond(query))
    const proxy = new Proxy({}, {
      get(_, prop) {
        if (prop === 'then') return (res, rej) => settle().then(res, rej)
        return (...args) => {
          query.ops.push([prop, ...args])
          return proxy
        }
      },
    })
    return proxy
  }
  return {
    calls,
    from: (table) => builder(table),
    rpc: (name, args) => {
      const query = { table: `rpc:${name}`, ops: [['args', args]] }
      calls.push(query)
      return Promise.resolve(respond(query))
    },
    auth: { getUser: async () => ({ data: { user: { id: 'auth-1' } } }) },
  }
}

/** The value passed to the first `method` call in a recorded query, e.g. opArg(q, 'eq'). */
export const opArgs = (query, method) => query.ops.filter((o) => o[0] === method).map((o) => o.slice(1))
