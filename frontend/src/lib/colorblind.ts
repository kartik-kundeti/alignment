/** Colour-blind friendly mode (DECISIONS.md G2 row 16).
 * One switch for the whole site: it puts the class "cb" on <html>, which swaps the red and green
 * colour settings in index.css. Charts draw their own colours, so they read the same switch here. */
import { useSyncExternalStore } from 'react'

const KEY = 'commsalign-colorblind'
const listeners = new Set<() => void>()

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

let on = read()
document.documentElement.classList.toggle('cb', on)

export function setColorBlind(value: boolean) {
  on = value
  document.documentElement.classList.toggle('cb', on)
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* storage blocked: the choice lasts until reload */ }
  listeners.forEach((l) => l())
}

export function useColorBlind(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, () => on)
}

/** Standard colours, and the Okabe and Ito (2008) colour-blind-safe swap: blue for good, vermillion for gaps. */
const STANDARD = { red: '#C62828', green: '#198754', redRgb: '198,40,40', greenRgb: '25,135,84' }
const SAFE = { red: '#D55E00', green: '#0072B2', redRgb: '213,94,0', greenRgb: '0,114,178' }
export type Palette = typeof STANDARD

export function usePalette(): Palette {
  return useColorBlind() ? SAFE : STANDARD
}
