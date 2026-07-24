export default function AdminFeatureMoved({ feature = 'This feature' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="text-xl font-semibold text-gray-100">{feature} has moved</h1>
      <p className="mt-4 max-w-md text-gray-400">
        System-wide administration is now handled in the separate Admin application.
        Contact your Super Admin for access.
      </p>
    </div>
  )
}
