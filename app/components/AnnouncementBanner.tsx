"use client"

import { useEffect, useState } from "react"
import { ArrowRight, CircleCheck, Megaphone, OctagonAlert, TriangleAlert, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { announcementKey, type Announcement, type AnnouncementTone } from "@/lib/announcement"

const DISMISSED_KEY = "nottgo:dismissed-announcement"

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
  /** In the admin panel preview: no dismissing and no remembered dismissals. */
  preview?: boolean
  className?: string
}

export default function AnnouncementBanner({ announcement, preview = false, className }: AnnouncementBannerProps) {
  const key = announcementKey(announcement)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (preview) return
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === key)
    } catch {
      setDismissed(false)
    }
  }, [key, preview])

  if (dismissed) return null

  const { bar, badge, icon: Icon } = toneStyles[announcement.tone]
  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, key)
    } catch {
      // Private browsing: it just comes back on the next visit.
    }
  }

  return (
    <div
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
        {!preview && (
          <button
            type="button"
            onClick={dismiss}
            className="-mr-1 rounded-full p-1.5 opacity-70 transition hover:bg-black/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
