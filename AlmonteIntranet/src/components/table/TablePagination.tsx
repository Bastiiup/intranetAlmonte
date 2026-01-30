'use client'
import clsx from 'clsx'
import { Col, Row } from 'react-bootstrap'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

export type TablePaginationProps = {
  totalItems: number
  start: number
  end: number
  itemsName?: string
  showInfo?: boolean
  // Pagination control props
  previousPage: () => void
  canPreviousPage: boolean
  pageCount: number
  pageIndex: number
  setPageIndex: (index: number) => void
  nextPage: () => void
  canNextPage: boolean
  className?:string
}

const TablePagination = ({
  totalItems,
  start,
  end,
  itemsName = 'items',
  showInfo,
  previousPage,
  canPreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  nextPage,
  canNextPage,
  className
}: TablePaginationProps) => {
  // Función para generar las páginas a mostrar
  const getVisiblePages = () => {
    const currentPage = pageIndex + 1 // Convertir a 1-based
    const delta = 2 // Número de páginas a mostrar a cada lado de la actual
    const pages: (number | string)[] = []
    
    // Si hay pocas páginas, mostrar todas
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1)
    }
    
    // Siempre mostrar primera página
    pages.push(1)
    
    // Calcular el rango de páginas alrededor de la actual
    let startPage = Math.max(2, currentPage - delta)
    let endPage = Math.min(pageCount - 1, currentPage + delta)
    
    // Ajustar si estamos cerca del inicio
    if (currentPage <= delta + 2) {
      endPage = Math.min(5, pageCount - 1)
    }
    
    // Ajustar si estamos cerca del final
    if (currentPage >= pageCount - delta - 1) {
      startPage = Math.max(2, pageCount - 4)
    }
    
    // Agregar "..." si hay un gap
    if (startPage > 2) {
      pages.push('...')
    }
    
    // Agregar páginas del rango
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    // Agregar "..." si hay un gap
    if (endPage < pageCount - 1) {
      pages.push('...')
    }
    
    // Siempre mostrar última página
    if (pageCount > 1) {
      pages.push(pageCount)
    }
    
    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <Row className={clsx('align-items-center text-center text-sm-start', showInfo ? 'justify-content-between' : 'justify-content-end')}>
      {showInfo && (
        <Col sm>
          <div className="text-muted">
            Mostrando <span className="fw-semibold">{start}</span> a <span className="fw-semibold">{end}</span> de{' '}
            <span className="fw-semibold">{totalItems.toLocaleString()}</span> {itemsName}
          </div>
        </Col>
      )}
      <Col sm="auto" className="mt-3 mt-sm-0">
        <div>
          <ul className={clsx('pagination pagination-boxed mb-0 justify-content-center pagination-sm', className)}>
            {/* Botón Primera Página */}
            <li className="page-item">
              <button 
                className="page-link" 
                onClick={() => setPageIndex(0)} 
                disabled={!canPreviousPage}
                title="Primera página"
              >
                <TbChevronsLeft />
              </button>
            </li>

            {/* Botón Página Anterior */}
            <li className="page-item">
              <button 
                className="page-link" 
                onClick={() => previousPage()} 
                disabled={!canPreviousPage}
                title="Página anterior"
              >
                <TbChevronLeft />
              </button>
            </li>

            {/* Páginas visibles */}
            {visiblePages.map((page, idx) => {
              if (page === '...') {
                return (
                  <li key={`ellipsis-${idx}`} className="page-item disabled">
                    <span className="page-link">...</span>
                  </li>
                )
              }
              
              const pageNum = page as number
              const isActive = pageIndex === pageNum - 1 // Convertir a 0-based
              
              return (
                <li key={pageNum} className={`page-item ${isActive ? 'active' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setPageIndex(pageNum - 1)}
                  >
                    {pageNum.toLocaleString()}
                  </button>
                </li>
              )
            })}

            {/* Botón Página Siguiente */}
            <li className="page-item">
              <button 
                className="page-link" 
                onClick={() => nextPage()} 
                disabled={!canNextPage}
                title="Página siguiente"
              >
                <TbChevronRight />
              </button>
            </li>

            {/* Botón Última Página */}
            <li className="page-item">
              <button 
                className="page-link" 
                onClick={() => setPageIndex(pageCount - 1)} 
                disabled={!canNextPage}
                title="Última página"
              >
                <TbChevronsRight />
              </button>
            </li>
          </ul>
        </div>
      </Col>
    </Row>
  )
}

export default TablePagination
