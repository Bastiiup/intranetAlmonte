/**
 * Almacén de trampolines (QR con redirección): múltiples entradas con nombre, descripción y métricas.
 * Persiste en un JSON en disco. En Railway conviene montar un volumen en .data si se redeploya.
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

const FILENAME = 'mira-trampolin.json'

function getDataDir(): string {
  const base = process.env.MIRA_TRAMPOLIN_DATA_PATH || path.join(process.cwd(), '.data')
  return path.isAbsolute(base) ? base : path.join(process.cwd(), base)
}

function getFilePath(): string {
  return path.join(getDataDir(), FILENAME)
}

export type TrampolinEntry = {
  id: string
  urlDestino: string
  nombre: string
  descripcion: string
  visitas: number
}

type Store = {
  trampolines: TrampolinEntry[]
}

function normalizeEntry(raw: Record<string, unknown>): TrampolinEntry {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    urlDestino: typeof raw.urlDestino === 'string' ? raw.urlDestino : '',
    nombre: typeof raw.nombre === 'string' ? raw.nombre : '',
    descripcion: typeof raw.descripcion === 'string' ? raw.descripcion : '',
    visitas: typeof raw.visitas === 'number' && raw.visitas >= 0 ? raw.visitas : 0,
  }
}

function generateId(): string {
  return randomBytes(4).toString('base64url').slice(0, 8)
}

async function readStore(): Promise<Store> {
  try {
    const filePath = getFilePath()
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.trampolines)) {
      return {
        trampolines: parsed.trampolines.map((t: Record<string, unknown>) => normalizeEntry(t)),
      }
    }
    if (typeof parsed.urlDestino === 'string') {
      return {
        trampolines: [
          normalizeEntry({
            id: 'default',
            urlDestino: parsed.urlDestino,
            nombre: '',
            descripcion: '',
            visitas: 0,
          }),
        ],
      }
    }
  } catch {
    // file not found or invalid
  }
  return { trampolines: [] }
}

async function writeStore(store: Store): Promise<void> {
  const dir = getDataDir()
  await mkdir(dir, { recursive: true })
  const filePath = getFilePath()
  await writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8')
}

export async function listTrampolines(): Promise<TrampolinEntry[]> {
  const store = await readStore()
  return store.trampolines
}

export async function getTrampolin(id: string): Promise<TrampolinEntry | null> {
  const store = await readStore()
  const found = store.trampolines.find((t) => t.id === id)
  return found ? normalizeEntry(found) : null
}

export async function createTrampolin(init: Partial<Pick<TrampolinEntry, 'urlDestino' | 'nombre' | 'descripcion'>> = {}): Promise<TrampolinEntry> {
  const store = await readStore()
  let id = generateId()
  while (store.trampolines.some((t) => t.id === id)) id = generateId()
  const entry: TrampolinEntry = {
    id,
    urlDestino: init.urlDestino ?? '',
    nombre: init.nombre ?? '',
    descripcion: init.descripcion ?? '',
    visitas: 0,
  }
  store.trampolines.push(entry)
  await writeStore(store)
  return entry
}

export type TrampolinUpdate = Partial<Pick<TrampolinEntry, 'urlDestino' | 'nombre' | 'descripcion'>>

export async function updateTrampolin(id: string, update: TrampolinUpdate): Promise<boolean> {
  const store = await readStore()
  const idx = store.trampolines.findIndex((t) => t.id === id)
  if (idx === -1) return false
  const cur = store.trampolines[idx]
  store.trampolines[idx] = {
    ...cur,
    ...(typeof update.urlDestino === 'string' && { urlDestino: update.urlDestino }),
    ...(typeof update.nombre === 'string' && { nombre: update.nombre }),
    ...(typeof update.descripcion === 'string' && { descripcion: update.descripcion }),
  }
  await writeStore(store)
  return true
}

export async function incrementVisitas(id: string): Promise<void> {
  const store = await readStore()
  const idx = store.trampolines.findIndex((t) => t.id === id)
  if (idx === -1) return
  store.trampolines[idx].visitas = (store.trampolines[idx].visitas || 0) + 1
  await writeStore(store)
}

export async function deleteTrampolin(id: string): Promise<boolean> {
  const store = await readStore()
  const before = store.trampolines.length
  store.trampolines = store.trampolines.filter((t) => t.id !== id)
  if (store.trampolines.length === before) return false
  await writeStore(store)
  return true
}
