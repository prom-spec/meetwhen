"use client"

import { useState, useEffect } from "react"
import { Save, Plus, Trash2, Calendar, X } from "lucide-react"

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
  
  // Date override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [overrideDate, setOverrideDate] = useState("")
  const [overrideType, setOverrideType] = useState<"unavailable" | "custom">("unavailable")
  const [overrideStartTime, setOverrideStartTime] = useState("09:00")
  const [overrideEndTime, setOverrideEndTime] = useState("17:00")

  useEffect(() => {
    fetchData()
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
        alert("Availability saved!")
      } else {
        alert("Failed to save availability")
      }
    } catch (error) {
      console.error("Error saving availability:", error)
      alert("Failed to save availability")
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
    const defaultSchedule: AvailabilitySlot[] = []
    for (let day = 1; day <= 5; day++) {
      defaultSchedule.push({
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
      })
    }
    setAvailability(defaultSchedule)
    setHasChanges(true)
  }

  const handleAddOverride = async () => {
    if (!overrideDate) {
      alert("Please select a date")
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
        alert("Failed to add date override")
      }
    } catch (error) {
      console.error("Error adding override:", error)
      alert("Failed to add date override")
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
        alert("Failed to delete override")
      }
    } catch (error) {
      console.error("Error deleting override:", error)
      alert("Failed to delete override")
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
    return <div className="text-center py-10">Loading...</div>
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
              Set Default (Mon-Fri 9-5)
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
