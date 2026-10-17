// Локальное хранилище записей (используется только если PocketBase недоступен)

export type LocalBooking = {
  id: string
  customer_name: string
  customer_phone: string
  customer_car?: string | null
  service_name?: string | null
  service_price?: number | null
  start_at: string
  end_at?: string | null
  status: string
  notes?: string | null
  created_at: string
  studio_slug?: string | null
}

const KEY = 'pspbrf-all-bookings'

export function loadLocalBookings(): LocalBooking[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as LocalBooking[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveLocalBookings(list: LocalBooking[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export function addLocalBooking(
  b: Omit<LocalBooking, 'id' | 'created_at'> & { id?: string }
) {
  const list = loadLocalBookings()
  const id = b.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const without = list.filter((x) => x.id !== id)
  const row: LocalBooking = {
    ...b,
    id,
    created_at: new Date().toISOString(),
  }
  without.unshift(row)
  saveLocalBookings(without)
  return row
}

export function updateLocalBooking(id: string, patch: Partial<LocalBooking>) {
  const list = loadLocalBookings().map((b) =>
    b.id === id ? { ...b, ...patch } : b
  )
  saveLocalBookings(list)
  return list
}

export function removeLocalBooking(id: string) {
  const list = loadLocalBookings().filter((b) => b.id !== id)
  saveLocalBookings(list)
  return list
}
