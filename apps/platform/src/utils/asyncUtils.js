/** Race a promise against a timeout so a hung network call surfaces an error instead of
 * leaving UI state (e.g. a "Saving…" button) stuck forever. Same shape as the withTimeout()
 * used in ProjectsEdit.jsx's save pipeline. */
export function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}
