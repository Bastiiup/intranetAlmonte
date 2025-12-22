'use client'

import { useState } from 'react'
import { Container, Form, Button, Alert, Card, CardBody, CardHeader, CardTitle, Row, Col, InputGroup } from 'react-bootstrap'
import { LuQrCode, LuCopy, LuDownload } from 'react-icons/lu'

/**
 * Página para generar códigos QR para formularios de cliente
 * Accesible desde: /tienda/generar-qr-cliente
 */
export default function GenerarQRClientePage() {
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const generarURL = () => {
    if (!email && !codigo) {
      setError('Por favor ingresa un email o código')
      return
    }

    const identificador = email || codigo
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const nuevaUrl = `${baseUrl}/cliente/${encodeURIComponent(identificador)}`
    
    setUrl(nuevaUrl)
    setError(null)
  }

  const copiarURL = () => {
    if (url) {
      navigator.clipboard.writeText(url)
      alert('URL copiada al portapapeles')
    }
  }

  const generarQR = () => {
    if (!url) {
      setError('Primero genera una URL')
      return
    }

    // Usar un servicio de QR code (puedes usar qrcode.js o un servicio externo)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
    window.open(qrUrl, '_blank')
  }

  return (
    <Container fluid className="py-4" style={{ maxWidth: '800px' }}>
      <Card>
        <CardHeader>
          <CardTitle as="h4" className="d-flex align-items-center">
            <LuQrCode className="me-2" />
            Generar Código QR para Formulario de Cliente
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Alert variant="info" className="mb-4">
            <strong>Instrucciones:</strong>
            <ul className="mb-0 mt-2">
              <li>Ingresa el email del cliente o un código único</li>
              <li>Genera la URL del formulario</li>
              <li>Descarga o imprime el código QR</li>
              <li>El cliente escaneará el QR y completará sus datos</li>
            </ul>
          </Alert>

          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email del Cliente</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setCodigo('')
                    }}
                    placeholder="cliente@ejemplo.cl"
                  />
                  <Form.Text className="text-muted">
                    Usa el email del cliente como identificador
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>O Código Único</Form.Label>
                  <Form.Control
                    type="text"
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value)
                      setEmail('')
                    }}
                    placeholder="ABC123"
                  />
                  <Form.Text className="text-muted">
                    O usa un código personalizado
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <div className="d-flex gap-2 mb-4">
              <Button variant="primary" onClick={generarURL}>
                <LuQrCode className="me-2" />
                Generar URL
              </Button>
            </div>

            {url && (
              <div className="mt-4 p-3 bg-light rounded">
                <h5 className="mb-3">URL del Formulario:</h5>
                <InputGroup className="mb-3">
                  <Form.Control
                    type="text"
                    value={url}
                    readOnly
                    className="bg-white"
                  />
                  <Button variant="outline-secondary" onClick={copiarURL}>
                    <LuCopy className="me-2" />
                    Copiar
                  </Button>
                </InputGroup>

                <div className="d-flex gap-2">
                  <Button variant="success" onClick={generarQR}>
                    <LuDownload className="me-2" />
                    Generar y Descargar QR
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => window.open(url, '_blank')}
                  >
                    Ver Formulario
                  </Button>
                </div>

                <div className="mt-3">
                  <strong>Vista previa del QR:</strong>
                  <div className="mt-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
                      alt="Código QR"
                      className="border rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </Form>

          <div className="mt-4 p-3 bg-light rounded">
            <h6 className="mb-2">Ejemplos de uso:</h6>
            <ul className="mb-0 small">
              <li><strong>Por email:</strong> Usa el email del cliente directamente</li>
              <li><strong>Por código:</strong> Genera un código único para cada cliente</li>
              <li><strong>URL generada:</strong> <code>/cliente/[email-o-codigo]</code></li>
              <li><strong>Ejemplo:</strong> <code>/cliente/juan@ejemplo.cl</code></li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </Container>
  )
}
