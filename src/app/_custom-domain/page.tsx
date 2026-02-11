import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/prisma"

interface PageProps {
  searchParams: Promise<{ __domain?: string }>
}

export default async function CustomDomainRoot({ searchParams }: PageProps) {
  const { __domain: domain } = await searchParams
  if (!domain) notFound()

  const user = await prisma.user.findFirst({
    where: { customDomain: domain, customDomainVerified: true },
    select: { username: true },
  })

  if (!user?.username) notFound()

  // Internally render the user's profile page
  const { default: UserProfilePage } = await import(`@/app/[username]/page`)
  return <UserProfilePage params={Promise.resolve({ username: user.username })} />
}
