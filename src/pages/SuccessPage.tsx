import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader, BottomNavigation } from '../components/AppChrome'

type SavedBooking = {
  name?: string
  serviceName?: string
  whenLabel?: string
}

export default function SuccessPage() {
  const { slug = 'neo' } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const [booking, setBooking] = useState<SavedBooking | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pspbrf-booking')
      setBooking(raw ? (JSON.parse(raw) as SavedBooking) : null)
    } catch {
      setBooking(null)
    }
  }, [])

  const name = searchParams.get('name') || booking?.name || ''
  const service = searchParams.get('service') || booking?.serviceName || ''
  const time = searchParams.get('time') || booking?.whenLabel || ''

  return (
    <div className="page-with-nav fade-in">
      <AppHeader slug={slug} />
      <main className="container" style={{ minHeight: '72dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <span style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--accent)', color: '#fff' }}>
          <Check size={32} />
        </span>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 20 }}>Запись принята</h1>
        {name || service || time ? (
          <p style={{ maxWidth: 330, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }}>
            {name ? `${name}, ` : ''}{service ? `${service}. ` : ''}{time ? `${time}.` : ''}
          </p>
        ) : (
          <p style={{ maxWidth: 330, color: 'var(--text-muted)', marginTop: 12 }}>
            Мы получили вашу заявку и скоро перезвоним для подтверждения.
          </p>
        )}
        <p style={{ maxWidth: 330, color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          Если нужно что-то изменить — позвоните в студию.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, marginTop: 28 }}>
          <a href="tel:+78120000000" className="btn" style={{ minHeight: 48, color: '#fff' }}>
            Позвонить в студию
          </a>
          <Link to={`/s/${slug}`} className="btn btn-secondary" style={{ minHeight: 48 }}>
            К услугам
          </Link>
        </div>
      </main>
      <BottomNavigation slug={slug} />
    </div>
  )
}
