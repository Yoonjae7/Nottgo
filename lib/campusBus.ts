import * as THREE from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

const CHARCOAL = "#202a35"
const TURQUOISE = "#49b5b3"
const WHITE = "#f4f5f3"

function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
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

function sideTexture(frontOnLeft: boolean) {
  return canvasTexture(2048, 768, (context) => {
    context.fillStyle = CHARCOAL
    context.fillRect(0, 0, 2048, 768)

    // Orient the front graphics correctly on both sides of the coach.
    context.save()
    if (!frontOnLeft) {
      context.translate(2048, 0)
      context.scale(-1, 1)
    }
    context.fillStyle = TURQUOISE
    context.beginPath()
    context.moveTo(0, 768)
    context.lineTo(0, 424)
    context.lineTo(552, 473)
    context.lineTo(520, 768)
    context.fill()
    context.beginPath()
    context.moveTo(1924, 375)
    context.lineTo(2048, 405)
    context.lineTo(2048, 768)
    context.lineTo(1982, 768)
    context.fill()
    context.fillStyle = WHITE
    context.beginPath()
    context.moveTo(0, 540)
    context.lineTo(570, 337)
    context.quadraticCurveTo(630, 326, 661, 307)
    context.lineTo(588, 382)
    context.lineTo(0, 677)
    context.fill()
    // The passenger door sits just behind the turquoise nose.
    context.fillStyle = "#141d28"
    context.fillRect(10, 69, 329, 481)
    context.strokeStyle = "#0b141d"
    context.lineWidth = 7
    context.strokeRect(10, 65, 329, 490)
    context.strokeStyle = "#789da4"
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(185, 320)
    context.lineTo(185, 470)
    context.stroke()
    context.restore()

    const glass = context.createLinearGradient(0, 0, 0, 334)
    glass.addColorStop(0, "#111b27")
    glass.addColorStop(0.58, "#152b39")
    glass.addColorStop(1, "#21414c")
    context.fillStyle = glass
    context.fillRect(0, 0, 2048, 330)
    context.fillStyle = "#7eb4c1"
    context.globalAlpha = 0.11
    context.beginPath()
    context.moveTo(560, 0)
    context.lineTo(1080, 0)
    context.lineTo(590, 330)
    context.lineTo(370, 330)
    context.fill()
    context.globalAlpha = 1

    // Draped blue curtains are part of the glass texture, avoiding extra meshes.
    const passengerStart = frontOnLeft ? 372 : 80
    const passengerEnd = frontOnLeft ? 1970 : 1676
    const windowWidth = (passengerEnd - passengerStart) / 6
    for (let index = 0; index < 6; index++) {
      const left = passengerStart + index * windowWidth
      const right = left + windowWidth
      context.fillStyle = "#307282"
      context.fillRect(left + 12, 73, 21, 225)
      context.fillRect(right - 27, 73, 18, 225)
      context.fillStyle = "#408c99"
      context.beginPath()
      context.moveTo(left + 13, 47)
      context.quadraticCurveTo(left + windowWidth / 2, 88, right - 12, 47)
      context.lineTo(right - 12, 89)
      context.quadraticCurveTo(left + windowWidth / 2, 226, left + 13, 89)
      context.fill()
      context.strokeStyle = "#75b7be"
      context.lineWidth = 4
      for (let fold = 0; fold < 4; fold++) {
        context.beginPath()
        context.moveTo(left + 17, 62 + fold * 10)
        context.quadraticCurveTo(left + windowWidth / 2, 168 + fold * 15, right - 17, 62 + fold * 10)
        context.stroke()
      }
      context.strokeStyle = "#0d1720"
      context.lineWidth = 12
      context.beginPath()
      context.moveTo(right, 0)
      context.lineTo(right, 335)
      context.stroke()
    }
    context.fillStyle = "#0e1721"
    context.fillRect(0, 326, 2048, 15)
    context.fillStyle = "#a2cbce"
    context.globalAlpha = 0.23
    context.fillRect(0, 4, 2048, 5)
    context.globalAlpha = 1

    // Luggage seams and a subtle rear ventilation grille.
    context.strokeStyle = "#111d26"
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(0, 654)
    context.lineTo(2048, 654)
    for (const seam of [570, 1170, 1720]) {
      context.moveTo(seam, 650)
      context.lineTo(seam, 768)
    }
    context.stroke()
    const grilleX = frontOnLeft ? 1918 : 52
    for (let index = 0; index < 12; index++) {
      context.fillStyle = "#101921"
      context.fillRect(grilleX, 523 + index * 12, 73, 5)
    }
    context.fillStyle = "#eba84c"
    context.fillRect(419, 580, 18, 10)
    context.fillRect(1838, 580, 18, 10)
  })
}

