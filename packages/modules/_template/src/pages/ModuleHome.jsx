/**
 * MODULE_DISPLAY federated module home (placeholder until domain pages migrate).
 */
export default function ModuleHome() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 max-w-lg">
      <h1 className="text-xl font-semibold text-white mb-2">MODULE_DISPLAY</h1>
      <p className="text-gray-400 text-sm">
        Federated module <code className="text-blue-400">MODULE_NAME</code> is active.
        Domain pages load via the platform shell or expand routes in this package.
      </p>
    </div>
  )
}
