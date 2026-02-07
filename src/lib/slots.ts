// Time slot calculation utilities

export interface AvailabilitySlot {
  dayOfWeek: number
  startTime: string // "HH:mm"
  endTime: string
}

export interface Booking {
  startTime: Date
  endTime: Date
}

export interface TimeSlot {
  start: Date
  end: Date
}

// Parse "HH:mm" to minutes since midnight
function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

// Get available time slots for a specific date
export function getAvailableSlots(
  date: Date,
  availability: AvailabilitySlot[],
  existingBookings: Booking[],
  duration: number, // in minutes
  bufferBefore: number = 0,
  bufferAfter: number = 0,
  minNotice: number = 0, // minutes in advance
  _userTimezone: string = "UTC"
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const dayOfWeek = date.getDay()
  
  // Get availability for this day of week
  const dayAvailability = availability.filter(a => a.dayOfWeek === dayOfWeek)
  
  if (dayAvailability.length === 0) {
    return []
  }

  const now = new Date()
  const minStartTime = new Date(now.getTime() + minNotice * 60 * 1000)

  // For each availability window, generate slots
  for (const avail of dayAvailability) {
    const startMinutes = parseTime(avail.startTime)
    const endMinutes = parseTime(avail.endTime)
    
    // Generate slots at 30-minute intervals
    for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += 30) {
      const slotStart = new Date(date)
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
      
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000)
      
      // Skip if slot is before minimum notice time
      if (slotStart < minStartTime) {
        continue
      }
      
      // Check for conflicts with existing bookings
      const bufferedStart = new Date(slotStart.getTime() - bufferBefore * 60 * 1000)
      const bufferedEnd = new Date(slotEnd.getTime() + bufferAfter * 60 * 1000)
      
      const hasConflict = existingBookings.some(booking => {
        return bufferedStart < booking.endTime && bufferedEnd > booking.startTime
      })
      
      if (!hasConflict) {
        slots.push({ start: slotStart, end: slotEnd })
      }
    }
  }
  
  return slots
}

// Get available dates for a range
export function getAvailableDates(
  startDate: Date,
  endDate: Date,
  availability: AvailabilitySlot[]
): Date[] {
  const dates: Date[] = []
  const availableDays = new Set(availability.map(a => a.dayOfWeek))
  
  const current = new Date(startDate)
  while (current <= endDate) {
    if (availableDays.has(current.getDay())) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}
