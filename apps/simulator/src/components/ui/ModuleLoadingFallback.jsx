/**
 * Skeleton UI shown while a federated module chunk loads.
 */
export default function ModuleLoadingFallback({ label = 'Loading module…' }) {
  return (
    <div
      className="flex flex-col gap-3 p-6 animate-pulse"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-6 w-48 rounded bg-gray-700" />
      <div className="h-4 w-full max-w-xl rounded bg-gray-800" />
      <div className="h-4 w-full max-w-lg rounded bg-gray-800" />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 rounded bg-gray-800" />
        <div className="h-32 rounded bg-gray-800" />
      </div>
    </div>
  )
}
