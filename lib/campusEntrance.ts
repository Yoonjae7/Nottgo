import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

type Point = [number, number, number]

export type CampusEntranceBranding = {
  /** The university's blue crest, with its transparent or white background. */
  crest: THREE.Texture
  /** The white two-line University of Nottingham wordmark, on transparency. */
  wordmark: THREE.Texture
}

/** Campus entrance scenery, with the welcome pylon facing local +Z. */
export function createCampusEntrance(branding: CampusEntranceBranding): THREE.Group {
  const entrance = new THREE.Group()
  entrance.name = "University of Nottingham campus entrance"

  // Architectural and planting details share one mesh per material. The whole
  // entrance stays beside the game's road, including its small access driveway.
  const batches: {
    name: string
    material: THREE.MeshStandardMaterial
    geometries: THREE.BufferGeometry[]
    shadow: boolean
  }[] = []
  const batch = (name: string, color: string, roughness = 0.85, shadow = true) => {
    const item = {
      name,
      material: new THREE.MeshStandardMaterial({ color, roughness, metalness: roughness < 0.5 ? 0.25 : 0.02 }),
      geometries: [] as THREE.BufferGeometry[],
      shadow,
    }
    batches.push(item)
    return item
  }
  type Batch = ReturnType<typeof batch>
  const geometry = (target: Batch, shape: THREE.BufferGeometry, position: Point, rotation: Point = [0, 0, 0]) => {
    const flat = shape.index ? shape.toNonIndexed() : shape
    if (flat !== shape) shape.dispose()
    flat.rotateX(rotation[0])
    flat.rotateY(rotation[1])
    flat.rotateZ(rotation[2])
    flat.translate(...position)
    target.geometries.push(flat)
  }
  const box = (target: Batch, size: Point, position: Point, rotation: Point = [0, 0, 0]) => {
    geometry(target, new THREE.BoxGeometry(...size), position, rotation)
  }

  const navy = batch("Navy welcome pylon and security signage", "#122c43", 0.65)
  const trim = batch("Pylon edges, panel seam, and black curb sections", "#17242b", 0.8)
  const white = batch("Gatehouse walls, sign inset, and white curb sections", "#f1f3e9")
  const roof = batch("Gatehouse flat roof and paving", "#cbd3c8")
  const glass = batch("Gatehouse blue tinted glass", "#5996a3", 0.28, false)
  const frames = batch("Gatehouse dark window and door frames", "#304744", 0.5)
  const drive = batch("Campus access driveway", "#8c9390", 1, false)
  const lawn = batch("Entrance grass and planted island soil", "#67934a", 1, false)
  const hedge = batch("Trimmed green entrance hedges", "#356f38", 1)
  const burgundy = batch("Burgundy oval border planting", "#68454c", 1)
  const trunk = batch("Entrance palm trunks", "#907357", 1)
  const leaves = batch("Entrance palm fronds", "#2e6e43", 1)
  leaves.material.side = THREE.DoubleSide
  const metal = batch("Fence rails and lamp posts", "#a5b3af", 0.35)
  const red = batch("Raised barrier red stripes", "#cd4b42", 0.65)
  const yellow = batch("Barrier pedestal and security bollards", "#e6c45a", 0.7)
  const lights = batch("Entrance lamp diffusers", "#e8efd2", 0.35, false)
  lights.material.emissive.set("#d7e0bb")
  lights.material.emissiveIntensity = 0.16

  box(lawn, [9.65, 0.065, 11.25], [0, 0.023, 1.775])
  box(drive, [3.0, 0.055, 10.7], [-0.025, 0.062, 1.5])

  // Alternating black-and-white curbs identify the photograph's gated approach.
  for (const side of [-1, 1]) {
    for (let index = 0; index < 18; index++) {
      const z = -3.55 + index * 0.6
      box(index % 2 ? trim : white, [0.17, 0.16, 0.58], [side * 1.61 - 0.025, 0.12, z])
    }
  }

  // A narrow monolith, inset crest panel, stacked wordmark, and lower welcome
  // message capture the tall navy sign without turning it into a billboard.
  const signX = 2.7
  const signZ = 3.0
  box(navy, [1.72, 9.25, 0.43], [signX, 4.775, signZ])
  box(trim, [0.13, 9.36, 0.57], [signX - 0.86, 4.72, signZ - 0.02])
  box(trim, [0.075, 9.36, 0.54], [signX + 0.86, 4.72, signZ - 0.035])
  box(navy, [1.72, 0.12, 0.48], [signX, 9.44, signZ - 0.01])
  box(white, [1.32, 1.32, 0.034], [signX, 8.08, signZ + 0.231])
  box(trim, [1.73, 0.052, 0.032], [signX, 6.085, signZ + 0.231])
  box(roof, [1.85, 0.13, 0.9], [signX, 0.09, signZ])

  // Oval burgundy planting surrounds the pylon; the inner hedge leaves its
  // lower navy panel visible, as in the real campus entrance.
  const oval = (target: Batch, radius: number, height: number, y: number, scaleX: number, scaleZ: number) => {
    const shape = new THREE.CylinderGeometry(radius, radius, height, 32)
    shape.scale(scaleX, 1, scaleZ)
    geometry(target, shape, [signX, y, signZ + 0.3])
  }
  oval(burgundy, 1, 0.2, 0.18, 1.92, 2.32)
  oval(lawn, 1, 0.034, 0.299, 1.67, 2.02)
  for (let index = 0; index < 15; index++) {
    const angle = index * Math.PI * 2 / 15
    const shape = new THREE.IcosahedronGeometry(0.28 + (index % 3) * 0.025, 1)
    shape.scale(1.2, 0.62, 1)
    geometry(hedge, shape, [signX + Math.cos(angle) * 1.43, 0.43, signZ + 0.3 + Math.sin(angle) * 1.72])
  }
  box(hedge, [0.76, 0.43, 2.25], [-4.06, 0.3, -1.5])
  box(hedge, [1.85, 0.34, 0.7], [3.1, 0.26, -3.2])

  // White flat-roof guardhouse: opaque walls behind continuous glazing and a
  // modest projecting canopy, with the access drive opening beside it.
  const boothX = -2.85
  const boothZ = -1.45
  box(roof, [2.75, 0.13, 2.35], [boothX, 0.13, boothZ])
  box(white, [2.5, 0.72, 1.94], [boothX, 0.51, boothZ])
  box(white, [2.5, 1.65, 0.16], [boothX, 1.655, boothZ - 0.91])
  box(glass, [2.29, 1.45, 0.075], [boothX, 1.66, boothZ + 0.96])
  box(glass, [0.065, 1.45, 1.64], [boothX + 1.263, 1.66, boothZ])
  for (const x of [boothX - 1.19, boothX - 0.37, boothX + 0.43, boothX + 1.2]) {
    box(white, [0.12, 2.36, 0.19], [x, 1.36, boothZ + 0.91])
  }
  for (const z of [boothZ - 0.82, boothZ, boothZ + 0.82]) {
    box(white, [0.13, 2.36, 0.1], [boothX + 1.2, 1.36, z])
  }
  box(white, [2.55, 0.14, 0.15], [boothX, 0.98, boothZ + 1.005])
  box(white, [2.55, 0.12, 0.15], [boothX, 2.38, boothZ + 1.005])
  box(frames, [0.63, 1.39, 0.022], [boothX + 0.41, 1.66, boothZ + 1.019])
  box(glass, [0.56, 1.28, 0.027], [boothX + 0.41, 1.66, boothZ + 1.036])
  box(metal, [0.026, 0.2, 0.025], [boothX + 0.61, 1.52, boothZ + 1.06])
  box(white, [3.28, 0.2, 2.72], [boothX + 0.18, 2.58, boothZ + 0.15])
  box(roof, [3.4, 0.075, 2.85], [boothX + 0.18, 2.713, boothZ + 0.15])
  box(navy, [1.65, 0.39, 0.038], [boothX - 0.04, 2.17, boothZ + 1.036])

  // The raised red-and-white boom is angled upward, clear of both the campus
  // driveway and the game's driving lanes.
  const pivot: Point = [-1.12, 1.12, 0.65]
  box(yellow, [0.33, 0.98, 0.36], [-1.12, 0.61, 0.65])
  box(trim, [0.36, 0.12, 0.38], [-1.12, 1.14, 0.65])
  geometry(metal, new THREE.CylinderGeometry(0.075, 0.075, 0.44, 10), pivot, [Math.PI / 2, 0, 0])
  const angle = -0.34
  const armLength = 3.55
  const armOffset = (distance: number): Point => [
    pivot[0] - Math.sin(angle) * distance,
    pivot[1] + Math.cos(angle) * distance,
    pivot[2],
  ]
  box(white, [0.11, armLength, 0.095], armOffset(armLength / 2), [0, 0, angle])
  for (let index = 0; index < 6; index++) {
    box(red, [0.115, 0.245, 0.1], armOffset(0.26 + index * 0.56), [0, 0, angle])
  }
  for (const z of [-0.45, 1.12]) {
    geometry(yellow, new THREE.CylinderGeometry(0.055, 0.07, 0.68, 8), [-1.18, 0.4, z])
    geometry(trim, new THREE.CylinderGeometry(0.058, 0.058, 0.105, 8), [-1.18, 0.57, z])
  }

  // Low boundary fencing and two slim street lamps give the entrance its
  // roadside setting while preserving sightlines to the sign and gatehouse.
  for (let index = 0; index < 25; index++) {
    box(metal, [0.036, 1.03, 0.036], [-4.6 + index * 0.36, 0.61, -3.67])
  }
  for (const y of [0.27, 1.06]) box(metal, [8.68, 0.05, 0.05], [-0.28, y, -3.67])
  for (const [x, z] of [[-4.35, 1.1], [4.2, -2.1]]) {
    geometry(metal, new THREE.CylinderGeometry(0.043, 0.058, 3.4, 8), [x, 1.78, z])
    box(metal, [0.47, 0.05, 0.055], [x + 0.2, 3.46, z])
    box(trim, [0.46, 0.085, 0.2], [x + 0.24, 3.43, z])
    box(lights, [0.33, 0.026, 0.15], [x + 0.24, 3.376, z])
  }

  const palmFrond = () => {
    const shape = new THREE.BufferGeometry()
    shape.setAttribute("position", new THREE.Float32BufferAttribute([
      0, 0, 0, -0.19, 0.16, 0.54, 0, 0.2, 0.64,
      0, 0, 0, 0, 0.2, 0.64, 0.19, 0.16, 0.54,
      -0.19, 0.16, 0.54, 0, -0.25, 1.16, 0, 0.2, 0.64,
      0, 0.2, 0.64, 0, -0.25, 1.16, 0.19, 0.16, 0.54,
    ], 3))
    shape.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(24).fill(0), 2))
    shape.computeVertexNormals()
    return shape
  }
  for (const [x, z, height] of [[-3.55, 5.75, 4.0], [3.5, -1.8, 4.45], [-3.6, -2.6, 4.7]]) {
    geometry(trunk, new THREE.CylinderGeometry(0.08, 0.14, height, 8), [x, height / 2 + 0.1, z])
    geometry(leaves, new THREE.IcosahedronGeometry(0.27, 0), [x, height + 0.03, z])
    for (let leaf = 0; leaf < 8; leaf++) {
      geometry(leaves, palmFrond(), [x, height + 0.1, z], [0, leaf * Math.PI / 4 + 0.15, 0])
    }
  }

  for (const item of batches) {
    if (!item.geometries.length) {
      item.material.dispose()
      continue
    }
    const merged = mergeGeometries(item.geometries, false)
    item.geometries.forEach((shape) => shape.dispose())
    if (!merged) {
      item.material.dispose()
      continue
    }
    const mesh = new THREE.Mesh(merged, item.material)
    mesh.name = item.name
    mesh.castShadow = item.shadow
    mesh.receiveShadow = true
    entrance.add(mesh)
  }

  const panel = (name: string, texture: THREE.Texture, size: [number, number], position: Point) => {
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material)
    mesh.name = name
    mesh.position.set(...position)
    entrance.add(mesh)
  }
  panel("Official university crest on welcome pylon", branding.crest, [0.81, 0.81 * 87 / 65], [signX, 8.08, signZ + 0.253])
  panel("Official university wordmark on welcome pylon", branding.wordmark, [1.39, 1.39 * 78 / 220], [signX, 6.665, signZ + 0.238])

  const textTexture = (width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")!
    paint(context)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return texture
  }
  const welcome = textTexture(512, 384, (context) => {
    context.fillStyle = "#f7f7ef"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.font = "700 58px Arial, sans-serif"
    context.fillText("WELCOME", 256, 64)
    context.font = "700 49px Arial, sans-serif"
    context.fillText("SELAMAT", 256, 177)
    context.fillText("DATANG", 256, 240)
  })
  panel("Welcome and Selamat Datang lettering", welcome, [1.34, 1.005], [signX, 5.225, signZ + 0.238])
  const security = textTexture(768, 144, (context) => {
    context.fillStyle = "#f7f7ef"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.font = "700 51px Arial, sans-serif"
    context.fillText("CAMPUS SECURITY", 384, 49)
    context.font = "500 28px Arial, sans-serif"
    context.fillText("KESELAMATAN KAMPUS", 384, 108)
  })
  panel("Gatehouse campus security lettering", security, [1.48, 0.278], [boothX - 0.04, 2.17, boothZ + 1.058])

  return entrance
}
