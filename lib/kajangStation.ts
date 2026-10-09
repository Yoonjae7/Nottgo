import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"

type Point = [number, number, number]

/** A compact roadside interpretation of Kajang's elevated MRT island platform. */
export function createKajangStation(): THREE.Group {
  const station = new THREE.Group()
  station.name = "Kajang MRT station · KG35 · Pintu A"

  // Repeated piers, glazing, roof ribs, sleepers and train details are batched.
  // The station, access stairs and viaduct all belong to this same footprint.
  const batches: {
    name: string
    material: THREE.MeshStandardMaterial
    geometries: THREE.BufferGeometry[]
    shadow: boolean
  }[] = []
  const batch = (name: string, color: string, roughness = 0.8, shadow = true) => {
    const item = {
      name,
      material: new THREE.MeshStandardMaterial({ color, roughness, metalness: roughness < 0.5 ? 0.3 : 0.025 }),
      geometries: [] as THREE.BufferGeometry[],
      shadow,
    }
    batches.push(item)
    return item
  }
  type Batch = ReturnType<typeof batch>
  const shape = (target: Batch, geometry: THREE.BufferGeometry, position: Point, rotation: Point = [0, 0, 0]) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    flat.rotateX(rotation[0])
    flat.rotateY(rotation[1])
    flat.rotateZ(rotation[2])
    flat.translate(...position)
    target.geometries.push(flat)
  }
  const box = (target: Batch, size: Point, position: Point, rotation: Point = [0, 0, 0]) => {
    shape(target, new THREE.BoxGeometry(...size), position, rotation)
  }
  const beam = (target: Batch, from: Point, to: Point, width: number) => {
    const direction = new THREE.Vector3(...to).sub(new THREE.Vector3(...from))
    const geometry = new THREE.BoxGeometry(width, direction.length(), width)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    shape(target, geometry, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2])
  }

  const concrete = batch("Concrete concourse, viaduct and supporting piers", "#b9bcb6")
  const pale = batch("Pale platform, stair treads and station roof", "#e7e9e2", 0.78)
  const roofEdge = batch("Blue-gray roof fascias and concourse panels", "#52758b", 0.7)
  const sage = batch("Kajang's pale sage angled concourse cladding", "#b6b9a3", 0.85)
  const steel = batch("Steel roof structure, rails, guardrails and window frames", "#637a86", 0.4)
  const dark = batch("Track bed, platform edge and train undercarriage", "#303e47", 0.82)
  const glass = batch("Blue glazed concourse and lift tower", "#70a0b2", 0.28, false)
  const yellow = batch("Yellow platform tactile strip and stair nosings", "#efd277", 0.8, false)
  const green = batch("Kajang line green train stripe and station accents", "#197459", 0.48)
  const red = batch("Thin red train stripe", "#b5524e", 0.48)
  const silver = batch("Silver MRT train bodies and white roof equipment", "#e1e6e5", 0.36)
  const trainGlass = batch("MRT dark windows, cab windscreen and door glazing", "#273d4c", 0.24, false)
  const lights = batch("Warm train headlamps and platform lighting", "#ffffd8", 0.3, false)
  lights.material.emissive.set("#fff4b8")
  lights.material.emissiveIntensity = 0.32
  const paving = batch("Station entrance paving and bus waiting area", "#9baba8", 0.95, false)
  const soil = batch("Small station planting strip", "#709559", 1, false)

  // Elevated concrete guideway continues beyond the platform on both ends.
  box(paving, [16.6, 0.1, 36.8], [0.45, 0.03, 0])
  box(soil, [1.25, 0.08, 19], [-7.1, 0.12, -2])
  box(concrete, [10.3, 0.48, 38.4], [0, 5.83, 0])
  box(concrete, [8.1, 0.65, 24], [0, 4.84, 0])
  for (const z of [-16.3, -8.2, 0, 8.2, 16.3]) {
    box(concrete, [1.55, 5.5, 1.3], [0, 2.8, z])
    box(concrete, [6.8, 0.63, 1.48], [0, 5.15, z])
    box(concrete, [2.1, 0.32, 1.9], [0, 0.23, z])
  }
  // Concourse faces stay below the open platform so the train remains visible.
  box(pale, [8.65, 0.2, 24.6], [0, 5.38, 0])
  for (const side of [-1, 1]) {
    box(roofEdge, [0.14, 1.65, 22.8], [side * 4.2, 4.48, 0])
    box(glass, [0.17, 0.87, 21.8], [side * 4.29, 4.75, 0])
    for (let index = 0; index < 19; index++) {
      box(steel, [0.2, 1.03, 0.075], [side * 4.3, 4.77, -10.75 + index * 1.2])
    }
    box(steel, [0.24, 0.065, 22], [side * 4.3, 4.3, 0])
    box(steel, [0.24, 0.065, 22], [side * 4.3, 5.2, 0])
    box(sage, [0.18, 0.71, 23.15], [side * 4.4, 3.91, 0], [0, 0, -side * 0.12])
    box(sage, [0.19, 0.14, 23.55], [side * 4.43, 5.37, 0])
    // The actual Kajang frontage has narrow vertical louvres over a pale
    // sloping lower band, rather than an uninterrupted blue glass box.
    for (let index = 0; index < 27; index++) {
      box(sage, [0.14, 1.06, 0.053], [side * 4.42, 4.82, -11.05 + index * 0.85])
    }
  }

  // Kajang has a central island platform with tracks on either side.
  box(pale, [3.2, 0.42, 26.3], [0, 6.39, 0])
  for (const side of [-1, 1]) {
    box(yellow, [0.14, 0.018, 25.8], [side * 1.4, 6.609, 0])
    box(dark, [2.75, 0.055, 38.2], [side * 3.08, 6.13, 0])
    for (const railX of [side * 3.08 - 0.65, side * 3.08 + 0.65]) {
      box(steel, [0.055, 0.09, 38.15], [railX, 6.23, 0])
    }
    for (let index = 0; index < 51; index++) {
      box(concrete, [1.92, 0.055, 0.15], [side * 3.08, 6.18, -18.75 + index * 0.75])
    }
    // Low railings at the ends protect the elevated alignment.
    for (const z of [-16.85, 16.85]) {
      box(steel, [0.065, 0.055, 4.4], [side * 4.81, 7.03, z])
      for (let index = 0; index < 7; index++) {
        box(steel, [0.055, 0.76, 0.055], [side * 4.81, 6.66, z - 2.1 + index * 0.7])
      }
    }
  }

  // The broad shallow pitched roof follows the line's open-sided wakaf form.
  // Concrete concourse and a blue-gray continuous fascia echo the real exterior.
  const roofPitch = 0.105
  const roofY = 10.08
  for (const side of [-1, 1]) {
    box(pale, [5.64, 0.18, 28.3], [side * 2.78, roofY, 0], [0, 0, -side * roofPitch])
    box(roofEdge, [0.15, 0.31, 28.65], [side * 5.54, 9.68, 0])
    box(pale, [0.31, 0.065, 28.68], [side * 5.48, 9.87, 0])
  }
  box(roofEdge, [0.54, 0.14, 27.4], [0, 10.44, 0])
  for (const z of [-12.7, -8.45, -4.2, 0, 4.2, 8.45, 12.7]) {
    for (const side of [-1, 1]) {
      box(steel, [0.1, 3.07, 0.12], [side * 1.19, 8.17, z])
      beam(steel, [side * 1.19, 8.54, z], [side * 4.72, 9.7, z], 0.075)
      beam(steel, [0, 10.26, z], [side * 5.3, 9.73, z], 0.075)
      box(lights, [0.6, 0.035, 0.13], [side * 1.12, 9.69, z])
    }
  }
  // Rear and front canopy ends frame the station name without closing the sides.
  for (const z of [-13.7, 13.7]) {
    box(roofEdge, [10.25, 0.67, 0.14], [0, 9.48, z])
    box(steel, [10.45, 0.1, 0.12], [0, 9.86, z])
  }

  // Four-car silver/white Siemens train. The official side illustration shows
  // a green stripe and finer red line below the dark window and door band.
  const trainX = -3.08
  for (let car = 0; car < 4; car++) {
    const carZ = -10.3 + car * 6.75
    shape(silver, new RoundedBoxGeometry(2.2, 1.65, 6.48, 2, 0.14), [trainX, 7.4, carZ])
    box(dark, [1.96, 0.3, 5.97], [trainX, 6.57, carZ])
    box(silver, [1.57, 0.13, 2.13], [trainX, 8.28, carZ])
    for (const side of [-1, 1]) {
      box(green, [0.03, 0.095, 6.16], [trainX + side * 1.11, 6.9, carZ])
      box(red, [0.031, 0.033, 6.16], [trainX + side * 1.111, 6.79, carZ])
      for (const offset of [-2.38, -0.77, 0.77, 2.38]) {
        box(trainGlass, [0.028, 0.64, 0.92], [trainX + side * 1.113, 7.62, carZ + offset])
      }
      for (const offset of [-1.62, 1.62]) {
        box(steel, [0.045, 1.28, 0.71], [trainX + side * 1.11, 7.44, carZ + offset])
        box(trainGlass, [0.047, 0.65, 0.57], [trainX + side * 1.134, 7.63, carZ + offset])
        box(silver, [0.05, 1.23, 0.028], [trainX + side * 1.147, 7.42, carZ + offset])
      }
      for (const offset of [-1.85, 1.85]) {
        shape(dark, new THREE.CylinderGeometry(0.29, 0.29, 0.11, 10), [trainX + side * 0.72, 6.42, carZ + offset], [0, 0, Math.PI / 2])
      }
    }
    if (car < 3) box(dark, [1.68, 1.3, 0.31], [trainX, 7.33, carZ + 3.37])
    if (car === 0 || car === 3) {
      const end = car === 0 ? -1 : 1
      box(trainGlass, [1.78, 0.72, 0.035], [trainX, 7.74, carZ + end * 3.247])
      box(green, [1.87, 0.16, 0.038], [trainX, 7.16, carZ + end * 3.248])
      for (const x of [-0.74, 0.74]) {
        box(lights, [0.18, 0.12, 0.045], [trainX + x, 7.01, carZ + end * 3.265])
      }
    }
  }

  // Pintu A has a street-level approach and covered vertical access. The
  // compact stairs reach the concourse, with a glazed lift alongside.
  const stairX = 7.0
  const stairStart = 14.9
  for (let step = 0; step < 27; step++) {
    const height = 0.12 + step * 0.165
    box(pale, [2.14, height, 0.39], [stairX, height / 2 + 0.1, stairStart - step * 0.37])
    box(yellow, [2.03, 0.018, 0.048], [stairX, height + 0.109, stairStart - step * 0.37 + 0.167])
  }
  box(concrete, [3.07, 0.28, 2.4], [6.28, 4.47, 4.85])
  box(pale, [4.34, 0.12, 2.55], [6.22, 6.28, 4.85])
  for (const side of [-1, 1]) {
    const x = stairX + side * 1.11
    beam(steel, [x, 1.1, 15.15], [x, 5.52, 5.15], 0.065)
    beam(steel, [x, 2.7, 15.15], [x, 7.12, 5.15], 0.07)
    for (let post = 0; post < 8; post++) {
      const z = 15.0 - post * 1.35
      const y = 0.35 + post * 0.6
      box(steel, [0.075, 2.55, 0.075], [x, y + 1.275, z])
    }
  }
  beam(pale, [stairX, 2.78, 15.27], [stairX, 7.2, 5.0], 0.14)
  box(pale, [2.68, 0.14, 11.55], [stairX, 4.94, 10.18], [0.407, 0, 0])
  box(concrete, [2.3, 0.2, 2.55], [stairX, 0.17, 16.05])
  // Lift and short overhead link share the main concourse height.
  box(concrete, [2.26, 6.36, 2.34], [7.06, 3.25, -4.35])
  box(glass, [0.06, 5.77, 1.9], [5.895, 3.41, -4.35])
  box(glass, [1.89, 5.77, 0.06], [7.06, 3.41, -3.151])
  for (const y of [0.7, 2.55, 4.5, 6.32]) {
    box(steel, [0.095, 0.065, 2.0], [5.865, y, -4.35])
    box(steel, [2.0, 0.065, 0.095], [7.06, y, -3.12])
  }
  box(pale, [2.55, 0.16, 2.68], [7.06, 6.58, -4.35])
  box(concrete, [2.54, 0.25, 1.86], [5.25, 4.45, -4.35])
  box(pale, [2.62, 0.12, 2.0], [5.25, 6.34, -4.35])

  // Small bus shelter and benches under the station tie it to the shuttle stop.
  for (const z of [-11.5, -8.3]) {
    box(steel, [0.09, 2.4, 0.09], [6.65, 1.3, z])
  }
  box(roofEdge, [2.35, 0.14, 4.2], [6.65, 2.58, -9.9])
  box(steel, [1.66, 0.14, 0.39], [6.65, 0.65, -10.0])
  for (const x of [6.02, 7.28]) box(steel, [0.065, 0.6, 0.12], [x, 0.36, -10.0])

  for (const item of batches) {
    if (!item.geometries.length) {
      item.material.dispose()
      continue
    }
    const merged = mergeGeometries(item.geometries, false)
    item.geometries.forEach((geometry) => geometry.dispose())
    if (!merged) {
      item.material.dispose()
      continue
    }
    const mesh = new THREE.Mesh(merged, item.material)
    mesh.name = item.name
    mesh.castShadow = item.shadow
    mesh.receiveShadow = true
    station.add(mesh)
  }

  const signTexture = (type: "station" | "entrance") => {
    const canvas = document.createElement("canvas")
    canvas.width = 1024
    canvas.height = 256
    const context = canvas.getContext("2d")!
    context.fillStyle = "#163c56"
    context.fillRect(0, 0, 1024, 256)
    context.fillStyle = "#047940"
    context.fillRect(0, 0, type === "station" ? 229 : 166, 256)
    context.fillStyle = "#ffffff"
    context.textAlign = "center"
    context.textBaseline = "middle"
    if (type === "station") {
      context.font = "700 67px Arial, sans-serif"
      context.fillText("KG35", 114, 126)
      context.font = "700 115px Arial, sans-serif"
      context.fillText("KAJANG", 621, 100)
      context.font = "36px Arial, sans-serif"
      context.fillText("MRT  ·  LALUAN KAJANG", 621, 202)
    } else {
      context.font = "700 112px Arial, sans-serif"
      context.fillText("A", 83, 130)
      context.textAlign = "left"
      context.font = "700 81px Arial, sans-serif"
      context.fillText("KAJANG", 214, 89)
      context.font = "47px Arial, sans-serif"
      context.fillText("PINTU A / GATE A", 214, 177)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return texture
  }
  const panel = (name: string, texture: THREE.Texture, size: [number, number], position: Point, yaw = 0) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }))
    mesh.name = name
    mesh.position.set(...position)
    mesh.rotation.y = yaw
    station.add(mesh)
  }
  const title = signTexture("station")
  const entrance = signTexture("entrance")
  panel("KG35 Kajang station sign facing approach", title, [5.15, 1.2875], [0, 8.7, 13.793])
  panel("Kajang station sign on left platform", title, [6.6, 1.65], [-5.13, 8.54, 0], -Math.PI / 2)
  panel("Kajang station sign on right platform", title, [6.6, 1.65], [5.13, 8.54, 0], Math.PI / 2)
  panel("Pintu A access sign", entrance, [2.5, 0.625], [stairX, 2.235, 16.42])
  panel("Pintu A bus shelter sign", entrance, [2.0, 0.5], [6.65, 2.15, -7.77])

  station.userData.stationCode = "KG35"
  station.userData.entrance = "Pintu A"
  return station
}
