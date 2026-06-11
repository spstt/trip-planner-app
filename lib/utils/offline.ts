import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'tripplanner-offline'
const DB_VERSION = 1

let db: IDBPDatabase | null = null

async function getDB() {
  if (db) return db
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Store cached file blobs keyed by storage_path
      if (!database.objectStoreNames.contains('attachments')) {
        database.createObjectStore('attachments', { keyPath: 'storage_path' })
      }
      // Store trip data snapshots for offline itinerary view
      if (!database.objectStoreNames.contains('trips')) {
        database.createObjectStore('trips', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('itinerary')) {
        database.createObjectStore('itinerary', { keyPath: 'trip_id' })
      }
    },
  })
  return db
}

export async function cacheAttachment(storagePath: string, blob: Blob, fileName: string) {
  const database = await getDB()
  await database.put('attachments', {
    storage_path: storagePath,
    blob,
    file_name: fileName,
    cached_at: Date.now(),
  })
}

export async function getCachedAttachment(storagePath: string): Promise<Blob | null> {
  const database = await getDB()
  const record = await database.get('attachments', storagePath)
  return record?.blob ?? null
}

export async function cacheTrip(tripId: string, data: unknown) {
  const database = await getDB()
  await database.put('trips', { id: tripId, data, cached_at: Date.now() })
}

export async function getCachedTrip(tripId: string) {
  const database = await getDB()
  return database.get('trips', tripId)
}

export async function cacheItinerary(tripId: string, days: unknown) {
  const database = await getDB()
  await database.put('itinerary', { trip_id: tripId, days, cached_at: Date.now() })
}

export async function getCachedItinerary(tripId: string) {
  const database = await getDB()
  return database.get('itinerary', tripId)
}
