/**
 * Componente para el resumen y botones de acción de productos
 */

'use client'

import { Badge, Button, Alert, Spinner } from 'react-bootstrap'
import { TbCheck, TbChecklist } from 'react-icons/tb'
import type { ProductoIdentificado, ListaData } from '../../types'

interface ProductosResumenProps {
  productos: ProductoIdentificado[]
  estadoRevision: 'borrador' | 'revisado' | 'publicado' | null
  loading: boolean
  isApproving: boolean
  onAprobarListaCompleta: (e?: React.MouseEvent) => void
  lista?: ListaData | null
  versionActual?: any
}

export default function ProductosResumen({
  productos,
  estadoRevision,
  loading,
  isApproving,
  onAprobarListaCompleta,
  lista,
  versionActual
}: ProductosResumenProps) {
  const totalProductos = productos.length
  const disponibles = productos.filter(p => p.encontrado_en_woocommerce === true && p.disponibilidad === 'disponible').length
  const paraComprar = productos.filter(p => p.comprar).length
  const validados = productos.filter(p => p.validado).length
  const encontradosEnWooCommerce = productos.filter(p => p.encontrado_en_woocommerce === true).length
  const noEncontradosEnWooCommerce = productos.filter(p => p.encontrado_en_woocommerce === false).length

  return (
    <div style={{ 
      padding: '1rem', 
      borderTop: '1px solid #dee2e6',
      background: '#f8f9fa',
      overflow: 'visible',
      minHeight: 'fit-content'
    }}>
      <div className="d-flex flex-column gap-3" style={{ overflow: 'visible' }}>
        {/* Primera fila: Estadísticas */}
        <div className="d-flex flex-wrap align-items-center gap-2" style={{ overflow: 'visible' }}>
          <strong>Total productos:</strong> {totalProductos} | 
          <strong className="ms-2">Para comprar:</strong> {paraComprar} | 
          <strong className="ms-2">Disponibles:</strong> {disponibles} |
          <strong className={`ms-2 ${validados === totalProductos && totalProductos > 0 ? 'text-success' : ''}`}>
            Aprobados: {validados}/{totalProductos}
          </strong>
          {encontradosEnWooCommerce > 0 && (
            <>
              <br className="d-md-none" />
              <span className="ms-2">
                <strong className="text-success">En WooCommerce:</strong> {encontradosEnWooCommerce}
              </span>
              {noEncontradosEnWooCommerce > 0 && (
                <span className="ms-2">
                  <strong className="text-warning">No encontrados:</strong> {noEncontradosEnWooCommerce}
                </span>
              )}
            </>
          )}
        </div>
        
        {/* Segunda fila: Botones de acción */}
        <div className="d-flex gap-2 align-items-center flex-wrap" style={{ 
          width: '100%', 
          overflow: 'visible',
          minWidth: 0,
          flexWrap: 'wrap'
        }}>
          {/* Badge de estado publicado */}
          {estadoRevision === 'publicado' && (
            <Badge bg="success" className="d-flex align-items-center" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', flexShrink: 0 }}>
              <TbCheck className="me-2" />
              Lista Publicada
            </Badge>
          )}
          
          {/* Badge informativo cuando todos están aprobados */}
          {validados === totalProductos && totalProductos > 0 && estadoRevision !== 'publicado' && (
            <Badge bg="success" className="d-flex align-items-center" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', flexShrink: 0 }}>
              <TbChecklist className="me-2" />
              ✓ Todos Aprobados
            </Badge>
          )}
          
          {/* Mensaje cuando no hay productos pero hay PDF */}
          {estadoRevision !== 'publicado' && totalProductos === 0 && (lista?.pdf_id || versionActual?.pdf_id) && (
            <Alert variant="info" className="mb-0" style={{ flexShrink: 0 }}>
              <strong>📋 No hay productos identificados.</strong> Haz clic en "Procesar con IA" para extraer productos del PDF.
            </Alert>
          )}
          
          {/* Mensaje cuando no hay productos ni PDF */}
          {estadoRevision !== 'publicado' && totalProductos === 0 && !lista?.pdf_id && !versionActual?.pdf_id && (
            <Alert variant="warning" className="mb-0" style={{ flexShrink: 0 }}>
              <strong>⚠️ No hay PDF ni productos.</strong> Sube un PDF primero para procesar productos.
            </Alert>
          )}
          
          {/* Botón Aprobar Lista Completa */}
          {estadoRevision !== 'publicado' && totalProductos > 0 && (
            <Button
              variant={validados === totalProductos && totalProductos > 0 ? 'success' : 'warning'}
              size="lg"
              onClick={onAprobarListaCompleta}
              disabled={loading || isApproving}
              className="d-inline-flex align-items-center"
              style={{ 
                fontWeight: 'bold',
                fontSize: '0.95rem',
                padding: '0.7rem 1.3rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: validados === totalProductos && totalProductos > 0 ? '0 4px 12px rgba(40, 167, 69, 0.4)' : '0 4px 12px rgba(255, 193, 7, 0.4)',
                display: 'inline-flex'
              }}
              title={loading ? 'Aprobando...' : validados === totalProductos && totalProductos > 0 ? 'Todos los productos están aprobados. Click para confirmar la lista completa.' : 'Aprobar todos los productos de la lista'}
            >
              {loading || isApproving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  <span>Aprobando...</span>
                </>
              ) : validados === totalProductos && totalProductos > 0 ? (
                <>
                  <TbCheck className="me-2" size={18} />
                  <span>✓ Aprobar Lista Completa ({validados}/{totalProductos})</span>
                </>
              ) : (
                <>
                  <TbChecklist className="me-2" size={18} />
                  <span>Aprobar Lista ({validados}/{totalProductos})</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
