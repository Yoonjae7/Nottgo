export const NEAR_MISS_DODGE_WINDOW_SECONDS = 0.65

type DodgeCheck = {
  coneX: number
  coneZ: number
  busX: number
  busZ: number
  currentLaneX: number
  nextLaneX: number
  worldSpeed: number
}

export function lateDodgeTimeToCone({
  coneX,
  coneZ,
  busX,
  busZ,
  currentLaneX,
  nextLaneX,
  worldSpeed,
}: DodgeCheck): number | null {
  if (
    nextLaneX === currentLaneX ||
    coneX !== currentLaneX ||
    Math.abs(busX - currentLaneX) >= 0.4 ||
    coneZ >= busZ - 1.55 ||
    worldSpeed <= 0
  ) return null

  const timeToCone = (busZ - coneZ) / worldSpeed
  return timeToCone > 0 && timeToCone <= NEAR_MISS_DODGE_WINDOW_SECONDS
    ? timeToCone
    : null
}
