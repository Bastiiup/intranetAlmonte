/**
 * Almacén de trampolines MIRA (múltiples QR con URL de destino editable cada uno).
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
}

type Store = {
  trampolines: TrampolinEntry[]
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
      return { trampolines: parsed.trampolines }
    }
    if (typeof parsed.urlDestino === 'string') {
      return { trampolines: [{ id: 'default', urlDestino: parsed.urlDestino }] }
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
  return store.trampolines.find((t) => t.id === id) ?? null
}

export async function createTrampolin(urlDestino: string = ''): Promise<TrampolinEntry> {
  const store = await readStore()
  let id = generateId()
  while (store.trampolines.some((t) => t.id === id)) id = generateId()
  const entry: TrampolinEntry = { id, urlDestino }
  store.trampolines.push(entry)
  await writeStore(store)
  return entry
}

export async function updateTrampolin(id: string, urlDestino: string): Promise<boolean> {
  const store = await readStore()
  const idx = store.trampolines.findIndex((t) => t.id === id)
  if (idx === -1) return false
  store.trampolines[idx] = { ...store.trampolines[idx], urlDestino }
  await writeStore(store)
  return true
}

export async function deleteTrampolin(id: string): Promise<boolean> {
  const store = await readStore()
  const before = store.trampolines.length
  store.trampolines = store.trampolines.filter((t) => t.id !== id)
  if (store.trampolines.length === before) return false
  await writeStore(store)
  return true
}
