/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const studios = app.findCollectionByNameOrId('studios')
    const services = app.findCollectionByNameOrId('services')

    let studio
    try {
      studio = app.findFirstRecordByFilter(studios, 'slug = {:slug}', { slug: 'neo' })
    } catch (_) {
      try {
        studio = app.findFirstRecordByFilter(studios, 'slug = {:slug}', { slug: 'demo' })
      } catch (_) {
        try {
          studio = app.findFirstRecordByFilter(studios, 'slug = {:slug}', { slug: 'pspbrf' })
        } catch (_) {
          studio = new Record(studios)
        }
      }
    }
    studio.set('slug', 'neo')
    studio.set('name', 'Neo Detailing')
    studio.set('address', 'Санкт-Петербург, Литейный пр., 26')
    studio.set('description', 'Детейлинг, который возвращает кузову глубину, а салону — чистоту')
    studio.set('phone', '+78120000000')
    studio.set('is_active', true)
    app.save(studio)

    const catalog = [
      { name: 'Комплексная мойка', description: 'Кузов, диски, стёкла, сушка.', price: 3500, duration_minutes: 120, sort_order: 1 },
      { name: 'Химчистка салона', description: 'Глубокая чистка, озон, защита.', price: 12000, duration_minutes: 1440, sort_order: 2 },
      { name: 'Полировка кузова', description: 'Коррекция ЛКП, риски и голограммы.', price: 18000, duration_minutes: 1440, sort_order: 3 },
      { name: 'Керамическое покрытие', description: 'Многослойная керамика, блеск и гидрофоб.', price: 25000, duration_minutes: 2880, sort_order: 4 },
    ]

    try {
      const old = app.findRecordsByFilter(services, 'studio_id = {:id}', '-created', 100, 0, { id: studio.id })
      for (const r of old) app.delete(r)
    } catch (_) {}

    for (const item of catalog) {
      const rec = new Record(services)
      rec.set('studio_id', studio.id)
      rec.set('name', item.name)
      rec.set('description', item.description)
      rec.set('price', item.price)
      rec.set('duration_minutes', item.duration_minutes)
      rec.set('sort_order', item.sort_order)
      rec.set('is_active', true)
      app.save(rec)
    }
  },
  (app) => {}
)
