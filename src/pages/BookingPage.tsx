import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  format,
  addDays,
  setHours,
  setMinutes,
  isBefore,
  startOfDay,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { supabase, hasSupabase, withTimeout } from '../lib/pb'
import { addLocalBooking, loadLocalBookings } from '../lib/localBookings'
import type { Studio, Service } from '../types'
import { DEMO_STUDIO, DEMO_SERVICES } from '../types'
import { ChevronLeft, Check } from 'lucide-react'
import { AppHeader, BottomNavigation } from '../components/AppChrome'
import { loadSettings } from '../lib/studioSettings'

function generateSlots(
  date: Date,
  durationMinutes: number,
  workStart: number,
  workEnd: number,
  stepMin: number,
): string[] {
  const slots: string[] = []
  const isMultiDay = durationMinutes >= 1440
  const endHour = isMultiDay ? Math.min(workStart + 5, workEnd) : workEnd
  let current = setMinutes(setHours(date, workStart), 0)
  const endLimit = setMinutes(setHours(date, endHour), 0)
  const step = Math.max(15, stepMin)

  while (isBefore(current, endLimit)) {
    const durationForSlot = Math.min(durationMinutes, 480)
    const end = new Date(current.getTime() + durationForSlot * 60 * 1000)
    if (!isMultiDay && isBefore(endLimit, end)) break
    slots.push(format(current, 'HH:mm'))
    current = new Date(current.getTime() + step * 60 * 1000)
  }
  return slots
}

