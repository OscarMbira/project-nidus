/**
 * Client-side wrapper for diagnostic rules; server-side engine may live in test-runner/diagnostic-engine.
 */
export function mapFailureToHints({ failureClassification, message }) {
  if (!failureClassification) return { probable_cause: 'Unknown', recommended_fix: 'Triage manually', retest_steps: [] }
  return {
    probable_cause: `Classified: ${failureClassification}`,
    recommended_fix: message || 'Review logs and RLS for the affected route',
    retest_steps: ['Re-run failed test', 'Clear cache / session if auth-related'],
  }
}
