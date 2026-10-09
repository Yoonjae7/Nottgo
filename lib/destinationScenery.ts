import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

type Point = [number, number, number]
type Theme = "campus" | "neighbourhood" | "town" | "rail" | "city"

/** Stylized destination cues, rather than replicas of commercial branding. */
function sceneryBuilder(name: string) {
  const group = new THREE.Group()
  group.name = name
  const batches = new Map<string, {
    material: THREE.MeshStandardMaterial
    geometries: THREE.BufferGeometry[]
    shadow: boolean
  }>()
  const shape = (
    color: string,
    geometry: THREE.BufferGeometry,
    position: Point,
    rotation: Point = [0, 0, 0],
    roughness = 0.88,
    shadow = true,
  ) => {
    const key = `${color}:${roughness}:${shadow}`
    let batch = batches.get(key)
    if (!batch) {
      batch = {
        material: new THREE.MeshStandardMaterial({ color, roughness, metalness: roughness < 0.5 ? 0.15 : 0.02 }),
        geometries: [],
        shadow,
      }
      batches.set(key, batch)
    }
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    flat.rotateX(rotation[0])
    flat.rotateY(rotation[1])
    flat.rotateZ(rotation[2])
    flat.translate(...position)
    batch.geometries.push(flat)
  }
  const box = (color: string, size: Point, position: Point, rotation: Point = [0, 0, 0], roughness = 0.88) => {
    shape(color, new THREE.BoxGeometry(...size), position, rotation, roughness)
  }
  const cylinder = (color: string, radius: number, height: number, position: Point, topRadius = radius) => {
    shape(color, new THREE.CylinderGeometry(topRadius, radius, height, 16), position)
  }
  const sign = (lines: string[], size: [number, number], position: Point, background = "#173f5e", foreground = "#ffffff") => {
    const canvas = document.createElement("canvas")
    canvas.width = 1024
    canvas.height = Math.max(160, Math.round(1024 * size[1] / size[0]))
    const context = canvas.getContext("2d")!
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = foreground
    context.textAlign = "center"
    context.textBaseline = "middle"
    lines.forEach((line, index) => {
      const fontSize = Math.floor(Math.min(canvas.height * 0.68 / lines.length, 900 / Math.max(1, line.length * 0.63)))
      context.font = `700 ${fontSize}px Arial, sans-serif`
      context.fillText(line, 512, canvas.height * (index + 0.5) / lines.length)
    })
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(...size),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    )
    mesh.name = lines.join(" · ")
    mesh.position.set(...position)
    group.add(mesh)
  }
  const palm = (x: number, z: number, height: number, spread = 1.1) => {
    cylinder("#90735b", 0.12, height, [x, height / 2, z], 0.075)
    for (let leaf = 0; leaf < 7; leaf++) {
      const angle = leaf * Math.PI * 2 / 7
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.Float32BufferAttribute([
        0, 0, 0, -0.13, 0.12, spread * 0.46, 0, 0.16, spread,
        0, 0, 0, 0, 0.16, spread, 0.13, 0.12, spread * 0.46,
        -0.13, 0.12, spread * 0.46, 0, -0.2, spread, 0, 0.16, spread,
        0, 0.16, spread, 0, -0.2, spread, 0.13, 0.12, spread * 0.46,
      ], 3))
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(24).fill(0), 2))
      geometry.computeVertexNormals()
      shape("#347548", geometry, [x, height, z], [0, angle, 0])
    }
  }
  const hedge = (size: Point, position: Point) => box("#3c783f", size, position)
  const windows = (width: number, rows: number, columns: number, position: Point, color = "#76b3c7", gap = 0.16) => {
    const paneWidth = width / columns - gap
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        box(color, [paneWidth, 0.67, 0.06], [position[0] - width / 2 + width * (column + 0.5) / columns, position[1] + row * 1.18, position[2]], [0, 0, 0], 0.35)
      }
    }
  }
  const pitchedRoof = (width: number, depth: number, y: number, x = 0, z = 0, color = "#b65e47") => {
    const angle = 0.36
    const halfWidth = width / 2
    for (const side of [-1, 1]) {
      box(color, [halfWidth / Math.cos(angle), 0.14, depth], [x + side * width / 4, y, z], [0, 0, -side * angle])
    }
    box(color, [0.14, 0.16, depth + 0.03], [x, y + Math.sin(angle) * halfWidth / 2, z])
  }
  const finish = () => {
    for (const [name, batch] of batches) {
      const merged = mergeGeometries(batch.geometries, false)
      batch.geometries.forEach((geometry) => geometry.dispose())
      if (!merged) {
        batch.material.dispose()
        continue
      }
      batch.material.side = THREE.DoubleSide
      const mesh = new THREE.Mesh(merged, batch.material)
      mesh.name = `${group.name} material ${name}`
      mesh.castShadow = batch.shadow
      mesh.receiveShadow = true
      group.add(mesh)
    }
    return group
  }
  return { group, shape, box, cylinder, sign, palm, hedge, windows, pitchedRoof, finish }
}

