import { openDB } from 'idb'

const DB_NAME  = 'chatapp-offline'
const DB_VER   = 1
const STORE    = 'queue'

async function getDB() {
  return openDB(DB_NAME, DB_VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

export async function enqueue(payload) {
  const db = await getDB()
  await db.add(STORE, { ...payload, queued_at: Date.now() })
}

export async function dequeue() {
  const db   = await getDB()
  const all  = await db.getAll(STORE)
  return all
}

export async function removeFromQueue(id) {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function clearQueue() {
  const db = await getDB()
  await db.clear(STORE)
}