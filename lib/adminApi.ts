import { createHash, timingSafeEqual } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { LIVE_CONTENT_TAG } from "./liveContent.ts"
import {
  hasRemoteStore,
  readHistory,
  readLiveState,
  TimetableStoreError,
  type LiveState,
  type VersionEntry,
} from "./timetableStore.ts"

/** Server-only helpers shared by the /api/admin/timetable routes. */

// Override with the ADMIN_PASSWORD environment variable.
const DEFAULT_ADMIN_PASSWORD = "123321"

export type AdminBody = Record<string, unknown>

export async function readBody(request: Request): Promise<AdminBody> {
  try {
    const body = await request.json()
    return body && typeof body === "object" ? body : {}
  } catch {
    return {}
  }
}

function isCorrectPassword(password: unknown): boolean {
  if (typeof password !== "string") return false
  const expected = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD
  const digest = (value: string) => new Uint8Array(createHash("sha256").update(value).digest())
  return timingSafeEqual(digest(password), digest(expected))
}

/** Returns a 401 response for a wrong password, or null when the request may continue. */
export async function rejectWrongPassword(body: AdminBody): Promise<NextResponse | null> {
  if (isCorrectPassword(body.password)) return null
  // Slow down password guessing a little.
  await new Promise((resolve) => setTimeout(resolve, 500))
  return NextResponse.json({ error: "Wrong password" }, { status: 401 })
}

export async function adminSnapshot(): Promise<{ state: LiveState; history: VersionEntry[] }> {
  const [state, history] = await Promise.all([readLiveState(), readHistory()])
  return { state, history }
}

/** After a new version goes live: refresh the cached home page and the public /api/live endpoint. */
export function revalidateLiveContent() {
  revalidateTag(LIVE_CONTENT_TAG)
  revalidatePath("/")
}

export async function errorResponse(error: unknown): Promise<NextResponse> {
  if (error instanceof TimetableStoreError) {
    // On a conflict, send the latest state so the editor can show what changed underneath it.
    const latest = error.status === 409 ? await adminSnapshot().catch(() => ({})) : {}
    return NextResponse.json({ error: error.message, ...latest }, { status: error.status })
  }
  console.error("Timetable storage error:", error)
  const message = hasRemoteStore()
    ? "Couldn't reach the timetable store. Try again in a moment."
    : "This server can't save files. Connect an Upstash Redis (Vercel KV) store and set KV_REST_API_URL and KV_REST_API_TOKEN."
  return NextResponse.json({ error: message }, { status: 500 })
}

export const asVersionNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null
