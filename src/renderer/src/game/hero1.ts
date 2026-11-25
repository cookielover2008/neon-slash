import * as THREE from 'three'
import { CFG } from './config'
import { game, hero, hooks, moveInput, player } from './state'
import { burst, shockFx, slashGroup, slashMat } from './vfx'
import { playNoise, playTone } from './audio'
import { showCombo } from './hud'
import { drones, killDrone } from './drones'
import { attackClipFor, comboLength, play, playLoco } from './anims'

const COMBO_COLORS = ['#8ffcff', '#ffd76a', '#ff8de0', '#a5ff8f', '#ffa04d']

export function doHit(charged: boolean): void {
  const range = charged ? CFG.chargeRange : CFG.attackRange
  const dmg = charged ? CFG.chargeDamage : CFG.attackDamage
  const kb = charged ? CFG.chargeKnockback : CFG.attackKnockback
  slashGroup.position.set(player.x, 0.9, player.z)
  slashGroup.rotation.y = player.facing + Math.PI / 2
  slashMat.color.set(charged ? '#ffe9a8' : COMBO_COLORS[player.comboIndex % COMBO_COLORS.length])
  slashGroup.visible = true
  player.slashTimer = CFG.slashLife
  let hitAny = false
  for (let i = drones.length - 1; i >= 0; i--) {
    const d = drones[i]
    const dx = d.group.position.x - player.x
    const dz = d.group.position.z - player.z
    const dist = Math.hypot(dx, dz)
    if (dist < range && dist > 0.001) {
      d.hp -= dmg
      d.group.position.x += (dx / dist) * kb
      d.group.position.z += (dz / dist) * kb
      d.punch = 1
      burst(d.group.position.x, 1.2, d.group.position.z, 9, 2.6, 1.6, 0.62, 0.95, 1, 6)
      hitAny = true
      if (d.hp <= 0) killDrone(i)
    }
  }
  if (hitAny) {
    game.hitStopT = CFG.hitStopTime
    player.shakeAmp = CFG.shakeAmp
    playTone(280, 0.1, 'square', 0.12, 90)
    if (!charged) showCombo(player.comboIndex + 1)
  }
  if (charged) {
    shockFx.mesh.position.set(player.x, 0.45, player.z)
    player.shockT = 0.38
    shockFx.mesh.visible = true
    burst(player.x, 1.1, player.z, 26, 5.5, 2.6, 1, 0.55, 0.18, 7)
    burst(player.x, 1.1, player.z, 10, 3.2, 2.2, 0.55, 0.85, 1, 5)
    player.fovBump = CFG.fovKick
    playNoise(0.35, 0.22, 1600, 90)
  }
}

export function startAttack(): void {
  player.state = 'attack'
  player.attackHitDone = false
  player.comboQueued = false
  player.attackCd = CFG.attackCd
  player.chainWindowT = 0
  playTone(400 + player.comboIndex * 45, 0.08, 'sine', 0.05, 160)
  const name = attackClipFor(player.comboIndex)
  const h = hero()
  if (name && h.mixer) {
    play(name, CFG.attackFade, false)
    player.curOneshot = h.mixer.clipAction(h.clips[name])
  } else {
    player.curOneshot = null
    player.attackT = CFG.virtualAttackTime
  }
}

export function finishAttack(): void {
  const len = comboLength()
  const lastIdx = len > 0 ? len - 1 : 3
  if (player.comboQueued && player.comboIndex < lastIdx && player.comboCd <= 0) {
    player.comboIndex++
    startAttack()
    return
  }
  if (player.comboIndex >= lastIdx) {
    player.comboIndex = 0
    player.comboCd = CFG.comboChainCd
  } else {
    player.chainWindowT = CFG.comboWindow
  }
  player.state = 'loco'
  player.comboQueued = false
  playLoco()
}

export function releaseCharge(): void {
  player.state = 'release'
  player.attackHitDone = false
  const h = hero()
  const name = h.clips['charge_release']
    ? 'charge_release'
    : h.clips['attack1']
      ? 'attack1'
      : h.clips['attack']
        ? 'attack'
        : null
  playTone(90, 0.3, 'sawtooth', 0.14, 45)
  if (name && h.mixer) {
    play(name, 0.05, false)
    player.curOneshot = h.mixer.clipAction(h.clips[name])
  } else {
    player.curOneshot = null
    doHit(true)
    player.state = 'loco'
    playLoco()
  }
}

export function tryAttack(): void {
  if (player.state === 'attack') {
    player.comboQueued = true
    return
  }
  if (player.state !== 'loco') return
  if (player.attackCd > 0 || player.comboCd > 0) return
  player.attackHeldT = 0
  startAttack()
}

export function tryDodge(): void {
  if (player.dodgeCdT > 0) return
  if (player.state !== 'loco' && player.state !== 'attack') return
  const inp = moveInput()
  let dx = inp.x
  let dz = inp.z
  const len = Math.hypot(dx, dz)
  if (len < 0.001) {
    dx = -Math.sin(player.yaw)
    dz = -Math.cos(player.yaw)
  } else {
    dx /= len
    dz /= len
  }
  player.dodgeDir.x = dx
  player.dodgeDir.z = dz
  player.facing = Math.atan2(dx, dz)
  player.dodgeT = CFG.dodgeTime
  player.dodgeCdT = CFG.dodgeCd
  player.comboQueued = false
  player.state = 'dodge'
  const h = hero()
  if (h.clips['dodge'] && h.mixer) {
    play('dodge', 0.06, false)
    player.curOneshot = h.mixer.clipAction(h.clips['dodge'])
  } else {
    player.curOneshot = null
    h.currentAction?.fadeOut(0.1)
    h.currentAction = null
  }
  burst(player.x, 0.5, player.z, 8, 1.4, 0.7, 0.45, 0.9, 1, 1.5)
  playTone(600, 0.12, 'sine', 0.08, 900)
}

function onFinished(action: THREE.AnimationAction): void {
  if (action !== player.curOneshot) return
  player.curOneshot = null
  if (player.state === 'attack') finishAttack()
  else if (player.state === 'release') {
    player.state = 'loco'
    playLoco()
  }
}

hooks.onOneshotFinished = onFinished
