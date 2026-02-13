'use client'

import { useState } from 'react'
import { Button, Card, Col, Row, Alert, Badge, Table, Form, InputGroup } from 'react-bootstrap'
import { LuSearch, LuPackage, LuSchool, LuUsers, LuBookOpen, LuDownload } from 'react-icons/lu'
import Link from 'next/link'

interface ResultadoProducto {
  colegio: {
    id: string
    nombre: string
    rbd: string
    comuna?: string
    region?: string
  }
  curso: {
    id: string
    documentId: string
    nombre: string
    nivel: string
    grado: number
    año: number
    matriculados: number
  }
  producto: {
    nombre: string
    codigo?: string
    isbn?: string
    autor?: string
    editorial?: string
    cantidad: number
    observaciones?: string
  }
  totalProductos: number // cantidad × matriculados
}

interface Totales {
  colegiosUnicos: number
  cursosUnicos: number
  estudiantesTotal: number
  productosTotal: number
}

export default function BuscarProductoView() {
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoProducto[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [error, setError] = useState<string | null>(null)

  const buscarProducto = async () => {
    if (!busqueda.trim()) {
      alert('Por favor ingresa un término de búsqueda')
      return
    }

    setBuscando(true)
    setError(null)
    setResultados([])
    setTotales(null)

    try {
      const response = await fetch(`/api/crm/listas/buscar-producto?q=${encodeURIComponent(busqueda)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar producto')
      }

      setResultados(data.data || [])
      setTotales(data.totales || null)
    } catch (err: any) {
      console.error('Error al buscar:', err)
      setError(err.message || 'Error al buscar producto')
    } finally {
      setBuscando(false)
    }
  }

  const exportarResultados = () => {
    if (resultados.length === 0) return

    const rows: string[][] = []
    
    // Headers
    rows.push([
      'Colegio',
      'RBD',
      'Comuna',
      'Región',
      'Curso',
      'Nivel',
      'Grado',
      'Año',
      'Matriculados',
      'Producto',
      'Código',
      'ISBN',
      'Autor',
      'Editorial',
      'Cantidad por Alumno',
      'Total Productos Necesarios',
    ])

    // Data
    resultados.forEach((resultado) => {
      rows.push([
        resultado.colegio.nombre,
        resultado.colegio.rbd,
        resultado.colegio.comuna || '',
        resultado.colegio.region || '',
        resultado.curso.nombre,
        resultado.curso.nivel,
        String(resultado.curso.grado),
        String(resultado.curso.año),
        String(resultado.curso.matriculados),
        resultado.producto.nombre,
        resultado.producto.codigo || '',
        resultado.producto.isbn || '',
        resultado.producto.autor || '',
        resultado.producto.editorial || '',
        String(resultado.producto.cantidad),
        String(resultado.totalProductos),
      ])
    })

    // Convertir a CSV
    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    // Agregar BOM para Excel UTF-8
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `busqueda_${busqueda.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      buscarProducto()
    }
  }

  return (
    <Row>
      <Col xs={12}>
        <Card className="mb-4">
          <Card.Body>
            <Row className="mb-4">
              <Col lg={8} className="mx-auto">
                <h5 className="mb-3 text-center">
                  <LuPackage className="me-2" />
                  Buscar Producto en Todas las Listas
                </h5>
                <p className="text-muted text-center mb-4">
                  Busca un producto (libro, útil, etc.) y descubre en qué colegios y cursos se solicita,
                  cuántos estudiantes lo necesitan y el total de unidades requeridas.
                </p>
                <InputGroup size="lg">
                  <Form.Control
                    type="text"
                    placeholder='Ejemplo: "El Quijote", "Cuaderno", "Calculadora"...'
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={buscando}
                  />
                  <Button 
                    variant="primary" 
                    onClick={buscarProducto}
                    disabled={buscando || !busqueda.trim()}
                  >
                    <LuSearch className="me-2" />
                    {buscando ? 'Buscando...' : 'Buscar'}
                  </Button>
                </InputGroup>
              </Col>
            </Row>

            {error && (
              <Alert variant="danger" className="mb-4">
                <strong>Error:</strong> {error}
              </Alert>
            )}

            {totales && (
              <Row className="mb-4">
                <Col xs={12}>
                  <Alert variant="info" className="mb-0">
                    <Row className="text-center">
                      <Col md={3}>
                        <div className="mb-2">
                          <LuSchool size={32} className="text-primary" />
                        </div>
                        <h4 className="mb-0">{totales.colegiosUnicos}</h4>
                        <small className="text-muted">Colegios</small>
                      </Col>
                      <Col md={3}>
                        <div className="mb-2">
                          <LuBookOpen size={32} className="text-success" />
                        </div>
                        <h4 className="mb-0">{totales.cursosUnicos}</h4>
                        <small className="text-muted">Cursos</small>
                      </Col>
                      <Col md={3}>
                        <div className="mb-2">
                          <LuUsers size={32} className="text-warning" />
                        </div>
                        <h4 className="mb-0">{totales.estudiantesTotal.toLocaleString('es-CL')}</h4>
                        <small className="text-muted">Estudiantes</small>
                      </Col>
                      <Col md={3}>
                        <div className="mb-2">
                          <LuPackage size={32} className="text-danger" />
                        </div>
                        <h4 className="mb-0">{totales.productosTotal.toLocaleString('es-CL')}</h4>
                        <small className="text-muted">Unidades Necesarias</small>
                      </Col>
                    </Row>
                  </Alert>
                </Col>
              </Row>
            )}

            {resultados.length > 0 && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    Resultados de búsqueda: <Badge bg="primary">{resultados.length}</Badge>
                  </h5>
                  <Button variant="success" size="sm" onClick={exportarResultados}>
                    <LuDownload className="me-1" />
                    Exportar CSV
                  </Button>
                </div>

                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Colegio</th>
                        <th>Curso</th>
                        <th>Producto</th>
                        <th className="text-center">Matriculados</th>
                        <th className="text-center">Cant/Alumno</th>
                        <th className="text-center">Total Unidades</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((resultado, idx) => (
                        <tr key={idx}>
                          <td>
                            <div>
                              <strong>{resultado.colegio.nombre}</strong>
                              <br />
                              <small className="text-muted">
                                RBD: {resultado.colegio.rbd}
                                {resultado.colegio.comuna && ` • ${resultado.colegio.comuna}`}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{resultado.curso.nombre}</strong>
                              <br />
                              <small className="text-muted">
                                {resultado.curso.nivel} - {resultado.curso.grado}° - {resultado.curso.año}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{resultado.producto.nombre}</strong>
                              {resultado.producto.isbn && (
                                <>
                                  <br />
                                  <small className="text-muted">ISBN: {resultado.producto.isbn}</small>
                                </>
                              )}
                              {resultado.producto.autor && (
                                <>
                                  <br />
                                  <small className="text-muted">{resultado.producto.autor}</small>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="text-center">
                            <Badge bg="warning" text="dark">
                              {resultado.curso.matriculados.toLocaleString('es-CL')}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="info">
                              {resultado.producto.cantidad}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="success">
                              {resultado.totalProductos.toLocaleString('es-CL')}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Link href={`/crm/listas/${resultado.curso.documentId}/validacion`}>
                              <Button variant="primary" size="sm">
                                Ver Lista
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-primary">
                        <td colSpan={3} className="text-end">
                          <strong>TOTALES:</strong>
                        </td>
                        <td className="text-center">
                          <strong>{totales?.estudiantesTotal.toLocaleString('es-CL')}</strong>
                        </td>
                        <td className="text-center">-</td>
                        <td className="text-center">
                          <strong>{totales?.productosTotal.toLocaleString('es-CL')}</strong>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </>
            )}

            {!buscando && resultados.length === 0 && busqueda && (
              <Alert variant="warning">
                No se encontraron resultados para <strong>"{busqueda}"</strong>
              </Alert>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
