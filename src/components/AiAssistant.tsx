import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

const SYSTEM_PROMPT = `Ты ассистент детейлинг-студии Neo (Москва, ул. Примерная ул., 3А).
Телефон: +7 495 000-00-00. Часы: 10:00–20:00.
Услуги и цены «от»:
- PPF плёнка — от 190 000 ₽ (самозаживление, УФ, гарантия 1 год)
- Антихром — от 80 000 ₽
- Полировка и керамика — от 25 000 ₽
- Химчистка салона — от 12 000 ₽
- Покраска дисков — от 23 000 ₽
- Бронь лобового — от 36 000 ₽
Отвечай кратко по-русски, дружелюбно. Не выдумывай скидки и сроки, которых нет.
Если клиент хочет записаться — направь в раздел «Запись» внизу приложения.
Соцсети: Telegram t.me/POLIROVKASPB, WhatsApp wa.me/79215908589, VK vk.com/polirovkaspbrf.`

const FAQ_FALLBACK: { q: string[]; a: string }[] = [
  {
    q: ['цена', 'стоимость', 'сколько стоит', 'прайс'],
    a: 'Цены от: химчистка 12 000 ₽, полировка+керамика 25 000 ₽, антихром 80 000 ₽, PPF от 190 000 ₽. Точнее — после осмотра авто.',
  },
  {
    q: ['адрес', 'где', 'как доехать', 'бугры'],
    a: 'Москва, ул. Примерная ул., 3А (Башня «Федерация»). Тел. +7 495 000-00-00. Макет для презентации.',
  },
  {
    q: ['ppf', 'плёнка', 'броня'],
    a: 'PPF — защитная плёнка с самозаживлением и гарантией 1 год. Полная оклейка от 190 000 ₽.',
  },
  {
    q: ['антихром', 'хром'],
    a: 'Антихром — оклейка хрома в любой цвет. От 80 000 ₽.',
  },
  {
    q: ['полировка', 'керамика'],
    a: 'Полировка + керамика: глубокий блеск и гидрофоб. От 25 000 ₽.',
  },
  {
    q: ['химчистка', 'салон'],
    a: 'Химчистка салона с дезинфекцией. От 12 000 ₽, от 8 часов.',
  },
  {
    q: ['запись', 'записаться'],
    a: 'Нажмите «Запись» в нижней панели — выберите услугу, дату и время. Мы перезвоним.',
  },
]

function localAnswer(text: string): string {
  const lower = text.toLowerCase().trim()
  if (!lower) return 'Напишите вопрос про услуги, цены или запись.'
  for (const item of FAQ_FALLBACK) {
    if (item.q.some((k) => lower.includes(k))) return item.a
  }
  return 'Спросите про PPF, антихром, полировку, химчистку, цены или адрес. Или позвоните: +7 495 000-00-00.'
}

/** URL PocketBase — ИИ идёт через серверный хук /api/pspbrf/ai (ключ только на сервере) */
const pbUrl = (
  (import.meta.env.VITE_PB_URL as string | undefined)?.trim() || ''
).replace(/\/$/, '')
const useAiProxy = Boolean(pbUrl && pbUrl.startsWith('http') && !pbUrl.includes('placeholder'))

async function askAi(history: Msg[], userText: string): Promise<string> {
  if (!useAiProxy) return localAnswer(userText)

  const messages: Msg[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.filter((m) => m.role !== 'system').slice(-10),
    { role: 'user', content: userText },
  ]

  try {
    const res = await fetch(`${pbUrl}/api/pspbrf/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.fallback) {
      console.warn('[AI]', res.status, data)
      return localAnswer(userText) + '\n\n_(ИИ временно недоступен, ответ из базы знаний)_'
    }
    if (typeof data.content === 'string' && data.content.trim()) {
      return data.content.trim()
    }
  } catch (e) {
    console.warn('[AI] proxy failed', e)
  }
  return localAnswer(userText)
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    {
      role: 'bot',
      text: useAiProxy
        ? 'Привет! Я ИИ-ассистент Neo. Спросите про услуги, цены, запись или защиту кузова.'
        : 'Привет! Ассистент (локальный режим). Спросите про услуги или цены. Для полного ИИ задайте VITE_PB_URL и AI_API_KEY на сервере PocketBase.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<Msg[]>([])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open])

  async function send() {
    const t = input.trim()
    if (!t || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: t }])
    setBusy(true)
    try {
      const reply = await askAi(historyRef.current, t)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: t },
        { role: 'assistant', content: reply },
      ]
      setMessages((m) => [...m, { role: 'bot', text: reply }])
    } catch (e) {
      console.warn(e)
      const fallback = localAnswer(t)
      setMessages((m) => [...m, { role: 'bot', text: fallback }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть чат-ассистента"
          style={{
            position: 'fixed',
            bottom: 90,
            right: 16,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 20px rgba(61,124,255,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 60,
            cursor: 'pointer',
          }}
        >
          <MessageCircle size={24} />
        </button>
      )}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 12,
            left: 12,
            maxWidth: 360,
            marginLeft: 'auto',
            height: 420,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 60,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Ассистент</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {useAiProxy ? 'ИИ · онлайн' : 'Локальный режим'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  fontSize: 14,
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Печатает…</div>
            )}
          </div>
          <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Спросите про услуги..."
              style={{ flex: 1, padding: '10px 12px' }}
              disabled={busy}
            />
            <button
              type="button"
              onClick={send}
              className="btn"
              style={{ padding: '0 14px', borderRadius: 12 }}
              disabled={busy || !input.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
