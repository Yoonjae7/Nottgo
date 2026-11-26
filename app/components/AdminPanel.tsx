"use client"

import { useMemo, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { Loader2, Lock, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  ANNOUNCEMENT_LIMITS,
  announcementTones,
  type Announcement,
  type AnnouncementTone,
} from "@/lib/announcement"
import {
  buggyStops,
  busDestinations,
  busScheduleLabels,
  type BusTimetable,
  type ScheduleEntry,
  type ScheduleType,
  type Timetable,
} from "@/lib/data"
import { describeContentChanges } from "@/lib/timetableDiff"
import type { LiveState, SiteContent, VersionEntry } from "@/lib/timetableStore"
import AnnouncementBanner from "./AnnouncementBanner"
import type { LiveContent } from "./HomePage"

type Direction = "out" | "in"
type BuggyRow = { time: string; skipFriday: boolean }
interface AnnouncementDraft {
  enabled: boolean
  tone: AnnouncementTone
  title: string
  message: string
  linkUrl: string
  linkLabel: string
}
/** Editor-friendly copy of the live content. */
interface Draft {
  bus: BusTimetable
  buggy: BuggyRow[]
  announcement: AnnouncementDraft
}
interface AdminData {
  state: LiveState
  history: VersionEntry[]
}

const scheduleTypes = Object.keys(busScheduleLabels) as ScheduleType[]

const toneSwatches: Record<AnnouncementTone, string> = {
  info: "bg-[#10263b]",
  warning: "bg-amber-300",
  alert: "bg-red-600",
  success: "bg-emerald-600",
}

const toDraft = ({ timetable, announcement }: LiveState): Draft => ({
  bus: structuredClone(timetable.bus),
  buggy: timetable.buggy.times.map((time) => ({ time, skipFriday: timetable.buggy.fridayExceptions.includes(time) })),
  announcement: {
    enabled: announcement !== null,
    tone: announcement?.tone ?? "info",
    title: announcement?.title ?? "",
    message: announcement?.message ?? "",
    linkUrl: announcement?.linkUrl ?? "",
    linkLabel: announcement?.linkLabel ?? "",
  },
})

function toAnnouncement(draft: AnnouncementDraft): Announcement {
  const title = draft.title.trim()
  const linkUrl = draft.linkUrl.trim()
  const linkLabel = draft.linkLabel.trim()
  return {
    tone: draft.tone,
    ...(title ? { title } : {}),
    message: draft.message.trim(),
    ...(linkUrl ? { linkUrl, ...(linkLabel ? { linkLabel } : {}) } : {}),
  }
}

const fromDraft = (draft: Draft): SiteContent => ({
  timetable: {
    bus: draft.bus,
    buggy: {
      times: draft.buggy.map(({ time }) => time),
      fridayExceptions: draft.buggy.filter(({ skipFriday }) => skipFriday).map(({ time }) => time),
    },
  },
  announcement: draft.announcement.enabled ? toAnnouncement(draft.announcement) : null,
})

const toLive = ({ version, timetable, announcement }: LiveState): LiveContent => ({ version, timetable, announcement })

class ApiError extends Error {
  /** On a conflict the server also sends the latest state and history. */
  latest: AdminData | null
  constructor(message: string, latest: AdminData | null) {
    super(message)
    this.latest = latest
  }
}

async function callApi(path: "" | "/restore", method: "POST" | "PUT", body: object): Promise<AdminData> {
  const response = await fetch(`/api/admin/timetable${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(data?.error ?? `Request failed (${response.status})`, data?.state && data?.history ? data : null)
  }
  return data as AdminData
}

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm")

function versionLabel(entry: VersionEntry) {
  if (entry.kind === "restore") return `Restored v${entry.restoredFrom}`
  if (entry.kind === "original") return "Back to the original timetable"
  return entry.message || "Published changes"
}

function ChangeList({ changes }: { changes: string[] }) {
  if (changes.length === 0) return null
  const shown = changes.slice(0, 3)
  const rest = changes.slice(3)
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      <ul className="list-disc space-y-0.5 pl-4">
        {shown.map((change, i) => (
          <li key={i}>{change}</li>
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer select-none pl-4 font-medium text-foreground/70 hover:text-foreground">
            Show {rest.length} more
          </summary>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
            {rest.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

const nativeSelectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

interface AdminPanelProps {
  onClose: () => void
  /** Called whenever a version goes live so the page behind the panel updates straight away. */
  onLiveChange: (live: LiveContent) => void
}

export default function AdminPanel({ onClose, onLiveChange }: AdminPanelProps) {
  const [password, setPassword] = useState("")
  const [data, setData] = useState<AdminData | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<null | "unlock" | "publish" | "restore">(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [versionNote, setVersionNote] = useState("")
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null)

  const [destination, setDestination] = useState(busDestinations[0].id)
  const [scheduleType, setScheduleType] = useState<ScheduleType>("weekday")
  const [direction, setDirection] = useState<Direction>("out")

  const baseline = useMemo(() => (data ? JSON.stringify(fromDraft(toDraft(data.state))) : ""), [data])
  const edited = useMemo(() => (draft ? fromDraft(draft) : null), [draft])
  const dirty = edited !== null && JSON.stringify(edited) !== baseline
  const pendingChanges = useMemo(
    () => (data && edited && dirty ? describeContentChanges(data.state, edited) : []),
    [data, edited, dirty],
  )

  /** `keepDraft`: after a conflict, keep the admin's edits and compare them with the newer live version. */
  const applyData = (next: AdminData, keepDraft = false) => {
    setData(next)
    if (!keepDraft) setDraft(toDraft(next.state))
    onLiveChange(toLive(next.state))
  }

  const run = async (kind: "unlock" | "publish" | "restore", action: () => Promise<void>) => {
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      if (err instanceof ApiError && err.latest) applyData(err.latest, true)
    } finally {
      setBusy(null)
    }
  }

  const unlock = (event: FormEvent) => {
    event.preventDefault()
    void run("unlock", async () => {
      try {
        applyData(await callApi("", "POST", { password }))
      } catch (err) {
        setPassword("")
        throw err
      }
    })
  }

  const publish = () =>
    data &&
    edited &&
    run("publish", async () => {
      const next = await callApi("", "PUT", {
        password,
        ...edited,
        message: versionNote,
        baseVersion: data.state.version,
      })
      applyData(next)
      setReviewing(false)
      setVersionNote("")
      setNotice(`v${next.state.version} is live for everyone.`)
    })

  const restore = (version: number) =>
    data &&
    run("restore", async () => {
      const next = await callApi("/restore", "POST", { password, version, baseVersion: data.state.version })
      applyData(next)
      setConfirmRestore(null)
      setReviewing(false)
      setNotice(`Restored ${version === 0 ? "the original timetable" : `v${version}`} as v${next.state.version}. It's live for everyone.`)
    })

  const updateDraft = (mutate: (draft: Draft) => void) => {
    setNotice(null)
    setDraft((current) => {
      if (!current) return current
      const next = structuredClone(current)
      mutate(next)
      return next
    })
  }

  const updateEntries = (mutate: (entries: ScheduleEntry[]) => void) =>
    updateDraft((d) => mutate(d.bus[destination][scheduleType][direction]))

  const updateAnnouncement = (changes: Partial<AnnouncementDraft>) =>
    updateDraft((d) => void Object.assign(d.announcement, changes))

  if (!data || !draft) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm">
          <form onSubmit={unlock} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" aria-hidden /> Admin
              </DialogTitle>
              <DialogDescription>Enter the admin password to edit the timetable and announcements.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={error !== null}
                aria-describedby={error ? "admin-password-error" : undefined}
              />
              {error && (
                <p id="admin-password-error" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!password || busy !== null}>
              {busy === "unlock" && <Loader2 className="animate-spin" aria-hidden />}
              Unlock
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  const { state, history } = data
  const nextVersion = Math.max(state.version, history[0]?.version ?? 0) + 1
  const route = draft.bus[destination]
  const entries = route[scheduleType][direction]
  const isWeekend = scheduleType === "weekend"
  const directionLabel = direction === "out" ? "From campus" : "To campus"
  const noteText = typeof route.notes === "string" ? route.notes : route.notes[direction]
  const rowGrid = isWeekend
    ? "grid-cols-[7rem_5.5rem_minmax(0,1fr)_7.5rem_2.25rem]"
    : "grid-cols-[7rem_5.5rem_minmax(0,1fr)_2.25rem]"
  const announcementDraft = draft.announcement
  const linkLooksWrong = announcementDraft.linkUrl.trim() !== "" && !/^https?:\/\/\S+$/i.test(announcementDraft.linkUrl.trim())
  const previewAnnouncement = toAnnouncement({
    ...announcementDraft,
    message: announcementDraft.message.trim() || "Your announcement will appear here.",
  })

  const restoreConfirmation = (version: number) =>
    confirmRestore === version && (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/60 p-2.5 text-sm">
        <span className="flex-1">
          Make {version === 0 ? "the original" : `v${version}`} live for everyone as v{nextVersion}?
          {dirty && " Your unpublished edits will be discarded."}
        </span>
        <Button type="button" size="sm" onClick={() => restore(version)} disabled={busy !== null}>
          {busy === "restore" && <Loader2 className="animate-spin" aria-hidden />}
          Restore
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRestore(null)}>
          Cancel
        </Button>
      </div>
    )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] max-w-3xl flex-col gap-0 p-0 focus:outline-none"
        // Don't lose unpublished edits to a stray click or Escape; the close button still works.
        onInteractOutside={(event) => dirty && event.preventDefault()}
        onEscapeKeyDown={(event) => dirty && event.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Admin</DialogTitle>
          <DialogDescription>
            {state.version === 0
              ? "Live: the original built-in timetable"
              : `Live: v${state.version}${state.updatedAt ? ` · published ${formatDate(state.updatedAt)}` : ""}`}
            {dirty && <span className="font-medium text-amber-600 dark:text-amber-400"> · Unpublished changes</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="bus" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 grid grid-cols-4">
            <TabsTrigger value="bus">Bus</TabsTrigger>
            <TabsTrigger value="buggy">Buggy</TabsTrigger>
            <TabsTrigger value="announcement">Announcement</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="bus" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-1.5">
                <Label>Route</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {busDestinations.map(({ id, name }) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Days</Label>
                <Select value={scheduleType} onValueChange={(value) => setScheduleType(value as ScheduleType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {busScheduleLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              {(["out", "in"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={direction === value ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDirection(value)}
                >
                  {value === "out" ? "From campus" : "To campus"}
                  <span className="text-xs opacity-70">({route[scheduleType][value].length})</span>
                </Button>
              ))}
            </div>

            {entries.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No departures. This route doesn&apos;t run {directionLabel.toLowerCase()} on these days.
              </p>
            ) : (
              <div className="space-y-2">
                <div className={cn("grid gap-2 text-xs font-medium text-muted-foreground", rowGrid)}>
                  <span>Time</span>
                  <span>Service</span>
                  <span>Note</span>
                  {isWeekend && <span>Runs on</span>}
                  <span className="sr-only">Remove</span>
                </div>
                {entries.map((entry, index) => (
                  <div key={index} className={cn("grid items-center gap-2", rowGrid)}>
                    <Input
                      type="time"
                      aria-label={`Departure ${index + 1} time`}
                      value={entry.time}
                      onChange={({ target: { value } }) => updateEntries((list) => void (list[index].time = value))}
                      className={cn("h-9 px-2", !entry.time && "border-destructive")}
                    />
                    <select
                      aria-label={`Departure ${index + 1} service`}
                      value={entry.serviceType}
                      onChange={({ target: { value } }) =>
                        updateEntries((list) => void (list[index].serviceType = value as "bus" | "van"))
                      }
                      className={nativeSelectClass}
                    >
                      <option value="bus">Bus</option>
                      <option value="van">Van</option>
                    </select>
                    <Input
                      aria-label={`Departure ${index + 1} note`}
                      placeholder="Optional"
                      value={entry.note ?? ""}
                      onChange={({ target: { value } }) => updateEntries((list) => void (list[index].note = value))}
                      className="h-9"
                    />
                    {isWeekend && (
                      <select
                        aria-label={`Departure ${index + 1} runs on`}
                        value={entry.saturdayOnly ? "sat" : entry.sundayOnly ? "sun" : "both"}
                        onChange={({ target: { value } }) =>
                          updateEntries((list) => {
                            list[index].saturdayOnly = value === "sat" || undefined
                            list[index].sundayOnly = value === "sun" || undefined
                          })
                        }
                        className={nativeSelectClass}
                      >
                        <option value="both">Sat &amp; Sun</option>
                        <option value="sat">Saturday</option>
                        <option value="sun">Sunday</option>
                      </select>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove departure ${entry.time || index + 1}`}
                      onClick={() => updateEntries((list) => void list.splice(index, 1))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateEntries((list) => void list.push({ time: "", serviceType: list.at(-1)?.serviceType ?? "bus" }))
                }
              >
                <Plus /> Add departure
              </Button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Replace with times from
                <select
                  value=""
                  onChange={({ target: { value } }) => {
                    const source = value as ScheduleType
                    updateDraft((d) => {
                      const sourceEntries = d.bus[destination][source][direction]
                      d.bus[destination][scheduleType][direction] = structuredClone(sourceEntries)
                    })
                  }}
                  className={cn(nativeSelectClass, "h-8 w-auto text-xs")}
                >
                  <option value="" disabled>
                    choose days…
                  </option>
                  {scheduleTypes
                    .filter((type) => type !== scheduleType)
                    .map((type) => (
                      <option key={type} value={type}>
                        {busScheduleLabels[type]}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-route-notes">Notes shown for {directionLabel.toLowerCase()} (all days)</Label>
              <Textarea
                id="admin-route-notes"
                rows={3}
                value={noteText}
                onChange={({ target: { value } }) =>
                  updateDraft((d) => {
                    const notes = d.bus[destination].notes
                    const both = typeof notes === "string" ? { out: notes, in: notes } : notes
                    d.bus[destination].notes = { ...both, [direction]: value }
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="buggy" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2">
            <p className="text-sm text-muted-foreground">
              Departure times from {buggyStops[0]}. Each following stop is 3 minutes later. Buggies run Monday to
              Friday only.
            </p>
            {draft.buggy.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No buggy departures.
              </p>
            ) : (
              <div className="space-y-2">
                {draft.buggy.map((row, index) => (
                  <div key={index} className="grid grid-cols-[7rem_minmax(0,1fr)_2.25rem] items-center gap-3">
                    <Input
                      type="time"
                      aria-label={`Buggy departure ${index + 1} time`}
                      value={row.time}
                      onChange={({ target: { value } }) => updateDraft((d) => void (d.buggy[index].time = value))}
                      className={cn("h-9 px-2", !row.time && "border-destructive")}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={row.skipFriday}
                        onCheckedChange={(checked) => updateDraft((d) => void (d.buggy[index].skipFriday = checked === true))}
                      />
                      Not on Fridays (prayer)
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove buggy departure ${row.time || index + 1}`}
                      onClick={() => updateDraft((d) => void d.buggy.splice(index, 1))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateDraft((d) => void d.buggy.push({ time: "", skipFriday: false }))}
            >
              <Plus /> Add time
            </Button>
          </TabsContent>

          <TabsContent value="announcement" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Show announcement banner</span>
                <span className="block text-xs text-muted-foreground">
                  Appears across the top of the site for everyone once you publish.
                </span>
              </span>
              <Switch
                checked={announcementDraft.enabled}
                onCheckedChange={(enabled) => updateAnnouncement({ enabled })}
              />
            </label>

            <fieldset disabled={!announcementDraft.enabled} className="space-y-4 transition-opacity disabled:opacity-50">
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Style</span>
                <div role="radiogroup" aria-label="Banner style" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {announcementTones.map(({ value, label, hint }) => {
                    const selected = announcementDraft.tone === value
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => updateAnnouncement({ tone: value })}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "border-primary ring-1 ring-primary" : "hover:bg-muted/60",
                        )}
                      >
                        <span className={cn("h-4 w-4 shrink-0 rounded-full", toneSwatches[value])} aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="announcement-title">
                  Title <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="announcement-title"
                  maxLength={ANNOUNCEMENT_LIMITS.title}
                  placeholder="e.g. Deepavali holiday"
                  value={announcementDraft.title}
                  onChange={({ target: { value } }) => updateAnnouncement({ title: value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="announcement-message">Message</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {announcementDraft.message.length}/{ANNOUNCEMENT_LIMITS.message}
                  </span>
                </div>
                <Textarea
                  id="announcement-message"
                  rows={3}
                  maxLength={ANNOUNCEMENT_LIMITS.message}
                  placeholder="e.g. The public holiday timetable runs on Monday 9 November."
                  value={announcementDraft.message}
                  onChange={({ target: { value } }) => updateAnnouncement({ message: value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="space-y-1.5">
                  <Label htmlFor="announcement-link">
                    Link <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="announcement-link"
                    type="url"
                    placeholder="https://"
                    maxLength={ANNOUNCEMENT_LIMITS.linkUrl}
                    value={announcementDraft.linkUrl}
                    onChange={({ target: { value } }) => updateAnnouncement({ linkUrl: value })}
                    aria-invalid={linkLooksWrong}
                    className={cn(linkLooksWrong && "border-destructive")}
                  />
                  {linkLooksWrong && <p className="text-xs text-destructive">Links must start with https:// or http://</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="announcement-link-label">Link text</Label>
                  <Input
                    id="announcement-link-label"
                    placeholder="Learn more"
                    maxLength={ANNOUNCEMENT_LIMITS.linkLabel}
                    value={announcementDraft.linkLabel}
                    onChange={({ target: { value } }) => updateAnnouncement({ linkLabel: value })}
                    disabled={!announcementDraft.linkUrl.trim()}
                  />
                </div>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">Preview</span>
              {announcementDraft.enabled ? (
                <div className="overflow-hidden rounded-lg border">
                  <AnnouncementBanner announcement={previewAnnouncement} preview />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No banner will be shown.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-6 pt-2">
            <p className="text-sm text-muted-foreground">
              Every publish is saved as a version. Restoring one makes it live again as a new version, so nothing is
              ever lost.
            </p>
            <ol className="space-y-2">
              {history.map((entry) => {
                const isLive = entry.version === state.version
                return (
                  <li
                    key={entry.version}
                    className={cn("rounded-lg border p-3", isLive && "border-primary/40 bg-primary/[0.04]")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">v{entry.version}</span>
                          {isLive && <Badge className="h-5 px-1.5 text-[10px]">Live</Badge>}
                          <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 break-words text-sm">{versionLabel(entry)}</p>
                      </div>
                      {!isLive && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRestore(entry.version)}
                          disabled={busy !== null}
                        >
                          <RotateCcw /> Restore
                        </Button>
                      )}
                    </div>
                    <ChangeList changes={entry.changes} />
                    {restoreConfirmation(entry.version)}
                  </li>
                )
              })}
              <li className={cn("rounded-lg border p-3", state.version === 0 && "border-primary/40 bg-primary/[0.04]")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">v0</span>
                      {state.version === 0 && <Badge className="h-5 px-1.5 text-[10px]">Live</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm">Original: the built-in timetable from the code, no announcement</p>
                  </div>
                  {state.version !== 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmRestore(0)}
                      disabled={busy !== null}
                    >
                      <RotateCcw /> Restore
                    </Button>
                  )}
                </div>
                {restoreConfirmation(0)}
              </li>
            </ol>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 border-t px-6 py-4">
          {(error || notice) && (
            <p role="status" className={cn("text-sm", error ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}>
              {error ?? notice}
            </p>
          )}

          {reviewing && dirty ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Publish v{nextVersion} · {pendingChanges.length} {pendingChanges.length === 1 ? "change" : "changes"}
              </p>
              <ul className="max-h-36 list-disc space-y-1 overflow-y-auto rounded-md border bg-muted/40 py-2 pl-7 pr-3 text-xs">
                {pendingChanges.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
              <Input
                aria-label="Version note"
                placeholder="What's this update? e.g. Timetable effective 1 December (optional)"
                maxLength={200}
                value={versionNote}
                onChange={(event) => setVersionNote(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && publish()}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setReviewing(false)} disabled={busy !== null}>
                  Keep editing
                </Button>
                <Button type="button" onClick={publish} disabled={busy !== null || pendingChanges.length === 0}>
                  {busy === "publish" && <Loader2 className="animate-spin" aria-hidden />}
                  Publish v{nextVersion}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {!dirty
                  ? "No unpublished changes."
                  : pendingChanges.length === 0
                    ? "Only re-ordered rows; nothing to publish."
                    : `${pendingChanges.length} unpublished ${pendingChanges.length === 1 ? "change" : "changes"}`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    setDraft(toDraft(state))
                    setError(null)
                  }}
                  disabled={!dirty || busy !== null}
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  className="flex-1 sm:flex-none"
                  onClick={() => setReviewing(true)}
                  disabled={pendingChanges.length === 0 || busy !== null}
                >
                  Review &amp; publish
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
