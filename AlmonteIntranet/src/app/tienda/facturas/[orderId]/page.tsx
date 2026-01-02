'use client'

import { useState, useEffect } from 'react'
import { Container, Alert, Spinner, Button, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { TbDownload, TbArrowLeft, TbFileInvoice } from 'react-icons/tb'

/**
 * Página para ver la factura de un pedido
 * Accesible desde: /tienda/facturas/[orderId]
 */
export default function VerFacturaPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter()
  const [orderId, setOrderId] = useState<string>('')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [folio, setFolio] = useState<string | null>(null)

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setOrderId(resolvedParams.orderId)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (!orderId) return

    const cargarFactura = async () => {
      setLoading(true)
      setError(null)

      try {
        // Obtener el pedido desde WooCommerce
        const response = await fetch(`/api/woocommerce/orders/${orderId}`)
        const data = await response.json()

        if (data.success && data.data) {
          setOrder(data.data)
          
          // Buscar la URL del PDF en meta_data (compatibilidad con ambos nombres)
          const metaData = data.data.meta_data || []
          const pdfMeta = metaData.find((m: any) => 
            m.key === '_openfactura_pdf_url' || 
            m.key === '_haulmer_pdf_url' ||
            m.key === '_openfactura_pdf_original_url' ||
            m.key === '_haulmer_pdf_original_url'
          )
          const folioMeta = metaData.find((m: any) => 
            m.key === '_openfactura_folio' || 
            m.key === '_haulmer_folio'
          )
          
          if (pdfMeta) {
            setPdfUrl(pdfMeta.value)
          }
          
          if (folioMeta) {
            setFolio(folioMeta.value)
          }

          if (!pdfMeta) {
            setError('No se encontró factura para este pedido')
          }
        } else {
          setError(data.error || 'Pedido no encontrado')
        }
      } catch (err: any) {
        console.error('Error al cargar factura:', err)
        setError('Error al cargar la factura')
      } finally {
        setLoading(false)
      }
    }

    cargarFactura()
  }, [orderId])

  const descargarPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <p>Cargando factura...</p>
        </div>
      </Container>
    )
  }

  if (error && !pdfUrl) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
        <Button variant="secondary" onClick={() => router.back()} className="mt-3">
          <TbArrowLeft className="me-2" />
          Volver
        </Button>
      </Container>
    )
  }

  return (
    <Container fluid className="py-4">
      <Card>
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <CardTitle as="h4" className="d-flex align-items-center mb-0">
              <TbFileInvoice className="me-2" />
              Factura - Pedido #{orderId}
              {folio && <span className="ms-2 text-muted">(Folio: {folio})</span>}
            </CardTitle>
            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={() => router.back()}>
                <TbArrowLeft className="me-2" />
                Volver
              </Button>
              {pdfUrl && (
                <Button variant="primary" onClick={descargarPDF}>
                  <TbDownload className="me-2" />
                  Descargar PDF
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="warning" className="mb-3">
              {error}
            </Alert>
          )}

          {pdfUrl ? (
            <div className="mt-3">
              <iframe
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: '80vh',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.375rem',
                }}
                title="Factura PDF"
              />
            </div>
          ) : (
            <Alert variant="info">
              No hay factura disponible para este pedido.
            </Alert>
          )}

          {order && (
            <div className="mt-4 p-3 bg-light rounded">
              <h6 className="mb-2">Información del Pedido:</h6>
              <ul className="mb-0 small">
                <li><strong>ID:</strong> {order.id}</li>
                <li><strong>Estado:</strong> {order.status}</li>
                <li><strong>Total:</strong> ${parseFloat(order.total || '0').toLocaleString('es-CL')}</li>
                <li><strong>Fecha:</strong> {new Date(order.date_created || '').toLocaleString('es-CL')}</li>
                {order.billing && (
                  <li><strong>Cliente:</strong> {order.billing.first_name} {order.billing.last_name}</li>
                )}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  )
}
