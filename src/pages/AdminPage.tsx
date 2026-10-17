// Админ-панель в стиле «Расписание» (день / неделя, счётчики, записи)
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  supabase,
  hasSupabase,
  withTimeout,
  adminLogin,
  adminLogout,
  isAdminAuthed,
} from '../lib/pb'
import { loadLocalBookings, updateLocalBooking } from '../lib/localBookings'
import {
  format,
  addDays,
  subDays,
  startOfDay,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Lock,
  Plus,
  Clock,
  MapPin,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react'
import {
  loadSettings,
  saveSettings,
  formatHourRange,
  type StudioSettings,
  type GalleryCard,
} from '../lib/studioSettings'
import { ImageCropEditor } from '../components/ImageCropEditor'
import { optimizeImageFile } from '../lib/optimizeImage'

type BookingRow = {
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

const ATTEMPTS_KEY = 'pspbrf-admin-attempts'
const LOCK_KEY = 'pspbrf-admin-lock'
const MAX_ATTEMPTS = 5
const LOCK_MS = 5 * 60 * 1000
const BLOCK_PHONE = 'block'

function getLockUntil(): number {
  try {
    return Number(sessionStorage.getItem(LOCK_KEY) || 0)
  } catch {
    return 0
  }
}

function getAttempts(): number {
  try {
    return Number(sessionStorage.getItem(ATTEMPTS_KEY) || 0)
  } catch {
    return 0
  }
}

function setAttempts(count: number) {
  try {
    sessionStorage.setItem(ATTEMPTS_KEY, String(count))
  } catch {
    /* ignore */
  }
}

function isBlock(booking: BookingRow): boolean {
  return (
    booking.customer_phone === BLOCK_PHONE ||
    (booking.customer_name || '').includes('Блокировка')
  )
}

const cardStyle: React.CSSProperties = {
  background: '#16161a',
  border: '1px solid #2a2a32',
  borderRadius: 16,
  padding: 14,
}

const pillBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px 12px',
  borderRadius: 12,
  border: 'none',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  background: active ? '#3b82f6' : '#1e1e24',
  color: active ? '#fff' : '#a1a1aa',
})

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockLeft, setLockLeft] = useState(0)

  const [viewMode, setViewMode] = useState<'day' | 'week'>('week')
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [showHours, setShowHours] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [settings, setSettings] = useState<StudioSettings>(() => loadSettings())
  const [hoursSaved, setHoursSaved] = useState(false)

  useEffect(() => {
    if (isAdminAuthed()) setAuthed(true)
  }, [])

  useEffect(() => {
    const tick = () => {
      const until = getLockUntil()
      const remaining = Math.max(0, until - Date.now())
      setLockLeft(remaining)
      if (remaining === 0 && until > 0) {
        try {
          sessionStorage.removeItem(LOCK_KEY)
          sessionStorage.setItem(ATTEMPTS_KEY, '0')
        } catch {
          /* ignore */
        }
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (hasSupabase) {
        try {
          const result = await withTimeout(
            supabase
              .from('bookings')
              .select(
                'id, customer_name, customer_phone, customer_car, service_name, service_price, start_at, end_at, status, notes, created_at, studio_slug',
              )
              .order('start_at', { ascending: true })
              .limit(300),
            10000,
          )
          const resultError = (result as { error?: { message?: string } | null })
            ?.error
          if (resultError) {
            throw new Error(resultError.message || 'Ошибка PocketBase')
          }
          const remote =
            (result as { data?: BookingRow[] | null })?.data || []
          setBookings(remote)
          return
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          setError(`PocketBase: ${message}`)
        }
      }
      const local = loadLocalBookings() as BookingRow[]
      local.sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      )
      setBookings(local)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      setBookings(loadLocalBookings() as BookingRow[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) void load()
  }, [authed, load])

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const lockUntil = getLockUntil()
    if (Date.now() < lockUntil) {
      const seconds = Math.ceil((lockUntil - Date.now()) / 1000)
      setLockLeft(lockUntil - Date.now())
      setError(`Слишком много попыток. Подождите ${seconds} сек.`)
      return
    }
    if (!hasSupabase) {
      setError('PocketBase не настроен (VITE_PB_URL).')
      return
    }
    try {
      await adminLogin(login.trim(), password)
      try {
        sessionStorage.setItem(ATTEMPTS_KEY, '0')
        sessionStorage.removeItem(LOCK_KEY)
      } catch {
        /* ignore */
      }
      setAuthed(true)
      setPassword('')
      setLogin('')
      setError(null)
    } catch (err) {
      const attempts = getAttempts() + 1
      setAttempts(attempts)
      if (attempts >= MAX_ATTEMPTS) {
        try {
          sessionStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MS))
        } catch {
          /* ignore */
        }
        setLockLeft(LOCK_MS)
        setError('Неверный логин или пароль. Блокировка на 5 минут.')
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        setError(
          `Неверный email/пароль. Осталось: ${MAX_ATTEMPTS - attempts}. ${msg}`,
        )
      }
    }
  }

  function logout() {
    adminLogout()
    setAuthed(false)
    setBookings([])
    setError(null)
  }

  async function setStatus(id: string, status: string) {
    try {
      if (hasSupabase && !id.startsWith('local-')) {
        const result = await withTimeout(
          supabase.from('bookings').update({ status }).eq('id', id),
          5000,
        )
        const resultError = (result as { error?: { message?: string } | null })
          ?.error
        if (resultError) throw new Error(resultError.message)
      }
      updateLocalBooking(id, { status })
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      )
      setError(null)
    } catch (err) {
      updateLocalBooking(id, { status })
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      )
      setError(
        `Статус локально, PB: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const clients = useMemo(
    () => bookings.filter((b) => !isBlock(b)),
    [bookings],
  )

  const rangeBookings = useMemo(() => {
    if (viewMode === 'day') {
      return clients.filter((b) => isSameDay(parseISO(b.start_at), selectedDate))
    }
    const from = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const to = endOfWeek(selectedDate, { weekStartsOn: 1 })
    return clients.filter((b) => {
      const d = parseISO(b.start_at)
      return isWithinInterval(d, { start: from, end: to })
    })
  }, [clients, selectedDate, viewMode])

  const stats = useMemo(() => {
    const total = rangeBookings.length
    const done = rangeBookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'completed',
    ).length
    const revenue = rangeBookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (Number(b.service_price) || 0), 0)
    return { total, done, revenue }
  }, [rangeBookings])

  const dateLabel =
    viewMode === 'day'
      ? format(selectedDate, 'd MMM yyyy', { locale: ru })
      : `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM', { locale: ru })} – ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: ru })}`

  if (!authed) {
    const locked = lockLeft > 0
    const lockSeconds = Math.ceil(lockLeft / 1000)
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#0a0a0c',
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            ...cardStyle,
            width: '100%',
            maxWidth: 360,
            padding: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(59,130,246,0.15)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Shield size={20} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                Расписание
              </h1>
              <p style={{ fontSize: 12, color: '#71717a' }}>
                Вход · PocketBase users
              </p>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={locked}
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="label">Пароль</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={locked}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>
          )}
          {locked && (
            <p style={{ color: '#71717a', fontSize: 13, marginTop: 8 }}>
              Разблокировка {Math.floor(lockSeconds / 60)}:
              {String(lockSeconds % 60).padStart(2, '0')}
            </p>
          )}
          <button
            type="submit"
            className="btn"
            style={{
              width: '100%',
              marginTop: 18,
              minHeight: 48,
              background: '#3b82f6',
              borderRadius: 14,
            }}
            disabled={locked}
          >
            <Lock size={16} />
            Войти
          </button>
        </form>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0a0a0c',
        paddingBottom: 48,
      }}
      className="fade-in"
    >
      <div className="container" style={{ paddingTop: 12, maxWidth: 420 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 11,
                color: '#fff',
              }}
            >
              AS
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
              Neo
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                ...cardStyle,
                padding: 8,
                cursor: 'pointer',
                background: '#16161a',
              }}
              aria-label="Обновить"
            >
              <RefreshCw size={16} color="#a1a1aa" />
            </button>
            <button
              type="button"
              onClick={logout}
              style={{
                ...cardStyle,
                padding: 8,
                cursor: 'pointer',
                background: '#16161a',
              }}
              aria-label="Выйти"
            >
              <LogOut size={16} color="#a1a1aa" />
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>
              Расписание
            </h1>
            <p style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>
              Neo · демо
            </p>
          </div>
          <Link
            to="/s/neo"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid #2a2a32',
              display: 'grid',
              placeItems: 'center',
              color: '#a1a1aa',
            }}
            title="На сайт"
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: '#71717a',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Дата
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              ...cardStyle,
              padding: '8px 10px',
            }}
          >
            <button
              type="button"
              onClick={() =>
                setSelectedDate((d) =>
                  viewMode === 'day' ? subDays(d, 1) : subDays(d, 7),
                )
              }
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 6,
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 15,
                color: '#fff',
              }}
            >
              {dateLabel}
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedDate((d) =>
                  viewMode === 'day' ? addDays(d, 1) : addDays(d, 7),
                )
              }
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 6,
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            background: '#121216',
            padding: 4,
            borderRadius: 14,
          }}
        >
          <button
            type="button"
            style={pillBtn(viewMode === 'day')}
            onClick={() => setViewMode('day')}
          >
            День
          </button>
          <button
            type="button"
            style={pillBtn(viewMode === 'week')}
            onClick={() => setViewMode('week')}
          >
            Неделя
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            { label: 'Заезды', value: String(stats.total) },
            { label: 'Выполнено', value: String(stats.done) },
            {
              label: 'Получено',
              value: `${stats.revenue.toLocaleString('ru-RU')} ₽`,
            },
          ].map((s) => (
            <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#71717a',
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Link
            to="/s/neo/book"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 12px',
              borderRadius: 14,
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <Plus size={18} />
            Добавить запись
          </Link>
          <button
            type="button"
            onClick={() => { setShowHours((v) => !v); setShowGallery(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 12px',
              borderRadius: 14,
              background: '#16161a',
              border: '1px solid #2a2a32',
              color: '#e4e4e7',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <Clock size={18} />
            Часы работы
          </button>
        </div>


        {showHours && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <strong style={{ color: '#fff', fontSize: 15 }}>Часы работы и слоты</strong>
            <p style={{ fontSize: 12, color: '#71717a', margin: '8px 0 12px' }}>
              Эти часы задают окна записи на сайте
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label className="label">Начало</label>
                <select
                  className="input"
                  value={settings.workStart}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, workStart: Number(e.target.value) }))
                  }
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Конец</label>
                <select
                  className="input"
                  value={settings.workEnd}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, workEnd: Number(e.target.value) }))
                  }
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="label">Шаг слотов (мин)</label>
              <select
                className="input"
                value={settings.slotStepMinutes}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    slotStepMinutes: Number(e.target.value),
                  }))
                }
              >
                {[30, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} мин
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Боксов в работе</label>
              <input
                className="input"
                type="number"
                min={1}
                max={20}
                value={settings.boxesCount}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    boxesCount: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: '100%', background: '#3b82f6', borderRadius: 12 }}
              onClick={() => {
                const next = {
                  ...settings,
                  workStart: Math.min(settings.workStart, settings.workEnd - 1),
                }
                setSettings(next)
                saveSettings(next)
                setHoursSaved(true)
                setTimeout(() => setHoursSaved(false), 2000)
              }}
            >
              {hoursSaved ? 'Сохранено' : 'Сохранить часы'}
            </button>
            <p style={{ fontSize: 12, color: '#71717a', marginTop: 10 }}>
              Сейчас: {formatHourRange(settings.workStart, settings.workEnd)}, шаг{' '}
              {settings.slotStepMinutes} мин
            </p>
          </div>
        )}


        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <a
            href="tel:+78120000000"
            style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#e4e4e7',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <MapPin size={16} color="#3b82f6" />
            Контакты
          </a>
          <button
            type="button"
            onClick={() => {
              setShowGallery((v) => !v)
              setShowHours(false)
            }}
            style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#e4e4e7',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <LayoutGrid size={16} color="#3b82f6" />
            Карточки витрины
          </button>
        </div>

        
        {showGallery && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <strong style={{ color: '#fff', fontSize: 15 }}>Карточки витрины</strong>
            <p style={{ fontSize: 12, color: '#71717a', margin: '8px 0 14px' }}>
              Щипок / колесо — зум, тяните — сдвиг. Фото сжимается автоматически (до ~1600px)
            </p>

            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 14,
                background: '#0e0e12',
                border: '1px solid #2a2a32',
              }}
            >
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, marginBottom: 8 }}>
                Hero на главной
              </div>
              <ImageCropEditor
                src="/images/hero.jpg"
                height={220}
                label="Как в Telegram: зум и сдвиг"
                value={{
                  scale: settings.heroScale || 1,
                  x: settings.heroX || 0,
                  y: settings.heroY || 0,
                }}
                onChange={(v) => {
                  const next = {
                    ...settings,
                    heroScale: v.scale,
                    heroX: v.x,
                    heroY: v.y,
                  }
                  setSettings(next)
                  saveSettings(next)
                }}
              />
            </div>

            {settings.gallery.map((card, idx) => (
              <div
                key={card.id}
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 14,
                  background: '#0e0e12',
                  border: '1px solid #2a2a32',
                }}
              >
                {card.image ? (
                  <ImageCropEditor
                    src={card.image}
                    height={160}
                    value={{
                      scale: card.scale ?? 1,
                      x: card.x ?? 0,
                      y: card.y ?? 0,
                    }}
                    onChange={(v) => {
                      const gallery = settings.gallery.map((c, i) =>
                        i === idx
                          ? { ...c, scale: v.scale, x: v.x, y: v.y }
                          : c,
                      )
                      const next = { ...settings, gallery }
                      setSettings(next)
                      saveSettings(next)
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 120,
                      borderRadius: 12,
                      background: '#1a1a1e',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#52525b',
                      fontSize: 13,
                      marginBottom: 10,
                    }}
                  >
                    Нет фото
                  </div>
                )}

                <label className="label">Подпись</label>
                <input
                  className="input"
                  value={card.title}
                  onChange={(e) => {
                    const gallery = settings.gallery.map((c, i) =>
                      i === idx ? { ...c, title: e.target.value } : c,
                    )
                    setSettings((s) => ({ ...s, gallery }))
                  }}
                  style={{ marginBottom: 10 }}
                />

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px dashed #3b82f6',
                    color: '#93c5fd',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    background: 'rgba(59,130,246,0.08)',
                  }}
                >
                  Загрузить фото
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      void (async () => {
                        try {
                          const { dataUrl } = await optimizeImageFile(file, {
                            maxSide: 1600,
                            quality: 0.82,
                          })
                          const gallery = settings.gallery.map((c, i) =>
                            i === idx
                              ? { ...c, image: dataUrl, scale: 1, x: 0, y: 0 }
                              : c,
                          )
                          const next = { ...settings, gallery }
                          setSettings(next)
                          saveSettings(next)
                        } catch {
                          alert('Не удалось обработать фото')
                        }
                      })()
                      e.target.value = ''
                    }}
                  />
                </label>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const gallery = settings.gallery.map((c, i) =>
                        i === idx ? { ...c, image: '', scale: 1, x: 0, y: 0 } : c,
                      )
                      const next = { ...settings, gallery }
                      setSettings(next)
                      saveSettings(next)
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 10,
                      border: '1px solid #3f3f46',
                      background: 'transparent',
                      color: '#a1a1aa',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Удалить фото
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('Удалить карточку целиком?')) return
                      const gallery = settings.gallery.filter((_, i) => i !== idx)
                      const next = { ...settings, gallery }
                      setSettings(next)
                      saveSettings(next)
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 10,
                      border: '1px solid rgba(239,68,68,0.4)',
                      background: 'transparent',
                      color: '#ef4444',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Удалить карточку
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                border: '1px dashed #3f3f46',
                background: 'transparent',
                color: '#a1a1aa',
                fontWeight: 600,
                marginBottom: 10,
                cursor: 'pointer',
              }}
              onClick={() => {
                const gallery = [
                  ...settings.gallery,
                  {
                    id: `g${Date.now()}`,
                    title: 'Новая работа',
                    image: '/images/hero.jpg',
                    scale: 1,
                    x: 0,
                    y: 0,
                  },
                ]
                const next = { ...settings, gallery }
                setSettings(next)
                saveSettings(next)
              }}
            >
              + Добавить карточку
            </button>
            <button
              type="button"
              className="btn"
              style={{ width: '100%', background: '#3b82f6', borderRadius: 12 }}
              onClick={() => {
                saveSettings(settings)
                setHoursSaved(true)
                setTimeout(() => setHoursSaved(false), 2000)
              }}
            >
              {hoursSaved ? 'Сохранено' : 'Сохранить витрину'}
            </button>
          </div>
        )}

        {error && (
          <p
            style={{
              color: '#ef4444',
              fontSize: 12,
              marginBottom: 12,
              overflowWrap: 'anywhere',
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
            Записи ({rangeBookings.length})
          </h2>
          <span style={{ fontSize: 11, color: '#52525b' }}>
            {hasSupabase ? 'PB' : 'local'}
          </span>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && rangeBookings.length === 0 && (
          <div
            style={{
              ...cardStyle,
              textAlign: 'center',
              color: '#71717a',
              padding: 28,
            }}
          >
            Нет записей за выбранный период
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rangeBookings.map((b) => (
            <article key={b.id} style={{ ...cardStyle, padding: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>
                  {b.service_name || 'Услуга'}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 8,
                    background:
                      b.status === 'confirmed' || b.status === 'completed'
                        ? 'rgba(34,197,94,0.15)'
                        : b.status === 'cancelled'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(59,130,246,0.15)',
                    color:
                      b.status === 'confirmed' || b.status === 'completed'
                        ? '#22c55e'
                        : b.status === 'cancelled'
                          ? '#ef4444'
                          : '#60a5fa',
                  }}
                >
                  {b.status}
                </span>
              </div>
              <div style={{ fontSize: 14, color: '#e4e4e7', marginBottom: 4 }}>
                {format(parseISO(b.start_at), 'd MMMM, HH:mm', { locale: ru })}
              </div>
              <div style={{ fontSize: 13, color: '#a1a1aa' }}>
                {b.customer_name} ·{' '}
                <a href={`tel:${b.customer_phone}`} style={{ color: '#3b82f6' }}>
                  {b.customer_phone}
                </a>
              </div>
              {b.customer_car && (
                <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                  {b.customer_car}
                </div>
              )}
              {b.service_price != null && (
                <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>
                  {Number(b.service_price).toLocaleString('ru-RU')} ₽
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                {b.status !== 'confirmed' &&
                  b.status !== 'completed' &&
                  b.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => void setStatus(b.id, 'confirmed')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#3b82f6',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Подтвердить
                    </button>
                  )}
                {b.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => void setStatus(b.id, 'cancelled')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px solid #3f3f46',
                      background: 'transparent',
                      color: '#ef4444',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Отменить
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
