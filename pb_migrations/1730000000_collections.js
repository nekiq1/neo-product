/// <reference path="../pb_data/types.d.ts" />
/**
 * Миграция коллекций PSPBRF:
 * studios, services, bookings, slots
 *
 * Rules:
 *  - studios, services, slots — публичное чтение
 *  - bookings — публичное создание + чтение
 *  - update/delete bookings, всё остальное — только админ (auth)
 */
migrate(
  (app) => {
    // ---- studios ----
    const studios = new Collection({
      type: 'base',
      name: 'studios',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { type: 'text', name: 'slug', required: true, presentable: true },
        { type: 'text', name: 'name', required: true },
        { type: 'text', name: 'address' },
        { type: 'text', name: 'description' },
        { type: 'text', name: 'phone' },
        { type: 'bool', name: 'is_active' },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_studios_slug ON studios (slug)',
      ],
    })
    // default is_active = true via app after create if needed
    app.save(studios)

    // ---- services ----
    const services = new Collection({
      type: 'base',
      name: 'services',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { type: 'text', name: 'studio_id' },
        { type: 'text', name: 'name', required: true },
        { type: 'text', name: 'description' },
        { type: 'number', name: 'price', required: true },
        { type: 'number', name: 'duration_minutes', required: true },
        { type: 'bool', name: 'is_active' },
        { type: 'number', name: 'sort_order' },
      ],
      indexes: [
        'CREATE INDEX idx_services_studio ON services (studio_id)',
      ],
    })
    app.save(services)

    // ---- bookings ----
    const bookings = new Collection({
      type: 'base',
      name: 'bookings',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { type: 'text', name: 'studio_id' },
        { type: 'text', name: 'service_id' },
        { type: 'text', name: 'studio_slug' },
        { type: 'text', name: 'service_name' },
        { type: 'number', name: 'service_price' },
        { type: 'text', name: 'customer_name', required: true },
        { type: 'text', name: 'customer_phone', required: true },
        { type: 'text', name: 'customer_car' },
        { type: 'date', name: 'start_at', required: true },
        { type: 'date', name: 'end_at', required: true },
        {
          type: 'select',
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['pending', 'confirmed', 'cancelled', 'completed'],
        },
        { type: 'text', name: 'notes' },
      ],
      indexes: [
        'CREATE INDEX idx_bookings_start ON bookings (start_at)',
        'CREATE INDEX idx_bookings_status ON bookings (status)',
      ],
    })
    app.save(bookings)

    // ---- slots (опциональные окна записи по дате) ----
    const slots = new Collection({
      type: 'base',
      name: 'slots',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { type: 'text', name: 'date', required: true }, // YYYY-MM-DD
        { type: 'text', name: 'time_start', required: true }, // HH:mm:ss
        { type: 'text', name: 'time_end', required: true },
        { type: 'number', name: 'max_bookings' },
        { type: 'text', name: 'studio_id' },
        { type: 'text', name: 'service_id' },
      ],
      indexes: [
        'CREATE INDEX idx_slots_date ON slots (date)',
      ],
    })
    app.save(slots)
  },
  (app) => {
    // down
    for (const name of ['slots', 'bookings', 'services', 'studios']) {
      try {
        const c = app.findCollectionByNameOrId(name)
        app.delete(c)
      } catch (_) {}
    }
  }
)
