/** The banner shown across the top of the site, edited from the admin panel. */

export type AnnouncementTone = "info" | "warning" | "alert" | "success"

export interface Announcement {
  tone: AnnouncementTone
  title?: string
  message: string
  /** Optional "Learn more" link; only http(s) URLs are accepted. */
  linkUrl?: string
  linkLabel?: string
}

export const announcementTones: { value: AnnouncementTone; label: string; hint: string }[] = [
  { value: "info", label: "News", hint: "General updates" },
  { value: "warning", label: "Heads up", hint: "Delays or changes" },
  { value: "alert", label: "Urgent", hint: "Cancellations" },
  { value: "success", label: "Good news", hint: "Service restored" },
]

export const ANNOUNCEMENT_LIMITS = { title: 60, message: 280, linkUrl: 500, linkLabel: 30 }

/** Identifies an announcement's content, for spotting changes between versions. */
export const announcementKey = (announcement: Announcement) =>
  JSON.stringify([
    announcement.tone,
    announcement.title ?? "",
    announcement.message,
    announcement.linkUrl ?? "",
    announcement.linkLabel ?? "",
  ])