type Builder = ReturnType<typeof sceneryBuilder>

function plaza(b: Builder, width = 17.6, depth = 14.4, z = 0) {
  b.box("#b9c0b6", [width, 0.1, depth], [0, 0.05, z])
  b.box("#e3dfd0", [width, 0.12, 0.28], [0, 0.12, z + depth / 2])
}

function createTts() {
  const b = sceneryBuilder("Taman Tasik Semenyih · terraced homes and lake")
  b.box("#72a75a", [17.6, 0.08, 18], [0, 0.04, 2.3])
  b.box("#c3bca7", [15.6, 0.08, 4.1], [0, 0.1, 1.9])
  for (let home = 0; home < 4; home++) {
    const x = -5.55 + home * 3.7
    b.box(home % 2 ? "#f0d9ba" : "#efe8d5", [3.5, 3.4, 4.4], [x, 1.86, -2])
    b.pitchedRoof(3.7, 4.65, 3.85, x, -2)
    b.windows(2.6, 2, 2, [x, 1.0, 0.23])
    b.box("#674c3c", [0.7, 1.6, 0.08], [x + 0.69, 0.96, 0.3])
    b.box("#dcd8c6", [3.35, 0.12, 1.15], [x, 2.01, 0.8])
    for (const edge of [-1, 1]) b.box("#f3ede0", [0.1, 1.95, 0.1], [x + edge * 1.54, 1.15, 1.31])
  }
  const lake = new THREE.CylinderGeometry(1, 1, 0.08, 36)
  lake.scale(4.8, 1, 2.7)
  b.shape("#5c9fba", lake, [0.5, 0.13, 7.4], [0, 0, 0], 0.28, false)
  b.box("#ddd3b3", [1.0, 0.14, 5.3], [-5.25, 0.15, 7.1])
  b.hedge([2.1, 0.35, 0.7], [5.6, 0.24, 4.6])
  b.palm(-7.25, 5.5, 4.0)
  b.palm(7.15, 7.6, 3.6)
  b.box("#745b42", [0.13, 1.55, 0.13], [-3.3, 0.85, 5.2])
  b.box("#745b42", [0.13, 1.55, 0.13], [3.3, 0.85, 5.2])
  b.sign(["TAMAN TASIK SEMENYIH"], [7.2, 0.95], [0, 1.55, 5.3], "#2e6447")
  return b.finish()
}

