import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { CFG } from './config'

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = CFG.exposure
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

export const scene = new THREE.Scene()
scene.background = new THREE.Color('#0b1220')
scene.fog = new THREE.Fog('#0e131c', 16, 55)

export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)

function makeComposer(): EffectComposer {
  const c = new EffectComposer(renderer)
  c.addPass(new RenderPass(scene, camera))
  c.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      CFG.bloomStrength,
      CFG.bloomRadius,
      CFG.bloomThreshold
    )
  )
  c.addPass(new OutputPass())
  return c
}
export const composer = makeComposer()

const sun = new THREE.DirectionalLight('#ffffff', CFG.sunIntensity)
sun.position.set(3, 5, 4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -21
sun.shadow.camera.right = 21
sun.shadow.camera.top = 19
sun.shadow.camera.bottom = -19
sun.shadow.camera.near = 1
sun.shadow.camera.far = 45
sun.shadow.camera.updateProjectionMatrix()
sun.shadow.bias = -0.0004
scene.add(sun)

const hemi = new THREE.HemisphereLight('#9db8ff', '#24304a', CFG.fillLight)
scene.add(hemi)

const amb = new THREE.AmbientLight('#ffffff', CFG.ambientLight)
scene.add(amb)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 40),
  new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.95, metalness: 0.05 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const grid = new THREE.GridHelper(30, 30, '#3d4450', '#262b34')
grid.position.y = 0.02
scene.add(grid)

const unitBox = new THREE.BoxGeometry(1, 1, 1)
const wallMat = new THREE.MeshStandardMaterial({ color: '#3a4150', roughness: 0.85, metalness: 0.1 })
function addWall(x: number, z: number, w: number, d: number): void {
  const wall = new THREE.Mesh(unitBox, wallMat)
  wall.scale.set(w, 0.55, d)
  wall.position.set(x, 0.275, z)
  wall.castShadow = true
  wall.receiveShadow = true
  scene.add(wall)
}
addWall(0, CFG.arenaHalfZ + 0.175, CFG.arenaHalfX * 2 + 0.7, 0.35)
addWall(0, -(CFG.arenaHalfZ + 0.175), CFG.arenaHalfX * 2 + 0.7, 0.35)
addWall(CFG.arenaHalfX + 0.175, 0, 0.35, CFG.arenaHalfZ * 2 + 0.7)
addWall(-(CFG.arenaHalfX + 0.175), 0, 0.35, CFG.arenaHalfZ * 2 + 0.7)

const paintMat = new THREE.MeshBasicMaterial({
  color: '#f0c23c',
  transparent: true,
  opacity: 0.85,
  depthWrite: false
})
function addPaint(x: number, z: number, w: number, d: number): void {
  const strip = new THREE.Mesh(unitBox, paintMat)
  strip.scale.set(w, 0.02, d)
  strip.position.set(x, 0.045, z)
  scene.add(strip)
}
addPaint(0, CFG.arenaHalfZ - 0.12, CFG.arenaHalfX * 2 - 0.5, 0.1)
addPaint(0, -(CFG.arenaHalfZ - 0.12), CFG.arenaHalfX * 2 - 0.5, 0.1)
addPaint(CFG.arenaHalfX - 0.12, 0, 0.1, CFG.arenaHalfZ * 2 - 0.5)
addPaint(-(CFG.arenaHalfX - 0.12), 0, 0.1, CFG.arenaHalfZ * 2 - 0.5)

const dustN = CFG.dustCount
const dustPos = new Float32Array(dustN * 3)
const dustVel = new Float32Array(dustN)
for (let i = 0; i < dustN; i++) {
  dustPos[i * 3] = (Math.random() * 2 - 1) * 20
  dustPos[i * 3 + 1] = 0.3 + Math.random() * 5.5
  dustPos[i * 3 + 2] = (Math.random() * 2 - 1) * 18
  dustVel[i] = 0.12 + Math.random() * 0.3
}
const dustGeo = new THREE.BufferGeometry()
const dustAttr = new THREE.BufferAttribute(dustPos, 3)
dustGeo.setAttribute('position', dustAttr)
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: '#93a1b3',
    size: 0.06,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
)
dust.frustumCulled = false
scene.add(dust)

