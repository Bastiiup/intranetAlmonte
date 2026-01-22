'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EmpresaForm from '../../components/EmpresaForm'

const EditarEmpresaPage = () => {
  const params = useParams()
  const router = useRouter()
  const empresaId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [loadingSave, setLoadingSave] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [empresa, setEmpresa] = useState<any>(null)

  useEffect(() => {
    const fetchEmpresa = async () => {
      if (!empresaId) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/crm/empresas/${empresaId}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al cargar la empresa')
        }

        const empresaData = result.data
        const attrs = empresaData.attributes || empresaData

        // Transformar datos para el formulario
        const empresaFormData = {
          empresa_nombre: attrs.empresa_nombre || '',
          razon_social: attrs.razon_social || '',
          rut: attrs.rut || '',
          giro: attrs.giro || '',
          estado: attrs.estado || 'Activa',
          region: attrs.region || '',
          comunaId: attrs.comuna?.data?.id || attrs.comuna?.id || attrs.comunaId,
          telefonos: attrs.telefonos || [],
          emails: attrs.emails || [],
          direcciones: attrs.direcciones || [],
          datos_facturacion: attrs.datos_facturacion || {},
        }

        setEmpresa(empresaFormData)
      } catch (err: any) {
        console.error('Error al cargar empresa:', err)
        setError(err.message || 'Error al cargar la empresa')
      } finally {
        setLoading(false)
      }
    }

    fetchEmpresa()
  }, [empresaId])

  const handleSubmit = async (data: any) => {
    setLoadingSave(true)
    setError(null)

    try {
      const empresaData = {
        empresa_nombre: data.empresa_nombre,
        razon_social: data.razon_social,
        rut: data.rut,
        giro: data.giro,
        estado: data.estado,
        region: data.region,
        comunaId: data.comunaId,
        telefonos: data.telefonos.filter((t: any) => t.telefono_raw),
        emails: data.emails.filter((e: any) => e.email),
        direcciones: data.direcciones.filter((d: any) => d.nombre_calle || d.numero_calle),
        datos_facturacion: data.datos_facturacion,
      }

      const response = await fetch(`/api/crm/empresas/${empresaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(empresaData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar la empresa')
      }

      router.refresh()
      router.push(`/crm/empresas/${empresaId}`)
    } catch (err: any) {
      console.error('Error al actualizar empresa:', err)
      setError(err.message || 'Error al actualizar la empresa')
      setLoadingSave(false)
    }
  }

  const handleCancel = () => {
    router.push(`/crm/empresas/${empresaId}`)
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Empresa" subtitle="CRM - Empresas" />
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    )
  }

  if (error && !empresa) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Empresa" subtitle="CRM - Empresas" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
          <div className="mt-3">
            <button className="btn btn-outline-primary" onClick={() => router.push('/crm/empresas')}>
              Volver a la lista
            </button>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Editar Empresa" 
        subtitle="CRM - Empresas" 
      />
      
      <Card>
        <CardHeader>
          <h4 className="mb-0">Editar Empresa</h4>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
              {error}
            </Alert>
          )}
          
          <EmpresaForm
            initialData={empresa}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loadingSave}
            error={error}
          />
        </CardBody>
      </Card>
    </Container>
  )
}

export default EditarEmpresaPage





