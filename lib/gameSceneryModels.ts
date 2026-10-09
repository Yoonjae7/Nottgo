import * as THREE from "three"
import { createTrentBuilding } from "./trentBuilding.ts"
import { createCampusEntrance } from "./campusEntrance.ts"
import { createKajangStation } from "./kajangStation.ts"
import { createDestinationLandmark, createEnvironmentProp } from "./destinationScenery.ts"
import { GAME_JOURNEY, type JourneyStage } from "./gameJourney.ts"
import type { SceneryModel } from "./campusScenery.ts"
import type { loadCampusBranding } from "./campusBranding.ts"

function createTree(x: number, z: number) {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.18, 1.25, 8),
    new THREE.MeshStandardMaterial({ color: "#7c4a2d", roughness: 1 }),
  )
  trunk.position.y = 0.62
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.78, 1),
    new THREE.MeshStandardMaterial({ color: x < 0 ? "#20854a" : "#2f9d5b", roughness: 0.95 }),
  )
  crown.position.y = 1.72
  crown.castShadow = true
  group.add(trunk, crown)
  group.position.set(x, 0, z)
  return group
}

export function createGameSceneryModels(branding: ReturnType<typeof loadCampusBranding>): SceneryModel[] {
  const sceneryModels: SceneryModel[] = [
    { kind: "trent", stageId: "campus", object: createTrentBuilding(branding) },
    { kind: "entrance", stageId: "campus", object: createCampusEntrance(branding) },
    ...GAME_JOURNEY.slice(1).map((stage): SceneryModel => ({
      kind: "landmark",
      stageId: stage.id,
      object: stage.id === "kajang" ? createKajangStation() : createDestinationLandmark(stage.id),
    })),
  ]
  for (let index = 0; index < 14; index++) {
    const tree = createTree(0, 0)
    const crown = tree.children[1] as THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>
    sceneryModels.push({
      kind: "tree", object: tree,
      onStageChange: (stage) => crown.material.color.set(stage.palette.trees[index % stage.palette.trees.length]),
    })
  }
  const themes: JourneyStage["theme"][] = ["campus", "neighbourhood", "town", "rail", "city"]
  for (let index = 0; index < 10; index++) {
    const prop = new THREE.Group()
    const variants = themes.map((theme) => {
      const object = createEnvironmentProp(theme, index)
      object.visible = theme === "campus"
      prop.add(object)
      return { theme, object }
    })
    sceneryModels.push({
      kind: "building", object: prop,
      onStageChange: (stage) => variants.forEach(({ theme, object }) => { object.visible = theme === stage.theme }),
    })
  }
  return sceneryModels
}
