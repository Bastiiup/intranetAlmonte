/**
 * Gestor de subida en segundo plano para Carga Masiva por URL.
 * Ejecuta las peticiones fuera del ciclo de vida del modal para que el usuario
 * pueda cerrar el modal, cambiar de página o minimizar sin interrumpir la subida.
 */

'use client'

import { toast } from 'react-hot-toast'

export interface CargaMasivaItem {
  href: string
  label: string
  courseName?: string
}

/**
 * Inicia la descarga y asignación de PDFs en segundo plano.
 * No usa AbortController para que las peticiones no se cancelen al cerrar el modal o cambiar de página.
 */
export function startCargaMasivaUpload(
  items: CargaMasivaItem[],
  colegioId: number | string,
  año: number
): void {
  const total = items.length
  if (total === 0) return

  toast(
    'La carga continúa en segundo plano. Puedes cerrar el modal o cambiar de página. No recargues (F5) o se interrumpirá.',
    { duration: 8000, position: 'top-right', icon: '📤' }
  )

  let successCount = 0

  const run = async () => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      toast.loading(`Procesando ${i + 1}/${total}: ${item.label}`, {
        id: 'carga-masiva-progress',
        position: 'top-right',
        duration: Infinity,
      })
      try {
        const res = await fetch('/api/crm/listas/descargar-asignar-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfUrl: item.href,
            colegioId,
            año,
            label: item.label,
          }),
        })
        const json = await res.json()
        if (json.success) successCount++
        if (json.success) {
          toast.success(`OK: ${item.label}`, { id: 'carga-masiva-progress' })
        } else {
          toast.error(`${item.label}: ${json.error}`, { id: 'carga-masiva-progress' })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`${item.label}: ${msg}`, { id: 'carga-masiva-progress' })
      }
    }

    toast.dismiss('carga-masiva-progress')
    const errCount = total - successCount
    if (errCount === 0) {
      toast.success(`Carga completada: ${total} PDF(s).`, { duration: 5000, position: 'top-right' })
    } else {
      toast.success(`Finalizado: ${successCount} OK, ${errCount} error(es).`, {
        duration: 5000,
        position: 'top-right',
      })
    }

    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const match = pathname.match(/^(.*\/listas)/)
    const base = match ? match[1] : '/crm/listas'
    const verCursosPath = `${base}/colegio/${colegioId}`
    toast(
      (t) => (
        <span className="d-flex align-items-center gap-2 flex-wrap">
          <span>¿Ir a ver los cursos del colegio?</span>
          <a
            href={verCursosPath}
            className="btn btn-sm btn-primary"
            onClick={() => toast.dismiss(t.id)}
          >
            Ver cursos
          </a>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => toast.dismiss(t.id)}
          >
            Cerrar
          </button>
        </span>
      ),
      { duration: 15000, position: 'top-right' }
    )
  }

  run()
}
