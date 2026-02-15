import Link from "next/link"
import Image from "next/image"
import { getPlanFromUser, canAccess } from "@/lib/plans"

export default function PoweredByFooter({ 
  className = "", 
  hidden = false,
  userPlan,
}: { 
  className?: string
  hidden?: boolean
  userPlan?: string
}) {
  // Hide if explicitly hidden OR if user has a paid plan with branding removal
  const plan = getPlanFromUser({ plan: userPlan })
  if (hidden || canAccess(plan, 'removeBranding')) return null
  
  return (
    <div className={`py-6 text-center ${className}`}>
      <div className="inline-flex items-center gap-2 text-sm text-gray-400">
        <Link
          href="/"
          className="inline-flex items-center gap-2 hover:text-[#0066FF] transition-colors"
        >
          <Image
            src="/logo.svg"
            alt="letsmeet.link"
            width={16}
            height={16}
            className="opacity-50"
          />
          <span>🗓 Scheduling by <span className="font-semibold">letsmeet.link</span></span>
        </Link>
        <span>⚡</span>
        <Link
          href="https://letsmeet.link/?utm_source=powered-by&utm_medium=booking-page&utm_campaign=viral-loop"
          className="font-medium text-[#0066FF] hover:text-[#0052cc] transition-colors"
        >
          Get your free booking page
        </Link>
      </div>
    </div>
  )
}
