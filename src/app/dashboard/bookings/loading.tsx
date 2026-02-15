export default function BookingsLoading() {
  return (
    <div className="px-4 sm:px-0 animate-pulse">
      <div className="h-8 w-36 bg-gray-200 rounded mb-6" />
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
