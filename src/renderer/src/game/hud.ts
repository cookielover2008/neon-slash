import { hero, player } from './state'

const gameCss = document.createElement('style')
gameCss.textContent =
  '@keyframes comboPop {' +
  '  0% { transform: translate(-50%, 0) scale(1.7); opacity: 1; }' +
  '  100% { transform: translate(-50%, -46px) scale(1); opacity: 0; }' +
  '}' +
  '.comboEl.pop { animation: comboPop 0.55s ease-out forwards; }'
document.head.appendChild(gameCss)

export const hudKills = document.createElement('div')
hudKills.style.cssText =
  'position:fixed;top:10px;left:50%;transform:translateX(-50%);color:#7df3ff;' +
  'font:700 22px monospace;letter-spacing:3px;text-shadow:0 0 14px rgba(80,220,255,.8);' +
  'pointer-events:none'
hudKills.textContent = 'УБИТО: 0'
document.body.appendChild(hudKills)

export const heroLabel = document.createElement('div')
heroLabel.style.cssText =
  'position:fixed;top:12px;left:14px;color:#7df3ff;font:700 12px monospace;letter-spacing:2px;' +
  'pointer-events:none;text-shadow:0 0 8px rgba(120,220,255,.6)'
heroLabel.textContent = 'ГЕРОЙ 1'
document.body.appendChild(heroLabel)

const hpWrap = document.createElement('div')
hpWrap.style.cssText =
  'position:fixed;top:34px;left:14px;width:220px;height:14px;background:rgba(8,18,34,.75);' +
  'border:1px solid rgba(120,230,255,.55);pointer-events:none'
const hpGhost = document.createElement('div')
hpGhost.style.cssText =
  'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,.5);' +
  'transition:width 0.5s ease 0.18s'
const hpFill = document.createElement('div')
hpFill.style.cssText =
  'position:absolute;top:0;left:0;width:100%;height:100%;' +
  'background:linear-gradient(90deg,#2fd4ff,#7dffcf);box-shadow:0 0 10px rgba(60,220,255,.6)'
hpWrap.appendChild(hpGhost)
hpWrap.appendChild(hpFill)
document.body.appendChild(hpWrap)

export const chargeWrap = document.createElement('div')
chargeWrap.style.cssText =
  'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);width:200px;height:8px;' +
  'background:rgba(8,18,34,.75);border:1px solid rgba(255,190,90,.5);display:none;pointer-events:none'
export const chargeFill = document.createElement('div')
chargeFill.style.cssText = 'width:0%;height:100%;background:linear-gradient(90deg,#ffcf6a,#ff7a3d)'
chargeWrap.appendChild(chargeFill)
document.body.appendChild(chargeWrap)

const comboEl = document.createElement('div')
comboEl.className = 'comboEl'
comboEl.style.cssText =
  'position:fixed;left:50%;top:26%;transform:translate(-50%,0);' +
  'color:#ffe27a;font:800 38px monospace;letter-spacing:4px;' +
  'text-shadow:0 0 18px rgba(255,190,60,.9),0 2px 0 rgba(0,0,0,.4);opacity:0;pointer-events:none'
document.body.appendChild(comboEl)

export function showCombo(n: number): void {
  comboEl.textContent = 'x' + n + ' СЕРИЯ'
  comboEl.classList.remove('pop')
  void comboEl.offsetWidth
  comboEl.classList.add('pop')
}

const crossWrap = document.createElement('div')
crossWrap.style.cssText =
  'position:fixed;left:50%;top:50%;width:0;height:0;pointer-events:none;opacity:0;' +
  'transition:opacity 0.15s'
const crossDot = document.createElement('div')
crossDot.style.cssText =
  'position:absolute;left:-2px;top:-2px;width:4px;height:4px;border-radius:50%;' +
  'background:#e8fbff;box-shadow:0 0 6px rgba(120,230,255,.9)'
