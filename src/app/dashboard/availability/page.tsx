"use client"

import { useState, useEffect } from "react"
import { Save, Plus, Trash2, Calendar, X, Loader2, Globe, Shield } from "lucide-react"
import { useToast } from "@/components/ToastProvider"

// Note: metadata must be in a separate layout.tsx for client components
// Title is set in the dashboard layout

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  const time = `${hour.toString().padStart(2, "0")}:${minute}`
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const ampm = hour < 12 ? "AM" : "PM"
  return { value: time, label: `${displayHour}:${minute} ${ampm}` }
})

interface AvailabilitySlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface DateOverride {
  id: string
  date: string
  isAvailable: boolean
  startTime: string | null
  endTime: string | null
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Work-week defaults
  const [defaultLabel, setDefaultLabel] = useState("Mon–Fri 9–5")
  const [defaultWorkDays, setDefaultWorkDays] = useState<number[]>([1, 2, 3, 4, 5])

  // Holiday blocking
  const [blockHolidays, setBlockHolidays] = useState(false)
  const [holidayCountry, setHolidayCountry] = useState<string | null>(null)
  const [holidaySaving, setHolidaySaving] = useState(false)
  const [holidayCount, setHolidayCount] = useState<number | null>(null)

  // Date override modal state
  const { toast } = useToast()
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [overrideDate, setOverrideDate] = useState("")
  const [overrideType, setOverrideType] = useState<"unavailable" | "custom">("unavailable")
  const [overrideStartTime, setOverrideStartTime] = useState("09:00")
  const [overrideEndTime, setOverrideEndTime] = useState("17:00")

  useEffect(() => {
    fetchData()
    fetchDefaults()
    fetchHolidayState()
  }, [])

  const fetchData = async () => {
    try {
      const [availRes, overridesRes] = await Promise.all([
        fetch("/api/availability"),
        fetch("/api/date-overrides"),
      ])
      
      const availData = await availRes.json()
      const overridesData = await overridesRes.json()
      
      if (Array.isArray(availData)) {
        setAvailability(availData.map((a: AvailabilitySlot) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        })))
      }
      