function createPga() {
  const b = sceneryBuilder("PGA Semenyih Pelangi Mosque · dome and minaret")
  plaza(b, 17.4, 15.2, 0.7)
  b.box("#efead9", [9.6, 4.0, 7.2], [-0.6, 2.14, -1.8])
  b.box("#c9d2bd", [10.2, 0.25, 7.7], [-0.6, 4.22, -1.8])
  b.cylinder("#e6d9bc", 2.55, 0.56, [-0.6, 4.61, -1.8])
  b.shape("#2f9278", new THREE.SphereGeometry(2.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), [-0.6, 4.87, -1.8], [0, 0, 0], 0.42)
  b.cylinder("#cfb977", 0.035, 1.05, [-0.6, 7.74, -1.8])
  b.shape("#cfb977", new THREE.TorusGeometry(0.23, 0.045, 6, 18, Math.PI * 1.55), [-0.6, 8.15, -1.8], [0, 0, -0.35])
  for (const x of [-3.8, -1.7, 0.4, 2.5]) {
    b.box("#327c78", [1.05, 2.15, 0.08], [x, 1.43, 1.86], [0, 0, 0], 0.4)
    b.shape("#327c78", new THREE.CircleGeometry(0.525, 16, 0, Math.PI), [x, 2.51, 1.93], [0, 0, 0], 0.4)
    b.box("#e0d3b9", [0.15, 3.2, 0.35], [x - 0.77, 1.85, 2.16])
  }
  b.box("#f6f0dd", [9.4, 0.22, 2.5], [-0.6, 3.78, 2.39])
  b.box("#d0c8b4", [9.0, 0.18, 3.0], [-0.6, 0.22, 3.3])
  b.box("#e5ddc9", [8.5, 0.14, 1.3], [-0.6, 0.34, 3.7])
  const minaretX = 6.4
  b.cylinder("#f0e9d8", 0.68, 8.9, [minaretX, 4.55, -1.2], 0.52)
  for (const y of [2.8, 6.2, 8.65]) b.cylinder("#d0c6af", 0.94, 0.22, [minaretX, y, -1.2])
  b.cylinder("#f1e6cc", 0.66, 1.15, [minaretX, 9.49, -1.2], 0.48)
  b.shape("#2f9278", new THREE.SphereGeometry(0.77, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), [minaretX, 10.1, -1.2], [0, 0, 0], 0.42)
  b.cylinder("#cfb977", 0.035, 0.95, [minaretX, 11.28, -1.2])
  b.palm(-7.35, 5.6, 4.5)
  b.palm(7.2, 5.8, 3.9)
  b.hedge([2.8, 0.42, 0.65], [4.75, 0.3, 5.6])
  b.sign(["PGA SEMENYIH", "PELANGI MOSQUE"], [7.1, 1.05], [-0.6, 3.75, 3.66], "#245e54")
  return b.finish()
}

function createLotus() {
  const b = sceneryBuilder("Lotus's Semenyih · green retail hall")
  plaza(b, 17.6, 15.2, 1.2)
  b.box("#e8eadc", [15.0, 4.4, 8.5], [0, 2.4, -1.7])
  b.box("#279657", [15.5, 0.9, 8.95], [0, 4.94, -1.7])
  b.box("#f0d54b", [15.51, 0.15, 0.08], [0, 4.39, 2.82])
  b.box("#b9d3bd", [14.65, 0.15, 8.4], [0, 5.48, -1.7])
  b.box("#6aaeba", [7.6, 2.45, 0.1], [-1.3, 1.76, 2.61], [0, 0, 0], 0.3)
  for (const x of [-5.08, -3.18, -1.28, 0.62, 2.52]) b.box("#e9efdf", [0.12, 2.52, 0.15], [x, 1.8, 2.71])
  b.box("#257a45", [3.65, 2.65, 0.16], [5.0, 1.93, 2.68])
  b.box("#faf1c2", [10.8, 0.16, 2.4], [-1.3, 3.43, 3.62])
  for (const x of [-6.3, 3.5]) b.box("#e6ddbf", [0.15, 3.18, 0.15], [x, 1.73, 4.6])
  b.box("#777d78", [13.9, 0.07, 2.6], [0, 0.19, 6.6])
  for (let bay = 0; bay < 8; bay++) b.box("#f2ebc7", [0.09, 0.012, 1.95], [-6.0 + bay * 1.72, 0.24, 6.5])
  b.palm(-7.4, 5.0, 3.1)
  b.palm(7.4, 5.0, 3.3)
  b.sign(["LOTUS'S", "SEMENYIH"], [6.4, 1.34], [0, 4.91, 2.83], "#218349")
  return b.finish()
}

