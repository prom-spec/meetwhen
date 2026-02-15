export default function DashboardLoading() {
  return (
    <div className="px-4 sm:px-0 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
