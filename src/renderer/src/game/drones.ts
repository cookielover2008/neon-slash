import * as THREE from 'three'
import { CFG } from './config'
import { game, hero, player } from './state'
import { scene } from './world'
import { burst } from './vfx'
import { playNoise, playTone } from './audio'
import { deathOverlay, flashVig, hurtVig, hudKills, updateHpBar } from './hud'
import { playLoco } from './anims'

const droneCoreGeo = new THREE.IcosahedronGeometry(0.17, 0)
const droneShellGeo = new THREE.IcosahedronGeometry(0.44, 0)
const droneCoreMat = new THREE.MeshStandardMaterial({
  color: 0xff2244,
  emissive: 0xff2244,
  emissiveIntensity: 2.2
})
const droneShellMat = new THREE.MeshBasicMaterial({
  color: 0xff5577,
  wireframe: true,
  transparent: true,
  opacity: 0.65
})

export type Drone = {
  group: THREE.Group
  core: THREE.Mesh
  shell: THREE.Mesh
  hp: number
  punch: number
}

export const drones: Drone[] = []
const dronePool: THREE.Group[] = []

export function spawnDrone(x: number, z: number): void {
  x = Math.max(-CFG.arenaHalfX + 1, Math.min(CFG.arenaHalfX - 1, x))
  z = Math.max(-CFG.arenaHalfZ + 1, Math.min(CFG.arenaHalfZ - 1, z))
  const group =
    dronePool.pop() ??
    (() => {
      const core = new THREE.Mesh(droneCoreGeo, droneCoreMat)
      core.castShadow = true
      const shell = new THREE.Mesh(droneShellGeo, droneShellMat)
      const g = new THREE.Group()
      g.add(core, shell)
      scene.add(g)
      return g
    })()
  group.position.set(x, 1.2, z)
  group.visible = true
  drones.push({
    group,
    core: group.children[0] as THREE.Mesh,
    shell: group.children[1] as THREE.Mesh,
    hp: CFG.droneHp,
    punch: 0
  })
}

export function killDrone(index: number): void {
  const d = drones[index]
  burst(d.group.position.x, d.group.position.y, d.group.position.z, 24, 5, 3, 1, 0.45, 0.15, 7)
  burst(d.group.position.x, d.group.position.y, d.group.position.z, 8, 3, 2.2, 0.5, 0.9, 1, 5)
  playNoise(0.28, 0.16, 1100, 130)
  d.group.visible = false
  dronePool.push(d.group)
  drones.splice(index, 1)
  game.kills++
  hudKills.textContent = 'УБИТО: ' + game.kills
  player.shakeAmp = Math.max(player.shakeAmp, 0.045)
  playTone(880, 0.15, 'triangle', 0.1, 220)
}

export function updateDrones(dt: number, now: number): void {
  droneCoreMat.emissiveIntensity = 2 + Math.sin(now / 180) * 0.7
  for (const d of drones) {
    d.core.rotation.y += 2.5 * dt
    d.shell.rotation.y -= 1.4 * dt
    d.shell.rotation.x += 0.8 * dt
    d.punch *= Math.exp(-9 * dt)
    d.group.scale.setScalar(1 + d.punch * 0.5)
    d.group.position.y = 1.2 + Math.sin(now / 300 + d.group.position.x) * 0.15
    if (player.state === 'dead') continue
    const dx = player.x - d.group.position.x
    const dz = player.z - d.group.position.z
    const dist = Math.hypot(dx, dz)
    if (dist > CFG.droneTouchRange) {
      const spd = CFG.droneSpeed * dt
      d.group.position.x += (dx / dist) * spd
      d.group.position.z += (dz / dist) * spd
        } else {
      hurtPlayer()
    }
  }
  for (let i = 0; i < drones.length; i++) {
    for (let j = i + 1; j < drones.length; j++) {
      const a = drones[i].group.position
      const b = drones[j].group.position
      const dx = b.x - a.x
      const dz = b.z - a.z
      const d = Math.hypot(dx, dz)
      if (d > 0.0001) {
        if (d < CFG.droneSep) {
          const push = (CFG.droneSep - d) * 0.5
          const nx = dx / d
          const nz = dz / d
          a.x -= nx * push
          a.z -= nz * push
          b.x += nx * push
          b.z += nz * push
        }
      } else {
        a.x -= 0.25
        b.x += 0.25
      }
    }
  }
  for (const d of drones) {
    d.group.position.x = Math.max(
      -CFG.arenaHalfX + 0.5,
      Math.min(CFG.arenaHalfX - 0.5, d.group.position.x)
    )
    d.group.position.z = Math.max(
      -CFG.arenaHalfZ + 0.5,
      Math.min(CFG.arenaHalfZ - 0.5, d.group.position.z)
    )
  }
}

export function hurtPlayer(): void {
  if (player.state === 'dead') return
  if (player.hurtCd > 0) return
  if (player.dodgeT > 0) return
  if (player.swapT > 0) return
  player.hurtCd = CFG.hurtCooldown
  player.hp -= CFG.droneDamage
  updateHpBar()
  flashVig(hurtVig, 0.9)
  burst(player.x, 1.1, player.z, 6, 1.6, 1, 1, 0.3, 0.25, 4)
  playTone(140, 0.25, 'sawtooth', 0.12, 50)
  if (player.hp <= 0) die()
}

function die(): void {
  player.state = 'dead'
  player.deathT = CFG.respawnTime
  deathOverlay.style.opacity = '0.85'
  playTone(200, 0.5, 'sawtooth', 0.15, 40)
}

export function respawn(): void {
  player.x = 0
  player.z = 0
  player.hp = 100
  player.state = 'loco'
  player.comboIndex = 0
  player.comboQueued = false
  player.chainWindowT = 0
  player.attackHeldT = 0
  player.curOneshot = null
  hero().hairReset = true
  deathOverlay.style.opacity = '0'
  updateHpBar()
  playLoco(0.1)
}

export function spawnWave(dt: number): void {
  game.spawnTimer -= dt
  if (game.spawnTimer > 0) return
  if (player.state === 'dead') return
  const maxAlive = CFG.baseAlive + Math.floor(game.kills / CFG.alivePerKills)
  if (drones.length >= maxAlive) return
  const ang = Math.random() * Math.PI * 2
  spawnDrone(player.x + Math.cos(ang) * CFG.spawnRadius, player.z + Math.sin(ang) * CFG.spawnRadius)
  game.spawnTimer = Math.max(
    CFG.spawnIntervalMin,
    CFG.spawnIntervalMax - game.kills * CFG.spawnAccelPerKill
  )
}