function rearTexture() {
  return canvasTexture(1024, 768, (context) => {
    context.fillStyle = CHARCOAL
    context.fillRect(0, 0, 1024, 768)
    context.fillStyle = "#101f2c"
    context.fillRect(72, 24, 880, 230)
    context.fillStyle = "#305465"
    context.globalAlpha = 0.45
    context.beginPath()
    context.moveTo(72, 24)
    context.lineTo(621, 24)
    context.lineTo(301, 254)
    context.lineTo(72, 254)
    context.fill()
    context.globalAlpha = 1
    context.fillStyle = TURQUOISE
    context.beginPath()
    context.moveTo(0, 269)
    context.lineTo(126, 330)
    context.lineTo(80, 768)
    context.lineTo(0, 768)
    context.fill()
    context.beginPath()
    context.moveTo(1024, 269)
    context.lineTo(898, 330)
    context.lineTo(944, 768)
    context.lineTo(1024, 768)
    context.fill()
    context.fillStyle = "#b1bcc1"
    context.fillRect(390, 620, 244, 4)
    context.fillStyle = "#13202c"
    for (let index = 0; index < 5; index++) context.fillRect(281, 646 + index * 15, 461, 5)
  })
}

function windshieldTexture() {
  return canvasTexture(768, 384, (context) => {
    const glass = context.createLinearGradient(0, 0, 768, 384)
    glass.addColorStop(0, "#102435")
    glass.addColorStop(0.58, "#1d3b4b")
    glass.addColorStop(1, "#467681")
    context.fillStyle = glass
    context.fillRect(0, 0, 768, 384)
    context.fillStyle = "#a7d6e5"
    context.globalAlpha = 0.15
    context.beginPath()
    context.moveTo(36, 0)
    context.lineTo(334, 0)
    context.lineTo(628, 384)
    context.lineTo(437, 384)
    context.fill()
    context.globalAlpha = 1
    context.fillStyle = "#121d27"
    context.fillRect(373, 0, 12, 384)
    context.strokeStyle = "#101921"
    context.lineWidth = 12
    for (const x of [195, 567]) {
      context.beginPath()
      context.moveTo(x, 354)
      context.lineTo(x + 93, 288)
      context.stroke()
    }
  })
}