const rackPos: THREE.Vector3[] = []
{
  const boxGeo = new THREE.BoxGeometry(1, 1, 1)
  const boxMat = new THREE.MeshStandardMaterial({ color: '#a8815e', roughness: 0.92, metalness: 0 })
  const AHX = CFG.arenaHalfX
  const AHZ = CFG.arenaHalfZ
  const per: number = 2
  const rackDefs: Array<[number, number, number]> = []
  for (let k = 0; k < per; k++) {
    const t = per === 1 ? 0 : (k / (per - 1)) * 2 - 1
    rackDefs.push([t * AHX * 0.6, -(AHZ + 2.6), 0])
    rackDefs.push([t * AHX * 0.6, AHZ + 2.6, 0])
    rackDefs.push([-(AHX + 2.6), t * AHZ * 0.6, Math.PI / 2])
    rackDefs.push([AHX + 2.6, t * AHZ * 0.6, Math.PI / 2])
  }
  const boxes = new THREE.InstancedMesh(boxGeo, boxMat, CFG.boxCount + rackDefs.length)
  boxes.castShadow = true
  boxes.receiveShadow = true
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  let i = 0
  const put = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    ry: number
  ): void => {
    p.set(x, y + h / 2, z)
    q.setFromAxisAngle(up, ry)
    s.set(w, h, d)
    m.compose(p, q, s)
    boxes.setMatrixAt(i++, m)
  }
  while (i < CFG.boxCount) {
    const x = (Math.random() * 2 - 1) * 19
    const z = (Math.random() * 2 - 1) * 17
    if (Math.abs(x) < CFG.arenaHalfX + 1.4 && Math.abs(z) < CFG.arenaHalfZ + 1.4) continue
    const bh = 0.55 + Math.random() * 0.35
    const bw = 0.7 + Math.random() * 0.6
    const n = 1 + Math.floor(Math.random() * 3)
    let y = 0
    for (let k = 0; k < n && i < CFG.boxCount; k++) {
      put(
        x + (Math.random() - 0.5) * 0.15,
        y,
        z + (Math.random() - 0.5) * 0.15,
        bw * (1 - k * 0.1),
        bh,
        bw * (1 - k * 0.1),
        Math.random() * 0.5 - 0.25
      )
      y += bh
    }
  }
  for (const [x, z, ry] of rackDefs) {
    put(x, 0, z, 2.8, 4.6 + Math.random() * 1.6, 1.4, ry)
    rackPos.push(new THREE.Vector3(x, 0, z))
  }
  boxes.count = i
  boxes.instanceMatrix.needsUpdate = true
  scene.add(boxes)
}

{
  const stripGeo = new THREE.BoxGeometry(0.1, 3, 0.1)
  const stripMat = new THREE.MeshBasicMaterial({ color: '#2e7bff' })
  for (const rp of rackPos) {
    const strip = new THREE.Mesh(stripGeo, stripMat)
    strip.position.set(rp.x * 0.97, 1.9, rp.z * 0.97)
    scene.add(strip)
  }
}

const backdropMat = new THREE.MeshStandardMaterial({ color: '#171c26', roughness: 0.95, metalness: 0 })
function addBackdrop(x: number, z: number, w: number, d: number): void {
  const wall = new THREE.Mesh(unitBox, backdropMat)
  wall.scale.set(w, 7.5, d)
  wall.position.set(x, 3.75, z)
  wall.receiveShadow = true
  scene.add(wall)
}
addBackdrop(0, CFG.arenaHalfZ + 5.4, 46, 0.6)
addBackdrop(0, -(CFG.arenaHalfZ + 5.4), 46, 0.6)
addBackdrop(CFG.arenaHalfX + 4.9, 0, 0.6, 38)
addBackdrop(-(CFG.arenaHalfX + 4.9), 0, 0.6, 38)

const pillarMat = new THREE.MeshStandardMaterial({ color: '#454b57', roughness: 0.9, metalness: 0.05 })
for (const px of [CFG.arenaHalfX + 3, -(CFG.arenaHalfX + 3)]) {
  for (const pz of [CFG.arenaHalfZ + 1.5, -(CFG.arenaHalfZ + 1.5)]) {
    const pillar = new THREE.Mesh(unitBox, pillarMat)
    pillar.scale.set(1.2, 9, 1.2)
    pillar.position.set(px, 4.5, pz)
    pillar.castShadow = true
    pillar.receiveShadow = true
    scene.add(pillar)
  }
}

