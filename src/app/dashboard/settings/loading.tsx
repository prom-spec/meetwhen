export default function SettingsLoading() {
  return (
    <div className="px-4 sm:px-0 animate-pulse">
      <div className="h-8 w-28 bg-gray-200 rounded mb-6" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-10 w-full bg-gray-100 rounded mb-3" />
            <div className="h-10 w-full bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
