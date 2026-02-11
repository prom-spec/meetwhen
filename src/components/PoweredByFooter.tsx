import Link from "next/link"
import Image from "next/image"

export default function PoweredByFooter({ className = "" }: { className?: string }) {
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
          href="https://letsmeet.link/?ref=powered-by"
          className="font-medium text-[#0066FF] hover:text-[#0052cc] transition-colors"
        >
          Create your own
        </Link>
      </div>
    </div>
  )
}
