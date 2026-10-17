/// <reference path="../pb_data/types.d.ts" />
/**
 * Relation → text: избегаем "Missing collection context" при null/demo id
 */
migrate(
  (app) => {
    function swapRelationToText(colName, fieldNames) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        for (const fname of fieldNames) {
          const f = col.fields.getByName(fname)
          if (!f) continue
          // удаляем relation
          col.fields.removeByName(fname)
          // добавляем text
          col.fields.add(
            new Field({
              type: 'text',
              name: fname,
              required: false,
            }),
          )
        }
        app.save(col)
      } catch (e) {
        // ignore if collection missing
      }
    }

    swapRelationToText('services', ['studio_id'])
    swapRelationToText('bookings', ['studio_id', 'service_id'])
    swapRelationToText('slots', ['studio_id', 'service_id'])
  },
  (app) => {},
)
