import { notFound } from "next/navigation"
import prisma from "@/lib/prisma"

interface PageProps {
  params: Promise<{ path: string[] }>
  searchParams: Promise<{ __domain?: string }>
}

export default async function CustomDomainCatchAll({ params, searchParams }: PageProps) {
  const { __domain: domain } = await searchParams
  const { path } = await params
  if (!domain) notFound()

  const user = await prisma.user.findFirst({
    where: { customDomain: domain, customDomainVerified: true },
    select: { username: true },
  })

  if (!user?.username) notFound()

  // Route: /event-slug → /[username]/[eventSlug]
  if (path.length === 1) {
    const { default: EventPage } = await import(`@/app/[username]/[eventSlug]/page`)
    return <EventPage params={Promise.resolve({ username: user.username, eventSlug: path[0] })} />
  }

  notFound()
}
