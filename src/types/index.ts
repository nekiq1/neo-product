export interface Studio {
  id: string
  slug: string
  name: string
  address: string | null
  description: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  studio_id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  is_active: boolean
  sort_order: number
  image?: string | null
  badge?: string | null
}

export interface Booking {
  id: string
  studio_id: string
  service_id: string
  customer_name: string
  customer_phone: string
  customer_car?: string | null
  start_at: string
  end_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string | null
  created_at: string
}

export interface TimeSlot {
  time: string
  available: boolean
}

/** Demo Neo Detailing (без привязки к реальным студиям) */
export const DEMO_STUDIO: Studio = {
  id: 'demo-neo',
  slug: 'neo',
  name: 'Neo Detailing',
  address: 'Санкт-Петербург, Литейный пр., 26',
  description: 'Детейлинг, который возвращает кузову глубину, а салону — чистоту',
  phone: '+78120000000',
  is_active: true,
  created_at: new Date().toISOString(),
}

export const DEMO_SERVICES: Service[] = [
  {
    id: 'svc-wash',
    studio_id: 'demo-neo',
    name: 'Комплексная мойка',
    description: 'Кузов, диски, стёкла, сушка. Быстрый свежий вид.',
    price: 3500,
    duration_minutes: 120,
    is_active: true,
    sort_order: 1,
    image: null,
    badge: 'Мойка',
  },
  {
    id: 'svc-interior',
    studio_id: 'demo-neo',
    name: 'Химчистка салона',
    description: 'Глубокая чистка салона, озон, защита материалов.',
    price: 12000,
    duration_minutes: 1440,
    is_active: true,
    sort_order: 2,
    image: '/images/interior.jpg',
    badge: 'Салон',
  },
  {
    id: 'svc-polish',
    studio_id: 'demo-neo',
    name: 'Полировка кузова',
    description: 'Коррекция ЛКП, удаление рисок и голограмм.',
    price: 18000,
    duration_minutes: 1440,
    is_active: true,
    sort_order: 3,
    image: '/images/polishing.jpg',
    badge: 'Кузов',
  },
  {
    id: 'svc-ceramic',
    studio_id: 'demo-neo',
    name: 'Керамическое покрытие',
    description: 'Многослойная керамика. Блеск и гидрофоб надолго.',
    price: 25000,
    duration_minutes: 2880,
    is_active: true,
    sort_order: 4,
    image: '/images/ppf.jpg',
    badge: 'Керамика',
  },
]