      if (Array.isArray(overridesData)) {
        setDateOverrides(overridesData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDefaults = async () => {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/availability/defaults?browserTimezone=${encodeURIComponent(browserTz)}`)
      const data = await res.json()
      if (data.workDays) setDefaultWorkDays(data.workDays)
      if (data.label) setDefaultLabel(data.label)
    } catch (error) {
      console.error("Error fetching defaults:", error)
    }
  }

  const fetchHolidayState = async () => {
    try {
      const res = await fetch("/api/settings")
      const data = await res.json()
      if (typeof data.blockHolidays === "boolean") setBlockHolidays(data.blockHolidays)
      if (data.holidayCountry) setHolidayCountry(data.holidayCountry)
      
      // Fetch holiday count for current + next year
      const tz = data.timezone || "UTC"
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const holRes = await fetch(`/api/holidays?timezone=${encodeURIComponent(tz)}&year=${year}&month=${month}`)
      const holData = await holRes.json()
      if (holData.holidays) setHolidayCount(holData.holidays.length)
      if (holData.country && !data.holidayCountry) setHolidayCountry(holData.country)
    } catch (error) {
      console.error("Error fetching holiday state:", error)
    }
  }

  const handleToggleHolidays = async () => {
    const newValue = !blockHolidays
    setHolidaySaving(true)
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockHolidays: newValue }),
      })
      const data = await res.json()
      if (res.ok) {
        setBlockHolidays(newValue)
        if (newValue && data.blockedCount) {
          toast(`Blocked ${data.blockedCount} holidays (${data.country})`, "success")
          // Refresh date overrides since they were just created
          const overridesRes = await fetch("/api/date-overrides")
          const overridesData = await overridesRes.json()
          if (Array.isArray(overridesData)) setDateOverrides(overridesData)
        } else {
          toast("Holiday blocking disabled", "success")
        }
      } else {
        toast("Failed to update holiday settings", "error")
      }
    } catch (error) {
      console.error("Error toggling holidays:", error)
      toast("Failed to update holiday settings", "error")
    } finally {
      setHolidaySaving(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: availability }),
      })

      if (res.ok) {
        setHasChanges(false)
        toast("Availability saved!", "success")
      } else {
        toast("Failed to save availability", "error")
      }
    } catch (error) {
      console.error("Error saving availability:", error)
      toast("Failed to save availability", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const addSlot = (dayOfWeek: number) => {
    const newSlot: AvailabilitySlot = {
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
    }
    setAvailability([...availability, newSlot])
    setHasChanges(true)
  }

  const removeSlot = (dayOfWeek: number, index: number) => {
    const daySlots = availability.filter(a => a.dayOfWeek === dayOfWeek)
    const slotToRemove = daySlots[index]
    setAvailability(availability.filter(a => 
      !(a.dayOfWeek === slotToRemove.dayOfWeek && 
        a.startTime === slotToRemove.startTime && 
        a.endTime === slotToRemove.endTime)
    ))
    setHasChanges(true)
  }

  const updateSlot = (dayOfWeek: number, index: number, field: "startTime" | "endTime", value: string) => {
    const daySlots = availability.filter(a => a.dayOfWeek === dayOfWeek)
    const slotToUpdate = daySlots[index]
    
    setAvailability(availability.map(a => {
      if (a.dayOfWeek === slotToUpdate.dayOfWeek && 
          a.startTime === slotToUpdate.startTime && 
          a.endTime === slotToUpdate.endTime) {
        return { ...a, [field]: value }
      }
      return a
    }))
    setHasChanges(true)
  }

  const setDefaultSchedule = () => {
    const defaultSchedule: AvailabilitySlot[] = defaultWorkDays.map((day) => ({
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
    }))
    setAvailability(defaultSchedule)
    setHasChanges(true)
  }

  const handleAddOverride = async () => {
    if (!overrideDate) {
      toast("Please select a date", "error")
      return
    }

    try {
      const res = await fetch("/api/date-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: overrideDate,
          isAvailable: overrideType === "custom",
          startTime: overrideType === "custom" ? overrideStartTime : null,
          endTime: overrideType === "custom" ? overrideEndTime : null,
        }),
      })

      if (res.ok) {
        const newOverride = await res.json()
        setDateOverrides(prev => {
          const filtered = prev.filter(o => o.date.split("T")[0] !== overrideDate)
          return [...filtered, newOverride].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )
        })
        setShowOverrideModal(false)
        resetOverrideForm()
      } else {
        toast("Failed to add date override", "error")
      }
    } catch (error) {
      console.error("Error adding override:", error)
      toast("Failed to add date override", "error")
    }
  }

  const handleDeleteOverride = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/date-overrides?date=${encodeURIComponent(dateStr)}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDateOverrides(prev => prev.filter(o => o.date !== dateStr))
      } else {
        toast("Failed to delete override", "error")
      }
    } catch (error) {
      console.error("Error deleting override:", error)
      toast("Failed to delete override", "error")
    }
  }

  const resetOverrideForm = () => {
    setOverrideDate("")
    setOverrideType("unavailable")
    setOverrideStartTime("09:00")
    setOverrideEndTime("17:00")
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0 space-y-8">
      {/* Weekly Hours Section */}
      <div>
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
            <p className="mt-1 text-sm text-gray-500">
              Set your weekly hours when you are available for meetings
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <button
              onClick={setDefaultSchedule}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Set Default ({defaultLabel})
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {DAYS.map((day) => {
            const daySlots = availability.filter(a => a.dayOfWeek === day.value)
            
            return (
              <div key={day.value} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={daySlots.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          addSlot(day.value)
                        } else {
                          setAvailability(availability.filter(a => a.dayOfWeek !== day.value))
                          setHasChanges(true)
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      {day.label}
                    </span>
                  </div>
                  
                  <div className="flex-1 ml-4">
                    {daySlots.length === 0 ? (
                      <span className="text-sm text-gray-400">Unavailable</span>
                    ) : (
                      <div className="space-y-2">
                        {daySlots.map((slot, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <select
                              value={slot.startTime}
                              onChange={(e) => updateSlot(day.value, index, "startTime", e.target.value)}
                              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time.value} value={time.value}>
                                  {time.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-gray-500">-</span>
                            <select
                              value={slot.endTime}
                              onChange={(e) => updateSlot(day.value, index, "endTime", e.target.value)}
                              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time.value} value={time.value}>
                                  {time.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeSlot(day.value, index)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {index === daySlots.length - 1 && (
                              <button
                                onClick={() => addSlot(day.value)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Add another time slot"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {hasChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              You have unsaved changes. Remember to save!
            </p>
          </div>
        )}
      </div>

      {/* Holiday Blocking Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Block National Holidays</h2>
              <p className="mt-1 text-sm text-gray-500">
                Automatically block public holidays{holidayCountry ? ` (${holidayCountry})` : ""} so no one can book on those days.
                {holidayCount !== null && blockHolidays && (
                  <span className="text-blue-600"> {holidayCount} upcoming holidays blocked.</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleHolidays}
            disabled={holidaySaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              blockHolidays ? "bg-blue-600" : "bg-gray-200"
            } ${holidaySaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                blockHolidays ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {blockHolidays && (
          <p className="mt-3 text-xs text-gray-400 ml-8">
            Holidays are added as date overrides below. You can remove individual ones if needed.
          </p>
        )}
      </div>

      {/* Date Overrides Section */}
      <div>
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Date Overrides</h2>
            <p className="mt-1 text-sm text-gray-500">
              Mark specific dates as unavailable (vacations, holidays) or set custom hours
            </p>
          </div>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Add Date Override
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          {dateOverrides.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No date overrides set</p>
              <p className="text-sm mt-1">Add overrides for vacations, holidays, or special hours</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {dateOverrides.map((override) => (
                <div key={override.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${override.isAvailable ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDate(override.date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {override.isAvailable 
                          ? `Available: ${override.startTime} - ${override.endTime}`
                          : "Unavailable"
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOverride(override.date)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Remove override"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Date Override</h2>
              <button
                onClick={() => {
                  setShowOverrideModal(false)
                  resetOverrideForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={overrideDate}
                  min={getMinDate()}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Override Type</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="overrideType"
                      value="unavailable"
                      checked={overrideType === "unavailable"}
                      onChange={() => setOverrideType("unavailable")}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mark as unavailable</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="overrideType"
                      value="custom"
                      checked={overrideType === "custom"}
                      onChange={() => setOverrideType("custom")}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Set custom hours</span>
                  </label>
                </div>
              </div>

              {overrideType === "custom" && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                    <select
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-gray-500 mt-6">-</span>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                    <select
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOverrideModal(false)
                    resetOverrideForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOverride}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Add Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
