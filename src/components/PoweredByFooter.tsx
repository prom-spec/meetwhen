import Link from "next/link"
import Image from "next/image"

export default function PoweredByFooter({ className = "" }: { className?: string }) {
  return (
    <div className={`py-6 text-center ${className}`}>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#0066FF] transition-colors"
      >
        <Image
          src="/logo.svg"
          alt="MeetWhen"
          width={16}
          height={16}
          className="opacity-50"
        />
        <span>Powered by <span className="font-semibold">MeetWhen</span></span>
      </Link>
    </div>
  )
}