function createEcohill() {
  const b = sceneryBuilder("Ecohill Walk Mall · open retail promenade")
  plaza(b, 17.6, 16.2, 1.0)
  b.box("#e7e8df", [15.6, 5.1, 6.8], [0, 2.7, -1.8])
  const colors = ["#8cce9c", "#70b5c6", "#e4bc74", "#9cafcc", "#94bba6"]
  for (let unit = 0; unit < 5; unit++) {
    const x = -6.0 + unit * 3.0
    b.box(unit % 2 ? "#f2f0e4" : "#d6dbd2", [2.77, 0.4 + unit % 2 * 0.6, 7.0], [x, 5.47 + unit % 2 * 0.3, -1.8])
    b.box("#5c98ad", [2.58, 3.25, 0.1], [x, 2.38, 1.64], [0, 0, 0], 0.32)
    b.box("#e4e4d8", [0.11, 3.3, 0.17], [x, 2.4, 1.77])
    b.box(colors[unit], [2.66, 0.27, 1.75], [x, 2.29, 2.24])
    b.box("#f4efdf", [0.18, 4.25, 0.4], [x - 1.41, 2.32, 2.8])
    b.box("#c7d0c1", [2.73, 0.16, 1.37], [x, 4.22, 2.1])
  }
  b.box("#dad4c4", [13.6, 0.16, 4.25], [0, 0.2, 4.31])
  b.box("#9aa08d", [7.4, 0.24, 0.08], [0, 4.78, 3.02])
  b.palm(-6.75, 6.65, 4.3)
  b.palm(0, 6.75, 4.1)
  b.palm(6.75, 6.65, 4.6)
  for (const x of [-3.4, 3.4]) {
    b.box("#b4a58d", [2.15, 0.5, 1.0], [x, 0.37, 6.63])
    b.hedge([1.98, 0.35, 0.88], [x, 0.79, 6.63])
  }
  b.sign(["ECOHILL WALK"], [7.3, 1.02], [0, 4.84, 3.07], "#39745a")
  return b.finish()
}

function createIoi() {
  const b = sceneryBuilder("IOI City Mall · layered city retail facade")
  plaza(b, 17.6, 17.4, 0.8)
  b.box("#d8d8cc", [16.7, 7.15, 9.2], [0, 3.76, -1.9])
  b.box("#6ca9bb", [16.35, 5.85, 0.12], [0, 3.85, 2.78], [0, 0, 0], 0.28)
  for (const y of [1.29, 3.14, 5.00, 6.88]) b.box("#ede6d4", [17.0, 0.31, 0.72], [0, y, 3.0])
  for (const x of [-7.75, -5.82, -3.89, -1.96, -0.03, 1.9, 3.83, 5.76, 7.69]) b.box("#cfba84", [0.23, 6.85, 0.35], [x, 3.88, 3.19])
  b.box("#f0e8d5", [8.8, 2.55, 7.1], [-2.45, 8.55, -2.6])
  b.box("#78b3c6", [8.5, 1.8, 0.1], [-2.45, 8.65, 1.0], [0, 0, 0], 0.28)
  b.box("#c5b282", [9.1, 0.35, 7.4], [-2.45, 10.01, -2.6])
  b.box("#d7dfda", [4.6, 3.35, 5.2], [5.65, 8.06, -3.35])
  b.windows(3.95, 2, 4, [5.65, 7.25, -0.66])
  b.box("#4b879d", [9.8, 0.28, 3.6], [-1.2, 3.06, 4.2])
  for (const x of [-5.9, 3.4]) b.box("#d1c7a9", [0.24, 2.82, 0.24], [x, 1.7, 5.62])
  b.box("#e9dfc4", [11.5, 0.2, 3.85], [0, 0.2, 5.46])
  b.cylinder("#bcb19a", 1.15, 0.5, [5.8, 0.42, 6.8])
  b.cylinder("#70adba", 0.97, 0.08, [5.8, 0.72, 6.8])
  b.palm(-7.5, 6.7, 5.6)
  b.palm(7.45, 6.7, 5.2)
  b.sign(["IOI CITY MALL"], [8.4, 1.4], [-2.45, 8.72, 1.10], "#2f6478")
  return b.finish()
}

