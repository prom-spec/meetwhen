export default function Loading() {
  return (
    <div className="px-4 sm:px-0 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 bg-gray-200 rounded" />
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-5 w-44 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-28 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
