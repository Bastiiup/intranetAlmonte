'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Offcanvas, Button, Row, Col, Spinner, Alert, Tabs, Tab } from 'react-bootstrap'
import { LuX, LuSave, LuRefreshCw, LuFileText } from 'react-icons/lu'
import MaterialesForm from './MaterialesForm'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[ListaDetailDrawer]', ...args)
  }
}

// Importar PDFViewer dinámicamente sin SSR para evitar problemas con canvas
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
      <Spinner animation="border" variant="light" />
      <div className="text-light ms-2">Cargando visor PDF...</div>
    </div>
  ),
})

interface MaterialItem {
  relacion_orden?: string
  asignatura: string
  relacion_orden_num?: number
  cantidad: string
  categoria: string
  imagen?: string
  item: string
  marca: string
  isbn?: string
  notas?: string
  boton?: string
}

interface ListaDetailDrawerProps {
  show: boolean
  onHide: () => void
  lista: {
    id: number | string
    documentId?: string
    nombre: string
    pdf_id?: number | string
    pdf_url?: string
    pdf_nombre?: string
    versiones?: any[]
  } | null
  onSave?: () => void
}

export default function ListaDetailDrawer({ show, onHide, lista, onSave }: ListaDetailDrawerProps) {
  const [materiales, setMateriales] = useState<MaterialItem[]>([])
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pdf' | 'form'>('pdf')
  const [isMobile, setIsMobile] = useState(false)

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Cargar materiales existentes cuando se abre el drawer
  useEffect(() => {
    if (show && lista) {
      loadMateriales()
    } else {
      setMateriales([])
      setError(null)
      setSuccess(null)
    }
  }, [show, lista])

  const loadMateriales = async () => {
    if (!lista) return

    setLoading(true)
    setError(null)

    try {
      // Obtener los materiales desde la versión más reciente
      // Usar el ID correcto (priorizar documentId si existe, sino usar id)
      const listaId = lista.documentId || lista.id
      if (!listaId) {
        throw new Error('No se pudo obtener el ID de la lista')
      }
      
      debugLog('[ListaDetailDrawer] Cargando materiales para lista ID:', listaId)
      const response = await fetch(`/api/crm/listas/${listaId}`)
      
      // Verificar que la respuesta sea válida antes de parsear JSON
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || 'Error desconocido'}`)
      }
      
      // Verificar que haya contenido
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Respuesta no es JSON: ${text.substring(0, 100)}`)
      }
      
      let result: any
      try {
        const text = await response.text()
        if (!text || text.trim() === '') {
          throw new Error('Respuesta vacía del servidor')
        }
        result = JSON.parse(text)
      } catch (parseError: any) {
        console.error('Error al parsear JSON:', parseError)
        throw new Error('Error al parsear respuesta del servidor: ' + parseError.message)
      }

      if (result.success && result.data) {
        const versiones = result.data.versiones || result.data.versiones_materiales || []
        if (versiones.length > 0) {
          const ultimaVersion = versiones[versiones.length - 1]
          const materialesData = ultimaVersion.materiales || []
          setMateriales(materialesData)
        } else {
          setMateriales([])
        }
      } else {
        setMateriales([])
        // Si hay un error en la respuesta, mostrarlo
        if (result.error) {
          console.warn('API devolvió error:', result.error)
        }
      }
    } catch (err: any) {
      console.error('Error al cargar materiales:', err)
      // Si es error de JSON, dar mensaje más específico
      if (err.message?.includes('JSON') || err.message?.includes('Unexpected')) {
        setError('Error al parsear respuesta del servidor. Verifica que la API esté funcionando correctamente.')
      } else {
        setError('Error al cargar materiales: ' + (err.message || 'Error desconocido'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExtractPDF = async () => {
    if (!lista?.pdf_id) {
      setError('No hay PDF disponible para extraer')
      return
    }

    setExtracting(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/listas/${lista.id || lista.documentId}/extract-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_id: lista.pdf_id,
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.materiales) {
        setMateriales(result.data.materiales)
        setSuccess('Materiales extraídos correctamente del PDF')
        // Cambiar a tab de formularios en móvil
        if (isMobile) {
          setActiveTab('form')
        }
      } else {
        setError(result.error || 'Error al extraer datos del PDF')
      }
    } catch (err: any) {
      console.error('Error al extraer PDF:', err)
      setError('Error al extraer PDF: ' + (err.message || 'Error desconocido'))
    } finally {
      setExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!lista) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/crm/listas/${lista.id || lista.documentId}/materiales`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materiales,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Materiales guardados correctamente')
        if (onSave) {
          onSave()
        }
      } else {
        setError(result.error || 'Error al guardar materiales')
      }
    } catch (err: any) {
      console.error('Error al guardar:', err)
      setError('Error al guardar: ' + (err.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const handleMaterialesChange = (newMateriales: MaterialItem[]) => {
    setMateriales(newMateriales)
  }

  if (!lista) return null

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="end"
      style={{ width: isMobile ? '100%' : '90vw', maxWidth: '1400px' }}
    >
      <Offcanvas.Header className="border-bottom">
        <Offcanvas.Title className="d-flex align-items-center gap-2">
          <LuFileText size={20} />
          <div>
            <div className="fw-bold">{lista.nombre}</div>
            <small className="text-muted">Edición de Materiales</small>
          </div>
        </Offcanvas.Title>
        <Button variant="link" className="p-0 ms-auto" onClick={onHide}>
          <LuX size={24} />
        </Button>
      </Offcanvas.Header>

      <Offcanvas.Body className="p-0">
        {error && (
          <Alert variant="danger" className="m-3" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="m-3" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {isMobile ? (
          // Vista móvil: Tabs
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k as 'pdf' | 'form')} className="m-3">
            <Tab eventKey="pdf" title="PDF">
              <div className="mt-3" style={{ height: 'calc(100vh - 200px)' }}>
                {lista.pdf_id ? (
                  <PDFViewer pdfId={lista.pdf_id} pdfUrl={lista.pdf_url} />
                ) : (
                  <Alert variant="info">No hay PDF disponible</Alert>
                )}
              </div>
            </Tab>
            <Tab eventKey="form" title="Materiales">
              <div className="mt-3">
                <MaterialesForm
                  materiales={materiales}
                  onChange={handleMaterialesChange}
                  loading={loading}
                />
              </div>
            </Tab>
          </Tabs>
        ) : (
          // Vista desktop: Split view
          <Row className="g-0" style={{ height: 'calc(100vh - 120px)' }}>
            <Col md={6} className="border-end" style={{ overflow: 'auto' }}>
              <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Vista del PDF</h6>
                {lista.pdf_id && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleExtractPDF}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Extrayendo...
                      </>
                    ) : (
                      <>
                        <LuRefreshCw className="me-2" />
                        Extraer Datos
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div style={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
                {lista.pdf_id ? (
                  <PDFViewer pdfId={lista.pdf_id} pdfUrl={lista.pdf_url} />
                ) : (
                  <Alert variant="info" className="m-3">
                    No hay PDF disponible
                  </Alert>
                )}
              </div>
            </Col>
            <Col md={6} style={{ overflow: 'auto' }}>
              <div className="p-3 border-bottom bg-light">
                <h6 className="mb-0">Materiales ({materiales.length})</h6>
              </div>
              <div style={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
                <MaterialesForm
                  materiales={materiales}
                  onChange={handleMaterialesChange}
                  loading={loading}
                />
              </div>
            </Col>
          </Row>
        )}

        {/* Botones de acción */}
        <div className="border-top p-3 bg-light d-flex justify-content-between">
          <Button variant="outline-secondary" onClick={onHide}>
            Cancelar
          </Button>
          <div className="d-flex gap-2">
            {lista.pdf_id && (
              <Button
                variant="outline-primary"
                onClick={handleExtractPDF}
                disabled={extracting}
              >
                {extracting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Extrayendo...
                  </>
                ) : (
                  <>
                    <LuRefreshCw className="me-2" />
                    Extraer del PDF
                  </>
                )}
              </Button>
            )}
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <LuSave className="me-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}

