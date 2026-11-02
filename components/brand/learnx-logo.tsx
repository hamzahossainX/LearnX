import Link from "next/link";
import { cn } from "@/lib/utils";

type LearnXLogoProps = {
  href?: string;
  showWordmark?: boolean;
  className?: string;
};

/** The LearnX mark: a forged path joining a spark of curiosity to a clear ascent. */
export function LearnXLogo({ href = "/", showWordmark = true, className }: LearnXLogoProps) {
  const content = <span className={cn("inline-flex items-center gap-2.5", className)}>
    <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-transparent text-[#173f2c] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 dark:text-[#c8ff65]">
      <svg viewBox="0 0 40 40" className="size-7" fill="none">
        <path d="M10 29.5 17.3 22l4.1 4.1 9.8-11.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m27.4 14.2 3.8.4-.5 3.8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="29.5" r="2" fill="currentColor" />
        <path d="M10 34h21" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
    {showWordmark && <span className="text-[1.15rem] font-black tracking-[-.04em]">Learn<span className="text-[#3c7156] dark:text-[#c8ff65]">X</span></span>}
  </span>;

  return href ? <Link href={href} aria-label="LearnX home" className="group inline-flex min-h-10 items-center outline-none focus-visible:ring-2 focus-visible:ring-[#3c7156] focus-visible:ring-offset-2 dark:focus-visible:ring-[#c8ff65] dark:focus-visible:ring-offset-[#0a0a0a]">{content}</Link> : content;
}
