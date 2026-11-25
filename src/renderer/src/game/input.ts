import { keys, player, activeHeroIndex } from './state'
import { CFG } from './config'
import { cameraState } from './cameraRig'
import { camera, composer, renderer } from './world'
import { initAudio } from './audio'
import { releaseCharge, tryAttack, tryDodge } from './hero1'
import { tryShoot } from './hero2'
import { trySwapTo } from './swap'

function lockMouse(): void {
  document.body.requestPointerLock()
}

addEventListener('keydown', (e) => {
  keys[e.code] = true
  if (e.code === 'Space') e.preventDefault()
  if (!e.repeat) {
        if (e.code === 'Space') {
      player.attackHeld = true
      player.attackHeldT = 0
      if (activeHeroIndex() === 1) tryShoot()
      else tryAttack()
    }
    if (e.code === 'KeyQ') tryDodge()
    if (CFG.heroKey1.indexOf(e.code) >= 0) trySwapTo(0)
    else if (CFG.heroKey2.indexOf(e.code) >= 0) trySwapTo(1)
  }
  if (!document.pointerLockElement) {
    initAudio()
    lockMouse()
  }
})

addEventListener('keyup', (e) => {
  keys[e.code] = false
  if (e.code === 'Space') {
    player.attackHeld = false
    if (player.state === 'charge') releaseCharge()
  }
})

addEventListener('mousedown', (e) => {
  if (!document.pointerLockElement) {
    initAudio()
    lockMouse()
    return
  }
  if (e.button === 0) {
    player.attackHeld = true
    player.attackHeldT = 0
    if (activeHeroIndex() === 1) tryShoot()
    else tryAttack()
  } else if (e.button === 2) {
    if (activeHeroIndex() === 1) player.aiming = true
    else tryDodge()
  }
})

addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    player.aiming = false
    return
  }
  if (e.button !== 0) return
  player.attackHeld = false
  if (player.state === 'charge') releaseCharge()
})

addEventListener('contextmenu', (e) => e.preventDefault())

addEventListener('mousemove', (e) => {
  if (!document.pointerLockElement) return
  player.yaw -= e.movementX * 0.0024
  player.pitch = Math.min(1.2, Math.max(0.05, player.pitch + e.movementY * 0.0024))
})

addEventListener('wheel', (e) => {
  e.preventDefault()
  cameraState.distTarget = Math.min(
    CFG.camDistMax,
    Math.max(CFG.camDistMin, cameraState.distTarget * Math.exp(e.deltaY * CFG.camZoomSpeed))
  )
}, { passive: false })

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
}) 