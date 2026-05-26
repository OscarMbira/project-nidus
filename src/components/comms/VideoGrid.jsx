/** Responsive grid for local + remote video tiles (2×2 mobile, up to 3×3 desktop). */
export default function VideoGrid({ localVideoRef, remoteUsers = [] }) {
  const n = 1 + remoteUsers.length
  const gridClass =
    n <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : n <= 4
        ? 'grid-cols-2'
        : n <= 9
          ? 'grid-cols-2 md:grid-cols-3'
          : 'grid-cols-3'

  return (
    <div className={`grid ${gridClass} gap-2 flex-1 min-h-[200px] p-2`}>
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        <div ref={localVideoRef} className="w-full h-full object-cover bg-black" />
        <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">You</span>
      </div>
      {remoteUsers.map((u, i) => (
        <div key={u.uid ?? i} className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">          <div ref={u.videoRef} className="w-full h-full object-cover bg-black" />
          <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">{u.label || `User ${i + 1}`}</span>
        </div>
      ))}
    </div>
  )
}