crossWrap.appendChild(crossDot)
const tickDefs: Array<[string, string]> = [
  ['left:-1px;width:2px;height:10px;', 'translateY(calc(-1 * var(--gap) - 100%))'],
  ['left:-1px;width:2px;height:10px;', 'translateY(var(--gap))'],
  ['top:-1px;height:2px;width:10px;', 'translateX(calc(-1 * var(--gap) - 100%))'],
  ['top:-1px;height:2px;width:10px;', 'translateX(var(--gap))']
]
for (const [pos, tr] of tickDefs) {
  const t = document.createElement('div')
  t.style.cssText =
    'position:absolute;background:#e8fbff;box-shadow:0 0 4px rgba(120,230,255,.9);' +
    pos + 'transform:' + tr + ';transition:transform 0.07s linear'
  crossWrap.appendChild(t)
}
crossWrap.style.setProperty('--gap', '4px')
document.body.appendChild(crossWrap)

let crossGap = 4
export function updateCrosshair(dt: number, aiming: boolean, moving: boolean): void {
  const want = aiming || player.fireFlash > 0
  const gap = 4 + (moving ? 5 : 0) + (player.fireFlash > 0 ? 8 : 0)
  crossGap += (gap - crossGap) * (1 - Math.exp(-14 * dt))
  crossWrap.style.setProperty('--gap', crossGap.toFixed(1) + 'px')
  crossWrap.style.opacity = want ? '1' : '0'
}

export const hurtVig = document.createElement('div')
hurtVig.style.cssText =
  'position:fixed;inset:0;pointer-events:none;opacity:0;' +
  'background:radial-gradient(ellipse at center, transparent 52%, rgba(255,40,60,0.55) 100%)'
document.body.appendChild(hurtVig)

export const healVig = document.createElement('div')
healVig.style.cssText =
  'position:fixed;inset:0;pointer-events:none;opacity:0;' +
  'background:radial-gradient(ellipse at center, transparent 58%, rgba(60,255,140,0.4) 100%)'
document.body.appendChild(healVig)

export const swapVig = document.createElement('div')
swapVig.style.cssText =
  'position:fixed;inset:0;pointer-events:none;opacity:0;' +
  'background:radial-gradient(ellipse at center, rgba(180,240,255,0.28) 30%, transparent 78%)'
document.body.appendChild(swapVig)

export function flashVig(el: HTMLElement, peak: number): void {
  el.style.transition = 'none'
  el.style.opacity = String(peak)
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.55s'
    el.style.opacity = '0'
  })
}

export const deathOverlay = document.createElement('div')
deathOverlay.style.cssText =
  'position:fixed;inset:0;opacity:0;pointer-events:none;transition:opacity 0.35s;' +
  'background:radial-gradient(ellipse at center, rgba(0,0,0,.88), rgba(0,0,0,.97))'
deathOverlay.innerHTML =
  '<div style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);color:#ff5570;' +
  'font:700 24px monospace;letter-spacing:6px;text-shadow:0 0 16px rgba(255,60,90,.8)">СВЕТ ПОГАС</div>'
document.body.appendChild(deathOverlay)

const hint = document.createElement('div')
hint.style.cssText =
  'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);color:rgba(160,220,255,.75);' +
  'font:600 11px monospace;letter-spacing:1px;pointer-events:none;transition:opacity 1.5s;' +
  'text-align:center;white-space:nowrap'
hint.innerHTML =
  'WASD — движение · SHIFT — спринт · ЛКМ/ПРОБЕЛ — атака (удерж. — зарядка) · ПКМ/Q — рывок<br>' +
  '1 и 2 — выбор героя · КОЛЕСИКО — приближение камеры'
document.body.appendChild(hint)
setTimeout(() => (hint.style.opacity = '0'), 11000)

export const loading = document.createElement('div')
loading.style.cssText =
  'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);color:#7df3ff;' +
  'font:700 18px monospace;letter-spacing:4px;text-shadow:0 0 12px #4fe6ff;pointer-events:none'
loading.textContent = 'ЗАГРУЗКА МОДЕЛИ…'
document.body.appendChild(loading)

export function updateHpBar(): void {
  const w = Math.max(player.hp, 0) + '%'
  hpFill.style.width = w
  hpGhost.style.width = w
  hpFill.style.background =
    player.hp > 30 ? hero().grad : 'linear-gradient(90deg,#ff3355,#ff7a4d)'
} 