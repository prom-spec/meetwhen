import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const form = await prisma.routingForm.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { order: "asc" } },
      user: { select: { name: true, username: true, image: true } },
    },
  })

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: form.id,
    title: form.title,
    description: form.description,
    fields: form.fields.map(f => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options,
      order: f.order,
    })),
    user: form.user,
  })
}
