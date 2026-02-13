'use client'

import BunnyPlayer from '@/components/ui/BunnyPlayer'

export interface RecursoMira {
  id: number | string
  documentId?: string
  nombre: string
  tipo: 'video' | 'guia_pdf' | 'imagen' | 'enlace_externo'
  video_id?: string | null
  orden?: number | null
  archivo_adjunto?: {
    url: string
    name?: string
  } | null
}

export interface ListaRecursosProps {
  recursos: RecursoMira[]
}

function esUrl(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false
  return str.startsWith('http://') || str.startsWith('https://')
}

export default function ListaRecursos({ recursos }: ListaRecursosProps) {
  const ordenados = [...recursos].sort((a, b) => {
    const ordA = a.orden ?? 9999
    const ordB = b.orden ?? 9999
    return ordA - ordB
  })

  if (ordenados.length === 0) {
    return (
      <p className="text-muted mb-0">No hay recursos disponibles para este libro.</p>
    )
  }

  return (
    <div className="row g-4">
      {ordenados.map((item) => (
        <div key={item.id ?? item.documentId ?? item.nombre} className="col-12 col-lg-6">
          {item.tipo === 'video' && item.video_id ? (
            <div className="card h-100 border shadow-sm">
              <div className="card-body p-2 p-md-3">
                <h6 className="card-title fw-semibold mb-2">{item.nombre}</h6>
                <BunnyPlayer videoId={item.video_id} title={item.nombre} />
              </div>
            </div>
          ) : (
            <div className="card h-100 border shadow-sm">
              <div className="card-body d-flex flex-column justify-content-center align-items-center text-center py-4">
                <span className="text-muted mb-2">
                  {item.tipo === 'guia_pdf' && '📄'}
                  {item.tipo === 'imagen' && '🖼️'}
                  {item.tipo === 'enlace_externo' && '🔗'}
                </span>
                <h6 className="card-title fw-semibold mb-2">{item.nombre}</h6>
                {(item.archivo_adjunto?.url || (item.tipo === 'enlace_externo' && esUrl(item.video_id) && item.video_id)) && (
                  <a
                    href={item.archivo_adjunto?.url ?? (item.tipo === 'enlace_externo' ? item.video_id! : '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    Abrir recurso
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
