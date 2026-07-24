export function initAppErrorReporting({ system, getAuthClient }) {
  const report = (error, context = {}) => {
    console.error(`[${system}] Error:`, error, context)
  }

  window.addEventListener('error', (event) => {
    report(event.error || event.message, { type: 'uncaught', filename: event.filename, lineno: event.lineno })
  })

  window.addEventListener('unhandledrejection', (event) => {
    report(event.reason, { type: 'unhandled-rejection' })
  })

  return { report }
}
