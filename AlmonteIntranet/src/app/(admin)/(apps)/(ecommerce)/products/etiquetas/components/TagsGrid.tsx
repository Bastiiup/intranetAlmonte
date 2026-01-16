'use client'

import { useState, useMemo } from 'react'
import { Row, Col, Card, CardBody, CardTitle, Alert, InputGroup, Form } from 'react-bootstrap'
import Link from 'next/link'
import { LuSearch } from 'react-icons/lu'

interface TagsGridProps {
  etiquetas?: any[]
  error?: string | null
  onTagSelect?: (tagId: string) => void
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const TagsGrid = ({ etiquetas = [], error, onTagSelect }: TagsGridProps) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEtiquetas = useMemo(() => {
    if (!etiquetas || etiquetas.length === 0) return []
    
    if (!searchTerm) return etiquetas
    
    const term = searchTerm.toLowerCase()
    return etiquetas.filter((tag: any) => {
      const attrs = tag.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : tag
      const nombre = getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || ''
      const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
      
      return nombre.toLowerCase().includes(term) || descripcion.toLowerCase().includes(term)
    })
  }, [etiquetas, searchTerm])

  const getTagName = (etiqueta: any): string => {
    const attrs = etiqueta.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : etiqueta
    return getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || 'Sin nombre'
  }

  const getTagId = (etiqueta: any): string => {
    return etiqueta.id?.toString() || etiqueta.documentId?.toString() || ''
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (!etiquetas || etiquetas.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron etiquetas.
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
            Mostrando {filteredEtiquetas.length} de {etiquetas.length} etiquetas
          </small>
        </div>
      </div>

      {/* Grid de Etiquetas */}
      {filteredEtiquetas.length === 0 ? (
        <Alert variant="info">No se encontraron etiquetas que coincidan con la búsqueda.</Alert>
      ) : (
        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-3">
          {filteredEtiquetas.map((etiqueta) => {
            const tagId = getTagId(etiqueta)
            const nombre = getTagName(etiqueta)
            const attrs = etiqueta.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : etiqueta
            const productos = data.productos?.data || data.products?.data || []
            const productosCount = Array.isArray(productos) ? productos.length : 0

            return (
              <Col key={tagId || etiqueta.id}>
                <Card className="h-100">
                  <CardBody>
                    <CardTitle className="fs-sm lh-base mb-2">
                      {onTagSelect && tagId ? (
                        <a 
                          href="#" 
                          className="link-reset" 
                          onClick={(e) => {
                            e.preventDefault()
                            onTagSelect(tagId)
                          }}
                        >
                          {nombre}
                        </a>
                      ) : (
                        <Link href={`/products/etiquetas/${tagId}`} className="link-reset">
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

export default TagsGrid

