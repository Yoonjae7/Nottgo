import { NextResponse } from "next/server"
import { getLiveContent } from "@/lib/liveContent"

// Cached and shared by every visitor, refreshed at most a minute after a publish. Open pages poll this.
export const revalidate = 60

/** Public: the live timetable and announcement, polled by open pages so they pick up new versions. */
export async function GET() {
  try {
    return NextResponse.json(await getLiveContent())
  } catch (error) {
    console.error("Couldn't load the live content:", error)
    return NextResponse.json({ error: "Unavailable" }, { status: 503 })
  }
}
