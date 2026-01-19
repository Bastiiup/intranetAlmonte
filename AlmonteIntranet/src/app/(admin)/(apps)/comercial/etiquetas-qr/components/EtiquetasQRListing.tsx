'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardFooter, CardHeader, Col, Row, Badge, Alert, Modal, Button } from 'react-bootstrap'
import { LuSearch, LuEye, LuDownload } from 'react-icons/lu'

import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'

interface EtiquetaQRType {
  id: number | string
  documentId?: string
  numeroOrden: string
  apoderado: string
  alumno: string
  colegio: string
  año: number
  fecha: string // Formato ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ'
  estado: 'generado' | 'impreso' | 'archivado'
  pdfUrl?: string
  pdfId?: number | string // ID del archivo PDF en Strapi
}

interface EtiquetasQRListingProps {
  pdfs: any[]
  error: string | null
}

export default function EtiquetasQRListing({ pdfs: pdfsProp, error: errorProp }: EtiquetasQRListingProps) {
  // Los datos ya vienen transformados desde la API /api/comercial/etiquetas-qr
  const mappedPDFs = useMemo(() => {
    if (!pdfsProp || !Array.isArray(pdfsProp)) return []

    const mapped = pdfsProp.map((pdf: any) => ({
      id: pdf.id || pdf.documentId,
      documentId: pdf.documentId || String(pdf.id || ''),
      numeroOrden: pdf.numeroOrden || '',
      apoderado: pdf.apoderado || 'N/A',
      alumno: pdf.alumno || 'N/A',
      colegio: pdf.colegio || '',
      año: pdf.año || new Date().getFullYear(),
      fecha: pdf.fecha || new Date().toISOString(),
      estado: (pdf.estado || 'generado') as 'generado' | 'impreso' | 'archivado',
      pdfUrl: pdf.pdfUrl || undefined,
      pdfId: pdf.pdfId || undefined,
    } as EtiquetaQRType))

    // Log para debugging (solo los primeros 2 registros)
    if (typeof window !== 'undefined' && mapped.length > 0) {
      console.log('[EtiquetasQR] PDFs mapeados:', {
        total: mapped.length,
        primeros: mapped.slice(0, 2).map(p => ({
          numeroOrden: p.numeroOrden,
          tienePdfUrl: !!p.pdfUrl,
          pdfUrl: p.pdfUrl,
        }))
      })
    }

    return mapped
  }, [pdfsProp])

  const [data, setData] = useState<EtiquetaQRType[]>(mappedPDFs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(errorProp)
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)

  // Actualizar datos cuando cambien las props
  useEffect(() => {
    setData(mappedPDFs)
    setError(errorProp)
  }, [mappedPDFs, errorProp])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'fecha', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const columns: ColumnDef<EtiquetaQRType, any>[] = useMemo(
    () => [
      {
        id: 'numeroOrden',
        header: 'N° ORDEN',
        accessorKey: 'numeroOrden',
        enableSorting: true,
        enableColumnFilter: true,
        cell: ({ row }) => (
          <span className="fw-semibold">{row.original.numeroOrden}</span>
        ),
      },
      {
        id: 'apoderado',
        header: 'APODERADO',
        accessorKey: 'apoderado',
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'includesString',
        cell: ({ row }) => row.original.apoderado,
      },
      {
        id: 'alumno',
        header: 'ALUMNO',
        accessorKey: 'alumno',
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'includesString',
        cell: ({ row }) => row.original.alumno,
      },
      {
        id: 'colegio',
        header: 'COLEGIO',
        accessorKey: 'colegio',
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'includesString',
        cell: ({ row }) => row.original.colegio,
      },
      {
        id: 'año',
        header: 'AÑO',
        accessorKey: 'año',
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'equalsString',
        cell: ({ row }) => row.original.año,
      },
      {
        id: 'fecha',
        header: 'FECHA',
        accessorKey: 'fecha',
        enableSorting: true,
        cell: ({ row }) => {
          const fechaStr = row.original.fecha
          if (!fechaStr) return '-'

          try {
            const fecha = new Date(fechaStr)

            const fechaFormateada = fecha.toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })

            const horaFormateada = fecha.toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })

            return `${fechaFormateada}, ${horaFormateada.toLowerCase()}`
          } catch {
            return fechaStr
          }
        },
      },
      {
        id: 'estado',
        header: 'ESTADO',
        accessorKey: 'estado',
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'equalsString',
        cell: ({ row }) => {
          const estadoColors: Record<string, string> = {
            generado: 'info',
            impreso: 'success',
            archivado: 'secondary',
          }
          return (
            <Badge bg={estadoColors[row.original.estado] || 'secondary'}>
              {row.original.estado}
            </Badge>
          )
        },
      },
      {
        id: 'acciones',
        header: 'ACCIONES',
        cell: ({ row }) => {
          const pdfUrl = row.original.pdfUrl
          const tienePDF = pdfUrl && pdfUrl !== '#' && pdfUrl !== undefined && pdfUrl.trim() !== ''
          
          // Log para debugging (solo en desarrollo)
          if (typeof window !== 'undefined' && !tienePDF) {
            console.log('[EtiquetasQR] Sin PDF para orden:', {
              numeroOrden: row.original.numeroOrden,
              pdfUrl: pdfUrl,
              tipo: typeof pdfUrl,
            })
          }
          
          return (
            <div className="d-flex gap-2">
              {tienePDF ? (
                <>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      if (pdfUrl) {
                        // Usar endpoint proxy para visualizar en iframe (evita problemas de CORS)
                        const proxyUrl = `/api/comercial/etiquetas-qr/pdf?url=${encodeURIComponent(pdfUrl)}`
                        console.log('[EtiquetasQR] Abriendo PDF vía proxy:', { original: pdfUrl, proxy: proxyUrl })
                        setPdfViewerUrl(proxyUrl)
                        setShowPDFViewer(true)
                      }
                    }}
                    title={`Visualizar PDF - ${row.original.numeroOrden}`}
                  >
                    <LuEye className="me-1" />
                    Ver PDF
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => {
                      if (pdfUrl) {
                        const link = document.createElement('a')
                        link.href = pdfUrl
                        link.download = `etiqueta-qr-${row.original.numeroOrden}.pdf`
                        link.target = '_blank'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }
                    }}
                    title={`Descargar PDF - ${row.original.numeroOrden}`}
                  >
                    <LuDownload className="me-1" />
                    Descargar
                  </Button>
                </>
              ) : (
                <span className="text-muted small" title={pdfUrl || 'No hay URL de PDF disponible'}>
                  Sin PDF
                </span>
              )}
            </div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable<EtiquetaQRType>({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <Row>
      <Col xs={12}>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        <Card className="mb-4">
          <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex gap-2 flex-grow-1">
              <div className="app-search flex-grow-1" style={{ maxWidth: '300px' }}>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Buscar por orden, apoderado, alumno, colegio..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('colegio')?.getFilterValue() as string) ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    table.getColumn('colegio')?.setFilterValue(value === '' ? undefined : value)
                  }}>
                  <option value="">Colegio</option>
                  {Array.from(new Set(data.map((item) => item.colegio).filter(Boolean))).sort().map((colegio) => (
                    <option key={colegio} value={colegio}>
                      {colegio}
                    </option>
                  ))}
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('año')?.getFilterValue() as string) ?? ''}
                  onChange={(e) =>
                    table.getColumn('año')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)
                  }>
                  <option value="">Año</option>
                  {Array.from(new Set(data.map((item) => item.año).filter(Boolean)))
                    .sort((a, b) => b - a)
                    .map((año) => (
                      <option key={año} value={String(año)}>
                        {año}
                      </option>
                    ))}
                </select>
              </div>

              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'All'}
                  onChange={(e) =>
                    table.getColumn('estado')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
                  }>
                  <option value="All">Estado</option>
                  <option value="generado">Generado</option>
                  <option value="impreso">Impreso</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>

              <div>
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}>
                  {[5, 10, 15, 20, 25].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <DataTable<EtiquetaQRType>
            table={table}
            emptyMessage="No se encontraron etiquetas QR"
          />

          {table.getRowModel().rows.length > 0 && (
            <CardFooter className="border-0">
              <TablePagination
                totalItems={totalItems}
                start={start}
                end={end}
                itemsName="etiquetas QR"
                showInfo
                previousPage={table.previousPage}
                canPreviousPage={table.getCanPreviousPage()}
                pageCount={table.getPageCount()}
                pageIndex={table.getState().pagination.pageIndex}
                setPageIndex={table.setPageIndex}
                nextPage={table.nextPage}
                canNextPage={table.getCanNextPage()}
              />
            </CardFooter>
          )}
        </Card>
      </Col>

      {/* Modal para visualizar PDF */}
      <Modal 
        show={showPDFViewer} 
        onHide={() => { 
          setShowPDFViewer(false)
          setPdfViewerUrl(null)
        }} 
        size="xl" 
        fullscreen="lg-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <LuEye className="me-2" />
            Visualizar PDF - Etiqueta QR
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0, height: '80vh' }}>
          {pdfViewerUrl ? (
            <iframe
              src={pdfViewerUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="PDF Viewer"
              onError={(e) => {
                console.error('[EtiquetasQR] Error al cargar PDF:', pdfViewerUrl, e)
              }}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
              <div className="text-center">
                <p className="text-muted">No se pudo cargar el PDF</p>
                <p className="text-muted small">URL: {pdfViewerUrl || 'No disponible'}</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => { 
              setShowPDFViewer(false)
              setPdfViewerUrl(null)
            }}
          >
            Cerrar
          </Button>
          {pdfViewerUrl && (
            <Button
              variant="primary"
              onClick={() => {
                const link = document.createElement('a')
                link.href = pdfViewerUrl
                link.download = pdfViewerUrl.split('/').pop() || 'etiqueta-qr.pdf'
                link.target = '_blank'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              <LuDownload className="me-1" />
              Descargar PDF
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Row>
  )
}
