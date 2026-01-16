'use client'

import { useState, useMemo } from 'react'
import { Row, Col, Card, CardBody, CardTitle, Alert, InputGroup, Form } from 'react-bootstrap'
import Link from 'next/link'
import { LuSearch } from 'react-icons/lu'

interface ObrasGridProps {
  obras?: any[]
  error?: string | null
  onObraSelect?: (obraId: string) => void
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const ObrasGrid = ({ obras = [], error, onObraSelect }: ObrasGridProps) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredObras = useMemo(() => {
    if (!obras || obras.length === 0) return []
    
    if (!searchTerm) return obras
    
    const term = searchTerm.toLowerCase()
    return obras.filter((obra: any) => {
      const attrs = obra.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : obra
      const nombre = getField(data, 'nombre_obra', 'nombreObra', 'NOMBRE_OBRA', 'name', 'nombre') || ''
      const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
      
      return nombre.toLowerCase().includes(term) || descripcion.toLowerCase().includes(term)
    })
  }, [obras, searchTerm])

  const getObraName = (obra: any): string => {
    const attrs = obra.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : obra
    return getField(data, 'nombre_obra', 'nombreObra', 'NOMBRE_OBRA', 'name', 'nombre') || 'Sin nombre'
  }

  const getObraId = (obra: any): string => {
    return obra.id?.toString() || obra.documentId?.toString() || ''
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (!obras || obras.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron obras.
      </Alert>
    )
  }

  return (
    <div>
      {/* Búsqueda */}
      <div className="mb-4">
        <InputGroup>
          <InputGroup.Text>
            <LuSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <div className="mt-2">
          <small className="text-muted">
            Mostrando {filteredObras.length} de {obras.length} obras
          </small>
        </div>
      </div>

      {/* Grid de Obras */}
      {filteredObras.length === 0 ? (
        <Alert variant="info">No se encontraron obras que coincidan con la búsqueda.</Alert>
      ) : (
        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-3">
          {filteredObras.map((obra) => {
            const obraId = getObraId(obra)
            const nombre = getObraName(obra)
            const attrs = obra.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : obra
            const productos = data.productos?.data || data.products?.data || []
            const productosCount = Array.isArray(productos) ? productos.length : 0

            return (
              <Col key={obraId || obra.id}>
                <Card className="h-100">
                  <CardBody>
                    <CardTitle className="fs-sm lh-base mb-2">
                      {onObraSelect && obraId ? (
                        <a 
                          href="#" 
                          className="link-reset" 
                          onClick={(e) => {
                            e.preventDefault()
                            onObraSelect(obraId)
                          }}
                        >
                          {nombre}
                        </a>
                      ) : (
                        <Link href={`/products/atributos/obras/${obraId}`} className="link-reset">
                          {nombre}
                        </Link>
                      )}
                    </CardTitle>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge badge-soft-info">{productosCount} productos</span>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}

export default ObrasGrid