function createTbs() {
  const b = sceneryBuilder("Terminal Bersepadu Selatan · transport concourse and bus bays")
  plaza(b, 17.6, 19.0, 1.0)
  b.box("#c3cbc9", [15.3, 7.0, 7.0], [0, 3.65, -3.25])
  b.box("#6091aa", [14.85, 5.0, 0.12], [0, 3.72, 0.32], [0, 0, 0], 0.3)
  for (const y of [1.7, 3.4, 5.1, 6.8]) b.box("#dde3db", [15.7, 0.24, 0.5], [0, y, 0.51])
  for (const x of [-6.8, -4.55, -2.3, 0, 2.3, 4.55, 6.8]) b.box("#d5d9d4", [0.16, 6.9, 0.27], [x, 3.76, 0.66])
  b.box("#e1e8e5", [16.5, 0.25, 7.3], [0, 8.06, -3.25], [0, 0, -0.065])
  b.box("#628a97", [4.9, 2.0, 4.6], [-3.3, 8.35, -3.4])
  b.box("#cfd9d5", [5.1, 0.22, 4.8], [-3.3, 9.46, -3.4])
  b.box("#a9b8b4", [16.15, 0.24, 5.4], [0, 3.43, 3.0])
  for (const x of [-7.5, -2.5, 2.5, 7.5]) b.box("#dce3d8", [0.21, 3.2, 0.21], [x, 1.83, 5.43])
  b.box("#747d7c", [16.4, 0.08, 7.8], [0, 0.2, 6.0])
  for (let bay = 0; bay < 4; bay++) {
    const x = -5.7 + bay * 3.8
    b.box("#ecd782", [0.08, 0.014, 5.9], [x - 1.6, 0.25, 6.9])
    b.box(bay % 2 ? "#2e8094" : "#e7c65a", [2.75, 1.66, 4.55], [x, 1.35, 6.4])
    b.box("#314654", [2.5, 0.75, 0.06], [x, 1.67, 8.72], [0, 0, 0], 0.35)
    b.box("#e5e9da", [2.83, 0.12, 4.58], [x, 2.25, 6.4])
    for (const side of [-1, 1]) {
      b.shape("#30383c", new THREE.CylinderGeometry(0.34, 0.34, 0.15, 10), [x + side * 1.34, 0.52, 5.0], [0, 0, Math.PI / 2])
      b.shape("#30383c", new THREE.CylinderGeometry(0.34, 0.34, 0.15, 10), [x + side * 1.34, 0.52, 7.8], [0, 0, Math.PI / 2])
    }
  }
  b.sign(["TERMINAL BERSEPADU SELATAN", "TBS · BUS TERMINAL"], [13.1, 1.34], [0, 6.22, 0.83], "#234b69")
  b.sign(["DEPARTURES"], [5.5, 0.58], [0, 3.35, 5.75], "#335b62")
  return b.finish()
}

/** Destination fronts face local +Z; groups start with neutral transforms. */
export function createDestinationLandmark(stopId: string): THREE.Group {
  switch (stopId) {
    case "tts": return createTts()
    case "pga": return createPga()
    case "lotus": return createLotus()
    case "ecohill": return createEcohill()
    case "ioi": return createIoi()
    case "tbs": return createTbs()
    default: throw new Error(`No destination scenery is defined for stop '${stopId}'`)
  }
}

