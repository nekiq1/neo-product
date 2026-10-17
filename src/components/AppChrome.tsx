import { CalendarCheck, Home, LayoutGrid, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

type ActiveTab = 'home' | 'book' | 'mine' | 'none'

export function AppHeader({
  phone = '+78120000000',
  slug = 'neo',
}: {
  phone?: string
  slug?: string
}) {
  return (
    <header className="app-header">
      <Link to={`/s/${slug}`} className="app-brand" aria-label="Neo — главная">
        <img
          src="/images/logo.jpg"
          alt="Neo"
          style={{
            width: 36,
            height: 36,
            objectFit: 'contain',
            borderRadius: 8,
            background: '#000',
          }}
        />
        <span>Neo</span>
      </Link>
      <a className="app-header-phone" href={`tel:${phone}`} aria-label="Позвонить">
        <Phone size={17} />
      </a>
    </header>
  )
}

export function BottomNavigation({
  slug = 'neo',
  active = 'none',
}: {
  slug?: string
  active?: ActiveTab
}) {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <Link to={`/s/${slug}`} className={active === 'home' ? 'active' : ''}>
        <Home size={19} />
        <span>Главная</span>
      </Link>
      <Link to={`/s/${slug}/book`} className={active === 'book' ? 'active' : ''}>
        <LayoutGrid size={19} />
        <span>Услуги</span>
      </Link>
      <Link to={`/s/${slug}/mine`} className={active === 'mine' ? 'active' : ''}>
        <CalendarCheck size={19} />
        <span>Моя запись</span>
      </Link>
    </nav>
  )
}
