'use client'

import { useState, useMemo } from 'react'
import { Row, Col, Card, CardBody, CardTitle, Alert, InputGroup, Form } from 'react-bootstrap'
import Link from 'next/link'
import { LuSearch } from 'react-icons/lu'

interface ColeccionesGridProps {
  colecciones?: any[]
  error?: string | null
  onColeccionSelect?: (coleccionId: string) => void
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const ColeccionesGrid = ({ colecciones = [], error, onColeccionSelect }: ColeccionesGridProps) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredColecciones = useMemo(() => {
    if (!colecciones || colecciones.length === 0) return []
    
    if (!searchTerm) return colecciones
    
    const term = searchTerm.toLowerCase()
    return colecciones.filter((coleccion: any) => {
      const attrs = coleccion.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : coleccion
      const nombre = getField(data, 'nombre_coleccion', 'nombreColeccion', 'NOMBRE_COLECCION') || ''
      
      return nombre.toLowerCase().includes(term)
    })
  }, [colecciones, searchTerm])

  const getColeccionName = (coleccion: any): string => {
    const attrs = coleccion.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : coleccion
    return getField(data, 'nombre_coleccion', 'nombreColeccion', 'NOMBRE_COLECCION') || 'Sin nombre'
  }

  const getColeccionId = (coleccion: any): string => {
    return coleccion.id?.toString() || coleccion.documentId?.toString() || ''
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (!colecciones || colecciones.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron colecciones.
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
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <div className="mt-2">
          <small className="text-muted">
            Mostrando {filteredColecciones.length} de {colecciones.length} colecciones
          </small>
        </div>
      </div>

      {/* Grid de Colecciones */}
      {filteredColecciones.length === 0 ? (
        <Alert variant="info">No se encontraron colecciones que coincidan con la búsqueda.</Alert>
      ) : (
        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-3">
          {filteredColecciones.map((coleccion) => {
            const coleccionId = getColeccionId(coleccion)
            const nombre = getColeccionName(coleccion)
            const attrs = coleccion.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : coleccion
            const libros = data.libros?.data || data.books || []
            const librosCount = Array.isArray(libros) ? libros.length : 0
            const idColeccion = getField(data, 'id_coleccion', 'idColeccion', 'ID_COLECCION') || null

            return (
              <Col key={coleccionId || coleccion.id}>
                <Card className="h-100">
                  <CardBody>
                    <CardTitle className="fs-sm lh-base mb-2">
                      {onColeccionSelect && coleccionId ? (
                        <a 
                          href="#" 
                          className="link-reset" 
                          onClick={(e) => {
                            e.preventDefault()
                            onColeccionSelect(coleccionId)
                          }}
                        >
                          {nombre}
                        </a>
                      ) : (
                        <Link href={`/products/atributos/colecciones/${coleccionId}`} className="link-reset">
                          {nombre}
                        </Link>
                      )}
                    </CardTitle>
                    {idColeccion && (
                      <p className="text-muted mb-2 fs-xxs">
                        <code>ID: {idColeccion}</code>
                      </p>
                    )}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge badge-soft-info">{librosCount} libros</span>
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

export default ColeccionesGrid

