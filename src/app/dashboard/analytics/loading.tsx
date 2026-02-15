export default function AnalyticsLoading() {
  return (
    <div className="px-4 sm:px-0 animate-pulse">
      <div className="h-8 w-36 bg-gray-200 rounded mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
