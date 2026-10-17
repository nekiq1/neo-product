/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2819984735")

  // update collection data
  unmarshal({
    "createRule": null,
    "listRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2819984735")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "listRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
})