function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return `${days} ${
      days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'
    }`
  }

  if (minutes >= 60) return `${Math.round(minutes / 60)} ч`
  return `${minutes} мин`
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const serviceIdParam = searchParams.get('service')

  const [studio, setStudio] = useState<Studio | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    serviceIdParam,
  )
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfDay(new Date()),
  )
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [car, setCar] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyTimes, setBusyTimes] = useState<string[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [workSettings, setWorkSettings] = useState(() => loadSettings())

  useEffect(() => {
    setWorkSettings(loadSettings())
  }, [])

  // Load configured time slots from Supabase for the selected date.
  useEffect(() => {
    let cancelled = false

    async function loadSlots() {
      if (!hasSupabase || !selectedDate) {
        setAvailableSlots([])
        return
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      try {
        const { data, error: slotsError } = await withTimeout(
          supabase
            .from('slots')
            .select('*')
            .eq('date', dateStr)
            .order('time_start'),
          8000,
        )

        if (cancelled) return

        if (slotsError) {
          console.warn('Slots load error:', slotsError.message)
          setAvailableSlots([])
          return
        }

        const times = (data || [])
          .map((slot: { time_start: string }) =>
            slot.time_start.slice(0, 5),
          )
        setAvailableSlots(times)
      } catch (err) {
        if (!cancelled) {
          console.warn('Slots fetch failed:', err)
          setAvailableSlots([])
        }
      }
    }

    void loadSlots()
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const selectedService =
    services.find((service) => service.id === selectedServiceId) || null

  const dates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) =>
        addDays(startOfDay(new Date()), index),
      ),
    [],
  )

  const slots = useMemo(() => {
    if (!selectedService) return []
    if (availableSlots.length > 0) return availableSlots
    return generateSlots(
      selectedDate,
      selectedService.duration_minutes,
      workSettings.workStart,
      workSettings.workEnd,
      workSettings.slotStepMinutes,
    )
  }, [selectedDate, selectedService, availableSlots, workSettings])

  // Load studio and services.
  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!slug) {
        setLoading(false)
        return
      }

      setLoading(true)

      if (!hasSupabase) {
        if (!cancelled) {
          setStudio({ ...DEMO_STUDIO, slug })
          setServices(DEMO_SERVICES)
          setSelectedServiceId(
            (current) => current ?? DEMO_SERVICES[0]?.id ?? null,
          )
          setLoading(false)
        }
        return
      }

      try {
        const { data: studioData, error: studioError } = await withTimeout(
          supabase
            .from('studios')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single(),
        )

        if (cancelled) return

        if (!studioError && studioData) {
          setStudio(studioData as Studio)

          const { data: servicesData, error: servicesError } =
            await withTimeout(
              supabase
                .from('services')
                .select('*')
                .eq('studio_id', (studioData as Studio).id)
                .eq('is_active', true)
                .order('sort_order'),
            )

          if (cancelled) return

          if (servicesError) {
            console.warn('Services load error:', servicesError.message)
          }

          const list =
            servicesData && servicesData.length > 0
              ? (servicesData as Service[])
              : DEMO_SERVICES

          setServices(list)
          setSelectedServiceId(
            (current) => current ?? list[0]?.id ?? null,
          )
        } else {
          setStudio({ ...DEMO_STUDIO, slug })
          setServices(DEMO_SERVICES)
          setSelectedServiceId(
            (current) => current ?? DEMO_SERVICES[0]?.id ?? null,
          )
        }
      } catch (err) {
        console.warn('Studio load failed:', err)
        if (!cancelled) {
          setStudio({ ...DEMO_STUDIO, slug })
          setServices(DEMO_SERVICES)
          setSelectedServiceId(
            (current) => current ?? DEMO_SERVICES[0]?.id ?? null,
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Load booked times for the selected date (local bookings + Supabase).
  useEffect(() => {
    let cancelled = false

    async function loadBusy() {
      const dayStr = format(selectedDate, 'yyyy-MM-dd')
      const times = new Set<string>()

      if (!hasSupabase) {
        for (const booking of loadLocalBookings()) {
          if (booking.status === 'cancelled') continue
          if (format(new Date(booking.start_at), 'yyyy-MM-dd') === dayStr) {
            times.add(format(new Date(booking.start_at), 'HH:mm'))
          }
        }
      }

      if (hasSupabase) {
        const dayStart = startOfDay(selectedDate)
        const dayEnd = addDays(dayStart, 1)

        try {
          const res = await withTimeout(
            supabase
              .from('bookings')
              .select('start_at, status')
              .gte('start_at', dayStart.toISOString())
              .lt('start_at', dayEnd.toISOString())
              .neq('status', 'cancelled'),
            8000,
          )

          const data = (
            res as { data?: { start_at: string; status?: string }[] | null }
          )?.data

          for (const booking of data || []) {
            times.add(format(new Date(booking.start_at), 'HH:mm'))
          }
        } catch {
          // Keep locally stored bookings if Supabase is unavailable.
        }
      }

      if (cancelled) return

      const list = Array.from(times)
      setBusyTimes(list)
      setSelectedTime((previous) =>
        previous && list.includes(previous) ? null : previous,
      )
    }

    void loadBusy()
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (submitting) return

    if (!selectedService || !selectedTime || !name.trim() || !phone.trim()) {
      setError('Заполните обязательные поля: услугу, время, имя и телефон.')
      return
    }

    if (busyTimes.includes(selectedTime)) {
      setError('Это время уже занято — выберите другое.')
      return
    }

    setSubmitting(true)
    setError(null)

    const [hours, minutes] = selectedTime.split(':').map(Number)
    const startAt = setMinutes(setHours(selectedDate, hours), minutes)
    const endAt = new Date(
      startAt.getTime() + selectedService.duration_minutes * 60 * 1000,
    )

    const payload = {
      studio_id: studio?.id?.startsWith('demo') ? null : studio?.id ?? null,
      service_id: selectedService.id.startsWith('svc-')
        ? null
        : selectedService.id,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_car: car.trim() || null,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'pending' as const,
      service_name: selectedService.name,
      service_price: selectedService.price,
      studio_slug: slug || 'neo',
    }

    let savedRemote = false

    if (hasSupabase) {
      try {
        const res = await withTimeout(
          supabase.from('bookings').insert(payload).select('id').single(),
          8000,
        )
        const err = (res as { error?: { message?: string } | null })?.error
        if (err) throw new Error(err.message || 'Не удалось сохранить запись')
        savedRemote = true
      } catch (err) {
        console.warn('Booking insert error:', err)
      }
    }

    // Локально только если PB не сработал — иначе дубль в админке
    if (!savedRemote) {
      try {
        addLocalBooking({
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          customer_car: payload.customer_car,
          service_name: payload.service_name,
          service_price: payload.service_price,
          start_at: payload.start_at,
          end_at: payload.end_at,
          status: 'pending',
          studio_slug: payload.studio_slug,
          notes: 'local-only',
        })
      } catch (err) {
        console.warn('Local booking save failed:', err)
      }
    }

    try {
      localStorage.setItem(
        'pspbrf-booking',
        JSON.stringify({
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          price: selectedService.price,
          name: name.trim(),
          phone: phone.trim(),
          car: car.trim(),
          whenLabel: format(startAt, 'd MMMM, HH:mm', { locale: ru }),
          iso: startAt.toISOString(),
        }),
      )
    } catch (err) {
      console.warn('Local booking save failed:', err)
    }

    setSubmitting(false)
    navigate(
      `/s/${slug}/success?name=${encodeURIComponent(
        name.trim(),
      )}&service=${encodeURIComponent(
        selectedService.name,
      )}&time=${encodeURIComponent(
        format(startAt, 'd MMMM, HH:mm', { locale: ru }),
      )}`,
    )
  }

  if (loading) {
    return (
      <div className="page-with-nav">
        <AppHeader slug={slug} />
        <div
          style={{
            minHeight: '70dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="spinner" />
        </div>
        <BottomNavigation slug={slug} active="book" />
      </div>
    )
  }

  return (
    <div className="page-with-nav fade-in">
      <AppHeader slug={slug} phone={studio?.phone || '+78120000000'} />

      <div className="container" style={{ paddingTop: 20 }}>
        <Link
          to={`/s/${slug}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--text-muted)',
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          <ChevronLeft size={18} />
          Назад
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          Запись
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label className="label">Услуга</label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedServiceId(service.id)
                    setSelectedTime(null)
                    setError(null)
                  }}
                  className="card"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor:
                      selectedServiceId === service.id
                        ? 'var(--accent)'
                        : undefined,
                    background:
                      selectedServiceId === service.id
                        ? 'var(--accent-dim)'
                        : undefined,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#ffffff',
                        fontSize: 15,
                      }}
                    >
                      {service.name}
                    </span>
                    <span className="price">
                      от {service.price.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      marginTop: 4,
                    }}
                  >
                    {formatDuration(service.duration_minutes)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="label">Дата</label>
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 8,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {dates.map((date) => {
                const isSelected =
                  format(date, 'yyyy-MM-dd') ===
                  format(selectedDate, 'yyyy-MM-dd')

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date)
                      setSelectedTime(null)
                      setError(null)
                    }}
                    style={{
                      flexShrink: 0,
                      width: 64,
                      padding: '10px 0',
                      borderRadius: 12,
                      border: `1px solid ${
                        isSelected ? 'var(--accent)' : 'var(--border)'
                      }`,
                      background: isSelected
                        ? 'var(--accent-dim)'
                        : 'var(--bg-card)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {format(date, 'EEE', { locale: ru })}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      {format(date, 'd')}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {format(date, 'MMM', { locale: ru })}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedService && (
            <div style={{ marginBottom: 24 }}>
              <label className="label">
                Время{' '}
                {selectedService.duration_minutes >= 1440 &&
                  '(начало работ)'}
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                }}
              >
                {slots.map((time) => {
                  const isBusy = busyTimes.includes(time)
                  const isSelected = selectedTime === time && !isBusy

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (!isBusy) {
                          setSelectedTime(time)
                          setError(null)
                        }
                      }}
                      style={{
                        padding: '12px 6px',
                        borderRadius: 12,
                        border: isBusy
                          ? '1px dashed var(--border)'
                          : `1px solid ${
                              isSelected ? 'var(--accent)' : 'var(--border)'
                            }`,
                        background: isBusy
                          ? 'transparent'
                          : isSelected
                            ? 'var(--accent)'
                            : 'var(--bg-card)',
                        color: isBusy
                          ? 'var(--text-muted)'
                          : isSelected
                            ? '#ffffff'
                            : 'var(--text)',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        opacity: isBusy ? 0.55 : 1,
                      }}
                    >
                      <div>{time}</div>
                      {isBusy && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>
                          Занято
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  marginTop: 10,
                }}
              >
                Серые окна уже заняты. Выберите любое свободное время.
              </p>

              {slots.length === 0 && (
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  Нет доступных слотов на эту дату
                </p>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="label">Ваше имя *</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Иван"
              required
              autoComplete="name"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Телефон *</label>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 999 123-45-67"
              required
              autoComplete="tel"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="label">Автомобиль (марка / номер)</label>
            <input
              className="input"
              value={car}
              onChange={(event) => setCar(event.target.value)}
              placeholder="BMW X5 / А123ВС777"
            />
          </div>

          {error && (
            <p
              style={{
                color: 'var(--danger)',
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn"
            style={{ width: '100%' }}
            disabled={
              submitting ||
              !selectedService ||
              !selectedTime ||
              !name.trim() ||
              !phone.trim()
            }
          >
            {submitting ? (
              <span
                className="spinner"
                style={{ width: 20, height: 20, borderWidth: 2 }}
              />
            ) : (
              <>
                <Check size={18} />
                Записаться
                {selectedService &&
                  ` · от ${selectedService.price.toLocaleString('ru-RU')} ₽`}
              </>
            )}
          </button>

          <p
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 14,
            }}
          >
            Мы перезвоним для подтверждения
          </p>
        </form>
      </div>

      <BottomNavigation slug={slug} active="book" />
    </div>
  )
}
