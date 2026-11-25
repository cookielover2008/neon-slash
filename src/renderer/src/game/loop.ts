import { CFG } from './config'
import { game, hero, heroes, keys, moveInput, player, activeHeroIndex } from './state'
import { composer, updateAmbience } from './world'
import { updateCrosshair, updateHpBar } from './hud'
import { cands } from './loader'
import { play, playLoco } from './anims'
import { loadHero } from './assets'
import { burst, updateChargeVisual, updateCombatFx, updateSparks } from './vfx'
import { updateHair } from './hair'
import { doHit, finishAttack } from './hero1'
import { respawn, spawnDrone, spawnWave, updateDrones } from './drones'
import { updateMedkits } from './medkits'
import { updateCamera } from './cameraRig'
import { updateSwapRing } from './swap'
import { playTone } from './audio'
import './input'
import { tryShoot, updateShootingFx } from './hero2'

let last = performance.now()

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, CFG.maxDt)
  last = now

  const wdt = game.hitStopT > 0 ? dt * CFG.hitStopScale : dt
  if (game.hitStopT > 0) game.hitStopT = Math.max(0, game.hitStopT - dt)

  if (player.state === 'dead') {
    player.deathT -= dt
    if (player.deathT <= 0) respawn()
  }

  const boundX = CFG.arenaHalfX - 0.5
  const boundZ = CFG.arenaHalfZ - 0.5
  const inp = moveInput()
  const moving = player.state === 'loco' && (inp.x !== 0 || inp.z !== 0)
  if (moving) {
    const len = Math.hypot(inp.x, inp.z)
    const spd = keys['ShiftLeft'] ? CFG.sprintSpeed : CFG.playerSpeed
    player.x += (inp.x / len) * spd * wdt
    player.z += (inp.z / len) * spd * wdt
    player.facing = Math.atan2(inp.x, inp.z)
  }
  const aimingNow = player.aiming && activeHeroIndex() === 1
  if (aimingNow) player.facing = player.yaw + Math.PI
  if (activeHeroIndex() === 1 && player.attackHeld) tryShoot()
  if (player.state === 'dodge') {
    const t0 = 1 - Math.max(player.dodgeT, 0) / CFG.dodgeTime
    player.dodgeT -= wdt
    const t1 = 1 - Math.max(player.dodgeT, 0) / CFG.dodgeTime
    const ease = (t: number) => 1 - (1 - t) * (1 - t)
    const step = CFG.dodgeDist * (ease(t1) - ease(t0))
    player.x += player.dodgeDir.x * step
    player.z += player.dodgeDir.z * step
    if (player.dodgeT <= 0) {
      player.state = 'loco'
      playLoco()
    }
  }

  player.x = Math.max(-boundX, Math.min(boundX, player.x))
  player.z = Math.max(-boundZ, Math.min(boundZ, player.z))

  if (moving && player.state === 'loco') {
    player.stepT -= wdt
    if (player.stepT <= 0) {
      player.stepT = 0.16
      burst(player.x, 0.15, player.z, 3, 0.8, 0.5, 0.35, 0.7, 0.85, 2)
    }
  }

  if (player.state === 'loco') playLoco()

  const h = hero()
  if (h.mixer) h.mixer.update(wdt)

  if (h.root) {
    player.rot = lerpAngle(player.rot, player.facing, 1 - Math.exp(-18 * wdt))
    h.root.position.set(player.x, 0, player.z)
    h.root.rotation.y = player.rot + CFG.modelYawOffset
    h.root.updateMatrixWorld(true)
  }

  if (player.swapPopT > 0) {
    player.swapPopT -= dt
    if (h.root) {
      const k = Math.max(player.swapPopT / CFG.swapPop, 0)
      h.root.scale.setScalar(1 - 0.25 * k * k)
    }
  } else if (h.root && h.root.scale.x !== 1) {
    h.root.scale.setScalar(1)
  }

  updateHair(h, wdt)

    if (activeHeroIndex() === 0) {
    if (player.state === 'loco' && player.attackHeld) player.attackHeldT += wdt
    if (player.attackHeld && player.state === 'loco' && player.attackHeldT >= CFG.chargeDelay) {
      player.state = 'charge'
      if (h.clips['charge']) play('charge', 0.2, false)
      burst(player.x, 0.4, player.z, 10, 1.1, 1.6, 1, 0.7, 0.3, -0.6)
      playTone(150, 0.7, 'sine', 0.07, 520)
    }
  }

  updateChargeVisual(now)

  if (player.state === 'attack') {
    if (player.curOneshot) {
      const pr = player.curOneshot.time / player.curOneshot.getClip().duration
      if (!player.attackHitDone && pr >= CFG.hitFrames[Math.min(player.comboIndex, CFG.hitFrames.length - 1)]) {
        player.attackHitDone = true
        doHit(false)
      }
      if (pr >= 1) {
        player.curOneshot = null
        finishAttack()
      }
    } else {
      player.attackT -= wdt
      if (!player.attackHitDone && player.attackT <= CFG.virtualAttackTime * 0.5) {
        player.attackHitDone = true
        doHit(false)
      }
      if (player.attackT <= 0) finishAttack()
    }
  }

  if (player.state === 'release' && player.curOneshot) {
    const pr = player.curOneshot.time / player.curOneshot.getClip().duration
    if (!player.attackHitDone && pr >= CFG.chargeHitFrame) {
      player.attackHitDone = true
      doHit(true)
    }
    if (pr >= 1) {
      player.curOneshot = null
      player.state = 'loco'
      playLoco()
    }
  }

  if (player.chainWindowT > 0) {
    player.chainWindowT -= wdt
    if (player.chainWindowT <= 0 && player.comboIndex > 0) {
      player.comboIndex = 0
      player.comboCd = CFG.comboChainCd
    }
  }

  player.attackCd = Math.max(0, player.attackCd - wdt)
  player.comboCd = Math.max(0, player.comboCd - wdt)
  player.dodgeCdT = Math.max(0, player.dodgeCdT - wdt)
  player.hurtCd = Math.max(0, player.hurtCd - wdt)
  player.swapT = Math.max(0, player.swapT - dt)

  updateCombatFx(wdt, dt)
  updateSwapRing(dt)
  updateCamera(dt)
  updateShootingFx(dt)
  updateCrosshair(dt, aimingNow, moving)
  updateDrones(wdt, now)
  spawnWave(wdt)
  updateMedkits(wdt, now)
  updateSparks(wdt)
  updateAmbience(dt)

  composer.render()
  requestAnimationFrame(frame)
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

loadHero(heroes[0], cands(...CFG.heroFiles.heroA), false)
loadHero(heroes[1], cands(...CFG.heroFiles.heroB), true)

spawnDrone(5, -5)
spawnDrone(-6, -8)
spawnDrone(8, -12)

updateHpBar()
requestAnimationFrame(frame)
