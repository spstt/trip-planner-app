'use client'
// IndexedDB wrapper — client-side only, never runs on server

async function getDB() {
  if (typeof window === 'undefined') return null
  const { openDB } = await import('idb')
  return openDB('tripplanner-offline', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('attachments')) {
        db.createObjectStore('attachments', { keyPath: 'storage_path' })
      }
      if (!db.objectStoreNames.contains('trips')) {
        db.createObjectStore('trips', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('itinerary')) {
        db.createObjectStore('itinerary', { keyPath: 'trip_id' })
      }
    },
  })
}

export async function cacheAttachment(storagePath: string, blob: Blob, fileName: string) {
  const db = await getDB()
  if (!db) return
  await db.put('attachments', { storage_path: storagePath, blob, file_name: fileName, cached_at: Date.now() })
}

export async function getCachedAttachment(storagePath: string): Promise<Blob | null> {
  const db = await getDB()
  if (!db) return null
  const record = await db.get('attachments', storagePath)
  return record?.blob ?? null
}

export async function cacheTrip(tripId: string, data: unknown) {
  const db = await getDB()
  if (!db) return
  await db.put('trips', { id: tripId, data, cached_at: Date.now() })
}

export async function getCachedTrip(tripId: string) {
  const db = await getDB()
  if (!db) return null
  return db.get('trips', tripId)
}

export async function cacheItinerary(tripId: string, days: unknown) {
  const db = await getDB()
  if (!db) return
  await db.put('itinerary', { trip_id: tripId, days, cached_at: Date.now() })
}

export async function getCachedItinerary(tripId: string) {
  const db = await getDB()
  if (!db) return null
  return db.get('itinerary', tripId)
}