function wheelHubTexture() {
  return canvasTexture(256, 256, (context) => {
    const silver = context.createRadialGradient(100, 82, 18, 128, 128, 126)
    silver.addColorStop(0, "#e5e9e7")
    silver.addColorStop(0.62, "#a9b3b8")
    silver.addColorStop(0.8, "#c5cdcf")
    silver.addColorStop(1, "#67757d")
    context.fillStyle = silver
    context.fillRect(0, 0, 256, 256)
    for (let index = 0; index < 10; index++) {
      const angle = index * Math.PI / 5
      const x = 128 + Math.cos(angle) * 82
      const y = 128 + Math.sin(angle) * 82
      context.fillStyle = "#34414a"
      context.beginPath()
      context.arc(x, y, 14, 0, Math.PI * 2)
      context.fill()
      context.strokeStyle = "#d8dfdd"
      context.lineWidth = 4
      context.stroke()
    }
    context.fillStyle = "#bec8cb"
    context.beginPath()
    context.arc(128, 128, 39, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = "#7b8a92"
    context.lineWidth = 4
    context.stroke()
  })
}

/** The campus coach points toward -Z; moving wheels keep the game's existing API. */
export function createCampusBus(branding: { logo: THREE.Texture }): THREE.Group {
  const bus = new THREE.Group()
  bus.name = "Nottingham campus coach"
  const charcoal = new THREE.MeshStandardMaterial({ color: CHARCOAL, roughness: 0.36, metalness: 0.16 })
  const turquoise = new THREE.MeshStandardMaterial({ color: TURQUOISE, roughness: 0.35, metalness: 0.12 })
  const white = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.4, metalness: 0.08 })
  const darkTrim = new THREE.MeshStandardMaterial({ color: "#0d1720", roughness: 0.55 })
  const silver = new THREE.MeshStandardMaterial({ color: "#b7c5cd", roughness: 0.3, metalness: 0.72 })
  const logoMaterial = new THREE.MeshBasicMaterial({
    map: branding.logo,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })

  function rounded(
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    radius = 0.06,
  ) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, radius), material)
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    bus.add(mesh)
    return mesh
  }

  function panel(width: number, height: number, position: [number, number, number], rotationY: number, texture: THREE.Texture) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.33, metalness: 0.12 }),
    )
    mesh.position.set(...position)
    mesh.rotation.y = rotationY
    bus.add(mesh)
    return mesh
  }

  function logoPanel(width: number, position: [number, number, number], rotationY: number, name: string) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 143 / 420), logoMaterial)
    mesh.name = name
    mesh.position.set(...position)
    mesh.rotation.y = rotationY
    bus.add(mesh)
  }

  rounded([2.18, 1.46, 4.05], [0, 1.2, 0], charcoal, 0.11)
  rounded([2.09, 0.18, 3.93], [0, 1.98, -0.015], white, 0.08)
  rounded([2.06, 0.12, 3.78], [0, 0.46, 0], darkTrim, 0.035)
  // Roof-mounted AC housings echo the low, rounded white pods in the photograph.
  rounded([1.43, 0.12, 0.83], [0, 2.09, -0.96], white, 0.055)
  rounded([1.31, 0.1, 0.81], [0, 2.085, 0.76], white, 0.045)

  for (const side of [-1, 1]) {
    panel(3.85, 1.39, [side * 1.096, 1.2, 0], side * Math.PI / 2, sideTexture(side < 0))
    logoPanel(1.65, [side * 1.104, 0.93, 0.33], side * Math.PI / 2, `Coach logo ${side < 0 ? "left" : "right"}`)
    rounded([0.05, 0.07, 3.68], [side * 1.105, 0.5, 0], silver, 0.02)
    rounded([0.26, 0.06, 0.09], [side * 1.18, 1.66, -1.74], turquoise, 0.025)
    rounded([0.13, 0.11, 0.4], [side * 1.32, 1.67, -1.79], turquoise, 0.05)
    rounded([0.035, 0.07, 0.24], [side * 1.393, 1.65, -1.76], darkTrim, 0.015)
  }

  panel(1.92, 0.72, [0, 1.56, -2.032], Math.PI, windshieldTexture())
  rounded([2.04, 0.48, 0.05], [0, 0.88, -2.017], turquoise, 0.02)
  rounded([1.96, 0.09, 0.08], [0, 0.51, -2.025], darkTrim, 0.03)
  rounded([0.63, 0.12, 0.026], [0, 0.74, -2.051], darkTrim, 0.012)
  panel(1.96, 1.35, [0, 1.2, 2.033], 0, rearTexture())
  logoPanel(1.4, [0, 0.91, 2.041], 0, "Coach logo rear")
  rounded([1.93, 0.1, 0.07], [0, 0.51, 2.02], darkTrim, 0.025)

  const headlights = new THREE.MeshStandardMaterial({
    color: "#fff3ce", emissive: "#ffe8a5", emissiveIntensity: 0.32, roughness: 0.3,
  })
  const tailLights = new THREE.MeshStandardMaterial({
    color: "#ee5453", emissive: "#d62727", emissiveIntensity: 0.32, roughness: 0.28,
  })
  const amber = new THREE.MeshStandardMaterial({ color: "#f6bd57", emissive: "#e99528", emissiveIntensity: 0.15 })
  for (const side of [-1, 1]) {
    rounded([0.35, 0.11, 0.04], [side * 0.7, 0.73, -2.051], headlights, 0.025)
    rounded([0.16, 0.35, 0.035], [side * 0.85, 0.82, 2.052], tailLights, 0.025)
    rounded([0.15, 0.055, 0.038], [side * 0.85, 0.98, 2.054], amber, 0.012)
  }

  const tireGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 20)
  const tireMaterial = new THREE.MeshStandardMaterial({ color: "#11171c", roughness: 0.91 })
  const hubGeometry = new THREE.CircleGeometry(0.242, 20)
  const hubMaterial = new THREE.MeshStandardMaterial({ map: wheelHubTexture(), roughness: 0.36, metalness: 0.5 })
  const wheels: THREE.Mesh[] = []
  for (const x of [-1.13, 1.13]) {
    for (const z of [-1.36, 1.34]) {
      const wheel = new THREE.Mesh(tireGeometry, tireMaterial)
      wheel.position.set(x, 0.4, z)
      wheel.rotation.z = Math.PI / 2
      wheel.castShadow = true
      const hub = new THREE.Mesh(hubGeometry, hubMaterial)
      hub.position.y = x < 0 ? 0.112 : -0.112
      hub.rotation.x = x < 0 ? -Math.PI / 2 : Math.PI / 2
      wheel.add(hub)
      bus.add(wheel)
      wheels.push(wheel)
    }
  }
  bus.userData.wheels = wheels
  return bus
}
