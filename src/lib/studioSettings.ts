/** Настройки студии: часы работы, шаг слотов, витрина (localStorage + опционально PB) */

export type GalleryCard = {
  id: string
  title: string
  image: string
  /** масштаб 1–3 */
  scale?: number
  /** сдвиг кадра, px */
  x?: number
  y?: number
  /** @deprecated */
  position?: string
}

export type StudioSettings = {
  workStart: number // час 0-23
  workEnd: number
  slotStepMinutes: number
  boxesCount: number
  heroScale: number
  heroX: number
  heroY: number
  /** @deprecated */
  heroPosition?: string
  gallery: GalleryCard[]
}

const KEY = 'neo-studio-settings'

export const DEFAULT_SETTINGS: StudioSettings = {
  workStart: 9,
  workEnd: 17,
  slotStepMinutes: 60,
  boxesCount: 2,
  heroScale: 1,
  heroX: 0,
  heroY: 0,
  gallery: [
    {
      id: 'g1',
      title: 'Детали кузова',
      image: '/images/gallery-1.jpg',
      scale: 1,
      x: 0,
      y: 0,
    },
    {
      id: 'g2',
      title: 'Капот и оптика — пример',
      image: '/images/gallery-2.jpg',
      scale: 1,
      x: 0,
      y: 0,
    },
    {
      id: 'g3',
      title: 'Общий вид — пример',
      image: '/images/gallery-3.jpg',
      scale: 1,
      x: 0,
      y: 0,
    },
  ],
}

export function loadSettings(): StudioSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS, gallery: [...DEFAULT_SETTINGS.gallery] }
    const parsed = JSON.parse(raw) as Partial<StudioSettings>
    return {
      workStart: clampHour(parsed.workStart ?? DEFAULT_SETTINGS.workStart),
      workEnd: clampHour(parsed.workEnd ?? DEFAULT_SETTINGS.workEnd),
      slotStepMinutes: Math.max(15, Math.min(180, parsed.slotStepMinutes ?? 60)),
      boxesCount: Math.max(1, Math.min(20, parsed.boxesCount ?? 2)),
      heroScale: Math.max(1, Math.min(3, Number(parsed.heroScale) || 1)),
      heroX: Number(parsed.heroX) || 0,
      heroY: Number(parsed.heroY) || 0,
      gallery:
        Array.isArray(parsed.gallery) && parsed.gallery.length
          ? parsed.gallery
          : [...DEFAULT_SETTINGS.gallery],
    }
  } catch {
    return { ...DEFAULT_SETTINGS, gallery: [...DEFAULT_SETTINGS.gallery] }
  }
}

export function saveSettings(s: StudioSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function clampHour(h: number) {
  const n = Math.floor(Number(h) || 0)
  return Math.max(0, Math.min(23, n))
}

export function formatHourRange(start: number, end: number) {
  const f = (h: number) => `${String(h).padStart(2, '0')}:00`
  return `${f(start)}–${f(end)}`
}
