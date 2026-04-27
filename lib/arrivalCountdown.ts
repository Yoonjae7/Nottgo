/**
 * Remaining time until departure/arrival, using floored minutes so we never
 * overstate how much time is left (then broken into hours + remainder minutes).
 */
export function formatArrivalCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Soon"
  if (diffMs <= 60_000) return "Soon"

  const totalMins = Math.floor(diffMs / 60_000)

  if (totalMins < 1) return "Soon"
  if (totalMins < 60) {
    return totalMins === 1 ? "In 1 minute" : `In ${totalMins} minutes`
  }

  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60

  if (m === 0) {
    return h === 1 ? "In 1 hour" : `In ${h} hours`
  }

  const hourPart = h === 1 ? "1 hour" : `${h} hours`
  const minPart = m === 1 ? "1 minute" : `${m} minutes`
  return `In ${hourPart} ${minPart}`
}
