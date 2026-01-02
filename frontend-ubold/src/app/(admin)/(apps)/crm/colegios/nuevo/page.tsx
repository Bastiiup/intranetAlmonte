'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import ColegioForm from '../components/ColegioForm'

const NuevoColegioPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const response = await fetch('/api/crm/colegios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(colegioData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear el colegio')
      }

      // Revalidar datos para sincronización bidireccional
      router.refresh()
      
      // Redirigir a la ficha del colegio creado
      const colegioId = result.data?.id || result.data?.documentId
      if (colegioId) {
        router.push(`/crm/colegios/${colegioId}`)
      } else {
        router.push('/crm/colegios')
      }
    } catch (err: any) {
      console.error('Error al crear colegio:', err)
      setError(err.message || 'Error al crear el colegio')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/crm/colegios')
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Nuevo Colegio" subtitle="CRM" />
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <h4 className="mb-0">Crear Nuevo Colegio</h4>
        </CardHeader>
        <CardBody>
          <ColegioForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            error={error}
          />
        </CardBody>
      </Card>
    </Container>
  )
}

export default NuevoColegioPage

