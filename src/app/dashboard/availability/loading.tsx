export default function AvailabilityLoading() {
  return (
    <div className="px-4 sm:px-0 animate-pulse">
      <div className="h-8 w-36 bg-gray-200 rounded mb-6" />
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="space-y-4">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="h-4 w-12 bg-gray-200 rounded" />
              <div className="h-8 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-4 bg-gray-200 rounded" />
              <div className="h-8 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
