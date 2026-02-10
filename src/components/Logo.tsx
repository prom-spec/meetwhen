import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  linkTo?: string;
  className?: string;
}

const sizes = {
  sm: { icon: 24, full: { width: 120, height: 28 } },
  md: { icon: 32, full: { width: 160, height: 38 } },
  lg: { icon: 48, full: { width: 200, height: 48 } },
};

export default function Logo({ 
  size = "md", 
  showText = true, 
  linkTo,
  className = "" 
}: LogoProps) {
  const dimensions = sizes[size];
  
  const logoContent = showText ? (
    <Image
      src="/logo-full.svg"
      alt="LetsMeet"
      width={dimensions.full.width}
      height={dimensions.full.height}
      priority
      className={className}
    />
  ) : (
    <Image
      src="/logo.svg"
      alt="LetsMeet"
      width={dimensions.icon}
      height={dimensions.icon}
      priority
      className={className}
    />
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="inline-flex items-center">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

// Simple text-based logo for places where we just need the name
export function LogoText({ 
  className = "" 
}: { 
  className?: string 
}) {
  return (
    <span className={`font-semibold text-[#0066FF] ${className}`}>
      LetsMeet
    </span>
  );
}
