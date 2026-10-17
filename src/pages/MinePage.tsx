import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BottomNavigation } from '../components/AppChrome'
import { ArrowLeft, User, Mail } from 'lucide-react'

type SavedBooking = {
  serviceId?: string
  serviceName?: string
  price?: number
  name?: string
  phone?: string
  car?: string
  whenLabel?: string
  iso?: string
}

export default function MinePage() {
  const { slug = 'neo' } = useParams<{ slug: string }>()
  const [booking, setBooking] = useState<SavedBooking | null>(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pspbrf-booking')
      setBooking(raw ? (JSON.parse(raw) as SavedBooking) : null)
      const savedEmail = localStorage.getItem('neo-client-email')
      if (savedEmail) setEmail(savedEmail)
    } catch {
      setBooking(null)
    }
  }, [])

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    const v = email.trim()
    if (!v || !v.includes('@')) {
      alert('Введите корректный email')
      return
    }
    try {
      localStorage.setItem('neo-client-email', v)
    } catch {
      /* ignore */
    }
    setSent(true)
  }

  return (
    <div
      style={{ minHeight: '100dvh', background: '#000', paddingBottom: 100 }}
      className="fade-in"
    >
      {/* top bar */}
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
        <Link to={`/s/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/images/logo.jpg"
            alt="Neo"
            style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }}
          />
          <span style={{ fontWeight: 700, color: '#fff' }}>Neo</span>
        </Link>
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
        >
          <User size={18} />
        </Link>
      </div>

      <div className="container" style={{ maxWidth: 480, paddingTop: 8 }}>
        <Link
          to={`/s/${slug}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#8b8b96',
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={16} /> На главную
        </Link>

        <div
          style={{
            background: '#141416',
            borderRadius: 24,
            border: '1px solid #222228',
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#1c1c22',
              border: '1px solid #2a2a32',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 20,
              color: '#fff',
            }}
          >
            <User size={28} strokeWidth={1.5} />
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              marginBottom: 10,
            }}
          >
            Профиль клиента
          </h1>
          <p style={{ fontSize: 15, color: '#8b8b96', lineHeight: 1.45, marginBottom: 24 }}>
            Сохраняйте новые записи в одном месте и открывайте их с любого устройства.
          </p>

          <form onSubmit={handleMagicLink}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#71717a',
                marginBottom: 8,
              }}
            >
              Почта
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setSent(false)
              }}
              placeholder=""
              className="input"
              style={{
                marginBottom: 10,
                background: '#0c0c0e',
                borderRadius: 14,
                border: '1px solid #2a2a32',
              }}
            />
            <p style={{ fontSize: 13, color: '#71717a', marginBottom: 16 }}>
              Пароль не нужен. Отправим ссылку для входа.
            </p>
            <button
              type="submit"
              style={{
                width: '100%',
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
              {sent ? 'Ссылка сохранена (демо)' : 'Получить ссылку'}
            </button>
            {sent && (
              <p style={{ fontSize: 13, color: '#22c55e', marginTop: 12 }}>
                Email сохранён на этом устройстве. В полной версии письмо уйдёт на почту.
              </p>
            )}
          </form>
        </div>

        {/* Локальная запись если есть */}
        {booking && (
          <div
            style={{
              background: '#141416',
              borderRadius: 20,
              border: '1px solid #222228',
              padding: 18,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              {booking.serviceName || 'Запись'}
            </div>
            <div style={{ fontSize: 14, color: '#a1a1aa' }}>
              {booking.whenLabel || '—'}
            </div>
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>
              {booking.name} · {booking.phone}
            </div>
            <Link
              to={`/s/${slug}/book`}
              style={{
                display: 'inline-block',
                marginTop: 12,
                color: '#3b82f6',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              К записи →
            </Link>
          </div>
        )}

        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#8b8b96',
            marginBottom: 24,
          }}
        >
          <Mail size={16} />
          Вы владелец студии?{' '}
          <Link to="/admin" style={{ color: '#fff', textDecoration: 'underline' }}>
            Открыть кабинет студии
          </Link>
        </p>
      </div>

      <BottomNavigation slug={slug} active="mine" />
    </div>
  )
}
