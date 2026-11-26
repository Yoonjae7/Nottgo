import { createHash, timingSafeEqual } from "node:crypto"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { parseTimetable } from "@/lib/timetable"
import { hasRemoteStore, readTimetableState, resetTimetable, saveTimetable } from "@/lib/timetableStore"

export const dynamic = "force-dynamic"

// Override with the ADMIN_PASSWORD environment variable.
const DEFAULT_ADMIN_PASSWORD = "123321"

type Body = { password?: unknown; timetable?: unknown }

async function readBody(request: Request): Promise<Body> {
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

async function unauthorized() {
  // Slow down password guessing a little.
  await new Promise((resolve) => setTimeout(resolve, 500))
  return NextResponse.json({ error: "Wrong password" }, { status: 401 })
}

function storageError(error: unknown) {
  console.error("Timetable storage error:", error)
  const message = hasRemoteStore()
    ? "Couldn't reach the timetable store. Try again in a moment."
    : "This server can't save files. Connect an Upstash Redis (Vercel KV) store and set KV_REST_API_URL and KV_REST_API_TOKEN."
  return NextResponse.json({ error: message }, { status: 500 })
}

/** Unlock: checks the password and returns the current timetable. */
export async function POST(request: Request) {
  const { password } = await readBody(request)
  if (!isCorrectPassword(password)) return unauthorized()
  try {
    return NextResponse.json(await readTimetableState())
  } catch (error) {
    return storageError(error)
  }
}

/** Save a new timetable. */
export async function PUT(request: Request) {
  const { password, timetable } = await readBody(request)
  if (!isCorrectPassword(password)) return unauthorized()

  const parsed = parseTimetable(timetable)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const state = await saveTimetable(parsed.timetable)
    revalidatePath("/")
    return NextResponse.json(state)
  } catch (error) {
    return storageError(error)
  }
}

/** Go back to the built-in timetable from lib/data.ts. */
export async function DELETE(request: Request) {
  const { password } = await readBody(request)
  if (!isCorrectPassword(password)) return unauthorized()
  try {
    const state = await resetTimetable()
    revalidatePath("/")
    return NextResponse.json(state)
  } catch (error) {
    return storageError(error)
  }
}
