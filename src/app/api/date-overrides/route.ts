import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const overrides = await prisma.dateOverride.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
    })

    return NextResponse.json(overrides)
  } catch (error) {
    console.error("Error fetching date overrides:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { date, isAvailable, startTime, endTime } = body

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    const override = await prisma.dateOverride.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: dateObj,
        },
      },
      update: {
        isAvailable: isAvailable ?? false,
        startTime: startTime || null,
        endTime: endTime || null,
      },
      create: {
        userId: session.user.id,
        date: dateObj,
        isAvailable: isAvailable ?? false,
        startTime: startTime || null,
        endTime: endTime || null,
      },
    })

    return NextResponse.json(override)
  } catch (error) {
    console.error("Error saving date override:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    // Normalize to just the date portion to match @db.Date storage
    const datePart = date.split("T")[0]
    const dateObj = new Date(datePart + "T00:00:00.000Z")
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    await prisma.dateOverride.delete({
      where: {
        userId_date: {
          userId: session.user.id,
          date: dateObj,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting date override:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
