import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

type Point = [number, number, number]

/** A compact campus landmark. The entrance and clock face point toward local +Z. */
export function createTrentBuilding(branding: { emblem: THREE.Texture }): THREE.Group {
  const landmark = new THREE.Group()
  landmark.name = "Trent Building"

  // Batch repeated architectural details by material, so mullions, stairs, and
  // palm leaves add shape without each introducing a separate draw call.
  const batches: { name: string; material: THREE.Material; geometries: THREE.BufferGeometry[]; shadow: boolean }[] = []
  const batch = (name: string, color: string, roughness = 0.85, shadow = true) => {
    const item = {
      name,
      material: new THREE.MeshStandardMaterial({ color, roughness, metalness: roughness < 0.5 ? 0.16 : 0.02 }),
      geometries: [] as THREE.BufferGeometry[],
      shadow,
    }
    batches.push(item)
    return item
  }
  type Batch = ReturnType<typeof batch>
  const geometry = (target: Batch, shape: THREE.BufferGeometry, position: Point, rotationY = 0) => {
    const flat = shape.index ? shape.toNonIndexed() : shape
    if (flat !== shape) shape.dispose()
    if (rotationY) flat.rotateY(rotationY)
    flat.translate(...position)
    target.geometries.push(flat)
  }
  const box = (target: Batch, size: Point, position: Point) => geometry(target, new THREE.BoxGeometry(...size), position)

  const white = batch("White walls, piers, and window mullions", "#f8faf4")
  const roof = batch("Flat roof surfaces", "#dde4e1")
  const recess = batch("Clock tower recesses", "#b8c8c5")
  const glass = batch("Teal campus glazing", "#78b6be", 0.3, false)
  const door = batch("Recessed entrance doors", "#203e43", 0.38, false)
  const brick = batch("Warm brick entrance interior", "#aa7254")
  const mortar = batch("Brick mortar lines", "#cf9a7c")
  const concrete = batch("Entrance terrace and shallow stairs", "#cdd3ce")
  const stone = batch("Pond edges and pedestrian bridge", "#ede8da")
  const lawn = batch("Landmark lawn", "#70a954", 1, false)
  const water = batch("Reflecting pond", "#538a96", 0.34, false)
  const trunk = batch("Palm trunks", "#927256", 1)
  const leaves = batch("Palm fronds", "#347844", 1)
  leaves.material.side = THREE.DoubleSide
  const hedge = batch("Circular planted island", "#426d36", 1)

  box(lawn, [20.8, 0.08, 23.8], [0, 0.01, 7.9])
  box(concrete, [20.2, 1.08, 7.5], [0, 0.56, 0.05])
  box(stone, [20.4, 0.12, 7.7], [0, 1.13, 0.05])

  // Low symmetrical wings, glazed across two levels, with white structural grids.
  for (const side of [-1, 1]) {
    const x = side * 6.6
    box(white, [6.2, 4.0, 5.5], [x, 3.2, -0.85])
    box(glass, [5.55, 2.85, 0.075], [x, 3.03, 1.938])
    for (let column = 0; column <= 6; column++) {
      box(white, [0.075, 2.96, 0.105], [x - 2.775 + column * 0.925, 3.03, 1.99])
    }
    for (const y of [1.58, 3.03, 4.48]) box(white, [5.7, 0.085, 0.11], [x, y, 1.994])
    // The outer glazing remains recognizable when the bus passes beside it.
    const outerX = side * 9.733
    box(glass, [0.065, 2.85, 4.72], [outerX, 3.03, -0.85])
    for (let column = 0; column <= 5; column++) {
      box(white, [0.085, 2.96, 0.07], [side * 9.777, 3.03, -3.21 + column * 0.944])
    }
    for (const y of [1.58, 3.03, 4.48]) box(white, [0.09, 0.085, 4.82], [side * 9.779, y, -0.85])
    box(roof, [6.12, 0.12, 5.42], [x, 5.23, -0.85])
    for (const z of [-3.59, 1.89]) box(white, [6.3, 0.35, 0.14], [x, 5.39, z])
    for (const edge of [-1, 1]) box(white, [0.14, 0.35, 5.5], [x + edge * 3.08, 5.39, -0.85])
  }

  // The taller central gateway has three open bays, not a solid facade.
  box(white, [6.8, 0.92, 6.65], [0, 6.06, -0.28])
  box(roof, [6.54, 0.1, 6.35], [0, 6.57, -0.28])
  box(white, [6.35, 4.85, 2.2], [0, 3.61, -2.5])
  box(brick, [5.9, 3.85, 0.13], [0, 3.15, -1.335])
  for (let row = 0; row < 18; row++) box(mortar, [5.91, 0.018, 0.025], [0, 1.3 + row * 0.21, -1.256])
  for (const x of [-1.9, 0, 1.9]) {
    box(door, [1.37, 2.55, 0.095], [x, 2.5, -1.21])
    box(white, [0.045, 2.56, 0.13], [x, 2.5, -1.14])
    box(glass, [1.42, 0.58, 0.095], [x, 4.2, -1.21])
  }
  for (const x of [-3.15, -1.05, 1.05, 3.15]) {
    box(white, [0.49, 4.43, 0.66], [x, 3.4, 2.71])
    box(white, [0.63, 0.16, 0.8], [x, 1.27, 2.71])
  }
  box(stone, [8.2, 0.14, 1.0], [0, 1.2, 3.12])
  for (let step = 0; step < 10; step++) {
    const height = (10 - step) * 0.118
    box(concrete, [8.6, height, 0.5], [0, height / 2 + 0.035, 3.85 + step * 0.5])
    box(stone, [8.62, 0.026, 0.5], [0, height + 0.047, 3.85 + step * 0.5])
  }

  // A narrow ribbed clock tower projects above the flat central roof.
  box(recess, [1.04, 4.05, 1.04], [0, 8.56, -1.55])
  for (let rib = 0; rib <= 5; rib++) {
    const offset = -0.5 + rib * 0.2
    box(white, [0.072, 2.92, 0.13], [offset, 8.04, -0.974])
    box(white, [0.072, 2.92, 0.13], [offset, 8.04, -2.126])
    box(white, [0.13, 2.92, 0.072], [-0.576, 8.04, -1.55 + offset])
    box(white, [0.13, 2.92, 0.072], [0.576, 8.04, -1.55 + offset])
  }
  box(white, [1.21, 1.02, 1.21], [0, 10.07, -1.55])
  box(white, [1.31, 0.16, 1.31], [0, 10.66, -1.55])
  box(white, [1.24, 0.13, 1.24], [0, 6.65, -1.55])

  // A reflecting pond and straight bridge evoke the photographed campus approach.
  for (const side of [-1, 1]) {
    box(water, [6.45, 0.075, 6.45], [side * 4.1, 0.105, 12.77])
    box(stone, [0.18, 0.16, 6.76], [side * 7.43, 0.13, 12.77])
    box(stone, [6.6, 0.16, 0.18], [side * 4.1, 0.13, 9.46])
    box(stone, [6.6, 0.16, 0.18], [side * 4.1, 0.13, 16.08])
  }
  box(stone, [1.28, 0.2, 9.95], [0, 0.15, 13.5])
  box(concrete, [0.93, 0.045, 9.9], [0, 0.275, 13.5])
  // Low bridge rails leave the narrow axial approach visible from the road.
  for (const side of [-1, 1]) {
    box(white, [0.07, 0.07, 6.65], [side * 0.65, 0.59, 12.77])
    for (let post = 0; post < 7; post++) box(white, [0.07, 0.4, 0.07], [side * 0.65, 0.4, 9.65 + post * 1.04])
  }
  geometry(stone, new THREE.CylinderGeometry(1.31, 1.31, 0.14, 32), [0, 0.13, 18.48])
  geometry(hedge, new THREE.CylinderGeometry(1.06, 1.06, 0.24, 32), [0, 0.28, 18.48])
  geometry(lawn, new THREE.CylinderGeometry(0.78, 0.78, 0.025, 28), [0, 0.414, 18.48])

  const palmFrond = () => {
    const leaf = new THREE.BufferGeometry()
    leaf.setAttribute("position", new THREE.Float32BufferAttribute([
      0, 0, 0, -0.23, 0.16, 0.58, 0, 0.21, 0.7,
      0, 0, 0, 0, 0.21, 0.7, 0.23, 0.16, 0.58,
      -0.23, 0.16, 0.58, 0, -0.18, 1.3, 0, 0.21, 0.7,
      0, 0.21, 0.7, 0, -0.18, 1.3, 0.23, 0.16, 0.58,
    ], 3))
    leaf.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(24).fill(0), 2))
    leaf.computeVertexNormals()
    return leaf
  }
  for (const side of [-1, 1]) {
    for (const [x, z, height] of [[8.35, 4.0, 3.3], [9.15, 9.1, 2.7], [8.4, 17.6, 3.1]]) {
      const palmX = side * x
      geometry(trunk, new THREE.CylinderGeometry(0.085, 0.14, height, 7), [palmX, height / 2 + 0.08, z])
      for (let leaf = 0; leaf < 7; leaf++) geometry(leaves, palmFrond(), [palmX, height + 0.06, z], leaf * Math.PI * 2 / 7 + side * 0.2)
    }
  }

  for (const item of batches) {
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
    landmark.add(mesh)
  }

  const plaqueCanvas = document.createElement("canvas")
  plaqueCanvas.width = 1024
  plaqueCanvas.height = 224
  const plaqueContext = plaqueCanvas.getContext("2d")!
  plaqueContext.fillStyle = "#f8faf4"
  plaqueContext.fillRect(0, 0, 1024, 224)
  plaqueContext.fillStyle = "#173f5e"
  plaqueContext.font = "700 58px Arial, sans-serif"
  plaqueContext.fillText("TRENT BUILDING", 217, 95)
  plaqueContext.font = "500 27px Arial, sans-serif"
  plaqueContext.fillText("UNIVERSITY OF NOTTINGHAM", 220, 148)
  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas)
  plaqueTexture.colorSpace = THREE.SRGBColorSpace
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.875), new THREE.MeshBasicMaterial({ map: plaqueTexture }))
  plaque.name = "Trent Building campus plaque"
  plaque.position.set(0, 6.02, 3.055)
  landmark.add(plaque)

  const emblem = new THREE.Mesh(
    new THREE.PlaneGeometry(0.59, 0.59),
    new THREE.MeshBasicMaterial({ map: branding.emblem, toneMapped: false }),
  )
  emblem.name = "Nottingham tower and wave emblem"
  emblem.position.set(-1.598, 6.028, 3.06)
  landmark.add(emblem)

  const clockCanvas = document.createElement("canvas")
  clockCanvas.width = clockCanvas.height = 256
  const clockContext = clockCanvas.getContext("2d")!
  clockContext.fillStyle = "#f9faf5"
  clockContext.fillRect(0, 0, 256, 256)
  clockContext.strokeStyle = "#193b50"
  clockContext.lineWidth = 10
  clockContext.beginPath()
  clockContext.arc(128, 128, 113, 0, Math.PI * 2)
  clockContext.stroke()
  clockContext.lineWidth = 5
  for (let tick = 0; tick < 12; tick++) {
    const angle = tick * Math.PI / 6
    clockContext.beginPath()
    clockContext.moveTo(128 + Math.sin(angle) * 87, 128 - Math.cos(angle) * 87)
    clockContext.lineTo(128 + Math.sin(angle) * 101, 128 - Math.cos(angle) * 101)
    clockContext.stroke()
  }
  clockContext.lineWidth = 9
  clockContext.lineCap = "round"
  clockContext.beginPath()
  clockContext.moveTo(128, 128)
  clockContext.lineTo(128, 58)
  clockContext.moveTo(128, 128)
  clockContext.lineTo(87, 109)
  clockContext.stroke()
  const clockTexture = new THREE.CanvasTexture(clockCanvas)
  clockTexture.colorSpace = THREE.SRGBColorSpace
  const clockMaterial = new THREE.MeshBasicMaterial({ map: clockTexture })
  const clockGeometry = new THREE.CircleGeometry(0.425, 32)
  for (const face of [0, -Math.PI / 2]) {
    const clock = new THREE.Mesh(clockGeometry, clockMaterial)
    clock.name = "Tower clock face"
    clock.rotation.y = face
    clock.position.set(face === 0 ? 0 : -0.61, 10.07, face === 0 ? -0.938 : -1.55)
    landmark.add(clock)
  }

  return landmark
}