/** Small reusable roadside models change the atmosphere between destinations. */
export function createEnvironmentProp(theme: Theme, variant: number): THREE.Group {
  const index = ((Math.floor(variant) % 5) + 5) % 5
  const b = sceneryBuilder(`${theme} roadside scenery ${index + 1}`)
  if (theme === "campus") {
    if (index % 2 === 0) {
      b.palm(0, 0, 3.3 + index * 0.35, 1.35)
      b.hedge([2.6, 0.4, 1.7], [0, 0.25, 0])
    } else {
      b.box("#eceee1", [3.6, 2.7, 3.1], [0, 1.35, 0])
      b.box("#d6ded4", [3.85, 0.2, 3.35], [0, 2.79, 0])
      b.windows(3.0, 2, 3, [0, 0.82, 1.6])
      b.hedge([3.3, 0.38, 0.6], [0, 0.23, 2.0])
    }
  } else if (theme === "neighbourhood") {
    const wall = ["#eee0c8", "#d9d1ba", "#e8c4ae", "#d6e3d8", "#eee6d6"][index]
    b.box(wall, [3.45, 2.8 + index % 2 * 0.7, 3.2], [-0.25, 1.45 + index % 2 * 0.35, -0.35])
    b.pitchedRoof(3.8, 3.5, 3.06 + index % 2 * 0.7, -0.25, -0.35, index % 2 ? "#817567" : "#b86b4f")
    b.windows(2.75, 2, 2, [-0.25, 0.9, 1.31])
    b.box("#6f5541", [0.7, 1.6, 0.08], [0.69, 0.87, 1.34])
    b.box("#dcd3bb", [3.85, 0.1, 0.95], [-0.25, 0.08, 1.84])
    b.palm(2.1, -0.6, 3.3 + index * 0.18, 0.64)
    b.hedge([1.2, 0.38, 0.6], [-1.4, 0.25, 2.02])
  } else if (theme === "town") {
    const colors = ["#d49b72", "#74a59e", "#97a9bb", "#c8ac75", "#ae92a4"]
    for (const side of [-1, 1]) {
      const x = side * 1.3
      b.box(side === -1 ? "#e9dcc8" : "#ddd6c8", [2.5, 4.3, 3.6], [x, 2.15, -0.2])
      b.windows(2.1, 1, 2, [x, 3.35, 1.64])
      b.box("#4a7c8c", [2.13, 1.6, 0.08], [x, 1.15, 1.66], [0, 0, 0], 0.4)
      b.box(colors[(index + (side === 1 ? 1 : 0)) % colors.length], [2.5, 0.2, 1.0], [x, 2.14, 1.57])
    }
    b.box("#c8c4b7", [5.55, 0.13, 1.05], [0, 0.07, 1.96])
    b.box("#f0e9d5", [5.35, 0.22, 3.8], [0, 4.42, -0.2])
  } else if (theme === "rail") {
    b.box("#c7cdcb", [4.1, 5.5 + index * 0.48, 3.7], [-0.35, (5.5 + index * 0.48) / 2, -0.2])
    b.windows(3.55, 4 + index % 2, 3, [-0.35, 1.15, 1.7], "#628699")
    b.box("#e0e2d7", [4.4, 0.22, 3.95], [-0.35, 5.63 + index * 0.48, -0.2])
    b.box("#949e9b", [4.5, 0.3, 0.7], [-0.35, 2.25, 1.82])
    b.cylinder("#829394", 0.07, 3.4, [2.2, 1.7, 0.7])
    b.box("#dae3df", [0.45, 0.12, 0.28], [2.36, 3.44, 0.7])
  } else {
    const height = 7.8 + index * 0.75
    b.box("#d6deda", [3.05, height, 3.55], [-0.65, height / 2, -0.25])
    b.box("#679db0", [2.84, height - 0.8, 0.08], [-0.65, height / 2, 1.57], [0, 0, 0], 0.3)
    for (let floor = 1; floor < Math.floor(height); floor++) b.box("#dde5df", [3.1, 0.11, 0.18], [-0.65, floor + 0.1, 1.66])
    for (const x of [-1.45, -0.65, 0.15]) b.box("#b9c7c3", [0.1, height - 0.4, 0.17], [x, height / 2, 1.65])
    b.box("#b7c7c5", [3.2, 0.28, 3.7], [-0.65, height + 0.1, -0.25])
    b.palm(1.95, -0.4, 4.1, 0.78)
    b.hedge([1.3, 0.37, 0.7], [1.74, 0.25, 1.88])
  }
  return b.finish()
}
