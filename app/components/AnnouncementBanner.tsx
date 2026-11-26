"use client"

import { useEffect, useRef } from "react"
import { ArrowRight, CircleCheck, Megaphone, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Announcement, AnnouncementTone } from "@/lib/announcement"

/** CSS variable with the banner's height, so overlays (the admin panel) can sit below it. */
export const ANNOUNCEMENT_HEIGHT_VAR = "--announcement-height"

const toneStyles: Record<AnnouncementTone, { bar: string; badge: string; icon: LucideIcon }> = {
  info: {
    bar: "bg-gradient-to-r from-[#10263b] via-[#173a5c] to-[#10263b] text-white",
    badge: "bg-white/15 ring-white/25",
    icon: Megaphone,
  },
  warning: {
    bar: "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 text-amber-950",
    badge: "bg-amber-950/10 ring-amber-950/15",
    icon: TriangleAlert,
  },
  alert: {
    bar: "bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white",
    badge: "bg-white/15 ring-white/25",
    icon: OctagonAlert,
  },
  success: {
    bar: "bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 text-white",
    badge: "bg-white/15 ring-white/25",
    icon: CircleCheck,
  },
}

interface AnnouncementBannerProps {
  announcement: Announcement
  /** In the admin panel preview: doesn't report its height to the page. */
  preview?: boolean
  className?: string
}

export default function AnnouncementBanner({ announcement, preview = false, className }: AnnouncementBannerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (preview || !element) return
    const root = document.documentElement.style
    const observer = new ResizeObserver(() => root.setProperty(ANNOUNCEMENT_HEIGHT_VAR, `${element.offsetHeight}px`))
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.removeProperty(ANNOUNCEMENT_HEIGHT_VAR)
    }
  }, [preview])

  const { bar, badge, icon: Icon } = toneStyles[announcement.tone]

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Announcement"
      className={cn("relative w-full shadow-md shadow-slate-900/10 animate-in fade-in slide-in-from-top-2 duration-500", bar, className)}
    >
      <div className="mx-auto flex max-w-2xl items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 sm:mt-0", badge)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-sm leading-snug">
          {announcement.title && <p className="font-semibold tracking-tight">{announcement.title}</p>}
          <p className={cn("whitespace-pre-line break-words", announcement.title && "opacity-90")}>{announcement.message}</p>
          {announcement.linkUrl && (
            <a
              href={announcement.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-1 inline-flex items-center gap-1 font-semibold underline decoration-1 underline-offset-4 hover:decoration-2"
            >
              {announcement.linkLabel || "Learn more"}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
