import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, hasSupabase, withTimeout } from '../lib/pb'
import type { Studio, Service } from '../types'
import { DEMO_STUDIO, DEMO_SERVICES } from '../types'
import { ArrowUpRight, Clock, MapPin, Phone, Sparkles, Wrench, LayoutGrid, Download, User, Tag } from 'lucide-react'
// User icon for profile
import { BottomNavigation } from '../components/AppChrome'
import { loadSettings, formatHourRange } from '../lib/studioSettings'
import { cropTransform } from '../components/ImageCropEditor'

function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return `${days} д`
  }
  if (minutes >= 60) return `${Math.round(minutes / 60)} ч`
  return `${minutes} мин`
}


// PWA install prompt (Chrome/Android)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    ;(window as unknown as { __neoPwaPrompt?: BeforeInstallPromptEvent }).__neoPwaPrompt =
      e as BeforeInstallPromptEvent
  })
}

export default function StudioPage() {
  const { slug } = useParams<{ slug: string }>()
  const [studio, setStudio] = useState<Studio | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!slug) return
      setLoading(true)

      if (!hasSupabase) {
        if (!cancelled) {
          setStudio({ ...DEMO_STUDIO, slug })
          setServices(DEMO_SERVICES)
          setLoading(false)
        }
        return
      }

      try {
        const { data: studioData, error } = await withTimeout(
          supabase
            .from('studios')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single(),
        )

        if (cancelled) return

        if (error || !studioData) {
          setStudio({ ...DEMO_STUDIO, slug })
          setServices(DEMO_SERVICES)
        } else {
          setStudio(studioData as Studio)
          const { data: servicesData } = await withTimeout(
            supabase
              .from('services')
              .select('*')
              .eq('studio_id', (studioData as Studio).id)
              .eq('is_active', true)
              .order('sort_order'),
          )
          if (!cancelled) {
            setServices(
              Array.isArray(servicesData) && servicesData.length
                ? (servicesData as Service[])
                : DEMO_SERVICES,
            )
          }
        }
      } catch {
        if (!cancelled) {
          setStudio({ ...DEMO_STUDIO, slug })
          setServices(DEMO_SERVICES)
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

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        <div className="spinner" />
      </div>
    )
  }

  if (!studio) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#000',
        }}
      >
        <p>Студия не найдена</p>
      </div>
    )
  }

  const settings = loadSettings()
  const phone = studio.phone || '+78120000000' 
  const minPrice = services.length
    ? Math.min(...services.map((s) => s.price))
    : 3500
  const mapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(studio.address || '')}`

  return (
    <div
      style={{ minHeight: '100dvh', paddingBottom: 100, background: '#000' }}
      className="fade-in"
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/images/logo.jpg"
            alt="Neo"
            style={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              borderRadius: 8,
              background: '#000',
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: '0.04em' }}>
            Neo
          </span>
        </div>
        <Link
          to={`/s/${slug}/mine`}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid #2a2a32',
            display: 'grid',
            placeItems: 'center',
            color: '#a1a1aa',
          }}
          aria-label="Профиль клиента"
        >
          <User size={18} />
        </Link>
      </div>

      <div className="container" style={{ paddingTop: 4, maxWidth: 480 }}>
        {/* Hero — машина крупно и выше, как SGX */}
        <div
          style={{
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 22,
            border: '1px solid #1c1c20',
            background: '#0a0a0c',
            height: 320,
          }}
        >
          <img
            src="/images/hero.jpg"
            alt="Neo Detailing"
            style={cropTransform({
              scale: settings.heroScale || 1,
              x: settings.heroX || 0,
              y: settings.heroY || 0,
            })}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)',
              pointerEvents: 'none',
            }}
          />
          <svg
            viewBox="0 0 400 200"
            style={{
              position: 'absolute',
              left: 0,
              top: '-2%',
              width: '100%',
              height: '62%',
              pointerEvents: 'none',
            }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="neoArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <filter id="neoArcBlur">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>
            <path
              d="M 20 155 Q 200 20 380 155"
              fill="none"
              stroke="url(#neoArcGrad)"
              strokeWidth="16"
              strokeLinecap="round"
              filter="url(#neoArcBlur)"
            />
            <path
              d="M 35 155 Q 200 35 365 155"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.95"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 12,
              zIndex: 2,
            }}
          >
            <Link
              to={`/s/${slug}/book`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 999,
                background: 'rgba(16,16,20,0.45)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 15,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              Записаться
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Neo Detailing
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#8b8b96',
            lineHeight: 1.45,
            marginBottom: 18,
            maxWidth: 360,
          }}
        >
          {studio.description ||
            'Детейлинг, который возвращает кузову глубину, а салону — чистоту'}
        </p>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              background: '#141416',
              borderRadius: 18,
              padding: '16px 14px',
              border: '1px solid #222228',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Wrench size={16} color="#a1a1aa" />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
                {services.length || 4}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#71717a' }}>услуг в прайсе</div>
          </div>
          <div
            style={{
              background: '#141416',
              borderRadius: 18,
              padding: '16px 14px',
              border: '1px solid #222228',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <LayoutGrid size={16} color="#a1a1aa" />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{settings.boxesCount}</span>
            </div>
            <div style={{ fontSize: 13, color: '#71717a' }}>бокса в работе</div>
          </div>
        </div>

        <div
          style={{
            background: '#141416',
            borderRadius: 18,
            padding: '14px 16px',
            border: '1px solid #222228',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={18} color="#a1a1aa" strokeWidth={2} />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
              от {minPrice.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#71717a' }}>за услугу</span>
        </div>

        {/* Services */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>
            Услуги
          </h2>
          <Link
            to={`/s/${slug}/book`}
            style={{ fontSize: 14, color: '#8b8b96', fontWeight: 500 }}
          >
            Все услуги →
          </Link>
        </div>

        <div
          style={{
            background: '#141416',
            borderRadius: 20,
            border: '1px solid #222228',
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          {services.map((service, i) => (
            <Link
              key={service.id}
              to={`/s/${slug}/book?service=${service.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 16px',
                borderBottom:
                  i < services.length - 1 ? '1px solid #222228' : 'none',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
                  {service.name}
                </div>
                <div style={{ fontSize: 13, color: '#71717a', marginTop: 3 }}>
                  {formatDuration(service.duration_minutes)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
                  {service.price <= 3500 ? '' : 'от '}
                  {service.price.toLocaleString('ru-RU')} ₽
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#71717a',
                    marginTop: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  Выбрать <ArrowUpRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>


        {/* Gallery / витрина */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
            Работы студии
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {settings.gallery.map((card) => (
              <div
                key={card.id}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  border: '1px solid #222228',
                  background: '#141416',
                }}
              >
                <div style={{ height: 180, overflow: 'hidden', background: '#0a0a0c', position: 'relative' }}>
                  <img
                    src={card.image}
                    alt={card.title}
                    style={cropTransform({
                      scale: card.scale ?? 1,
                      x: card.x ?? 0,
                      y: card.y ?? 0,
                    })}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/images/hero.jpg'
                    }}
                  />
                </div>
                <div style={{ padding: '10px 14px', fontSize: 13, color: '#8b8b96' }}>
                  {card.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA — Запись в студию */}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}
        >
          Запись в студию
        </h2>
        <div
          style={{
            background: '#141416',
            borderRadius: 22,
            border: '1px solid #222228',
            padding: 20,
            marginBottom: 12,
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 90% 20%, rgba(59,130,246,0.12), transparent)',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            Свежий вид для вашего авто
          </h3>
          <p style={{ fontSize: 14, color: '#8b8b96', marginBottom: 16, lineHeight: 1.45 }}>
            Выберите услугу и удобное время — остальное возьмём на себя
          </p>
          <Link
            to={`/s/${slug}/book`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 18px',
              borderRadius: 999,
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Выбрать время <ArrowUpRight size={16} />
          </Link>
        </div>

        {/* Запись с ИИ */}
        <div
          style={{
            background: '#141416',
            borderRadius: 22,
            border: '1px solid #222228',
            padding: 18,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#3b82f6',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 4 }}>
                Запись с ИИ
              </div>
              <div style={{ fontSize: 13, color: '#8b8b96', lineHeight: 1.4 }}>
                Подберёт услугу для автомобиля и покажет актуальное время
              </div>
            </div>
          </div>
          <Link
            to={`/s/${slug}/book`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 999,
              border: '1px solid #2a2a32',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Подобрать услугу <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* Адрес */}
        <div
          style={{
            background: '#141416',
            borderRadius: 22,
            border: '1px solid #222228',
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <MapPin size={18} color="#a1a1aa" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>
              {studio.address}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <Clock size={18} color="#a1a1aa" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>
                {formatHourRange(settings.workStart, settings.workEnd)}
              </div>
              <div style={{ fontSize: 12, color: '#71717a' }}>по времени студии</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 14px',
                borderRadius: 999,
                border: '1px solid #2a2a32',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Маршрут <ArrowUpRight size={14} />
            </a>
            <a
              href={`tel:${phone}`}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid #2a2a32',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
              aria-label="Позвонить"
            >
              <Phone size={18} />
            </a>
          </div>
        </div>

        {/* PWA — Студия всегда под рукой */}
        <div
          style={{
            background: '#0e0e12',
            borderRadius: 22,
            border: '1px solid #222228',
            padding: 20,
            marginBottom: 20,
            backgroundImage:
              'radial-gradient(circle at 80% 30%, rgba(59,130,246,0.2), transparent 50%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#3b82f6',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src="/images/logo.jpg"
                alt=""
                style={{ width: 40, height: 40, objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Neo</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>Приложение студии</div>
            </div>
          </div>
          <h3
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.2,
              marginBottom: 8,
              letterSpacing: '-0.02em',
            }}
          >
            Студия всегда
            <br />
            под рукой.
          </h3>
          <p style={{ fontSize: 14, color: '#8b8b96', marginBottom: 16, lineHeight: 1.45 }}>
            Записывайтесь за несколько касаний, без поиска ссылки и звонков.
          </p>
          <button
            type="button"
            onClick={() => {
              const deferred = (window as unknown as { __neoPwaPrompt?: BeforeInstallPromptEvent })
                .__neoPwaPrompt
              if (deferred) {
                void deferred.prompt()
              } else {
                alert(
                  'На iPhone: «Поделиться» → «На экран Домой». На Android: меню браузера → «Установить приложение».',
                )
              }
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 18px',
              borderRadius: 999,
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            <Download size={18} />
            Добавить на экран
            <span style={{ opacity: 0.8 }}>→</span>
          </button>
          <p style={{ fontSize: 12, color: '#52525b', marginTop: 10, textAlign: 'center' }}>
            Бесплатно. Установка через браузер.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 4px 16px',
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Neo</span>
          <a
            href={`tel:${phone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#8b8b96',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Связаться <ArrowUpRight size={14} />
          </a>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3f3f46', marginBottom: 8 }}>
          <Link to="/admin" style={{ color: '#3f3f46' }}>
            Админ
          </Link>
        </p>
      </div>

      <BottomNavigation slug={slug} active="home" />
    </div>
  )
}
