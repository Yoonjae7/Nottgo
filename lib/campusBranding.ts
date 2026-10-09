import * as THREE from "three"

/** Exact crest and lettering derived from the site's Nottingham branding artwork. */
export function loadCampusBranding() {
  const loader = new THREE.TextureLoader()
  const load = (filename: string) => {
    const texture = loader.load(`/branding/${filename}`)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return texture
  }

  return {
    logo: load("nottingham-bus-lockup.png"),
    crest: load("nottingham-crest-navy.png"),
    wordmark: load("nottingham-wordmark-white.png"),
    emblem: load("nottingham-emblem-blue.png"),
  }
}
