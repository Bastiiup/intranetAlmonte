'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import ColegioForm from '../../components/ColegioForm'

const EditarColegioPage = () => {
  const router = useRouter()
  const params = useParams()
  const colegioId = params?.id as string

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [colegioData, setColegioData] = useState<any>(null)

  useEffect(() => {
    const fetchColegio = async () => {
      if (!colegioId) return

      setLoadingData(true)
      try {
        const response = await fetch(`/api/crm/colegios/${colegioId}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al cargar el colegio')
        }

        const colegio = result.data
        const attrs = colegio.attributes || colegio

        // Transformar datos para el formulario
        const formData = {
          rbd: attrs.rbd?.toString() || '',
          colegio_nombre: attrs.colegio_nombre || '',
          estado: attrs.estado || 'Por Verificar',
          dependencia: attrs.dependencia || '',
          region: attrs.region || attrs.comuna?.region_nombre || '',
          zona: attrs.zona || attrs.comuna?.zona || '',
          comunaId: attrs.comuna?.id || attrs.comuna?.data?.id,
          telefonos: (attrs.telefonos || []).map((t: any) => ({
            telefono_raw: t.telefono_raw || t.telefono_norm || t.numero || '',
            tipo: t.tipo || '',
            principal: t.principal || false,
          })),
          emails: (attrs.emails || []).map((e: any) => ({
            email: e.email || '',
            tipo: e.tipo || '',
            principal: e.principal || false,
          })),
          direcciones: (attrs.direcciones || []).map((d: any) => ({
            calle: d.calle || '',
            numero: d.numero || '',
            comuna: d.comuna || '',
            region: d.region || '',
          })),
        }

        setColegioData(formData)
      } catch (err: any) {
        console.error('Error al cargar colegio:', err)
        setError(err.message || 'Error al cargar el colegio')
      } finally {
        setLoadingData(false)
      }
    }

    fetchColegio()
  }, [colegioId])

  const handleSubmit = async (data: any) => {
    setLoading(true)
    setError(null)

    try {
      // Preparar datos para la API
      const colegioData = {
        rbd: data.rbd,
        colegio_nombre: data.colegio_nombre,
        estado: data.estado,
        dependencia: data.dependencia,
        region: data.region,
        zona: data.zona,
        comunaId: data.comunaId,
        telefonos: data.telefonos.filter((t: any) => t.telefono_raw),
        emails: data.emails.filter((e: any) => e.email),
        direcciones: data.direcciones.filter((d: any) => d.calle || d.numero),
      }

      const response = await fetch(`/api/crm/colegios/${colegioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colegioData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el colegio')
      }

      // Redirigir a la ficha del colegio
      router.push(`/crm/colegios/${colegioId}`)
    } catch (err: any) {
      console.error('Error al actualizar colegio:', err)
      setError(err.message || 'Error al actualizar el colegio')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/crm/colegios/${colegioId}`)
  }

  if (loadingData) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Colegio" subtitle="CRM" />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando datos del colegio...</p>
        </div>
      </Container>
    )
  }

  if (error && !colegioData) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Colegio" subtitle="CRM" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Editar Colegio" subtitle="CRM" />
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <h4 className="mb-0">Editar Colegio</h4>
        </CardHeader>
        <CardBody>
          {colegioData && (
            <ColegioForm
              initialData={colegioData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading}
              error={error}
            />
          )}
        </CardBody>
      </Card>
    </Container>
  )
}

export default EditarColegioPage

