import { promises as fs } from "node:fs"
import path from "node:path"
import { defaultTimetable, type Timetable } from "./data.ts"
import { parseTimetable } from "./timetable.ts"

/**
 * Server-side storage for the admin-edited timetable.
 *
 * - With an Upstash Redis / Vercel KV store connected (KV_REST_API_URL + KV_REST_API_TOKEN, or the
 *   UPSTASH_REDIS_REST_* equivalents), the timetable is kept there. Required on Vercel, whose filesystem is read-only.
 * - Otherwise it is written to .data/timetable.json, which works for `next dev` and self-hosted `next start`.
 *
 * When nothing has been saved, the built-in timetable from lib/data.ts is used.
 */

export interface TimetableState {
  timetable: Timetable
  /** True when an admin-saved timetable is replacing the built-in one. */
  custom: boolean
  updatedAt: string | null
}

const REDIS_KEY = "nottgo:timetable"
const LOCAL_FILE = path.join(process.cwd(), ".data", "timetable.json")

const builtIn = (): TimetableState => ({ timetable: defaultTimetable, custom: false, updatedAt: null })

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null
}

export const hasRemoteStore = () => redisConfig() !== null

async function redis(command: string[]): Promise<unknown> {
  const config = redisConfig()
  if (!config) throw new Error("Redis is not configured")
  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  })
  const body = (await response.json().catch(() => null)) as { result?: unknown; error?: string } | null
  if (!response.ok || !body || body.error) {
    throw new Error(`Redis ${command[0]} failed: ${body?.error ?? response.status}`)
  }
  return body.result
}

async function readRecord(): Promise<string | null> {
  if (hasRemoteStore()) {
    const result = await redis(["GET", REDIS_KEY])
    return typeof result === "string" ? result : null
  }
  try {
    return await fs.readFile(LOCAL_FILE, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

export async function readTimetableState(): Promise<TimetableState> {
  const raw = await readRecord()
  if (!raw) return builtIn()

  let record: { timetable?: unknown; updatedAt?: unknown }
  try {
    record = JSON.parse(raw)
  } catch {
    console.error("Stored timetable is not valid JSON; using the built-in timetable.")
    return builtIn()
  }
  const parsed = parseTimetable(record.timetable)
  if (!parsed.ok) {
    console.error(`Stored timetable is invalid (${parsed.error}); using the built-in timetable.`)
    return builtIn()
  }
  return {
    timetable: parsed.timetable,
    custom: true,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  }
}

/** Expects a timetable that already went through parseTimetable. */
export async function saveTimetable(timetable: Timetable): Promise<TimetableState> {
  const updatedAt = new Date().toISOString()
  const record = JSON.stringify({ timetable, updatedAt })
  if (hasRemoteStore()) {
    await redis(["SET", REDIS_KEY, record])
  } else {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true })
    await fs.writeFile(LOCAL_FILE, record)
  }
  return { timetable, custom: true, updatedAt }
}

export async function resetTimetable(): Promise<TimetableState> {
  if (hasRemoteStore()) {
    await redis(["DEL", REDIS_KEY])
  } else {
    await fs.rm(LOCAL_FILE, { force: true })
  }
  return builtIn()
}
