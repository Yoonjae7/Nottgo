import { NextResponse } from "next/server"
import {
  adminSnapshot,
  asVersionNumber,
  errorResponse,
  readBody,
  rejectWrongPassword,
  revalidateLiveContent,
} from "@/lib/adminApi"
import { parseAnnouncement, parseTimetable } from "@/lib/timetable"
import { publishContent } from "@/lib/timetableStore"

export const dynamic = "force-dynamic"

/** Unlock: checks the password and returns the live content plus version history. */
export async function POST(request: Request) {
  const body = await readBody(request)
  const rejected = await rejectWrongPassword(body)
  if (rejected) return rejected
  try {
    return NextResponse.json(await adminSnapshot())
  } catch (error) {
    return errorResponse(error)
  }
}

/** Publish the edited timetable and announcement together as a new version. */
export async function PUT(request: Request) {
  const body = await readBody(request)
  const rejected = await rejectWrongPassword(body)
  if (rejected) return rejected

  const baseVersion = asVersionNumber(body.baseVersion)
  if (baseVersion === null) return NextResponse.json({ error: "Missing baseVersion" }, { status: 400 })
  const timetable = parseTimetable(body.timetable)
  if (!timetable.ok) return NextResponse.json({ error: timetable.error }, { status: 400 })
  const announcement = parseAnnouncement(body.announcement)
  if (!announcement.ok) return NextResponse.json({ error: announcement.error }, { status: 400 })
  const message = typeof body.message === "string" ? body.message : ""

  try {
    const content = { timetable: timetable.timetable, announcement: announcement.announcement }
    const result = await publishContent(content, message, baseVersion)
    revalidateLiveContent()
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
