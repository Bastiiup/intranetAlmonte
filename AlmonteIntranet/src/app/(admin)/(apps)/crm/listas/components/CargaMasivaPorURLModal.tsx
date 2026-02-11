'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormLabel,
  FormControl,
  Alert,
  Table,
  Badge,
  Spinner,
  ProgressBar,
  OverlayTrigger,
  Popover,
} from 'react-bootstrap'
import { LuLink, LuMinimize2, LuMaximize2, LuCheck, LuX, LuExternalLink } from 'react-icons/lu'
import Select from 'react-select'
import { toast } from 'react-hot-toast'
import { startCargaMasivaUpload } from '../lib/cargaMasivaBackgroundUpload'

interface CargaMasivaPorURLModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ColegioOption {
  value: number | string
  label: string
  rbd?: number
}

interface ScrapedItem {
  label: string
  href: string
  courseName?: string
}

interface ProcessedItem extends ScrapedItem {
  estado: 'pendiente' | 'procesando' | 'completado' | 'error'
  mensaje?: string
}

export default function CargaMasivaPorURLModal({
  show,
  onHide,
  onSuccess,
}: CargaMasivaPorURLModalProps) {
  const [step, setStep] = useState<'config' | 'list' | 'processing' | 'results' | 'background'>('config')
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [selectedColegio, setSelectedColegio] = useState<ColegioOption | null>(null)
  const [año, setAño] = useState<number>(new Date().getFullYear())
  const [urlOriginal, setUrlOriginal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapedItems, setScrapedItems] = useState<ProcessedItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const router = useRouter()

  const goToCursosColegio = () => {
    const colegioId = selectedColegio?.value
    if (colegioId) {
      router.push(`/crm/listas/colegio/${colegioId}`)
      onSuccess?.()
      handleClose()
    }
  }

  const loadColegios = async () => {
    setLoadingColegios(true)
    try {
      const cacheKey = 'colegios-list-cache'
      const cacheTime = 5 * 60 * 1000
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < cacheTime) {
          setColegios(cachedData)
          setLoadingColegios(false)
          return
        }
      }
      const response = await fetch('/api/crm/colegios?page=1&pageSize=1000&populate=false', { cache: 'force-cache' })
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        const options: ColegioOption[] = data.data.map((colegio: any) => {
          const nombre = colegio.colegio_nombre || colegio.nombre || 'Sin nombre'
          const rbd = colegio.rbd
          return {
            value: colegio.documentId || colegio.id,
            label: `${nombre}${rbd ? ` (RBD: ${rbd})` : ''}`,
            rbd,
            data: { rbd },
          } as ColegioOption & { data: { rbd?: number } }
        })
        localStorage.setItem(cacheKey, JSON.stringify({ data: options, timestamp: Date.now() }))
        setColegios(options)
      }
    } catch (err: any) {
      setError('Error al cargar colegios: ' + err.message)
    } finally {
      setLoadingColegios(false)
    }
  }

  useEffect(() => {
    if (show && colegios.length === 0) loadColegios()
  }, [show, colegios.length])

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedColegio || !año || !urlOriginal.trim()) {
      setError('Complete colegio, año y URL.')
      return
    }
    if (!urlOriginal.trim().startsWith('http')) {
      setError('La URL debe comenzar con http:// o https://')
      return
    }
    setScraping(true)
    toast.loading('Escrapeando la página...', { id: 'scrape', position: 'top-right' })
    try {
      const res = await fetch(`/api/crm/listas/scrape-url?url=${encodeURIComponent(urlOriginal.trim())}`)
      const json = await res.json()
      toast.dismiss('scrape')
      if (!json.success) {
        setError(json.error || 'Error al escrapear')
        toast.error('Error', json.error)
        return
      }
      const items: ProcessedItem[] = (json.data || []).map((x: ScrapedItem) => ({
        ...x,
        estado: 'pendiente' as const,
      }))
      setScrapedItems(items)
      setStep('list')
      toast.success('Listo', `Se encontraron ${items.length} enlaces`)
    } catch (err: any) {
      toast.dismiss('scrape')
      setError(err.message || 'Error al escrapear')
      toast.error('Error', err.message)
    } finally {
      setScraping(false)
    }
  }

  const handleProcesar = async () => {
    if (!selectedColegio || scrapedItems.length === 0) return
    const Swal = (await import('sweetalert2')).default
    const result = await Swal.fire({
      title: '¿Confirmar subida?',
      text: `Se descargarán y asignarán ${scrapedItems.length} PDF(s) a los cursos del colegio. Podrás cerrar esta ventana o cambiar de página; la subida continuará en segundo plano. ¿Deseas continuar?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, descargar y asignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    })
    if (!result.isConfirmed) return

    startCargaMasivaUpload(
      scrapedItems.map((item) => ({ href: item.href, label: item.label, courseName: item.courseName })),
      selectedColegio.value,
      año
    )
    setStep('background')
    setProcessing(false)
  }

  const handleClose = () => {
    if (!processing || step === 'background') {
      setStep('config')
      setUrlOriginal('')
      setError(null)
      setSelectedColegio(null)
      setAño(new Date().getFullYear())
      setScrapedItems([])
      setProgress(0)
      setMinimized(false)
      onHide()
    }
  }

  const successCount = scrapedItems.filter((s) => s.estado === 'completado').length
  const errorCount = scrapedItems.filter((s) => s.estado === 'error').length

  const modalContent = (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      backdrop={processing && step !== 'background' ? 'static' : true}
    >
      <ModalHeader closeButton={!processing || step === 'background'}>
        <div className="d-flex align-items-center justify-content-between w-100 me-3">
          <ModalTitle className="d-flex align-items-center gap-2">
            <LuLink className="fs-5" />
            Carga Masiva por URL
          </ModalTitle>
          {(processing || step === 'background') && (
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setMinimized(true)}
              className="d-flex align-items-center gap-1"
              title="Minimizar y seguir trabajando (la subida continúa en segundo plano)"
            >
              <LuMinimize2 size={18} />
              <span className="small">Minimizar</span>
            </Button>
          )}
        </div>
      </ModalHeader>
      <ModalBody>
        {error && (
          <Alert variant="danger" className="mb-3" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {step === 'config' && (
          <Form onSubmit={handleScrape}>
            <p className="text-muted mb-3">
              Indique colegio (RBD), año y la URL de la página de listas. El sistema escrapeará la página y descargará los PDFs asignándolos a cada curso.
            </p>
            <FormGroup className="mb-3">
              <FormLabel>Colegio <span className="text-danger">*</span></FormLabel>
              <Select
                options={colegios}
                value={selectedColegio}
                onChange={(o) => setSelectedColegio(o)}
                placeholder="Selecciona un colegio o busca por RBD..."
                isLoading={loadingColegios}
                isClearable
                isSearchable
                filterOption={(option: any, searchText: string) => {
                  if (!searchText) return true
                  const search = searchText.toLowerCase()
                  const label = String(option.label || '').toLowerCase()
                  const rbd = (option.data?.rbd ?? option.rbd) != null ? String(option.data?.rbd ?? option.rbd) : ''
                  return label.includes(search) || rbd.includes(search)
                }}
                formatOptionLabel={(option: any) => (
                  <div>
                    <div>{option.label}</div>
                    {option.data?.rbd != null && <small className="text-muted">RBD: {option.data.rbd}</small>}
                  </div>
                )}
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `No se encontró colegio con "${inputValue}"` : 'No hay colegios disponibles'
                }
              />
              <small className="text-muted">💡 Busca por nombre o RBD</small>
            </FormGroup>
            <FormGroup className="mb-3">
              <FormLabel>Año <span className="text-danger">*</span></FormLabel>
              <FormControl
                as="select"
                value={año}
                onChange={(e) => setAño(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 11 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i
                  return <option key={y} value={y}>{y}</option>
                })}
              </FormControl>
            </FormGroup>
            <FormGroup className="mb-3">
              <FormLabel>URL <span className="text-danger">*</span></FormLabel>
              <FormControl
                type="url"
                placeholder="https://colegio.cl/lista-de-utiles"
                value={urlOriginal}
                onChange={(e) => setUrlOriginal(e.target.value)}
                disabled={scraping}
              />
              <small className="text-muted">URL de la página con enlaces a los PDFs de listas.</small>
            </FormGroup>
            <div className="d-flex justify-content-end">
              <Button type="submit" variant="primary" disabled={scraping || !selectedColegio || !año || !urlOriginal.trim()}>
                {scraping ? <><Spinner animation="border" size="sm" className="me-2" /> Escrapeando...</> : 'Continuar'}
              </Button>
            </div>
          </Form>
        )}

        {step === 'list' && (
          <div>
            <Alert variant="info" className="mb-3">
              <strong>Colegio:</strong> {selectedColegio?.label} · <strong>Año:</strong> {año} · <strong>URL:</strong>{' '}
              <a href={urlOriginal} target="_blank" rel="noopener noreferrer" className="text-break">{urlOriginal}</a>
            </Alert>
            <p className="mb-2">Se encontraron <strong>{scrapedItems.length}</strong> enlaces. Quita los que no correspondan con el botón ✕ y luego inicia la descarga.</p>
            <Alert variant="warning" className="mb-3">
              <strong>Verifica los nombres:</strong> el texto de cada fila (Curso / Etiqueta) quedará como nombre del curso. El escrapeo puede cometer errores; considera revisar y editar antes de continuar.
            </Alert>
            <Table striped bordered size="sm" className="mb-3">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Curso / Etiqueta</th>
                  <th>Enlace</th>
                </tr>
              </thead>
              <tbody>
                {scrapedItems.map((item, idx) => {
                  const isDriveOrBlocked = /drive\.google\.com|docs\.google\.com|dropbox\.com|onedrive\.live\.com/i.test(item.href)
                  let isSameOrigin = false
                  try {
                    if (typeof window !== 'undefined') {
                      isSameOrigin = new URL(item.href).origin === window.location.origin
                    }
                  } catch {
                    // URL inválida
                  }
                  const showIframe = !isDriveOrBlocked && isSameOrigin
                  const previewPopover = (
                    <Popover id={`preview-${idx}`} className="shadow" style={{ maxWidth: 420 }}>
                      <Popover.Header as="h6" className="small">
                        Vista previa · {item.label}
                      </Popover.Header>
                      <Popover.Body className="p-0">
                        {!showIframe ? (
                          <div className="p-3 text-muted small">
                            <p className="mb-2">
                              {isDriveOrBlocked
                                ? 'Vista previa no disponible (Google Drive u otros servicios bloquean la incorporación).'
                                : 'Muchos sitios (p. ej. colegios) no permiten mostrarse dentro de otra página por seguridad. Usa el enlace para abrirlo en una pestaña.'}
                            </p>
                            <a href={item.href} target="_blank" rel="noopener noreferrer">
                              Abrir en nueva pestaña
                            </a>
                          </div>
                        ) : (
                          <>
                            <div style={{ width: 420, height: 320, background: '#f0f0f0' }}>
                              <iframe
                                title={`Vista previa ${item.label}`}
                                src={item.href}
                                style={{ width: '100%', height: '100%', border: 0 }}
                                sandbox="allow-same-origin allow-scripts"
                              />
                            </div>
                            <div className="p-2 small text-muted border-top">
                              <a href={item.href} target="_blank" rel="noopener noreferrer">
                                Abrir en nueva pestaña
                              </a>
                            </div>
                          </>
                        )}
                      </Popover.Body>
                    </Popover>
                  )
                  return (
                    <tr key={idx}>
                      <td className="text-center align-middle">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="p-1"
                          onClick={() => setScrapedItems((prev) => prev.filter((_, i) => i !== idx))}
                          title="Quitar este enlace"
                          aria-label="Quitar"
                        >
                          <LuX size={16} />
                        </Button>
                      </td>
                      <td className="align-middle">
                        <FormControl
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            setScrapedItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, label: e.target.value, courseName: e.target.value } : it))
                            )
                          }
                          placeholder="Nombre del curso"
                          size="sm"
                          className="border"
                        />
                      </td>
                      <td className="align-middle">
                        <OverlayTrigger
                          trigger={['hover', 'focus']}
                          delay={{ show: 400, hide: 150 }}
                          placement="left"
                          overlay={previewPopover}
                        >
                          <span className="d-inline-block">
                            <a href={item.href} target="_blank" rel="noopener noreferrer" className="small text-break">
                              {item.href}
                            </a>
                          </span>
                        </OverlayTrigger>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
            {scrapedItems.length === 0 && (
              <Alert variant="warning" className="mb-3">
                No quedan enlaces. Quita todos con ✕ o vuelve atrás para escrapear de nuevo.
              </Alert>
            )}
            <div className="d-flex justify-content-between">
              <Button variant="outline-secondary" onClick={() => setStep('config')}>
                Volver
              </Button>
              <Button variant="primary" onClick={handleProcesar} disabled={scrapedItems.length === 0}>
                Descargar y asignar PDFs
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div>
            <ProgressBar now={progress} label={`${progress}%`} className="mb-3" />
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Estado</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {scrapedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.label}</td>
                    <td>
                      {item.estado === 'pendiente' && <Badge bg="secondary">Pendiente</Badge>}
                      {item.estado === 'procesando' && <Badge bg="primary"><Spinner animation="border" size="sm" className="me-1" /> Procesando</Badge>}
                      {item.estado === 'completado' && <Badge bg="success"><LuCheck /> Completado</Badge>}
                      {item.estado === 'error' && <Badge bg="danger"><LuX /> Error</Badge>}
                    </td>
                    <td>{item.mensaje || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {step === 'background' && (
          <div>
            <Alert variant="info" className="mb-0">
              <strong>Subida en segundo plano</strong>
              <p className="mb-0 mt-2">
                La descarga y asignación de los {scrapedItems.length} PDF(s) se está realizando en segundo plano.
                Puedes <strong>cerrar esta ventana</strong>, <strong>minimizar</strong> o <strong>cambiar de página</strong>;
                la subida no se interrumpirá y recibirás notificaciones al finalizar.
              </p>
            </Alert>
          </div>
        )}

        {step === 'results' && (
          <div>
            <Alert variant={errorCount === 0 ? 'success' : 'warning'} className="mb-3">
              <strong>Procesamiento completado</strong><br />
              ✅ Exitosos: {successCount}{errorCount > 0 && <><br />❌ Errores: {errorCount}</>}
            </Alert>
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Estado</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {scrapedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.label}</td>
                    <td>
                      {item.estado === 'completado' && <Badge bg="success"><LuCheck /> Completado</Badge>}
                      {item.estado === 'error' && <Badge bg="danger"><LuX /> Error</Badge>}
                    </td>
                    <td>{item.mensaje || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'results' && (
          <>
            <Button
              variant="success"
              className="d-flex align-items-center gap-1"
              onClick={goToCursosColegio}
            >
              <LuExternalLink size={16} />
              Ver cursos del colegio
            </Button>
            <Button variant="outline-secondary" onClick={() => { onSuccess?.(); handleClose() }}>
              Cerrar
            </Button>
          </>
        )}
        {step === 'background' && (
          <Button variant="primary" onClick={handleClose}>
            Cerrar y seguir trabajando
          </Button>
        )}
        {step !== 'results' && step !== 'background' && (
          <Button variant="secondary" onClick={handleClose} disabled={processing}>
            Cancelar
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )

  if (minimized && (processing || step === 'results' || step === 'background')) {
    const completed = step === 'results'
    const inBackground = step === 'background'
    return (
      <>
        <div
          className="position-fixed bottom-0 end-0 m-3 p-3 rounded shadow bg-white border"
          style={{ zIndex: 9999, minWidth: 260 }}
        >
          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
            <span className="small fw-semibold">
              {completed ? 'Carga por URL completada' : inBackground ? 'Subida en segundo plano' : 'Carga por URL'}
            </span>
            <Button size="sm" variant="outline-primary" onClick={() => setMinimized(false)} title="Expandir">
              <LuMaximize2 size={18} />
            </Button>
          </div>
          {!completed && !inBackground && (
            <>
              <div className="d-flex align-items-center gap-2 small text-muted">
                <Spinner animation="border" size="sm" />
                <span>{progress}%</span>
              </div>
              <ProgressBar now={progress} className="mt-1" style={{ width: '100%' }} />
              <div className="small text-muted mt-1">Puedes seguir trabajando en otra pestaña</div>
            </>
          )}
          {inBackground && (
            <div className="small text-muted">
              La subida continúa en segundo plano. Recibirás notificaciones al finalizar.
            </div>
          )}
          {completed && (
            <div className="d-flex flex-column gap-2 mt-1">
              <div className="small text-success">
                ✅ {successCount} PDF(s) · {errorCount > 0 ? `${errorCount} error(es)` : 'Sin errores'}
              </div>
              <Button size="sm" variant="success" onClick={goToCursosColegio} className="d-flex align-items-center justify-content-center gap-1">
                <LuExternalLink size={14} />
                Ver cursos del colegio
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => setMinimized(false)}>
                Ver resumen
              </Button>
            </div>
          )}
        </div>
      </>
    )
  }

  return <>{modalContent}</>
}