const beamMat = new THREE.MeshStandardMaterial({ color: '#1c212b', roughness: 0.85, metalness: 0.3 })
for (const bz of [CFG.arenaHalfZ + 1.5, -(CFG.arenaHalfZ + 1.5)]) {
  const beam = new THREE.Mesh(unitBox, beamMat)
  beam.scale.set(37, 0.55, 0.8)
  beam.position.set(0, 8.9, bz)
  beam.castShadow = true
  scene.add(beam)
}
for (const bx of [-14, -7, 0, 7, 14]) {
  const beam = new THREE.Mesh(unitBox, beamMat)
  beam.scale.set(0.7, 0.5, 27.6)
  beam.position.set(bx, 8.9, 0)
  beam.castShadow = true
  scene.add(beam)
}

const lampHeadMat = new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.6, metalness: 0.4 })
const lampBulbMat = new THREE.MeshStandardMaterial({
  color: '#ffdca8',
  emissive: '#ffd9a0',
  emissiveIntensity: 2
})
const lampHeadGeo = new THREE.CylinderGeometry(0.32, 0.44, 0.24, 12)
const lampBulbGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.05, 12)
const litSpots: Array<[number, number]> = [[-7, -6.5], [0, 6.5], [7, -6.5]]
for (const lx of [-7, 0, 7]) {
  for (const lz of [-6.5, 6.5]) {
    const cable = new THREE.Mesh(unitBox, beamMat)
    cable.scale.set(0.06, 1.15, 0.06)
    cable.position.set(lx, 8.05, lz)
    scene.add(cable)
    const head = new THREE.Mesh(lampHeadGeo, lampHeadMat)
    head.position.set(lx, 7.42, lz)
    scene.add(head)
    const bulb = new THREE.Mesh(lampBulbGeo, lampBulbMat)
    bulb.position.set(lx, 7.28, lz)
    scene.add(bulb)
    if (litSpots.some(([sx, sz]) => sx === lx && sz === lz)) {
      const warm = new THREE.PointLight('#ffd9a0', 70, 18, 2)
      warm.position.set(lx, 7.0, lz)
      scene.add(warm)
    }
  }
}

const palletMat = new THREE.MeshStandardMaterial({ color: '#6b5138', roughness: 0.95 })
const crateMat = new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.92, metalness: 0 })
const palletSpots: Array<[number, number, number]> = [
  [-12.5, 15.9, 0.1],
  [-5.2, 15.9, -0.15],
  [5.2, 15.9, 0.2],
  [12.5, 15.9, -0.1],
  [15.9, -10.2, Math.PI / 2],
  [15.9, 10.2, Math.PI / 2 + 0.1]
]
for (const [px, pz, ry] of palletSpots) {
  const pallet = new THREE.Mesh(unitBox, palletMat)
  pallet.scale.set(1.6, 0.14, 1.6)
  pallet.position.set(px, 0.07, pz)
  pallet.rotation.y = ry
  pallet.castShadow = true
  pallet.receiveShadow = true
  scene.add(pallet)
  const crate = new THREE.Mesh(unitBox, crateMat)
  crate.scale.set(0.9, 0.6, 0.9)
  crate.position.set(px + 0.15, 0.44, pz - 0.1)
  crate.rotation.y = ry + 0.2
  crate.castShadow = true
  crate.receiveShadow = true
  scene.add(crate)
}

const seamMat = new THREE.MeshStandardMaterial({ color: '#1e222b', roughness: 1, metalness: 0 })
for (const sz of [-6, 0, 6]) {
  const seam = new THREE.Mesh(unitBox, seamMat)
  seam.scale.set(28, 0.012, 0.12)
  seam.position.set(0, 0.03, sz)
  scene.add(seam)
}
for (const sx of [-7, 7]) {
  const seam = new THREE.Mesh(unitBox, seamMat)
  seam.scale.set(0.12, 0.012, 24)
  seam.position.set(sx, 0.03, 0)
  scene.add(seam)
}

export function updateAmbience(dt: number): void {
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3 + 1] += dustVel[i] * dt
    if (dustPos[i * 3 + 1] > 6) dustPos[i * 3 + 1] = 0.3
  }
  dustAttr.needsUpdate = true
} 